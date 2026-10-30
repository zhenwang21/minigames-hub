# Minigames Hub — documento di passaggio di consegne

> Documento aggiornato all'ultima revisione del file `Minigames Hub.html`. L'utente parla **italiano** e vuole risposte concise e oneste: dire sempre **cosa è stato verificato** e cosa no. Il progetto è tra amici, non è un prodotto commerciale, ma va tenuto decentemente.

---

## 1. Cos'è il progetto

**Minigames Hub** è una web app a pagina singola, mobile‑first, tema scuro viola/fucsia, con 6 party game. Funziona in due modi:

1. **Passa‑telefono (offline)**: si gioca su un solo telefono che gira tra i giocatori. È la modalità principale e completa.
2. **Online (beta)**: ogni giocatore usa il proprio telefono, con una stanza e un codice. È un bonus, non sostituisce l'offline. **Nomi, Cose e Città esiste solo online.**

È un **unico file HTML** (`Minigames Hub.html`, ~283 KB, 6.911 righe totali di cui ~6.850 di JavaScript) senza backend. C'è uno script `build-min.js` che genera `Minigames Hub.min.html` (~232 KB, −18%): il file HTML resta la fonte di verità, la build serve solo per distribuire un file più leggero. Il CSS di Tailwind è **compilato inline** dentro il file (non c'è più il CDN di Tailwind): se servono classi nuove, vanno aggiunte a mano nel blocco CSS in cima. Dipendenze esterne: font Google *Plus Jakarta Sans* e **PeerJS 1.5.4** da jsDelivr (solo per l'online).

Giochi:
1. **Mister White** (stile Undercover)
2. **Impostore**
3. **Chi l'ha detto?**
4. **Preferiresti…**
5. **Lupus in Fabula** (modalità rapida e completa)
6. **Nomi, Cose e Città** (solo online, con timer automatico)

Storia: il file è stato ricostruito a blocchi e ripulito più volte. Versioni di sicurezza: `Minigames Hub.preformat.html` (prima della passata di Prettier) e `Minigames Hub.backup.html` (originale più vecchio, non toccato). Versione app: `APP_VERSION = '1.4.0'` (la versione viene controllata all'ingresso in stanza: client con versioni diverse vengono rifiutati). La fonte di verità è il file HTML, non vecchi documenti o database esterni.

---

## 2. Architettura del codice

Tutto in un unico `<script>`. Niente framework: stringhe HTML assegnate a `#app.innerHTML` da `render()` e handler inline `onclick="funzione()"`.

**Formattazione del codice**: lo `<script>` è formattato con **Prettier 3** (`--parser babel --single-quote --print-width 100 --trailing-comma none`). Le stringhe di testo lunghe della guida (punteggi e regole) sono state spezzate in array di `<p>` con `.join('')`, un bullet per riga. Il blocco `<style>` compilato di Tailwind resta **minificato di proposito**: non va formattato, esploderebbe il file.

**Stato globale `S`:**
`lang` (`'it'|'en'`), `screen` (`'home' | 'setup' | 'lroles' | 'ltype' | 'play' | 'online' | 'pvsetup' | 'ncsetup'`), `hint` (gioco solo-online da cui si è arrivati alla schermata Online), `game`, `players[]`, `scores{}`, `used` (Set per non ripetere domande), `mode` (`'auto'|'gm'`), `gm{a,b,c}`, `pv{a,b}` (le due opzioni di Preferiresti), `gmPlay`, `gmName`, `cfg` (`und`, `mwN`, `cats`, `imp`), `lc` (config Lupus), `G` (stato partita), `sel`, `quick`.

**Online `NET`:**
`peer`, `conn`, `conns{}`, `host`, `code`, `name`, `hostName`, `origHost`, `roomPeer`, `elec`, `elecT`, `mirror`, `lastSnap`, `players[]`, `order[]`, `peers{}`, `st`, `err`, `view`, `game`, `scores{}`, `offline{}`, `gone{}`, `offT{}`, `off[]`, `lastCode`.
L'host è l'autorità: tiene lo stato di gioco e manda a ogni client solo la propria vista. I client mandano azioni (`{t:'lc',c}` per Lupus, `{t:'vote',...}`, ecc.) che l'host valida.

**Cambio host (se l'host sparisce):**
- L'host manda uno snapshot completo (`netSnap()`, include `S.G` con i ruoli) al **vice**: il primo giocatore connesso dopo l'host, in ordine di ingresso.
- Se l'host si disconnette, i client eleggono il primo candidato raggiungibile (`netCandidates`/`netTry`/`netDial`, tentativi in ordine di ingresso). Il nuovo host riprende la stanza con lo stesso codice (`netRoomPeer`) e la partita dallo snapshot.
- Se **l'host originale rientra** con lo stesso nome, riceve `{t:'become'}` con lo snapshot e riprende il comando (`netPromote`); gli altri ricevono `{t:'moved'}` e si ricollegano a lui. La stanza non muore e la partita continua.
- Il vecchio host libera il codice stanza (`roomPeer.destroy()`) e si ricollega subito come client: senza questo passaggio la connessione del rientro si chiuderebbe con il `roomPeer`.
- `netStandby()` ignora le connessioni chiuse (`open === false`), così lo snapshot non finisce in una connessione morta.

**Persistenza locale (`localStorage`, chiave `mgh_save_v1`):**
vengono salvati/ripristinati giocatori, punteggi positivi, lingua, nome online e ultimo codice stanza. Non si salvano partite in corso: dopo un reload si torna alla Home. `clearPlayers()` azzera anche i punteggi; togliere un giocatore dalla lista **non** cancella i punti già guadagnati.

**Funzioni di utilità chiave:**
- `t(key)`, `X(it,en)`: i18n. `esc()` fa escape HTML.
- `rnd(n)`, `shuffle(a)`: casualità con `crypto.getRandomValues` + Fisher‑Yates. `pickU(pool,keyFn)` evita ripetizioni finché il pool non è esaurito.
- Navigazione: `home()`, `goHome()` (con conferma se c'è una partita in corso e chiusura stanza online), `back()`, `selectGame()`, `startGame()`, `render()`.
- Viste: `viewHome`, `viewSetup`, `viewOnline`, `viewNetGame`, `viewPlay`, `viewMW`, `viewImp`, `viewWho`, `viewPref`, `viewPvSetup`, `viewNcSetup`, `viewLRoles`, `viewLType`, `viewLupus`, `viewLF`.
- Punteggi: `S.scores` in memoria + salvataggio locale; modale 🏆 e reset in alto.

**Regole UI da mantenere:**
- Durante le partite non c'è il tasto "indietro" (solo Home in alto); i menu pre‑partita hanno "indietro".
- Le risposte scritte non possono essere vuote: il pulsante resta disabilitato.
- Il GM non conta nei giocatori, tranne in *Chi l'ha detto?* con "Il GM gioca anche".
- Le classi Tailwind nuove vanno aggiunte a mano nel CSS inline.
- **Aiuto in partita**: `showHelp(ctx)` apre la guida anche durante una partita (`ctx` imposta la sezione iniziale; `open` ricorda che si è entrati dalla partita). Il pulsante ❓ è sempre raggiungibile.
- **Timer di discussione**: widget fisso in basso a destra (`#tmr`, stato in `TMR`), **sempre visibile durante i giochi testuali** (tutti tranne Lupus) e nascosto in Home, setup e lobby. Da fermo mostra i preset 1/2/3/5 minuti; in corsa mostra `mm:ss`, `+1′` e stop; a zero diventa rosso (`0:00`, beep con WebAudio + vibrazione) e resta finché non lo si chiude con ✕. Si spegne da solo uscendo dal gioco. È **locale al telefono**, non sincronizzato online: **non blocca né salta il turno**, è solo un promemoria. `discRow()` ora contiene solo il pulsante Regole.
- **Timer automatico di Nomi, Cose e Città**: lo stesso widget in modalità `auto` (`#tmr .tmr-box.auto`, nessun pulsante), che mostra il tempo **sincronizzato** del round. `tmAllowed()` esclude Lupus e la schermata risultati di NC; `tmAuto()` riconosce la vista `nc`. A zero il round si chiude davvero e chi non ha consegnato prende 0. È l'unico gioco in cui il tempo salta il turno, ed è voluto.
- **Accessibilità**: i pulsanti solo‑emoji (❓ 🏆 🎭) hanno `aria-label`/`title`; i toggle lingua hanno `aria-pressed`.

---

## 3. Database dei contenuti

Prima di `const S=`:
- `WORDS`: poche coppie con traduzione EN `[itCiv, itUnd, enCiv, enUnd]`.
- `CL` (helper `K(...)`): cluster di parole simili in 8 categorie. `pickPair(cat)` estrae due parole distinte.
- `IMPOSTORE_DB` → `IMP_GEN` (~131 alberi generati) e `IMP_HAND` (~50 scritti a mano), scelti 50/50.
- `WHO_DB` → `WHO_ALL` (~207 domande).
- **Versioni inglesi parallele**: `WHO_DB_EN` (207), `IMPOSTORE_DB_EN` → `IMP_GEN_EN` (131) / `IMP_HAND_EN` (50) e `CL_EN` (93 cluster). Le strutture hanno **le stesse chiavi e le stesse lunghezze** delle italiane (verificato da `mg_en_test.js`). La scelta avviene a runtime: `impGen()`, `impHand()`, `whoPool()` e `pickPair()` (che restituisce la coppia bilingue `[itA, itB, enA, enB]`, `word()` prende l'offset 2 in EN).
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
- Nessun database di domande: le opzioni le scrive sempre il GM/host (in futuro potrebbero arrivare quelle generate dall'IA).
- Funzioni: `startPref`, `pvShow`, `pvVote`, `pvCalc`, `pvAgainOff`, `viewPref`, `pvHostOpen`, `viewPvSetup`, `pvOnlineStart`, `pvApply`, `pvChk`, `pvBc`, `pvAgain`.

---

## 8. Nomi, Cose e Città (solo online)

- **Solo online**: dalla Home la carta ha il badge *Online*; `ONLY_ONLINE = ['nomicose']`, `selectGame()` non apre il setup offline ma `S.screen='online'` con `S.hint='nomicose'`, e la schermata Online mostra un avviso (`ncHint`).
- **Setup host** (`ncHostOpen()` → schermata `ncsetup`, `viewNcSetup`): 12 categorie predefinite (`NC_CATS`: Nome, Cosa, Città, Animale, Cibo, Colore, Mestiere, Film, Cantante, Sport, Marca, Personaggio), max **10** selezionate (`NC_MAX`), più categorie personalizzate (max 18 caratteri, eliminabili con 🗑). La bozza vive in `NET.ncDraft` (oggetti `{k,it,en}`, le custom hanno `k` che inizia con `cu`). Default: Nome/Cosa/Città. Non si può scendere sotto 1 categoria. `back()` riporta alla lobby.
- **Lettera**: IT = 21 lettere (`NC_IT`, senza J K W X Y), EN = 26 (`NC_EN`), scelta dalla lingua dell'host ed evitando la lettera del round precedente (`ncLetter`).
- **Round** (`ncStart()`, `ncAgain()`): `NET.game = {g:'nc', ph:'play', round, cats, letter, a:{player:{catKey:testo}}, d:{player:true}, left, timeup}`. Al nuovo round cambiano lettera e categorie restano; `stamp` (`lettera-round`) fa azzerare le bozze locali ai client.
- **Risposte**: ogni client tiene la propria bozza in `NCC` e manda `{t:'nc', i, v}` **a ogni tasto** (`ncSend`), così nessun re-render ruba il focus; l'host le valida e le salva in `G.a`. `{t:'ncd'}` = consegna.
- **Timer automatico** (unico gioco con il tempo che chiude il turno): parte da **5 minuti** (`NC_TIME=300`), ogni consegna toglie **60 s** (`NC_CUT`) con minimo **60 s** (`NC_MIN`). Il countdown gira solo sull'host (`NC_IV` in `ncStartTimer`) e viene mandato ai client con il messaggio leggero `{t:'nct', left}` che aggiorna solo il widget. A zero `ncFinish()` chiude il round (`timeup:true`) e chi non ha consegnato prende 0.
- **Punteggio** (`ncCalc`, normalizzazione `ncNorm`: minuscole, niente accenti, solo lettere/numeri):
  - risposta vuota o che **non inizia con la lettera** → 0;
  - risposta **unica** nella categoria → **+10**;
  - risposta **ripetuta** da un altro giocatore nella stessa categoria → **+5** a testa (anche con maiuscole/accenti diversi);
  - il totale del round si somma ai punteggi con `netScore`; i risultati mostrano per ogni giocatore ogni categoria con +10/+5/✗.
- **Fine round**: quando tutti hanno consegnato (`ncApply`/`ncCheck`) o allo scadere del timer. Vista `ncres` condivisa con pulsanti host "Nuova lettera" (`netAgain` → `ncAgain`) e "Torna alla lobby" (`ncBack` → `toLobby`).
- **Online/infra**: `hostApply` → `ncApply`; `checkG` → `ncCheck` (sotto 2 giocatori si torna in lobby); `netResync` → `ncBc`; `netPromote` riavvia il timer o lo ferma se la partita era finita; `netAgain` ha il ramo `nc`; `netClientMsg` intercetta `nct`/`ncd` **prima** di `netView`. Messaggi: `nc` (vista round), `nct` (tick), `ncd` (consegne), `ncres` (risultati).
- **Minimo 2 giocatori**; non esiste versione offline.
- Funzioni: `ncHostOpen`, `viewNcSetup`, `ncToggle`, `ncAddCustom`, `ncDel`, `ncStart`, `ncAgain`, `ncBack`, `ncApply`, `ncCheck`, `ncCalc`, `ncFinish`, `ncStartTimer`, `ncStopTimer`, `ncSend`, `ncDone`, `ncBc`, `ncDoneBc`, `ncBroadcast`, `viewNetGame` (rami `nc` e `ncres`).

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

- **Host**: crea la stanza, riceve un codice di **5 caratteri** (alfabeto senza lettere ambigue), max **16** giocatori. L'host può avviare i 6 giochi.
- **Client**: apre la stessa pagina, sceglie Online, inserisce nome e codice. Min 3 giocatori (Lupus 4, Preferiresti e Nomi Cose e Città 2).
- **Riconnessione**: se un telefono si disconnette o ricarica, ha **25 secondi** per rientrare con lo stesso nome. L'host lo marca offline (📴) e, se non torna, lo rimuove. In Lupus le sue azioni notturne/voto/Kamikaze/Sindaco vengono saltate automaticamente (`lupDrop`/`lupAuto`); la partita non si chiude più.
- **Host come autorità**: i ruoli/parole segrete stanno nell'host; ogni client riceve solo la propria vista. L'host però può barare (noto).
- **Lupus online**: riusa il motore offline. L'host genera l'HTML per ogni giocatore (`lupHtml`), converte gli `onclick` in `data-c`, e i client mandano `{t:'lc',c}`. `lupCall` accetta solo i comandi previsti per la fase corrente e valida indici/ruoli.
- **Persistenza**: nome, ultimo codice stanza, giocatori e punteggi restano in `localStorage`.
- **Cambio host automatico**: se l'host perde la connessione (crash, rete, telefono chiuso) la stanza **non muore**. Il vice (primo giocatore connesso dopo l'host, in ordine di ingresso) riceve in anticipo uno snapshot completo e prende il comando; gli altri si ricollegano a lui e la partita riprende dallo stesso punto. Quando l'host originale rientra dal codice stanza, il comando **torna a lui** mentre la stanza continua. Dettagli in §2.
- **Uscita volontaria**: il tasto Home chiede conferma durante una partita e chiude la stanza se sei host/connesso (è diverso da una disconnessione: lì scatta il cambio host).
- PeerJS usa il cloud pubblico: se è giù o bloccato, l'online non funziona. Non c'è server proprio.

---

## 11. Cosa è stato corretto nell'ultima revisione

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
- **Nomi, Cose e Città**: solo online; il timer è dell'host e i client lo ricevono via `nct` (se un client è bloccato il suo orologio può restare indietro fino al prossimo tick). Non c'è validazione semantica della risposta: conta solo la lettera iniziale, quindi "cane" per la categoria Città viene accettato. Le categorie personalizzate non vengono salvate oltre il reload (restano in memoria).
- Preferiresti non ha un database di domande: le due opzioni vanno sempre scritte. Pareggio e +50 sono una scelta di default.
- Il voto dell'Impostore offline è un voto unico di gruppo; online è individuale.
- Il Pittore agisce di notte (scelta di design).
- Niente GM dedicato *durante* la partita completa di Lupus: il GM usa le stesse schermate.
- La modalità rapida di Lupus e i ruoli personalizzati non hanno skill complete.
- Il cambio host copre un host che sparisce; non c'è riconciliazione se due telefoni restano partizionati a lungo (rete divisa in due).

---

## 13. Come lavorare sul file

- Modifiche mirate con `edit`/`write`, poi estrarre lo `<script>` e fare `node --check`.
- **Se riformatti**: `npx prettier@3 --write --parser babel --single-quote --print-width 100 --trailing-comma none` sullo script estratto, poi reinserirlo. Copia di sicurezza pre-formattazione: `Minigames Hub.preformat.html` (versione originale non toccata: `Minigames Hub.backup.html`).
- Per verificare che la formattazione non abbia rotto nulla: confrontare gli AST dei due file (acorn) — devono essere identici (a meno di trasformazioni volute).
- Le stringhe che contengono HTML o database vanno lasciate su una riga: spezzarle non serve e rischia errori.
- Attenzione all'encoding: leggere/scrivere con Node (`fs.readFileSync(path,'utf8')`), **non** con `Get-Content`/`Set-Content` di PowerShell (rischio mojibake su emoji e accenti). I file sono a fine riga LF.
- Test headless in Node: si estrae lo script, si stubbano `window`, `document`, `crypto`, `localStorage`, `alert`, e si fanno girare partite con bot. Mantenere questo approccio.
- **Build minificata**: `node build-min.js` rigenera `Minigames Hub.min.html` dal file HTML. Usa terser (`compress`, **`mangle:false`**) sull'unico `<script>`, compatta il CSS personalizzato e gli spazi tra i tag HTML, **senza toccare le stringhe JS**. Richiede terser: `npm i terser` in `%TEMP%\mgast` (percorso usato dallo script) oppure adattare il require. Dopo ogni modifica al sorgente, rigenerarla e rilanciare i test.
- **Test** (tutti in `%TEMP%\opencode\`, accettano `MG_FILE` per puntare alla build):
  - `mg_smoke.js` — 20 test offline (regole, persistenza).
  - `mg_online_test.js` — 30 test online con PeerJS finto (lobby, partita, cambio host, rientro, Lupus).
  - `mg_pv_test.js` — 47 test su Preferiresti (offline, pareggio, timer, Lupus ×10, online host, lobby a 2).
  - `mg_nc_test.js` — 42 test su Nomi, Cose e Città (setup, categorie, lettera, punteggi, taglio e scadenza del timer, nuovo round, cambio host).
  - `mg_en_test.js` — lunghezze e qualità dei database EN.
  - `mg_en_ui.js` — scansione delle schermate EN (falsi positivi noti: "Impostor", "eliminate", "civilians").
  - `mg_ui_diff.js` — 23 schermate identiche tra sorgente e build minificata (incluse setup/round/risultati di Nomi, Cose e Città).
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
