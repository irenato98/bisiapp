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
- Do not invoke the macOS system `git` CLI or any command that requires Xcode / Apple Command Line Tools for this validation.

## Preflight — no Git CLI

Branch selection/sync is handled externally by GitHub Desktop. The user has selected `auth-v1-oauth-handoff-02`; Codex must not try to re-verify that with the system `git` executable.

Before gates, verify using ordinary filesystem/file reads only:

1. `pwd` points to the active `BISI-LIVE/bisiapp` working folder, not a historical/versioned subdirectory.
2. This `BISI_TASK.md` says `BLOCK: Auth V1 OAuth Handoff 02 — Local Validation`.
3. `assets/js/auth-v1-oauth-handoff.js` exists in the root runtime.
4. `index.html` loads it after `auth-v1-foundation.js`.
5. `scripts/frontend-auth-v1-oauth-handoff-smoke.mjs` exists and test scripts read the root runtime, not historical directories.

Do not run `git branch`, `git rev-parse`, `git status`, or other Git CLI commands during this task.

If any filesystem/file preflight item is false: STOP.

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
