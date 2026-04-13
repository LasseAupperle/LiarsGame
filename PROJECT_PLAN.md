# Liars Game - Complete Implementation Plan

## Project Overview
**Liars Game** is a multiplayer card game (2-4 players) where players claim to play winning cards but may be lying. Other players call "liar" to challenge them. The game tracks scores and continues until one player reaches 20+ points with the highest score.

**Tech Stack:**
- Frontend: React + Vite + PWA
- Backend: Node.js + Express + Socket.IO
- Hosting: Netlify (frontend), Railway/Render (backend)
- Database: Redis (session/game state) or in-memory with persistence

---

# PHASE 0: SETUP & PREPARATION (No coding yet)

All setup tasks must be completed before Phase 1 development begins.

## 0.1 GitHub Repository Setup

- [ ] Create GitHub repo: `LiarsGameSteal` (if not exists)
- [ ] Add `.gitignore` (Node.js + React template)
- [ ] Create `.env.example` with template variables for both frontend & backend
- [ ] Folder structure:
  ```
  LiarsGameSteal/
  ├── frontend/                 (React + Vite)
  ├── backend/                  (Node.js + Express)
  ├── docs/
  ├── .gitignore
  ├── README.md
  └── PROJECT_PLAN.md (this file)
  ```

## 0.2 Frontend Hosting (Netlify)

- [ ] Connect GitHub repo to Netlify
- [ ] Configure build command: `cd frontend && npm run build`
- [ ] Set publish directory: `frontend/dist`
- [ ] Set environment variables in Netlify dashboard:
  - `VITE_API_URL` = backend URL (Railway/Render)
- [ ] Enable automatic deployments on main branch push

## 0.3 Backend Hosting (Railway or Render)

- [ ] Create account on **Railway.app** OR **Render.com**
- [ ] (Wait for Phase 1 to create backend repo, but register account now)
- [ ] Plan environment variables:
  - `NODE_ENV=production`
  - `PORT=8000` (or auto-assigned)
  - `REDIS_URL` (if using Redis) or use in-memory
  - `CORS_ORIGIN=https://your-netlify-domain.netlify.app`

## 0.4 Database Decision

**Recommendation:** Start with **in-memory game sessions** (no persistence) + **Redis for lobby codes** (if available).

- [ ] Decide: Railway Redis addon OR in-memory only
- [ ] If Redis: Set up on Railway/Render (usually one-click addon)

## 0.5 Asset Downloads

### Card Deck (Free PNG/SVG)
Download one of these free poker/playing card decks:
1. **Best option:** [OpenGameArt - Standard Playing Cards](https://opengameart.org/content/standard-playing-cards)
   - Classic appearance, clean design
   - Format: PNG or SVG, very suitable for web
2. Alternative: [Pixelated Playing Cards](https://kenney.nl/assets/playing-cards-pack)

**Download location:** `frontend/public/assets/cards/`

**Folder structure:**
```
frontend/public/assets/cards/
├── Ace.png (or .svg)
├── King.png
├── Queen.png
├── Joker.png
```

For card rendering, you'll need **card images or a spritesheet**. The deck should include:
- 6× Ace
- 6× King
- 6× Queen
- 2× Joker

### Sound Effects (Free)
Download from **Freesound.org**, **Zapsplat.com**, or **Pixabay.com**:

Needed sounds:
- `card-place.mp3` - playing a card (brief, ~200ms)
- `card-flip.mp3` - revealing cards (~300ms)
- `liar-call.mp3` - someone calls liar (attention-grabbing)
- `points-gain.mp3` - winning round (~400ms)
- `points-lose.mp3` - losing round (~400ms)
- `turn-change.mp3` - next player's turn (subtle)
- `game-win.mp3` - game over, someone won (~1s)

**Download location:** `frontend/public/assets/sounds/`

**Keep file sizes small** (compress to 128kbps MP3).

## 0.6 Project Structure & Init

- [ ] Create `frontend/` folder
  - Run: `npm create vite@latest . -- --template react`
  - Install: `npm install axios socket.io-client zustand react-router-dom`
  
- [ ] Create `backend/` folder
  - Run: `npm init -y`
  - Install: `npm install express socket.io cors dotenv redis node-uuid`
  - Install dev: `npm install --save-dev nodemon`

- [ ] Both folders get `.env.example` files

## 0.7 GitHub Initial Commit

- [ ] Commit: "chore: initial project structure and setup"
- [ ] Push to main

---

# PHASE 1: BACKEND - CORE GAME ENGINE

**Goal:** Build server-side game logic, WebSocket events, and lobby management.

Claude Code should have:
- [x] Card deck definition (Ace, King, Queen, Joker quantities)
- [x] Game rules (scoring, liar calls, bonus modifier)
- [x] Terminology (Game, Ronde, Beurt defined above)
- [x] Complete game state structure
- [x] All server-side validation logic

## 1.1 Project Files & Structure

```
backend/
├── src/
│   ├── server.js              - Express + Socket.IO setup
│   ├── game/
│   │   ├── GameEngine.js      - Core game logic (class)
│   │   ├── Player.js          - Player class
│   │   ├── Deck.js            - Card deck & dealing
│   │   └── rules.js           - Validation & scoring rules
│   ├── store/
│   │   ├── lobbyStore.js      - Lobby management (in-memory or Redis)
│   │   └── sessionStore.js    - Active game sessions
│   ├── events/
│   │   ├── gameEvents.js      - Socket.IO event handlers
│   │   └── lobbyEvents.js     - Lobby join/create events
│   ├── utils/
│   │   ├── logger.js          - Console logging helper
│   │   └── generateLobbyCode.js - 5-char alphanumeric
│   ├── .env.example
│   └── package.json
├── .gitignore
└── package.json (root)
```

## 1.2 Core Classes

### Deck.js
- Static deck definition: 6 Aces, 6 Kings, 6 Queens, 2 Jokers (20 cards total)
- `shuffle()` - randomize deck
- `deal(count)` - deal N cards to a player
- `validateCard(card)` - card exists in deck

### Player.js
```js
class Player {
  constructor(id, name) {
    this.id = id
    this.name = name
    this.hand = []          // Cards in hand
    this.mainScore = 0      // Primary score
    this.bonusModifier = 0  // Liar bonus tracker
    this.spectator = false  // True if in tie-break and not top scorer
  }
}
```

### GameEngine.js
Core game loop class:
```js
class GameEngine {
  constructor(players)
  startRound()              // Pick winning card, deal 5 cards each, randomize turn order
  playTurn(playerId, cards) // Validate & register play, auto-claim
  callLiar(callerId)        // Validate liar call, resolve truth/lie
  isVictoryConditionMet()   // Check if someone reached 20+ with highest score
  validateTruth(cards, winningCard) // Check if play is truthful
  updateBonusModifier(liarWasCalled) // Adjust bonus for next round
  updateTiebreaMode()       // Toggle spectator status if score >= 20
  getGameState()            // Return full state for clients
}
```

### rules.js
```js
// Core validation functions
function isTruthful(cards, winningCard) {
  // Ace=1, King=2, Queen=3, Joker=4
  return cards.every(c => c === winningCard || c === 4)
}

function calculateScoreChange(isLiarCorrect, wasCallerCorrect, liarWasCalled) {
  // Returns { liarScore, callerScore, othersScore }
}

function shouldEnterTiebreak(players) {
  // Check if any player >= 20
}
```

## 1.3 Socket.IO Events (Backend Emits & Receives)

### Lobbies

**Server received:**
- `lobby:create` (playerName) → creates lobby, returns { lobbyCode, playerId }
- `lobby:join` (lobbyCode, playerName) → joins existing, returns { lobbyCode, playerId, players[] }
- `lobby:leave` (lobbyCode, playerId)
- `lobby:start` (lobbyCode) → begins game (min 2 players, max 4)

**Server emits:**
- `lobby:updated` (players[], lobbyCode)
- `lobby:error` (message)
- `game:started` (gameState)

### In-Game

**Server received:**
- `game:play` (lobbyCode, playerId, cardsPlayed[]) → validates, registers play
- `game:callLiar` (lobbyCode, callerId) → resolves liar call
- `game:nextTurn` → auto-advance turn order

**Server emits:**
- `game:state` (fullGameState)
- `game:turn` (currentPlayerId, timeLimit) → whose turn
- `game:play:claimed` (playerId, cardsCount, claim) → e.g., "Player A played 3 cards, claims 3 Kings"
- `game:liar:revealed` (truthful, cardsPlayed[], scores{}, bonusModifier)
- `game:round:ended` (reason, scoreDeltas, newScores, bonusModifier)
- `game:tiebreak:activated` (activePlayers[], spectators[])
- `game:won` (winnerId, winnerName, finalScore)
- `game:error` (message)

## 1.4 Lobby Management

Lobbies are temporary rooms:
- Persist for **30min** after creation (or until all players leave)
- Support 2-4 players
- Automatically transition to `game:started` state
- Store: lobbyCode → { players[], status, createdAt }

## 1.5 Server Setup (server.js)

```js
- Initialize Express app
- Setup Socket.IO with CORS
- Connect to Redis (if used) or use in-memory store
- Mount game event handlers
- Mount lobby event handlers
- Health check endpoint (GET /health)
- Error handling middleware
```

---

# PHASE 2: FRONTEND - CORE UI & GAME VIEW

**Goal:** Build React components, lobby flow, and game UI.

Claude Code should have:
- [x] All game rules & terminology
- [x] Required assets (card images, sounds)
- [x] Socket.IO event list (from Phase 1)
- [x] Zustand store state shape (defined below)

## 2.1 Project Structure

```
frontend/src/
├── components/
│   ├── Lobby/
│   │   ├── LobbyCreate.jsx      - Form to create lobby
│   │   ├── LobbyJoin.jsx        - Form to join by code
│   │   ├── LobbyRoom.jsx        - Waiting room (show players, "Start Game" button)
│   │   └── LobbyError.jsx       - Error display
│   ├── Game/
│   │   ├── GameBoard.jsx        - Main game view
│   │   ├── PlayerHand.jsx       - Your cards (desktop + mobile layout)
│   │   ├── PlayerPanel.jsx      - Other players' status (score, cards left)
│   │   ├── CardDisplay.jsx      - Show current claim (e.g., "3 Kings")
│   │   ├── ActionButtons.jsx    - Play, Liar call, Next turn buttons
│   │   └── GameWon.jsx          - Victory screen
│   ├── Shared/
│   │   ├── Header.jsx           - Game title, lobby code display
│   │   ├── ScoreBoard.jsx       - Scores & bonus modifier
│   │   ├── Modal.jsx            - Generic modal wrapper
│   │   └── Sound.jsx            - Global sound toggle
│   └── App.jsx
├── pages/
│   ├── LobbyPage.jsx            - Create/Join choice screen
│   ├── GamePage.jsx             - Main game container
│   └── WinPage.jsx              - Post-game screen
├── store/
│   ├── gameStore.js             - Zustand: game state
│   ├── uiStore.js               - Zustand: UI state (modal, selected cards, etc.)
│   └── socketStore.js           - Zustand: Socket.IO connection state
├── hooks/
│   ├── useSocket.js             - Custom hook to connect & manage Socket.IO
│   ├── useGame.js               - Combine game + UI store
│   └── useSound.js              - Play sound effects
├── utils/
│   ├── cardRenderer.js          - Map card IDs to image paths
│   ├── soundLoader.js           - Load sound files
│   └── formatters.js            - Format player names, scores
├── assets/
│   ├── cards/                   - Card PNGs/SVGs
│   ├── sounds/                  - MP3 sound effects
│   └── styles/                  - Tailwind config
├── App.jsx
├── index.css
└── main.jsx
```

## 2.2 Zustand Stores

### gameStore.js
```js
{
  // Game state
  gameCode: "A3K2F",
  playerId: "uuid-xxx",
  playerName: "Alice",
  status: "lobby" | "playing" | "won",
  
  // Players & their data
  players: [
    { id, name, mainScore, bonusModifier, spectator, hand: [], cardsPlayedCount }
  ],
  
  // Round state
  winningCard: 1 | 2 | 3 | null,
  currentPlayerId: "uuid",
  turnOrder: ["uuid1", "uuid2", ...],
  bonusModifier: 0,
  roundNumber: 1,
  
  // History
  history: [
    { playerId, playerName, cardsPlayed: N, claim: "3 Kings", tag: "" }
  ],
  
  // Actions
  playCards: (cardIds[]) -> emit Socket event
  callLiar: () -> emit Socket event
  acceptLobbyState: (lobbyData)
  acceptGameState: (gameData)
}
```

### uiStore.js
```js
{
  // UI state
  selectedCards: [cardId1, cardId2],  // For card selection before play
  showModal: null | "play-confirm" | "liar-confirm" | "card-select",
  soundEnabled: true,
  showRules: false,
  
  // Actions
  toggleCard: (cardId)
  clearSelection: ()
  openModal: (modalType)
  closeModal: ()
  toggleSound: ()
}
```

### socketStore.js
```js
{
  connected: false,
  error: null,
  connect: (apiUrl)
  disconnect: ()
  emit: (event, data)
  on: (event, handler)
}
```

## 2.3 Key Components

### LobbyCreate.jsx
- Input: player name
- Generates lobby code on server
- Transitions to LobbyRoom

### LobbyRoom.jsx
- Display: lobby code (copyable)
- Display: current players list
- Button: "Start Game" (only if 2-4 players, only for first player)
- Auto-join: share code to other players

### GameBoard.jsx
Main game layout (mobile + desktop):
- **Header:** Game code, your name, scores
- **Center:** Current claim display ("3 Kings")
- **PlayerPanel:** Show other 1-3 players (score, cards left, spectator indicator)
- **Hand:** Your 5 cards (clickable to select)
- **Actions:** Play / Call Liar buttons (context-dependent)

**Desktop layout:** Players on sides, you at bottom, cards in horizontal row
**Mobile layout:** Vertical stack, card selector scrollable, buttons stacked

### PlayerHand.jsx
- Display 5 cards from hand[]
- Clickable cards toggle selection
- Visual feedback on selected cards (highlight border, checkmark, etc.)
- Show count: "Selected: 2/3 cards"

### ActionButtons.jsx
Context-aware buttons:
- **Your turn:** "Play N Cards" (disabled until 1-3 selected), placeholder for specific card count
- **Next player's turn:** "Call Liar" (always available until play revealed)
- **Spectator:** Buttons hidden

### GameWon.jsx
- Show winner name & score
- Show final scoreboard (all players)
- Button: "Play Again" (returns to lobby or home)

## 2.4 Responsive Design (Tailwind)

**Mobile (< 768px):**
- Single column layout
- Cards displayed in scrollable row
- Buttons full-width, stacked
- Player status as compact badges

**Desktop (≥ 768px):**
- 3-column layout (left players, center board, right board info)
- Cards in larger grid
- Buttons side-by-side
- Animated transitions

## 2.5 Sound Effects Integration

Hook: `useSound()` returns `playSound(soundName)` function
- Call on: card play, liar call, round end, points change, game won
- Respect `soundEnabled` toggle

---

# PHASE 3: MIDDLEWARE & RESPONSIVENESS

**Goal:** Polish mobile/desktop experience, validation, error handling.

## 3.1 Mobile-Specific Features

- [ ] Touch gestures: swipe to select cards
- [ ] Keyboard shortcuts (PC only):
  - `1-9`: Select card by position
  - `Enter`: Play selected cards
  - `L`: Call Liar
  - `R`: Ready for next round
- [ ] Haptic feedback on mobile (press card)
- [ ] Landscape + Portrait support

## 3.2 Card Hidden/Show Toggle

**Feature:** Button/shortcut to hide own cards from view during gameplay

- [ ] Backend: Track `cardVisibility` per player (bool)
- [ ] Frontend: Button: "Hide My Cards" / "Show My Cards"
- [ ] When hidden: PlayerHand shows blank card backs instead of cards
- [ ] Still allows play (hidden click detection or random selection)

## 3.3 Error Handling & Recovery

- [ ] Network disconnect: Show "Reconnecting..." overlay
- [ ] Invalid play detection: Show error tooltip
- [ ] Lobby full: Redirect to home with message
- [ ] Game already started: Redirect with message
- [ ] Player list sync: Verify player count & status on every state update

---

# PHASE 4: PWA & DEPLOYMENT

**Goal:** Convert to PWA, deploy to production.

## 4.1 PWA Setup

- [ ] Add `manifest.json` (frontend/public/)
- [ ] Add service worker (Vite PWA plugin: `npm install vite-plugin-pwa`)
- [ ] App icons (192x192, 512x512 PNG)
- [ ] Enable offline mode (cache game assets)

## 4.2 Production Deployment

- [ ] Deploy backend to Railway/Render
- [ ] Set `CORS_ORIGIN` env variable to Netlify domain
- [ ] Deploy frontend to Netlify (auto-on push to main)
- [ ] Test full flow: create lobby → play game → win

---

# Game Rules & Terminology (For Claude Code)

## Terminology
- **Game:** Complete session from start until one definitive winner
- **Ronde (Round):** New cards dealt → all plays → until liar call OR everyone plays out cards
- **Beurt (Turn):** One player plays 1–3 cards

## Card Mapping
- 1 = Ace (6x)
- 2 = King (6x)
- 3 = Queen (6x)
- 4 = Joker (2x)
- Joker always counts as valid winning card

## Scoring

| Event | Liar Correct | Liar Wrong | No Liar Call |
|-------|--------------|-----------|--------------|
| Liar loses | -1 | N/A | N/A |
| Caller gains | +1 + bonus_modifier | -1 | N/A |
| Others gain | +1 | +1 | +1 |

**Bonus Modifier:**
- Starts: 0
- End round without liar call: +1
- End round with liar call: max(0, -1)

## Tie-Break
- Triggered when any player ≥ 20
- Only players with highest score stay active
- Others become spectators (no cards, skip turns)
- Game ends when exactly 1 player has highest score ≥ 20

## Turn Order
- Only the **next player** can call liar
- After call resolved or player passes, moves to next in order
- Excludes spectators in tie-break mode

---

# Testing Checklist (For Phase 4+)

- [ ] 2-player game: play, win
- [ ] 3-player game with liar calls
- [ ] 4-player game with tie-break
- [ ] Mobile: cards selectable, buttons work
- [ ] Mobile: landscape + portrait
- [ ] Desktop: keyboard shortcuts work
- [ ] Sound: all effects play
- [ ] Disconnection recovery
- [ ] Hide/show cards toggle

---

# Deployment Checklist

- [ ] `.env` files configured (API URL, etc.)
- [ ] Backend deployed to Railway/Render (note URL)
- [ ] Frontend `.env` set with backend URL
- [ ] Frontend deployed to Netlify
- [ ] CORS allows Netlify domain
- [ ] Lobby code generation tested
- [ ] Full game flow tested end-to-end
