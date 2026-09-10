# BISI TASK — Frontend

STATUS: ACTIVE TASK
BLOCK: Planner Core Stabilization 01
BRANCH: MANAGED EXTERNALLY IN GITHUB DESKTOP
ENVIRONMENT: LOCAL FRONTEND WORKSPACE ONLY
PROD: FORBIDDEN

## Objective

Preserve the stable functional behavior of Planner V6 while making its mutable UI state safe when backend/D1 remains the persistent authority.

The canonical, permanent Card identity is `task.id`. A `dayKey` or bucket key is only the Card's current location.

Persistent UI must not depend on retaining an old JavaScript Card object after backend hydration reconstructs `W.tasks`.

## Required invariants

Do not remove or weaken:

- backend/D1 authority;
- optimistic concurrency and `expectedUpdatedAtServer`;
- ownership/user scoping;
- pending-delete protections;
- local safety snapshots;
- conflict handling;
- reload recovery;
- cross-tab protections.

Do not broadly refactor Planner.

## Authorized implementation scope

### A. Current Card lookup

Introduce or reuse one minimal central helper that resolves the current Card by canonical ID across all `W.tasks` buckets, independent of its present day key.

### B. Focus

`openFocusMode` must retain the Card ID and resolve the current Card by ID whenever mutable state is read or written after hydration.

Apply this to:

- Start and Pause;
- live timer state;
- subtask toggle, edit, add and delete;
- notes;
- complete and uncomplete;
- estimate-alarm state.

Timer-only changes involving `timerRunning`, `timerSecs`, `timerStartedAt`, `actual`, or `estimateAlarmFired` must emit and persist a valid Planner operation and survive write-through/reload.

### C. Interaction-safe hydration

Backend verification remains required and baselines/versions must stay correct.

A verified snapshot produced after this tab's own write must not reconstruct `W.tasks` while editor, focus, or drag interaction is active. The UI must converge to the verified backend snapshot once safe, without creating stale local authority, sync loops, or hiding real conflicts.

### D. Drag and drop

Keep drag state keyed by Card ID.

A pending write-through must not end an active drag, remove/reinsert its Card, or make its drop invalid through hydration.

After drop, resolve the Card again by ID, apply and persist the movement, and avoid rebound except for a real conflict.

### E. Recurrence and structural delete intent

Do not weaken protection against deleting unknown backend Cards.

When recurrence operations remove materialized local occurrences, carry those IDs explicitly into write-through as structural delete intent, distinct from manual deletes and remote-unknown Cards.

Required product behavior for an old weekday series when selecting No repetir from a current or future occurrence:

- preserve prior history;
- keep the selected occurrence as a normal Card;
- remove future generated occurrences locally and from D1;
- preserve previously detached occurrences;
- do not require editing the historical root.

Editing or moving one occurrence detaches only that occurrence; valid future recurrence continues and past history remains unchanged.

## Required runtime tests

Add functional runtime tests, not only static source checks, covering at minimum:

Focus:
- Start -> sync -> Pause -> sync -> Start;
- subtask off -> on -> sync -> off;
- notes during sync;
- timer persistence.

Drag:
- pending sync -> active drag -> sync completes -> drag continues;
- drop -> sync -> no rebound;
- reload preserves position.

Repeat:
- old series -> current occurrence -> No repetir -> sync -> reload -> future remains absent;
- detached occurrence survives the cut;
- moving one occurrence detaches only it;
- structural delete intents cannot delete remote-unknown Cards.

Conflicts:
- retain remote-wins only for real conflicts already covered;
- do not create a false conflict in one tab.

## Regression boundaries

Do not change:

- Day, Week, Month, Today, drag autoscroll, Blocks;
- Todos, Pendientes, Hechas;
- creation/edit semantics and fixed/flexible placement;
- design, languages, themes, sounds;
- Auth/OAuth;
- onboarding/tutorial;
- Racha, Complicidad, Bisi IA.

## File scope

The approved implementation scope is limited to:

- `assets/js/bisi.js`;
- directly related test runners under `scripts/`;
- this `BISI_TASK.md`.

If another functional file is required, HARD STOP before modifying it.

Functional references may be compared only when useful:

- tag `prebackend-final` / appVersion `6.2-prebackend-final`;
- commit `b63a807432c2528a9c9fc7efcce860ad2bfe1b22` / `V6.4.8-functional-stable-sync`.

Do not use Git to access those references.

## Verification

Run the new runtime regressions and all existing Planner-related local gates without installing packages.

The first FAIL, test error, command error, materially unexpected result, or uncertain edit requires STOP under `AGENTS.md`. Do not repair between gates once the final diagnostic sweep begins.

Visual checks requiring screenshots are `MANUAL DEV QA / NOT RUN`; do not request Screen Recording.

## Explicitly prohibited

Do not:

- use any Git command;
- commit, push, pull, merge, switch branches, or modify Git state;
- install packages, Xcode, or Apple Command Line Tools;
- use sudo or change system configuration;
- use Screen Recording, screenshots, or Computer Use;
- modify backend, D1, Cloudflare, PROD, Auth/OAuth, onboarding/tutorial, AI, payments, or design;
- widen scope without authorization.

## HARD STOP

Stop if another functional file is required, a safe implementation needs backend/schema/infrastructure work, an unexpected modification appears, or a condition makes the authorized local implementation unsafe.

## Completion report

Report:

- root causes;
- files and functions modified;
- new runtime tests;
- complete test results and any checks not run;
- concise per-function diff;
- remaining risks;
- confirmation that prohibited systems and out-of-scope product areas were untouched.

Do not commit. STOP after local implementation and verification.
