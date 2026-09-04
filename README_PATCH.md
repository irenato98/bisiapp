# Frontend V6.4.13.1 — Connection 5.1: reload-safe pending writes

`6.4.13.1-reload-safe-write-through`

Connection 5 connects the planner recurrence model to the same backend/D1 source of truth already validated in Connections 1–4. Backend v0.9.1.2 remains unchanged because `/api/tasks` already stores and returns the complete activity payload.

As established in Connection 4, **backend/D1 is the canonical reload snapshot** for the planner whenever the authenticated backend read succeeds safely.

## What changes

- Recurring roots keep `repeat`, `recurrenceStart`, `recurrenceSeriesId`, `recurrenceUntil` and `recurrenceExceptions` in the canonical task payload.
- Generated occurrences carry `recurrenceGenerated`, `recurrenceRootId`, `recurrenceSeriesId` and `recurrenceForDate`.
- New generated occurrence IDs are deterministic from series + calendar date, so the same untouched occurrence does not receive a different identity merely because the browser reloaded before it was transported.
- When Day/Week/Month projection creates or refreshes recurrence occurrences, the planner emits a `recurrence-projected` mutation and Connection 3 write-through reconciles the resulting snapshot with D1 in one debounced batch.
- Editing a generated occurrence preserves the existing split semantics: the selected occurrence becomes independent while the future series remains linked correctly.
- Moving a generated occurrence keeps the selected item independent at the new date instead of silently moving the entire series.
- Deleting one generated occurrence records its date in the root `recurrenceExceptions`; deleting a recurring root removes the series projection; Undo restores the prior root exceptions and rows.
- Completing/uncompleting an occurrence remains a normal persisted activity mutation.
- Series-owned edits continue to synchronize already materialized children and are persisted by the full-snapshot write-through reconciliation.
- Connection 4 server-authority reload remains in force: after reload, D1 is canonical and recurrence is projected from the canonical roots/materialized occurrences.
- Connection 3 write-through safety remains unchanged: an unexpected backend-only activity is **not deleted** automatically; synchronization stops for review.

## Faster verification

Run one command:

```bash
node scripts/frontend-connected-planner-gate.mjs
```

It runs JavaScript syntax plus the existing AI isolation, backend connection, bootstrap, write-through and new recurrence gates. Any failing gate stops the block.

## Intentionally unchanged

- No backend code change or D1 migration is required in Connection 5.
- `wabi.v6` remains a temporary safety/fallback copy.
- No multi-tab/stale-write conflict engine yet.
- Blocks/custom categories/settings source-of-truth work remains later.
- Bisi AI v0.9 remains paused.
- New character images remain pending for the later visual frontend block.
- No PROD changes.


## Connection 5.1 reload-safety fix

A planner mutation is now marked as `pending` durably before the write-through debounce starts. If the page reloads while that write is still pending/interrupted, bootstrap preserves the local safety snapshot long enough for write-through recovery instead of replacing it with an older D1 snapshot. The write-through marker also retains the previously known backend IDs so a pending delete can still be recognized as a delete after reload; unexpected backend-only activities remain protected and still stop for review.

This specifically closes the observed real-browser race where the final recurrence occurrence delete could be lost if Cmd+R happened immediately after the delete. It applies to all planner mutations, not just recurrence. Backend v0.9.1.2 remains unchanged. PROD remains untouched.
