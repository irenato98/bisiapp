# Bisi Frontend — Codex Operating Rules

This file contains persistent operating rules for Codex when working in this public frontend repository.

## Instruction priority

1. `AGENTS.md` contains persistent safety rules.
2. `BISI_TASK.md` defines the current authorized task.
3. If `BISI_TASK.md` says `NO ACTIVE TASK`, do not modify, deploy, commit, push, merge, or run unrelated work.
4. If instructions conflict, choose the safer interpretation and STOP for clarification.

## Runtime authority

- The current repository root is the active frontend runtime.
- Historical/versioned folders are archive/history only unless a task explicitly says otherwise.
- Before trusting a test, confirm it exercises files from the current root rather than an archived copy.

## Mandatory FAIL gate

- The first FAIL, test error, command error, or materially unexpected result means **STOP**.
- Do not continue to the next gate after a FAIL.
- Do not automatically fix, refactor, reinstall dependencies, or widen scope after a FAIL unless the active task explicitly authorizes diagnosis/fixing.
- Report the exact failing command, first relevant error, relevant output, observed facts, and hypotheses separately.

## Scope discipline

- Work only inside the scope listed in `BISI_TASK.md`.
- Preserve validated behavior outside the task.
- Planner / Connection 10 is considered stable; do not reopen it without a demonstrated regression or explicit task scope.
- Do not initiate unrelated AI, analytics, onboarding, payment, or other future-feature work unless a task explicitly includes it.
- Do not add placeholder/TODO architecture for future features by initiative.

## Git / deploy safety

- Do not commit, push, merge, rebase, reset, force-push, delete branches, or switch branches unless `BISI_TASK.md` explicitly authorizes the specific operation.
- Do not deploy or publish by initiative.
- Production-affecting actions require explicit user authorization for that exact action.

## Security

- Never expose or commit secrets, tokens, credentials, private keys, session tokens, OAuth secrets, payment secrets, or internal-only configuration.
- Treat this repository as public: do not add confidential Bisi strategy, credentials, private operational details, or sensitive internal documentation.

## Working style

- Prefer the smallest correct change.
- Do not widen scope without authorization.
- State assumptions instead of inventing facts.
- If the safe next step is unclear, STOP and ask.

Always read `BISI_TASK.md` before acting.
