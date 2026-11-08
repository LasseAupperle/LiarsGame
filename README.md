# Liars Game 🃏

Real-time multiplayer bluffing card game for 2–4 players — React + Vite PWA frontend,
Node + Socket.IO backend.

| Doc | What's in it |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | **Source of truth**: rules, server behaviour, socket protocol |
| [PROJECT_PLAN.md](PROJECT_PLAN.md) | Status, code map, backlog, changelog |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Netlify + Render setup |
| [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) | Pre-release checks |
| [CLAUDE.md](CLAUDE.md) | Working agreement (spec-first workflow) |

## The game in 30 seconds

Each round a **table card** (Ace, King or Queen) is drawn and everyone gets 5 cards from a
20-card deck (6 Aces, 6 Kings, 6 Queens, 2 Jokers — Jokers are wild). On your turn you play
1–3 cards face-down and claim they're all the table card — or, if you don't believe the
previous player, **call Liar**. Wrong calls cost you; right calls pay +1 plus the shared
bonus pot. First to 20 (10 in Short mode) as sole leader wins; Timed mode ends on the clock.
Full rules: [SPEC §1](docs/SPEC.md#1-game-rules).

## Quick start

Requires Node 18+ (CI uses 22).

```bash
cd backend && npm install && npm run dev     # http://localhost:3000
```

```bash
cd frontend && npm install && npm run dev    # http://localhost:5173
```

The frontend connects to `VITE_API_URL` (default `http://localhost:3000`).
Open two browser windows (or a private window) to play against yourself.

## Tests & build

```bash
cd backend && npm test        # unit + Socket.IO integration tests
```

```bash
cd frontend && npm run build  # production build into frontend/dist
```

CI (GitHub Actions) runs both on every push and pull request.

## Controls

| Key | Action |
|---|---|
| 1–5 | Select / deselect card by position |
| Enter | Play selected cards (your turn) |
| L | Call Liar (your turn, after a play) |
| H | Hide / show your cards |
| S | Toggle sound |
| C | Copy lobby code |

On mobile: tap cards to select; haptic feedback where supported.

## Features

- Lobbies with 5-character codes; Standard (20 pts), Short (10 pts) and Timed modes
- Join a running game (dealt in from the next round)
- Server-authoritative rules — every action is validated server-side
- Robust reconnection: auto-rejoin after network drops and page reloads, grace periods,
  auto-play for disconnected players so the game never stalls
- Installable PWA, card art, sound effects with volume control
