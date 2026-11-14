const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.env.MG_FILE || require('path').join(__dirname, '..', 'Minigames Hub.html'), 'utf8');
const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const js = matches[matches.length - 1][1];

function el() {
  return {
    className: '', textContent: '', innerHTML: '', value: '', disabled: false,
    style: {}, focus() {}, addEventListener() {}, appendChild() {},
    setAttribute() {}, getAttribute() { return null; }, closest() { return null; }
  };
}
const els = {};
const document = {
  documentElement: { lang: 'it' },
  head: { appendChild() {} },
  getElementById(id) { return els[id] || (els[id] = el()); },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return el(); },
  body: el()
};
const store = {};
const localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};
const ctx = {
  console, document, localStorage, window: {}, alert() {}, confirm() { return true; },
  setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {}, Math, JSON, Date,
  crypto: { getRandomValues(a) { for (let i = 0; i < a.length; i++) a[i] = i * 7 % 256; return a; } }
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(js, ctx, { filename: 'mg_extract.js' });
const S = vm.runInContext('S', ctx);
const NET = vm.runInContext('NET', ctx);

const results = [];
function ok(name, cond, extra) {
  results.push({ name, pass: !!cond, extra: extra || '' });
}
function call(fn, ...args) { return vm.runInContext(fn, ctx)(...args); }

// ---- Who Said quick mode ----
S.players = ['Anna', 'Bruno', 'Carla'];
S.scores = {};
S.quick = true;
S.lang = 'it';
S.game = 'who_said';
vm.runInContext('startWho()', ctx);
ok('who quick starts at wq', S.G.phase === 'wq', S.G.phase);
const vw = vm.runInContext('viewWho()', ctx);
ok('who quick wq shows play-aloud button', vw.includes('Si gioca a voce') && vw.includes('wGo()'));
vm.runInContext('wGo()', ctx);
ok('wGo quick -> wqdone', S.G.phase === 'wqdone', S.G.phase);
const vd = vm.runInContext('viewWho()', ctx);
ok('wqdone view has question + new game', vd.includes(S.G.q) && vd.includes('newRound()'));

// who normal path
S.quick = false;
S.game = 'who_said';
vm.runInContext('startWho()', ctx);
const vn = vm.runInContext('viewWho()', ctx);
ok('who normal wq shows start', vn.includes('wGo()'));
vm.runInContext('wGo()', ctx);
ok('wGo normal -> wans', S.G.phase === 'wans', S.G.phase);

// GM quick applyGM
S.quick = true;
S.mode = 'gm';
S.game = 'who_said';
S.G = {};
S.gm = { a: 'Domanda di prova', b: '', c: '' };
vm.runInContext('applyGM()', ctx);
ok('applyGM quick who -> wqdone', S.G.phase === 'wqdone' && S.G.q === 'Domanda di prova', S.G.phase);

// ---- Lupus command whitelist ----
function nightG() {
  return {
    phase: 'nturn', q: ['Anna', 'Bruno', 'Carla'], qi: 0, alive: ['Anna', 'Bruno', 'Carla'],
    roles: { Anna: 'lupo', Bruno: 'villico', Carla: 'veggente' }, news: [], stage: 'pick'
  };
}
S.players = ['Anna', 'Bruno', 'Carla'];
S.G = nightG();
let called = null;
ctx.__testNNext = () => { called = 'nNext'; };
ctx.nNext = ctx.__testNNext;
vm.runInContext("lupCall('Anna','nNext()')", ctx);
ok('lupCall allows nNext in nturn', called === 'nNext');
called = null;
vm.runInContext("lupCall('Anna','vSkip()')", ctx);
ok('lupCall rejects vSkip in nturn', called === null);
called = null;
vm.runInContext("lupCall('Bruno','nNext()')", ctx);
ok('lupCall rejects non-actor', called === null);
called = null;
S.G = nightG();
vm.runInContext("lupCall('Anna','nAct(99)')", ctx);
ok('lupCall rejects out-of-range index', called === null);
// valid target action within range -> nAct is original; stub it
let nActArg = 'unset';
ctx.nAct = (i) => { nActArg = i; };
vm.runInContext("lupCall('Anna','nAct(2)')", ctx);
ok('lupCall passes valid target index', nActArg === 2, String(nActArg));
// abGo is now in LUP_OK and only allowed in abil
S.G = { phase: 'abil', ab: { st: 'gate', who: 'Anna' }, alive: ['Anna'], roles: {}, q: [], qi: 0 };
let abGoCalled = false;
ctx.abGo = () => { abGoCalled = true; };
vm.runInContext("lupCall('Anna','abGo()')", ctx);
ok('lupCall allows abGo in abil', abGoCalled);
abGoCalled = false;
vm.runInContext("lupCall('Anna','vSkip()')", ctx);
ok('lupCall rejects vSkip in abil', !abGoCalled);

// ---- Doctor / King / Vassal behavior preserved ----
function runResolve({ roles, prot, doc, vassal, atkTarget }) {
  S.players = ['Re', 'Vassallo', 'Dottore', 'Lupo'];
  const G = {
    acts: { atk: [{ v: 'Lupo', t: atkTarget }], prot, doc },
    roles, alive: ['Re', 'Vassallo', 'Dottore', 'Lupo'], vassal,
    convNow: [], joined: [], note: {}, bonus: {}
  };
  S.G = G;
  ctx.killed = [];
  ctx.applyMann = () => {};
  ctx.applyCure = () => {};
  ctx.applyDeaths = () => {};
  ctx.lKill = (p) => { ctx.killed.push(p); };
  ctx.addB = () => {};
  ctx.lNext = () => {};
  vm.runInContext('nResolve()', ctx);
  return ctx.killed.slice();
}
const roles = { Re: 're', Vassallo: 'villico', Dottore: 'dottore', Lupo: 'lupo' };
// Protect King, wolves attack King -> Vassal dies (protection on King saves the Vassal)
ok('protect King + attack King -> no one dies', runResolve({ roles, prot: 'Re', doc: 'Dottore', vassal: 'Vassallo', atkTarget: 'Re' }).length === 0);
// Protect King, wolves attack Vassal -> Vassal dies
let k = runResolve({ roles, prot: 'Re', doc: 'Dottore', vassal: 'Vassallo', atkTarget: 'Vassallo' });
ok('protect King + attack Vassal -> Vassal dies', k.length === 1 && k[0] === 'Vassallo', k.join(','));
// Protect Vassal, wolves attack Vassal -> survives
ok('protect Vassal + attack Vassal -> survives', runResolve({ roles, prot: 'Vassallo', doc: 'Dottore', vassal: 'Vassallo', atkTarget: 'Vassallo' }).length === 0);
// Protect Vassal, wolves attack King -> Vassal dies anyway
k = runResolve({ roles, prot: 'Vassallo', doc: 'Dottore', vassal: 'Vassallo', atkTarget: 'Re' });
ok('protect Vassal + attack King -> Vassal dies', k.length === 1 && k[0] === 'Vassallo', k.join(','));

// ---- Survivor steals win ----
S.players = ['Sop', 'Civ', 'Lupo'];
S.scores = {};
S.G = {
  roles: { Sop: 'sopravvissuto', Civ: 'villico', Lupo: 'lupo' },
  alive: ['Sop', 'Civ'], bonus: {}, awards: null
};
ctx.render = () => {};
vm.runInContext("lEnd('civ')", ctx);
ok('Survivor steals a civ win', S.G.win === 'sopravvissuto', S.G.win);

// ---- persistence ----
S.players = ['P1', 'P2'];
S.scores = { P1: 120, P2: 0 };
S.lang = 'en';
NET.name = 'HostTest';
NET.lastCode = 'ABCDE';
vm.runInContext('saveLocal()', ctx);
S.players = []; S.scores = {}; S.lang = 'it'; NET.name = ''; NET.lastCode = '';
vm.runInContext('loadLocal()', ctx);
ok('persistence restores players/lang/name/code', S.lang === 'en' && S.players.join(',') === 'P1,P2' && S.scores.P1 === 120 && NET.name === 'HostTest' && NET.lastCode === 'ABCDE');

// report
let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.extra ? '  [' + r.extra + ']' : ''));
}
console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
process.exit(failed ? 1 : 0);


