# BISI TASK — Frontend

STATUS: ACTIVE TASK
BLOCK: OAuth Success URL Cleanup
BRANCH: main
ENVIRONMENT: LOCAL / DEV FIRST
PROD: FORBIDDEN UNTIL DEV VALIDATION AND EXPLICIT PROMOTION AUTHORIZATION

## Objective

Clean Bisi-owned temporary OAuth success parameters from the visible frontend URL after authentication has been successfully established.

Example final PROD behavior:

https://app.getbisi.app/?auth=success&provider=google

must become:

https://app.getbisi.app/

without changing origin, pathname, authenticated session, cookies, onboarding, tutorial state, or backend behavior.

This rule is provider-agnostic. It must not be hardcoded only for Google.

## Product contract

After a completed OAuth success flow:

- remove the temporary `auth` parameter;
- remove the temporary `provider` parameter;
- preserve every unrelated legitimate query parameter;
- preserve the current pathname;
- preserve the current origin/hostname;
- preserve unrelated URL fragments/hashes;
- do not trigger an unnecessary navigation or OAuth restart.

For example:

https://app.getbisi.app/?foo=123&auth=success&provider=microsoft

must become:

https://app.getbisi.app/?foo=123

The final Bisi application origin remains:

https://app.getbisi.app

Do not redirect to:

- https://getbisi.app
- https://api.getbisi.app
- any other hostname.

## Security / auth invariants

Do not:

- expose, move, read, or modify session tokens;
- modify HttpOnly cookie architecture;
- change OAuth callback URLs;
- change OAuth provider configuration;
- change backend authentication behavior;
- modify CSRF behavior;
- clean the URL before authentication state is safely established if doing so would break the current flow;
- remove arbitrary query parameters;
- remove arbitrary hashes/fragments;
- break the DEV OAuth handoff;
- change the existing `auth=error` behavior.

Use the smallest correct frontend-only change.

## Expected implementation area

Inspect first.

Primary expected file:

- `assets/js/auth-v1-oauth-handoff.js`

Only inspect or modify another frontend file if strictly necessary and clearly justified.

Do not modify:

- backend repository;
- Cloudflare configuration;
- D1;
- OAuth secrets;
- frontend runtime PROD configuration;
- onboarding behavior;
- tutorial behavior;
- planner behavior;
- AI;
- payments;
- unrelated UI.

## Implementation plan

1. Inspect the existing OAuth URL cleanup and success handling.
2. Identify exactly why normal PROD-style OAuth leaves:
   - `auth=success`
   - `provider=<provider>`
3. Reuse the existing URL-cleanup mechanism where safe rather than creating parallel logic.
4. Apply the smallest provider-agnostic correction.
5. Preserve unrelated query parameters, pathname, origin and unrelated fragment state.
6. Verify the error path remains unchanged.
7. Verify the special DEV handoff remains unchanged.

## Acceptance criteria

The task is complete only if all applicable checks pass:

1. OAuth success parameters no longer remain visible after the successful flow is established.
2. The solution is not Google-specific.
3. `auth` and `provider` are the only relevant query parameters removed.
4. Unrelated query parameters survive.
5. The app hostname/origin does not change.
6. PROD contract remains `https://app.getbisi.app`.
7. No unnecessary page navigation/reload is introduced.
8. DEV handoff behavior is preserved.
9. `auth=error` behavior is preserved.
10. Session/cookies/CSRF are untouched.
11. Onboarding/tutorial behavior is untouched.
12. No backend or infrastructure change occurs.

## Verification / converge

After implementation, compare the resulting code against every acceptance criterion above.

Run only already-existing safe local frontend checks that are available without installing anything new.

The first FAIL, command error, unexpected modification, or uncertain behavior requires HARD STOP.

Do not repair unrelated failures.

Report:

- exact cause;
- files changed;
- exact diff;
- verification performed;
- PASS/FAIL for the acceptance criteria;
- remaining risks.

## Git / deploy

Do not:

- use Git commands;
- switch branches;
- commit;
- push;
- merge;
- deploy;
- publish;
- touch PROD.

GitHub Desktop is controlled manually by Renato.

After the local patch and verification, STOP for review before any commit.

## HARD STOP

Stop immediately if:

- current branch is not `main`;
- unexpected local changes exist;
- implementation requires backend changes;
- implementation requires OAuth configuration changes;
- implementation requires infrastructure or PROD access;
- more than the minimum frontend scope appears necessary;
- any partial or uncertain edit occurs.
