# BISI TASK — Frontend

STATUS: NO ACTIVE TASK
BLOCK: Auth V1 OAuth Handoff 02 — Awaiting Live QA Publication Authorization
BRANCH: auth-v1-oauth-handoff-02

## Completed status

Frontend local validation is complete and reported PASS:

- `node scripts/frontend-auth-v1-oauth-handoff-smoke.mjs`: 13 PASS / 0 FAIL.
- `node scripts/frontend-auth-v1-foundation-smoke.mjs`: 10 PASS / 0 FAIL.
- `node scripts/frontend-connected-planner-gate.mjs`: 11 PASS / 0 FAIL.

Backend DEV is ready for real Google OAuth QA:

- OAuth handoff DEV gate: 6 PASS / 0 FAIL.
- Provider capability: `google=true`, `microsoft=false`.
- Microsoft and Apple are deferred for the current PWA block.

## Current instruction

There is no active Codex frontend task yet. The tested OAuth adapter remains on branch `auth-v1-oauth-handoff-02`. Real browser QA must not be attempted against an older published frontend that does not contain this adapter.

Publishing, merging, or changing GitHub Pages is NOT authorized by this file. Wait for explicit user authorization and a future task update.

Codex must:

1. Read `AGENTS.md`.
2. Observe `STATUS: NO ACTIVE TASK`.
3. Do not modify code.
4. Do not rerun tests by initiative.
5. Do not publish, deploy, merge, or change GitHub Pages.
6. Do not perform Git operations.
7. Do not invoke macOS system Git or anything requiring Xcode / Apple Command Line Tools.
8. Do not touch PROD.
9. Wait for a future update to this file.
