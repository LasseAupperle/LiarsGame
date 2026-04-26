# Liars Game - Project Plan

**IMPORTANT: Keep this file up to date as work progresses. Update status after every session.**

---

## Project Overview

**Liars Game** is a multiplayer card bluffing game (2–4 players). Players claim to play the "table card" but may be lying. The next player in turn can challenge with "Call Liar." First to 20+ points with the highest score wins.

**Tech Stack:**
- Frontend: React + Vite + PWA → **Netlify** (auto-deploys on push to main)
- Backend: Node.js + Express + Socket.IO → **Render** (⚠️ does NOT auto-deploy — manual deploy required after every backend change)
- State: Zustand v4
- In-memory sessions (no database)

**Live:**
- Frontend: Netlify (auto on push)
- Backend: Render (manual deploy — "On Commit" setting does not work)

---

## Game Rules

### Cards
- 1 = Ace (6×), 2 = King (6×), 3 = Queen (6×), 4 = Joker (2×)
- 20 cards total. Joker always counts as the table card.

### Each Round
1. Table card chosen at random (Ace, King, or Queen)
2. Each active player dealt 5 cards
3. Turn order randomized

### Each Turn
- Current player plays 1–3 cards face-down, claims they are all the table card
- **Only the next player in turn order** can Call Liar OR play their own cards
- Players with empty hands are automatically skipped
- All other players wait

### Liar Call Resolution
| Outcome | Accused | Caller | Others |
|---------|---------|--------|--------|
| Liar correct (was bluffing) | −1 | +1 + bonus | +1 |
| Liar wrong (was truthful) | +1 | −1 | +1 |

### No Liar Call (all players empty hands, no challenge)
- All active players +1 pt, bonus modifier +1 each
- New round begins automatically

### Bonus Modifier
- Starts at 0. Increases +1 each round with no liar call.
- Resets to max(0, current−1) after any liar call.
- Added to caller's score on a successful liar call.

### Winning
- First to ≥20 pts with highest score wins
- Tie-break: only top scorers stay active, others spectate — until one pulls ahead

---

## File Structure (Current)

```
LiarsGame/
├── frontend/src/
│   ├── components/
│   │   ├── Lobby/
│   │   │   ├── LobbyCreate.jsx       ✅
│   │   │   ├── LobbyJoin.jsx         ✅
│   │   │   ├── LobbyRoom.jsx         ✅ (redesigned: avatars, crown, copyable code)
│   │   │   └── LobbyBrowse.jsx       ✅ (5s timeout, error state)
│   │   ├── Game/
│   │   │   ├── GameBoard.jsx         ✅ (vertical layout)
│   │   │   ├── PlayerHand.jsx        ✅ (face-down toggle)
│   │   │   ├── PlayerPanel.jsx       ✅ (leaderboard: all players sorted by score)
│   │   │   ├── CardDisplay.jsx       ✅ (table card banner always visible)
│   │   │   ├── ActionButtons.jsx     ✅ (correct liar/play logic)
│   │   │   ├── PlayHistory.jsx       ✅ (scrollable play log)
│   │   │   ├── CardVisibilityToggle.jsx ✅
│   │   │   ├── DisconnectBanner.jsx  ✅
│   │   │   ├── RulesModal.jsx        ✅ (? button opens full rules)
│   │   │   └── GameWon.jsx           ✅
│   │   └── Shared/
│   │       ├── Header.jsx            ✅ (turn indicator: "Your turn" / "Bob's turn")
│   │       ├── ScoreBoard.jsx        ✅ (exists, not in active layout)
│   │       ├── NetworkStatus.jsx     ✅
│   │       ├── SoundToggle.jsx       ✅
│   │       └── KeyboardShortcutsHelp.jsx ✅
│   ├── store/
│   │   ├── gameStore.js              ✅
│   │   ├── uiStore.js                ✅ (cardsHidden, soundEnabled, disconnectedPlayers)
│   │   └── socketStore.js            ✅ (game:rejoin on reconnect)
│   ├── hooks/
│   │   ├── useGame.js                ✅
│   │   ├── useSocket.js              ✅
│   │   ├── useSound.js               ✅
│   │   ├── useKeyboardShortcuts.js   ✅
│   │   ├── useTouchGestures.js       ✅
│   │   └── useHapticFeedback.js      ✅
│   ├── App.jsx                       ✅
│   └── AppStyles.css                 ✅
├── backend/src/
│   ├── server.js                     ✅
│   ├── game/
│   │   ├── GameEngine.js             ✅ (callLiar uses playHistory for accused, nextTurn skips empty hands, resolveNoLiarCall)
│   │   ├── Player.js                 ✅
│   │   ├── Deck.js                   ✅
│   │   └── rules.js                  ✅
│   ├── store/
│   │   ├── lobbyStore.js             ✅
│   │   └── sessionStore.js           ✅
│   └── events/
│       ├── lobbyEvents.js            ✅ (disconnectTimers, game:rejoin, lobby:list)
│       └── gameEvents.js             ✅ (allHandsEmpty check after each play → resolveNoLiarCall + new round)
└── PROJECT_PLAN.md (this file)
```

---

## Keyboard Shortcuts (PC)

| Key | Action | Condition |
|-----|--------|-----------|
| 1–9 | Select card by position | Always |
| Enter | Play selected cards | Your turn |
| L | Call Liar | Your turn + history exists |
| H | Hide/show your cards | Always |
| S | Toggle sound | Always |
| C | Copy lobby code | Always |

---

## What Works ✅

- Lobby: create, join by code, browse open lobbies, leave
- LobbyRoom: avatar circles, host crown, empty slots, copyable code block
- Start game: host starts, all players navigate to game board
- Cards dealt privately per player (game:hand events)
- Playing cards: select 1–3, play, history updates
- Call Liar: only current player can call (when there's a prior play); accused identified from playHistory, not turn order
- Empty hand skip: players with 0 cards are automatically skipped in nextTurn()
- No-liar-call resolution: when all hands empty → +1 all, bonus +1, new round auto-starts
- Table card banner visible at all times in CardDisplay
- Play history: scrollable log, auto-scrolls to bottom
- Leaderboard in PlayerPanel: all players ranked by score
- Turn indicator in Header: "Your turn" / "[Name]'s turn"
- Rules modal: ? button, full rules explained
- Card visibility toggle: H key or button, blurs your cards
- Sound toggle: S key or button
- Disconnect handling: 30s grace period, rejoin flow, DisconnectBanner
- Stale card selection cleared on new hand and after successful play
- Mobile-first vertical layout
- PWA installable

---

## Known Issues / Pending Work

### High Priority
- [x] **"Cannot call liar on yourself" bug**: Fixed — callLiar identifies accused from playHistory.last (not currentPlayerIndex, which advanced to caller after nextTurn)
- [x] **No round resolution when all cards played**: Fixed — gameEvents.js checks allHandsEmpty after each play → resolveNoLiarCall() (+1 all, bonus +1) → new round
- [x] **Empty hand skip**: Fixed — nextTurn() loops past players with hand.length === 0; liar call still correctly targets last player who actually played (via playHistory)
- [ ] **Tie-break**: Not yet tested. Logic exists in GameEngine.isVictoryConditionMet() but needs play-through.
- [ ] **Win condition**: game:won event flow needs end-to-end test.

### Medium Priority
- [ ] **Bonus modifier display**: Not shown to players during game (ScoreBoard.jsx exists but removed from layout). Consider adding bonus to leaderboard row or CardDisplay.
- [ ] **Sound effects**: Audio files not populated (`/public/assets/sounds/`). useSound.js is wired but files missing → silent.
- [ ] **Card images**: No actual card art. Cards shown as text/numbers only.

### Low Priority / Nice to Have
- [ ] **Spectator mode**: Tie-break spectators handled in backend but frontend shows no spectator-specific UI.
- [ ] **Lobby host transfer**: If host disconnects in lobby, no one can start game.
- [ ] **Render auto-deploy**: "On Commit" setting broken — must manually deploy after backend changes.

---

## Infra Notes

- **Netlify** auto-deploys on every push to main. Frontend changes go live automatically.
- **Render** does NOT auto-deploy despite "On Commit" setting. After any backend change: go to Render dashboard → manual deploy.
- In-memory store: restarting Render clears all active sessions and lobbies.
