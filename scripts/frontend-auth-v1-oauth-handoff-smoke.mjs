import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const auth = fs.readFileSync('assets/js/auth-v1-oauth-handoff.js', 'utf8');
const bisi = fs.readFileSync('assets/js/bisi.js', 'utf8');

const checks = [
  ['OAuth adapter loads after Foundation', index.includes('assets/js/auth-v1-foundation.js"></script>\n<script src="assets/js/auth-v1-oauth-handoff.js')],
  ['Google and Microsoft map to real OAuth providers', auth.includes("value === 'Google' ? 'google'") && auth.includes("value === 'Microsoft' ? 'microsoft'")],
  ['provider click blocks legacy fake local handler', auth.includes('event.stopImmediatePropagation()') && auth.includes('[data-entry-provider]')],
  ['OAuth start uses backend provider route', auth.includes('/auth/${provider}/start') && auth.includes("Backend.request('/auth/providers')")],
  ['Apple fake login is blocked', auth.includes('Apple todavía no está habilitado en Bisi')],
  ['handoff is read from URL fragment', auth.includes('window.location.hash') && auth.includes('bisi_auth_handoff')],
  ['handoff fragment is stripped before exchange', auth.indexOf('cleanAuthUrl({ clearHash: true })') < auth.indexOf("Backend.request('/auth/handoff/exchange'")],
  ['handoff exchange posts one-time capability', auth.includes("Backend.request('/auth/handoff/exchange'") && auth.includes('body: { handoffToken }')],
  ['real backend session is verified after exchange', auth.includes('const session = await Backend.getSession()') && auth.includes('session?.authenticated')],
  ['legacy local session is compatibility marker only', auth.includes('backendAuthenticated: true') && auth.includes('userId: user.id')],
  ['register reset happens only after successful backend auth', auth.lastIndexOf('writeCompatibilitySession(session, provider, mode)') > auth.indexOf('const session = await Backend.getSession()')],
  ['no session/OAuth secret is persisted client-side', !/sessionToken|accessToken|refreshToken|clientSecret/i.test(auth)],
  ['main bisi.js fake handler is intercepted rather than rewritten', bisi.includes("writeJSON(SESSION_KEY, { ...sess, provider, createdAt: sess.createdAt || now })")],
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
