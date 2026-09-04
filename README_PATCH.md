# Frontend V6.4.17.2 — Connection 9.2: document language metadata guard

`6.4.17.2-language-metadata-guard`

Connection 9.2 closes a real browser-language metadata divergence observed after the settings hotfix: Bisi could be correctly running in Spanish (`data-wabi-locale="es-419"`) while an external browser/translation agent changed `<html lang>` to another language such as `fr`. Bisi now keeps the document language metadata aligned with the app's canonical locale.

## What changes

- `<html lang>` and `data-wabi-locale` are synchronized from the same canonical in-app locale (`en` or `es-419`).
- A `Content-Language` metadata tag follows the same locale.
- A lightweight `MutationObserver` repairs later external mutations of `lang` / `data-wabi-locale`, preventing browser translation heuristics from seeing a stale foreign language while Bisi is already localized.
- `pageshow` and foreground visibility also reassert the metadata after browser restore/navigation.
- Language persistence, theme, sounds, Blocks, timezone, planner authority, recurrence, multi-tab conflict handling and authority cleanup remain unchanged.

## Safety boundaries

- No automatic browser-translation suppression (`notranslate`) is added; unsupported-language users can still use browser translation if they choose.
- Backend v0.9.1.3 remains unchanged; no backend deploy or D1 migration is required.
- Bisi AI v0.9 remains paused.
- No PROD changes.

## Verification

The settings gate now includes a document-language runtime check that simulates an external mutation to `fr` and verifies Bisi restores `es-419`, then verifies an English switch reasserts `en`.

---

# Frontend V6.4.17.1 — Connection 9.1: settings consistency hotfix

`6.4.17.1-settings-consistency`

Connection 9.1 closes a real DEV settings race found before the planner E2E. **backend/D1 is the canonical settings authority**, but a newer local user choice must never be overwritten by an older backend hydration that finishes later.

## What changes

- Language changes are treated as an immediate user settings write. If an older profile read is still in flight, the newer local language wins the race, is persisted, and then backend authority resumes.
- Backend-driven locale hydration applies the UI language without re-enqueuing itself as a fresh local edit, preventing write loops and snap-back behavior.
- Dark/light `theme` joins the backend-synced preferences. Existing users perform one safe authority-v2 settings migration: established remote language/sounds/Blocks remain authoritative, while a missing remote theme is filled from the current local theme.
- Backend theme hydration updates the live UI without creating a second user write. User theme changes write through the same settings authority coordinator.
- Display-name and profile GET/PATCH responses now refresh the frontend profile snapshot immediately, so later consumers do not read an older cached locale/name/timezone.
- Custom Blocks remain backend-synced; their existing behavior is unchanged. Sound preferences and timezone remain covered by the same settings authority.
- Browser notification permission remains device-local and is never promoted to cross-device backend authority.

## Safety boundaries

- No planner task contract changes.
- Backend v0.9.1.3 remains unchanged; no backend deploy or D1 migration is required.
- Bisi AI v0.9 remains paused.
- No PROD changes.

## Verification

The settings runtime gate now covers authority-v2 migration, backend theme hydration, language/theme/sound write-through, display-name + Block persistence, network fallback, and the exact stale-hydration race where Spanish previously snapped back to English.

---

# Frontend V6.4.17 — Connection 9: planner authority cleanup

`6.4.17.1-settings-consistency`

Connection 9 retires the remaining duplicate planner-authority paths after Connections 4–8.1. **backend/D1 remains the canonical planner authority** whenever an authenticated backend read succeeds safely. `W.tasks` remains the live in-memory UI model and `wabi.v6` remains an owner-scoped safety/fallback snapshot; neither is promoted back into a second server authority.

## What changes

- The legacy AI planner shadow synchronizer is removed. The frontend no longer performs a second `GET/PATCH/POST /tasks` cycle through AI transport to copy `W.tasks` into the same canonical task store.
- The legacy AI-only task mutation helpers (`aiListTasks`, `aiCreateTask`, `aiUpdateTask`) are removed from the frontend API surface so they cannot bypass Connection 8 optimistic concurrency.
- Existing-activity AI turns may still send canonical activity IDs derived from the already hydrated planner runtime. No planner payload is re-uploaded merely to prepare an AI turn.
- After an AI proposal Confirm executes on the backend, the frontend no longer creates/moves/reprioritizes a second local mirror. It refreshes through `BisiPlannerWriteThrough.refreshFromBackend('ai-confirm-backend-authority')` so the verified server representation becomes the UI state.
- If a normal local write or planner interaction is temporarily active, the AI post-confirm refresh waits briefly instead of overwriting local work.
- Proposal/revise/resolve/confirm/cancel and AI chat transport remain present for the later AI-resume phase; Bisi AI v0.9 remains paused during planner integration.

## Safety boundaries

- `W.tasks` is still required as runtime UI state. This block does not replace the planner renderer with direct network reads.
- `wabi.v6` remains the per-user recovery/fallback snapshot established in Connection 7.
- Connection 8/8.1 optimistic concurrency, stale-tab rollback and `needs-review` protections remain unchanged.
- Recurrence, settings authority and per-user local-state isolation remain unchanged.
- No automatic deletion of unknown backend activities is added.

## Backend / deployment

Backend v0.9.1.3 remains unchanged. No backend deploy and no D1 migration are required for Connection 9. Bisi AI v0.9 remains paused. No PROD changes.

## Verification

The consolidated runner adds an **Authority cleanup** gate. It verifies that the legacy AI task shadow transport and local execution mirror are absent, while canonical planner hydration, write-through, conflict control, AI candidate IDs and backend-refresh-after-confirm remain wired. Any FAIL stops the block.

---

# Frontend V6.4.16.1 — Connection 8.1: automatic stale-conflict recovery

`6.4.16.1-conflict-auto-recovery`

Connection 8.1 keeps **Backend v0.9.1.3** optimistic concurrency unchanged and improves the frontend behavior after a stale-write conflict. backend/D1 remains the canonical planner authority. A stale tab still never overwrites a newer backend version.

## What changes

- Same-activity stale conflicts now resolve automatically with **remote/backend wins** instead of leaving the tab stuck in `needs-review`.
- The stale local value may appear briefly while the async write is being checked, but once Bisi sees the conflict it rolls the affected activity back to the current backend version automatically.
- The toast now says clearly that the stale change was **not saved** and that Bisi loaded the latest version from the other tab/device.
- Edit-vs-delete and delete-vs-edit stale conflicts use the same safe remote-wins recovery; an old tab cannot resurrect or erase a newer remote state.
- A 409 that happens in the small read→write race is also auto-resolved from a fresh backend snapshot.
- A persisted Connection 8 `needs-review` whose reason is specifically `stale-write-conflict` is auto-recovered after reload, so users do not need a manual console repair.
- Other safety reviews (missing baseline, unexplained local drift, unknown conditions) still remain in `needs-review`; this patch does **not** make generic conflicts auto-accept.

## Verification

Run:

```bash
node scripts/frontend-connected-planner-gate.mjs
```

The sync-conflict runtime gate now verifies automatic rollback to the remote winner, backend-409 recovery, stale delete recovery, clear user messaging, and recovery of an old Connection 8 stale-write review marker.

## Intentionally unchanged

- Backend stays at v0.9.1.3; no backend deploy is required for 8.1.
- No D1 migration.
- Bisi AI v0.9 remains paused.
- No PROD changes.

---

# Frontend V6.4.16 — Connection 8: sync + stale-write conflict control

`6.4.16-sync-conflicts`

Connection 8 keeps **backend/D1 as the canonical planner authority** and closes the remaining multi-tab stale-write risk. It pairs with **Backend v0.9.1.3** optimistic concurrency in DEV. **backend/D1 is the canonical reload snapshot** whenever an authenticated read succeeds safely.

## What changes

- Each browser tab has a reload-stable planner tab id and its own recovery marker. A pending write in tab A no longer makes tab B protect a stale local snapshot.
- The write-through marker persists canonical baseline signatures before local mutations, so a later remote change can be distinguished from the local user's own change after reload.
- If the same activity changed both locally and remotely since the shared baseline, Bisi enters `needs-review` instead of overwriting either side.
- PATCH and DELETE carry the last observed `updatedAtServer`; Backend v0.9.1.3 enforces that version atomically in D1 and returns HTTP 409 if another client won the race.
- Changes on different activities merge safely: the newer remote activity is hydrated while the unrelated local activity still writes through.
- A new unexpected backend-only activity is **not deleted**. Connection 8 treats it as a safe remote addition and hydrates it into the current planner.
- An idle tab refreshes from backend on cross-tab sync signals, focus, visibility return and network recovery.
- Cross-tab hydration pauses while an activity editor, modal, focus overlay or drag interaction is active, so backend refresh cannot rewrite planner state underneath a stale open form.
- Duplicated tabs that inherit the same session-scoped tab id rotate to a new id when they detect each other, preserving per-tab recovery isolation.
- A stale local delete cannot erase an activity that another tab edited after the common baseline.
- `acceptRemoteConflicts(ids)` is a strict conflict-resolution API for reviewed ids only; accepting remote refreshes only those conflict ids and then resumes normal reconciliation.
- Local unexplained drift without a pending mutation still stops safely instead of being erased.

## Backend contract

Backend v0.9.1.3 adds optimistic concurrency to task PATCH/DELETE using the existing D1 `updated_at` value. No D1 migration is required. Calls without an expected version retain legacy behavior for compatibility, while Connection 8 always uses the expected version for normal planner updates/deletes.

## Verification

Run one frontend command:

```bash
node scripts/frontend-connected-planner-gate.mjs
```

The consolidated runner now includes the sync-conflict source + runtime gate. Runtime coverage includes same-activity conflicts, different-activity safe merge, remote additions/deletions, backend 409 race protection, stale delete protection, explicit remote conflict acceptance and per-tab recovery baselines.

Backend DEV is verified separately with `npm run patch:connection` before deploy and `npm run connection:dev` after deploy.

## Intentionally unchanged

- No D1 migration.
- Bisi AI v0.9 remains paused.
- New character images remain pending for the later visual frontend block.
- No PROD changes.

---

# Frontend V6.4.15 — Connection 7: per-user local-state cleanup

`6.4.15-local-state-cleanup`

Connection 7 keeps the planner behavior validated in Connections 1–6, while reducing the remaining authority of the browser copy. **backend/D1 remains the canonical planner authority** whenever an authenticated backend read succeeds safely. `wabi.v6` is now explicitly an owner-tagged safety/fallback snapshot, not a cross-account source of truth.

## What changes

- `wabi.v6` now records the backend `ownerUserId` for the planner snapshot.
- Planner authority is established with a durable **per-user** sentinel after a verified backend hydration or a verified one-time legacy migration.
- If a browser snapshot belongs to a different backend user, Bisi quarantines it locally and never uploads it into the current account.
- Once backend authority has already been established for the current user, stale `local-only` residue is backed up and pruned instead of blocking reload or being silently re-uploaded.
- If that established user's backend is intentionally empty, stale local residue is backed up and cleared rather than repopulating D1.
- A legacy unowned planner is still handled conservatively: when backend is empty and authority has never been established, Bisi may migrate it once, verifies the resulting backend snapshot, and then claims the browser copy for that backend user.
- Pending/interrupted writes and `needs-review` recovery remain protected, but their markers are now scoped to the backend user. A marker from another account cannot override the current user's backend authority.
- Foreign snapshots are retained in `wabi.backend.planner.quarantine.v1` for safety/debugging; they are not merged into the active planner.

## Safety boundaries

- No automatic deletion of unknown remote activities was added.
- Existing durable delete-intent and recurrence protections from Connection 5.3 remain unchanged.
- Local fallback remains available when the backend cannot be reached.
- Connection 6 settings authority remains unchanged.
- Bisi AI v0.9 remains paused.
- No backend code change or D1 migration is required.
- No PROD changes.

## Verification

The consolidated connected-planner runner now includes a Connection 7 source gate and runtime gate. Runtime coverage includes: same-browser account switching, established-authority stale residue cleanup, one-time legacy migration, current-user pending-write recovery, and rejection of foreign recovery markers. Any FAIL stops the block.

---

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
