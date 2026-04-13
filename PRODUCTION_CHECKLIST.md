# Liars Game - Build & Production Checklist

## Pre-Production Testing (Run Locally)

- [ ] Frontend dev server starts: `npm run dev` (port 5173)
- [ ] Backend dev server starts: `npm run dev` (port 3000)
- [ ] Can create a lobby and join
- [ ] Can play a full game without errors
- [ ] Keyboard shortcuts work (PC): 1-9, Enter, L
- [ ] Sound effects work
- [ ] Error handling works (disconnect/reconnect)
- [ ] Mobile responsive (test on phone/tablet)

## Build Verification

### Frontend Build
```bash
cd frontend
npm run build
# Verify dist/ folder created with index.html, assets, etc.
npm run preview
# Test the production build locally
```

### Backend Production
```bash
cd backend
NODE_ENV=production npm start
# Verify server starts and health endpoint works
curl http://localhost:3000/health
```

## Environment Setup

### Backend (.env)
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-netlify-domain.netlify.app
```

### Frontend
Netlify environment variables:
```
VITE_API_URL=https://your-render-backend.onrender.com
```

## Deployment Steps

1. [ ] Render backend deployed and running
2. [ ] Backend health check returns OK
3. [ ] Netlify frontend deployed and building
4. [ ] CORS_ORIGIN updated to match frontend URL
5. [ ] VITE_API_URL points to backend
6. [ ] PWA manifest.json loads
7. [ ] Service Worker registers

## Post-Deployment Testing

- [ ] Frontend loads at Netlify URL
- [ ] Can create lobby from production
- [ ] Socket.IO connects to production backend
- [ ] Full game flow works (create → join → play → win)
- [ ] No console errors
- [ ] Network tab shows WebSocket upgrade to /socket.io
- [ ] PWA installable on mobile
- [ ] Offline mode caches assets

## Performance Checks

- [ ] Lighthouse score > 80
- [ ] First contentful paint < 3s
- [ ] API response time < 200ms
- [ ] No memory leaks (DevTools profiler)
- [ ] Backend health endpoint responds quickly

## Security Verification

- [ ] HTTPS enabled on both domains
- [ ] CORS_ORIGIN is specific (not wildcard)
- [ ] NODE_ENV=production
- [ ] No sensitive data in frontend code
- [ ] API validates all client inputs
- [ ] Socket.IO events validate data

## Monitoring Setup (Optional)

- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Monitor response times
- [ ] Set up alerts for API failures
- [ ] Monitor WebSocket connections

## Rollback Plan

If something breaks in production:
1. Revert commit on GitHub
2. Netlify auto-redeploys previous version
3. For backend: Render can rollback or redeploy
4. Keep local backup of working .env files

## Success Criteria

✓ Production URL is live
✓ Users can play full games
✓ No critical errors in logs
✓ Performance acceptable (< 1s load time)
✓ PWA installable and works offline (cached)
✓ Responsive on mobile and desktop

---

See DEPLOYMENT.md for detailed instructions.
