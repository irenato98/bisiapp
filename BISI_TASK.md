# BISI TASK — Frontend

STATUS: ACTIVE
BLOCK: Auth V1 OAuth Handoff 02 — Local Validation
BRANCH: auth-v1-oauth-handoff-02

## Objective

Validate the already-prepared frontend adapter that replaces the legacy fake Google/Microsoft provider click with the real backend OAuth flow and consumes the secure DEV handoff. This task is validation only. Do not modify code.

## Scope

Allowed actions:

- Read root runtime files.
- Execute only the ordered local gates below.

Forbidden in this task:

- Do not modify source, HTML, scripts, configuration, or instruction files.
- Do not publish or deploy.
- Do not perform Git writes, commits, pushes, merges, rebases, resets, or branch changes.
- Do not touch PROD.
- Do not work on passwordless email, onboarding, analytics, AI, Planner changes, or IZIPAY.

## Preflight

Before gates, verify:

1. Repository root is the active runtime.
2. Current branch is `auth-v1-oauth-handoff-02`.
3. `assets/js/auth-v1-oauth-handoff.js` exists.
4. `index.html` loads it after `auth-v1-foundation.js`.
5. Test scripts read the root runtime, not historical directories.

If any preflight item is false: STOP.

## Ordered gates

Run exactly in this order. Continue only after PASS:

1. `node scripts/frontend-auth-v1-oauth-handoff-smoke.mjs`
2. `node scripts/frontend-auth-v1-foundation-smoke.mjs`
3. `node scripts/frontend-connected-planner-gate.mjs`

## Mandatory STOP rule

At the first FAIL, error, unexpected non-zero exit, or material mismatch:

- STOP immediately.
- Do not run the next command.
- Do not fix or modify anything.
- Report the exact failed command, first relevant error, relevant output, observed facts, and hypotheses separately.

## PASS completion

If every gate passes, report the per-command results and end with:

`AUTH V1 OAUTH HANDOFF 02 FRONTEND LOCAL GATE: PASS`

Then stop. No publish/deploy is authorized by this task.
