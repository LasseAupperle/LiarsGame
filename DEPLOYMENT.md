# Liars Game - Deployment Guide

## Overview
This guide covers deploying the Liars Game to production with:
- **Frontend:** Netlify (auto-deploys from GitHub)
- **Backend:** Render or Railway (Node.js + Socket.IO)

---

## Prerequisites
- GitHub account (repository already set up)
- Netlify account
- Render/Railway account

---

## Step 1: Deploy Backend (Render.com)

### 1.1 Create Render Service
1. Go to [Render.com](https://render.com)
2. Sign in with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Fill in configuration:
   - **Name:** `liars-game-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or `npm run dev` for development)
   - **Plan:** Free tier available

### 1.2 Set Environment Variables
In Render dashboard, go to Environment:
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-netlify-domain.netlify.app
```

### 1.3 Get Backend URL
After deployment, Render provides a URL like:
```
https://liars-game-backend.onrender.com
```
**Save this URL for the frontend configuration.**

---

## Step 2: Deploy Frontend (Netlify)

### 2.1 Connect GitHub to Netlify
1. Go to [Netlify](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select GitHub and choose your repository
4. Configure build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`

### 2.2 Set Environment Variables
In Netlify dashboard, go to Site settings → Build & deploy → Environment:
```
VITE_API_URL=https://liars-game-backend.onrender.com
```

### 2.3 Deploy
Click "Deploy" - Netlify will:
1. Install dependencies
2. Build the React app
3. Deploy to CDN
4. Provide a live URL

---

## Step 3: Verify Production Deployment

### Test API Connection
```bash
curl https://liars-game-backend.onrender.com/health
# Expected: {"status":"ok","timestamp":"2026-04-13T..."}
```

### Test Full Flow
1. Open frontend URL in browser
2. Create a new lobby
3. Join from another browser/device
4. Play a test game
5. Verify Socket.IO connection works

---

## Step 4: Custom Domain (Optional)

### Frontend Custom Domain
1. In Netlify, go to Domain settings
2. Add custom domain (requires DNS change)
3. Configure SSL (automatic with Netlify)

### Backend Custom Domain
1. In Render, go to Custom Domains
2. Add your domain
3. Follow DNS instructions

---

## Environment Variables Summary

### Backend (.env)
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.netlify.app
REDIS_URL=redis://... (optional)
```

### Frontend (Netlify)
```
VITE_API_URL=https://your-backend-domain.onrender.com
```

---

## Troubleshooting

### CORS Errors
- Verify `CORS_ORIGIN` matches your frontend URL exactly
- Include protocol (https) and domain, no trailing slash

### Socket.IO Connection Failed
- Check backend health endpoint responds
- Verify CORS_ORIGIN is correct
- Check network tab for WebSocket upgrade attempts

### Build Failures
- Check Netlify/Render logs
- Ensure `npm run build` works locally: `cd frontend && npm run build`
- Verify all dependencies are in package.json

### Service Worker Issues
- Clear browser cache
- Uninstall PWA (remove from home screen if installed)
- Check browser console for sw.js errors

---

## Monitoring & Logs

### Netlify
- https://app.netlify.com → Your site → Deploys
- View build and deploy logs

### Render
- https://dashboard.render.com → Your service → Logs
- Real-time server logs

---

## Continuous Deployment

Both platforms automatically deploy when you push to main:
1. Make changes locally
2. Commit and push to GitHub
3. Netlify/Render detect changes
4. Automatic build and deploy
5. Live in ~1-2 minutes

```bash
git add .
git commit -m "feat: add feature"
git push origin main
```

---

## Performance Tips

### Frontend
- Images/assets are cached by Netlify CDN
- Service Worker caches static assets
- Enable gzip compression (automatic)

### Backend
- Free tier has CPU limits; upgrade if hitting throttling
- Render spins down inactive services; upgrade for always-on
- Use Redis (if budget allows) for better performance

---

## Security Checklist

- [ ] CORS_ORIGIN set to correct domain (never use *)
- [ ] NODE_ENV=production on backend
- [ ] No sensitive data in environment variables (use Render/Netlify secrets)
- [ ] HTTPS enabled on both frontend and backend
- [ ] API rate limiting recommended (future feature)

---

## Next Steps

After deployment:
1. Test with real users
2. Monitor error logs
3. Collect feedback
4. Plan Phase 4+ features (leaderboards, tournaments, etc.)

Good luck! 🎉
