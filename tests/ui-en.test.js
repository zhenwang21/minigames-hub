// Rende le schermate in inglese e cerca testo italiano residuo.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.env.MG_FILE || require('path').join(__dirname, '..', 'Minigames Hub.html'), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];

function boot() {
  const el = () => ({
    className: '',
    textContent: '',
    innerHTML: '',
    value: '',
    disabled: false,
    style: {},
    focus() {},
    addEventListener() {},
    appendChild() {},
    setAttribute() {},
    getAttribute() {
      return null;
    },
    closest() {
      return null;
    }
  });
  const els = {};
  const document = {
    documentElement: { lang: 'it' },
    head: { appendChild() {} },
    getElementById: (id) => els[id] || (els[id] = el()),
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: el,
    body: el()
  };
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k]
  };
  const ctx = {
    console,
    document,
    localStorage,
    window: {},
    alert() {},
    confirm: () => true,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
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
  vm.runInContext(js, ctx, { filename: 'mg.js' });
  return { ctx, els, run: (c) => vm.runInContext(c, ctx) };
}

const { ctx, els, run } = boot();
const S = run('S');

const ITA = [
  'Scrivi',
  'Scegli',
  'Tocca',
  'Gioca',
  'Giocatore',
  'Giocatori',
  'Partita',
  'domand',
  'rispost',
  'votare',
  'turno',
  'Regol',
  'regol',
  'punteggi',
  'stanza',
  'squadra',
  'eliminat',
  'notte',
  'giorno',
  'villic',
  'lupi',
  'attesa',
  'Invia',
  'Avvia',
  'Indietro',
  'Chiudi',
  'prossim',
  'Nessun',
  'ancora',
  'adesso',
  'perché',
  'così',
  'più',
  'può',
  'sono',
  'della',
  'nella',
  'anche',
  'sempre',
  'giocare',
  'inizi',
  'fine partita',
  'Risultat',
  'impostor',
  'Civili',
  'Cittadini'
];

const hits = new Map();
// Parole inglesi che condividono il prefisso con una voce italiana (falsi positivi noti).
const EN_OK = new Set([
  'impostor',
  'impostors',
  'eliminate',
  'eliminated',
  'eliminates',
  'eliminating',
  'civilians'
]);
function scan(label, text) {
  if (!text) return;
  const plain = text.replace(/<[^>]*>/g, ' ');
  for (const w of ITA) {
    const re = new RegExp('(^|[^A-Za-zÀ-ÿ])(' + w + '[A-Za-zÀ-ÿ]*)', 'i');
    const m = plain.match(re);
    if (m && !EN_OK.has(m[2].toLowerCase())) {
      const key = label + ' :: ' + w;
      if (!hits.has(key))
        hits.set(key, plain.slice(Math.max(0, m.index - 45), m.index + 75).replace(/\s+/g, ' '));
    }
  }
}

function shot(label, code) {
  try {
    run(code);
  } catch (e) {
    hits.set(label + ' :: ERRORE', e.message);
    return;
  }
  scan(label + ' [app]', els.app && els.app.innerHTML);
  scan(label + ' [modal]', els.modal && els.modal.innerHTML);
}

run("setLang('en')");
shot('home', 'render()');
shot('help', "showHelp('rules')");
shot('scores', 'closeModal();showScores()');
run(
  "closeModal();S.players=['Anna','Bruno','Carla','Dario','Elena'];S.scores={Anna:2};S.mode='auto'"
);
for (const g of ['mrwhite', 'impostore', 'who_said', 'lupus', 'king', 'doctor', 'vassal', 'survivor'])
  shot('setup-' + g, "S.screen='home';selectGame('" + g + "')");

// Partite rapide
shot('who-quick', "S.game='who_said';S.quick=true;S.players=['Anna','Bruno','Carla'];startWho()");
shot('who-quick-done', 'wGo()');
shot('imp-quick', "S.game='impostore';S.quick=true;startImp()");
shot('mw', "S.game='mrwhite';S.quick=false;S.cfg={und:1,mwN:1,cats:new Set(['food']),imp:1};startGame()");
shot('lupus-setup', "S.game='lupus';S.screen='lroles';render()");
shot('lupus-quick', "S.game='lupus';S.quick=false;startLupus(false)");
shot('lupus-full', "S.players=['A1','B1','C1','D1','E1','F1'];S.game='lupus';startLupus(true)");
shot('lupus-full-view', 'render()');
shot('online', "S.screen='online';S.game=null;render()");

if (!hits.size) {
  console.log('OK: nessun testo italiano trovato nelle schermate EN');
} else {
  console.log(hits.size + ' sospetti:');
  for (const [k, v] of hits) console.log(' - ' + k + '  =>  ' + v);
}
process.exit(hits.size ? 1 : 0);
