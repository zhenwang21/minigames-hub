// Confronta l'HTML generato dal sorgente e dalla build minificata.
// Salta il confronto quando si sta già testando la build (MG_SKIP_UI=1).
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'Minigames Hub.html');
const MIN = process.env.MG_MIN || path.join(ROOT, 'Minigames Hub.min.html');

if (process.env.MG_SKIP_UI === '1') {
  console.log('SKIP  confronto UI: si sta testando la build minificata');
  process.exit(0);
}
if (!fs.existsSync(MIN)) {
  console.log('SKIP  build minificata assente: esegui prima node build-min.js');
  process.exit(0);
}

function boot(file) {
  const html = fs.readFileSync(file, 'utf8');
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
  const el = () => ({
    className: '',
    textContent: '',
    innerHTML: '',
    value: '',
    disabled: false,
    style: {},
    attrs: {},
    focus() {},
    select() {},
    addEventListener() {},
    appendChild() {},
    setAttribute() {},
    getAttribute() {
      return null;
    },
    closest() {
      return null;
    },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }
  });
  const els = {};
  const document = {
    documentElement: { lang: 'it' },
    head: { appendChild() {} },
    getElementById(id) {
      return els[id] || (els[id] = el());
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    createElement() {
      return el();
    },
    body: el()
  };
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k]
  };
  const ctx = {
    console: { log() {}, error() {} },
    document,
    localStorage,
    window: {},
    alert() {},
    confirm() {
      return true;
    },
    navigator: { vibrate() {} },
    location: { origin: 'https://example.test', pathname: '/mg/', hash: '' },
    setTimeout() {
      return 0;
    },
    clearTimeout() {},
    setInterval() {
      return 0;
    },
    clearInterval() {},
    Math,
    JSON,
    Date,
    crypto: {
      getRandomValues(a) {
        for (let i = 0; i < a.length; i++) a[i] = (i * 7) % 256;
        return a;
      }
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(js, ctx, { filename: file });
  return {
    ctx,
    els,
    run: (code) => vm.runInContext(code, ctx),
    app: () => els.app.innerHTML,
    modal: () => els.modal.innerHTML
  };
}

const A = boot(SRC);
const B = boot(MIN);
const snaps = {};
function compare(tag, fa, fb) {
  let a, b;
  try {
    a = fa();
  } catch (e) {
    a = 'ERR ' + e.message;
  }
  try {
    b = fb();
  } catch (e) {
    b = 'ERR ' + e.message;
  }
  snaps[tag] = { src: a, min: b };
}

compare('home', A.app, B.app);
compare('help-modal', () => (A.run('showHelp()'), A.modal()), () => (B.run('showHelp()'), B.modal()));
compare('help-rules', () => (A.run("showHelp('rules')"), A.modal()), () => (B.run("showHelp('rules')"), B.modal()));
compare('scores-modal', () => (A.run('closeModal();showScores()'), A.modal()), () => (B.run('closeModal();showScores()'), B.modal()));

const games = ['mrwhite', 'impostore', 'who_said', 'lupus', 'king', 'doctor', 'vassal', 'survivor'];
for (const g of games) {
  compare(
    'setup-' + g,
    () => (A.run("closeModal();S.players=['Anna','Bruno','Carla','Dario','Elena'];selectGame('" + g + "')"), A.app()),
    () => (B.run("closeModal();S.players=['Anna','Bruno','Carla','Dario','Elena'];selectGame('" + g + "')"), B.app())
  );
}

for (const g of ['who_said', 'impostore']) {
  const code =
    "S.players=['Anna','Bruno','Carla','Dario','Elena'];S.quick=true;S.game='" +
    g +
    "';" +
    (g === 'who_said' ? 'startWho()' : 'startImp()');
  compare(
    'quick-' + g,
    () => (A.run(code), A.app()),
    () => (B.run(code), B.app())
  );
}

compare('home-en', () => (A.run("setLang('en')"), A.app()), () => (B.run("setLang('en')"), B.app()));
compare('help-en', () => (A.run("showHelp('rules')"), A.modal()), () => (B.run("showHelp('rules')"), B.modal()));
compare('scores-en', () => (A.run('closeModal();showScores()'), A.modal()), () => (B.run('closeModal();showScores()'), B.modal()));
compare(
  'setup-lupus-en',
  () => (A.run("closeModal();setLang('en');S.players=['Anna','Bruno','Carla','Dario','Elena'];selectGame('lupus')"), A.app()),
  () => (B.run("closeModal();setLang('en');S.players=['Anna','Bruno','Carla','Dario','Elena'];selectGame('lupus')"), B.app())
);
compare('online', () => (A.run("goHome();S.screen='online';render()"), A.app()), () => (B.run("goHome();S.screen='online';render()"), B.app()));

const NC_SETUP =
  "closeModal();setLang('it');NET.host=true;NET.players=['Anna','Bruno','Carla'];NET.ncDraft=null;NET.name='Anna';ncHostOpen()";
compare('nc-setup', () => (A.run(NC_SETUP), A.app()), () => (B.run(NC_SETUP), B.app()));
const NC_PLAY =
  "NET.view={t:'nc',stamp:'A-1',letter:'A',round:1,left:287,cats:[{k:'nome',it:'Nome',en:'Name'},{k:'cosa',it:'Cosa',en:'Thing'},{k:'citta',it:'Città',en:'City'}],done:['Bruno'],n:3,scores:{Anna:10}};NET.st='lobby';S.screen='online';render()";
compare('nc-play', () => (A.run(NC_PLAY), A.app()), () => (B.run(NC_PLAY), B.app()));
const NC_REVIEW =
  "NET.view={t:'ncres',ph:'review',stamp:'A-1',letter:'A',round:1,cats:[{k:'nome',it:'Nome',en:'Name'},{k:'cosa',it:'Cosa',en:'Thing'}],a:{Anna:{nome:'Anna',cosa:'Ascia'},Bruno:{nome:'Anna',cosa:''}},ok:{Anna:{nome:true,cosa:true}},uniq:[['Anna','nome'],['Anna','cosa']],players:['Anna','Bruno'],timeup:false,scores:{Anna:15,Bruno:5}};NET.st='lobby';S.screen='online';render()";
compare('nc-review', () => (A.run(NC_REVIEW), A.app()), () => (B.run(NC_REVIEW), B.app()));
const NC_RES =
  "NET.view={t:'ncres',ph:'end',stamp:'A-1',letter:'A',round:1,cats:[{k:'nome',it:'Nome',en:'Name'},{k:'cosa',it:'Cosa',en:'Thing'}],a:{Anna:{nome:'Anna',cosa:'Ascia'},Bruno:{nome:'Anna',cosa:''}},aw:{Anna:{nome:5,cosa:10},Bruno:{nome:5,cosa:0}},ok:{},pts:{Anna:15,Bruno:5},players:['Anna','Bruno'],timeup:true,scores:{Anna:15,Bruno:5}};NET.st='lobby';S.screen='online';render()";
compare('nc-result', () => (A.run(NC_RES), A.app()), () => (B.run(NC_RES), B.app()));
compare('nc-setup-en', () => (A.run(NC_SETUP + ";setLang('en')"), A.app()), () => (B.run(NC_SETUP + ";setLang('en')"), B.app()));

let bad = 0;
for (const [tag, v] of Object.entries(snaps)) {
  const same = v.src === v.min;
  if (!same) bad++;
  console.log((same ? 'SAME  ' : 'DIFF  ') + tag + (same ? '  (' + v.src.length + ' char)' : ''));
  if (!same) {
    for (let i = 0; i < Math.max(v.src.length, v.min.length); i++) {
      if (v.src[i] !== v.min[i]) {
        console.log('   src: ...' + JSON.stringify(v.src.slice(Math.max(0, i - 60), i + 60)));
        console.log('   min: ...' + JSON.stringify(v.min.slice(Math.max(0, i - 60), i + 60)));
        break;
      }
    }
  }
}
console.log('\n' + (Object.keys(snaps).length - bad) + '/' + Object.keys(snaps).length + ' schermate identiche');
process.exit(bad ? 1 : 0);
