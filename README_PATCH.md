# Frontend V6.4.6 — existing-card follow-ups + compact paragraphs

`6.4.6-dev-ai-followups-paragraphs`

Continuation over V6.4.5. General planner backend remains disabled (`backendEnabled=false`); Bisi AI remains DEV-only.

## Fixes

- Existing-card priority/move follow-up turns now keep shadow candidate IDs active when the recent ephemeral chat context is about prioritizing or moving cards.
- Broadens the initial shadow trigger so natural commands such as `Prioriza Reporte y Gym` do not depend on a narrow phrase like `prioriza esta...`.
- Bisi assistant text now renders explicit blank-line paragraph breaks as real compact paragraphs:
  - one avatar per Bisi turn;
  - 9px between paragraphs;
  - no extra giant blank line;
  - ordinary short messages remain one paragraph.
- This pairs with backend v0.8.28 copy, where a long pure-text response may use at most two paragraphs.
- Keeps V6.4.5 proposal editor, stable AM/PM editing, smart scroll-to-turn-start, vertical-only chat, avatar sizing, beta notice and ephemeral history behavior.

## Validation

```bash
node scripts/frontend-ai-dev-smoke.mjs
```

Expected: `71 PASS / 0 FAIL`.

## Safety

- No secrets added.
- `backendEnabled=false` unchanged.
- DEV AI Worker only.
- No intentional changes to planner V6 drag/drop, Today, Day/Week/Month, Focus, Racha, Complicidad or planner timing behavior.
