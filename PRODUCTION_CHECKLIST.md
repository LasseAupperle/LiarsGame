# Release checklist

## Before deploying
- [ ] `cd backend && npm test` passes (CI green)
- [ ] `cd frontend && npm run build` succeeds
- [ ] `docs/SPEC.md` and `PROJECT_PLAN.md` changelog updated for this change

## Local smoke test (two browser windows)
- [ ] Create a lobby, join from the second window, start
- [ ] Play a few turns; call Liar (correct and wrong); finish a round without a call
- [ ] Reload one window mid-game → lands back in the game with the same hand
- [ ] Turn off network in one window (DevTools → Offline) for 10 s → reconnects, game continues
- [ ] Close one window on its turn → the other sees a card auto-played after 15 s
- [ ] Keyboard: 1–5, Enter, L, H, S, C

## Deploy
- [ ] Backend: Render → Manual Deploy (nobody playing — deploy ends running games)
- [ ] Frontend: push to `main` (Netlify builds automatically)
- [ ] `curl https://<backend>/health` returns ok

## After deploying
- [ ] Production site loads and connects (Network tab shows the `/socket.io` WebSocket)
- [ ] Full game on two real phones, including locking a phone mid-game and coming back
- [ ] PWA installs from the browser menu (icon shows correctly)
- [ ] No errors in the browser console or Render logs

## Config sanity
- [ ] Render: `NODE_ENV=production`, `CORS_ORIGIN` = exact Netlify origin(s)
- [ ] Netlify: `VITE_API_URL` = Render URL
- [ ] HTTPS on both
