// Chi sono io? (solo online): parole nascoste, turni, voti, vite e fine partita.
const { boot, reporter } = require('./lib/harness');

const { check, done } = reporter();
const app = boot();
const { S, NET } = app;

function setup(names) {
  S.lang = 'it';
  S.screen = 'online';
  NET.host = true;
  NET.name = names[0];
  NET.players = names.slice();
  NET.order = names.slice();
  NET.conns = {};
  NET.scores = {};
  NET.st = 'lobby';
  NET.view = null;
  app.run('chiStart()');
}

setup(['Anna', 'Bruno', 'Carla', 'Dario']);
check(NET.game && NET.game.g === 'chi' && NET.game.ph === 'play', 'partita avviata in fase play');
check(NET.game.order.length === 4 && NET.game.idx === 0, 'ordine di turno con 4 giocatori');
check(
  NET.players.every((p) => NET.game.lives[p] === 5),
  '5 vite a testa',
  JSON.stringify(NET.game.lives)
);

const cur = app.run('chiCur()');
check(NET.players.includes(cur), 'turno assegnato a un giocatore', cur);
check(
  NET.players.every((p) => p === cur || app.call('chiWord', p)),
  'ogni giocatore ha una parola'
);

// Ogni giocatore vede le parole altrui ma non la propria.
let leak = false;
for (const p of NET.players) {
  NET.name = p;
  app.run('chiBc()');
  const v = NET.view;
  if (p in v.others) leak = true;
  const others = NET.players.filter((q) => q !== p);
  if (!others.every((q) => v.others[q] === app.call('chiWord', q))) leak = true;
  if (v.word) leak = true;
}
check(!leak, 'nessuno vede la propria parola, tutti vedono quelle altrui');
NET.name = 'Anna';

// Solo il giocatore di turno può premere "Indovino!".
const other = NET.players.find((p) => p !== cur);
app.call('chiApply', other, { t: 'chig' });
check(NET.game.ph === 'play', 'un giocatore fuori turno non può indovinare');
app.call('chiApply', cur, { t: 'chig' });
check(NET.game.ph === 'vote' && NET.game.last === cur, 'il giocatore di turno apre il voto');

// Il giocatore di turno non vota.
app.call('chiApply', cur, { t: 'chiv', v: true });
check(Object.keys(NET.game.votes).length === 0, 'chi indovina non vota');

const voters = NET.players.filter((p) => p !== cur);
app.call('chiApply', voters[0], { t: 'chiv', v: true });
check(NET.game.ph === 'vote', 'con un solo voto si attende la maggioranza');
app.call('chiApply', voters[1], { t: 'chiv', v: true });
app.call('chiApply', voters[2], { t: 'chiv', v: false });
check(NET.game.ph === 'res' && NET.game.res === 'ok', 'maggioranza sì = indovinata');
check(NET.scores[cur] === 100, '+100 per la parola indovinata', NET.scores[cur]);
check(NET.game.done[cur] === true, 'il giocatore risulta aver indovinato');

NET.name = cur;
app.run('chiBc()');
check(
  NET.view.ph === 'res' && NET.view.lastWord === app.call('chiWord', cur),
  'la schermata di esito mostra la parola segreta'
);
NET.name = 'Anna';

const curBefore = cur;
app.run('chiNext()');
check(NET.game.ph === 'play' && app.run('chiCur()') !== curBefore, 'Continua passa al giocatore successivo');

// Risposta sbagliata: perde una vita e, a zero, esce.
const cur2 = app.run('chiCur()');
const voters2 = NET.players.filter((p) => p !== cur2);
app.call('chiApply', cur2, { t: 'chig' });
NET.game.lives[cur2] = 1;
voters2.forEach((p) => app.call('chiApply', p, { t: 'chiv', v: false }));
check(NET.game.ph === 'res' && NET.game.res === 'no', 'maggioranza no = risposta sbagliata');
check(NET.game.lives[cur2] === 0 && NET.game.out[cur2] === true, 'a zero vite il giocatore esce');
app.run('chiNext()');
check(app.run('chiCur()') !== cur2, 'chi è fuori non torna in turno');

// Fine partita e rivelazione di tutte le parole.
const words = NET.players.map((p) => app.call('chiWord', p));
app.run('chiEnd()');
check(NET.game.ph === 'end', 'host può terminare e rivelare');
NET.name = 'Anna';
app.run('chiBc()');
const endView = app.run('viewChi(NET.view)');
check(NET.view.allWords && NET.players.every((p) => NET.view.allWords[p] === app.call('chiWord', p)), 'tutte le parole rivelate');
check(endView.includes(words[0]) && endView.includes(words[3]), 'la vista finale elenca le parole');

// Nuova partita: vite e stato azzerati.
app.run('chiRestart()');
check(NET.game.ph === 'play' && NET.players.every((p) => NET.game.lives[p] === 5), 'nuova partita azzera vite e stato');

// Con meno di 3 giocatori non si parte.
const app2 = boot();
const { S: S2, NET: N2 } = app2;
S2.screen = 'online';
N2.host = true;
N2.name = 'Anna';
N2.players = ['Anna', 'Bruno'];
N2.conns = {};
N2.scores = {};
app2.run('chiStart()');
check(!N2.game, 'Chi sono io? richiede almeno 3 giocatori');

// Parità con 3 giocatori (2 votanti): decide l'host.
N2.players = ['Anna', 'Bruno', 'Carla'];
app2.run('chiStart()');
const c2 = app2.run('chiCur()');
const v2 = N2.players.filter((p) => p !== c2);
app2.call('chiApply', c2, { t: 'chig' });
app2.call('chiApply', v2[0], { t: 'chiv', v: true });
app2.call('chiApply', v2[1], { t: 'chiv', v: false });
check(N2.game.ph === 'tie', 'parità nei voti porta alla decisione host', N2.game.ph);
app2.run('chiTie(false)');
check(N2.game.ph === 'res' && N2.game.res === 'no', "l'host decide la parità");
check(N2.game.lives[c2] === 4, 'la parità risolta come no toglie una vita');

// Cuori: 5 pieni, poi i vuoti.
const hearts = app.run('chiHearts(3)');
check((hearts.match(/❤️/g) || []).length === 3 && (hearts.match(/🖤/g) || []).length === 2, '5 cuori con 3 vite');

done();
