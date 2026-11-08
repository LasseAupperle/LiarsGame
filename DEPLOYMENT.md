# Deployment

| Part | Host | Deploys |
|---|---|---|
| Frontend | Netlify | Automatically on push to `main` |
| Backend | Render (Web Service) | **Manually** — Render's "On Commit" auto-deploy does not trigger for this repo |

All game state is in memory: every backend deploy or restart ends all running games and lobbies.
Deploy the backend when nobody is playing.

## Backend — Render

1. New → Web Service → connect the GitHub repo.
2. Settings:
   - **Root directory:** `backend`
   - **Build command:** `npm ci`
   - **Start command:** `npm start`
   - **Health check path:** `/health`
3. Environment:
   ```
   NODE_ENV=production
   CORS_ORIGIN=https://your-site.netlify.app
   ```
   `CORS_ORIGIN` takes a comma-separated list (no trailing slashes), e.g. to allow a
   preview domain as well. Render sets `PORT` itself.
4. After every backend change: Render dashboard → service → **Manual Deploy → Deploy latest commit**.

Free instances sleep after ~15 min idle; the first connection then takes 30–60 s
(the app shows "Connecting…" meanwhile). Open the site a minute before a play-test.

## Frontend — Netlify

1. Add new site → Import from GitHub.
2. Build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
3. Environment: `VITE_API_URL=https://<your-backend>.onrender.com`
   (Vite bakes this in at build time — redeploy after changing it.)

## Verify

```bash
curl https://<your-backend>.onrender.com/health
```

Expected: `{"status":"ok","timestamp":"…"}`. Then run through [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).

## Troubleshooting

- **CORS / socket won't connect:** the frontend's exact origin (scheme + host, no trailing
  slash) must be in `CORS_ORIGIN`; check the browser console and Render logs.
- **Old UI after deploy:** the service worker serves the cached build until it updates —
  reload twice, or clear site data / reinstall the PWA.
- **Backend change not live:** you forgot the manual Render deploy.
