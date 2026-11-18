# Changelog

`APP_VERSION` in `Minigames Hub.html` is the single source of truth for the
release number; `sw.js` must follow it. Older history (1.2–1.5) is described in
`MINIGAMES_HUB_HANDOFF.md`.

## 1.17.0 — 2026-11-18

### Added
- **Daily challenge** — the home screen suggests a deterministic game for the
  local day, marks it done when that game appears in the recent results and
  counts consecutive days; the button opens its setup.
- **Mix mode** — one button picks a random offline-playable game that fits the
  players currently in the list and opens its setup.
- **Statistics charts** — settings show a bar per game and a seven-day activity
  chart built from the local statistics, without libraries or extra data.
- **Achievements** — nine badges derived from wins, streaks, total games, games
  played across the catalogue and late-night sessions; earned ones are
  highlighted and the card shows how many are unlocked.

### Changed
- Minified build: 429,988 bytes; source: 524,604 bytes.

### Tests
- `features.test.js` at 255 checks; 12/12 suites green on source and minified
  build.

## 1.16.0 — 2026-11-18

### Added
- **Host hand-over** — the host can give control to another connected player from
  the lobby; the new host receives the room state, the others follow it and the
  old host becomes a normal client on the same connection.
- **Player order** — the host can move players up or down in the lobby; the
  player list and the join/turn order change together for every phone.
- **Optional room PIN** — the host can set a 4-digit PIN (or remove it); joiners
  need the PIN and invited links carry it as `#room=CODE&pin=1234`. It is a
  guard against accidental entries, not a security boundary, and it travels
  with snapshots when control changes.
- **QR options** — the invite sheet can switch between a small and a large QR
  and download it as an SVG.
- **Offline banner in the lobby** — the plain lobby now lists offline players,
  matching what the in-game view already showed.

### Changed
- Minified build: 424,049 bytes; source: 517,431 bytes.

### Tests
- `features.test.js` at 240 checks; 12/12 suites green on source and minified
  build.

## 1.15.0 — 2026-11-18

### Added
- **Shareable result image** — the summary gains an image button that draws a
  1080×1080 PNG on a canvas (winner, top rows, theme colours) and opens the
  system share sheet or downloads the file. Nothing is uploaded and the text
  summary stays as a fallback.
- **PWA shortcuts** — long-pressing the installed icon offers Impostor,
  Werewolf and Would You Rather; `#game=<id>` deep links open the right setup
  directly, while `#room=` invites keep working.
- **Screen wake lock** — while a discussion or online round timer is running the
  app asks the browser to keep the screen on, releases it when the timer stops
  and asks again when the page comes back to the foreground.
- **Link previews** — description, Open Graph and Twitter meta tags so shared
  links show a proper title, text and icon.
- **Privacy page** — a short in-app explanation of what stays on the phone, what
  the online room shares, the absence of tracking and how backups work.

### Changed
- Minified build: 418,994 bytes; source: 511,143 bytes.

### Tests
- `features.test.js` at 226 checks; 12/12 suites green on source and minified
  build.

## 1.14.0 — 2026-11-17

### Added
- **Sound packs** — Soft, Arcade and Chimes change the timbre, note spacing and
  duration of the victory chime and timer beeps, with a preview button.
- **Volume slider** — 0–100% on top of the on/off switch; at zero the app stays
  silent without touching the saved choice.
- **Haptics** — short, distinct vibration patterns for revealing a card,
  correct/wrong answers, the 10-second warning, time-up and a win, all gated by
  the existing vibration switch.
- **Timer beeps** — one short beep and vibration at 10 seconds and a fuller
  triple beep at zero, both for the discussion timer and the online round timer;
  adding a minute re-arms the warning.

### Changed
- Settings now group sound, sound pack, volume and vibration together; sound
  pack and volume are saved locally and included in the backup.
- Minified build: 412,370 bytes; source: 502,743 bytes.

### Tests
- `features.test.js` at 212 checks; 12/12 suites green on source and minified
  build.

## 1.13.0 — 2026-11-17

### Added
- **Paper theme** — a light theme (cream surfaces, dark text, its own
  `theme-color`) for bright rooms, with contrast-checked accents.
- **Theme previews** — settings show a mini gradient card per theme instead of a
  single dot, so the six presets plus Paper are visible before choosing.
- **Rounded font** — switch between the standard system font and a rounded
  variant, with no extra download, saved locally and in the backup.
- **Custom accent** — pick any colour; the app derives the gradient and button
  colours and raises their contrast automatically (at least 3:1 on dark themes,
  4.5:1 on Paper, white text on buttons kept readable). A reset returns to the
  theme accent.
- **Host crown and streak flame** — the host's avatar in the online lobby gets a
  gold ring, and players on a two-or-more winning streak get a 🔥 badge in the
  summary. The summary winner's avatar also gets a green ring.
- **Per-game confetti** — stars for Werewolf and Who Am I?, dots for Names,
  Things and Cities and Forbidden Words, classic confetti otherwise.
- **Screen and logo motion** — a short fade/slide when the screen changes and a
  slow shine on the logo, both disabled by the reduce-animations setting or
  `prefers-reduced-motion`.

### Changed
- Minified build: 409,027 bytes; source: 498,418 bytes.

### Tests
- `features.test.js` at 197 checks; 12/12 suites green on source and minified
  build.

## 1.12.0 — 2026-11-17

### Added
- **Victory confetti** — a short CSS-only burst when the end-of-game summary
  appears. It fires once per result, never writes any state and stays off when
  reduced motion is enabled on the phone or in the system settings.
- **Theme backgrounds** — each of the six accent themes now also tints the page
  background (Ocean, Sunset, Forest, Neon, Ice) instead of only the gradients.
  The browser/PWA `theme-color` follows the selected theme.
- **Podium bars** — the top three rows of the summary get a gold, silver and
  bronze inset bar.

### Changed
- Minified build: 400,858 bytes; source: 488,283 bytes.

### Tests
- `features.test.js` at 175 checks; 12/12 suites green on source and minified
  build.

## 1.11.1 — 2026-11-16

### Fixed
- **Host re-election race** — when the host disappeared, a client could skip a
  higher-priority candidate that had not noticed the loss yet and promote itself,
  leaving two hosts in the room. Candidates that close the connection immediately
  are now retried, a client that is already recovering accepts the incoming
  election instead of refusing it, and before self-promoting every client makes a
  final check on the room code. The later host elections in `online.test.js` are
  now stable (52 consecutive runs).

### Changed
- Minified build: 398,400 bytes.

### Tests
- The timer tick in `online.test.js` now waits for the actual value instead of a
  fixed 1200 ms, which was flaky on loaded runners.
- `tests/run-all.js` emits `::error` annotations when a suite fails, so the
  failing suite is visible even when job logs are not downloadable.
- CI on GitHub Actions is green on both the source and the minified build.

## 1.11.0 — 2026-11-16

### Added
- **Player management** — rename a player inline (score and avatar follow the new
  name, duplicate names are refused) and undo the last removal from the setup list.
- **Recent games and CSV** — the settings card lists the last 20 finished games
  with their winners and can export the per-player table as CSV (UTF-8 BOM, so
  Excel opens it correctly).
- **Backup merge or replace** — importing a JSON backup now shows its version,
  date and counts first. *Merge* adds players, scores, statistics, roles,
  categories, questions and avatars without touching the phone settings;
  *Replace* restores the backup as before. A backup from another app version is
  flagged.
- **Shared host notes** — “Share with everyone” sends the host note read-only to
  every phone in the room; guests see a dismissible banner.
- **My questions** — custom questions for Who Said That? (one per line) and Would
  You Rather (`A | B` pairs), used alongside the built-in ones and exposed as the
  virtual “Mine” pack. Saved locally and in the backup.
- **Chosen avatars** — tap an avatar in the setup list or in the lobby to pick a
  different emoji; the choice is saved per name, included in the backup, sent in
  the join payload and redistributed by the lobby.
- **Cosmetics** — soft per-game radial background, 🥇🥈🥉 podium in the summary,
  Neon and Ice themes, flip-in reveal animation for role/word cards, explicit
  Taboo team colours and a per-game three-note victory chime (follows the sound
  switch).
- **Accessibility** — `prefers-contrast: more` applies the same colours as the
  manual high-contrast mode.

### Changed
- Online host-election and reconnect timeouts in the test suite were raised
  (20 s → 30 s, 8 s → 12 s) to avoid false negatives under load.
- Minified build: 398,031 bytes.

### Tests
- `features.test.js` at 164 checks; 12/12 suites green on source and minified
  build.

## 1.10.0 — 2026-11-16

### Added
- **Per-game identity** — a two-colour accent per game on the home tile, a thin
  bar during setup/play and a soft background, independent of the theme.
- **Player avatars** — a stable emoji and colour derived from each name in the
  setup list, lobby, score table and summary.
- **Victory effect** — the winner pulses in the summary, respecting reduced
  motion.

### Tests
- `features.test.js` at 128 checks; 12/12 suites green.

## 1.9.0 — 2026-11-15

### Added
- **Welcome and demo** — a short intro card for newcomers plus a Preferiresti
  demo that never writes players, scores or statistics.
- **End-of-game summary** — winner, standings, points gained, share and rematch.
- **Question-quality notice** — the built-in databases are a starting point;
  the notice can be dismissed permanently and reopened from the settings.
- **Remembered preferences** — mode, roles, categories, pack, timer, seen
  questions, accessibility and host notes.
- **Accessibility** — adjustable text size, high contrast and reduced animations.
- **Install and offline** — install button, offline badge, storage usage, backup
  reminder and local-data clearing.
- **Host tools** — private host note and timer pause.

### Tests
- `features.test.js` at 115 checks, `pwa.test.js` at 36; 12/12 suites green.

## 1.8.0

### Added
- Settings panel with sound, vibration, themes, statistics and reset.
- Four CSS-variable themes.
- Local statistics based on the points gained during a game (wins, streaks,
  most played game).
- Replay from the lobby, new-version banner, accessible modals and live-region
  announcements.

## 1.7.0

### Added
- Installable PWA (manifest, service worker, icons), offline shell.
- Resume after reload or standby for both host and guest (2-hour session).
- Clearer lobby with online dots, host badge, copy-code and version.
- Shareable end-of-game summary.

## 1.6.0

### Added
- Invite QR code and `#room=CODE` link.
- JSON backup and restore, score correction and undo last round.
- Ready-made Would You Rather packs.
- Names, Things and Cities host review step.
- Forbidden Words and Who Am I? (online only).
- 60-second offline seat reservation, accessibility pass and iOS audio unlock.
