# Deployment

| Part | Host | Deploys |
|---|---|---|
| Frontend | Netlify | Automatically on push to `main` |
| Backend | Render (Web Service) | Via GitHub Actions (`deploy-backend.yml`) once the deploy-hook secret is set; otherwise manually |

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
4. **Auto-deploy via GitHub Actions** (Render's own "On Commit" doesn't trigger for this repo):
   - Render → service → Settings → **Deploy Hook** → copy the URL.
   - GitHub → repo → Settings → Secrets and variables → Actions → **New repository secret**
     `RENDER_DEPLOY_HOOK_URL` = that URL.
   - From then on every push to `main` that touches `backend/` runs the tests and, if they
     pass, triggers a Render deploy. You can also run it by hand: Actions → *Deploy backend* →
     *Run workflow*. Set Render's own Auto-Deploy to **Off** to avoid double deploys.
   - Without the secret the workflow just warns; deploy manually: Render dashboard →
     **Manual Deploy → Deploy latest commit**.
   - ⚠️ A deploy ends all running games — don't merge backend changes to `main` mid-play-test.

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
- **Backend change not live:** check the *Deploy backend* workflow run in GitHub Actions
  (failed tests or missing secret), or deploy manually in Render.
