# Minigames Hub — documento di passaggio di consegne

> Documento aggiornato all'ultima revisione del file `Minigames Hub.html`. L'utente parla **italiano** e vuole risposte concise e oneste: dire sempre **cosa è stato verificato** e cosa no. Il progetto è tra amici, non è un prodotto commerciale, ma va tenuto decentemente.

---

## 1. Cos'è il progetto

**Minigames Hub** è una web app a pagina singola, mobile‑first, tema scuro viola/fucsia, con 8 party game. Funziona in due modi:

1. **Passa‑telefono (offline)**: si gioca su un solo telefono che gira tra i giocatori. È la modalità principale e completa.
2. **Online (beta)**: ogni giocatore usa il proprio telefono, con una stanza e un codice. È un bonus, non sostituisce l'offline. **Nomi, Cose e Città, Parole vietate e Chi sono io? esistono solo online.**

È un **unico file HTML** (`Minigames Hub.html`, ~409 KB, ~9.380 righe totali di cui ~9.200 di JavaScript) senza backend. C'è uno script `build-min.js` che minifica il sorgente e scrive **sia `Minigames Hub.min.html` sia `index.html`** (~328 KB, −17%): il file HTML resta la fonte di verità, la build serve solo per distribuire un file più leggero. `index.html` è il file che GitHub Pages pubblica sulla home del sito: va rigenerato a ogni modifica. Il CSS di Tailwind è **compilato inline** dentro il file (non c'è più il CDN di Tailwind): se servono classi nuove, vanno aggiunte a mano nel blocco CSS in cima. Dipendenze esterne: font Google *Plus Jakarta Sans*, **PeerJS 1.5.4** da jsDelivr (solo per l'online) e **qrcode-generator 1.4.4** (MIT) incorporato inline per il QR d'invito.

Giochi:
1. **Mister White** (stile Undercover)
2. **Impostore**
3. **Chi l'ha detto?**
4. **Preferiresti…**
5. **Lupus in Fabula** (modalità rapida e completa)
6. **Nomi, Cose e Città** (solo online, con timer automatico)
7. **Parole vietate** (solo online, due squadre)
8. **Chi sono io?** (solo online, 5 vite a testa)

Storia: il file è stato ricostruito a blocchi e ripulito più volte. Versioni di sicurezza: `Minigames Hub.preformat.html` (prima della passata di Prettier) e `Minigames Hub.backup.html` (originale più vecchio, non toccato). Versione app: `APP_VERSION = '1.6.0'` (la versione viene controllata all'ingresso in stanza: client con versioni diverse vengono rifiutati; il cambio versione è anche il modo per invalidare la cache dei telefoni). La fonte di verità è il file HTML, non vecchi documenti o database esterni.

---

## 2. Architettura del codice

Tutto in un unico `<script>`. Niente framework: stringhe HTML assegnate a `#app.innerHTML` da `render()` e handler inline `onclick="funzione()"`.

**Formattazione del codice**: lo `<script>` è formattato con **Prettier 3** (`--parser babel --single-quote --print-width 100 --trailing-comma none`). Le stringhe di testo lunghe della guida (punteggi e regole) sono state spezzate in array di `<p>` con `.join('')`, un bullet per riga. Il blocco `<style>` compilato di Tailwind resta **minificato di proposito**: non va formattato, esploderebbe il file.

**Stato globale `S`:**
`lang` (`'it'|'en'`), `screen` (`'home' | 'setup' | 'lroles' | 'ltype' | 'play' | 'online' | 'pvsetup' | 'ncsetup' | 'tbsetup'`), `hint` (gioco solo‑online da cui si è arrivati alla schermata Online, oppure `'invite'` quando si apre un link `#room=`), `game`, `players[]`, `scores{}`, `used` (Set per non ripetere domande), `mode` (`'auto'|'gm'`), `gm{a,b,c}`, `pv{a,b,pack,i}` (le due opzioni e il pacchetto di Preferiresti), `gmPlay`, `gmName`, `cfg` (`und`, `mwN`, `cats`, `imp`), `lc` (config Lupus), `G` (stato partita), `sel`, `quick`.

**Online `NET`:**
`peer`, `conn`, `conns{}`, `host`, `code`, `name`, `hostName`, `origHost`, `roomPeer`, `elec`, `elecT`, `recT`, `recovering`, `mirror`, `lastSnap`, `players[]`, `order[]`, `peers{}`, `st`, `err`, `view`, `game`, `scores{}`, `offline{}`, `gone{}`, `offT{}`, `off[]`, `lastCode`, `tbTeams{A,B}` (squadre di Parole vietate), `pvA`/`pvB`/`pvPack`/`pvI` (setup online di Preferiresti), `ncDraft` (categorie NC in modifica), `ncStamp`.
L'host è l'autorità: tiene lo stato di gioco e manda a ogni client solo la propria vista. I client mandano azioni (`{t:'lc',c}` per Lupus, `{t:'vote',...}`, `{t:'tbv'}`, `{t:'chiv'}`, ecc.) che l'host valida.

**Rientro, rete instabile e resync:**
- Il client che perde la connessione **non elegge subito** un nuovo host: `netRecover()` mette `NET.st='recover'`, aspetta ~600 ms e prova `netRejoin()` (riconnessione a `mgh-CODICE` con timeout 2,5 s, fino a 3 tentativi se l'host risponde `rej name` perché crede ancora occupato il posto). Se il rientro riesce torna in lobby, altrimenti `netElect()` fa partire l'elezione.
- `netAdopt()` (join iniziale, rejoin, cambio host) chiude sempre con `netSync()`. `netSync()` manda `{t:'sync'}` con throttle di 2,5 s; l'host risponde con `netResync(n)` che rimanda la vista corrente del gioco (`lupus`, `imp`, `mw`, `pv`, `nc`, `who`). Serve a non restare con una schermata vecchia dopo standby, cambio rete o riconnessione.
- `netWake()` su `visibilitychange` (ritorno in primo piano) e `online`: ricalcola i timer a scadenza, chiama `ncTick()` se sei host di NC, `netSync()` se sei client e `peer.reconnect()` se PeerJS risulta disconnesso.
- Lato host `{t:'sync'}` viene intercettato in `hostMsg()` **prima** di `hostApply()`.

**Cambio host (se l'host sparisce):**
- L'host manda uno snapshot completo (`netSnap()`, include `S.G` con i ruoli) al **vice**: il primo giocatore connesso dopo l'host, in ordine di ingresso.
- Se l'host si disconnette, i client eleggono il primo candidato raggiungibile (`netCandidates`/`netTry`/`netDial`, tentativi in ordine di ingresso). Il nuovo host riprende la stanza con lo stesso codice (`netRoomPeer`) e la partita dallo snapshot.
- Se **l'host originale rientra** con lo stesso nome, riceve `{t:'become'}` con lo snapshot e riprende il comando (`netPromote`); gli altri ricevono `{t:'moved'}` e si ricollegano a lui. La stanza non muore e la partita continua.
- Il vecchio host libera il codice stanza (`roomPeer.destroy()`) e si ricollega subito come client: senza questo passaggio la connessione del rientro si chiuderebbe con il `roomPeer`.
- `netStandby()` ignora le connessioni chiuse (`open === false`), così lo snapshot non finisce in una connessione morta.

**Persistenza locale (`localStorage`, chiave `mgh_save_v1`):**
vengono salvati/ripristinati giocatori, punteggi positivi, lingua, nome online, ultimo codice stanza, **ruoli personalizzati** (`CUST`) e **categorie NC personalizzate**. Non si salvano partite in corso: dopo un reload si torna alla Home. `clearPlayers()` azzera anche i punteggi; togliere un giocatore dalla lista **non** cancella i punti già guadagnati. Da Home si può esportare/importare tutto in JSON (`backupData`/`exportBackup`/`importBackup`/`applyBackup`), con validazione dei campi e deduplica dei nomi.

**Funzioni di utilità chiave:**
- `t(key)`, `X(it,en)`: i18n. `esc()` fa escape HTML.
- `clip(s,max)`: taglia per **code point** (non spezza emoji/surrogati). `cleanText(s,max)`: toglie caratteri di controllo/invisibili, compatta gli spazi, taglia. `cleanName(s,max)`: `cleanText` con default 16. Sono applicati lato host e in ingresso: nomi (`netOk`, `hostMsg` join, `loadLocal`), risposte Imp/MW/Who, indizi Lupus, risposte e categorie NC, opzioni Preferiresti, categorie e ruoli personalizzati, `addPlayer`, `submitClue`.
- `rnd(n)`, `shuffle(a)`: casualità con `crypto.getRandomValues` + Fisher‑Yates. `pickU(pool,keyFn)` evita ripetizioni finché il pool non è esaurito.
- Navigazione: `home()`, `goHome()` (con conferma se c'è una partita in corso e chiusura stanza online), `back()`, `selectGame()`, `startGame()`, `render()`.
- Invito: `appBase()` usa `origin+pathname` quando la pagina è servita via http(s) e altrimenti ricade sull'URL pubblicato (`https://zhenwang21.github.io/minigames-hub/`, utile se il file è aperto da `file://`); `inviteLink()` aggiunge `#room=CODICE`, `inviteQr()` disegna l'SVG con `qrcode-generator`, `showInvite()` apre la modale, `copyInvite()`/`fallbackCopy()`/`shareInvite()` copiano o usano `navigator.share`, `parseInvite()` legge `location.hash` all'avvio, precompila il codice e mostra `S.hint='invite'`. Non c'è auto‑join: il guest sceglie il nome e tocca Entra.
- Viste: `viewHome`, `viewSetup`, `viewOnline`, `viewNetGame`, `viewPlay`, `viewMW`, `viewImp`, `viewWho`, `viewPref`, `viewPvSetup`, `viewNcSetup`, `viewTbSetup`, `viewTb`, `viewChi`, `viewLRoles`, `viewLType`, `viewLupus`, `viewLF`.
- Punteggi: `S.scores` in memoria + salvataggio locale; modale 🏆 con `editScores()`/`saveScores()` (correzione manuale, spinta ai client con `netPushScores`) e `undoRound()` (stack `UNDO`, max 20 snapshot creati da `scoreSnap()` prima di ogni assegnazione); reset in alto.
- **Controlli host**: `hostBar()` aggiunge in fondo alla schermata online i pulsanti "⏹ Termina partita" (`hostAbort()`, conferma, ferma i timer e `toLobby()` conservando i punti), "⏱️ Chiudi il round ora" per NC (`ncFinish()`), "⏱️ Chiudi il turno ora" per Parole vietate (`tbClose()`) e "Termina e rivela" per Chi sono io? (`chiEnd()`).

**Regole UI da mantenere:**
- Durante le partite non c'è il tasto "indietro" (solo Home in alto); i menu pre‑partita hanno "indietro".
- Le risposte scritte non possono essere vuote: il pulsante resta disabilitato.
- Il GM non conta nei giocatori, tranne in *Chi l'ha detto?* con "Il GM gioca anche".
- Le classi Tailwind nuove vanno aggiunte a mano nel CSS inline.
- **Aiuto in partita**: `showHelp(ctx)` apre la guida anche durante una partita (`ctx` imposta la sezione iniziale; `open` ricorda che si è entrati dalla partita). Il pulsante ❓ è sempre raggiungibile.
- **Timer di discussione**: widget fisso in basso a destra (`#tmr`, stato in `TMR`), **sempre visibile durante i giochi testuali** (tutti tranne Lupus) e nascosto in Home, setup e lobby. Da fermo mostra i preset 1/2/3/5 minuti; in corsa mostra `mm:ss`, `+1′` e stop; a zero diventa rosso (`0:00`, beep con WebAudio + vibrazione) e resta finché non lo si chiude con ✕. Si spegne da solo uscendo dal gioco. È **locale al telefono**, non sincronizzato online: **non blocca né salta il turno**, è solo un promemoria. `discRow()` ora contiene solo il pulsante Regole. Il timer conta su una **scadenza assoluta** (`TMR.end`): `tmLeft()` ricalcola da `Date.now()`, i tick da 500 ms servono solo a ridisegnare, quindi standby e schede in background non fanno perdere secondi. `TMR.ui` evita di riscrivere l'HTML quando non cambia.
- **Timer automatico di Nomi, Cose e Città**: lo stesso widget in modalità `auto` (`#tmr .tmr-box.auto`, nessun pulsante), che mostra il tempo **sincronizzato** del round. Anche i client contano su una scadenza: `tmAutoLeft()` usa `NET.view.end` (inviato dall'host) e ricade su `left` se manca. `tmAllowed()` esclude Lupus e la schermata risultati di NC; `tmAuto()` riconosce la vista `nc`. A zero il round si chiude davvero e chi non ha consegnato prende 0. È l'unico gioco in cui il tempo salta il turno, ed è voluto.
- **Accessibilità**: i pulsanti solo‑emoji (❓ 🏆 🎭) hanno `aria-label`/`title`; i toggle lingua hanno `aria-pressed`; `:focus-visible` giallo ben visibile, target principali `.gbtn` ≥44 px, testi `text-slate-400/500` schiariti per contrasto, `prefers-reduced-motion` rispettato e `touch-action:manipulation` su controlli e input.

---

## 3. Database dei contenuti

Prima di `const S=`:
- `WORDS`: poche coppie con traduzione EN `[itCiv, itUnd, enCiv, enUnd]`.
- `CL` (helper `K(...)`): cluster di parole simili in 8 categorie. `pickPair(cat)` estrae due parole distinte.
- `IMPOSTORE_DB` → `IMP_GEN` (~131 alberi generati) e `IMP_HAND` (~50 scritti a mano), scelti 50/50.
- `WHO_DB` → `WHO_ALL` (~207 domande).
- **Versioni inglesi parallele**: `WHO_DB_EN` (207), `IMPOSTORE_DB_EN` → `IMP_GEN_EN` (131) / `IMP_HAND_EN` (50) e `CL_EN` (93 cluster). Le strutture hanno **le stesse chiavi e le stesse lunghezze** delle italiane (verificato da `tests/i18n.test.js`). La scelta avviene a runtime: `impGen()`, `impHand()`, `whoPool()` e `pickPair()` (che restituisce la coppia bilingue `[itA, itB, enA, enB]`, `word()` prende l'offset 2 in EN).
- **Nuovi database bilingui** (stesso ordine IT/EN): `PV_DB` (24 dilemmi in 3 pacchetti: classic, hot, absurd — riga `[itA, itB, enA, enB]`), `TB_DB` (40 carte Parole vietate — riga `[parola IT, [4 vietate IT], parola EN, [4 vietate EN]]`), `CHI_DB` (64 parole Chi sono io? — riga `[IT, EN]`).
- **Contenuti NSFW espliciti rimossi**. Tono: divertente, un po' "unhinged", non esplicito. Niente battute sessuali su persone reali con nome e cognome.
- Interfaccia e contenuti sono ora **completi sia in IT sia in EN**; restano in italiano solo i nomi propri e i termini intraducibili nei cluster di parole.

---

## 4. Mister White

- Ruoli: Civili (parola A), Undercover (parola simile B), Mister White (nessuna parola, solo categoria/indizio).
- Setup: contatori Undercover e Mister White, somma ≤ `max(1, floor(n/3))`, almeno un impostore in totale. 8 categorie selezionabili. Min 3 giocatori.
- Flusso: parola segreta a testa → ordine di turno → indizi a voce → eliminazione collettiva → fine quando i Civili trovano tutti gli impostori o eliminano un Civile.
- Mister White eliminato: indovina la parola dei Civili. `matchLevel()` tollera maiuscole, accenti, articoli, spazi, piccoli errori, singolare/plurale e parola contenuta. Se non passa, i Civili possono accettare o rifiutare (sinonimi).
- Punti: +100 ai Civili se vincono; +150 a Undercover/Mister White se vincono gli impostori.
- GM: scrive parola Civili, parola Undercover (se presenti) e indizio (se c'è Mister White).

## 5. Impostore

- Min 3 giocatori; numero impostori configurabile (0…N‑1). I Civili hanno la domanda A, gli Impostori la domanda B.
- Flusso: risposta segreta obbligatoria → discussione → voto drag & drop con Smart Swap → risultato con le due domande.
- Punti: se tutti gli impostori sono individuati, +100 ai Civili; altrimenti +150 a ogni impostore non individuato.
- GM: scrive domanda Civili e domanda Impostore.

## 6. Chi l'ha detto?

- Domanda dal database; in modalità automatica si può cambiare con 🎲.
- Ognuno scrive la risposta (obbligatoria) → il sistema ne estrae una a caso → ogni giocatore vota chi l'ha scritta (non può votare sé stesso) → rivelazione con autore, voti e tutte le risposte. +100 a chi indovina; l'autore non prende punti.
- **Modalità rapida**: l'app mostra la domanda e si gioca tutto a voce, senza raccogliere risposte. La schermata mostra la domanda, il pulsante "Si gioca a voce" e poi "Nuova partita": non è più un vicolo cieco.
- GM: scrive la domanda; può giocare con "Il GM gioca anche".

---

## 7. Preferiresti…

- Due opzioni scritte da chi tiene il telefono (offline) o dall'host (online); tutti votano **in segreto** e alla fine si contano i voti.
- **Offline**: i due campi stanno nella schermata di setup (min 2 giocatori, opzioni non vuote e diverse). `startPref()` crea `S.G` con `phase:'pvpass'`, ordine mescolato e `votes{}`; `pvShow()` / `pvVote('a'|'b')` / `pvCalc()` gestiscono il passaggio del telefono ("Passa il telefono a X"). Il risultato mostra le barre con i conteggi, il voto di ognuno e i punti; "Nuova coppia" (`pvAgainOff()`) svuota le opzioni e torna al setup.
- **Online**: dal lobby l'host apre `pvHostOpen()` → schermata `pvsetup` con i due campi; `pvOnlineStart()` crea `NET.game = {g:'pv',ph:'vote',a,b,votes:{}}` e manda a tutti la vista `pvvote`. Ogni client manda `{t:'pv',v:'a'|'b'}`; `pvApply` accetta un solo voto per giocatore, `pvChk` chiude il voto, assegna i punti e manda `pvres` (vista condivisa). Min 2 giocatori anche online; niente modalità GM.
- **Punti**: **+100** a chi ha votato l'opzione più scelta; con **pareggio** (possibile con un numero pari di giocatori) **+50 a tutti**. Sono i default scelti in assenza di indicazioni, facili da cambiare in `pvCalc`/`pvChk`.
- **Pacchetti pronti**: `PV_DB` contiene 24 dilemmi divisi in `classic`, `hot`, `absurd`, con traduzione EN. Nel setup (offline e online) i pulsanti dei pacchetti chiamano `pvPreset`/`pvPresetOnline` (ciclo `S.pv.i`/`NET.pvI`, così tocchi ripetuti scorrono le coppie) e `pvRandom`/`pvRandomOnline` scelgono un pacchetto a caso. Restano comunque modificabili a mano.
- Funzioni: `startPref`, `pvShow`, `pvVote`, `pvCalc`, `pvAgainOff`, `viewPref`, `pvHostOpen`, `viewPvSetup`, `pvOnlineStart`, `pvApply`, `pvChk`, `pvBc`, `pvAgain`, `pvPreset`, `pvPresetOnline`, `pvRandom`, `pvRandomOnline`.

---

## 8. Nomi, Cose e Città (solo online)

- **Solo online**: dalla Home la carta ha il badge *Online*; `ONLY_ONLINE = ['nomicose']`, `selectGame()` non apre il setup offline ma `S.screen='online'` con `S.hint='nomicose'`, e la schermata Online mostra un avviso (`ncHint`).
- **Setup host** (`ncHostOpen()` → schermata `ncsetup`, `viewNcSetup`): 12 categorie predefinite (`NC_CATS`: Nome, Cosa, Città, Animale, Cibo, Colore, Mestiere, Film, Cantante, Sport, Marca, Personaggio), max **10** selezionate (`NC_MAX`), più categorie personalizzate (max 18 caratteri, eliminabili con 🗑, salvate in `localStorage` e nel backup). La bozza vive in `NET.ncDraft` (oggetti `{k,it,en}`, le custom hanno `k` che inizia con `cu`). Default: Nome/Cosa/Città. Non si può scendere sotto 1 categoria. `back()` riporta alla lobby.
- **Lettera**: IT = 21 lettere (`NC_IT`, senza J K W X Y), EN = 26 (`NC_EN`), scelta dalla lingua dell'host ed evitando la lettera del round precedente (`ncLetter`).
- **Round** (`ncStart()`, `ncAgain()`): `NET.game = {g:'nc', ph:'play', round, cats, letter, a:{player:{catKey:testo}}, d:{player:true}, left, end, timeup}`. `end` è la scadenza assoluta (`Date.now()+left*1000`), `left` è il valore calcolato; `ncLeft(G)`/`ncSetLeft(G,sec)` sono gli unici punti che li toccano. Al nuovo round cambiano lettera e categorie restano; `stamp` (`lettera-round`) fa azzerare le bozze locali ai client.
- **Risposte**: ogni client tiene la propria bozza in `NCC` e manda `{t:'nc', i, v}` **a ogni tasto** (`ncSend`), così nessun re-render ruba il focus; l'host le valida e le salva in `G.a`. `{t:'ncd'}` = consegna.
- **Timer automatico** (unico gioco con il tempo che chiude il turno): parte da **5 minuti** (`NC_TIME=300`), ogni consegna toglie **60 s** (`NC_CUT`) con minimo **60 s** (`NC_MIN`). Il countdown gira solo sull'host (`NC_IV` in `ncStartTimer`, tick da 500 ms su una scadenza assoluta `G.end`) e viene mandato ai client con il messaggio leggero `{t:'nct', left, end}` che aggiorna il widget; `NC_SENT` evita di rimandare lo stesso secondo. `ncTick()` porta anche la propria `NET.view` a `left/end` coerenti. A zero `ncFinish()` chiude il round (`timeup:true`) e chi non ha consegnato prende 0. L'host può chiudere il round in anticipo con il pulsante "⏱️ Chiudi il round ora" (`hostBar()` → `ncFinish()`).
- **Punteggio** (`ncCalc`, normalizzazione `ncNorm`: minuscole, niente accenti, solo lettere/numeri):
  - risposta vuota o che **non inizia con la lettera** → 0 automatico;
  - risposta **ripetuta** da un altro giocatore nella stessa categoria → **+5** a testa (anche con maiuscole/accenti diversi);
  - risposta **unica** → l'host la vede in fase `review` e decide ✓ +10 / ✗ 0 con `ncToggleAt`; il default è accettata;
  - il totale del round si somma ai punteggi con `netScore` solo quando l'host conferma (`ncScore`); i risultati mostrano per ogni giocatore ogni categoria con +10/+5/✗.
- **Revisione host**: `ncFinish()` non chiude subito se esistono risposte uniche: passa a `ph:'review'`, inizializza `G.ok` (tutte accettate) e manda `ncres` con `uniq`. I client vedono la griglia aggiornata; solo l'host può toccare le celle. Se non ci sono risposte uniche si va dritti al calcolo.
- **Fine round**: quando tutti hanno consegnato (`ncApply`/`ncCheck`) o allo scadere del timer si passa a `review` (se serve) e poi a `end` con `ncScore`; vista `ncres` condivisa con pulsanti host "Nuova lettera" (`netAgain` → `ncAgain`) e "Torna alla lobby" (`ncBack` → `toLobby`).
- **Online/infra**: `hostApply` → `ncApply` (le risposte passano da `cleanText`); `checkG` → `ncCheck` (sotto 2 giocatori si torna in lobby); `netResync` → `ncBc`; `netPromote` riavvia il timer (rispettando `G.end` già ricevuto) o lo ferma se la partita era finita; `netAgain` ha il ramo `nc`; `netClientMsg` intercetta `nct`/`ncd` **prima** di `netView`. Messaggi: `nc` (vista round, include `end`), `nct` (tick con `left`+`end`), `ncd` (consegne), `ncres` (revisione o risultati).
- **Minimo 2 giocatori**; non esiste versione offline.
- Funzioni: `ncHostOpen`, `viewNcSetup`, `ncToggle`, `ncAddCustom`, `ncDel`, `ncStart`, `ncAgain`, `ncBack`, `ncApply`, `ncCheck`, `ncCalc`, `ncCounts`, `ncUnique`, `ncFinish`, `ncToggleAt`, `ncScore`, `ncStartTimer`, `ncStopTimer`, `ncSend`, `ncDone`, `ncBc`, `ncDoneBc`, `ncBroadcast`, `viewNetGame` (rami `nc` e `ncres`).

---

## 8b. Parole vietate (solo online)

- **Solo online**: `ONLY_ONLINE = ['nomicose','taboo','chisono']`; dalla Home la carta ha il badge *Online* e `selectGame()` porta alla schermata Online. Serve un minimo di **4 giocatori**.
- **Squadre** (`tbHostOpen()` → schermata `tbsetup`, `viewTbSetup`): `tbAuto()` mescola i giocatori e li alterna in `NET.tbTeams = {A,B}`; l'host tocca un nome (`tbMove(i)`, indice in `NET.players`) per spostarlo nell'altra squadra. `tbCanStart()` richiede almeno **2 per squadra**. `tbStart()` crea `NET.game`.
- **Stato**: `{g:'tb', ph:'play'|'res'|'tie', teams{A,B}, turn:'A'|'B', round, guesser, used[], cardI, ts{A,B}, votes{}, res, end, lang}`. `tbNext()` alterna la squadra (`turn` parte da `B` e viene invertito), sceglie un guesser casuale nella squadra di turno ed evita di ripetere le carte finché `TB_DB` non è esaurito.
- **Cosa vede chi** (`tbBc()` manda un payload diverso per giocatore):
  - **guesser** (`role:'guess'`): nessuna parola e nessuna parola vietata; deve indovinare ascoltando gli indizi;
  - **compagni di squadra** (`role:'clue'`): parola + 4 parole vietate, danno indizi a voce;
  - **avversari** (`role:'vote'`): nessuna parola, votano "indovinata" o "parola vietata".
  In `res`/`tie` la parola viene mostrata a tutti.
- **Voti e chiusura** (`tbApply` → `tbCheck`): votano solo gli avversari, un voto per giocatore. La maggioranza è **stretta** (`> metà`). Se tutti hanno votato e i voti sono pari si passa a `ph:'tie'` e decide l'host (`tbTie(true|false)`). L'host può chiudere prima con `tbClose()` (usa `w>f`); allo scadere del timer `tbTick()` chiama `tbClose()`, quindi senza maggioranza è fallo.
- **Punteggio** (`tbResolve`): se indovinata, `scoreSnap()` e **+100 a ogni membro** della squadra che indovina (`G.ts` tiene il totale di squadra); parola vietata, pareggio deciso come no o timeout = 0.
- **Timer**: `TB_TIME = 60` secondi per turno, scadenza assoluta `G.end`; il countdown gira solo sull'host (`TB_IV`/`tbStartTimer`/`tbTick`, tick 500 ms) e i client hanno `end` nel payload, quindi contano in locale. `tbPaintTime()` aggiorna `#tb-time`.
- **Online/infra**: `hostApply` → `tbApply`, `checkG` → `tbCheckTeams` (filtra giocatori usciti, sotto 4 o squadra vuota → lobby), `netResync` → `tbBc`, `netAgain` → `tbNext`, `netPromote` riavvia il timer se era in `play`, `viewNetGame` instrada `v.t==='tb'`, `hostBar` ha "Chiudi il turno ora".
- Funzioni: `tbAuto`, `tbHostOpen`, `tbMove`, `tbCanStart`, `tbStart`, `tbNext`, `tbCard`, `tbOpponents`, `tbTo`, `tbBc`, `tbApply`, `tbCheck`, `tbClose`, `tbTie`, `tbResolve`, `tbStartTimer`, `tbTick`, `tbStopTimer`, `tbPaintTime`, `tbCheckTeams`, `viewTbSetup`, `viewTb`.

---

## 8c. Chi sono io? (solo online)

- **Solo online**, minimo **3 giocatori**. `chiStart()` assegna a ognuno una parola distinta da `CHI_DB` (`G.w[player] = indice`) e **5 vite** (`CHI_LIVES`).
- **Stato**: `{g:'chi', ph:'play'|'vote'|'res'|'tie'|'end', order[], idx, lives{}, done{}, out{}, votes{}, w{}, lang, last, res}`. `chiCur()` è il giocatore di turno.
- **Cosa vede chi** (`chiBc()`): ogni giocatore riceve `others` con le parole di **tutti gli altri** e **mai la propria**; la propria parola compare solo in `res`/`end` (`m.word`) e in `end` c'è `allWords` con tutte le parole. `viewChi` mostra la lista "Parole degli altri" e i cuori delle vite.
- **Turno**: il giocatore di turno fa domande a voce e preme **"Indovino!"** (`{t:'chig'}`); `chiApply` accetta il comando solo se `n === chiCur()`. Si passa a `ph:'vote'`: votano **tutti gli altri** (il giocatore di turno no), sì/no.
- **Esito** (`chiCheck` → `chiResolve`): maggioranza sì → **+100** (`scoreSnap()` prima di `netScore`) e `done[p]=true`; maggioranza no → −1 vita e, a zero, `out[p]=true`. Con voti pari si passa a `ph:'tie'` e decide l'host (`chiTie`). Se non ci sono votanti l'esito è no.
- **Continua** (`chiNext`, solo host): cerca il prossimo giocatore nell'ordine che non abbia già indovinato e non sia fuori; se non c'è nessuno chiama `chiEnd()`. Dopo ogni esito l'host deve premere "Continua". `chiEnd()` termina e rivela; `chiRestart()` avvia una nuova partita.
- **Online/infra**: `hostApply` → `chiApply`, `checkG` → `chiCheckTeams` (filtra uscite, sotto 3 → lobby; se il turno corrente non è più giocabile passa al successivo), `netResync` → `chiBc`, `netAgain` → `chiRestart`, `viewNetGame` instrada `v.t==='chi'`, `hostBar` ha "Termina e rivela".
- Funzioni: `chiCur`, `chiWord`, `chiStart`, `chiRestart`, `chiBc`, `chiApply`, `chiCheck`, `chiResolve`, `chiTie`, `chiNext`, `chiEnd`, `chiCheckTeams`, `chiHearts`, `viewChi`.

---

## 9. Lupus in Fabula

### Setup
Giocatori (min **4**) + modalità (Automatica/GM) → menu ruoli → tipo di partita (+ assegnazione ruoli se GM) → partita.

### Ruoli
- Base sempre presenti: **Villico**, **Lupo**.
- Base togglabili: **Dottore**, **Veggente**, **Spiritualista**.
- Civili speciali: **Kamikaze**, **Re (con Vassallo)**, **Sindaco**, **Giocatore d'Azzardo**.
- Lupi speciali: **Lupo Fantasma**, **Lupo Mannaro**, **Lupo Pazzo**.
- Fazioni terze: **Joker**, **Pittore**, **Sopravvissuto**.
- `LT` mappa i ruoli su `civ`/`wolf`/`third`; il Mannaro conta come lupo.

### Menu ruoli
- Numero lupi: default `round(n/4.5)` (min 1), max `floor(n/3)`.
- Ogni ruolo ha 3 stati: spento → attivo → ★ obbligatorio.
- Limiti: i lupi speciali obbligatori ≤ max lupi; gli obbligatori non‑lupo ≤ posti non‑lupo.
- Max 1 giocatore per ruolo speciale. `lBuild(n)` compone il mazzo; con il GM si può assegnare casualmente o manualmente.
- **Ruoli personalizzati** (solo partita rapida): creati dall'utente, senza skill nella partita completa; restano finché la pagina è aperta.

### Gioco rapido
Passa‑telefono solo per vedere il ruolo, poi tutto a voce. Finale con "Mostra soluzione".

### Partita completa
Fasi: rivelazione ruoli (il Re sceglie il Vassallo) → notte → Kamikaze → mattina → giorno → rogo → nuova notte… fino alla vittoria.

Regole importanti da **non cambiare** (sono volute dall'utente):
- **Dottore/Re/Vassallo**: la protezione del Dottore è controllata sul bersaglio **originale** prima del redirect. Quindi:
  - Dottore protegge il Re e i lupi attaccano il Re → nessuno muore (il Vassallo è salvato).
  - Dottore protegge il Re e i lupi attaccano il Vassallo → muore il Vassallo.
  - Dottore protegge il Vassallo e i lupi attaccano il Vassallo → il Vassallo sopravvive.
  - Dottore protegge il Vassallo e i lupi attaccano il Re → muore il Vassallo al posto del Re.
- **Sopravvissuto**: se è vivo quando vincono Civili o Lupi, **ruba** la vittoria e vince lui. È voluto.
- **Mannaro**: se i lupi lo attaccano non muore e dalla notte dopo entra nel branco.
- **Kamikaze**: se muore porta con sé un altro giocatore (a catena).
- **Vittoria**: Civili se non restano lupi; Lupi se lupi ≥ non‑lupi, salvo Joker/Pittore/Sopravvissuto/Azzardo vivi che bloccano la fine automatica (il Pazzo non blocca). Punti: +100 ai vincitori, +150 alle fazioni terze, +150 al Sopravvissuto.
- **Punteggio ×10**: tutti i punti di Lupus valgono 10 volte (`const LUPUS_MULT = 10`). La costante è applicata in un solo punto per i bonus (`addB`) e in `lEnd` per vittoria/fazione/vivo, così cambiarla è una modifica sola. Motivo: una partita dura circa 10 volte gli altri giochi. I valori mostrati nella guida restano quelli base, con la nota "×10".
- **Rogo**: voto individuale a turno con voti visibili; pareggio → nessuno eliminato (con ballottaggio dove previsto). Il Sindaco può usare il potere al rogo.
- **Azzardo/Pazzo**: tentativi di indovinare il ruolo, di notte o di giorno; le morti da tentativo si applicano a fine fase. Il Pazzo bypassa il Dottore.
- Funzioni principali: `lBuild`, `lTog/lCap`, `startLupus`, `nStart/nAct/nResolve/nNext`, `gTgt/gRole/gAfter`, `lKill/lNext/lWin/lEnd`, `vStart/vCast/vDone`, `abOpen/abPick`.

---

## 10. Online

- **Host**: crea la stanza, riceve un codice di **5 caratteri** (alfabeto senza lettere ambigue), max **16** giocatori. L'host può avviare gli 8 giochi.
- **Client**: apre la stessa pagina, sceglie Online, inserisce nome e codice. In alternativa il pulsante d'invito in lobby mostra QR e link `#room=CODICE`: chi lo apre trova il codice già compilato, scrive il nome e tocca Entra (nessun auto‑join). Min 3 giocatori (Lupus e Parole vietate 4, Preferiresti e Nomi Cose e Città 2, Chi sono io? 3).
- **Riconnessione**: se un telefono si disconnette o ricarica, ha **60 secondi** per rientrare con lo stesso nome. L'host lo marca offline (📴) e, se non torna, lo rimuove. In Lupus le sue azioni notturne/voto/Kamikaze/Sindaco vengono saltate automaticamente (`lupDrop`/`lupAuto`); la partita non si chiude più.
- **Rientro rapido**: prima di far partire un'elezione, il client prova a ricollegarsi da solo alla stanza (`netRecover` → `netRejoin`, ~2,5 s di timeout). Se riesce, il posto torna online subito (niente attesa di 60 s) e chiede lo stato con `{t:'sync'}`; se fallisce, parte l'elezione normale. È utile per standby, cambio Wi‑Fi/dati e schede che il telefono sospende.
- **Resync**: `{t:'sync'}` è gestito dall'host in `hostMsg` e risponde con `netResync(n)`, che rimanda la vista corrente del gioco attivo. `netWake()` (su `visibilitychange` e `online`) richiede il sync, ricalcola i timer e riconnette PeerJS. L'host non può sincronizzarsi con sé stesso: la sua vista è già lo stato.
- **Controlli host**: in partita la barra in fondo (`hostBar`) offre "⏹ Termina partita" (conferma, `toLobby`, punti conservati), "⏱️ Chiudi il round ora" per NC, "⏱️ Chiudi il turno ora" per Parole vietate e "Termina e rivela" per Chi sono io?.
- **Host come autorità**: i ruoli/parole segrete stanno nell'host; ogni client riceve solo la propria vista. L'host però può barare (noto).
- **Lupus online**: riusa il motore offline. L'host genera l'HTML per ogni giocatore (`lupHtml`), converte gli `onclick` in `data-c`, e i client mandano `{t:'lc',c}`. `lupCall` accetta solo i comandi previsti per la fase corrente e valida indici/ruoli.
- **Persistenza**: nome, ultimo codice stanza, giocatori e punteggi restano in `localStorage`.
- **Cambio host automatico**: se l'host perde la connessione (crash, rete, telefono chiuso) la stanza **non muore**. Il vice (primo giocatore connesso dopo l'host, in ordine di ingresso) riceve in anticipo uno snapshot completo e prende il comando; gli altri si ricollegano a lui e la partita riprende dallo stesso punto. Quando l'host originale rientra dal codice stanza, il comando **torna a lui** mentre la stanza continua. Dettagli in §2.
- **Uscita volontaria**: il tasto Home chiede conferma durante una partita e chiude la stanza se sei host/connesso (è diverso da una disconnessione: lì scatta il cambio host).
- PeerJS usa il cloud pubblico: se è giù o bloccato, l'online non funziona. Non c'è server proprio.

---

## 11. Cosa è stato corretto nell'ultima revisione

### Versione 1.16.0 (strumenti host)
- **Passaggio host**: `netPassHost(i)` riusa il percorso di `netHandback`/`netPromote`: invia `become` al giocatore scelto con lo snapshot, avvisa gli altri con `moved`, poi l'host precedente diventa client sulla stessa connessione, distrugge il room peer e lascia che il nuovo host riapra `netRoomPeer`. `snap.origHost` diventa il nuovo host per evitare un ritorno automatico.
- **Ordine**: `netMovePlayer(i, dir)` scambia due nomi in `NET.players` e `NET.order`, poi `hostBc()`/`netPresence()`; solo host e solo lobby.
- **PIN stanza**: `NET.pin` (4 cifre) con `pinClean`/`pinOk`; `joinPayload` lo manda, `netIncoming` rifiuta con `why:'pin'` (messaggio in `netClientMsg`), `setRoomPin` lo imposta/toglie con `prompt`, il link invito aggiunge `&pin=`, `parseInvite` lo precompila e la schermata di ingresso ha `#on-pin`. Il PIN viaggia nello snapshot e quindi sopravvive a passaggio host/recupero. Non è sicurezza: solo un filtro per ingressi sbagliati.
- **QR**: `QR_BIG` alterna 220/320 px in `showInvite`; `qrDownload()` scarica l'SVG generato, con fallback alla copia del link.
- **Offline**: `offBan` ora compare anche nella lobby semplice.
- **Novità**: `news20` IT/EN in testa.
- **Test**: `features.test.js` sale a **240** (toolbar host, riordino e limiti, passaggio a offline innocuo, `pinClean`/`pinOk`, link con PIN, modale invito, boot da `#room=...&pin=`, input PIN, QR e chiavi i18n). **12/12 suite** verdi su sorgente e minificato.
- `APP_VERSION` e `VERSION` portate a **1.16.0**; build: sorgente **517.431** byte, minificato **424.049** byte.

### Versione 1.15.0 (condivisione e PWA)
- **Immagine risultato**: `resultLines()` estrae gioco, righe e vincitori dal riepilogo; `shareResultImage()` disegna un PNG 1080×1080 su canvas (sfondo del tema, barre podio, testi IT/EN, URL) e usa `navigator.share` con `File` se disponibile, altrimenti scarica il file; in caso di errore ricade su `shareSummary()`. Nessun asset né upload.
- **Scorciatoie PWA**: `manifest.webmanifest` ha tre `shortcuts` (`#game=impostore`, `#game=lupus`, `#game=preferisci`); `gameFromHash()` valida l'id contro `PLAYABLE` e `parseInvite()` apre il setup con `selectGame` dopo 80 ms, senza interferire con `#room=`.
- **Wake Lock**: `wakeWanted()`/`wakeSync()` chiedono `navigator.wakeLock.request('screen')` quando c'è un timer attivo o un round online con timer, rilasciano su `tmClear()` e riprovano da `netWake()`. Tutto dentro try/catch: browser senza API restano identici.
- **Anteprima link**: `description`, `og:type/site_name/title/description/url/image` e `twitter:card/title/description/image` nell'head.
- **Privacy**: `showPrivacy()` apre una modale con quattro paragrafi (dati locali, stanza online, niente tracciamento, backup) e un pulsante nelle impostazioni; testi IT/EN.
- **Novità**: `news19` IT/EN in testa alla modale.
- **Test**: `features.test.js` sale a **226** (meta OG/Twitter, JSON del manifest e shortcut, `gameFromHash`, immagine senza riepilogo, richiesta/rilascio wake lock con API finta, chiavi privacy IT/EN, modale e pulsante). **12/12 suite** verdi su sorgente e minificato.
- `APP_VERSION` e `VERSION` portate a **1.15.0**; build: sorgente **511.143** byte, minificato **418.994** byte.

### Versione 1.14.0 (suoni, vibrazioni, timer)
- **Pacchetti suoni**: `SND_PACK` (`soft` sine, `arcade` square, `chime` triangle) con `sndCfg()`, `sndLevel()` (volume 0–100, mai zero per le rampe esponenziali), `sndCtx()`/`tone()`/`releaseCtx()` condivisi. `winChime()` e `tmRing()` usano pacchetto e volume; `S.sndPack` e `S.vol` sono salvati, inclusi nel backup e ripristinati.
- **Volume**: slider 0–100 in impostazioni (`setVol`), anteprima (`previewSnd`), `sndReady()` blocca l'audio a volume zero senza perdere l'impostazione.
- **Aptica**: `haptic(kind)` con `VIB_PATTERN` (tap, reveal, correct, wrong, tick, end, win), throttle di 35 ms per evitare raffiche; usata in `reveal()`, `pvShow()`, fine timer e vittoria (`statsRecord`).
- **Timer**: `TMR.beep10` fa scattare un beep+vibrazione una sola volta a 10 s; `tmAdd` lo riarma se si torna sopra i 10 s; a zero `tmRing()` usa lo schema lungo. `AUTO_BEEP` replica le soglie sul timer di round online senza ripetizioni.
- **Impostazioni**: riga pacchetti con tre pulsanti e ▶, slider volume, etichette IT/EN (`setSndPack`, `sndSoft/Arcade/Chime`, `setVolume`, `previewSnd`).
- **Novità**: `news18` IT/EN in testa alla modale.
- **Test**: `features.test.js` sale a **212** (pacchetti e timbro, scala volume, backup/ripristino, schemi aptici e interruttore, beep a 10 s, riarmo, fine timer, anteprima). **12/12 suite** verdi su sorgente e minificato.
- `APP_VERSION` e `VERSION` portate a **1.14.0**; build: sorgente **502.743** byte, minificato **412.370** byte.

### Versione 1.13.0 (personalizzazione e motion)
- **Tema Carta**: settimo tema chiaro in `THEMES`, con override CSS per superfici (`.glass`, `bg-slate-*`), testi (`text-white/slate/emerald/amber/rose/cyan/purple`), input e `.av`; `color-scheme:light` e `THEME_BG.carta = #f7f2e8` (anche `theme-color`). Serve alle stanze luminose senza cambiare nessun gioco.
- **Anteprime tema**: `THEME_ACC` (coppia di colori) alimenta `.theme-card`/`.tp` nelle impostazioni; `THEME_DOT` resta per usi compatti.
- **Font**: `S.font` (`sans`/`round`) → `html[data-font="round"]` usa `ui-rounded`/`SF Pro Rounded`/`Nunito` di sistema, senza download; salvato e incluso nel backup.
- **Accento personalizzato**: `S.accent` + `normHex`/`mixHex`/`relLuma`/`contrastRatio`/`ensureContrast`/`accentColors`/`applyAccent`. L'accento scelto viene schiarito/scurito quanto basta (≥3:1 sui temi scuri, ≥4.5:1 su Carta) e `--btn1/--btn2` restano leggibili con testo bianco; `resetAccent()` rimuove gli override inline e torna al tema. Tutto passa da `applyTheme()`.
- **Corona e serie**: in lobby `avHtml(p, p===NET.hostName?'host':'')` aggiunge `.av.host` (anello oro); `streakTag()` mostra 🔥N nel riepilogo quando `S.stats.streak[n] >= 2`; il vincitore ha `.av.win`.
- **Coriandoli per gioco**: `CONF_KIND` (`lupus`/`chisono` → stelle, `nomicose`/`taboo` → bolle) e `confettiBurst(gid)` imposta `data-kind`; `maybeConfetti()` passa il gioco.
- **Motion**: `screenIn()` aggiunge `.screen-in` a `#app` solo al cambio schermata; `.logo-shine` sul titolo. Entrambe spente da `html[data-motion="off"]` e dalla media query `prefers-reduced-motion`.
- **Novità**: `news16`/`news17` in IT/EN, in testa alla modale.
- **Test**: `features.test.js` sale a **197** (Carta, anteprime, font, accento e contrasto, backup/ripristino, fiamma serie, CSS corona/coriandoli/logo/transizione, spegnimento motion); harness con `documentElement.style` per verificare le variabili inline. **12/12 suite** verdi su sorgente e minificato.
- `APP_VERSION` e `VERSION` portate a **1.13.0**; build: sorgente **498.418** byte, minificato **409.027** byte.

### Versione 1.12.0 (cosmetics)
- **Coriandoli di vittoria**: `confettiBurst()` crea 22 `<i>` in un contenitore fisso `.confetti` (CSS `@keyframes confetti`), con colori del tema; `maybeConfetti()` li lancia una sola volta per riepilogo tramite la firma `CONF_SIG` (gioco + nomi + punti) e viene chiamata da `render()` quando `summaryBar()` non è vuota. Rispetta `S.reduceMotion`, `html[data-motion="off"]` e `prefers-reduced-motion`; nessun dato salvato.
- **Sfondi dei temi**: oltre alle variabili `--acc1/2/3` e `--btn1/2`, ogni tema tinge `body` (`oceano #04141d`, `tramonto #1a0e13`, `bosco #06140f`, `neon #0a0616`, `ghiaccio #07131f`); `THEME_BG` alimenta anche il `meta[name="theme-color"]` in `applyTheme()`, così la barra del browser segue il tema. L'alto contrasto manuale e `prefers-contrast:more` restano neri.
- **Podio**: le prime tre righe del riepilogo hanno `.podium-1/2/3` con barra interna oro/argento/bronzo.
- **Novità**: aggiunte `news14`/`news15` in IT/EN e messe in testa alla modale.
- **Test**: `features.test.js` sale a **175** (CSS di coriandoli e spegnimento con animazioni off, sfondi tema, `THEME_BG`, barre del podio, funzioni collegate al riepilogo). **12/12 suite** verdi su sorgente e minificato.
- `APP_VERSION` e `VERSION` portate a **1.12.0**; build: sorgente **488.283** byte, minificato **400.858** byte.

### Versione 1.11.1 (fix rielezione host)
- **Race di rielezione**: quando l'host spariva, un client poteva superare un candidato con priorità più alta che non se n'era ancora accorto e autoproclamarsi, lasciando **due host** nella stanza. Ora: `netDial` segnala se il "no" è arrivato subito; `netTry` riprova un paio di volte lo stesso candidato prima di passare al successivo; `netIncoming`, se il client è in `recover` (o senza connessione), accetta la connessione di elezione e prende il comando invece di chiuderla; `netSettle` fa un ultimo controllo sul codice stanza (`mgh-<code>`) prima di autoproclamarsi, così chi si è già promosso viene trovato e si rientra. `netRejoin` accetta anche lo stato `elect`.
- **Test**: `online.test.js` stabile su **52 esecuzioni consecutive** con Node 20; 12/12 suite verdi su sorgente e minificato. Il check del timer online ora attende il valore reale (`until`) invece di 1200 ms fissi, che falliva sui runner lenti. `tests/run-all.js` emette annotazioni `::error` con la suite fallita, così la CI è diagnosticabile anche senza i log del job. CI GitHub Actions verde su sorgente e minificato.
- `APP_VERSION` e `VERSION` portate a **1.11.1**; build: sorgente **484.991** byte, minificato **398.400** byte.

### Versione 1.11.0 (funzionale + contenuti + cosmetics)
- **Gestione giocatori**: `renamePlayer()`/`savePlayerName()` con modale, migrazione del punteggio e blocco dei nomi duplicati; `removePlayer()` salva l'ultimo rimosso in `P_UNDO` e la lista setup mostra **Annulla rimozione** (`undoRemovePlayer()`). `clearPlayers()` azzera anche l'undo.
- **Statistiche**: `stats.recent` (max 20, `{g,t,w}`) registrato da `statsRecord()` con i nomi dei vincitori; `sanitizeStats()` valida e ordina le recenti. In impostazioni compaiono **Ultime partite** (`statsRecentHtml`) ed **Esporta CSV** (`statsCsv()`, colonne Nome/Partite/Vittorie/Serie attuale/Miglior serie).
- **Backup**: `importBackup()` non usa più `confirm()`; `showImportDialog()` mostra versione, data, conteggi e avviso se `v !== APP_VERSION`, con scelta **Unisci** (`mergeBackup`) o **Sostituisci** (`applyBackup`). L'unione aggiunge giocatori/punteggi (max), somma le statistiche, unisce ruoli/categorie/domande/avatar e non tocca le impostazioni.
- **Note host condivise**: in `hostNotesOpen()` il pulsante **Mostra a tutti** (`saveHostNotes(1)` → `shareHostNotes()`) invia `{t:'note'}` ai client; `netClientMsg` lo salva in `NET.note` e `noteBanner()` lo mostra in lobby/partita con chiusura. Nessun nuovo stato persistente.
- **Le mie domande**: `S.myQ = {who:[], pv:[]}` con editor in impostazioni (`myQOpen()`, `myQSave()`, `myQClear()`), validazione `sanitizeMyQ()` e unione `mergeMyQ()`. `whoPool()` antepone le domande personali; `syncPvMine()` crea/rimuove il pacchetto virtuale `PV_DB.mine` (`Le mie`) usato da preferiti, casuale e online. In backup e `localStorage`. Regole intatte: nessuna domanda singola per l'Impostore.
- **Avatar scelti**: `S.avMap` (nome → indice `AV_E`) con `avatarPick()`/`avatarPickName()`/`setAvatarPick()`, selettore in setup e lobby (solo per sé), reset all'hash automatico. `av()` usa l'override; `joinPayload()` manda `av`, la lobby ridistribuisce `avs` e `netAdopt` li unisce. `sanitizeAvMap()` limita a 40 nomi e indici validi; il rename migra l'avatar.
- **Cosmetics**: `#app[data-game]:after` aggiunge un radial gradient tenue con `--ga`; podio 🥇🥈🥉 nelle prime tre righe del riepilogo; temi **neon** e **ghiaccio** (`THEMES`, `THEME_DOT`, CSS, impostazioni); `.flipin` sulle carte rivelate di Lupus/Impostore; colori squadra espliciti in Parole vietate; `winChime()` con tre note diverse per gioco, rispettando `S.sndOn`.
- **Accessibilità**: media query `prefers-contrast: more` con gli stessi colori dell'alto contrasto manuale.
- **Test online**: timeout di elezione host portati da 20 s a 30 s e attese da 8 s a 12 s in `tests/online.test.js`, per ridurre i falsi negativi sotto carico.
- **Strumenti**: `tools/bump-version.js` (versione, titoli Novità, `sw.js` e asserzioni in un colpo), `tools/size-report.js` (raw/gzip e ripartizione JS/CSS), `CHANGELOG.md` e CI GitHub Actions che ricostruisce, verifica che la build committata non sia vecchia e lancia le suite su sorgente e minificato.
- **Test**: `features.test.js` sale a **169** (rinomina/undo, recenti+CSV, import unisci/sostituisci e avviso versione, domande personali e pacchetto `mine`, avatar scelti/reset, payload avatar, nota host condivisa, merge che non tocca le impostazioni, rename che migra l'avatar, recenti ordinate, pulizia dei preferiti `mine`). **12/12 suite** verdi su sorgente e build minificata, `ui-diff` 24/24 dopo la ricostruzione.
- `APP_VERSION` e `VERSION` portate a **1.11.0**; build: sorgente **483.699** byte, minificato **398.031** byte (`index.html` = `Minigames Hub.min.html`).

### Versione 1.10.0 (cosmetics)
- **Accento per gioco**: `GAME_ACCENT` (2 colori per gioco) alimenta la tile della card in home (`.gtile`, CSS `--ga/--gb` inline) e, a partita/setup aperto, una barra sottile in cima a `#app` (`#app[data-game]:before`). `screenGame()` deduce il gioco anche da `setup`, `ncsetup`, `tbsetup`, `pvsetup` e dalla schermata online; `applyGameAccent()` gira a ogni `render()`. I colori sono **identitari** e non sostituiscono il tema (`--acc1/2/3`, `--btn1/2`).
- **Tile e card**: le card della home usano `.gcard` + `.gtile` con gradiente del gioco e un leggero sollevamento al passaggio (solo se le animazioni sono attive).
- **Avatar giocatore**: `av(name)` deriva emoji e colore dal nome con un hash stabile (`avHash`), `avHtml()` produce il badge `.av`. Usati in setup, lobby online, modale punteggi e riepilogo. Nessun dato nuovo in `S`, `localStorage` o messaggi di rete: due telefoni mostrano lo stesso avatar per lo stesso nome. Collisioni possibili ma innocue.
- **Effetto vittoria**: il riepilogo aggiunge `.celebrate` (piccola pulsazione) al vincitore; `data-motion="off"` e `prefers-reduced-motion` la disattivano.
- **Novità 1.10.0**: titolo aggiornato e due voci nuove (`news7`, `news8`); la lista mostra prima i cosmetics e poi le voci 1.9.0.
- **Test**: `features.test.js` sale a **128** (avatar stabile/coerente, accenti validi per tutti i giochi, `screenGame` nei setup, tile in home, riepilogo con avatar e `celebrate`, CSS/`applyGameAccent` presenti). **12/12 suite** verdi su sorgente e build; una prima esecuzione della suite minificata ha avuto un falso negativo su `online.test.js` (timeout di elezione host sotto carico), passata al rerun.
- `APP_VERSION` e `VERSION` portate a `1.10.0`; build: sorgente **458.875** byte, minificato **377.601** byte.

### Versione 1.9.0
- **Introduzione e demo**: card `onboardCard()` in home per i nuovi arrivati (3 passi + "Prova una partita demo"). `dismissOnboard()` salva `S.onboarded`; `loadLocal` la considera già vista per chi ha già statistiche o punteggi, così gli utenti esistenti non la vedono. `startDemo()` gioca un Preferiresti con 3 nomi temporanei e `S.demo=true`: `saveLocal()` e `saveSession()` escono subito, `statsRecord()` è saltato, `exitDemo()`/`goHome()`/`back()` ripristinano giocatori e punteggi. La barra demo in cima ha "Esci dalla demo".
- **Riepilogo di fine partita**: `gameOverNow(gid)` normalizza i marcatori di fine (`END_PH`: impostore `r`, mrwhite/lupus `end`, who_said `wres`, preferisci `pvres`; online `r|res|end`, taboo `end`). `summaryData()` usa `STATS_BASE` e calcola il **delta** punti per giocatore; `summaryBar()` mostra vincitore/i, classifica, Condividi (`shareSummary()`) e Rigioca (`rematchSummary()` via `GAME_FN`). Compare sopra il gioco quando la partita è finita, anche in demo.
- **Avviso domande automatiche**: `S.dbAck` 0 = da mostrare, 1 = visto una volta, 2 = non più automatico. `showDbTip()` è la modale (`Ho capito` / `Non mostrare più`), `maybeDbTip()` scatta la prima volta da `selectGame`, `setMode('auto')`, `pvPreset`, `pvPresetOnline`; `dbHint()` è il suggerimento permanente nel setup e nel setup online di Preferiresti, con "Perché le domande automatiche sono limitate?" che riapre la modale. Si può riaprire anche dalle impostazioni.
- **Preferenze ricordate**: `saveLocal`/`backupData` includono `mode`, `cfg` (imp/und/mwN/cats), `pvPack`, `timerPref`, `ncPref`, `favPV`, `seen` (`S.used`), accessibilità, `dbAck`, `onboarded`, `lastBackup`, `hostNotes`. `loadLocal`/`applyBackup` validano tutto (categorie in `CATS`, pacchetti in `PV_DB`, timer in 60/120/180/300, `seen` max 600). `resetPrefs()` ripristina modalità, ruoli, categorie, pacchetto, timer e categorie NC.
- **Accessibilità**: tre override su `<html>` — `data-text="s|m|l"` (root 15/16/18 px + override delle utility `text-[10px]/[11px]`), `data-contrast="high"`, `data-motion="off"`; `applyA11y()` all'avvio e a ogni cambio, `prefers-reduced-motion` resta attivo. `S.textSize`, `S.contrast`, `S.reduceMotion` sono salvati e inclusi nel backup.
- **Installazione e offline**: pulsante "Installa l'app" in home/impostazioni, `beforeinstallprompt` catturato in `INSTALL_EVT`, `installApp()` usa il prompt nativo o mostra le istruzioni (`showInstallHelp()`), `isStandalone()` riconosce l'app già installata. Badge `#off` con `updateOffline()` su `online`/`offline`.
- **Backup e dati**: `exportBackup()` ora segna `S.lastBackup`; `backupReminder()` in home dopo 30 giorni con dati reali (punteggi/statistiche/ruoli), `snoozeBackup()` rimanda di 7 giorni. `storageBytes()`/`fmtBytes()` mostrano lo spazio locale usato; `clearLocalData()` cancella `mgh_save_v1` e `mgh_session_v1` dopo conferma. Impostazioni con data ultimo backup, spazio usato, esporta/importa, installa, cancella.
- **Strumenti host**: `hostNotesOpen()`/`saveHostNotes()` (nota fino a 600 caratteri, salvata e nel backup) e "Pausa timer" (`tmStop()`) nella `hostBar()`. Il timer di discussione mostra in testa la durata preferita con `★`; `setTimerPref()` la salva.
- **Novità**: `showNews()` con la modale "Novità 1.9.0" (6 voci), raggiungibile da home e impostazioni.
- **Contenuti**: `togglePackFav()`/`pvFavRandom()` (preferiti Preferiresti), `forgetSeen()` (azzera le domande viste), `S.ncPref` ripristina le categorie NC scelte dall'host.
- **Test**: `features.test.js` sale a **115** (introduzione, demo senza salvataggi/statistiche, riepilogo e rigioca, avviso `dbAck` e hint, accessibilità, preferenze e `loadLocal`, backup e note host, timer preferito, novità) e `pwa.test.js` a **36** (badge offline, install prompt, CSS accessibilità, `applyA11y`, spazio locale, avviso database). Harness esteso con `localStorage.length/key`, `matchMedia` e `addEventListener`. **12/12 suite** verdi su sorgente e build minificata; `ui-diff` 24/24 schermate identiche.
- `APP_VERSION` e `VERSION` (`sw.js`) portate a `1.9.0`; build: sorgente **454.994** byte, minificato **374.462** byte (`index.html` + `Minigames Hub.min.html`).

### Versione 1.8.0
- **Impostazioni** (⚙️ in header): modale con suoni, vibrazione, 4 temi, statistiche e azzeramento. Le preferenze vivono in `S` (`sndOn`, `vibOn`, `theme`, `lastGame`, `stats`), sono salvate in `mgh_save_v1` e incluse in `backupData()`/`applyBackup()` (import validato).
- **Temi**: quattro set di variabili CSS (`--acc1/2/3` per i gradienti, `--btn1/2` per i bottoni) attivati da `data-theme` su `<html>`; `.gtext` e `.gbtn` leggono le variabili, quindi nessuno stile è duplicato per tema. `applyTheme()` gira all'avvio e a ogni cambio; i colori per-gioco restano alla fase cosmetics.
- **Statistiche locali**: `statsTick()` prende una base dei punteggi all'inizio della partita e registra a fine partita il **delta** di ogni giocatore; vince chi guadagna più punti (parità = più vincitori), più partite giocate, serie attuale e record per nome. Il rilevamento della fine normalizza i vari marcatori (`ph==='r'|'end'` per i giochi online, `S.G.phase==='end'` per il Lupus offline, `phase==='end'` per gli altri offline). Preferiresti e Parole vietate non hanno fine naturale: `hostAbort` registra la partita solo se qualcuno ha già segnato punti. `statsPrune()` tiene al massimo ~40 nomi, `sanitizeStats()` valida i dati importati, `statsTop()` produce la classifica.
- **Rigioca dalla lobby**: `GAME_START` mappa ogni gioco alla chiamata di avvio e ai giocatori minimi; se `S.lastGame` è noto la lobby dell'host mostra "🔁 Rigioca · <gioco>" (disabilitato sotto il minimo).
- **Banner nuova versione**: `#upd` con `showUpd()`/`hideUpd()`; il service worker emette `controllerchange` e il banner compare solo se esisteva già un controller (cioè non al primo install). `reg.update()` ogni 30 minuti e al ritorno in primo piano; reload manuale, nessun refresh forzato.
- **Modali accessibili**: `modalOpen()` porta il focus dentro e memorizza l'elemento precedente, `closeModal()` lo ripristina e imposta `aria-hidden`, Esc chiude, Tab resta nella modale, `role="dialog"`/`aria-modal`. `#live` (`aria-live="polite"`) annuncia tempo scaduto e fine partita.
- **Ritocchi**: `color-scheme: dark`, `#top` nascosto sotto 430 px, etichette `set`/`modal` tradotte, plurali italiani ("1 vittoria", "1 partita"), versione app e titolo modale aggiornati a ogni render.
- **Test**: `features.test.js` sale a **61** (temi, toggle, statistiche con più render e partita a zero punti, modale impostazioni, rigioca) e `pwa.test.js` a **26** (banner, variabili CSS, fallback 5xx). Totale **12 suite** verdi su sorgente e build minificata.
- `APP_VERSION` e `VERSION` (in `sw.js`) portate a `1.8.0`; build: sorgente 425.389 byte, minificato 349.114 byte (`index.html` + `Minigames Hub.min.html`).

### Versione 1.7.0
- **PWA installabile**: `manifest.webmanifest`, `sw.js` e icone in `icons/` (generate da `tools/make-icons.js`). Il service worker precarica la shell, usa rete-prima per la navigazione (con timeout 4 s e fallback alla cache anche quando la rete risponde 5xx/502, non solo offline) e cache-prima per gli asset, e cancella le cache vecchie; il nome della cache segue `APP_VERSION`. Registrazione solo su http(s), non da `file://`.
- **Ripresa dopo reload/standby**: sessione salvata in `mgh_session_v1` (`saveSession`/`loadSession`, TTL 2 ore, salvataggio anche su `pagehide`/`visibilitychange`). La home mostra una card con il codice e due azioni: `resumeGuest()` rientra come client, `resumeHost()` ricrea la stanza con `claimHost`/`restoreState` (giocatori, punteggi, `NET.game`, `S.G` e timer NC/TB riavviati dalle scadenze). Se il codice non è più libero dopo i retry si apre un codice nuovo con lo stesso stato e un avviso. `dismissResume()` cancella la sessione; uscita volontaria, kick e stanza chiusa la cancellano da soli.
- **Rientro client più paziente**: `netRecover` ritenta il codice stanza una seconda volta (~7 s) prima di eleggere un nuovo host, così un host che ricarica non fa perdere il comando.
- **Lobby più chiara**: pallino online/offline, host badge, conteggio connessi, versione app, pulsante "Copia codice", avviso quando il codice cambia.
- **Riepilogo condivisibile**: `summaryText()` e `shareSummary()` (Web Share o copia) dal modale 🏆, con gioco e classifica ordinata.
- **Test**: nuova suite `pwa.test.js` (22 test su manifest, icone, service worker e allineamento versione); `features.test.js` sale a 45 (ripresa sessione, card home, lobby, riepilogo). Totale **12 suite** verdi su sorgente e build.
- `APP_VERSION` portata a `1.7.0`; ricostruire `Minigames Hub.min.html` e `index.html` e aggiornare `VERSION` in `sw.js` a ogni bump.

### Versione 1.6.0
- **Nomi, Cose e Città — revisione host**: quando tutti consegnano (o scade il timer) le risposte **uniche** non vengono più accettate in automatico: si passa a `ph:'review'`, l'host tocca ogni cella (`ncToggleAt`) per ✓ +10 / ✗ 0 e conferma con `ncScore`. I doppioni restano +5 automatici, vuote/lettera sbagliata 0. Se non ci sono uniche si va dritti ai risultati. Vedi §8.
- **Nuovo gioco Parole vietate** (🚫, solo online, min 4): due squadre bilanciate, guesser casuale, la squadra vede parola + 4 parole vietate, gli avversari votano indovinata/vietata, maggioranza stretta, parità decisa dall'host, timer 60 s per turno, +100 a ogni membro della squadra che indovina. Vedi §8b.
- **Nuovo gioco Chi sono io?** (👤, solo online, min 3): ognuno vede le parole altrui ma non la propria, 5 vite, turni a voce, pulsante "Indovino!", voto di tutti gli altri, +100 se giusto e −1 vita se sbagliato, fine quando tutti hanno indovinato o sono fuori (o l'host termina). Vedi §8c.
- **Invito QR/link**: in lobby il pulsante 📤 apre `showInvite()` con QR SVG (libreria `qrcode-generator` 1.4.4 inline), link `#room=CODICE`, copia e `navigator.share`. All'apertura `parseInvite()` precompila il codice e mostra l'avviso; il guest sceglie il nome e tocca Entra. Se la pagina è aperta da `file://` il link ricade sull'URL pubblico di GitHub Pages, così il QR resta utilizzabile.
- **Backup e ripristino**: card in Home con export/import JSON di giocatori, punteggi, nome, ultimo codice, ruoli personalizzati e categorie NC personalizzate; import validato e con deduplica.
- **Correzione punteggi e annulla round**: dal modale 🏆, "Correggi punteggi" (`editScores`/`saveScores`, host) e "Annulla ultimo round" (`undoRound`, stack `UNDO` max 20 snapshot da `scoreSnap()`). Le modifiche dell'host vengono spinte ai client con `netPushScores`.
- **Preferiresti — pacchetti pronti**: 24 dilemmi in classic/hot/absurd (`PV_DB`), pulsanti pacchetto e casuale nel setup offline e online; le coppie restano modificabili.
- **Persistenza estesa**: ruoli personalizzati e categorie NC personalizzate ora sopravvivono al reload (`mgh_save_v1`) e finiscono nel backup.
- **Attesa offline 60 s**: un posto disconnesso resta prenotato per 60 secondi (era 25) prima di essere rimosso.
- **Accessibilità**: `:focus-visible` evidente, target `.gbtn` ≥44 px, testi attenuati più chiari, `prefers-reduced-motion`, `touch-action:manipulation`, utility CSS mancanti (orange/sky/rose/QR) aggiunte a mano.
- **Audio iOS**: `audioUnlock()` su `pointerdown`/`touchstart`/`keydown` crea/riprende l'`AudioContext`, così il beep del timer funziona anche su iPhone.
- **Test nel repo**: le suite sono passate da `%TEMP%` a `tests/` (`node tests/run-all.js`, `--min` per la build). Nuove `taboo.test.js` (33), `chisono.test.js` (27), `features.test.js` (31: QR/link, backup, undo, pacchetti, 60 s); aggiornate `nomicose.test.js` (47, include la revisione host), `sync.test.js` (28), `ui-diff.test.js` (24 schermate, salta se manca la build). Tutte le **11 suite** verdi su sorgente e su build minificata.
- `APP_VERSION` portata a `1.6.0`; `node build-min.js` rigenera `Minigames Hub.min.html` (~328 KB) e `index.html`.

### Versione 1.5.0
- **Rientro e rete instabile** (proposta 1): `netRecover`/`netRejoin` provano a ricollegare il client alla stanza prima di eleggere un nuovo host; `{t:'sync'}` + `netResync` rimandano lo stato corrente del gioco (`lupus`, `imp`, `mw`, `pv`, `nc`, `who`); `netWake` su `visibilitychange`/`online` ricalcola i timer, richiede il sync e riconnette PeerJS. Non serve più ricaricare per riallineare la schermata.
- **Sanitizzazione input** (proposta 2): nuove `clip`/`cleanText`/`cleanName` (per code point, senza caratteri di controllo/invisibili, spazi compattati). Applicate a nomi (join host‑side, `netOk`, `loadLocal`), risposte Imp/MW/Who, indizi Lupus, risposte e categorie NC, opzioni Preferiresti, categorie e ruoli personalizzati, `addPlayer`, `submitClue`. Il taglio per code point evita di spezzare le emoji.
- **Timer a scadenza assoluta** (proposta 5, alternativa ai Web Worker): `TMR.end` + `tmLeft()`/`tmTick()`, e per NC `G.end` + `ncLeft()`/`ncSetLeft()`/`ncTick()`. I tick sono solo di ridisegno. `nct` porta `left` **e** `end`, così anche i client contano in locale. I Web Worker sono stati scartati: in standby il sistema li congela come le normali callback, quindi non risolvono il problema.
- **Controlli host** (proposta 6): `hostBar()`/`hostAbort()` con "Termina partita" (punti conservati) e "Chiudi il round ora" per NC. Aggiunta la classe `.border-rose-500/30`.
- **Anti‑cheat ruoli** (proposta 3): **non** risolvibile lato client. L'host è l'autorità e vede già tutti i ruoli: il controllo "solo l'host può assegnare" esiste (`hostApply`/`lupCall` validano comando e fase), ma un client modificato o un host curioso possono sempre leggere lo stato. Documentato come limite, non finto come fix.
- **JSON esterni** (proposta 4): **scartati**. Romperebbero il vincolo di file singolo e il funzionamento da `file://` (fetch bloccato, niente build offline). I database restano inline.
- **README corretto**: conteggi reali verificati sul codice — 207 domande Chi l'ha detto (IT/EN), 181 prompt Impostore per lingua (12 classic, 11 hot, 11 flirty, 11 dark, 131 generati, 5 "presenti"), 8 categorie Mister White (93 cluster, 676 parole), **15 ruoli Lupus** (non ~40), 12 categorie NC; Preferiresti non ha database. Aggiornate anche feature, timer a deadline, limiti noti e un paio di typo.
- **Test**: nuove suite `mg_sync_test.js` (**27** controlli: nome sporco, deadline del timer locale, sync Preferiresti, rejoin senza elezione, sanitizzazione NC, chiusura round forzata, termine partita) e aggiornamenti a `mg_nc_test.js` (42), `mg_online_test.js` (30), `mg_pv_test.js` (47), `mg_smoke.js` (20), `mg_en_test.js`, `mg_ui_diff.js` (23 schermate). Tutte verdi su sorgente e build. Verifica manuale in Chromium non ripetuta in questa revisione (solo test headless).
- `APP_VERSION` portata a `1.5.0`; `build-min.js` ora rigenera anche `index.html` (file pubblicato da Pages).

### Versione 1.4.0
- **Nuovo gioco Nomi, Cose e Città** (📝), **solo online**: categoria + lettera + risposte dal proprio telefono, con punteggio automatico (unica +10, doppione +5, vuota/lettera sbagliata 0) e timer di round **automatico** (5 minuti, −1 minuto a ogni consegna, minimo 1; a zero il round si chiude e chi non risponde prende 0). Vedi §8.
- Home: la carta di Nomi, Cose e Città ha il badge **Online** e porta direttamente alla schermata Online con un avviso; `ONLY_ONLINE` evita che finisca nel setup passa‑telefono.
- Lobby online: nuovo pulsante 📝 (min 2) e nota minimi aggiornata (3 / Lupus 4 / Preferiresti e NC 2).
- `tmAuto()` + ramo `tmr-box auto` in `tmDraw()`: il timer sincronizzato sostituisce il timer manuale solo durante il round di NC; il timer manuale resta **manuale** (non blocca né salta il turno) in tutti gli altri giochi.
- Messaggi online leggeri `nct` (tick del timer) e `ncd` (consegne) per non ridisegnare gli input mentre si scrive; le risposte viaggiano a ogni tasto in `NCC`/`netAct`.
- i18n IT/EN completa per il gioco (`g_nomicose`, `d_nomicose`, `nc*`) e guida aggiornata (paragrafo gioco + regola punteggi).
- Aggiunte le classi CSS mancanti `.bg-emerald-600`, `.bg-emerald-600/10`, `.bg-emerald-600/30`, `.border-emerald-500/30` e la regola `#tmr .tmr-box.auto`.
- Test: nuovo `mg_nc_test.js` (**42** controlli: setup, categorie, lettera, punteggi unico/doppione/lettera sbagliata, taglio del timer, doppia consegna ignorata, chiusura automatica allo scadere, nuovo round, cambio host con riavvio del timer) su sorgente e build. Suite esistenti verdi (20 offline, 47 Preferiresti/timer/Lupus, 30 online, EN) e `mg_ui_diff.js` esteso a **23** schermate (setup NC, round, risultati, EN). Verifica manuale in Chromium: badge in home, avviso online, setup con chip verdi, round con timer `auto` in basso a destra, campo che conserva il testo mentre si scrive, consegna con taglio del tempo, schermata risultati colorata.
- `APP_VERSION` portata a `1.4.0`; `Minigames Hub.min.html` rigenerato (237.236 byte).

### Versione 1.3.0
- **Nuovo gioco Preferiresti…** (🤔), offline e online: due opzioni scritte dal GM/host, voto segreto di tutti, maggioranza +100, pareggio +50 a tutti (vedi §7). Lobby online con minimo 2 giocatori; `pv` integrato in `hostApply`, `checkG`, `netAgain`, `viewNetGame`, `canStart`, `startGame`, `back` e `render`.
- **Lupus ×10**: tutti i punti del Lupus moltiplicati per 10 tramite `LUPUS_MULT` (bonus in `addB`, vittoria/fazione/sopravvissuto in `lEnd`). Regole di Dottore/Re/Vassallo e vittoria "rubata" del Sopravvissuto **non toccate**.
- **Timer sempre in un angolo**: widget fisso in basso a destra visibile in tutti i giochi testuali tranne Lupus, con preset 1/2/3/5 min, `+1′`, stato rosso `0:00` a fine tempo e chiusura manuale. Rimosso `tmChips` (i preset ora sono nel widget); `discRow()` tiene solo Regole. Si ferma da solo uscendo dal gioco, resta locale al telefono.
- Aggiunte le classi CSS mancanti `.h-2`, `.rounded`, `.mt-1.5`, `.space-y-1.5` e la regola `body.tmon main{padding-bottom}`.
- Nuove chiavi i18n IT/EN per Preferiresti (`g_/d_preferisci`, `pvA`, `pvB`, `pvOr`, `pvStart`, `pvPass`, `pvTap`, `pvVoted`, `pvTie`, `pvMaj`, `pvNew`, `pvNeed`), descrizioni e nota punteggi nella guida.
- Test: nuovo `mg_pv_test.js` (47 controlli: flusso offline, pareggio, timer, Lupus ×10, flusso online host, lobby a 2 giocatori) eseguito su sorgente e build. Suite esistenti tutte verdi (20 offline, 30 online, EN, 19 schermate). Verifica manuale in Chromium della UI (setup, voto, risultato, timer, lobby).
- `APP_VERSION` portata a `1.3.0`; `Minigames Hub.min.html` rigenerato (223 KB).

### Versione 1.2.0
- **Inglese completo**: aggiunti `WHO_DB_EN`, `IMPOSTORE_DB_EN`/`IMP_GEN_EN`/`IMP_HAND_EN`, `CL_EN`, le descrizioni dei ruoli e le chiavi i18n mancanti (`lrCoreN`, `lrCore2`). Strutture parallele con stesse chiavi/lunghezze; test `mg_en_test.js` e scansione schermate `mg_en_ui.js`.
- **Cambio host senza perdere la stanza**: standby al vice, elezione in ordine di ingresso, nuovo host che rivendica il codice stanza, rientro dell'host originale con restituzione del comando. Corretto il bug per cui la distruzione del `roomPeer` chiudeva la connessione del rientro; `netStandby()` ora scarta le connessioni chiuse. Test dedicato (30 controlli, incluso Lupus a partita in corso).
- **Aiuto/regole disponibili durante la partita** (`showHelp(ctx)`).
- **Timer di discussione facoltativo** (1/2/3/5 min) con beep e vibrazione.
- **Accessibilità**: `aria-label`/`title` sui pulsanti solo‑emoji (❓ 🏆 🎭), `aria-pressed` sui toggle lingua.
- **Build minificata**: `build-min.js` genera `Minigames Hub.min.html` (~18% più piccolo) minificando solo il JS con terser (`mangle: false`, perché i nomi servono agli `onclick` inline) e compattando HTML/CSS. Verificata con 19 schermate identiche al sorgente e l'intera suite di test.
- Aggiunte le classi CSS mancanti `.px-6`, `.text-slate-200`.
- `APP_VERSION` portata a `1.2.0`; questo documento aggiornato.

### Revisioni precedenti
- **Formattazione leggibile** di tutto lo `<script>` con Prettier 3 (da ~1.120 righe densissime a ~6.109 righe indentate), senza modificare la logica: verificato con confronto **AST** prima/dopo (nessuna differenza).
- Testi lunghi della guida (punteggi e regole, IT/EN) divisi in array di `<p>`, un bullet per riga; il testo finale è identico (verificato stringa per stringa).
- Chiuso il vicolo cieco della modalità rapida di *Chi l'ha detto?*.
- Corretto il controllo della parola di Mister White online (ora confronta la parola Civile inglese, non quella Undercover).
- Aggiunto il periodo di tolleranza per la riconnessione e la presenza offline.
- In Lupus online, chi sparisce viene saltato invece di far chiudere la partita.
- Conferma sul tasto Home durante la partita.
- Salvataggio locale di giocatori/punteggi/lingua/nome/ultimo codice.
- I punti già guadagnati restano quando un giocatore viene tolto dalla lista.
- Rimossi codice morto (`viewGM`, `gmDone`, `WSENS`, `SENS`, `toggleSens`, `toggleW`, `wsens`/`sens`).
- Validazione più stretta dei comandi Lupus online.
- Aggiunta la classe `.py-8` mancante nel CSS compilato.

---

## 12. Limiti noti

- **L'host può barare** (vede tutto). Per un anti‑cheat vero servirebbe un server.
- L'online dipende dal **cloud PeerJS**; nessun server proprio, nessuna gestione di rete complessa.
- **Lingua per client**: la lingua è globale per pagina, non impostabile per singolo giocatore online.
- Non testato su telefoni reali (tocco, drag & drop, tastiera mobile). L'online è testato solo con un PeerJS finto in memoria, non su rete vera.
- Il timer di discussione è locale a ogni telefono: non è sincronizzato tra i giocatori online. Resta nascosto in Lupus (non ancora integrato lì).
- **Nomi, Cose e Città**: solo online; il timer ha una scadenza assoluta sull'host e i client ricevono `left`+`end`, quindi al risveglio si riallineano da soli. Un telefono completamente addormentato non riceve nulla finché non si sveglia (nessuna app web può farlo). Non c'è validazione semantica della risposta: conta solo la lettera iniziale, quindi "cane" per la categoria Città viene accettato. Le risposte uniche dipendono dalla decisione manuale dell'host (niente IA).
- **Parole vietate / Chi sono io?**: solo online e testati con PeerJS finto; non c'è validazione automatica degli indizi pronunciati a voce né della correttezza della parola detta: decidono i voti degli avversari e, in caso di parità, l'host.
- Preferiresti ha 24 dilemmi pronti ma restano modificabili; pareggio e +50 sono una scelta di default.
- **QR e audio**: la scansione del QR con la fotocamera reale e lo sblocco audio su iOS non sono stati provati su un telefono fisico. Il link funziona anche senza fotocamera.
- Il voto dell'Impostore offline è un voto unico di gruppo; online è individuale.
- Il Pittore agisce di notte (scelta di design).
- Niente GM dedicato *durante* la partita completa di Lupus: il GM usa le stesse schermate.
- La modalità rapida di Lupus e i ruoli personalizzati non hanno skill complete.
- Il cambio host copre un host che sparisce; non c'è riconciliazione se due telefoni restano partizionati a lungo (rete divisa in due). Il resync rimanda la **vista corrente**, non "rigioca" le azioni perse durante la disconnessione.
- L'anti‑cheat sui ruoli non esiste: l'host vede tutto e un client modificato può leggere ciò che riceve. Trattare l'online come "tra amici".
- **Statistiche solo locali**: ogni telefono conta le proprie partite, non c'è sincronizzazione né classifica condivisa; cancellare i dati del browser le azzera (restano solo se esportate in backup). Le vittorie sono dedotte dai punti guadagnati nella partita, quindi anche una correzione manuale dei punteggi le influenza.
- **Domande automatiche limitate**: i database inclusi sono un punto di partenza e non conoscono il gruppo. L'app lo spiega una volta (`dbAck`) e lascia un suggerimento nel setup, ma non può generare domande su misura: la modalità GM con domande scritte a mano resta la strada migliore.
- **Installazione PWA**: il pulsante usa `beforeinstallprompt` quando il browser lo offre; su iOS e su alcuni browser resta solo la procedura manuale (Condividi → Aggiungi a Home), descritta nella modale. L'installazione reale e il badge offline non sono stati provati su un telefono fisico in questa revisione.

---

## 13. Come lavorare sul file

- Modifiche mirate con `edit`/`write`, poi estrarre lo `<script>` e controllarne la sintassi con `new Function` (un vecchio `mg_syntax.js` faceva così; `node --check` non gradisce il codice pensato per il browser).
- **Se riformatti**: `npx prettier@3 --write --parser babel --single-quote --print-width 100 --trailing-comma none` sullo script estratto, poi reinserirlo. Copia di sicurezza pre-formattazione: `Minigames Hub.preformat.html` (versione originale non toccata: `Minigames Hub.backup.html`).
- Per verificare che la formattazione non abbia rotto nulla: confrontare gli AST dei due file (acorn) — devono essere identici (a meno di trasformazioni volute).
- Le stringhe che contengono HTML o database vanno lasciate su una riga: spezzarle non serve e rischia errori.
- Attenzione all'encoding: leggere/scrivere con Node (`fs.readFileSync(path,'utf8')`), **non** con `Get-Content`/`Set-Content` di PowerShell (rischio mojibake su emoji e accenti). I file sono a fine riga LF.
- Test headless in Node: si estrae lo script, si stubbano `window`, `document`, `crypto`, `localStorage`, `alert`, e si fanno girare partite con bot. Mantenere questo approccio.
- **Build minificata**: `node build-min.js` rigenera **`Minigames Hub.min.html` e `index.html`** dal file HTML. Usa terser (`compress`, **`mangle:false`**) sull'unico `<script>`, compatta il CSS personalizzato e gli spazi tra i tag HTML, **senza toccare le stringhe JS**. Cerca terser in `node_modules`, poi in `%TEMP%\mgast`, poi globalmente (`npm i terser` oppure `npm i terser --prefix "%TEMP%\mgast"`). Con terser **5.51.2** e un checkout LF la build è identica byte per byte: la CI la ricostruisce e fallisce se `index.html`/`Minigames Hub.min.html` sono rimasti indietro. Dopo ogni modifica al sorgente, rigenerarla e rilanciare i test.
- **Bump di versione**: `node tools/bump-version.js 1.12.0` aggiorna `APP_VERSION`, i due titoli "Novità/What's new", `VERSION` in `sw.js` e le asserzioni di versione in `features.test.js`, poi ricostruisce. CHANGELOG e handoff restano da scrivere a mano.
- **Dimensioni**: `node tools/size-report.js` stampa raw/gzip dei file principali e la ripartizione JS/CSS della build minificata.
- **CI**: `.github/workflows/ci.yml` su push `main` e PR: installa terser 5.51.2, ricostruisce, verifica che la build committata sia aggiornata, lancia `run-all.js` e `run-all.js --min`.
- **Test** (tutti in `tests/`, con `MG_FILE` per puntare a un file alternativo):
  - `node tests/run-all.js` esegue tutte le suite sul sorgente; `node tests/run-all.js --min` sulla build minificata (`index.html`/`Minigames Hub.min.html`). Se una suite fallisce, il comando esce con codice 1.
  - `tests/smoke.test.js` — 20 test offline (regole, persistenza).
  - `tests/online.test.js` — 30 test online con PeerJS finto (lobby, partita, cambio host, rientro, Lupus).
  - `tests/sync.test.js` — 28 test su rientro/resync/sanitizzazione/host controls (nome sporco, deadline timer, sync Preferiresti, rejoin senza elezione, NC, termina partita, uscita volontaria senza rejoin fantasma).
  - `tests/preferisci.test.js` — 47 test su Preferiresti (offline, pareggio, timer, Lupus ×10, online host, lobby a 2).
  - `tests/nomicose.test.js` — 47 test su Nomi, Cose e Città (setup, categorie, lettera, punteggi, revisione host, taglio e scadenza del timer, nuovo round, cambio host).
  - `tests/taboo.test.js` — 33 test su Parole vietate (squadre, ruoli/visibilità carta, maggioranze, parità, chiusura host, timeout, punteggi, annulla round, minimo giocatori).
  - `tests/chisono.test.js` — 27 test su Chi sono io? (parole nascoste, turni, voti, vite/uscita, parità, fine e rivelazione, minimo giocatori).
  - `tests/features.test.js` - 169 test su QR/link, backup/ripristino (anche unisci/sostituisci con avviso versione), annulla round, correzione punteggi, pacchetti Preferiresti (incluso `mine`), attesa offline 60 s, ripresa sessione, lobby e riepilogo condivisibile, batch 1.9.0, cosmetics 1.10.0 e batch 1.11.0 (rinomina/undo, recenti+CSV, note host condivise, domande personali, avatar scelti, payload avatar, temi Neon/Ghiaccio, podio, sfondo, contrasto).
  - `tests/pwa.test.js` — 36 test su manifest, icone PNG/SVG, service worker, precache e allineamento versione cache/`APP_VERSION`, badge offline, `beforeinstallprompt`, CSS di accessibilità e calcolo dello spazio locale.
  - `tests/i18n.test.js` — lunghezze e qualità dei database EN.
  - `tests/ui-en.test.js` — scansione delle schermate EN (falsi positivi noti: "Impostor", "eliminate", "civilians").
  - `tests/ui-diff.test.js` — 24 schermate identiche tra sorgente e build minificata (incluse revisione e risultati di Nomi, Cose e Città). Salta se la build non esiste.
  - `tests/lib/harness.js` — harness condiviso (DOM/localStorage/location finti in `vm`).
  - La verifica di sintassi si può fare estraendo lo `<script>` e usando `new Function` (come faceva `mg_syntax.js`); `node --check` non gradisce il codice pensato per il browser.
- Il file HTML resta la fonte di verità: la build non va modificata a mano.
- Le classi Tailwind nuove vanno aggiunte a mano nel CSS inline.
- Dopo ogni consegna, chiedere all'utente se ha altro da correggere.

---

## 14. Preferenze dell'utente

- Risposte in italiano, concise e pratiche; dire cosa è stato verificato e cosa no.
- Decidere i dettagli ragionevoli, ma segnalare le scelte arbitrarie.
- Contenuti divertenti, "unhinged", non espliciti; formulazioni neutre rispetto al genere; celebrità solo internazionali.
- La versione offline passa‑telefono deve restare disponibile.
- Non cambiare Dottore/Re/Vassallo né la vittoria "rubata" del Sopravvissuto.
