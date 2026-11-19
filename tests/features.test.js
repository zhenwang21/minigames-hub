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
check(lobby.includes('1.19.0'), 'lobby mostra la versione');
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
check(q.els.modal.innerHTML.includes('Novità 1.19.0'), 'la modale Novità è alla versione 1.19.0');
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
check(/\.confetti\{/.test(cssCos) && /@keyframes confetti/.test(cssCos), 'CSS dei coriandoli di vittoria');
check(
  /html\[data-motion="off"\] \.confetti\{display:none\}/.test(cssCos),
  'i coriandoli si spengono con le animazioni disattivate'
);
check(
  /html\[data-theme="neon"\] body\{background:#0a0616\}/.test(cssCos),
  'ogni tema tinge anche lo sfondo'
);
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
check(
  /podium-1/.test(podium) && /podium-2/.test(podium) && /podium-3/.test(podium),
  'il podio ha le barre oro, argento e bronzo'
);
check(
  typeof c.run('confettiBurst') === 'function' && typeof c.run('maybeConfetti') === 'function',
  'i coriandoli sono collegati al riepilogo'
);
check(c.run('THEME_BG.neon') === '#0a0616' && c.run('THEME_BG.ghiaccio') === '#07131f', 'la mappa degli sfondi tema è coerente');

// --- 1.13.0: tema Carta, anteprime, font, accento, corona, serie, coriandoli ---
check(c.run('THEMES').includes('carta') && c.run('THEME_BG.carta') === '#f7f2e8', 'il tema Carta è registrato');
check(/html\[data-theme="carta"\]/.test(cssCos) && /html\[data-theme="carta"\] body\{background:#f7f2e8\}/.test(cssCos), 'Carta ha gli override chiari nel CSS');
check(/\.theme-card\{/.test(cssCos) && /\.theme-card \.tp\{/.test(cssCos), 'le impostazioni mostrano anteprime dei temi');
check(c.run('THEME_ACC.carta').length === 2 && c.run('THEME_DOT.carta') === '#b45309', 'ogni tema ha una coppia di colori per l’anteprima');
c.run("setTheme('carta')");
check(c.run('document.documentElement.dataset.theme') === 'carta' && c.run('document.documentElement.style._p["--btn1"]') === undefined, 'Carta è applicato e senza accento manuale non ci sono override inline');
check(c.run('viewHome()').length > 0, 'la home si disegna con il tema Carta');

c.run("setFont('round')");
check(c.run('S.font') === 'round' && c.run('document.documentElement.dataset.font') === 'round', 'il font arrotondato è applicato e salvato');
c.run("setFont('sans')");
check(c.run('S.font') === 'sans' && c.run('document.documentElement.dataset.font') === '', 'si torna al font standard');

check(c.run("normHex('#FACC15')") === '#facc15' && c.run("normHex('giallo')") === '', 'l’accento accetta solo esadecimali validi');
check(Math.round(c.run("contrastRatio('#000000','#ffffff')")) === 21, 'il calcolo del contrasto è corretto');
c.run("setAccent('#facc15')");
const accentOk = ['--acc1', '--acc2', '--acc3', '--btn1', '--btn2'].every((k) => {
  const v = c.run(`document.documentElement.style._p['${k}']`);
  return /^#[0-9a-f]{6}$/.test(v || '');
});
check(c.run('S.accent') === '#facc15' && accentOk, 'l’accento personalizzato imposta tutte le variabili');
check(
  c.run("contrastRatio(document.documentElement.style._p['--btn1'], '#ffffff')") >= 4.4,
  'i bottoni mantengono testo bianco leggibile'
);
check(c.run('backupData().accent') === '#facc15' && c.run('backupData().font') === 'sans', 'accento e font entrano nel backup');
c.run('resetAccent()');
check(c.run('S.accent') === '' && c.run('document.documentElement.style._p["--acc1"]') === undefined, 'si torna all’accento del tema');
const c2 = boot();
c2.call('applyBackup', { players: ['Anna'], accent: '#2563eb', font: 'round' });
check(c2.S.accent === '#2563eb' && c2.S.font === 'round', 'il ripristino riporta accento e font');

c.run("S.stats.streak = { Anna: 3, Bruno: 1 }");
check(c.run("streakTag('Anna')").includes('🔥3') && c.run("streakTag('Bruno')") === '', 'la fiamma compare solo dalle due vittorie di fila');
check(/\.av\.host\{/.test(cssCos) && /\.av\.win\{/.test(cssCos), 'corona host e cornice vincitore sono nel CSS');
check(c.run('CONF_KIND.lupus') === 'stars' && c.run('CONF_KIND.nomicose') === 'dots', 'i coriandoli cambiano forma per gioco');
check(/\.confetti\[data-kind="stars"\]/.test(cssCos) && /\.confetti\[data-kind="dots"\]/.test(cssCos), 'le varianti dei coriandoli sono nel CSS');
check(/logo-shine/.test(cssCos) && /logo-shine/.test(fs.readFileSync(sourceFile(), 'utf8')), 'il logo ha il riflesso animato');
check(/#app\.screen-in\{/.test(cssCos) && typeof c.run('screenIn') === 'function', 'il cambio schermata ha una transizione');
check(
  /html\[data-motion="off"\] \.logo-shine\{animation:none\}/.test(cssCos) &&
    /html\[data-motion="off"\] #app\.screen-in\{animation:none\}/.test(cssCos),
  'le nuove animazioni si spengono con meno movimento'
);

// --- 1.14.0: pacchetti suoni, volume, aptica e beep del timer ---
check(
  c.run('Object.keys(SND_PACK).join(",")') === 'soft,arcade,chime' &&
    c.run('sndCfg().wave') === 'sine',
  'ci sono tre pacchetti suoni e il predefinito è morbido'
);
c.run("setSndPack('arcade')");
check(c.run('S.sndPack') === 'arcade' && c.run('sndCfg().wave') === 'square', 'il pacchetto scelto cambia timbro');
check(c.run('backupData().sndPack') === 'arcade', 'il pacchetto suoni entra nel backup');
c.run("setSndPack('chime')");
check(c.run('S.sndPack') === 'chime' && c.run('sndCfg().gap') > c.run('SND_PACK.arcade.gap'), 'le campanelle hanno note più distanziate');

check(c.run('S.vol') === 70 && Math.abs(c.run('sndLevel(1)') - 0.7) < 0.001, 'il volume parte al 70% e scala il guadagno');
c.run('setVol(0)');
check(c.run('S.vol') === 0 && c.run('sndLevel(1)') < 0.001 && c.run('sndReady()') === false, 'a volume zero non parte l’audio');
c.run('setVol(100)');
check(c.run('S.vol') === 100 && c.run('backupData().vol') === 100, 'il volume è salvato e incluso nel backup');
const c3 = boot();
c3.call('applyBackup', { players: ['Anna'], sndPack: 'chime', vol: 50 });
check(c3.S.sndPack === 'chime' && c3.S.vol === 50, 'il ripristino riporta pacchetto e volume');

const vib = [];
c.ctx.navigator.vibrate = (p) => vib.push(p);
c.run('VIB_LAST = 0');
c.run("haptic('reveal')");
check(JSON.stringify(vib[0]) === '[18]', 'l’aptica usa lo schema della rivelazione');
c.run('S.vibOn = false');
c.run('VIB_LAST = 0');
c.run("haptic('wrong')");
check(vib.length === 1, 'senza vibrazione attiva non parte nulla');
c.run('S.vibOn = true');

c.run('tmStart(120)');
c.run('TMR.end = Date.now() + 9000');
c.run('VIB_LAST = 0');
c.run('tmTick()');
check(c.run('TMR.beep10') === true && JSON.stringify(vib[vib.length - 1]) === '[10]', 'a 10 secondi scatta un beep/vibrazione una volta');
c.run('tmAdd(60)');
check(c.run('TMR.beep10') === false, 'aggiungendo un minuto il beep può riscattare');
c.run('TMR.end = Date.now() - 1000');
c.run('VIB_LAST = 0');
c.run('tmTick()');
check(c.run('TMR.done') === true && c.run('TMR.iv') === null, 'a zero il timer si chiude');
check(JSON.stringify(vib[vib.length - 1]) === '[240,120,240]', 'la fine del timer vibra con lo schema lungo');
check(typeof c.run('previewSnd') === 'function' && c.run('typeof setSndPack') === 'function', 'anteprima e scelta del pacchetto sono collegate');

// --- 1.15.0: immagine risultato, scorciatoie, wake lock, privacy ---
const c15 = boot();
const srcHtml = fs.readFileSync(sourceFile(), 'utf8');
check(
  srcHtml.includes('property="og:title"') &&
    srcHtml.includes('name="twitter:card"') &&
    srcHtml.includes('name="description"'),
  'la pagina ha meta description, Open Graph e Twitter'
);
const manifest = JSON.parse(
  fs.readFileSync(require('path').join(__dirname, '..', 'manifest.webmanifest'), 'utf8')
);
check(
  Array.isArray(manifest.shortcuts) &&
    manifest.shortcuts.length === 3 &&
    manifest.shortcuts.every((x) => /#game=[a-z_]+$/.test(x.url)),
  'il manifest offre tre scorciatoie con deep link #game='
);
check(
  manifest.shortcuts.some((x) => x.url.endsWith('#game=impostore')) &&
    manifest.shortcuts.every((x) => x.icons && x.icons.length === 1),
  'le scorciatoie puntano ai giochi e hanno un’icona'
);
check(c15.run("gameFromHash('#game=lupus')") === 'lupus', 'il deep link riconosce un gioco offline');
check(
  c15.run("gameFromHash('#game=nomicose')") === '' && c15.run("gameFromHash('#game=altro')") === '',
  'i giochi solo online e gli id sconosciuti non aprono il setup'
);
check(c15.run("gameFromHash('#room=ABCDE')") === '', 'il link stanza non viene scambiato per un gioco');
check(
  typeof c15.run('shareResultImage') === 'function' &&
    typeof c15.run('resultLines') === 'function' &&
    c15.run('resultLines()') === null,
  'l’immagine del risultato è pronta e senza riepilogo non fa nulla'
);

const wk = { calls: 0, released: 0 };
c15.ctx.navigator.wakeLock = {
  request() {
    wk.calls++;
    return {
      then(fn) {
        fn({
          release() {
            wk.released++;
          },
          addEventListener() {}
        });
        return this;
      },
      catch() {
        return this;
      }
    };
  }
};
c15.run("S.screen = 'play'; S.game = 'impostore'");
c15.run('tmClear()');
check(c15.run('wakeWanted()') === false, 'senza timer non serve tenere acceso lo schermo');
c15.run('tmStart(60)');
check(wk.calls === 1 && c15.run('!!WAKE'), 'durante il timer lo schermo resta acceso');
c15.run('tmClear()');
check(wk.released === 1 && c15.run('!WAKE'), 'alla fine del timer il wake lock viene rilasciato');

check(
  c15.run("!!I.it.privacyTitle && !!I.en.privacyTitle && !!I.it.privacyLocal && !!I.en.privacyBackup"),
  'i testi privacy esistono in italiano e inglese'
);
check(
  c15.run("!!I.it.summaryImage && !!I.en.summaryImage && !!I.it.imgSaved && !!I.en.news19"),
  'immagine risultato e novità sono tradotte'
);
c15.run('showPrivacy()');
check(
  c15.els.modal.innerHTML.includes(c15.run("t('privacyTitle')")) &&
    c15.els.modal.innerHTML.includes(c15.run("t('privacyLocal')")),
  'la modale Privacy mostra i testi locali'
);
check(
  typeof c15.run('showPrivacy') === 'function' && /onclick="showPrivacy\(\)"/.test(srcHtml),
  'la Privacy è raggiungibile dalle impostazioni'
);

// --- 1.16.0: host, ordine, PIN stanza, QR e offline ---
const c16 = boot();
c16.run(
  "NET.host = true; NET.game = null; NET.code = 'ABCDE'; NET.hostName = 'Anna'; NET.name = 'Anna'; NET.players = ['Anna','Bruno','Carla']; NET.order = ['Anna','Bruno','Carla']; NET.st = 'lobby'; NET.view = null; NET.off = ['Bruno']; S.screen = 'online'"
);
const lob16 = c16.run('viewOnline()');
check(
  lob16.includes('netPassHost(1)') && lob16.includes('netMovePlayer(1,-1)') && lob16.includes('netKick(1)'),
  'la lobby host ha passa comando, frecce e espulsione'
);
check(lob16.includes('Offline') && lob16.includes('Bruno'), 'la lobby mostra il banner degli offline');
c16.run('netMovePlayer(1,-1)');
check(
  c16.run('NET.players.join(",")') === 'Bruno,Anna,Carla' &&
    c16.run('NET.order.join(",")') === 'Bruno,Anna,Carla',
  'l’host riordina giocatori e turni insieme'
);
c16.run('netMovePlayer(0,-1)');
check(c16.run('NET.players.join(",")') === 'Bruno,Anna,Carla', 'il riordino non esce dai limiti');
c16.run('netPassHost(1)');
check(c16.run('NET.host') === true && c16.run('NET.hostName') === 'Anna', 'passare host a un offline non cambia nulla');

check(c16.run("pinClean('12a34')") === '1234' && c16.run("pinClean('12')") === '', 'il PIN accetta solo quattro cifre');
c16.ctx.prompt = () => '1234';
c16.run('setRoomPin(0)');
check(c16.run('NET.pin') === '1234' && c16.run("pinOk('1234')") === true, 'il PIN si imposta e accetta il valore giusto');
check(c16.run("pinOk('0000')") === false && c16.run("pinOk('')") === false, 'un PIN sbagliato o assente viene rifiutato');
check(c16.run('inviteLink()').endsWith('&pin=1234'), 'il link invito porta il PIN');
check(c16.run('showInvite() || 1') && c16.els.modal.innerHTML.includes('1234'), 'la modale invito mostra il PIN');
c16.ctx.prompt = () => '';
c16.run('setRoomPin(0)');
check(c16.run('NET.pin') === '' && c16.run("pinOk('')") === true, 'svuotando il campo il PIN si toglie');
const c16b = boot({ hash: '#room=ABCDE&pin=4321' });
check(c16b.S.screen === 'online' && c16b.NET.pin === '4321' && c16b.NET.lastCode === 'ABCDE', 'il link invito con PIN precompila tutto');
check(
  /id="on-pin"/.test(srcHtml) && /function qrDownload/.test(srcHtml) && /qrBig/.test(srcHtml),
  'la schermata di ingresso e il QR hanno le nuove opzioni'
);
check(
  c16.run("!!I.it.roomPin && !!I.en.roomPin && !!I.it.qrSave && !!I.en.news20"),
  'PIN, QR e novità sono tradotti'
);

// --- 1.17.0: sfida del giorno, mix, grafici e obiettivi ---
const c17 = boot();
check(/^\d{4}-\d{2}-\d{2}$/.test(c17.run('dayKey()')), 'la chiave del giorno è una data locale');
check(c17.run('dayKey(1700000000000)') === c17.run('dayKey(1700000000000)'), 'la chiave del giorno è stabile');
check(c17.run('dayKey(1700000000000)') !== c17.run('dayKey(1700000000000 + 86400000)'), 'giorni diversi hanno chiavi diverse');
check(c17.run('PLAYABLE.includes(dailyPick())'), 'la sfida del giorno sceglie un gioco giocabile offline');
check(c17.run('dailyPick(1700000000000)') === c17.run('dailyPick(1700000000000)'), 'la sfida è deterministica');
c17.run("S.stats.recent = [{ g: dailyPick(), t: Date.now() }]");
check(c17.run('dailyDone()') === true && c17.run('dailyStreak()') === 1, 'la sfida di oggi risulta fatta');
c17.run("S.stats.recent.push({ g: dailyPick(Date.now() - 86400000), t: Date.now() - 86400000 })");
check(c17.run('dailyStreak()') === 2, 'due giorni consecutivi fanno una serie');
check(c17.run('dailyCard()').includes(c17.run("t('dailyTitle')")) && c17.run('dailyCard()').includes(c17.run("t('g_' + dailyPick())")), 'la card della sfida mostra gioco e titolo');
c17.run("S.players = []; S.screen = 'home'; S.game = null");
c17.run('mixGame()');
check(c17.run('S.screen') === 'setup' && c17.run('PLAYABLE.includes(S.game)'), 'la modalità mix apre un gioco a caso');
c17.run("S.stats.byGame = { impostore: 3, lupus: 1 }; S.stats.games = 4; S.stats.recent = [{ g: 'impostore', t: Date.now() }]");
const charts = c17.run('statsChartsHtml()');
check(
  charts.includes(c17.run("t('chartTitle')")) && charts.includes('width:') && charts.includes(c17.run("t('g_impostore')")),
  'il grafico per gioco disegna barre proporzionali'
);
check(charts.includes(c17.run("t('chartDays')")), 'il grafico degli ultimi giorni è presente');
c17.run(
  "S.stats = { games: 10, byGame: { impostore: 1, mrwhite: 1, who_said: 1, preferisci: 1, lupus: 1, nomicose: 1, taboo: 1, chisono: 1 }, wins: { Anna: 5 }, played: { Anna: 10 }, streak: { Anna: 3 }, best: { Anna: 3 }, recent: [] }"
);
const ach = c17.run('achList()');
const gotAch = ach.filter((a) => a.got).map((a) => a.id);
check(ach.length === 9 && gotAch.includes('first') && gotAch.includes('wins5') && gotAch.includes('streak3'), 'gli obiettivi si sbloccano dalle statistiche');
check(gotAch.includes('games10') && gotAch.includes('allgames') && !gotAch.includes('games50'), 'gli obiettivi non ancora raggiunti restano bloccati');
check(c17.run('achHtml()').includes(`${gotAch.length}/9`), 'la griglia mostra quanti obiettivi sono sbloccati');
check(
  c17.run("!!I.it.dailyTitle && !!I.en.mixStart && !!I.it.achTitle && !!I.en.news21"),
  'sfida, mix, obiettivi e novità sono tradotti'
);

// --- 1.18.0: focus trap e tooling ---
const c18 = boot();
check(typeof c18.run('trapFocus') === 'function' && typeof c18.run('modalFocusables') === 'function', 'la modale ha il gestore del focus');
c18.run(
  "const M=$('modal'); M.style.display='flex'; __A={focus(){this.f=1}}; __B={focus(){this.f=1}}; M.querySelectorAll=()=>[__A,__B]; document.activeElement=__B; __p=0; trapFocus({key:'Tab',shiftKey:false,preventDefault(){__p++}})"
);
check(c18.ctx.__A.f === 1 && c18.ctx.__p === 1, 'Tab sull’ultimo elemento torna al primo');
c18.run("document.activeElement=__A; trapFocus({key:'Tab',shiftKey:true,preventDefault(){__p++}})");
check(c18.ctx.__B.f === 1 && c18.ctx.__p === 2, 'Shift+Tab sul primo elemento va all’ultimo');
c18.run("M.style.display='flex'; trapFocus({key:'Escape'})");
check(c18.els.modal.style.display === 'none', 'Escape chiude la modale');

const pkg = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'package.json'), 'utf8'));
const repo = require('path').join(__dirname, '..');
check(
  !!pkg.scripts.test && !!pkg.scripts['test:min'] && !!pkg.scripts.build && !!pkg.scripts.serve,
  'package.json offre script per test, build e server locale'
);
check(fs.existsSync(require('path').join(repo, '.github', 'dependabot.yml')), 'Dependabot è configurato');
check(
  fs.existsSync(require('path').join(repo, 'tests', 'e2e', 'smoke.spec.js')) &&
    fs.existsSync(require('path').join(repo, 'playwright.config.js')),
  'i test browser Playwright sono pronti'
);

check(c.run("joinPayload().name") === CS.players[0] || typeof c.run('joinPayload()') === 'object', 'il join include il payload avatar');
check(c.run("sanitizeStats({recent:[{g:'lupus',t:1,w:'Anna'}]}).recent.length") === 1, 'recenti valide');

// --- 1.11.0: integrità di merge, rename, recenti e pacchetto personale ---
CS.theme = 'neon';
CS.sndOn = false;
CS.timerPref = 60;
CS.textSize = 'l';
c.call('mergeBackup', {
  players: ['Zoe'],
  scores: { Zoe: 7 },
  theme: 'bosco',
  snd: 1,
  timerPref: 300,
  textSize: 's',
  stats: { games: 1 }
});
check(
  CS.theme === 'neon' && CS.sndOn === false && CS.timerPref === 60 && CS.textSize === 'l',
  'unisci non tocca le impostazioni del telefono'
);
CS.players = ['Anna', 'Bruno'];
CS.scores = { Anna: 4 };
CS.avMap = { Anna: 4 };
c.call('renamePlayer', 0);
c.run('$("rn").value = "Dora"');
c.call('savePlayerName', 0);
check(
  CS.players[0] === 'Dora' && CS.avMap.Dora === 4 && CS.avMap.Anna === undefined,
  'la rinomina migra anche l’avatar scelto'
);
check(c.run('backupData()').avMap.Dora === 4, 'gli avatar scelti finiscono nel backup');
check(
  c.run("sanitizeStats({recent:[{g:'lupus',t:1},{g:'who_said',t:5}]}).recent[0].g") === 'who_said',
  'le recenti sono ordinate dalla più nuova'
);
CS.myQ = { who: [], pv: [] };
CS.favPV = ['mine', 'classic'];
c.run('syncPvMine()');
check(
  !c.run('PV_DB.mine') && CS.favPV.join(',') === 'classic',
  'senza domande personali il pacchetto mine sparisce anche dai preferiti'
);

// --- 1.19.0: aptica giusta/sbagliata, vittorie per gioco, riconnessione e setup QR ---
const c19 = boot();
c19.run(`
  S.vibOn = true;
  navigator.vibrate = function (p) { globalThis.__vib = (globalThis.__vib || []).concat([p]); };
  NET.host = true; NET.players = ['Anna'];
  NET.game = { g: 'nc', ph: 'review', cats: [{ k: 'a' }], ok: {} };
  ncBc = function () {};
  VIB_LAST = 0; ncToggleAt(0, 0);
`);
check(JSON.stringify(c19.run('__vib[0]')) === '[45,70,45]', 'segnare una risposta sbagliata vibra con lo schema wrong');
c19.run('VIB_LAST = 0; ncToggleAt(0, 0)');
check(JSON.stringify(c19.run('__vib[1]')) === '[20,55,20]', 'segnare una risposta giusta vibra con lo schema correct');
c19.run(`
  NET.game = { g: 'chi', ph: 'play', lives: { Anna: 2 }, done: {}, last: 'Anna', res: null };
  chiBc = function () {}; scoreSnap = function () {}; netScore = function () {};
  VIB_LAST = 0; chiResolve(false);
`);
check(
  JSON.stringify(c19.run('__vib[2]')) === '[45,70,45]' && c19.run('NET.game.lives.Anna') === 1,
  'Chi sono io? vibra e toglie una vita quando la risposta è sbagliata'
);
c19.run('VIB_LAST = 0; NET.game.ph = "play"; NET.game.lives.Anna = 2; chiResolve(true)');
check(JSON.stringify(c19.run('__vib[3]')) === '[20,55,20]', 'Chi sono io? vibra quando la risposta è giusta');

const c19b = boot();
c19b.run(`
  S.screen = 'play'; S.game = 'impostore'; S.players = ['Anna', 'Bruno'];
  S.scores = { Anna: 3, Bruno: 0 };
  S.stats = { games: 0, byGame: {}, wby: {}, wins: {}, played: {}, streak: {}, best: {}, recent: [] };
  winChime = function () {}; statsRecord('impostore', { scores: { Anna: 0, Bruno: 0 } });
`);
check(c19b.run('S.stats.wby.impostore') === 1, 'una partita con un vincitore conta la vittoria per gioco');
check(c19b.run('S.stats.wby.impostore') === 1 && c19b.run('S.stats.byGame.impostore') === 1, 'partite e vittorie per gioco sono contatori separati');
c19b.run("S.scores = { Anna: 3, Bruno: 3 }; statsRecord('impostore', { scores: { Anna: 3, Bruno: 3 } })");
check(c19b.run('S.stats.wby.impostore') === 1, 'una partita senza punti nuovi non aggiunge vittorie');
check(
  c19b.run("sanitizeStats({ wby: { impostore: 2, nope: 5 } }).wby.impostore") === 2 &&
    c19b.run("sanitizeStats({ wby: { impostore: 2, nope: 5 } }).wby.nope") === undefined,
  'il backup accetta solo vittorie di giochi conosciuti'
);
c19b.run("S.stats.wby = { impostore: 2 }; S.stats.byGame = { impostore: 5 }; S.stats.recent = []");
const chart19 = c19b.run('statsChartsHtml()');
check(
  chart19.includes(c19b.run("t('chartWins')")) && chart19.includes('width:'),
  'il grafico delle vittorie per gioco è presente'
);

const c19c = boot();
c19c.run("NET.st = 'recover'; NET.recTries = 3; NET.lastCode = 'ABCDE'; NET.host = false");
const rec19 = c19c.run('viewOnline()');
check(
  rec19.includes(c19c.run("X('Tentativo', 'Attempt')")) &&
    rec19.includes('3') &&
    rec19.includes('netRetryNow()'),
  'la riconnessione mostra il numero di tentativi e il retry manuale'
);

check(
  c19c.run("setupPayload().g") === '' || typeof c19c.run('setupPayload()') === 'object',
  'il payload del setup è un oggetto'
);
c19c.run("S.players = ['Anna', 'Bruno']; S.game = 'lupus'; S.quick = true; S.timerPref = 180");
check(
  c19c.run('setupPayload().p.join(",")') === 'Anna,Bruno' &&
    c19c.run('setupPayload().q') === 1 &&
    c19c.run('setupPayload().t') === 180,
  'il payload porta gioco, giocatori, modalità veloce e timer'
);
check(c19c.run('setupLink()').includes('#setup='), 'il link di setup usa il frammento #setup=');
check(
  c19c.run("applySetup({ g: 'lupus', p: ['Anna', 'anna', 'Bruno'], q: 1, t: 120 })") === true &&
    c19c.run('S.players.join(",")') === 'Anna,Bruno' &&
    c19c.run('S.quick') === true &&
    c19c.run('S.timerPref') === 120 &&
    c19c.run('S.screen') === 'setup',
  'aprire un setup condiviso applica gioco, nomi senza duplicati, veloce e timer'
);
check(c19c.run("applySetup({ g: 'non_esiste' })") === false, 'un setup con gioco sconosciuto viene rifiutato');
const setupHash = '#setup=' + encodeURIComponent(JSON.stringify({ g: 'impostore', p: ['Zoe'], q: 0, t: 60 }));
check(
  c19c.run(`parseSetupHash(${JSON.stringify(setupHash)})`) === true && c19c.run('S.game') === 'impostore',
  'il frammento #setup= viene letto all’avvio'
);
const bootSetup = boot({ hash: setupHash });
check(
  bootSetup.run('S.game') === 'impostore' && bootSetup.run('S.players.join(",")') === 'Zoe',
  'aprire il link di setup carica il gioco e i giocatori'
);
c19c.run("S.game = 'lupus'; S.players = ['Anna']; showSetupShare()");
check(
  c19c.els.modal.innerHTML.includes('#setup=') && c19c.els.modal.innerHTML.includes(c19c.run("t('shareSetup')")),
  'la modale di condivisione mostra QR, link e titolo'
);
check(
  /onclick="showSetupShare\(\)"/.test(srcHtml) || /showSetupShare\(\)/.test(srcHtml),
  'il pulsante di condivisione è nel setup'
);

const ogFile = require('path').join(__dirname, '..', 'icons', 'og.png');
const ogBuf = fs.readFileSync(ogFile);
check(
  ogBuf[0] === 0x89 && ogBuf[1] === 0x50 && ogBuf.readUInt32BE(16) === 1200 && ogBuf.readUInt32BE(20) === 630,
  'l’immagine Open Graph è un PNG 1200x630'
);
check(
  srcHtml.includes('icons/og.png') &&
    srcHtml.includes('og:image:width') &&
    srcHtml.includes('summary_large_image'),
  'i meta tag puntano alla card Open Graph grande'
);
const pkg19 = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'package.json'), 'utf8'));
check(!!pkg19.scripts.icons && !!pkg19.devDependencies['@playwright/test'], 'package.json ha icone e Playwright fissato');
check(
  fs.existsSync(require('path').join(__dirname, '..', 'lighthouserc.json')) &&
    fs.existsSync(require('path').join(__dirname, '..', 'tests', 'e2e', 'visual.spec.js')),
  'ci sono budget Lighthouse e diff di screenshot'
);
const ciYml = fs.readFileSync(require('path').join(__dirname, '..', '.github', 'workflows', 'ci.yml'), 'utf8');
check(
  ciYml.includes('playwright install') && ciYml.includes('lighthouse-ci-action') && ciYml.includes('npm ci'),
  'la CI esegue Playwright, Lighthouse e installa dal lockfile'
);

done();
