# Frontend V6.4.9 — Backend connection foundation

`6.4.9-backend-connection-foundation`

This is Connection 1 of the planner/backend source-of-truth roadmap. It deliberately connects the general frontend runtime to the DEV backend without switching calendar ownership yet.

## What changes

- General backend is enabled in DEV and points to:
  `https://bisiapp-backend-dev.renabiboovie.workers.dev/api`
- Adds a general DEV browser-bridge session path independent from the AI-specific bootstrap.
- Adds `BisiBackendConnection` to:
  - establish the isolated DEV backend session when a local Bisi session exists;
  - expose authenticated profile/task transport;
  - reconnect once after a 401/403;
  - expose a read-only planner transport probe for the next connection block.
- Adds `BisiProfileSync` so current local profile/preferences/timezone are mirrored to the authenticated DEV backend.
- Existing frontend planner behavior remains local-first in this step.
- Existing Bisi AI frontend/legacy route remains present and unchanged functionally. AI-first v0.9 work remains paused.

## Deliberately NOT changed yet

- `wabi.v6` still owns the live planner state.
- Create/edit/move/complete/delete are not sent to backend yet.
- No local activity migration runs yet.
- Recurrence logic remains frontend-owned.
- Blocks/categories are not moved yet.
- No shadow removal yet.
- No branding/copy/avatar changes are mixed in.
- The two new character images remain a later frontend block and will replace the existing `assets/character/happy.webp` and `assets/character/happy-mouth.webp` files while preserving those filenames.
- PROD is not used by this build.

## Local gates

```bash
node --check assets/js/bisi.js
node scripts/frontend-ai-dev-smoke.mjs
node scripts/frontend-backend-connection-smoke.mjs
```

Do not do manual QA if any gate fails.
