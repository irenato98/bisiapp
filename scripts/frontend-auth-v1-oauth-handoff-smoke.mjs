import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const auth = fs.readFileSync('assets/js/auth-v1-oauth-handoff.js', 'utf8');
const foundation = fs.readFileSync('assets/js/auth-v1-foundation.js', 'utf8');
const bisi = fs.readFileSync('assets/js/bisi.js', 'utf8');
const css = fs.readFileSync('assets/css/bisi.css', 'utf8');
const finishBlock = bisi.slice(bisi.indexOf('function finish()'), bisi.indexOf('function bindLegalAndLanguage()'));
const authErrorBlock = bisi.slice(bisi.indexOf('if (error) {', bisi.indexOf('window.__bisiApplyBackendAuthState')), bisi.indexOf('if (!session?.authenticated)', bisi.indexOf('window.__bisiApplyBackendAuthState')));

const checks = [
  ['OAuth adapter loads after Foundation', index.includes('assets/js/auth-v1-foundation.js"></script>\n<script src="assets/js/auth-v1-oauth-handoff.js')],
  ['Google and Microsoft internal provider plumbing remains available', auth.includes("value === 'Google' ? 'google'") && auth.includes("value === 'Microsoft' ? 'microsoft'")],
  ['Google is the only provider given an active UI handler', bisi.includes("[data-entry-provider]:not([disabled])") && bisi.includes("button.dataset.entryProvider === 'Google'")],
  ['Microsoft and Apple are disabled and labelled Pronto', bisi.includes('button.disabled = true') && bisi.includes("button.setAttribute('aria-disabled', 'true')") && bisi.includes("status.textContent = 'Pronto'")],
  ['disabled provider styling preserves visible future options', css.includes('.wabi-entry-provider-v2:disabled') && css.includes('.wabi-entry-provider-soon')],
  ['disabled provider events cannot start OAuth or show an error', auth.indexOf("button.disabled || button.getAttribute('aria-disabled') === 'true'") < auth.indexOf('const providerName = button.dataset.entryProvider')],
  ['provider click blocks legacy fake local handler', auth.includes('event.stopImmediatePropagation()') && auth.includes('[data-entry-provider]')],
  ['OAuth start uses backend provider route', auth.includes('/auth/${provider}/start') && auth.includes("Backend.request('/auth/providers')")],
  ['Apple internal unavailable-provider handling remains intact', auth.includes('Apple todavía no está habilitado en Bisi')],
  ['handoff is read from URL fragment', auth.includes('window.location.hash') && auth.includes('bisi_auth_handoff')],
  ['handoff fragment is stripped before exchange', auth.indexOf('cleanAuthUrl({ clearHash: true })') < auth.indexOf("Backend.request('/auth/handoff/exchange'")],
  ['handoff exchange posts one-time capability', auth.includes("Backend.request('/auth/handoff/exchange'") && auth.includes('body: { handoffToken }')],
  ['real backend session is verified after exchange', auth.includes('const session = await Backend.getSession()') && auth.includes('session?.authenticated')],
  ['canonical backend user id owns the compatibility marker', auth.includes('const canonicalUserId = user.id || user.userId || null') && auth.includes('userId: canonicalUserId')],
  ['Login and Register cannot trigger fresh-registration reset on Google auth', !auth.includes('__bisiPrepareFreshLocalRegistration') && !finishBlock.includes('__bisiPrepareFreshLocalRegistration')],
  ['successful OAuth does not declare onboarding complete', !auth.includes('wabi.onboarding.flow.v3.completed') && !auth.includes('wabi.onboarded')],
  ['no session/OAuth secret is persisted client-side', !/sessionToken|accessToken|refreshToken|clientSecret/i.test(auth)],
  ['boot remains neutral until backend session authority resolves', index.includes('class="bisi-auth-pending"') && css.includes('html.bisi-auth-pending .app') && foundation.includes('resolveBackendAuthState')],
  ['confirmed backend no-session clears stale compatibility auth', bisi.includes("window.WabiPersistence.remove(SESSION_KEY)") && bisi.includes("clear?.('backend-no-session')") && bisi.includes("showAccess('unauthenticated')")],
  ['network errors preserve compatibility state while hiding app', authErrorBlock.includes("showAccess('error')") && !authErrorBlock.includes('remove(SESSION_KEY)') && css.includes('html[data-bisi-auth-state="error"] .app')],
  ['explicit backend onboarding statuses are recognized', ['not_started', 'in_progress', 'completed'].every(status => bisi.includes(`'${status}'`))],
  ['explicit backend onboarding state outranks cached completion', bisi.indexOf('if (onboarding.status)') < bisi.indexOf('let cachedComplete = false') && bisi.includes('cacheExplicitOnboarding(onboarding.status)')],
  ['older backend response uses non-destructive compatibility routing', bisi.includes("cachedComplete = window.WabiPersistence.get(FLOW_KEY) === '1'") && bisi.includes('if (cachedComplete)') && bisi.includes('showOnboarding();')],
  ['avatar URLs are restricted to HTTPS', bisi.includes("url.protocol === 'https:' ? url.href : ''")],
  ['avatar absence or load failure retains initials fallback', bisi.includes("fallback.className = 'wabi-avatar-fallback'") && bisi.includes("image.addEventListener('error', () => image.remove()")],
  ['backend avatar is mapped without binary storage', auth.includes('avatarUrl') && bisi.includes('hasProfileAvatar') && !/avatarBlob|avatarData|data:image/i.test(auth)],
  ['header refresh targets the current shell', bisi.includes("$('[data-profile-v2].wabi-header-avatar')") && bisi.includes("$('.wabi-header-right')?.appendChild(b)")],
  ['late profile hydration repaints header and settings avatars', bisi.includes("document.addEventListener('bisi:profile-identity-updated'") && bisi.includes('BisiProfileIdentity?.paintAvatar')],
];

let pass = 0;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  pass += 1;
  console.log(`PASS ${name}`);
}
console.log(`FRONTEND AUTH V1 OAUTH HANDOFF: ${pass} PASS / 0 FAIL`);
