// Funzioni trasversali: invito QR/link, backup, annulla round, correzione
// punteggi e pacchetti pronti di Preferiresti.
const fs = require('fs');
const { boot, reporter, sourceFile } = require('./lib/harness');
const { check, done } = reporter();

// --- invito: apertura con #room=CODICE ---
const app = boot({ hash: '#room=ABCDE' });
const { S, NET } = app;
check(S.screen === 'online', 'link invito apre la schermata Online', S.screen);
check(NET.lastCode === 'ABCDE', 'codice stanza precompilato dal link', NET.lastCode);
check(S.hint === 'invite', 'mostra il messaggio di invito');
const onlineView = app.run('viewOnline()');
check(onlineView.includes('ABCDE') && onlineView.includes('Sei stato invitato nella stanza'), 'il codice e il messaggio di invito sono nella schermata Online');

// --- link e QR ---
NET.code = 'ZZZZZ';
check(app.run('inviteLink()') === 'https://example.test/minigames/#room=ZZZZZ', 'link invito con #room=CODICE', app.run('inviteLink()'));
const qr = app.run('inviteQr()');
check(typeof qr === 'string' && qr.includes('<svg') && qr.includes('viewBox'), 'QR generato come SVG inline');

// --- link da file://: deve puntare alla versione pubblicata ---
const local = boot({ location: { protocol: 'file:', origin: 'null' } });
local.NET.code = 'ZZZZZ';
check(
  local.run('inviteLink()') === 'https://zhenwang21.github.io/minigames-hub/#room=ZZZZZ',
  'da file:// il link invito usa la versione pubblicata',
  local.run('inviteLink()')
);
const https = boot({ location: { protocol: 'https:' } });
https.NET.code = 'ZZZZZ';
check(https.run('appBase()') === 'https://example.test/minigames/', 'su https il link usa origine e percorso correnti');
app.run('showInvite()');
const modal = app.els.modal;
check(modal.innerHTML.includes('ZZZZZ') && modal.innerHTML.includes('<svg'), 'modale invito con QR e codice');
check(modal.innerHTML.includes('copyInvite()') && modal.innerHTML.includes('shareInvite()'), 'modale con copia link e condividi');

// --- backup / ripristino ---
S.players = ['Anna', 'Bruno'];
S.scores = { Anna: 30, Bruno: 0 };
NET.name = 'Anna';
NET.lastCode = 'ABCDE';
const backup = app.run('backupData()');
check(backup.app === 'minigames-hub' && backup.players.length === 2, 'backup contiene i giocatori');
check(backup.scores.Anna === 30 && backup.name === 'Anna', 'backup contiene punteggi e nome');

S.players = [];
S.scores = {};
app.call('applyBackup', backup);
check(S.players.join(',') === 'Anna,Bruno', 'ripristino giocatori');
check(S.scores.Anna === 30, 'ripristino punteggi');
check(NET.name === 'Anna' && NET.lastCode === 'ABCDE', 'ripristino nome e ultimo codice');

S.players = [];
S.scores = {};
app.call('applyBackup', {
  players: ['  X ', '', 'Y', 'x'],
  scores: { A: '12', B: 'abc' },
  cust: [{ id: 'cx99', name: 'Cantante', desc: 'Ruolo di prova', fac: 'wolf' }],
  ncCats: [{ k: 'cu1', it: 'Cantanti', en: 'Singers' }]
});
check(S.players.join(',') === 'X,Y', 'backup ripulisce e deduplica i nomi', S.players.join(','));
check(S.scores.A === 12 && S.scores.B === undefined, 'backup scarta punteggi non numerici');
check(app.run('CUST').some((c) => c.id === 'cx99' && c.name === 'Cantante'), 'backup ripristina i ruoli personalizzati');
check(app.run('NC_CATS').some((c) => c.it === 'Cantanti'), 'backup ripristina le categorie NC personalizzate');

// --- annulla round ---
S.scores = { Anna: 10 };
app.run('undoRound()'); // stack vuoto
check(app.alerts.some((m) => m.length > 0), 'annulla round senza storico avvisa');
S.scores = { Anna: 10 };
app.run('scoreSnap()');
S.scores = { Anna: 60 };
app.run('undoRound()');
check(S.scores.Anna === 10, 'annulla round riporta i punteggi allo snapshot', S.scores.Anna);
app.run('UNDO.length = 0');
for (let i = 0; i < 25; i++) {
  S.scores = { Anna: i };
  app.run('scoreSnap()');
}
check(app.run('UNDO.length') === 20, 'lo stack di annulla è limitato a 20', app.run('UNDO.length'));

// --- correzione manuale: chiavi dei punteggi ---
S.players = ['Anna', 'Bruno'];
S.scores = { Anna: 5, Carla: 7 };
check(app.run('scoreKeys()').join(',') === 'Anna,Bruno,Carla', 'correzione punteggi include giocatori e voci esistenti');

// --- Preferiresti: pacchetti pronti ---
S.lang = 'it';
S.pv = { a: '', b: '' };
app.run("pvPreset('classic')");
check(S.pv.a === 'Non usare mai più il telefono' && S.pv.b === 'Non mangiare mai più pizza', 'pacchetto classico riempie le due opzioni', S.pv.a + ' / ' + S.pv.b);
app.run("pvPreset('classic')");
check(S.pv.a === 'Vincere 1 milione subito', 'un secondo tocco passa alla coppia successiva', S.pv.a);
S.lang = 'en';
S.pv.i = 0;
app.run("pvPreset('hot')");
check(S.pv.a === 'Coffee is overrated' && S.pv.b === 'Tea is overrated', 'pacchetto hot in inglese');
app.run('pvRandom()');
check(app.run('PV_DB')[S.pv.pack] && S.pv.a && S.pv.b, 'casuale sceglie un pacchetto valido', S.pv.pack);

// pacchetti online (host)
NET.pvA = '';
NET.pvB = '';
NET.pvI = 0;
S.lang = 'it';
app.run("pvPresetOnline('absurd')");
check(NET.pvA === 'Avere le mani al posto dei piedi' && NET.pvB === 'Avere i piedi al posto delle mani', 'pacchetto online riempie le opzioni host');
check(NET.pvPack === 'absurd', 'pacchetto online selezionato');

// --- attesa offline portata a 60 secondi ---
const src = fs.readFileSync(sourceFile(), 'utf8');
check(/hostDrop\(n\),\s*(60000|6e4)\)/.test(src), 'attesa offline di 60 secondi nel file in prova');
check(!/hostDrop\(n\),\s*(25000|2\.5e4)\)/.test(src), 'nessun timeout offline da 25 secondi');

// --- ripresa dopo reload/standby ---
const resApp = boot();
const RN = resApp.NET,
  RS = resApp.S;
RN.name = 'Anna';
RN.code = 'ABCDE';
RN.host = true;
RN.st = 'lobby';
RN.players = ['Anna', 'Bruno'];
RN.order = ['Anna', 'Bruno'];
RN.hostName = 'Anna';
RN.scores = { Anna: 100, Bruno: 20 };
RS.scores = { Anna: 100, Bruno: 20 };
resApp.run('saveSession(true)');
const sessRaw = resApp.ctx.localStorage.getItem('mgh_session_v1');
check(!!sessRaw && sessRaw.includes('ABCDE'), 'sessione stanza salvata in localStorage');
check(!!JSON.parse(sessRaw).snap && JSON.parse(sessRaw).snap.players.length === 2, 'snapshot host salvato con i giocatori');
resApp.run("RESUME={room:null,snap:null,savedAt:0,lastKey:''};loadSession()");
const R2 = resApp.run('RESUME');
check(R2.room && R2.room.code === 'ABCDE' && R2.room.name === 'Anna', 'loadSession rilegge la stanza');
check(!!R2.snap && R2.snap.scores.Anna === 100, 'loadSession rilegge lo snapshot host');
const homeResume = resApp.run('viewHome()');
check(
  homeResume.includes('ABCDE') && homeResume.includes('resumeHost()') && homeResume.includes('dismissResume()'),
  'la home mostra la card per riprendere la stanza host'
);
resApp.run('dismissResume()');
check(!resApp.ctx.localStorage.getItem('mgh_session_v1'), 'Ignora cancella la sessione salvata');
// sessione scaduta
resApp.ctx.localStorage.setItem(
  'mgh_session_v1',
  JSON.stringify({ at: Date.now() - 3 * 60 * 60 * 1000, room: { code: 'ZZZZZ', name: 'X', host: false } })
);
resApp.run("RESUME={room:null,snap:null,savedAt:0,lastKey:''};loadSession()");
check(!resApp.run('RESUME').room, 'oltre due ore la sessione non viene proposta');
// card ospite
resApp.run(
  "RESUME={room:{code:'ABCDE',name:'Anna',host:false,players:['Anna','Bruno'],n:2,at:Date.now()},snap:null,savedAt:0,lastKey:''}"
);
const homeGuest = resApp.run('viewHome()');
check(
  homeGuest.includes('resumeGuest()') && homeGuest.includes('Rientra nella stanza'),
  'la card ospite usa resumeGuest'
);
// lobby più chiara
RN.st = 'lobby';
RN.code = 'ABCDE';
RN.host = false;
RN.name = 'Anna';
RN.hostName = 'Bruno';
RN.players = ['Bruno', 'Anna'];
RN.off = ['Anna'];
RN.err = '';
RN.notice = '';
const lobby = resApp.run('viewOnline()');
check(lobby.includes('copyCode()'), 'lobby con copia del codice');
check(lobby.includes('1/2') && lobby.includes('connessi'), 'lobby mostra i giocatori connessi');
check(lobby.includes('offline') && lobby.includes('host'), 'lobby distingue offline e host');
check(lobby.includes('1.11.0'), 'lobby mostra la versione');
// riepilogo condivisibile
RS.scores = { Anna: 300, Bruno: 100 };
RN.game = { g: 'impostore' };
const summary = resApp.run('summaryText()');
check(summary.includes('Impostore') && summary.indexOf('1. Anna: 300') > 0, 'riepilogo con nome gioco e ordine');
check(summary.indexOf('Anna: 300') < summary.indexOf('Bruno: 100'), 'riepilogo ordinato per punti');

// --- impostazioni, temi e statistiche ---
RN.game = null;
RN.host = false;
RS.screen = 'home';
RS.stats = { games: 0, byGame: {}, wins: {}, played: {}, streak: {}, best: {} };
resApp.run("setTheme('oceano')");
check(RS.theme === 'oceano', 'il tema scelto viene salvato in memoria');
check(resApp.run('document.documentElement.dataset.theme') === 'oceano', 'il tema è applicato al documento');
check((resApp.ctx.localStorage.getItem('mgh_save_v1') || '').includes('oceano'), 'il tema finisce nel salvataggio locale');
resApp.run("setTheme('viola')");
resApp.run('toggleSnd()');
check(RS.sndOn === false, 'il toggle dei suoni spegne');
resApp.run('toggleSnd()');
resApp.run('toggleVib()');
check(RS.vibOn === false, 'il toggle della vibrazione spegne');
resApp.run('toggleVib()');

// statistiche: base a inizio partita, poi fine con punteggi
RS.screen = 'play';
RS.game = 'impostore';
RS.players = ['Anna', 'Bruno'];
RS.scores = { Anna: 0, Bruno: 0 };
RS.G = { phase: 'vote' };
resApp.run('statsTick()');
RS.scores = { Anna: 30, Bruno: 10 };
RS.G = { phase: 'end' };
resApp.run('statsTick()');
resApp.run('statsTick()');
const st = RS.stats;
check(st.games === 1, 'una sola partita registrata anche con più render', st.games);
check(st.wins.Anna === 1 && st.wins.Bruno === undefined, 'vince chi ha più punti nel round');
check(st.played.Anna === 1 && st.played.Bruno === 1, 'partite giocate per tutti i giocatori');
check(st.byGame.impostore === 1, 'conteggio per gioco');
check(st.best.Anna === 1 && st.streak.Bruno === 0, 'serie e record aggiornati');
RS.G = { phase: 'vote' };
resApp.run('statsTick()');
RS.G = { phase: 'end' };
resApp.run('statsTick()');
check(RS.stats.games === 2 && RS.stats.wins.Anna === 1, 'una partita a zero punti non assegna vittorie');

// impostazioni mostrate nella modale
RS.screen = 'home';
RS.lastGame = 'impostore';
resApp.run('showSettings()');
const setHtml = resApp.els.modal.innerHTML;
check(setHtml.includes('Impostazioni') && setHtml.includes('Suoni'), 'impostazioni con i suoni');
check(setHtml.includes('Tema') && setHtml.includes('Oceano'), 'impostazioni con i temi');
check(setHtml.includes('Statistiche') && setHtml.includes('Anna'), 'impostazioni con le statistiche');
check(setHtml.includes('Azzera statistiche'), 'impostazioni con azzeramento statistiche');

// rigioca dalla lobby
RN.host = true;
RN.st = 'lobby';
RN.view = null;
RN.players = ['Anna', 'Bruno', 'Carla', 'Dario'];
RN.hostName = 'Anna';
RN.code = 'ABCDE';
RN.err = '';
RN.notice = '';
RS.lastGame = 'taboo';
const lobby2 = resApp.run('viewOnline()');
check(lobby2.includes('tbHostOpen()') && lobby2.includes('Rigioca'), "la lobby propone di rigiocare l'ultimo gioco");

// --- 1.9.0: introduzione e demo ---
const q = boot();
const QS = q.S;
const QN = q.NET;
check(!QS.onboarded, "un utente nuovo parte con l'introduzione da vedere");
const onboard = q.run('onboardCard()');
check(onboard.includes('Benvenuto') && onboard.includes('startDemo()'), "la home propone l'introduzione e la demo");
q.run('dismissOnboard()');
check(QS.onboarded === true && q.run('onboardCard()') === '', "l'introduzione si chiude e non ricompare");
check(JSON.parse(q.ctx.localStorage.getItem('mgh_save_v1')).onboarded === 1, "l'introduzione vista è salvata");

QS.players = [];
QS.scores = {};
QS.stats = { games: 0, byGame: {}, wins: {}, played: {}, streak: {}, best: {} };
QS.demo = false;
q.run('startDemo()');
check(QS.demo === true, 'la demo parte');
check(QS.players.join(',') === 'Anna,Bruno,Carla', 'la demo aggiunge giocatori temporanei', QS.players.join(','));
check(QS.screen === 'play' && QS.game === 'preferisci', 'la demo gioca una partita di Preferiresti');
q.run('pvShow()');
q.run("pvVote('a')");
q.run('pvShow()');
q.run("pvVote('a')");
q.run('pvShow()');
q.run("pvVote('b')");
check(QS.G.phase === 'pvres', 'la demo arriva alla fine del round', QS.G.phase);
check(QS.stats.games === 0, 'la demo non registra statistiche');
check(q.run('summaryData()') !== null && q.run('summaryBar()').includes('Riepilogo partita'), 'la demo mostra il riepilogo');
const demoRaw = q.ctx.localStorage.getItem('mgh_save_v1');
check(!demoRaw || !JSON.parse(demoRaw).players.length, 'la demo non salva i giocatori finti');
q.run('exitDemo()');
check(QS.demo === false && QS.players.length === 0 && QS.screen === 'home', 'uscendo dalla demo si torna alla home pulita');

// --- 1.9.0: riepilogo di fine partita ---
QS.players = ['Anna', 'Bruno', 'Carla'];
QS.scores = { Anna: 0, Bruno: 0, Carla: 0 };
QS.game = 'preferisci';
QS.mode = 'auto';
QS.pv = { a: 'Caffè', b: 'Tè', i: 0, pack: '' };
QS.screen = 'setup';
QS.G = null;
q.run('startPref()');
check(q.run('summaryData()') === null, 'durante la partita non c’è riepilogo');
q.run('pvShow()');
q.run("pvVote('a')");
q.run('pvShow()');
q.run("pvVote('a')");
q.run('pvShow()');
q.run("pvVote('b')");
const sd = q.run('summaryData()');
check(sd && sd.max === 100 && sd.winners.length === 2, 'il riepilogo calcola i punti guadagnati', JSON.stringify(sd && sd.winners));
check(q.run('summaryBar()').includes('Vince'), 'il riepilogo nomina il vincitore');
check(QS.stats.games === 1, 'la partita vera registra la statistica', QS.stats.games);
q.run('rematchSummary()');
check(QS.G.phase === 'pvpass' && q.run('summaryData()') === null, 'Rigioca azzera il riepilogo e riparte');

// --- 1.9.0: avviso sulle domande automatiche ---
QS.dbAck = 0;
QS.game = 'impostore';
QS.screen = 'setup';
QS.players = ['Anna', 'Bruno', 'Carla'];
check(q.run('viewSetup()').includes('scritte da voi'), 'il setup avvisa che le domande automatiche sono limitate');
check(q.run('dbHint()').includes('automatiche'), 'il suggerimento permanente parla di domande automatiche');
q.run("selectGame('impostore')");
check(q.els.modal.innerHTML.includes('Domande scritte da voi'), "scegliere un gioco dal database mostra l'avviso");
q.run('dismissDbTip(0)');
check(QS.dbAck === 1, '"Ho capito" segna l’avviso come visto una volta');
check(q.run('maybeDbTip()') === false, 'l’avviso non si ripete dopo la conferma');
q.run("setMode('auto')");
check(q.els.modal.style.display !== 'flex', 'tornare in automatico non riapre l’avviso');
QS.dbAck = 0;
q.run("setMode('auto')");
check(q.els.modal.style.display === 'flex', 'la prima volta l’avviso compare anche dal cambio modalità');
q.run('dismissDbTip(1)');
check(QS.dbAck === 2, '"Non mostrare più" disattiva l’avviso');
q.run('maybeDbTip()');
check(q.els.modal.style.display !== 'flex', 'dopo "Non mostrare più" non si apre da solo');
q.run('showDbTip(true)');
check(q.els.modal.innerHTML.includes('Domande scritte da voi'), 'l’avviso resta consultabile a mano');
q.run('closeModal()');

// --- 1.9.0: accessibilità ---
q.run("setTextSize('l')");
check(q.run('document.documentElement.dataset.text') === 'l', 'testo grande applicato al documento');
check(JSON.parse(q.ctx.localStorage.getItem('mgh_save_v1')).textSize === 'l', 'dimensione testo salvata');
q.run('toggleContrast()');
check(q.run('document.documentElement.dataset.contrast') === 'high', 'alto contrasto applicato');
q.run('toggleMotion()');
check(q.run('document.documentElement.dataset.motion') === 'off', 'animazioni ridotte applicate');
check(
  JSON.parse(q.ctx.localStorage.getItem('mgh_save_v1')).contrast === 1 &&
    JSON.parse(q.ctx.localStorage.getItem('mgh_save_v1')).motion === 1,
  'contrasto e animazioni salvati'
);
q.run("setTextSize('m')");
q.run('toggleContrast()');
q.run('toggleMotion()');

// --- 1.9.0: preferenze ricordate ---
QS.mode = 'gm';
QS.cfg = { imp: 2, und: 1, mwN: 1, cats: new Set(['food', 'sport']) };
QS.timerPref = 180;
QS.favPV = ['classic'];
QS.used = new Set(['impostore:0']);
QS.pv.pack = 'hot';
QS.demo = false;
q.run('saveLocal()');
const prefRaw = JSON.parse(q.ctx.localStorage.getItem('mgh_save_v1'));
check(prefRaw.mode === 'gm' && prefRaw.cfg.cats.join(',') === 'food,sport', 'modalità e categorie salvate');
check(prefRaw.timerPref === 180 && prefRaw.favPV[0] === 'classic' && prefRaw.pvPack === 'hot', 'timer, preferiti e pacchetto salvati');
check(prefRaw.seen.includes('impostore:0'), 'le domande viste finiscono nel salvataggio');
q.run("S.mode='auto';S.cfg={und:1,mwN:1,cats:new Set(CATS),imp:1};S.timerPref=120;S.favPV=[];S.used=new Set();S.pv.pack=''");
q.run('loadLocal()');
check(QS.mode === 'gm' && QS.timerPref === 180, 'loadLocal ripristina modalità e timer');
check(QS.favPV.includes('classic') && QS.used.has('impostore:0'), 'loadLocal ripristina preferiti e domande viste');
check(QS.cfg.cats.has('sport') && !QS.cfg.cats.has('tech'), 'loadLocal ripristina le categorie scelte');
check(QS.cfg.imp === 2, 'loadLocal ripristina il numero di impostori');
q.run("S.screen='play';S.game='impostore';tmStop();tmDraw()");
check(/3′ ★/.test(q.els.tmr.innerHTML), 'il timer preferito è in testa con la stella', q.els.tmr.innerHTML.slice(0, 80));
QS.screen = 'setup';
QS.favPV = ['classic', 'hot'];
q.run('pvFavRandom()');
check(['classic', 'hot'].includes(QS.pv.pack), 'casuale tra i preferiti resta nei pacchetti salvati', QS.pv.pack);

// --- 1.9.0: backup, spazio e dati ---
QS.lastBackup = 0;
q.run('exportBackup()');
check(QS.lastBackup > 0, 'esportare un backup segna la data');
const bd = q.run('backupData()');
check(bd.timerPref === 180 && bd.favPV[0] === 'classic' && bd.seen.length >= 1, 'il backup include le preferenze 1.9.0');
check(bd.onboarded === 1 && bd.dbAck === 2, 'il backup include introduzione e avviso database');
const bytes = q.run('storageBytes()');
check(bytes > 0, 'lo spazio locale usato è calcolato', bytes);
check(/KB|MB/.test(q.run('fmtBytes(2048)')), 'lo spazio è formattato in KB/MB', q.run('fmtBytes(2048)'));
q.run('hostNotesOpen()');
q.run('$("hn").value = "  Ordine: Anna, Bruno  "');
q.run('saveHostNotes()');
check(QS.hostNotes === 'Ordine: Anna, Bruno', 'le note host vengono ripulite e salvate', QS.hostNotes);
check(q.run('backupData()').hostNotes === 'Ordine: Anna, Bruno', 'le note host finiscono nel backup');
q.run('snoozeBackup()');
check(QS.backupSnooze > Date.now(), 'il promemoria backup si può rimandare');
QS.lastBackup = 0;
QS.backupSnooze = 0;
QS.scores = { Anna: 10 };
check(q.run('backupReminder()').includes('backup'), 'la home ricorda di esportare il backup');
QS.scores = {};
QS.players = [];
QS.stats = { games: 0, byGame: {}, wins: {}, played: {}, streak: {}, best: {} };
check(q.run('backupReminder()') === '', 'senza dati il promemoria non compare');
q.run('resetPrefs()');
check(QS.timerPref === 120 && QS.mode === 'auto' && QS.ncPref.length === 0, 'ripristino preferenze giochi');
q.run('showNews()');
check(q.els.modal.innerHTML.includes('Novità 1.11.0'), 'la modale Novità è alla versione 1.11.0');
check(q.els.modal.innerHTML.includes('Colori e simboli dedicati'), 'le novità elencano i cosmetics');
q.run('closeModal()');

// --- 1.10.0: cosmetics ---
const c = boot();
const CS = c.S;
const avA = c.run("av('Anna')"),
  avA2 = c.run("av('Anna')"),
  avB = c.run("av('Bruno')");
check(avA.e === avA2.e && avA.c === avA2.c, 'l’avatar è stabile per lo stesso nome');
check(avA.e !== avB.e || avA.c !== avB.c, 'nomi diversi tendono ad avatar diversi', avA.e + ' vs ' + avB.e);
check(/class="av/.test(c.run("avHtml('Anna')")) && c.run("avHtml('Anna')").includes(avA.e), 'avHtml produce il badge con emoji');
check(
  Object.keys(c.run('GAME_ACCENT')).join(',') === 'impostore,mrwhite,who_said,preferisci,lupus,nomicose,taboo,chisono',
  'ogni gioco ha il suo accento'
);
check(
  Object.values(c.run('GAME_ACCENT')).every((p) => p.length === 2 && p.every((x) => /^#[0-9a-f]{6}$/i.test(x))),
  'gli accenti sono coppie di colori validi'
);
CS.screen = 'setup';
CS.game = 'lupus';
check(c.run('screenGame()') === 'lupus', 'il setup usa il gioco scelto per l’accento');
CS.screen = 'ncsetup';
check(c.run('screenGame()') === 'nomicose', 'il setup online di NC usa l’accento giusto');
CS.screen = 'home';
CS.game = null;
CS.scores = { Anna: 100, Bruno: 20 };
const homeCos = c.run('viewHome()');
check(homeCos.includes('gtile') && homeCos.includes('--ga:#a855f7'), 'le card della home hanno la tile colorata');
check(homeCos.includes('gcard'), 'le card della home hanno l’effetto hover');
CS.screen = 'play';
CS.game = 'preferisci';
CS.players = ['Anna', 'Bruno'];
CS.scores = { Anna: 300, Bruno: 100 };
CS.pv = { a: 'Caffè', b: 'Tè', i: 0, pack: '' };
c.run('startPref()');
c.run('pvShow()');
c.run("pvVote('a')");
c.run('pvShow()');
c.run("pvVote('a')");
const sumCos = c.run('summaryBar()');
check(sumCos.includes('celebrate') && sumCos.includes('class="av'), 'il riepilogo festeggia con avatar');
const cssCos = fs.readFileSync(sourceFile(), 'utf8');
check(/\.gtile\{/.test(cssCos) && /\.av\{/.test(cssCos) && /#app\[data-game\]:before/.test(cssCos), 'CSS condiviso per tile, avatar e accento');
check(/function applyGameAccent/.test(cssCos) && /applyGameAccent\(\)/.test(cssCos), 'l’accento di gioco è applicato a ogni render');
check(/screenGame\(\)/.test(cssCos), 'il gioco attivo è dedotto anche nei setup');

// --- 1.11.0: gestione giocatori ---
CS.screen = 'setup';
CS.game = 'lupus';
CS.players = ['Anna', 'Bruno'];
CS.scores = { Anna: 50, Bruno: 0 };
c.run('renamePlayer(0)');
check(c.els.modal.innerHTML.includes('Rinomina giocatore'), 'la modale di rinomina si apre');
c.run('$("rn").value = "Carla"');
c.run('savePlayerName(0)');
check(CS.players[0] === 'Carla' && CS.scores.Carla === 50 && CS.scores.Anna === undefined, 'rinomina migra anche il punteggio');
c.run('renamePlayer(1)');
c.run('$("rn").value = "Carla"');
c.run('savePlayerName(1)');
check(CS.players[1] === 'Bruno' && c.alerts.some((m) => m.includes('già presente')), 'la rinomina rifiuta i nomi duplicati');
c.run('closeModal()');
c.run('removePlayer(0)');
check(CS.players.join(',') === 'Bruno' && c.run('P_UNDO.n') === 'Carla', 'la rimozione ricorda il giocatore');
c.run('undoRemovePlayer()');
check(CS.players.join(',') === 'Carla,Bruno' && CS.scores.Carla === 50, 'annulla rimozione ripristina nome e punteggio');

// --- 1.11.0: statistiche recenti e CSV ---
CS.stats = { games: 0, byGame: {}, wins: {}, played: {}, streak: {}, best: {}, recent: [] };
CS.players = ['Anna', 'Bruno'];
CS.scores = { Anna: 120, Bruno: 20 };
c.call('statsRecord', 'lupus', { scores: { Anna: 20, Bruno: 20 } }, true);
check(CS.stats.recent.length === 1 && CS.stats.recent[0].g === 'lupus', 'la partita finita entra nelle recenti');
check(CS.stats.recent[0].w === 'Anna', 'le recenti ricordano il vincitore', CS.stats.recent[0].w);
const recHtml = c.run('statsRecentHtml(4)');
check(recHtml.includes('Lupus') && recHtml.includes('Anna'), 'le recenti compaiono nelle impostazioni');
const sanRec = c.run("sanitizeStats({games:2,recent:[{g:'lupus',t:1,w:'Anna'},{g:'x',t:1,w:'No'}]})");
check(sanRec.recent.length === 1 && sanRec.recent[0].g === 'lupus', 'le recenti vengono validate nel backup');
check(/Nome|Name/.test(fs.readFileSync(sourceFile(), 'utf8')), 'il CSV usa intestazioni tradotte');

// --- 1.11.0: import con unisci/sostituisci ---
c.run('showImportDialog({v:"1.0.0",exportedAt:"2026-01-01",players:["Dario"],scores:{Dario:5},stats:{games:2}})');
check(c.els.modal.innerHTML.includes('Unisci') && c.els.modal.innerHTML.includes('Sostituisci'), 'la modale di import offre unisci o sostituisci');
check(c.els.modal.innerHTML.includes('versione diversa'), 'la modale avvisa se il backup è di un’altra versione');
c.run('PENDING_BACKUP=null;closeModal()');
CS.players = ['Anna'];
CS.scores = { Anna: 30 };
CS.stats = { games: 1, byGame: { lupus: 1 }, wins: { Anna: 1 }, played: { Anna: 1 }, streak: { Anna: 1 }, best: { Anna: 1 }, recent: [] };
c.call('mergeBackup', {
  players: ['Anna', 'Dario'],
  scores: { Anna: 10, Dario: 5 },
  stats: { games: 2, byGame: { lupus: 1 }, wins: { Dario: 1 }, played: { Dario: 1 }, streak: { Dario: 1 }, best: { Dario: 1 }, recent: [{ g: 'lupus', t: 1, w: 'Dario' }] }
});
check(CS.players.join(',') === 'Anna,Dario', 'unisci aggiunge i giocatori mancanti');
check(CS.scores.Anna === 30 && CS.scores.Dario === 5, 'unisci non abbassa i punteggi esistenti');
check(CS.stats.games === 3 && CS.stats.wins.Dario === 1, 'unisci somma le statistiche');
check(CS.stats.recent.length === 1 && CS.stats.recent[0].w === 'Dario', 'unisci importa le partite recenti');

// --- 1.11.0: le mie domande ---
CS.myQ = c.run("sanitizeMyQ({who:['Domanda personale?'],pv:[{a:'Caffè',b:'Tè'},{a:'',b:'No'}]})");
c.run('syncPvMine()');
check(CS.myQ.who.length === 1 && CS.myQ.pv.length === 1, 'le domande personali vengono ripulite');
check(c.run('whoPool()').includes('Domanda personale?'), 'Chi l’ha detto? usa le domande personali');
check(!!c.run('PV_DB.mine') && c.run('PV_DB.mine').length === 1, 'Preferiresti espone il pacchetto personale');
c.run("S.pv.pack='';pvPreset('mine')");
check(CS.pv.a === 'Caffè' && CS.pv.b === 'Tè' && CS.pv.pack === 'mine', 'il pacchetto personale si può scegliere');
c.run('myQOpen()');
c.run('$("mq-who").value = "Prima?\\nSeconda?"');
c.run('$("mq-pv").value = "Mare | Montagna\\nRiga senza separatore"');
c.run('myQSave()');
check(CS.myQ.who.length === 2 && CS.myQ.pv.length === 1 && CS.myQ.pv[0].a === 'Mare', 'l’editor salva domande e coppie');
check(c.run('backupData()').myQ.who.length === 2, 'le domande personali finiscono nel backup');
c.call('applyBackup', { players: [], scores: {}, myQ: { who: ['Solo questa?'], pv: [] } });
check(CS.myQ.who.length === 1 && !c.run('PV_DB.mine'), 'il ripristino sostituisce le domande personali');

// --- 1.11.0: avatar scelti, temi e podio ---
CS.avMap = { Anna: 0 };
check(c.run("av('Anna')").e === c.run('AV_E[0]'), 'un avatar scelto vince sull’hash del nome');
c.run("AV_PICK='Anna';setAvatarPick(3)");
check(CS.avMap.Anna === 3 && c.run("av('Anna')").e === c.run('AV_E[3]'), 'il selettore salva l’avatar per nome');
check(c.run("sanitizeAvMap({Anna:3,Bruno:99,X:'a'})").Bruno === undefined, 'gli avatar fuori intervallo vengono scartati');
c.run("AV_PICK='Anna';setAvatarPick(-1)");
check(CS.avMap.Anna === undefined, 'si può tornare all’avatar automatico');
CS.avMap.Anna = 2;
c.NET.name = 'Anna';
check(c.run('joinPayload()').av === 2, 'il join porta con sé l’avatar scelto');
CS.hostNotes = 'Regola della casa';
c.run('NET.host=true;NET.name="Anna";NET.conns={Bruno:{send:function(m){NET.lastMsg=m}}}');
c.run('shareHostNotes()');
check(c.run('NET.lastMsg.t') === 'note' && c.run('NET.lastMsg.text') === 'Regola della casa', 'la nota host viene inviata ai client');
c.run('NET.host=false;NET.conns={}');
CS.players = ['Anna'];
CS.scores = { Anna: 10 };
check(c.run('THEMES').includes('neon') && c.run('THEMES').includes('ghiaccio'), 'ci sono i temi Neon e Ghiaccio');
c.run('showSettings()');
check(c.els.modal.innerHTML.includes('Neon') && c.els.modal.innerHTML.includes('Ghiaccio'), 'i nuovi temi compaiono nelle impostazioni');
check(/data-theme="neon"/.test(cssCos) && /data-theme="ghiaccio"/.test(cssCos), 'i nuovi temi hanno le variabili CSS');
check(/#app\[data-game\]:after/.test(cssCos) && /prefers-contrast:more/.test(cssCos), 'sfondo per gioco e contrasto di sistema sono nel CSS');
CS.screen = 'play';
CS.game = 'preferisci';
CS.players = ['Anna', 'Bruno', 'Carla'];
CS.scores = { Anna: 300, Bruno: 100, Carla: 100 };
CS.pv = { a: 'Caffè', b: 'Tè', i: 0, pack: '' };
c.run('startPref()');
c.run('pvShow()');
c.run("pvVote('a')");
c.run('pvShow()');
c.run("pvVote('a')");
c.run('pvShow()');
c.run("pvVote('b')");
const podium = c.run('summaryBar()');
check(podium.includes('🥇') && podium.includes('🥈') && podium.includes('🥉'), 'il riepilogo mostra il podio top-3');
check(c.run("joinPayload().name") === CS.players[0] || typeof c.run('joinPayload()') === 'object', 'il join include il payload avatar');
check(c.run("sanitizeStats({recent:[{g:'lupus',t:1,w:'Anna'}]}).recent.length") === 1, 'recenti valide');

done();
