# Frontend V6.4.10.1 — Planner validity bootstrap

`6.4.10.1-planner-validity-bootstrap`

Connection 2.1. The DEV database currently contains historical malformed task rows with no calendar day and no activity name. They are not real planner activities and must not block the first safe local-to-backend migration.

## What changes

- `BisiPlannerBootstrap` now validates remote planner rows by contract:
  - stable id;
  - real `YYYY-MM-DD` day;
  - non-empty activity name.
- Historical malformed backend rows are ignored/quarantined during bootstrap rather than treated as a planner snapshot conflict.
- The bootstrap records `ignoredRemoteInvalid` for diagnostics.
- Local valid activities can now upload safely even if malformed historical DEV rows exist in the same account.
- If local planner is empty, invalid remote rows are never hydrated into `wabi.v6`.
- Backend-only **valid** activities still trigger the existing conflict protection when local already has data.
- Shared valid IDs with different payloads still trigger review; there is no silent overwrite.
- No local activity is deleted.

## Intentionally unchanged

- Create/edit/move/complete/delete are still local planner operations; write-through comes in Connection 3.
- `wabi.v6` remains the safety copy.
- No recurrence rewrite.
- No Block/category/settings migration in this patch.
- Bisi AI v0.9 remains paused.
- New character images remain pending for the later visual frontend block.
- No PROD changes.
