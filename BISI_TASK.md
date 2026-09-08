# BISI TASK — Frontend

STATUS: ACTIVE TASK
BLOCK: Auth V1 Durable Onboarding Frontend 05
BRANCH: auth-v1-onboarding-durable-05
BASE: b92333b8492a43151f0a853b75ab82f664c095c7
ENVIRONMENT: LOCAL FEATURE BRANCH ONLY
PROD: FORBIDDEN

## Objective

Connect the existing frontend onboarding flow to the durable backend authority. This block is required to close the new-user flow.

Do not redesign onboarding, build a new tutorial, or add visual polish. Keep the old post-onboarding tutorial separate and unchanged unless a minimal isolation correction is strictly necessary.

## Backend authority

The backend is authoritative for:

- `not_started`
- `in_progress`
- `completed`
- `onboardingCurrentStep`

Preserve the current routing contract:

- `completed` -> app;
- `not_started` -> existing onboarding;
- `in_progress` -> existing onboarding, resuming the durable current step when it maps safely to a real current step.

Historical local onboarding flags may remain only as compatibility for older backend responses. They must never override an explicit backend `onboardingStatus`.

Login/Register remain UX intent only and must not change onboarding or canonical backend identity.

## Authorized implementation scope

Implement only:

1. Add the minimal `BisiBackend.updateOnboarding(patch)` client operation using the existing authenticated request/session/CSRF path and `PATCH /me/onboarding` (resolved by the existing API base to `/api/me/onboarding`).
2. Expose the operation from `BisiBackendConnection` through `withSession`, consistent with existing authenticated writes.
3. Persist `status: "in_progress"` when a `not_started` user actually begins the existing onboarding.
4. Persist the stable current step when the existing onboarding begins or advances to another relevant real step.
5. Resume an `in_progress` user at `onboardingCurrentStep` when it maps safely to the current onboarding.
6. Persist `status: "completed"` when onboarding finishes, or when an existing legitimate Skip action completes onboarding.
7. Do not enter the app or write local completed flags until the completed write is confirmed by the backend.
8. If the completed write fails, do not fabricate local success; use the existing error mechanism and keep onboarding active.
9. Reflect the updated backend onboarding response in the frontend snapshot/state where required by the current architecture.
10. Add focused local regression coverage and run the required local gates.

Do not send an unnecessary completed PATCH for a historical user whose backend already returns `completed`.

## Tutorial separation

`tutorialVersionCompleted` and the old post-tour are separate product state. Do not connect onboarding completion to:

- `wabi.postonboarding.video.v3.completed`

Completing onboarding must not complete the tutorial, and completing the tutorial must not complete onboarding.

## Compatibility and network behavior

- A confirmed backend no-session response may clear stale local auth compatibility state.
- A network error must not become destructive logout.
- A failed onboarding write must not create local success.
- Do not create another onboarding model or frontend authority.
- Do not duplicate authentication or CSRF logic and do not expose tokens.

## Expected file scope

Inspect before editing and modify only the minimum required files. Expected areas:

- `assets/js/bisi.js`
- `assets/js/auth-v1-foundation.js`
- `assets/js/auth-v1-oauth-handoff.js` only if inspection proves it strictly necessary
- one focused durable-onboarding smoke/regression script
- this `BISI_TASK.md`

Any additional file requires a strict in-scope justification. Do not modify unrelated assets, configuration, archived/versioned copies, or package files.

## Explicitly out of scope

Do not implement or modify:

- onboarding redesign, tutorial redesign, copy polish, animation, visual polish, or generic workflow architecture;
- Passwordless, email OTP, Resend, Microsoft, or Apple;
- AI or planner behavior;
- payments;
- backend source, schema, D1, Cloudflare, secrets, or provider configuration;
- DEV live, live browser QA, GitHub Pages, deploy, publish, or PROD;
- Git commit, push, merge, rebase, reset, branch switch, or Publish branch.

Do not contact backend, DEV, or PROD during this task.

## Focused regression requirements

Add `scripts/frontend-auth-v1-durable-onboarding-smoke.mjs` or the smallest equivalent current-root runner covering at least:

- `PATCH /me/onboarding` exists;
- it uses the existing authenticated connection/CSRF path;
- `not_started` shows onboarding;
- beginning onboarding persists `in_progress`;
- advancing persists `currentStep`;
- backend `in_progress` resumes a safe durable step;
- finalization sends `completed` and waits for backend success;
- failed completed persistence does not open the app or set local completion;
- backend `completed` enters the app without an unnecessary PATCH;
- explicit backend status outranks local flags;
- tutorial/post-tour state remains separate and untouched.

Before trusting a test, confirm it exercises the current repository root rather than an archived copy.

## Required local diagnostic sweep

After all edits are complete, run without code changes between gates:

1. `node scripts/frontend-auth-v1-durable-onboarding-smoke.mjs`
2. `node scripts/frontend-auth-v1-oauth-handoff-smoke.mjs`
3. `node scripts/frontend-auth-v1-foundation-smoke.mjs`
4. `node scripts/frontend-backend-connection-smoke.mjs`
5. `node scripts/frontend-connected-planner-gate.mjs`

The first FAIL, test error, command error, or materially unexpected result means STOP under `AGENTS.md`. Do not repair between gates.

## Mechanical apply_patch retry

One automatic retry is allowed only for a purely mechanical `apply_patch` context failure when the failed attempt applied no changes, targets the same file, preserves the same intent, and does not widen scope.

A partial or ambiguous patch result requires immediate HARD STOP.

## HARD STOP conditions

Stop before further mutation if:

- branch or base is incorrect;
- task state is inconsistent;
- unexpected local modifications or an out-of-scope file are found;
- the implementation requires an auth architecture rewrite, backend work, migration, secrets, live DEV/PROD access, or deployment;
- a failure requires onboarding redesign;
- any edit leaves uncertain or partial state.

## Completion report

At completion, STOP and report:

- files modified and why;
- the backend client and connection wrapper added;
- where `in_progress` is persisted;
- how `currentStep` is persisted and resumed;
- how backend-confirmed `completed` is enforced;
- behavior when completion persistence fails;
- confirmation that tutorial/post-tour remains separate;
- exact PASS/FAIL result of every gate;
- optional work noticed but not implemented;
- confirmation that no commit, push, Publish branch, deploy, Pages, backend change, DEV live, live browser QA, or PROD action occurred.
