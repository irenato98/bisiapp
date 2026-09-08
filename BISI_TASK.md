# BISI TASK — Frontend

STATUS: ACTIVE TASK
BLOCK: Google-Only Frontend Auth Audit — READ ONLY
BRANCH: auth-v1-oauth-handoff-02
ENVIRONMENT: LOCAL READ-ONLY AUDIT ONLY
PROD: FORBIDDEN

## Product decision — current auth experience

For the current Bisi user experience:

- **Google is the only active, user-facing sign-in method.**
- Passwordless Email / email-code OTP is PAUSED / DEFERRED and must not be exposed or activated in frontend.
- Traditional password authentication remains disabled.
- `Login` vs `Register` may represent UX intent only; it must not become account-creation, identity, Founder, profile, or onboarding authority.
- Backend session/account state is authoritative where already designed to be authoritative.

Passwordless is an optional/additional authentication method, not required for Google sign-in. Do not implement, expose, route to, or otherwise give Passwordless any frontend weight in this task.

## Preserved completed status

The existing OAuth Handoff 02 frontend work on this branch previously passed local validation:

- `node scripts/frontend-auth-v1-oauth-handoff-smoke.mjs`: 13 PASS / 0 FAIL.
- `node scripts/frontend-auth-v1-foundation-smoke.mjs`: 10 PASS / 0 FAIL.
- `node scripts/frontend-connected-planner-gate.mjs`: 11 PASS / 0 FAIL.

Real Google OAuth browser QA also passed in the prior Auth V1 OAuth Handoff work. This audit must not reopen already-passing behavior unless current code inspection identifies a concrete present-day defect.

## Authorization scope — ACTIVE NOW

Authorized now:

- read `AGENTS.md` and this `BISI_TASK.md` in full;
- confirm the local branch/task state without macOS system Git or Xcode/Apple Command Line Tools;
- inspect frontend source/config/tests read-only;
- trace current Login/Register -> Google OAuth -> callback/handoff -> session -> post-auth routing behavior;
- inspect how frontend consumes backend session/profile/onboarding fields;
- inspect legacy/local compatibility state such as `wabi.beta.session` or equivalent localStorage/sessionStorage flags;
- inspect app-shell/session-loading behavior for possible authenticated/unauthenticated flash;
- inspect frontend display-name/avatar handling for Google-backed profile data;
- search for Passwordless/email-code/password UI, routes, fallback logic, or dormant wiring;
- classify findings using the categories below.

NOT authorized now:

- editing any frontend file;
- changing tests, scripts, config, routes, UI, CSS, assets, or package files;
- enabling or implementing Passwordless/email OTP;
- changing backend;
- contacting or mutating DEV/PROD;
- publishing/deploying/changing GitHub Pages;
- Git operations, commits, merges, branch movement, or changes to `main`;
- touching PROD.

Do not rerun tests unless strictly necessary to answer an audit question and the command is local/read-only. Prefer source inspection first. Do not make fixes during the audit.

## Audit objectives

### 1. Login/Register surface

Determine exactly what authentication options a user can currently see or trigger.

Confirm whether Google is the only visible/usable method. Search for any:

- email/password fields;
- email-code / OTP UI;
- Passwordless buttons or routes;
- fallback links or hidden actions that could expose a second auth method.

Any Passwordless-related code found must be classified as `PASSWORDLESS / DIFERIDO` unless it currently leaks into active UX, in which case report that as a real current bug as well.

### 2. Google OAuth flow

Trace the exact current frontend flow from the Google button through:

- OAuth start;
- backend redirect/callback/handoff;
- frontend handoff exchange;
- session establishment/refresh;
- entry into the authenticated app.

Identify the exact files/functions involved.

Confirm whether frontend JavaScript/localStorage/sessionStorage ever receives or stores a raw backend session token. Existing non-secret compatibility markers may be reported separately.

### 3. Post-auth routing and onboarding authority

Determine exactly what currently decides whether a user goes to onboarding/import flow or directly to the app after Google authentication or refresh.

Inspect:

- backend session/onboarding fields consumed by frontend;
- `wabi.beta.session` or equivalent legacy/local markers;
- Login vs Register intent flags;
- any browser-local onboarding completion flags;
- any competing authorities that could misroute returning/new users.

This task may AUDIT onboarding authority but must not redesign or implement onboarding.

Backend durable `onboarding_status` is the intended account authority. Authentication method and Login/Register button must not reset or decide onboarding state.

The future interactive in-app tutorial is a separate concept from account onboarding; do not propose merging them.

### 4. App/session flash

Inspect initial load and refresh behavior to determine whether the app shell or authenticated content can render briefly before session state is known.

If a flash can occur, report the exact state transition/cause and the minimum conceptual correction. Do not implement it.

### 5. Google profile display

Trace how frontend receives and displays:

- display name;
- avatar URL/photo;
- fallback initials.

Determine whether current frontend contract/field mapping could prevent the Google avatar or Google-derived name from appearing. Distinguish frontend mapping issues from backend-contract availability.

Do not implement profile changes.

## Required classification

Classify every meaningful finding as exactly one of:

- `FUNCIONA / NO TOCAR`
- `BUG REAL / BLOQUEA UX PRINCIPAL`
- `MEJORA OPCIONAL / NO NECESARIA`
- `PASSWORDLESS / DIFERIDO`

For each `BUG REAL / BLOQUEA UX PRINCIPAL`, report:

- observed symptom;
- root cause;
- exact file(s)/function(s) involved;
- smallest recommended patch;
- regression risk;
- whether it affects Google sign-in itself, post-auth routing, session flash, profile display, or another principal UX path.

Do not promote optional improvements into blockers.

## General scope rule

When an idea is an additional/alternative/optional capability rather than something required for the current Google-first product path to work, label it explicitly as optional before recommending implementation.

Do not expand scope by initiative.

## HARD STOP

STOP immediately if:

- local branch/task state does not match this task;
- unexpected modified files or state make the audit unreliable;
- any requested diagnostic would mutate repository, DEV, PROD, GitHub Pages, backend, or user data;
- secrets/credentials would need to be exposed;
- any action would cross the read-only authorization above.

On HARD STOP, report facts and hypotheses separately and do not auto-fix.

## Current instruction to Codex

Codex must:

1. Work only in **Bisi Frontend** at `/Users/renatobibolotti/Downloads/BISI-LIVE/bisiapp`.
2. Read `AGENTS.md` first, then this `BISI_TASK.md` in full.
3. Confirm `auth-v1-oauth-handoff-02` without macOS system Git.
4. Perform only the Google-only frontend audit described above.
5. Do not modify any file or run Git operations.
6. Do not touch backend, DEV, GitHub Pages, or PROD.
7. Do not implement or expose Passwordless.
8. At completion, STOP and report:
   - current visible auth options;
   - Google OAuth flow and involved files/functions;
   - session-token/local-marker findings;
   - post-auth routing/onboarding authority findings;
   - app/session flash findings;
   - Google display-name/avatar findings;
   - classification of all findings;
   - smallest patch plan only for real principal-UX bugs;
   - confirmation that no files, Git, backend, DEV, Pages, or PROD were changed.
