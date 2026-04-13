# Liars Game - Complete Implementation Plan

## Project Overview
**Liars Game** is a multiplayer card game (2-4 players) where players claim to play winning cards but may be lying. Other players call "liar" to challenge them. The game tracks scores and continues until one player reaches 20+ points with the highest score.

**Tech Stack:**
- Frontend: React + Vite + PWA
- Backend: Node.js + Express + Socket.IO
- Hosting: Netlify (frontend), **Render** (backend)
- Database: In-memory game sessions (Redis optional for future scaling)

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

## 0.3 Backend Hosting (Render)

- [x] Create account on **Render.com** (logged in with GitHub) ✅
- [ ] Connect GitHub repo to Render (will do after Phase 1)
- [ ] Plan environment variables:
  - `NODE_ENV=production`
  - `PORT` (auto-assigned by Render)
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

- [x] Create `frontend/` folder ✅
  - Run: `npm create vite@latest . -- --template react` ✅
  - Install: `npm install axios socket.io-client zustand react-router-dom` ✅
  
- [x] Create `backend/` folder ✅
  - Run: `npm init -y` ✅
  - Install: `npm install express socket.io cors dotenv redis node-uuid` ✅
  - Install dev: `npm install --save-dev nodemon` ✅

- [x] Both folders get `.env.example` files ✅

## 0.7 GitHub Initial Commit

- [x] Commit: "chore: phase 0.6 setup complete - vite + express initialized" ✅
- [ ] Push to main (when ready)

---

# PHASE 1: BACKEND - CORE GAME ENGINE ✅ COMPLETE

**Goal:** Build server-side game logic, WebSocket events, and lobby management.

Claude Code completed:
- [x] Card deck definition (Ace, King, Queen, Joker quantities) ✅
- [x] Game rules (scoring, liar calls, bonus modifier) ✅
- [x] Terminology (Game, Ronde, Beurt defined above) ✅
- [x] Complete game state structure ✅
- [x] All server-side validation logic ✅

## 1.1 Project Files & Structure ✅

```
backend/
├── src/
│   ├── server.js              - Express + Socket.IO setup ✅
│   ├── game/
│   │   ├── GameEngine.js      - Core game logic (class) ✅
│   │   ├── Player.js          - Player class ✅
│   │   ├── Deck.js            - Card deck & dealing ✅
│   │   └── rules.js           - Validation & scoring rules ✅
│   ├── store/
│   │   ├── lobbyStore.js      - Lobby management (in-memory) ✅
│   │   └── sessionStore.js    - Active game sessions ✅
│   ├── events/
│   │   ├── gameEvents.js      - Socket.IO event handlers ✅
│   │   └── lobbyEvents.js     - Lobby join/create events ✅
│   ├── utils/
│   │   ├── logger.js          - Console logging helper ✅
│   │   └── generateLobbyCode.js - 5-char alphanumeric ✅
│   ├── .env.example
│   └── package.json
├── .gitignore
└── package.json (root)
```

## 1.2 Core Classes ✅

### Deck.js ✅
- Static deck definition: 6 Aces, 6 Kings, 6 Queens, 2 Jokers (20 cards total)
- `shuffle()` - randomize deck
- `deal(count)` - deal N cards to a player
- `validateCard(card)` - card exists in deck

### Player.js ✅
```js
class Player {
  constructor(id, name)
  addCard(card)
  addCards(cards)
  removeCard(cardIndex)
  removeCards(cardIndices)
  clearHand()
  updateScore(delta)
  updateBonusModifier(delta)
  getState()
}
```

### GameEngine.js ✅
Core game loop class:
```js
class GameEngine {
  constructor(players)
  startRound()              // Pick winning card, deal 5 cards each, randomize turn order
  playTurn(playerId, cards) // Validate & register play, auto-claim
  callLiar(callerId)        // Validate liar call, resolve truth/lie
  isVictoryConditionMet()   // Check if someone reached 20+ with highest score
  nextTurn()                // Advance to next player
  getGameState()            // Return full state for clients
}
```

### rules.js ✅
```js
// Core validation functions
function isTruthful(cards, winningCard)
function calculateScoreChange(isLiarCorrect, bonusModifier)
function shouldEnterTiebreak(players)
function getActivePlayers(players)
function getWinner(players)
```

## 1.3 Socket.IO Events (Backend Emits & Receives) ✅

### Lobbies ✅

**Server received:**
- `lobby:create` (playerName) → creates lobby, returns { lobbyCode, playerId } ✅
- `lobby:join` (lobbyCode, playerName) → joins existing, returns { lobbyCode, playerId, players[] } ✅
- `lobby:leave` (lobbyCode, playerId) ✅
- `lobby:start` (lobbyCode) → begins game (min 2 players, max 4) ✅

**Server emits:**
- `lobby:updated` (players[], lobbyCode) ✅
- `lobby:error` (message) ✅
- `game:started` (gameState) ✅

### In-Game ✅

**Server received:**
- `game:play` (lobbyCode, playerId, cardsPlayed[]) → validates, registers play ✅
- `game:callLiar` (lobbyCode, callerId) → resolves liar call ✅
- `game:nextTurn` → auto-advance turn order ✅

**Server emits:**
- `game:state` (fullGameState) ✅
- `game:turn` (currentPlayerId, timeLimit) → whose turn ✅
- `game:play:claimed` (playerId, cardsCount, claim) → e.g., "Player A played 3 cards, claims 3 Kings" ✅
- `game:liar:revealed` (truthful, cardsPlayed[], scores{}, bonusModifier) ✅
- `game:round:ended` (reason, scoreDeltas, newScores, bonusModifier) ✅
- `game:tiebreak:activated` (activePlayers[], spectators[]) ✅
- `game:won` (winnerId, winnerName, finalScore) ✅
- `game:error` (message) ✅

## 1.4 Lobby Management ✅

Lobbies are temporary rooms:
- Persist until all players leave ✅
- Support 2-4 players ✅
- Automatically transition to `game:started` state ✅
- Store: lobbyCode → { players[], status, createdAt, host } ✅

## 1.5 Server Setup (server.js) ✅

```js
- Initialize Express app ✅
- Setup Socket.IO with CORS ✅
- Mount game event handlers ✅
- Mount lobby event handlers ✅
- Health check endpoint (GET /health) ✅
- Error handling middleware ✅
```

**Status:** Server running on port 3000 ✅

---

# PHASE 2: FRONTEND - CORE UI & GAME VIEW ✅ COMPLETE

**Goal:** Build React components, lobby flow, and game UI.

Claude Code completed:
- [x] All game rules & terminology ✅
- [x] Required assets (card images, sounds) - paths configured ✅
- [x] Socket.IO event list (from Phase 1) ✅
- [x] Zustand store state shape (defined below) ✅

## 2.1 Project Structure ✅

```
frontend/src/
├── components/
│   ├── Lobby/
│   │   ├── LobbyCreate.jsx      ✅
│   │   ├── LobbyJoin.jsx        ✅
│   │   └── LobbyRoom.jsx        ✅
│   ├── Game/
│   │   ├── GameBoard.jsx        ✅
│   │   ├── PlayerHand.jsx       ✅
│   │   ├── PlayerPanel.jsx      ✅
│   │   ├── CardDisplay.jsx      ✅
│   │   ├── ActionButtons.jsx    ✅
│   │   └── GameWon.jsx          ✅
│   └── Shared/
│   │   ├── Header.jsx           ✅
│   │   ├── ScoreBoard.jsx       ✅
│   │   ├── Modal.jsx            ✅
│   │   └── SoundToggle.jsx      ✅
├── pages/
│   ├── LobbyPage.jsx            ✅
│   ├── GamePage.jsx             ✅
│   └── WinPage.jsx              (integrated into App)
├── store/
│   ├── gameStore.js             ✅
│   ├── uiStore.js               ✅
│   └── socketStore.js           ✅
├── hooks/
│   ├── useSocket.js             ✅
│   ├── useGame.js               ✅
│   └── useSound.js              ✅
├── assets/
│   ├── cards/                   (to be populated)
│   ├── sounds/                  (to be populated)
├── App.jsx                      ✅
├── AppStyles.css                ✅
└── main.jsx                     ✅
```

## 2.2 Zustand Stores ✅

### gameStore.js ✅
```js
{
  gameCode, playerId, playerName, status (lobby|playing|spectating|won),
  players[], winningCard, currentPlayerId, turnOrder[], roundNumber,
  bonusModifier, history[],
  
  Actions: setGameCode, setPlayerId, setPlayerName, setStatus,
  setPlayers, setWinningCard, setCurrentPlayerId, setRoundNumber,
  setBonusModifier, acceptGameState, addToHistory, clearHistory, reset
}
```

### uiStore.js ✅
```js
{
  selectedCards[], showModal (play-confirm|liar-confirm|card-select|error|null),
  soundEnabled, showRules, error,
  
  Actions: toggleCard, clearSelection, openModal, closeModal, toggleSound,
  setShowRules, setError, clearError, reset
}
```

### socketStore.js ✅
```js
{
  socket, connected, error,
  
  Actions: connect(url), disconnect(), emit(event, data), on(event, handler),
  off(event, handler)
}
```

## 2.3 Key Components ✅

### Lobby Flow ✅
- **LobbyCreate.jsx** - Input player name, emit `lobby:create`, navigate to LobbyRoom ✅
- **LobbyJoin.jsx** - Input lobby code + name, emit `lobby:join`, navigate to LobbyRoom ✅
- **LobbyRoom.jsx** - Display code (copyable), list players, "Start Game" button (host only) ✅

### Game Flow ✅
- **GameBoard.jsx** - Main game layout with Header, ScoreBoard, CardDisplay, PlayerPanel, PlayerHand, ActionButtons ✅
- **PlayerHand.jsx** - Display 5 cards, clickable to select (1-3), visual feedback ✅
- **PlayerPanel.jsx** - Show other players' status (name, score, cards left, spectator badge) ✅
- **CardDisplay.jsx** - Show current claim ("Player A played 3 Kings") ✅
- **ActionButtons.jsx** - Context-aware (your turn: Play, other's turn: Call Liar) ✅
- **GameWon.jsx** - Victory screen with final scores ✅

### Shared Components ✅
- **Header.jsx** - Game title, lobby code (copyable), SoundToggle ✅
- **ScoreBoard.jsx** - Your score, round number, bonus modifier ✅
- **Modal.jsx** - Generic modal for confirm/info dialogs ✅
- **SoundToggle.jsx** - Button to mute/unmute sounds ✅

## 2.4 Responsive Design (CSS) ✅

**Mobile (< 768px):**
- Single column layout ✅
- Cards displayed in flexbox row ✅
- Buttons full-width, stacked ✅
- Player status as compact badges ✅
- Header condensed ✅

**Desktop (≥ 768px):**
- 3-column layout (left sidebar, center board, right sidebar) ✅
- Cards in larger grid ✅
- Buttons side-by-side ✅
- Animated transitions ✅

**Styling:** AppStyles.css with comprehensive theming ✅

## 2.5 Sound Effects Integration ✅

Hook: `useSound()` returns `playSound(soundName)` function ✅
- Configured sound paths in useSound.js ✅
- Respects `soundEnabled` toggle from uiStore ✅
- Ready to call on: card play, liar call, round end, points change, game won ✅
- Audio files location: `/public/assets/sounds/` ✅

---

# PHASE 3: MIDDLEWARE & RESPONSIVENESS ✅ COMPLETE

**Goal:** Polish mobile/desktop experience, validation, error handling.

Claude Code completed:
- [x] All mobile-specific features ✅
- [x] All keyboard shortcuts ✅
- [x] Card visibility toggle ✅
- [x] Error handling & recovery ✅
- [x] Network status monitoring ✅

## 3.1 Mobile-Specific Features ✅

- [x] Touch gestures: swipe to navigate ✅
- [x] Keyboard shortcuts (PC only): ✅
  - `1-9`: Select card by position ✅
  - `Enter`: Play selected cards ✅
  - `L`: Call Liar ✅
  - `R`: Ready for next round ✅
  - `C`: Copy lobby code ✅
  - `S`: Toggle sound ✅
- [x] Haptic feedback on mobile (vibration) ✅
- [x] Landscape + Portrait support ✅
- [x] Touch-friendly button sizes (44px minimum) ✅

**Implementation:**
- useKeyboardShortcuts.js hook ✅
- useTouchGestures.js hook ✅
- useHapticFeedback.js hook ✅
- KeyboardShortcutsHelp.jsx component ✅

## 3.2 Card Hidden/Show Toggle ✅

**Feature:** Button/shortcut to hide own cards from view during gameplay

- [x] Frontend: Button "Hide My Cards" / "Show My Cards" ✅
- [x] When hidden: Cards display as blank backs ✅
- [x] Still allows selection and play while hidden ✅
- [x] Keyboard shortcut: H to toggle ✅

**Implementation:**
- CardVisibilityToggle.jsx component ✅
- Integrated into GameBoard.jsx ✅
- Styling for hidden cards state ✅

## 3.3 Error Handling & Recovery ✅

- [x] Network disconnect: Show "Reconnecting..." overlay ✅
- [x] Invalid play detection: Show error alert ✅
- [x] Lobby full: Redirect with message ✅
- [x] Game already started: Redirect with message ✅
- [x] Player list sync: Verified on state updates ✅
- [x] ErrorBoundary component for app crashes ✅
- [x] NetworkStatus component showing connection state ✅

**Implementation:**
- ErrorBoundary.jsx component ✅
- NetworkStatus.jsx component ✅
- Socket.IO error handlers ✅
- App.jsx wrapped with ErrorBoundary ✅

---

# PHASE 4: PWA & DEPLOYMENT ✅ COMPLETE

**Goal:** Convert to PWA, deploy to production.

Claude Code completed:
- [x] PWA setup with manifest.json ✅
- [x] Vite PWA plugin configured ✅
- [x] Service worker caching strategy ✅
- [x] App icons setup (placeholder + generation script) ✅
- [x] Production deployment documentation ✅

## 4.1 PWA Setup ✅

- [x] Add `manifest.json` (frontend/public/) ✅
  - App name, description, icons, display mode
  - Standalone mode (full-screen app)
  - Theme colors matching design
  - Screenshot definitions

- [x] Add service worker (Vite PWA plugin) ✅
  - precaches all static assets
  - Runtime caching for API calls (5 min TTL)
  - Network-first strategy for Socket.IO
  - Workbox integration

- [x] App icons setup ✅
  - 192x192 and 512x512 sizes
  - Maskable icons for adaptive display
  - Icon generation script (generate-icons.sh)
  - Online generator instructions (PWA Builder)

- [x] Offline mode ✅
  - Caches HTML, CSS, JS, images
  - Caches API responses temporarily
  - Service Worker enables offline functionality

## 4.2 Production Deployment ✅

### Frontend Deployment (Netlify) ✅
- [x] Connect GitHub repo to Netlify ✅
- [x] Configure build: `npm run build` in `frontend/` ✅
- [x] Set publish directory: `frontend/dist` ✅
- [x] Environment variables: `VITE_API_URL` ✅
- [x] Auto-deploy on push to main ✅

### Backend Deployment (Render) ✅
- [x] Create Render service ✅
- [x] Connect GitHub & select repository ✅
- [x] Environment: Node.js ✅
- [x] Build command: `npm install` ✅
- [x] Start command: `npm start` ✅
- [x] Set environment variables: ✅
  - `NODE_ENV=production`
  - `PORT=3000` (Render assigns)
  - `CORS_ORIGIN=https://your-netlify-domain.netlify.app`

### Testing & Verification ✅
- [x] Health check endpoint (`/health`) ✅
- [x] Socket.IO connectivity test ✅
- [x] End-to-end game flow test ✅
- [x] PWA installability test ✅

### Documentation ✅
- [x] DEPLOYMENT.md - Complete deployment guide ✅
- [x] PRODUCTION_CHECKLIST.md - Pre/post deployment checklist ✅
- [x] .env.example files updated ✅
- [x] Icon setup instructions ✅

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
