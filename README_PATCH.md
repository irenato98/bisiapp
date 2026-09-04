# Frontend V6.4.11.1 — Planner write-through hook fix

`6.4.11.1-planner-write-through-hook-fix`

Connection 3. The planner keeps `wabi.v6` as its local safety copy, but normal calendar mutations now reconcile to the authenticated DEV backend after the local operation succeeds.


## Connection 3.1 fix

- Fixes a real-browser initialization-order bug found during D1 DEV verification.
- `BisiPlannerWriteThrough` was evaluated before the planner event bus defined `W.on`; the optional `W.on?.(...)` subscription therefore did nothing and normal UI mutations never queued a backend reconciliation.
- Planner operations now also emit an early-safe DOM event (`bisi:calendar-operation`), and write-through subscribes to that event during startup.
- Existing planner `W.emit('calendar-operation', ...)` behavior is preserved for later modules such as retention/analytics.
- The write-through smoke gate now asserts that the coordinator does not depend on the late `W.on` initialization.

## What changes

- Adds `BisiPlannerWriteThrough`, a serialized planner sync coordinator.
- Create, edit, move, complete, uncomplete, delete and delete-Undo trigger backend reconciliation.
- Reconciliation uses the full current local planner snapshot so recurrence side effects made by an operation are not reduced to a fragile single-field patch.
- Missing local activities are created in D1 DEV.
- Changed activities are patched with the complete current planner payload and day.
- Activities deleted locally are soft-deleted remotely only when their ids were already known to this planner session.
- An unexpected backend-only activity is **not deleted**. Sync stops in `needs-review` instead of overwriting another source silently.
- Every write batch is followed by a fresh `/api/tasks` verification read.
- Failed network writes leave the local planner intact and marked dirty for retry; `wabi.v6` is still the safety copy.
- No local activity is deleted by bootstrap or migration. Remote deletes only mirror an explicit local delete after the id was already known to this planner session.
- Delete → Undo keeps the same activity id; backend v0.9.1.2 can restore a soft-deleted id.

## Intentionally unchanged

- The frontend still applies planner changes locally first. Server-authority reload/conflict handling comes in later connection blocks.
- No D1 migration.
- No settings/Blocks/category source-of-truth migration in this patch.
- No recurrence backend rewrite; this block only transports the current planner snapshot produced by existing recurrence logic.
- Bisi AI v0.9 remains paused.
- New character images remain pending for the later visual frontend block.
- No PROD changes.
