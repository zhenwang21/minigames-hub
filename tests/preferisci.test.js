const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(
  process.env.MG_FILE || require('path').join(__dirname, '..', 'Minigames Hub.html'),
  'utf8'
);
const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const js = matches[matches.length - 1][1];

function el() {
  return {
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
  };
}
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
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem(k, v) {
    store[k] = String(v);
  },
  removeItem(k) {
    delete store[k];
  }
};
const ctx = {
  console,
  document,
  localStorage,
  confirm() {
    return true;
  },
  alert() {},
  setTimeout() {
    return 0;
  },
  clearTimeout() {},
  setInterval() {
    return 1;
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
vm.runInContext(js, ctx, { filename: 'mg_extract.js' });
const S = vm.runInContext('S', ctx);
const NET = vm.runInContext('NET', ctx);
const run = (x) => vm.runInContext(x, ctx);

const results = [];
function ok(name, cond, extra) {
  results.push({ name, pass: !!cond, extra: extra === undefined ? '' : String(extra) });
}

// ---------- OFFLINE ----------
S.lang = 'it';
S.screen = 'setup';
S.game = 'preferisci';
S.players = ['Anna', 'Bruno', 'Carla'];
S.scores = {};
S.pv = { a: '', b: '' };
ok('canStart false senza opzioni', run('canStart()') === false);
S.pv = { a: 'Pizza', b: 'Sushi' };
ok('canStart false con 1 giocatore', (S.players = ['Anna']) && run('canStart()') === false);
S.players = ['Anna', 'Bruno', 'Carla'];
ok('canStart true con 2 opzioni e 3 giocatori', run('canStart()') === true);
S.mode = 'gm';
run('startPref()');
ok('startPref -> pvpass', S.G.phase === 'pvpass', S.G.phase);
ok('startPref forza auto', S.mode === 'auto', S.mode);
ok('ordine = tutti i giocatori', S.G.order.length === 3);
const passView = run('viewPref()');
ok('pass view mostra il nome', passView.includes('Anna') || passView.includes('Bruno') || passView.includes('Carla'));

// voto: due A, un B
const voters = S.G.order.slice();
run('pvShow()');
ok('pvvote view mostra le opzioni', run('viewPref()').includes('Pizza') && run('viewPref()').includes('Sushi'));
run("pvVote('a')");
run('pvShow()');
run("pvVote('a')");
run('pvShow()');
run("pvVote('b')");
ok('dopo tutti i voti -> pvres', S.G.phase === 'pvres', S.G.phase);
ok('conteggio A', S.G.ca === 2, S.G.ca);
ok('conteggio B', S.G.cb === 1, S.G.cb);
ok('maggioranza +100', S.scores[voters[0]] === 100 && S.scores[voters[1]] === 100, JSON.stringify(S.scores));
ok('minoranza 0', !S.scores[voters[2]], S.scores[voters[2]]);
const resView = run('viewPref()');
ok('risultato mostra i punti', resView.includes('100') && resView.includes('Pizza'));

// pareggio 2-2
S.players = ['Anna', 'Bruno', 'Carla', 'Dario'];
S.scores = {};
S.screen = 'setup';
S.pv = { a: 'Mare', b: 'Montagna' };
run('startPref()');
run('pvShow()');
run("pvVote('a')");
run('pvShow()');
run("pvVote('a')");
run('pvShow()');
run("pvVote('b')");
run('pvShow()');
run("pvVote('b')");
ok('pareggio rilevato', S.G.tie === true, S.G.tie);
ok('pareggio +50 a tutti', S.players.every((p) => S.scores[p] === 50), JSON.stringify(S.scores));
run('pvAgainOff()');
ok('nuova coppia torna al setup', S.screen === 'setup' && S.G === null, S.screen);
ok('nuova coppia svuota le opzioni', S.pv.a === '' && S.pv.b === '', JSON.stringify(S.pv));

// timer: visibile nei giochi testuali, nascosto in Lupus/home
S.screen = 'play';
S.game = 'preferisci';
S.G = { phase: 'pvres' };
run('tmDraw()');
ok('timer visibile nel gioco testuale', els.tmr.className === 'on', els.tmr.className);
ok('timer idle mostra i preset 1-5', els.tmr.innerHTML.includes('tmStart(60)') && els.tmr.innerHTML.includes('tmStart(300)'));
run('tmStart(60)');
ok('timer avviato mostra mm:ss', els.tmr.innerHTML.includes("onclick=\"tmStop()\""), els.tmr.innerHTML);
ok('timer ticking', run('TMR.left') === 60, run('TMR.left'));
run('tmAdd(60)');
ok('timer +1 minuto', run('TMR.left') === 120, run('TMR.left'));
run('tmStop()');
ok('timer fermato', run('TMR.iv') === null && run('TMR.left') === 0);
S.game = 'lupus';
run('tmDraw()');
ok('timer nascosto in Lupus offline', els.tmr.className === '', els.tmr.className);
S.screen = 'home';
run('tmDraw()');
ok('timer nascosto in home', els.tmr.className === '', els.tmr.className);

// ---------- ONLINE (host) ----------
S.screen = 'online';
S.lang = 'it';
NET.host = true;
NET.name = 'Anna';
NET.players = ['Anna', 'Bruno', 'Carla'];
NET.order = ['Anna', 'Bruno', 'Carla'];
NET.conns = {};
NET.view = null;
NET.st = 'lobby';
NET.scores = {};
NET.gone = {};
NET.offline = {};
run('pvHostOpen()');
ok('pvHostOpen apre il setup host', S.screen === 'pvsetup', S.screen);
ok('setup online: no opzioni -> canPv false', run('canPv()') === false);
const setupView = run('viewPvSetup()');
ok('setup online ha gli input', setupView.includes('NET.pvA=this.value') && setupView.includes('disabled'));
NET.pvA = 'Pizza';
NET.pvB = 'Sushi';
ok('canPv true con opzioni valide', run('canPv()') === true);
S.screen = 'online';
run('pvOnlineStart()');
ok('partita pv creata', NET.game && NET.game.g === 'pv' && NET.game.ph === 'vote');
ok('vista pvvote inviata', NET.view && NET.view.t === 'pvvote', NET.view && NET.view.t);
ok('vista pvvote con le due opzioni', run('viewNetGame()').includes('Pizza') && run('viewNetGame()').includes('Sushi'));
for (const p of ['Anna', 'Bruno', 'Carla']) run(`hostApply(${JSON.stringify(p)}, {t:'pv',v:'a'})`);
ok('dopo i voti -> fase res', NET.game.ph === 'res', NET.game.ph);
ok('vista pvres inviata', NET.view && NET.view.t === 'pvres', NET.view && NET.view.t);
ok('punteggi online +100', NET.scores.Anna === 100 && NET.scores.Bruno === 100 && NET.scores.Carla === 100, JSON.stringify(NET.scores));
ok('host ha ricevuto i punti', S.scores.Anna === 100, JSON.stringify(S.scores));
const onlineRes = run('viewNetGame()');
ok('vista pvres con punteggi e nuovo round', onlineRes.includes('100') && onlineRes.includes('netAgain()'));
run('netAgain()');
ok('netAgain riapre il setup pv', S.screen === 'pvsetup' && NET.game === null, S.screen);
ok('netAgain pulisce le opzioni', NET.pvA === '' && NET.pvB === '', JSON.stringify([NET.pvA, NET.pvB]));
run('back()');
ok('back dal setup pv torna alla lobby', S.screen === 'online' && NET.view === null, S.screen);

// checkG con 2 giocatori non manda in lobby
NET.players = ['Anna', 'Bruno'];
NET.game = { g: 'pv', ph: 'vote', a: 'X', b: 'Y', votes: {} };
run('checkG()');
ok('pv resta in partita con 2 giocatori', NET.game && NET.game.g === 'pv', NET.game && NET.game.g);
run("hostApply('Anna', {t:'pv',v:'a'})");
run("hostApply('Bruno', {t:'pv',v:'a'})");
ok('pv completa con 2 giocatori', NET.game.ph === 'res', NET.game.ph);

// ---------- LUPUS x10 ----------
S.scores = {};
S.players = ['Anna', 'Bruno'];
S.G = {
  roles: { Anna: 'villico', Bruno: 'lupo' },
  alive: ['Anna'],
  bonus: {},
  joined: []
};
run("addB('Anna', 25)");
ok('addB vale x10', run('S.G.bonus.Anna') === 250, run('S.G.bonus.Anna'));
run("lEnd('civ')");
ok('vittoria civ scaled x10 (+1000)', S.scores.Anna === 1450, S.scores.Anna);
ok('bonus +1000 + vivo 200', S.scores.Anna === 250 + 1000 + 200, JSON.stringify(S.scores));
ok('lupo sconfitto 0', !S.scores.Bruno, S.scores.Bruno);

let pass = 0;
for (const r of results) {
  console.log((r.pass ? 'PASS  ' : 'FAIL  ') + r.name + (r.pass ? '' : '  [' + r.extra + ']'));
  if (r.pass) pass++;
}
console.log('\n' + pass + '/' + results.length + ' test');
process.exit(pass === results.length ? 0 : 1);
