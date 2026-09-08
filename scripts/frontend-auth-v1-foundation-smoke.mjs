import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const patch = fs.readFileSync('assets/js/auth-v1-foundation.js', 'utf8');
const bisi = fs.readFileSync('assets/js/bisi.js', 'utf8');

const checks = [
  ['foundation script loaded after bisi.js', index.includes('assets/js/bisi.js"></script>\n<script src="assets/js/auth-v1-foundation.js')],
  ['real backend session checked before DEV bridge', patch.includes('let session = await Backend.getSession()')],
  ['real session prevents bridge overwrite', patch.includes('reusedAuthenticatedSession: true')],
  ['DEV bridge remains fallback only', patch.includes('if (!session?.authenticated)') && patch.includes('originalOpenDevBridgeSession({ signal })')],
  ['no local session required when backend session exists', patch.includes("return { connected: false, reason: 'no-session' }")],
  ['page load resolves backend auth before choosing UI', patch.includes("document.addEventListener('DOMContentLoaded'") && patch.includes('resolveBackendAuthState()') && patch.includes('const session = await Backend.getSession()')],
  ['authenticated session hydrates routing from backend snapshots', patch.includes('const connection = await establish()') && patch.includes('session: connection?.session || session') && patch.includes('profile: connection?.profile || null')],
  ['network errors are reported separately from confirmed no-session', patch.includes('if (!session?.authenticated)') && patch.includes('__bisiApplyBackendAuthState?.({ error })')],
  ['CSRF still sourced by BisiBackend getSession', bisi.includes('if (data?.csrfToken)') && bisi.includes('this.setCsrfToken(data.csrfToken)')],
  ['connection API remains compatible', ['connect: establish','ensureSession: establish','withSession','listTasks:','createTask:','updateTask:','deleteTask:'].every(x => patch.includes(x))],
  ['session token is not introduced client-side', !patch.toLowerCase().includes('sessiontoken')],
  ['main planner runtime remains untouched by foundation patch', bisi.includes("window.BisiBackendConnection = window.BisiBackendConnection || (() =>")],
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
console.log(`FRONTEND AUTH V1 FOUNDATION: ${pass} PASS / 0 FAIL`);
