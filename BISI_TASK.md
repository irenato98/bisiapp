# BISI TASK — Frontend

STATUS: ACTIVE TASK
BLOCK: Google-Only Frontend Core Fixes — LOCAL IMPLEMENTATION
BRANCH: auth-v1-oauth-handoff-02
ENVIRONMENT: LOCAL FEATURE BRANCH ONLY
PROD: FORBIDDEN

## Product decision — current auth experience

For the current Bisi user experience:

- **Google is the only active/clickable sign-in method.**
- Microsoft and Apple remain visible as future options, but must be disabled/non-clickable and clearly labeled `Pronto` (or the smallest equivalent copy consistent with the existing UI).
- Do NOT delete Microsoft/Apple internal provider support merely to satisfy this UI decision; this task is about disabling their current user-facing action, not removing future capability.
- Passwordless Email / email-code OTP is PAUSED / DEFERRED and must have no frontend UI, routing, fallback behavior, or UX weight.
- Traditional password authentication remains disabled.
- The existing copy `La contraseña sigue siendo asunto tuyo` is intentionally left unchanged in this task.
- Dormant wrappers such as `/auth/login` and `/auth/register` are out of scope; do not remove/refactor them unless a concrete authorized bug proves they are on the active Google path.

## Critical identity rule — no duplicates

`Inicia sesión` and `Regístrate` are UX intent/copy only. They MUST NOT decide whether a Bisi account is new or existing.

The backend canonical account is authoritative:

- the same verified normalized email must resolve to the same canonical Bisi `user_id`;
- a genuinely new verified email may create one new canonical account;
- an already-existing verified email must reuse the existing canonical account and `user_id`;
- frontend must never synthesize a replacement account/user id because the user clicked `Regístrate`;
- frontend must never clear/reset account compatibility state merely because the entry mode was `register`;
- changing between Login/Register must not reset Founder state, profile, onboarding, integrations, activities, preferences, or other account state.

This frontend task must preserve the backend-owned identity model and must not introduce any second account authority.

## Preserved working behavior — do not reopen without evidence

The existing Google OAuth/Handoff flow on this branch previously passed local validation and real browser QA.

Prior local gates:

- `node scripts/frontend-auth-v1-oauth-handoff-smoke.mjs`: 13 PASS / 0 FAIL.
- `node scripts/frontend-auth-v1-foundation-smoke.mjs`: 10 PASS / 0 FAIL.
- `node scripts/frontend-connected-planner-gate.mjs`: 11 PASS / 0 FAIL.

The working Google flow remains conceptually:

Google button -> OAuth start -> backend Google callback -> one-time handoff fragment -> frontend handoff exchange -> backend cookie session -> session/profile hydration -> app/onboarding routing.

Do not rewrite the working handoff/session transport architecture. Frontend JavaScript must not store a raw backend session/access/refresh/id token.

## Audit findings accepted for this implementation

The preceding read-only audit established these current issues:

1. Google, Microsoft and Apple are all visible/actionable even though only Google should be active now.
2. `register` mode can invoke `__bisiPrepareFreshLocalRegistration()` and destructively clear local compatibility/account state even for an existing canonical user.
3. OAuth handoff writes onboarding-complete local flags unconditionally and post-auth routing does not consume backend durable onboarding authority.
4. The app shell can render before backend session resolution, and a stale `wabi.beta.session` may visually admit the user even after backend session says unauthenticated.
5. Frontend does not currently consume/render Google `avatarUrl` and only renders initials.
6. Late account-name refresh targets an obsolete header selector (`.titlebar-right`) while the current shell uses `.wabi-header-right`.

The user has additionally authorized the three audit items previously classified as optional improvements:

7. Validate the scheme/protocol of `avatarUrl` before rendering it.
8. Keep legacy local onboarding flags only as compatibility/cache state, always subordinate to explicit backend onboarding authority.
9. Preserve safe compatibility with older backend responses that omit newer onboarding/avatar fields, without inventing local identity or onboarding authority.

These items A–G below are the only implementation targets authorized by this task.

## Authorized implementation scope

### A. Google active; Microsoft + Apple visible but disabled

Make the smallest UI change so:

- Google remains the only clickable provider;
- Microsoft remains visible, disabled/non-clickable, and visibly marked `Pronto`;
- Apple remains visible, disabled/non-clickable, and visibly marked `Pronto`;
- keyboard activation/accessibility must not trigger disabled providers;
- disabled provider clicks must not call OAuth start or show an auth error;
- preserve current layout/design as much as possible;
- do not delete Microsoft/Apple provider plumbing just because their buttons are disabled.

Update the relevant local smoke test so it validates Google as the only active provider and Microsoft/Apple as disabled `Pronto` options rather than requiring Microsoft to be actionable.

### B. Login/Register are UX only — remove destructive register authority

On the active Google OAuth path:

- remove/disable the behavior where `mode === register` causes `__bisiPrepareFreshLocalRegistration()` or equivalent destructive account/local-state reset;
- keep Login/Register copy/mode only where needed for presentation/UX;
- both modes must enter the same Google OAuth identity-resolution path;
- after backend authentication, consume the canonical backend `user_id`; do not create or substitute a frontend-owned account id;
- preserve user-specific compatibility isolation based on canonical backend user identity where already required.

Do not broadly delete `__bisiPrepareFreshLocalRegistration()` if unrelated legacy flows still reference it. The required fix is to stop Login/Register intent from using it as account authority on the active Google path.

### C. Backend-owned onboarding routing

Frontend must stop automatically declaring onboarding complete after every successful Google handoff.

Required behavior when backend durable onboarding state is available:

- `onboardingStatus === "not_started"` -> route to the existing onboarding/import entry experience;
- `onboardingStatus === "in_progress"` -> preserve/resume onboarding behavior using backend state/current-step information already exposed and compatible with the existing UI;
- `onboardingStatus === "completed"` -> enter the app directly;
- authentication provider and Login/Register mode must never alter/reset backend onboarding state;
- do not merge the future interactive in-app tutorial concept with account onboarding.

Do not write `wabi.onboarding.flow.v3.completed = 1` or `wabi.onboarded = 1` merely because OAuth succeeded.

Legacy local onboarding flags MAY remain only as compatibility/cache state where genuinely necessary. They must never override an explicit backend onboarding status. If refreshed from backend state, they must reflect that authority rather than create a separate one.

### Backend-contract compatibility guard

This is a frontend-only local task. Do NOT change backend/DEV to obtain missing fields and do not expand this task into backend work.

The intended backend JSON contract uses frontend-consumable fields equivalent to `onboardingStatus`, `onboardingVersion`, `onboardingCurrentStep`, `tutorialVersionCompleted`, `displayName`, `avatarUrl` and canonical `userId`/`id` as actually returned by the session/profile endpoints.

If current local source inspection proves a required backend field is not available in the currently consumed contract:

- do NOT fabricate a local account/onboarding authority;
- preserve safe behavior for older backend responses rather than breaking existing authenticated users solely because a newly intended field is absent;
- do not translate “missing field” into automatic onboarding completion by initiative;
- use only the smallest compatibility behavior consistent with existing proven behavior and security;
- explicitly report the missing backend contract as a dependency at STOP;
- do not claim the onboarding/avatar behavior is fully live-validatable until the backend contract is actually available.

If resolving that dependency would require backend source edits, deploy, DEV changes, schema changes, secrets, or live environment work, STOP and report it. That work requires separate authorization.

### D. Eliminate auth/session flash and stale-session visual admission

Implement the smallest safe startup/session-resolution correction so authenticated app content is not shown before auth state is resolved.

Requirements:

- initial boot uses a neutral/auth-pending state rather than visibly rendering the authenticated app beneath/behind the entry flow;
- resolve backend `/auth/session` before deciding to show authenticated app vs entry/login UI;
- an authoritative backend unauthenticated/no-session response must invalidate stale compatibility auth markers such as `wabi.beta.session` and must not leave the app visually accessible;
- distinguish a confirmed unauthenticated response from a transient/network failure where the existing offline/error strategy requires different handling; do not turn every network error into destructive logout by initiative;
- preserve the existing secure cookie-based session model and CSRF handling;
- do not redesign the whole shell or create a new loading product experience; keep this correction minimal.

### E. Google avatar + initials fallback + URL safety

Google profile photo is part of the desired current UX and is authorized now.

Frontend must:

- consume `avatarUrl` from the backend session/profile contract when provided;
- validate the URL before rendering it and allow only a safe web-image protocol/scheme appropriate to the existing browser frontend (for example `https:`; do not render `javascript:`, `data:` or other unsafe/unintended schemes by default);
- treat a missing, malformed, unsafe-protocol, or unloadable avatar URL as unavailable and fall back cleanly to initials;
- persist/map only the non-secret profile value needed by existing compatibility/profile state;
- render the avatar in the current account/header/settings surfaces where the user identity avatar is shown;
- reveal/use the existing initials fallback if the image fails to load;
- do not upload/copy/store image binary data;
- do not invent avatar provenance rules in frontend; backend profile authority decides which avatar URL is canonical.

If the currently active backend contract does not yet provide `avatarUrl`, implement the safe frontend consumption/fallback path locally where possible and report the backend contract dependency rather than expanding backend scope.

### F. Fix late display-name refresh in current header

Correct the audited stale selector/target so profile hydration can refresh the current header/account UI using the actual current shell selector (`.wabi-header-right` or the smallest robust current equivalent).

Keep this change narrowly coupled to the existing account UI refresh. Do not redesign the header.

### G. Authorized compatibility improvements from the audit

The following three improvements were explicitly authorized by the user and therefore are NOT to be treated as deferred optionals in this task:

1. **Avatar protocol validation:** implement the URL safety/fallback behavior defined in E without adding a broad sanitizer framework or unrelated security refactor.
2. **Onboarding flags as subordinate cache only:** retain legacy local onboarding flags only where necessary for compatibility, and ensure explicit backend onboarding state always wins.
3. **Older backend response compatibility:** if `onboardingStatus` or `avatarUrl` is absent, preserve a safe non-destructive compatibility path. Missing fields must never cause frontend identity creation, destructive reset, false local onboarding authority, or a claim that backend behavior was validated when it was not.

G does not authorize any other optional cleanup, architecture rewrite, provider addition, backend change, or speculative feature.

## Explicitly out of scope

Do NOT:

- implement/expose Passwordless Email or OTP;
- configure Resend;
- add another authentication method;
- delete Microsoft/Apple provider internals merely because their UI is disabled;
- remove dormant `/auth/login` or `/auth/register` wrappers as cleanup;
- change the existing password-related mascot copy;
- redesign onboarding/tutorial UX;
- redesign the Login/Register page;
- change Founder rules;
- change backend source, D1, schema, DEV variables/secrets, Worker, or OAuth provider configuration;
- contact DEV/PROD for live validation;
- deploy/publish/change GitHub Pages;
- perform Git operations/commits/merges/branch movement from the local Codex task;
- touch `main` or PROD.

Any idea that is additional/optional/alternative beyond the explicitly authorized A–G scope must be reported as optional and left unimplemented unless separately authorized.

## Files

Modify only the minimum frontend files/tests necessary for A–G. Expected likely areas based on the audit include:

- `assets/js/bisi.js`
- `assets/js/auth-v1-oauth-handoff.js`
- `assets/js/auth-v1-foundation.js`
- `assets/css/bisi.css`
- `index.html` only if the minimal auth-pending boot guard genuinely requires it
- existing frontend auth smoke/regression scripts directly affected by these changes

This list is not permission to touch every listed file. If another file is strictly required for A–G, inspect first and explain why in the final report. Do not modify unrelated assets/config/package files.

## Required local validation

After implementation, run the smallest relevant local diagnostic sweep without changing code between gates.

At minimum:

1. `node scripts/frontend-auth-v1-oauth-handoff-smoke.mjs`
2. `node scripts/frontend-auth-v1-foundation-smoke.mjs`
3. `node scripts/frontend-connected-planner-gate.mjs`
4. any focused new/updated local smoke assertions needed to prove:
   - Google is active while Microsoft/Apple are disabled `Pronto`;
   - Login/Register do not trigger destructive fresh-registration reset on Google auth;
   - explicit backend onboarding status outranks local completion flags;
   - successful OAuth no longer unconditionally marks onboarding complete;
   - confirmed backend no-session clears stale compatibility auth state and prevents app display;
   - boot/auth-pending prevents authenticated-app flash before session resolution;
   - avatar URL validation rejects unsafe/unintended schemes and valid avatar rendering falls back to initials on absence/error;
   - an older backend response without new fields follows the safe compatibility path without inventing authority;
   - current header name refresh targets the current shell.

Do not contact DEV or run live browser QA in this task.

## Diagnostic sweep / STOP policy for this task

HARD STOP immediately for material scope/state risk, including wrong branch, unexpected modified files before work, edit failure leaving uncertain state, unauthorized Git/backend/DEV/PROD/deploy activity, secret exposure, or any partial/ambiguous mutation outside local frontend files.

For safe local diagnostics/tests only, independent gates may continue after a FAIL when later results remain trustworthy. Once the diagnostic sweep begins:

- do not fix code between gates;
- capture all natural FAIL output;
- distinguish root causes from cascades;
- if a failure makes later results unreliable, STOP immediately;
- after the sweep, STOP before any corrective patch and request new authorization for fixes.

## Current instruction to Codex

Codex must:

1. Work only in **Bisi Frontend** at `/Users/renatobibolotti/Downloads/BISI-LIVE/bisiapp`.
2. Read `AGENTS.md` first, then this `BISI_TASK.md` in full.
3. Confirm `auth-v1-oauth-handoff-02` without macOS system Git/Xcode/Apple Command Line Tools.
4. Confirm the working tree/task state is clean/expected before editing; otherwise HARD STOP.
5. Implement only A–G above with the smallest compatible patch.
6. Do not implement Passwordless or any optional cleanup/new feature beyond the three explicitly authorized audit improvements in G.
7. Do not modify backend, DEV, Pages, PROD, `main`, or Git state.
8. Run the required local diagnostic sweep after implementation without fixes between gates.
9. At completion, STOP and report:
   - files changed and why;
   - behavior implemented for A–G;
   - explicit confirmation that same backend canonical user identity is preserved and Login/Register no longer act as account authority;
   - any backend-contract dependency discovered for onboarding/avatar;
   - every local gate PASS/FAIL with grouped root causes/cascades;
   - any skipped checks and why;
   - confirmation that Passwordless, dormant wrappers, password copy, backend, DEV, GitHub Pages, local Git state, `main`, and PROD were untouched.
