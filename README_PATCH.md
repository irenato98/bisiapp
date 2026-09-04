# Frontend V6.4.12 — Connection 4: server-authority reload

`6.4.12-server-authority-reload`

Connection 4 makes backend/D1 the canonical reload snapshot for the planner while keeping `wabi.v6` as a temporary local safety/fallback copy.

## What changes

- On a successful authenticated planner bootstrap, backend/D1 is the canonical reload snapshot.
- If local and backend are already aligned, the planner is still rebuilt from the fresh backend response so reload no longer depends only on `wabi.v6`.
- If backend has a newer/different snapshot and there are no signs of an unsynced local write, the backend snapshot replaces the in-memory planner and is persisted back to `wabi.v6` as the new safety copy.
- Before replacing divergent non-empty local state, Bisi writes a temporary local-only safety backup at `wabi.backend.planner.localSafety.v1`.
- If backend is empty and local has valid activities, the existing one-time local → backend migration remains available; after verification, the planner is hydrated back from backend so backend becomes canonical.
- Historical invalid DEV rows remain quarantined and never enter the planner.
- A prior backend-read fallback, failed write-through, interrupted write-through, or unexpected local-only activity stops in `needs_review` instead of silently discarding local changes.
- If the backend cannot be read, the planner remains usable from `wabi.v6` and is marked `local_fallback`; the local safety copy is not erased.
- Connection 3 write-through remains active after a successful canonical bootstrap; an unexpected backend-only activity is **not deleted** by write-through.

## Intentionally unchanged

- `wabi.v6` remains a temporary safety/fallback copy; it is not removed in this block.
- No D1 migration.
- No backend code change is required for Connection 4. Backend v0.9.1.2 already exposes the required planner-valid `/api/tasks` snapshot.
- No full multi-tab/stale-write conflict engine yet; that remains for the later sync/conflict roadmap block.
- No recurrence backend rewrite. Existing frontend recurrence behavior is transported as the current planner snapshot.
- Blocks, custom categories, reminders/settings source-of-truth work is still later.
- Bisi AI v0.9 remains paused.
- New character images remain pending for the later visual frontend block.
- No PROD changes.
