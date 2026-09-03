# Frontend V6.4.8 — Functional stable sync

`6.4.8-functional-stable-sync`

Clean re-baseline of the known-good V6.4.7 frontend.

This package intentionally does **not** carry the exploratory `V6.4.7.1-ai-shadow-state-recovery` branch. That branch was created while diagnosing `candidateTaskIds: []`, but the manual test later established that Reporte/Gym were new labels, so the empty candidate list was correct and that branch was not a valid product fix.

## What is preserved

The V6.4.7 functional behavior is preserved:
- Weight/Peso semantics
- Prioritize recommended-order rendering
- compact proposal UI
- existing-card diffs
- no More details expander
- proposal Confirm/Cancel and immutable revise
- flexible/fixed proposal editors
- local planner shadow sync
- candidate-ID dedupe
- creation auto-scroll / centering
- Today centering and scroll restoration
- drag/drop + drag autoscroll
- Day / Week / Month
- Today, Racha, Complicidad and Modo Foco behavior already present in this baseline

No branding/copy cleanup is mixed into this functional stabilization package. Beta/™/historical Wabi copy remain a separate later block.

## Why the version advanced

Only to give the repository a clear current frontend source of truth after the abandoned V6.4.7.1 experiment. Product logic is the stable V6.4.7 code.

## Validation

Run:

```bash
node --check assets/js/bisi.js
node scripts/frontend-ai-dev-smoke.mjs
```

Expected:
- JavaScript syntax: 0 errors
- frontend smoke: 0 FAIL
- smoke explicitly proves the V6.4.7.1 experimental shadow recovery is absent

Package audit before delivery:
- `node --check assets/js/bisi.js`: PASS
- frontend smoke: `87 PASS / 0 FAIL`
- core `bisi.js`, `bisi.css`, and `index.html` are byte-identical to the stable V6.4.7 baseline; only the runtime version marker, smoke guard, and README changed

Use this frontend together with the current DEV backend. Production remains untouched.
