# Liars Game

A multiplayer real-time card game built with React + Vite (frontend) and Node.js + Express + Socket.IO (backend).

**Players claim to play winning cards, but they might be lying. Call "liar" to challenge them. First player to 20+ points wins!**

## Project Structure

```
LiarsGameSteal/
├── frontend/          - React + Vite PWA application
├── backend/           - Node.js + Express + Socket.IO server
├── docs/              - Documentation
├── .gitignore
├── .env.example
├── PROJECT_PLAN.md    - Complete implementation plan (phases 0-4)
└── README.md
```

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Socket.IO Client
- **Backend:** Node.js + Express + Socket.IO
- **Hosting:** Netlify (frontend) + Railway/Render (backend)
- **State Management:** Zustand (frontend), in-memory or Redis (backend)

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Git

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173

### Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend runs on http://localhost:8000

## Configuration

1. Copy `.env.example` to `.env` in both `frontend/` and `backend/`
2. Update environment variables as needed
3. See `PROJECT_PLAN.md` for detailed setup instructions

## Game Rules (Quick Overview)

- **Players:** 2–4
- **Winning condition:** First to 20+ points with highest score
- **Card deck:** 6 Aces, 6 Kings, 6 Queens, 2 Jokers
- **Gameplay:** Play 1–3 cards claiming they are the winning card. Next player can call "liar" to challenge.
- **Scoring:** Win +1 point, lose -1 point, bonus for correct liar calls

For complete rules and implementation details, see `PROJECT_PLAN.md`.

## Development Phases

- **Phase 0:** Setup (GitHub, hosting, assets) — ✅ In progress
- **Phase 1:** Backend development
- **Phase 2:** Frontend development
- **Phase 3:** Mobile optimization & polish
- **Phase 4:** PWA & production deployment

See `PROJECT_PLAN.md` for detailed phase breakdown.

## License

Private project
