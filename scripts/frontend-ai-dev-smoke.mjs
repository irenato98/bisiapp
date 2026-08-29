import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { console.log(`PASS  ${label}`); pass++; }
  else { console.error(`FAIL  ${label}`); fail++; }
};

const config = read('assets/js/bisi.config.js');
const js = read('assets/js/bisi.js');
const css = read('assets/css/bisi.css');

check(config.includes("appVersion: '6.4-dev-ai-e2e-bridge'"), 'frontend version');
check(config.includes('backendEnabled: false'), 'general backend remains disabled');
check(config.includes('aiBackendEnabled: true'), 'AI backend enabled');
check(config.includes('aiDevBrowserBridgeEnabled: true'), 'DEV browser bridge enabled');
check(config.includes('https://bisiapp-backend-dev.renabiboovie.workers.dev/api'), 'DEV Worker API configured');
check(!/DEV_AUTH_TOKEN|ADMIN_DEV_TOKEN|Bearer\s+[A-Za-z0-9._-]{16,}/.test(config + '\n' + js), 'no DEV/admin secret in frontend JS');
check(js.includes("openAiDevBridgeSession") && js.includes("/auth/dev-browser-login"), 'DEV AI session bootstrap');
check(js.includes('closeAiDevBridgeSession') && js.includes("/auth/logout"), 'DEV AI session revoke');
check(js.includes('syncAiShadow') && js.includes('aiListTasks') && js.includes('aiUpdateTask') && js.includes('aiCreateTask'), 'local planner shadow sync');
for (const status of ['need_match', 'priority_suggestion', 'proposal', 'safety']) {
  check(js.includes(`ai.status === '${status}'`), `render ${status}`);
}
check(js.includes('closeAiSession === true'), 'safety closeAiSession');
check(js.includes('confirmAiProposal') && js.includes('cancelAiProposal'), 'proposal Confirm/Cancel');
check(js.includes('mirrorExecutionLocally') && js.includes('renderSurface(); syncShell();'), 'planner refresh after execution');
check(js.includes('proposal.actions.length > 1') && js.includes('multiUnsupported'), 'multi-action confirmation safely blocked on v0.8.16');

const fonts = [
  'inter-variable.woff2', 'inter-variable-italic.woff2',
  'open-sans-variable.woff2', 'open-sans-variable-italic.woff2',
  'work-sans-variable.woff2', 'work-sans-variable-italic.woff2'
];
for (const font of fonts) check(fs.existsSync(path.join(root, 'assets/fonts', font)), `font exists: ${font}`);
check(!/url\(["']?\/fonts\//.test(css), 'CSS has no root /fonts references');
check((css.match(/\.\.\/fonts\//g) || []).length >= 6, 'CSS uses assets/fonts-relative paths');

const syntax = spawnSync(process.execPath, ['--check', path.join(root, 'assets/js/bisi.js')], { encoding: 'utf8' });
check(syntax.status === 0, 'bisi.js syntax');

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
