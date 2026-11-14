// Verifica i database EN: stesse lunghezze, nessun testo italiano residuo nei campi EN.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.env.MG_FILE || require('path').join(__dirname, '..', 'Minigames Hub.html'), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];

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
const g = (k) => vm.runInContext(k, ctx);

let bad = 0;
const check = (ok, label, extra = '') => {
  if (!ok) bad++;
  console.log((ok ? 'OK   ' : 'FAIL ') + label + (extra ? '  [' + extra + ']' : ''));
};

const W = g('WHO_DB'),
  WE = g('WHO_DB_EN'),
  I = g('IMPOSTORE_DB'),
  IE = g('IMPOSTORE_DB_EN'),
  CL = g('CL'),
  CLE = g('CL_EN'),
  GEN = g('IMP_GEN'),
  GENE = g('IMP_GEN_EN'),
  HAND = g('IMP_HAND'),
  HANDE = g('IMP_HAND_EN'),
  WHO = g('WHO_ALL'),
  WHOE = g('WHO_ALL_EN');

check(JSON.stringify(Object.keys(W)) === JSON.stringify(Object.keys(WE)), 'WHO: stesse categorie');
for (const k of Object.keys(W)) check(W[k].length === WE[k].length, 'WHO ' + k + ': ' + WE[k].length + '/' + W[k].length);
check(
  JSON.stringify(Object.keys(I).sort()) === JSON.stringify(Object.keys(IE).sort()),
  'IMPOSTORE: stesse categorie',
  Object.keys(IE).join(',')
);
for (const k of Object.keys(I)) check(I[k].length === IE[k].length, 'IMP ' + k + ': ' + IE[k].length + '/' + I[k].length);
check(GEN.length === GENE.length, 'IMP gen: ' + GENE.length + '/' + GEN.length);
check(HAND.length === HANDE.length, 'IMP hand: ' + HANDE.length + '/' + HAND.length);
check(WHO.length === WHOE.length, 'WHO_ALL: ' + WHOE.length + '/' + WHO.length);
check(
  GENE.every((e) => e.alt.length === 3),
  'IMP gen EN: 3 alternative per domanda'
);
check(JSON.stringify(Object.keys(CL)) === JSON.stringify(Object.keys(CLE)), 'CL: stesse categorie');
for (const k of Object.keys(CL))
  check(
    CL[k].length === CLE[k].length && CL[k].every((c, i) => c.length === CLE[k][i].length),
    'CL ' + k + ': forma uguale'
  );

// Nessuna stringa EN identica all'IT (tranne nomi propri prevedibili)
let dup = 0,
  dups = [];
for (const k of Object.keys(W)) W[k].forEach((q, i) => { if (q === WE[k][i]) { dup++; dups.push(WE[k][i]); } });
for (const k of Object.keys(I))
  I[k].forEach((e, i) => e.alt.forEach((a, j) => { if (a[1] === IE[k][i].alt[j][1]) { dup++; dups.push(a[1]); } }));
for (const k of Object.keys(CL))
  CL[k].forEach((c, i) => c.forEach((w, j) => { if (w === CLE[k][i][j]) { dup++; dups.push(w); } }));
check(dups.length === dup, 'stringhe identiche IT/EN (nomi propri ammessi)', dup + ' -> ' + dups.slice(0, 10).join(' | '));

// Caratteri italiani residui nelle domande EN (à è é ì ò ù + parole tipiche)
const itWords = /\b(qual è|quale|chi |cosa |perché|anche|tuo|tua|tuoi|tue|sono|della|delle|degli|nella|nelle|più|senza|sempre|mai|già|però|cioè|dove|quando|questo|questa|quello|quella|mio|mia|hai |sei |fare|essere|avere)\b/i;
const itChars = /[àèéìòù]/i;
let susp = [];
const scan = (s, where) => {
  if (typeof s !== 'string') return;
  if (itChars.test(s) || (itWords.test(s) && !/\b(più|però)\b/.test(s))) susp.push(where + ': ' + s);
};
for (const k of Object.keys(WE)) WE[k].forEach((q) => scan(q, 'who.' + k));
for (const k of Object.keys(IE)) IE[k].forEach((e) => { scan(e.q, 'imp.' + k); e.alt.forEach((a) => scan(a[1], 'imp.' + k)); });
// i cluster contengono molti nomi propri: qui controllo solo domande e risposte
for (const e of GENE) { scan(e.q, 'gen'); e.alt.forEach((a) => scan(a[1], 'gen')); }
check(susp.length === 0, 'nessun testo italiano nei campi EN', susp.slice(0, 8).join(' || '));

// Selezione in base alla lingua
const S = g('S');
S.lang = 'en';
S.players = ['A', 'B', 'C', 'D'];
S.game = 'impostore';
vm.runInContext('startImp()', ctx);
check(S.G && S.G.qCiv && !itChars.test(S.G.qCiv), 'startImp in EN usa domande inglesi', (S.G.qCiv || '').slice(0, 60));
S.lang = 'it';
vm.runInContext('startImp()', ctx);
check(S.G && itChars.test(S.G.qCiv) || /[a-z]/.test(S.G.qCiv), 'startImp in IT usa domande italiane', (S.G.qCiv || '').slice(0, 60));

S.lang = 'en';
S.game = 'who_said';
vm.runInContext('startWho()', ctx);
check(S.G && !itChars.test(S.G.q), 'who_said in EN usa domande inglesi', (S.G.q || '').slice(0, 60));

S.game = 'mrwhite';
S.cfg.cats = new Set(Object.keys(CL));
let pairsOk = 0,
  pairsItOk = 0;
for (let i = 0; i < 40; i++) {
  const p = vm.runInContext("pickPair('food')", ctx);
  if (!itChars.test(p[2]) && !itChars.test(p[3])) pairsOk++;
  if (!itChars.test(p[0]) && !itChars.test(p[1])) pairsItOk++;
}
check(pairsOk >= 39, 'pickPair: parole EN senza accenti italiani', pairsOk + '/40');
S.lang = 'it';
let p2 = vm.runInContext("pickPair('food')", ctx);
check(Array.isArray(p2) && p2.length === 4, 'pickPair: 4 parole (IT+EN)', JSON.stringify(p2));

console.log('\n' + (bad ? bad + ' controlli falliti' : 'tutti i controlli passati'));
process.exit(bad ? 1 : 0);
