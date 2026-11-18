# 🎭 Minigames Hub

A single-file party-game web app: play on **one phone passed around** or on **several phones in the same room** with a room code.

**▶ Play now: <https://zhenwang21.github.io/minigames-hub/>**

No install, no account, no backend.

---

## 🎮 Games

| Game | Italian name | How it plays | Modes |
| --- | --- | --- | --- |
| 🎭 **Impostor** | Impostore | Everyone answers the same question, except the impostor who gets a different one. Discuss, then vote. | Pass & Play · Online |
| 🕵️ **Mister White** | Mister White | Civilians share a word, Undercovers get a similar one, Mister White gets only a hint. | Pass & Play · Online |
| 💬 **Who Said That?** | Chi l'ha detto? | Anonymous answers to a question; guess who wrote the one on screen. | Pass & Play · Online |
| 🤔 **Would You Rather…** | Preferiresti… | Pick a ready-made pack or type two options; everyone votes in secret and the majority scores. | Pass & Play · Online |
| 🐺 **Werewolf** | Lupus in Fabula | Full narrator-less game (roles, night phase, stake, win conditions) or quick mode with roles only. | Pass & Play · Online |
| 📝 **Names, Things and Cities** | Nomi, Cose e Città | A letter plus chosen categories; everyone types answers on their own phone. | **Online only** |
| 🚫 **Forbidden Words** | Parole vietate | Two teams: one player guesses, teammates give clues without saying the forbidden words; the other team votes. | **Online only** |
| 👤 **Who Am I?** | Chi sono io? | You see everyone else's word but not your own. Ask questions out loud, then guess; the others vote. | **Online only** |

## ✨ Features

- **Pass & Play or Online** — one device in the middle of the table, or a P2P room (PeerJS) without creating an account.
- **Host migration** — if the host's phone drops, another player takes over and the game continues from the same point; the original host can rejoin with the room code.
- **QR / link invite** — the lobby shows a QR code and a shareable link containing `#room=CODE`. Opening it fills in the room code; the guest only picks a name and taps Join. The QR can be enlarged or downloaded as SVG, and an optional 4-digit room PIN is carried in the link (`&pin=`) and required to join. When the page is opened from `file://`, the link falls back to the published GitHub Pages URL so the QR still works.
- **Fast recovery** — a client whose connection blips reconnects to the room by itself instead of triggering an election, then asks the host to re-send the current screen (`{t:'sync'}`). Coming back from standby or mobile-data hiccups no longer leaves a stuck or out-of-date screen. A dropped player keeps their seat for 60 seconds.
- **Host controls** — the host can pass control to another player, reorder players (and turn order), set or remove a 4-digit room PIN, kick someone from the lobby, and end the game at any time (scores are kept), close a Names, Things and Cities round or a Forbidden Words turn before the timer runs out, and end/reveal Who Am I?.
- **Score tools** — 🏆 shows the table with "Undo last round" (up to 20 snapshots) and "Edit scores" for manual corrections. Host edits are pushed to every phone, and the panel can share or copy the summary.
- **Backup & restore** — export players, scores, custom roles, custom Names, Things and Cities categories and personal questions to a JSON file. Importing shows the file version and offers **merge** (adds players, scores, statistics and content without touching settings) or **replace**; a backup from a different app version is flagged first.
- **Installable PWA** — add it to the home screen from the in-app install button (or the browser prompt); long-pressing the icon offers shortcuts to Impostor, Werewolf and Would You Rather, the offline badge appears when the connection drops, and the app shell loads offline (also when the server answers with an error) while multiplayer still needs a connection.
- **Resume after reload or standby** — a room interrupted by a refresh is offered again on the home screen for up to 2 hours. The host restores players, scores and the current game; if the old room code is no longer free, a new one is opened with the same state.
- **Clearer lobby** — online/offline dots, a banner listing offline players, connected count, host badge, tap-to-copy code and the running version.
- **Game identities** — each game has its own accent gradient on the home card, a thin colour bar and a soft radial background during setup and play, independent of the selected theme.
- **Player avatars** — a stable emoji and colour derived from each name in the setup list, online lobby, score table and end-of-game summary; tap an avatar to choose a different one. The choice is saved on the phone and shared through the lobby so every device shows it.
- **Subtle motion** — cards lift on hover, the screen fades in on navigation, the logo has a slow shine, the winner pulses in the summary, role and word cards flip in, victory confetti falls once per result (stars for Werewolf and Who Am I?, dots for Names/Things/Cities and Forbidden Words), and the top three get 🥇🥈🥉 with a gold/silver/bronze bar; all of it respects the reduce-animations setting and `prefers-reduced-motion`.
- **First-run intro & demo** — a short welcome card explains the flow and offers a demo game; the demo never touches saved scores or statistics.
- **End-of-game summary** — when a game ends, the winner and the points each player gained in that game are shown at the top, with share, share-as-image and play-again buttons. The image is drawn on a canvas and goes through the system share sheet or a download; nothing is uploaded.
- **Daily challenge and mix mode** — the home screen suggests a deterministic game for the day (marked done when it appears in the local recent results, with a consecutive-day count) and a mix button opens a random offline game that fits the current player count.
- **Statistics and achievements** — settings keep the per-player table, add a bar chart per game and a seven-day activity chart, plus nine badges derived from wins, streaks, total games, catalogue coverage and late-night sessions.
- **Timers keep the screen awake** — while a discussion or online round timer runs, the app asks for a screen wake lock and releases it when the timer stops; browsers without the API simply ignore it.
- **Remembered preferences** — mode, role counts, categories, Would You Rather pack, discussion timer, favourite packs and already-seen questions are restored on the next visit and included in the backup.
- **Questions written by the players** — a one-time note (plus a permanent hint in the setup screen) explains that the built-in databases are only a starting point and the games work best with original questions written by the group; it can be dismissed permanently and reopened from the settings. **My questions** adds your own lines for Who Said That? and Would You Rather (one per line / `A | B` pairs), used alongside the built-in ones and saved in the backup.
- **Host notes** — a private memo in the host bar, plus **Share with everyone** to send it read-only to every phone in the room; guests see it as a dismissible banner.
- **Player management** — rename a player inline (the score follows the new name), remove one by mistake and tap **Undo removal**, or clear the whole list.
- **Settings panel** — sound on/off plus three sound packs, a volume slider and vibration, seven themes (Purple / Ocean / Sunset / Forest / Neon / Ice / light Paper) with preview cards and matching page backgrounds, a standard or rounded font, a custom accent that keeps text readable, accessibility, default timer, content tools, backup data, a local statistics card and a privacy page, all saved on the phone and included in the backup. Dialogs trap Tab inside them, close on Escape and give focus back to the button that opened them.
- **Local stats** — finished games, wins, current streak and best streak per player, counted from the points each player gains during a game; the most played game, the last few games with their winners, and a CSV export are included too.
- **Victory sounds** — a short chime at the end of a game, with a different three-note pattern per game; it follows the existing sound switch.
- **Play again** — the host's lobby offers one tap to restart the last game with the same players.
- **Update banner** — when a new version is deployed, an open tab offers to reload instead of silently running old code.
- **Keyboard-friendly modals** — Esc closes, Tab stays inside, focus returns to the button that opened it.
- **Bilingual IT / EN** — full interface and question databases in both languages, switchable at any time.
- **Big content pack** — 181 Impostor prompts per language (131 generated + 50 hand-written), 207 Who Said That questions, 8 Mister White word categories (93 clusters, 676 words), 15 Werewolf roles (plus custom quick-game roles), 24 Would You Rather dilemmas, 40 Forbidden Words cards and 64 Who Am I? words, all with English counterparts.
- **Automatic scoring** — +100 to the winners of Impostor / Mister White / Who Said That, +100 (or +50 on a tie) in Would You Rather, +10 for a unique answer the host accepts, +5 for duplicates, 0 for blank or wrong letter in Names, Things and Cities, +100 per guessed word in Forbidden Words and Who Am I? (a wrong Who Am I? guess costs one of 5 lives). Werewolf uses a full ×10 point table.
- **Ready-made packs** — Would You Rather has Classic / Hot takes / Absurd packs plus a random button, both offline and online; packs can be marked as favourites and drawn from favourites only.
- **Auto round timer** (Names, Things and Cities) — starts at 5 minutes, every submission cuts 1 minute (minimum 1); at zero the round closes and unanswered players score 0.
- **Forbidden Words timer** — 60 seconds per turn, synced to every phone; a turn with no majority when time runs out is a foul.
- **Deadline-based timers** — every clock stores an absolute end time and recomputes on `visibilitychange`, so background tabs and phone standby do not make the count drift; the round timer is also sent with its end time, so each phone counts down locally.
- **Optional discussion timer** — a manual corner clock for the other games, with a preferred default duration (starred), a host pause button and host notes. It never blocks or skips a turn.
- **Input sanitising** — names, answers, clues, custom categories and options are trimmed, stripped of control/invisible characters and capped by code point, so long or emoji-heavy input cannot break the layout or the scoring.
- **Local saves** — players, scores, language, name, last room code, custom roles and custom Names, Things and Cities categories stay in `localStorage`; the backup file moves them to another phone.
- **Data tools** — backup date, local storage used, one-tap clear of local data, and a weekly reminder when it has been a long time since the last export.
- **Accessibility details** — `aria-label` on icon-only buttons, `aria-pressed` on language toggles, visible `:focus-visible` outlines, ≥44 px main buttons, higher-contrast muted text, `prefers-reduced-motion` support and `touch-action: manipulation`; in addition, three text sizes (Small / Normal / Large), a high-contrast mode and a manual "reduce animations" switch.

## 🕹 How to play

1. Open <https://zhenwang21.github.io/minigames-hub/> on your phone.
2. **Pass & Play:** add the players, pick a game, pass the phone when asked.
   **Online:** tap **Online**, create a room (5-character code) or join one, then the host starts a game. Use the invite button in the lobby to show a QR code and a link.
3. Play. Scores are kept by the app; the 🏆 button shows the table, with undo and manual correction.

On a phone, tap **Install the app** in the settings (or use the browser menu) to add Minigames Hub to the home screen: it opens full-screen and the shell still loads offline.

Online needs 3 players (Werewolf and Forbidden Words 4, Would You Rather and Names, Things and Cities 2). Rooms are compatible only between phones running the same build (`APP_VERSION` in the source); if a phone is stuck on an old cached copy, reload the page.

## 📁 Repository layout

| File | Purpose |
| --- | --- |
| `index.html` | Published build (minified). This is what GitHub Pages serves. |
| `Minigames Hub.html` | Source of truth, readable and formatted. Edit this one. |
| `Minigames Hub.min.html` | Same build as `index.html`, kept with an explicit name for offline sharing. |
| `build-min.js` | `node build-min.js` regenerates both builds from the source (needs [terser](https://terser.org/)). |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA install and offline shell; the cache version in `sw.js` must follow `APP_VERSION`. |
| `tools/make-icons.js` | Regenerates the PNG icons with no dependencies. |
| `tools/bump-version.js` | `node tools/bump-version.js 1.12.0` updates `APP_VERSION`, both “What’s new” titles, `sw.js` and the version assertions, then rebuilds. |
| `tools/size-report.js` | Prints raw/gzip sizes of the main files plus the inline JS/CSS split of the minified build. |
| `tools/serve.js` | `node tools/serve.js` serves the folder on http://localhost:8080 so the service worker and the share sheet can be tested. |
| `package.json` | npm scripts (`test`, `test:min`, `build`, `size`, `serve`, `test:e2e`, `lh`) and optional dev dependencies. |
| `playwright.config.js`, `tests/e2e/` | Optional Playwright smoke test on a mobile viewport; not run in CI. |
| `.github/dependabot.yml` | Weekly GitHub Actions updates and monthly npm updates. |
| `tests/` | Node test suites (`node tests/run-all.js`, add `--min` for the minified build). |
| `.github/workflows/ci.yml` | Rebuilds, fails on a stale build and runs both test suites on every push/PR. |
| `CHANGELOG.md` | Release notes starting at 1.11.0 (older history in the handoff). |
| `MINIGAMES_HUB_HANDOFF.md` | Internal notes in Italian: architecture, rules that must not change, test list. |

## ⚙️ Tech

- Vanilla JavaScript, no framework: HTML strings rendered into `#app`, inline `onclick` handlers.
- Tailwind CSS compiled **inline** in the file — there is no CDN and no build step to play. New utility classes must be added by hand to the `<style>` block.
- [PeerJS](https://peerjs.com/) 1.5.4 from jsDelivr, used only for the online rooms (public cloud broker; no server of our own).
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT), embedded inline to draw the invite QR without external calls.
- Google Font *Plus Jakarta Sans*.
- `node build-min.js` minifies only the inline JS with terser (`mangle: false`, because function names are referenced by inline handlers) and writes `index.html` + `Minigames Hub.min.html`. Building from a clean LF checkout with terser 5.51.2 is byte-for-byte reproducible; CI rebuilds and fails if the committed build is stale.
- GitHub Actions (`.github/workflows/ci.yml`) runs the rebuild, the stale-build check and both test suites on every push to `main` and on pull requests.
- PWA install and the offline shell are served by `sw.js`; the service worker cache name follows `APP_VERSION`, so each release replaces the old cache. Service workers only run over http(s), not from `file://`.
- Themes are seven CSS-variable sets (`--acc1/--acc2/--acc3` for gradients, `--btn1/--btn2` for buttons) plus a matching page background, switched by `data-theme` on `<html>`; no per-screen styles are duplicated for each theme. Paper adds light-surface overrides for `.glass`, the slate utility classes and inputs. `THEME_BG` also updates the `theme-color` meta tag so the browser/PWA bar follows the theme.
- A custom accent (`S.accent`) sets the same five variables inline on `<html>`; `accentColors()` derives the shades and runs a WCAG contrast loop (`ensureContrast`) so the gradient stays visible on the theme background and button labels stay readable. Removing the accent drops the inline variables and returns to the theme defaults.
- Accessibility preferences are three CSS overrides on `<html>` (`data-text="s|m|l"`, `data-contrast="high"`, `data-motion="off"`), so text size, contrast and animations are changed in one place instead of patching each screen. A `prefers-contrast: more` media query applies the same high-contrast colours automatically.
- Cosmetics use two extra variables per game (`--ga/--gb`) set on `#app` from a single `GAME_ACCENT` map; the same pair feeds the card tile, the top bar and the soft background. Victory confetti is created as temporary DOM nodes and removed after the animation, with no saved state. Avatars start from a name hash and can be overridden per name (`S.avMap`); overrides are saved locally and exchanged through the existing lobby broadcast (`avs`) and join payload (`av`), with no extra server.
- Personal questions live in `S.myQ` (`{ who: string[], pv: {a,b}[] }`), are validated on load/import and are exposed to the games through `whoPool()` and a virtual `PV_DB.mine` pack, so favourites, random and online paths need no special cases.

## 🛠️ Development

```bash
node build-min.js                 # rebuild index.html + Minigames Hub.min.html
node tests/run-all.js             # all suites on the source
node tests/run-all.js --min       # all suites on the minified build
node tools/bump-version.js 1.12.0 # bump version, titles, sw.js and rebuild
node tools/size-report.js         # raw/gzip sizes and inline JS/CSS split
node tools/serve.js               # static server on :8080 for PWA/share tests
```

With `npm install` the same commands are available as `npm test`, `npm run
test:min`, `npm run build`, `npm run size` and `npm run serve`. Two optional
extras need the dev dependencies: `npm run test:e2e` (Playwright smoke test on
a mobile viewport, start `npm run serve` first or let the config do it) and
`npm run lh` (Lighthouse against the local server, while it is running).

Terser must be available (`npm i terser` or `npm i terser --prefix "%TEMP%\mgast"`);
the CI pins 5.51.2 because the build is reproducible with that version.

## ⚠️ Known limits

- The host is authoritative: a modified client or a curious host can see everything, including the roles they are dealing. Real anti-cheat would need a server.
- Online depends on the public PeerJS cloud: if it is down or blocked, rooms do not work.
- The interface language is global per page, not per online player.
- In Names, Things and Cities only the **initial letter** is validated, so a wrong-category answer that starts with the right letter is accepted.
- Custom roles, custom categories and **My questions** are saved in `localStorage` and in the backup file, but not in the cloud. In online games the host picks the questions, so a guest's personal questions are not used unless that guest is hosting.
- Avatars can be overridden per name; the choice is saved locally, included in the backup and broadcast in the lobby, but it is not a cloud profile (a very old client ignores the extra field).
- The built-in question and word databases are intentionally a starting point: the automatic questions are few and cannot know the group, so the app warns once (and keeps a hint in the setup) that the games are at their best with questions written by the players.
- Statistics are **local to the phone**: each device counts its own games, they are not synced between players, and clearing browser data removes them unless a backup was exported. Wins are inferred from the points gained during a game, so manual score edits also affect them.
- A phone that is fully asleep cannot receive messages until it wakes; the deadline-based timers then jump to the correct time instead of drifting. A disconnected player keeps their seat for 60 seconds.
- Nothing is stored in the cloud: rooms, scores and games exist only while the page stays open. The PWA caches the app shell, not a live room; the resume card works on the same phone for up to 2 hours.
- Automated tests run in Node with a mock DOM and a fake PeerJS; camera QR scanning, iOS audio unlock, real-phone networking and the installed-PWA flow still need a manual check.

---

Made for playing with friends. Italian-first, English included. 🇮🇹 🇬🇧
