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
| 🤔 **Would You Rather…** | Preferiresti… | The host types two options; everyone votes in secret and the majority scores. | Pass & Play · Online |
| 🐺 **Werewolf** | Lupus in Fabula | Full narrator-less game (roles, night phase, stake, win conditions) or quick mode with roles only. | Pass & Play · Online |
| 📝 **Names, Things and Cities** | Nomi, Cose e Città | A letter plus chosen categories; everyone types answers on their own phone. | **Online only** |

## ✨ Features

- **Pass & Play or Online** — one device in the middle of the table, or a P2P room (PeerJS) without creating an account.
- **Host migration** — if the host's phone drops, another player takes over and the game continues from the same point; the original host can rejoin with the room code.
- **Fast recovery** — a client whose connection blips reconnects to the room by itself instead of triggering an election, then asks the host to re-send the current screen (`{t:'sync'}`). Coming back from standby or mobile-data hiccups no longer leaves a stuck or out-of-date screen.
- **Host controls** — the host can end the game at any time (scores are kept) and can close a Names, Things and Cities round before the timer runs out.
- **Bilingual IT / EN** — full interface and question databases in both languages, switchable at any time.
- **Big content pack** — 181 Impostor prompts per language (131 generated + 50 hand-written), 207 Who Said That questions, 8 Mister White word categories (93 clusters, 676 words), 15 Werewolf roles (plus custom quick-game roles), all with English counterparts.
- **Automatic scoring** — +100 to the winners of Impostor / Mister White / Who Said That, +100 (or +50 on a tie) in Would You Rather, +10/+5/0 for unique/duplicate/invalid answers in Names, Things and Cities. Werewolf uses a full ×10 point table.
- **Auto round timer** (Names, Things and Cities) — starts at 5 minutes, every submission cuts 1 minute (minimum 1); at zero the round closes and unanswered players score 0.
- **Deadline-based timers** — every clock stores an absolute end time and recomputes on `visibilitychange`, so background tabs and phone standby do not make the count drift; the round timer is also sent with its end time, so each phone counts down locally.
- **Optional discussion timer** — a manual corner clock for the other games. It never blocks or skips a turn.
- **Input sanitising** — names, answers, clues, custom categories and options are trimmed, stripped of control/invisible characters and capped by code point, so long or emoji-heavy input cannot break the layout or the scoring.
- **Local saves** — players, scores, language, name and last room code stay in `localStorage`.
- **Accessibility details** — `aria-label` on icon-only buttons, `aria-pressed` on language toggles.

## 🕹 How to play

1. Open <https://zhenwang21.github.io/minigames-hub/> on your phone.
2. **Pass & Play:** add the players, pick a game, pass the phone when asked.
   **Online:** tap **Online**, create a room (5-character code) or join one, then the host starts a game.
3. Play. Scores are kept by the app; the 🏆 button shows the table.

Online needs 3 players (Werewolf 4, Would You Rather and Names, Things and Cities 2). Rooms are compatible only between phones running the same build (`APP_VERSION` in the source); if a phone is stuck on an old cached copy, reload the page.

## 📁 Repository layout

| File | Purpose |
| --- | --- |
| `index.html` | Published build (minified). This is what GitHub Pages serves. |
| `Minigames Hub.html` | Source of truth, readable and formatted. Edit this one. |
| `Minigames Hub.min.html` | Same build as `index.html`, kept with an explicit name for offline sharing. |
| `build-min.js` | `node build-min.js` regenerates both builds from the source (needs [terser](https://terser.org/)). |
| `MINIGAMES_HUB_HANDOFF.md` | Internal notes in Italian: architecture, rules that must not change, test list. |

## ⚙️ Tech

- Vanilla JavaScript, no framework: HTML strings rendered into `#app`, inline `onclick` handlers.
- Tailwind CSS compiled **inline** in the file — there is no CDN and no build step to play. New utility classes must be added by hand to the `<style>` block.
- [PeerJS](https://peerjs.com/) 1.5.4 from jsDelivr, used only for the online rooms (public cloud broker; no server of our own).
- Google Font *Plus Jakarta Sans*.
- `node build-min.js` minifies only the inline JS with terser (`mangle: false`, because function names are referenced by inline handlers) and writes `index.html` + `Minigames Hub.min.html`.

## ⚠️ Known limits

- The host is authoritative: a modified client or a curious host can see everything, including the roles they are dealing. Real anti-cheat would need a server.
- Online depends on the public PeerJS cloud: if it is down or blocked, rooms do not work.
- The interface language is global per page, not per online player.
- In Names, Things and Cities only the **initial letter** is validated, so a wrong-category answer that starts with the right letter is accepted.
- Custom roles and custom categories live only in memory (they disappear on reload).
- A phone that is fully asleep cannot receive messages until it wakes; the deadline-based timers then jump to the correct time instead of drifting.
- Nothing is stored in the cloud: rooms, scores and games exist only while the page stays open.

---

Made for playing with friends. Italian-first, English included. 🇮🇹 🇬🇧
