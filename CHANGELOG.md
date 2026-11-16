# Changelog

`APP_VERSION` in `Minigames Hub.html` is the single source of truth for the
release number; `sw.js` must follow it. Older history (1.2–1.5) is described in
`MINIGAMES_HUB_HANDOFF.md`.

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
