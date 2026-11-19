// Test dei timer online con orologio finto: niente attese reali.
const { boot, reporter } = require('./lib/harness');
const { check, done } = reporter();

// --- netTry: un "no" immediato non fa saltare subito il candidato ---
const a = boot({ fakeTimers: true });
a.run(`
  NET.elec = true; NET.host = false; NET.name = 'Io';
  globalThis.__dial = 0; globalThis.__settle = 0; globalThis.__tries = [];
  netDial = function (n, cb) { __dial++; __tries.push(n); cb(false, true); };
  netSettle = function () { __settle++; };
`);
a.run("netTry(['A', 'B'], 0)");
check(a.run('__dial') === 1 && a.run('__settle') === 0, 'un no immediato non passa subito al prossimo');
a.advance(440);
check(a.run('__dial') === 1, 'prima dei 450 ms non riprova');
a.advance(20);
check(a.run('__dial') === 2 && a.run('__tries[1]') === 'A', 'dopo 450 ms riprova lo stesso candidato');
a.advance(450);
check(a.run('__dial') === 4 && a.run('__tries[2]') === 'A', 'terzo tentativo sullo stesso candidato');
check(a.run('__tries[3]') === 'B', 'dopo tre no rapidi passa al candidato successivo');
a.advance(450);
check(a.run('__dial') === 5 && a.run('__tries[4]') === 'B', 'anche il secondo candidato viene ritentato');
check(a.run('__settle') === 0, 'non si proclama host mentre restano candidati');

// Un timeout (non rapido) passa subito al candidato dopo.
const b = boot({ fakeTimers: true });
b.run(`
  NET.elec = true; NET.host = false; NET.name = 'Io';
  globalThis.__dial = 0; globalThis.__settle = 0;
  netDial = function (n, cb) { __dial++; cb(false, false); };
  netSettle = function () { __settle++; };
`);
b.run("netTry(['A'], 0)");
check(b.run('__dial') === 1 && b.run('__settle') === 1, 'un timeout passa al controllo finale');

// --- netSettle: promuove solo in elezione e solo se la stanza non risponde ---
const c = boot({ fakeTimers: true });
c.run(`
  NET.elec = true; NET.host = false;
  globalThis.__prom = 0; globalThis.__rejoin = 0;
  netRejoin = function (n, cb) { __rejoin++; cb(false); };
  netPromote = function () { __prom++; };
`);
c.run('netSettle()');
check(c.run('__rejoin') === 1 && c.run('__prom') === 1, 'netSettle controlla la stanza e si proclama host');
c.run('NET.elec = false; __prom = 0; netSettle()');
check(c.run('__prom') === 0, 'senza elezione netSettle non fa nulla');
c.run('NET.elec = true; NET.host = true; __prom = 0; netSettle()');
check(c.run('__prom') === 0, 'chi è già host non si promuove di nuovo');

// --- netRecover: 600 ms, retry dopo 1200 ms, poi elezione ---
const d = boot({ fakeTimers: true });
d.run(`
  NET.host = false; NET.elec = false; NET.recovering = false; NET.st = 'idle';
  globalThis.__rj = 0; globalThis.__el = 0;
  netRejoin = function (n, cb) { __rj++; cb(false); };
  netElect = function () { __el++; };
  netRecover();
`);
check(d.run('__rj') === 0 && d.pending() === 1, 'netRecover programma il primo tentativo');
d.advance(600);
check(d.run('__rj') === 1 && d.run('NET.recTries') === 1, 'dopo 600 ms parte il primo tentativo');
d.advance(1200);
check(d.run('__rj') === 2 && d.run('NET.recTries') === 2, 'il secondo tentativo arriva dopo 1200 ms');
d.advance(1200);
check(d.run('__el') === 1 && d.run('NET.recovering') === false, 'se la stanza non risponde si passa alle elezioni');

// --- netRetryNow: chiude il collegamento appeso e riparte subito ---
const e = boot({ fakeTimers: true });
e.run(`
  NET.host = false; NET.recovering = true; NET.elec = true;
  globalThis.__closed = 0; globalThis.__rec = 0;
  NET.conn = { close: function () { __closed++; } };
  NET.peer = { reconnect: function () {} };
  netRecover = function () { __rec++; };
`);
e.run('netRetryNow()');
check(
  e.run('__closed') === 1 && e.run('__rec') === 1 && e.run('NET.conn') === null,
  'Riprova ora chiude la connessione e riparte'
);
check(e.run('NET.recovering') === false && e.run('NET.elec') === false, 'Riprova ora azzera lo stato di attesa');

done();
