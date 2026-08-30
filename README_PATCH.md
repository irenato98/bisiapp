# Frontend V6.4.5 — complete proposals + stable editing/scroll

`6.4.5-dev-ai-complete-proposals`

Continuation over the approved V6.4.4 frontend. General planner backend remains disabled (`backendEnabled=false`); Bisi AI continues using DEV only.

## Complete Create Activity proposal

A `create_card` proposal now exposes the same editable activity fields as **Crear Actividad**:

### Planificación
- Nombre
- Fecha
- Inicio / Fin for fixed time
- Tiempo estimado + Bloque for flexible placement
- Fixed-time Bloque stays read-only because it is derived from the time

### Detalles
- Prioridad
- Categoría / `#`
- Recordatorio
- Repetir, including custom every 1–12 day/week/month

### Contenido
- Nota
- Subtareas, with inline add/remove/edit

The selectors reuse the app's actual runtime sources (`PRIORITIES`, `W.CATS`, `REMINDER_VALUES`, `REPEAT_VALUES`) instead of maintaining a second list inside Bisi AI.

Reminder remains one visible selector, matching Crear Actividad. Internally Confirm mirrors it into the app's existing `reminders` array (`[]` or `[minutes]`).

## Proposal fidelity

- All visible create fields are sent through the immutable `/revise` flow.
- Confirm mirrors category, priority, reminder, repeat, recurrence start, notes and subtasks exactly into the local V6 planner after backend execution.
- Flexible proposals remain editable as **Tiempo estimado + Bloque** and are resolved to an exact free slot only when the user confirms.
- Unknown backend-enumerated values arrive as the backend's safe visible fallback and every proposal field remains editable.

## UX fixes

- Fixes the PM -> AM “changes, bounces back, then works on the second try” glitch by preventing stale proposal-revision responses from overwriting newer visible edits.
- Long Bisi responses no longer jump straight to the bottom. After the whole turn/proposals render, the message area smoothly aligns to the **start of the new Bisi turn**; it then leaves the user in control of reading/scrolling.
- Reduced-motion preference uses immediate positioning instead of smooth animation.
- Keeps V6.4.4 avatar sizing, triple blink, zero horizontal scrolling, vertical proposals and direct 24-hour time editing + AM/PM.

## Validation

```bash
node scripts/frontend-ai-dev-smoke.mjs
```

Expected static smoke for this patch: `69 PASS / 0 FAIL`.

## Safety

- No secrets/tokens added.
- `backendEnabled=false` remains unchanged.
- DEV Worker configuration remains unchanged.
- No planner V6 drag/drop, Today, Day/Week/Month, Focus, Racha, Complicidad or original planner timing behavior is intentionally changed.
