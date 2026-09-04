# Frontend V6.4.14 — Connection 6: backend settings authority

`6.4.14-settings-authority`

Connection 6 makes the existing account profile endpoint the source of truth for user settings. Backend v0.9.1.2 remains unchanged: `/api/me/profile` already persists `displayName`, `locale`, `timezone` and `preferences` in D1, so this block is frontend-only.

As established for the planner in Connection 4, **backend/D1 is the canonical settings authority** whenever the authenticated profile read succeeds safely. The local browser copy remains a fallback, not the primary authority.

## What changes in Connection 6

- Display name is hydrated from the backend profile and normal profile edits write through to D1.
- App language is canonical in the backend (`locale` + `preferences.language`) and is applied back to the live UI after reload.
- Sound preferences (`sound`, `soundProfile`, `focusSound`, `completeSound`, `deleteSound`) round-trip through backend preferences.
- Custom Block configuration from `wabi.blocks.v2` is stored under `preferences.plannerBlocksV2`; a backend hydration immediately reapplies it to the live planner runtime, not only to localStorage.
- Current IANA timezone is refreshed to the backend profile when the browser/device timezone changes.
- The first Connection 6 run is a one-time safe migration: existing remote preference values win when present, missing values are filled from the local settings copy, and an authority-version sentinel is written. After that marker exists, backend/D1 wins on reload.
- Subsequent local setting changes use debounced write-through and then hydrate the profile returned by the backend so the verified server representation becomes canonical.
- If profile transport is unavailable, local settings stay usable as a safety copy and are not erased.

## Intentional device-local boundary

The **browser notification permission remains device-local**. `Notification.permission` and the local `notifications` enablement flag are not treated as cross-device backend authority because one browser can allow notifications while another blocks them. The cross-device sound/language/Block preferences still sync normally.

Prototype integration toggles are also still local because no real external calendar/Notion account connection exists yet. Theme remains a local shell preference in this block. Product categories are still the fixed Bisi category set; Connection 6 does not invent a custom-category feature that the current UI does not expose.

## Faster verification

Run one command:

```bash
node scripts/frontend-connected-planner-gate.mjs
```

It now runs JavaScript syntax plus AI isolation, backend connection, planner bootstrap, planner write-through, recurrence and settings-authority gates. Any FAIL stops the block.

## Intentionally unchanged

- Backend v0.9.1.2 remains unchanged; no deploy and no D1 migration are required.
- Planner backend/D1 authority, recurrence recovery and durable delete intent from Connections 4–5.3 stay in force.
- `wabi.v6` remains a temporary planner safety/fallback copy until the later local-state cleanup block.
- No multi-tab/stale-write conflict engine yet.
- Bisi AI v0.9 remains paused.
- New character images remain pending for the later visual frontend block.
- No PROD changes.

---

## Previous baseline: V6.4.13.3 — Connection 5.3

`6.4.13.3-canonical-clearable-fields`

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


## Connection 5.2 durable delete-intent fix

The real-browser Connection 5.1 test exposed a second safety edge: after an immediate reload, a removed recurrence occurrence could be absent from the local safety snapshot while D1 still contained the older row. If that row was no longer present in `knownIds`, the conservative remote-only guard correctly stopped at `needs-review`, but it could not distinguish the user's own pending delete from a genuinely unknown remote activity.

Connection 5.2 records explicit delete intent durably at the moment the calendar emits `deleted`, before the debounce. The marker now preserves `pendingDeleteIds` across reload and reconciliation is allowed to delete a remote-only row only when it is either already known or explicitly present in that durable delete-intent set. Undo removes the corresponding intent. After a verified reconciliation, completed delete intents are cleared.

The safety rule remains strict: an unexpected backend-only activity with no known-id history and no explicit delete intent is **not deleted** and still stops in `needs-review`. An unresolved `needs-review` marker also protects the local safety snapshot across reload instead of allowing backend authority to overwrite it before review is resolved.

For the two DEV recurrence rows already stranded by the observed 5.1 race, the frontend exposes `BisiPlannerWriteThrough.approveReviewDeletes(ids)`. It accepts only IDs currently listed in the active `unknown-remote-activities` review; it cannot authorize arbitrary remote IDs. This is a one-time safe repair path for the current DEV test state and is not a weakening of normal automatic safety.

Backend v0.9.1.2 remains unchanged. Bisi AI v0.9 remains paused. No PROD changes.


## Connection 5.3 canonical clearable-field fix

Connection 5.3 closes the post-reload verification loop exposed by the real recurrence test. A generated occurrence can legitimately become an independent activity or a new series root; the local planner then removes projection-only lineage fields. The backend PATCH endpoint intentionally merges partial patches, so omitted keys previously survived remotely as stale metadata.

Planner write-through now sends explicit `null` tombstones for optional fields that the planner can remove (including recurrence projection lineage, recurrence bounds/exceptions, timer/transient placement fields, and nullable time/placement metadata). Canonical comparison treats `null` and an absent key as equivalent only for those optional fields. A non-null stale remote value still differs and is therefore corrected. This preserves useful D1 metadata while preventing stale lineage from being reintroduced on reload.

The durable delete-intent and unknown-remote safety rules from Connection 5.2 remain unchanged: an unexpected backend-only activity is **not deleted** automatically. Bisi AI v0.9 remains paused. No backend change, no D1 migration, and No PROD changes.
