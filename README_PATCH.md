# Frontend V6.4.10 — Planner bootstrap read + safe local migration

`6.4.10-planner-bootstrap-read-migration`

This is Connection 2 of the planner/backend source-of-truth roadmap. It connects the existing V6.4.8 planner state to the authenticated DEV task transport without switching day-to-day mutations yet.

## What changes

- Adds `BisiPlannerBootstrap`, gated by both a ready planner runtime and an authenticated backend session.
- On first safe bootstrap:
  - local empty + backend empty → stays empty;
  - local has activities + backend empty/subset with identical shared IDs → uploads only missing local activities, preserving frontend IDs and `dayKey`;
  - local empty + backend has valid activities → hydrates the local runtime from backend and re-renders;
  - both sides already match → no-op;
  - divergent shared data or backend-only IDs → **no silent merge** and marks `needs_review`.
- A partial upload can safely continue only when the remote snapshot is a compatible subset of the local snapshot.
- `wabi.v6` stays as a safety copy. No local activity is deleted.
- Server-only timestamps are not written into local planner tasks.
- Existing recurrence cleanup runs before backend bootstrap.
- Bisi AI v0.9 remains paused. Legacy AI transport remains unchanged.

## Deliberately NOT changed yet

- Create/edit/move/complete/delete are still local planner operations.
- Backend is not yet live write-through authority for every mutation.
- Recurrence behavior is not moved to backend yet.
- Blocks/categories remain local.
- Shadows are not removed.
- No branding/copy/avatar changes are mixed in.
- The two approved new character images remain pending and will replace `assets/character/happy.webp` and `assets/character/happy-mouth.webp` while preserving those filenames.
- PROD is not used by this build.

## Local gates

```bash
node --check assets/js/bisi.js
node scripts/frontend-ai-dev-smoke.mjs
node scripts/frontend-backend-connection-smoke.mjs
node scripts/frontend-planner-bootstrap-smoke.mjs
```

Do not do manual QA if any gate fails.
