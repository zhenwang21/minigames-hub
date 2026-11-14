// Parole vietate (solo online): squadre, turni, voti, timeout e punteggi.
const path = require('path');
const { boot, reporter } = require('./lib/harness');

const app = boot();
const { S, NET } = app;
const { check, done } = reporter();

S.lang = 'it';
S.screen = 'online';
NET.host = true;
NET.name = 'Anna';
NET.players = ['Anna', 'Bruno', 'Carla', 'Dario'];
NET.order = NET.players.slice();
NET.conns = {};
NET.scores = {};
NET.st = 'lobby';
NET.view = null;

// --- setup squadre ---
app.run('tbHostOpen()');
check(S.screen === 'tbsetup', 'host apre il setup di Parole vietate', S.screen);
check(
  NET.tbTeams && NET.tbTeams.A.length === 2 && NET.tbTeams.B.length === 2,
  'squadre bilanciate automaticamente',
  NET.tbTeams && NET.tbTeams.A.length + '/' + NET.tbTeams.B.length
);
check(app.run('tbCanStart()') === true, 'si può iniziare con 2 per squadra');

const first = NET.tbTeams.A[0];
app.call('tbMove', NET.players.indexOf(first));
check(
  NET.tbTeams.A.length === 1 && NET.tbTeams.B.length === 3,
  'tbMove sposta un giocatore nella squadra avversaria'
);
check(app.run('tbCanStart()') === false, 'non si parte con una squadra da 1');
app.call('tbMove', NET.players.indexOf(first));
check(app.run('tbCanStart()') === true, 'tbMove riporta il giocatore e si riparte');

// --- avvio ---
app.run('tbStart()');
check(NET.game && NET.game.g === 'tb' && NET.game.ph === 'play', 'partita avviata in fase play');
check(NET.game.turn === 'A' && NET.game.round === 1, 'primo turno squadra A', NET.game.turn + ' ' + NET.game.round);
check(
  NET.game.teams.A.includes(NET.game.guesser),
  'il guesser appartiene alla squadra di turno',
  NET.game.guesser
);
const card = app.run('tbCard()');
check(!!card.word && Array.isArray(card.bans) && card.bans.length === 4, 'carta con parola e 4 parole vietate');

// ruoli e visibilità della carta
const guesser = NET.game.guesser;
const clueMate = NET.game.teams[NET.game.turn].find((p) => p !== guesser);
const opp = app.run('tbOpponents()')[0];
NET.name = guesser;
app.run('tbBc()');
check(NET.view.role === 'guess', 'il guesser ha il ruolo guess');
check(!NET.view.word && !NET.view.bans, 'il guesser non vede parola né parole vietate');
NET.name = clueMate;
app.run('tbBc()');
check(NET.view.role === 'clue', 'il compagno ha il ruolo clue');
check(NET.view.word === card.word && NET.view.bans.length === 4, 'il compagno vede parola e parole vietate');
NET.name = opp;
app.run('tbBc()');
check(NET.view.role === 'vote' && !NET.view.word, 'gli avversari votano e non vedono la parola');
NET.name = 'Anna';

// --- maggioranza "indovinata" ---
const oppB = NET.game.teams.B.slice();
app.call('tbApply', oppB[0], { t: 'tbv', v: 'w' });
check(NET.game.ph === 'play', 'un solo voto non chiude il turno (maggioranza stretta)');
app.call('tbApply', oppB[1], { t: 'tbv', v: 'w' });
check(NET.game.ph === 'res' && NET.game.res === 'w', 'maggioranza w chiude il turno');
check(
  NET.game.teams.A.every((p) => NET.scores[p] === 100),
  '+100 a ogni membro della squadra che indovina',
  JSON.stringify(NET.scores)
);

// --- turno successivo e parola vietata ---
app.run('tbNext()');
check(NET.game.turn === 'B' && NET.game.round === 2, 'il turno passa alla squadra B');
check(NET.game.teams.B.includes(NET.game.guesser), 'nuovo guesser nella squadra B');
const oppA = NET.game.teams.A.slice();
app.call('tbApply', oppA[0], { t: 'tbv', v: 'f' });
app.call('tbApply', oppA[1], { t: 'tbv', v: 'f' });
check(NET.game.ph === 'res' && NET.game.res === 'f', 'maggioranza f chiude come parola vietata');
check(!NET.scores[NET.game.teams.B[0]], 'nessun punto in caso di parola vietata');

// --- parità: decide l'host ---
app.run('tbNext()');
check(NET.game.turn === 'A' && NET.game.round === 3, 'terzo turno squadra A');
const tieOpp = NET.game.teams.B.slice();
app.call('tbApply', tieOpp[0], { t: 'tbv', v: 'w' });
app.call('tbApply', tieOpp[1], { t: 'tbv', v: 'f' });
check(NET.game.ph === 'tie', 'voti pari portano alla decisione host', NET.game.ph);
const beforeTie = { ...NET.scores };
app.run('tbTie(true)');
check(NET.game.ph === 'res' && NET.game.res === 'w', "l'host decide l'esito della parità");
check(NET.scores[NET.game.teams.A[0]] === (beforeTie[NET.game.teams.A[0]] || 0) + 100, 'parità risolta assegna +100');

// --- chiusura anticipata dell'host ---
app.run('tbNext()');
check(NET.game.turn === 'B' && NET.game.round === 4, 'quarto turno squadra B');
const beforeClose = { ...NET.scores };
app.call('tbApply', NET.game.teams.A[0], { t: 'tbv', v: 'w' });
app.run('tbClose()');
check(NET.game.ph === 'res' && NET.game.res === 'w', "l'host chiude il turno con i voti disponibili");
check(
  NET.game.teams.B.every((p) => NET.scores[p] === (beforeClose[p] || 0) + 100),
  'chiusura anticipata assegna +100 alla squadra B'
);

// --- annulla round ---
app.run('undoRound()');
check(
  NET.game.teams.B.every((p) => (NET.scores[p] || 0) === (beforeClose[p] || 0)),
  'annulla round riporta i punteggi a prima del turno',
  JSON.stringify(NET.scores)
);

// --- timeout = fallo ---
app.run('tbNext()');
check(NET.game.turn === 'A' && NET.game.round === 5, 'quinto turno squadra A');
NET.game.end = Date.now() - 1;
app.run('tbTick()');
check(NET.game.ph === 'res' && NET.game.res === 'f', 'tempo scaduto senza maggioranza = fallo');

// --- squadra rimasta sotto i 2 / giocatori insufficienti ---
NET.players = ['Anna', 'Bruno', 'Carla'];
app.run('tbCheckTeams()');
check(!NET.game, 'con meno di 4 giocatori si torna in lobby');

done();
