# Liars Game — Project Plan & Status

> **Rules, server behaviour and the socket protocol live in [docs/SPEC.md](docs/SPEC.md)** —
> the single source of truth. Every change goes **spec → code → this plan** (see `CLAUDE.md`).
> This file tracks status, backlog and history only.

Last updated: 2026-11-08

---

## Overview

Multiplayer bluffing card game for 2–4 players (see SPEC §1).

| Part | Stack | Hosting |
|---|---|---|
| Frontend | React 18 + Vite 5 + Zustand 4, PWA (vite-plugin-pwa) | Netlify — auto-deploys on push to `main` |
| Backend | Node + Express + Socket.IO 4, in-memory state | Render — deployed by GitHub Actions via deploy hook (needs secret, see DEPLOYMENT.md) |
| Tests / CI | `node:test` unit + Socket.IO integration tests | GitHub Actions (backend tests + frontend build) |

---

## Code map

```
backend/src/
  server.js              listener (PORT)
  app.js                 createApp(): Express + Socket.IO, CORS
  config.js              timings: grace periods, auto-play delay (env-overridable)
  game/                  pure game logic — Deck, Player, rules, GameEngine
  events/lobbyEvents.js  create/join/leave/start/list, presence, rejoin
  events/gameEvents.js   game:play, game:callLiar
  events/gameFlow.js     shared progression: liar resolution, round end, victory, turn timer
                         (bots + disconnected auto-play), removal, timed mode
  game/BotBrain.js       bot decisions (pure, unit-tested)
  store/                 lobbyStore, sessionStore (GameEngine per lobby), presenceStore
  utils/                 validate, logger, generateLobbyCode
backend/test/            rules/engine unit tests, socket + presence integration tests

frontend/src/
  App.jsx                routes by status: lobby | playing | won
  store/                 gameStore (game state + stored session), uiStore, socketStore (connection + auto-rejoin)
  hooks/                 useGame (combined), useSocket, useSound, useKeyboardShortcuts, useHapticFeedback
  pages/                 LobbyPage, GamePage
  components/Lobby/      LobbyCreate, LobbyJoin, LobbyBrowse, LobbyRoom
  components/Game/       GameBoard → PokerTable (PlayerSeat, TableCenter, DiscardPile, ScoreStrip,
                         SelfArea → PlayerHand + ActionButtons + RulesModal), RoundTransition,
                         GameTimer, GameWon, DisconnectBanner
  components/Shared/     Header, NetworkStatus, VolumeControl, KeyboardShortcutsHelp
frontend/public/         manifest.json, icons/, assets/cards, assets/sounds
```

---

## Status — what works

- Lobby: create (standard / short / timed), join by code, browse, leave; host transfer.
- Game: private hands, play 1–3 cards, liar call by the next player, reveal animation,
  no-liar round resolution, shared bonus pot, tiebreak, timed mode with countdown.
- Server enforces all turn rules and validates every payload (SPEC §3).
- Reconnection: auto-rejoin on reconnect and page reload, grace periods in lobby and game,
  auto-play for a disconnected current player, late-rejoin sees the result (SPEC §2.1).
- Poker-table UI with card art, sounds + volume, keyboard shortcuts, card hiding, rules modal.
- PWA installable (manifest + icons + service worker).
- Bots for solo play / filling a table; rematch in the same lobby.
- Backend tests (unit, socket integration, presence, bots incl. a full solo game); CI on every push.

---

## Backlog

### UI pass (owner: Lasse)
- [ ] Show the bonus pot (`gameState.bonus` → `useGame().bonus`).
- [ ] Spectator view (`players[].spectator`; status `spectating` is never set — decide if needed).
- [ ] Show disconnected players on their seat (`players[].connected`).
- [ ] Remove CSS left over from deleted components in `AppStyles.css`.
- [ ] Bonus/score reveal: `game:liar:revealed.bonusPaid` is available.

### Gameplay / backend
- [ ] Play-test tiebreak and timed-mode tiebreak end to end with real players.

### Infra
- [ ] Add the `RENDER_DEPLOY_HOOK_URL` secret in GitHub (workflow is ready, see DEPLOYMENT.md)
      and turn Render's own Auto-Deploy off.
- [ ] Free Render instances sleep → first connect can take ~30–60 s. Consider a keep-alive
      ping or a paid instance before play-tests.

---

## Infra notes

- **Netlify** auto-deploys on every push to `main`.
- **Render**: its own "On Commit" never triggered. `.github/workflows/deploy-backend.yml` runs
  the tests and calls a Render Deploy Hook on pushes to `main` touching `backend/` — once the
  `RENDER_DEPLOY_HOOK_URL` secret is set. Until then: Render dashboard → *Manual Deploy*.
- In-memory store: restarting/redeploying Render ends all active games and lobbies.

---

## Changelog

### 2026-11-08 (2)
- **Toasts** replace every `alert()` (`uiStore.showToast` / `toast()`, `components/Shared/Toasts.jsx`);
  `game:autoPlayed` and `player:left` now show a toast. New feature styles live in
  `frontend/src/features.css`, separate from `AppStyles.css`.
- **Round participants** (SPEC §1.2): only players dealt into a round score from it — mid-game
  joiners and restored players no longer get "+1 for others" while sitting out. Turn order now
  uses an unbiased Fisher-Yates shuffle (was `sort(() => Math.random() - 0.5)`).
- **Security: secret rejoin token** (SPEC §2.1). `playerId` is broadcast to everyone, yet it
  was also the only credential for `game:rejoin` — any player could take over another's seat
  and see their hand. Create/join now return a separate secret `token`; rejoin and
  checkRejoin take the token. Leaving on purpose invalidates it. Old stored sessions (without
  a token) simply go back to the menu.
- **Bots** (SPEC §2.2): host adds/removes bots in a waiting lobby (🤖 slot / × in the lobby
  room) for solo play or to fill a table; a human joining a full lobby takes a bot's seat.
  `game/BotBrain.js` decides moves from what the bot's seat can know (card counting odds,
  bonus-weighted liar calls, occasional bluffs); bots act after 1–2.5 s. Host is always a
  human (UI now uses the server's `host`, not `players[0]`); a game with no humans left ends.
  `events/gameFlow.js` now owns liar resolution and the unified turn timer (`scheduleTurn`).
- **Rematch** (SPEC §2.3): a won game sends the lobby back to `waiting` (same code, settings,
  bots, players who stayed) with `lastResult`; `game:won` carries `finalScores` + `rematch`.
  Result screen offers Rematch / Leave; `game:started` is now handled app-wide
  (`hooks/useGlobalGameEvents.js`) so players still on the result screen are dealt in.

### 2026-11-08
- Added `docs/SPEC.md` (source of truth) and `CLAUDE.md` (spec-first workflow).
- **Server-side rule enforcement** (SPEC §3):
  - Removed the unauthenticated `game:nextTurn` event (let anyone skip anyone's turn).
  - `game:callLiar`: only the current player may call; spectators can't.
  - `game:play`: card indices must be 1–3 distinct valid integers, checked before the hand
    is touched (bad requests used to silently delete cards); spectators can't play.
  - Game events must target the socket's own lobby.
  - Validation of names (trimmed, 1–20 chars), lobby codes, game settings, rejoin payloads.
  - Lobby codes are guaranteed unique.
  - Rejoin restores `socket.data.playerName` (disconnect notices showed `undefined`).
- **Rules decisions** (SPEC §1.5, §1.6, §2):
  - Bonus is now **one shared pot**: +1 per no-liar round, a correct call pays +1 + pot,
    pot −1 (min 0) after any call. Replaces the old per-player bonus (which paid the caller
    the *accused's* bonus). Exposed as `gameState.bonus`; `players[].bonusModifier` removed.
  - Final play of a round stays unchallengeable (documented, deliberate).
  - Duplicate names in a lobby are rejected (case-insensitive).
  - `scoreDeltas` now lists every changed player with the real (clamped) change.
  - In-game rules modal text updated to match.
- **Tests & CI:** `cd backend && npm test` (node:test, no extra framework) — unit tests for
  rules/Deck/Player/GameEngine plus Socket.IO integration tests against a real server.
  `server.js` split into `app.js` (`createApp()`) so tests can start it on a random port.
  GitHub Actions runs backend tests + frontend build on every push/PR.
- **Reconnection overhaul + disconnected-player timer** (SPEC §2.1):
  - Server tracks each player's *latest* socket; a stale socket's late disconnect no longer
    starts a grace timer (this kicked actively-playing mobile players after ~2 min).
  - Waiting-lobby disconnects get a 60 s grace period instead of instant removal
    (switching apps to share the code used to silently drop you from the lobby).
  - Disconnected current player: server auto-plays 1 random card after 15 s (`game:autoPlayed`).
  - `lobby:leave` in a running game removes the player immediately (was a ghost that stalled the game).
  - Removal no longer shifts the turn to the wrong player; turn passes to next player with cards.
  - Rejoin works for lobby and game (`phase`), returns settings + `endTime`; removed players
    can come back (dealt in next round); tiebreak spectators stay spectators; finished games
    return `ended + winner` for 10 min. Repeated disconnects no longer stack timers.
  - `connected` flag on players in `lobby:updated` and `gameState`; `lobby:updated` includes `host`.
  - Client: reconnects forever, auto-rejoins on every reconnect **and on page load**, reconnects
    when the tab becomes visible, stays on the game screen while reconnecting (banner instead of
    full-screen "Connecting…"), ack callbacks fail fast while offline, stored session cleared when
    a game ends.
  - Backend refactor: `events/gameFlow.js` (round/turn progression shared by all events),
    `store/presenceStore.js`, `config.js` (timings, overridable via env).
- **PWA & cleanup:**
  - Added PWA icons (`frontend/public/icons/`, source `icon.svg`; 192/512 + maskable,
    apple-touch, favicon). The app was not installable before: every icon was a 404.
  - Removed the missing screenshot entries from the manifest and the duplicate inline
    service-worker registration (the Vite PWA plugin injects `registerSW.js`).
  - Deleted unused components (CardDisplay, CardVisibilityToggle, Modal, PlayHistory,
    PlayerPanel, ScoreBoard, SoundToggle), the no-op swipe hook, `ICON_SETUP.html`, and the
    unused `axios` / `redis` dependencies. Their CSS in `AppStyles.css` is left for the UI pass.
  - Bonus pot, spectator and connection state are available to the UI via the store
    (`bonus`, `players[].spectator`, `players[].connected`) — display is part of the UI pass.
- **Docs rewrite:** README, DEPLOYMENT, PRODUCTION_CHECKLIST, sub-READMEs and env examples now
  match the code; this plan is status/backlog/changelog only, rules live in SPEC.
  `CORS_ORIGIN` now really accepts a comma-separated list (and also applies to Express).
- **Backend auto-deploy:** `deploy-backend.yml` (tests → Render Deploy Hook) on push to `main`.
