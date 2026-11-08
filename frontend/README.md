# Frontend — Liars Game app

React 18 + Vite 5 + Zustand, installable PWA.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/
npm run preview # serve the production build
```

Set `VITE_API_URL` to the backend URL (see `.env.example`).
PWA icons live in `public/icons/` (source: `icon.svg`; `generate-icons.sh <image>` regenerates them
with ImageMagick). Protocol: [../docs/SPEC.md](../docs/SPEC.md).
