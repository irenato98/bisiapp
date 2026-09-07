# BISI TASK — Frontend

STATUS: NO ACTIVE TASK
BLOCK: Auth V1 Passwordless Email 03 — SPEC READY / AWAITING BACKEND IMPLEMENTATION AUTHORIZATION
BRANCH: auth-v1-passwordless-email-03
ENVIRONMENT: DEV / FEATURE BRANCH ONLY
PROD: FORBIDDEN

## Predecessor

Auth V1 OAuth Handoff 02 is CLOSED and already passed real Google OAuth browser QA on the published frontend. This branch starts from the current frontend `main` after that work.

## Fixed product decisions

- Passwordless provider: Resend through backend only.
- User method: 6-digit email OTP.
- Session authority: backend session remains the only auth authority.
- Traditional password authentication: not allowed.
- Google remains enabled.
- Microsoft and Apple remain deferred / out of scope.
- PROD is out of scope for this block.
- `Login` vs `Register` is presentation/entry intent only. The frontend MUST NOT decide whether an account is new or existing.

## Identity and routing contract

- After OTP verification, trust backend identity resolution and session state.
- If the verified email already belongs to a Bisi user, the same `user_id` must be used regardless of whether the person entered through Login or Register.
- Never create, simulate, or infer a second local account in frontend state.
- Changing between OTP and Google must not reset profile, user data, or onboarding.
- New vs returning and onboarding status must come from backend durable authority, not the clicked entry button, auth provider, or legacy localStorage markers.
- A returning user with completed onboarding must go directly to the app once backend state is resolved.
- A truly new user must follow the intended new-user import/tutorial onboarding sequence according to backend state.
- App shell must not visibly flash behind entry/onboarding screens while auth + onboarding routing is unresolved; use a boot/loading gate when this routing is implemented.

## Passwordless UX target

Future authorized implementation should provide:

1. Email entry screen.
2. Submit to `POST /api/auth/email/start`.
3. Six-digit OTP entry screen.
4. Submit opaque challenge + code to `POST /api/auth/email/verify`.
5. Resend control with backend-provided/contracted cooldown behavior.
6. Clear invalid/expired/exhausted-code errors without leaking whether an account existed before verification.
7. On success, refresh backend session/profile and route from backend authority.
8. No session token storage in JavaScript/localStorage.
9. Legacy compatibility state, if temporarily required, remains cache/compatibility only and is never auth authority.

## Profile/name/avatar rules

- Frontend displays backend `displayName`; do not independently derive or persist a competing authoritative name.
- For a new OTP-only user, backend will initialize the visible name from the email local-part before `@` (example: `renatott89@gmail.com` -> `renatott89`).
- For Google users, display the full Google-derived name when backend provides it.
- Users may edit their display name in Bisi Settings regardless of whether they originally used Google or OTP.
- Once backend marks a display name as manually edited, future Google/OTP logins must not overwrite it.
- Display Google profile photo/avatar when backend provides one.
- If no avatar exists, use initials as fallback.
- OTP login must not remove an existing Google avatar.
- Manual avatar upload/edit is out of scope for this block.

## Provider entry UI

- Google remains a real provider.
- Microsoft and Apple must not be presented as usable authentication paths while deferred. Their existing legacy buttons/handlers must not create fake authenticated state.
- Email OTP becomes the non-Google passwordless path.

## Known auth UX constraints to address within/alongside this block

- Existing Google profile photo currently does not appear in the authenticated avatar; consume backend avatar support when available.
- Prevent the authenticated app-shell flash during entry/onboarding resolution.
- Fix post-auth onboarding routing so backend durable state, not Login/Register intent, determines new vs returning behavior.

## Validation expectations when frontend implementation is authorized

At minimum cover:

- existing Auth V1 foundation/OAuth handoff smoke tests;
- existing connected Planner gate;
- OTP email-start and code-entry UI smoke tests using mocked/controlled backend responses;
- Login entry + existing email -> returning session/routing;
- Register entry + existing email -> same returning session/routing, no duplicate/reset behavior;
- new OTP email -> backend-provided fallback display name;
- existing Google account -> OTP same email -> preserved Google/manual name and avatar;
- OTP-created account -> later Google same email -> same backend user and profile enrichment without overwriting manual name;
- no app-shell flash while routing is unresolved;
- Microsoft/Apple cannot create fake sessions;
- logout/refresh/relogin remain backend-authoritative.

## Publication rule

Work must remain on `auth-v1-passwordless-email-03` until explicit merge/publication authorization. Do not move frontend `main`, publish GitHub Pages, or merge by implication. Updating this feature branch is not authorization to publish it.

## Current instruction

There is NO authorized frontend implementation task yet. Backend contract/implementation should lead this block. This file only records the approved specification and feature branch setup.

Codex must:

1. Read `AGENTS.md` and this file.
2. Observe `STATUS: NO ACTIVE TASK`.
3. Do not modify frontend code yet.
4. Do not run tests by initiative.
5. Do not publish, deploy, merge, or change GitHub Pages.
6. Do not perform Git operations.
7. Do not invoke macOS system Git or anything requiring Xcode / Apple Command Line Tools.
8. Do not touch PROD.
9. Wait for explicit implementation authorization and a future update to this file.
