# Frontend V6.4.4 — priority UX + vertical chat fix

`6.4.4-dev-ai-priority-ux`

Built over V6.4.3 without changing the V6 planner core.

## Changes

- Bisi turn character is capped at 30px desktop / 28px mobile and keeps one reserved column per assistant turn.
- AI chat is vertical-only: no horizontal scrollbar; proposals and long copy shrink inside the message column.
- Triple blink remains one-shot and respects reduced-motion. Existing character assets only.
- Fixed proposal time fields display 24-hour values directly while AM/PM remains visible by product choice.
  - `3` + PM -> `15:00`
  - `3:30` + PM -> `15:30`
  - `15` -> `15:00`
  - missing minutes -> `:00` on blur
- Removed the per-field `24 h · 15:00` helper. A fixed proposal shows one note: `Las horas se muestran en formato de 24 h.`
- Fixed Block remains reference-only; flexible Block remains editable.
- Priority suggestions render above creation proposals for `create_and_prioritize`.
- Explicit `set_priority` proposals can be reviewed and Confirmed/Cancelled without turning the chat into a second planner.
- Confirmed create/move/priority actions mirror the exact backend priority into the local V6 planner.
- Beta notice, ephemeral chat, DEV bridge auto-reconnect and individual immutable proposal revision are preserved.

## Invariants

- `backendEnabled=false`; only Bisi AI points to DEV.
- no secrets in frontend.
- no changes to V6 drag/drop, Today, Day/Week/Month, Focus, scroll restoration or original planner timings.
