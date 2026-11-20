# Changelog

`APP_VERSION` in `Minigames Hub.html` is the single source of truth for the
release number; `sw.js` must follow it. Older history (1.2–1.5) is described in
`MINIGAMES_HUB_HANDOFF.md`.

## 1.24.0 — 2026-11-20

### Changed
- **New app icon** — the theater mask is replaced by a tilted white die with
  three violet pips, a violet-to-night gradient and a small sparkle. It is
  drawn procedurally in `tools/make-icons.js` (no dependencies) and mirrored in
  `icons/icon.svg`, so the favicon and the PWA icons match.
- **Favicon** — the tab icon now points to `icons/icon.svg` instead of the
  inline mask emoji.
- Minified build: 460,671 bytes; source: 563,037 bytes.

### Tests
- `pwa.test.js` at 38 checks: the SVG carries the die gradient, tilt and pips,
  and the page links it as favicon. 13/13 suites green on source and minified
  build. Playwright: 3/3 passed locally.

## 1.23.0 — 2026-11-19

### Added
- **Achievement toast** — `achToast` compares the unlocked badges with a
  baseline taken at launch and shows the new ones once in a small bottom toast
  (`showAchToast`), with icon, name and a role for screen readers. The baseline
  and the toast respect the reduced-motion setting.
- **Game-night line in the poster** — the shared image adds the current game
  night progress and leader (`resultTourLine`) when the result belongs to a
  queue, without changing the rest of the layout.
- **Dialog entrance and theme cross-fade** — `modalOpen` replays a short rise
  animation and switching theme now cross-fades the page background and glass
  surfaces; both stop with animations off.

### Changed
- Minified build: 460,640 bytes; source: 562,993 bytes.

### Tests
- `features.test.js` at 339 checks: poster game-night line, achievement
  baseline and de-duplication, toast content, CSS hooks for the dialog, toast and
  theme transition. 13/13 suites green on source and minified build. Playwright:
  3/3 passed locally.

## 1.22.0 — 2026-11-19

### Added
- **Turn wheel** — a `conic-gradient` wheel on the setup screen picks who
  starts with `crypto` randomness (`spinTurn`), keeps a cumulative rotation and
  shows the result when the spin ends; it is instant with animations off.
- **Player card** — tapping a name in the statistics table opens `showPlayer`
  with wins, games, best streak and a bar per game. Wins per game are stored in
  the new `stats.pgw` counters, saved with the rest and validated on import.

### Changed
- The setup screen pairs the wheel with the share-setup button.
- Minified build: 457,604 bytes; source: 559,126 bytes.

### Tests
- `features.test.js` at 330 checks: wheel names, random bounds, rotation and
  delayed result, per-game win counting, player summary, modal content, safe
  names with apostrophes and `pgw` validation. 13/13 suites green on source and
  minified build. Playwright: 3/3 passed locally.

## 1.21.0 — 2026-11-19

### Added
- **Game night** — a queue of offline games (3 or 5 from the home card) with one cumulative
  standings table. `S.tour` keeps the plan, the current index and the points per
  player; `tourCredit` adds the points of the game that just ended only when it
  matches the planned one, `tourRank` sorts the table, `tourSummaryBlock` shows
  the progress in the end-of-game summary and the home card offers to start,
  resume or see the final standings. The state is saved with the rest and
  validated by `sanitizeTour` on import.
- **Match history** — `showHistory` lists `stats.recent` with a filter per game
  and **Replay with same players** (`replayHistory`) restores the table and
  opens the setup of that game. Recent entries now also store the players
  (`recent[].p`), validated when the save or a backup is loaded.

### Changed
- The statistics card links to the full history and the end-of-game summary
  gains the game-night block.
- Minified build: 451,329 bytes; source: 551,522 bytes.

### Tests
- `features.test.js` at 318 checks: tour planning, point crediting and
  ordering, summary visibility, final standings, history filtering and replay,
  plus `sanitizeTour` and the new `recent[].p` field. 13/13 suites green on
  source and minified build. Playwright: 3/3 passed locally.

## 1.20.0 — 2026-11-19

### Added
- **Animated theme background** — a fixed `#glow` layer paints three drifting
  halos from the theme accents behind every screen; it stops with the
  reduce-animations setting, high contrast and `prefers-reduced-motion`.
- **Avatar frames** — avatars wear a bronze, silver, gold or legend ring unlocked
  by the player's own wins (1 / 5 / 10) and best streak (3 / 5); the achievement
  card explains the steps. Percentages come from the local statistics.
- **Real podium** — the summary shows the top three on a stepped podium with
  medals above the full ranking, still followed by the share-as-image button.
- **Animated points** — the points gained in a game count up once per result,
  skipped when animations are off.
- **Midnight OLED theme** — a pure-black eighth theme with light lavender
  accents and darker glass surfaces, aimed at saving battery at night.
- **Navigation sounds** — a very short click on buttons that follows the sound
  pack and volume; it has its own switch in the settings and is skipped on
  keyboard shortcuts that fire twice.

### Changed
- **Setup → play** now turns like a card (`card-flip`) instead of the plain
  screen fade.
- **3D tilt** on the game cards with a precise pointer (desktop); touch devices
  never get the effect and it is disabled with animations off.
- Minified build: 442,087 bytes; source: 540,663 bytes.

### Tests
- `features.test.js` at 302 checks, including the new theme, frames, podium,
  counters, sound switch, card flip and tilt hooks. 13/13 suites green on source
  and minified build. Playwright: 3/3 passed locally.

## 1.19.0 — 2026-11-19

### Added
- **Wins per game** — the statistics chart now also shows wins for each game
  through a new `wby` counter, saved with the rest of the stats and validated on
  import.
- **Share the setup** — the setup screen offers a QR/link (`#setup=`) that
  carries the game, the player names, quick mode and the default timer, so a
  second phone starts from the same table. Roles and categories stay local.
- **Explicit reconnection** — the retry screen shows the attempt number and a
  “Retry now” button that drops the stuck connection and reconnects at once.
- **Correct/wrong haptics** — marking an answer in Names, Things and Cities and
  resolving Who Am I? or Forbidden Words now vibrates with the distinct
  correct/wrong patterns that were already defined.
- **1200×630 Open Graph card** — `icons/og.png` is generated by
  `tools/make-og.js` (no dependencies) and the meta tags declare type, size and
  `summary_large_image`.

### Changed
- Browser tooling now runs in CI: a Playwright job (smoke plus screenshot diff
  within the same run, so no cross-OS baselines) and a Lighthouse job with score
  and resource-size budgets (`lighthouserc.json`).
- `package.json` gained `icons`; dependencies are pinned by `package-lock.json`
  and the CI installs with `npm ci`.
- Minified build: 435,506 bytes; source: 531,555 bytes.

### Tests
- New `tests/timers.test.js` with a fake clock covers `netTry` retries,
  `netSettle`, `netRecover` delays and the manual retry (17 checks).
- `features.test.js` at 286 checks; 13/13 suites green on source and minified
  build. Playwright: 3/3 passed locally. Lighthouse: 100 accessibility,
  best-practices and SEO on the local build.

## 1.18.0 — 2026-11-18

### Added
- **Keyboard-friendly dialogs** — focus stays inside the open dialog with Tab and
  Shift+Tab, Escape closes it and the focus returns to the button that opened
  it.
- **npm scripts and a local server** — `package.json` exposes `test`, `test:min`,
  `build`, `size`, `serve` and `lh`; `tools/serve.js` is a dependency-free
  static server so the service worker and the share sheet can be tried over
  http.
- **Optional browser tooling** — a Playwright smoke test (`tests/e2e/`) drives
  home, the daily challenge, settings and mix mode on a mobile viewport, and a
  Lighthouse command is documented. Neither is part of CI.
- **Dependabot** — weekly updates for GitHub Actions and monthly for npm.

### Changed
- Minified build: 430,955 bytes; source: 525,867 bytes.

### Tests
- `features.test.js` at 262 checks; 12/12 suites green on source and minified
  build.

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
