# Liars Game — working agreement

## Spec-first workflow (mandatory)
1. `docs/SPEC.md` is the source of truth for rules, server behaviour and the socket
   protocol. Any change to behaviour starts by editing the spec.
2. Implement the change so the code matches the spec.
3. Update `PROJECT_PLAN.md` (status, backlog, changelog) in the same commit.
4. If code and spec disagree, either fix the code or amend the spec in the same
   commit — never leave them out of sync.
5. Open design questions are marked **[OPEN]** in the spec; don't silently decide them.

## Layout
- `backend/` — Node + Express + Socket.IO, in-memory state. Tests: `cd backend && npm test`.
- `frontend/` — React + Vite + Zustand PWA. Build: `cd frontend && npm run build`.
  Unit tests: `npm test` (Vitest). E2E: `npm run test:e2e` (Playwright, starts backend + build).

## Checks before committing
- `cd backend && npm test`
- `cd frontend && npm test && npm run build`
- For gameplay/connection changes also `cd frontend && npm run test:e2e`

## Deploy
- Frontend: Netlify, auto-deploys on push to `main`.
- Backend: Render, deployed by `.github/workflows/deploy-backend.yml` via deploy hook once the
  `RENDER_DEPLOY_HOOK_URL` secret is set; otherwise manual deploy after every backend change.
