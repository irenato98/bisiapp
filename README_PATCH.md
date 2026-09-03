# Frontend V6.4.7.1 — AI shadow state recovery

`6.4.7.1-ai-shadow-state-recovery`

Small DEV-only frontend correction on top of approved V6.4.7, still paired with backend `0.8.30.2-priority-offer-deterministic`.

General planner backend remains disabled (`backendEnabled=false`). Bisi AI continues to use the DEV browser bridge and DEV Worker only. Production is intentionally untouched.


## V6.4.7.1 correction

- Fixes the browser case where the visible planner still has persisted activities but the live `W.tasks` object is unexpectedly empty when Bisi AI opens. While authenticated, the AI shadow can recover the canonical `wabi.v6` persisted task buckets before matching.
- The 40-task DEV bridge cap is now relevance-aware: activities named in the current message/recent chat context are placed first instead of blindly taking the first 40 by date key.
- Remote shadow cleanup compares against the full local activity ID set, so local activities omitted only because of the 40-task bridge cap are never incorrectly tombstoned.
- The request `candidateTaskIds` and the shadow sync use the same message-aware selection.

## Included in V6.4.7

- User-facing `Prioridad / Priority` is now `Peso / Weight` in the planner and Bisi AI UI. Internal compatibility fields such as `priority` remain unchanged.
- `Priorizar` remains a separate concept from `Peso`: recommended order renders as a compact ordered list in the chat, not as planner/proposal cards and without exposing Eisenhower quadrant labels as Weight.
- Recommended-order rendering deduplicates activities by the backend activity reference. Shadow candidate IDs are also deduplicated before AI requests.
- New-activity proposals are compact:
  - fixed: Name, Date, Start, End;
  - flexible: Name, Date, Estimated duration, Block;
  - optional fields appear only when that field was explicitly mentioned for that activity (`mentionedFields`).
- Invalid metadata fallbacks from the backend remain visible in the proposal because the affected field is preserved in `mentionedFields`.
- Existing move proposals show only changed scheduling fields as `old → new`, plus `Everything else stays the same.` / `Lo demás se mantiene igual.`
- Existing Weight proposals show the current Weight and proposed Weight as a diff, plus the unchanged-fields note.
- No `More details / Más detalles` expander was added.
- Existing proposal revise/Confirm/Cancel flow remains immutable; visible editable scheduling/create fields keep the existing revise endpoint behavior.
- Public Founder copy no longer exposes a numerical Founder limit, position or remaining slots. The Founder card is hidden unless backend entitlement explicitly confirms `founder === true`.
- Legacy user-visible `tarea` labels in the planner were normalized to `Actividad` where they referred to Bisi's own organizing unit.
- Stable V6 planner behavior is intentionally preserved: Day / Week / Month, Today, drag/drop, drag autoscroll, Modo Foco, Racha, Complicidad, timing behavior and the existing Bisi AI chat UX.

## Companion backend

DEV Worker expected:

`0.8.30.2-priority-offer-deterministic`

`https://bisiapp-backend-dev.renabiboovie.workers.dev`

No D1 migration is required by this frontend patch.

## Validation

Run from the repository root:

```bash
node --check assets/js/bisi.js
node scripts/frontend-ai-dev-smoke.mjs
```

Expected smoke result:

`90 PASS / 0 FAIL`

## Intentionally NOT included yet

These are separate later blocks and were not mixed into V6.4.7:

- removing visible `Beta` copy;
- removing `™`;
- Bisi AI predetermined phrase/personality audit;
- Wabi / StartUp Perú / ProInnóvate historical attribution rewrite;
- PWA/mobile setup;
- Quick Focus / Quick Timer;
- Growth marketing / pricing;
- Learn your time;
- system Web Push notifications after the tab/browser is closed;
- daily + monthly AI limits by plan.

## Safety / deployment notes

- No secrets were added.
- `backendEnabled=false` is unchanged.
- Bisi AI remains pointed at DEV only.
- PROD is untouched.
- Do not upload `node_modules` if one is ever created locally. This frontend patch does not require `npm install`.
