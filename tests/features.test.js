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

done();
