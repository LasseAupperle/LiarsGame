# Liars Game 🃏

A real-time multiplayer card game built with React, Node.js, and Socket.IO. Play with friends, bluff your way to victory!

**Status:** ✅ All Phases Complete - PWA-ready, production deployment docs included

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm 7+

### Local Development

```bash
# Terminal 1: Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev

# Terminal 2: Backend (http://localhost:3000)
cd backend
npm install
npm run dev
```

Open http://localhost:5173 in your browser!

---

## 🎮 Features

### Core Gameplay
- 2-4 player lobbies with unique 5-character lobby codes
- Real-time Socket.IO communication
- Bluffing mechanics (call "Liar" to challenge)
- Scoring system (first to 20+ points wins)
- Tie-break mode when score ≥ 20

### Technical
- ⌨️ **Keyboard Shortcuts** - 1-9: Select, Enter: Play, L: Call Liar, R: Next, C: Copy code, H: Hide cards, S: Toggle sound
- 📱 **Mobile First** - Touch gestures, haptic feedback, responsive layout
- 🎵 **Sound Effects** - Card plays, liar calls, victory sounds
- 🔐 **Error Handling** - Auto-reconnect, offline detection, error boundaries
- 📦 **PWA** - Installable, offline caching, service worker
- 🌙 **Accessibility** - Dark/light mode, reduced motion support, high contrast

---

## 📁 Project Structure

```
LiarsGame/
├── frontend/                    # React + Vite + PWA
│   ├── src/
│   │   ├── components/         # React components (Lobby, Game, Shared)
│   │   ├── store/              # Zustand stores (game, ui, socket)
│   │   ├── hooks/              # Custom hooks (keyboard, touch, haptic, sound)
│   │   ├── pages/              # Page components
│   │   ├── App.jsx
│   │   └── AppStyles.css
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   ├── icons/              # App icons (192x512)
│   │   └── assets/             # Card/sound assets
│   └── vite.config.js          # Vite + PWA plugin
│
├── backend/                     # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── game/               # Game engine (Deck, Player, GameEngine, rules)
│   │   ├── store/              # Lobby & session managers
│   │   ├── events/             # Socket.IO handlers (lobby, game)
│   │   ├── utils/              # Helpers (logger, code generation)
│   │   └── server.js           # Express + Socket.IO setup
│   └── package.json
│
├── DEPLOYMENT.md               # 📖 Production deployment guide
├── PRODUCTION_CHECKLIST.md     # ✅ Pre/post deployment checklist
├── PROJECT_PLAN.md             # 📋 Complete phase breakdown
└── README.md                   # 👈 You are here
```

---

## 🔧 Tech Stack

**Frontend:**
- React 18 + Vite 5
- Zustand (state management)
- Socket.IO Client (real-time)
- CSS (responsive + accessible)

**Backend:**
- Node.js + Express
- Socket.IO (WebSocket)
- UUID (player IDs)
- CORS (cross-origin)

**DevOps:**
- Render (backend hosting)
- Netlify (frontend hosting, auto-deploy)
- Vite PWA Plugin (service worker)
- GitHub (source control)

---

## 🎯 Game Rules

### Setup
- 2-4 players, 5 cards dealt per player per round
- Random winning card selected (Ace, King, or Queen)

### Round Flow
1. **Current player** plays 1-3 cards, claims they match winning card
2. **Other players** can call "Liar" if they think it's false
3. **Resolution:** Truthfulness revealed, points awarded

### Scoring
| Event | Liar Correct | Liar Wrong |
|-------|--------------|-----------|
| Liar loses | -1 | N/A |
| Caller gains | +1 + bonus | -1 |
| Others gain | +1 | +1 |

**Bonus Modifier:** Starts at 0, +1 per safe round, resets on liar call

**Winning:** First to 20+ points with highest score

---

## 📦 Deployment

### Quick Deploy

**Frontend (Netlify):**
```bash
# 1. Connect GitHub repo
# 2. Build: npm run build (in frontend/)
# 3. Env: VITE_API_URL=https://your-backend-domain.com
# 4. Auto-deploys on push to main
```

**Backend (Render):**
```bash
# 1. Connect GitHub repo
# 2. Runtime: Node.js
# 3. Start: npm start
# 4. Env: CORS_ORIGIN=https://your-frontend-domain.com
```

**👉 See [DEPLOYMENT.md](DEPLOYMENT.md) for complete step-by-step guide**

---

## 🎮 Controls

### Keyboard (PC)
- `1-9` - Select card by position
- `Enter` - Play selected cards
- `L` - Call Liar
- `R` - Ready/next round
- `C` - Copy lobby code
- `H` - Hide/show cards
- `S` - Toggle sound

### Mobile
- Tap to select cards
- Swipe left/right to navigate
- Haptic feedback on interactions

---

## 🚧 Development Phases

- ✅ **Phase 0** - Setup & Project Structure (npm, vite.config, folder layout)
- ✅ **Phase 1** - Backend Engine (Deck, Player, GameEngine, rules, Socket.IO)
- ✅ **Phase 2** - Frontend UI (components, stores, hooks, styling)
- ✅ **Phase 3** - Mobile & Keyboard (shortcuts, gestures, haptics, error handling)
- ✅ **Phase 4** - PWA & Deployment (manifest, service worker, deployment docs)

---

## 🛠️ Development

### Build Frontend
```bash
cd frontend
npm run build  # Creates dist/
npm run preview  # Test production build
```

### Build Backend
```bash
cd backend
NODE_ENV=production npm start
```

### Testing Checklist

See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for:
- Pre-production testing
- Build verification
- Post-deployment verification
- Performance checks
- Security verification

---

## 🐛 Troubleshooting

**Socket.IO not connecting?**
- Check backend running on port 3000
- Verify CORS_ORIGIN in backend .env
- Check browser console for WebSocket errors

**PWA not installing?**
- Clear browser cache
- Check manifest.json is valid JSON
- Ensure HTTPS in production

**Build errors?**
- Delete `node_modules/` and package lock
- Run `npm install` again
- Ensure Node.js 16+

---

## 📚 Documentation

- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** - Complete phase breakdown & game rules
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Pre/post deployment checks

---

## 🚀 Future Ideas

- 🏆 Leaderboards (daily/weekly)
- 🤖 AI opponents
- 🎨 Themes & cosmetics
- 📊 Game stats & replays
- 💬 In-game chat
- 🌍 Public lobbies (matchmaking)
- 🎯 Ranked mode
- 🦸 Achievements

---

Made with ❤️ for multiplayer gaming!
