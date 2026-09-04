import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const config = read('assets/js/bisi.config.js');
const js = read('assets/js/bisi.js');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};

check(config.includes("appVersion: '6.4.9-backend-connection-foundation'"), 'Connection 1 frontend version');
check(config.includes('backendEnabled: true'), 'general backend enabled');
check(config.includes('devBrowserBridgeEnabled: true'), 'general DEV bridge enabled');
check(config.includes("apiBase: 'https://bisiapp-backend-dev.renabiboovie.workers.dev/api'"), 'general API points to DEV Worker');
check(config.includes('aiBackendEnabled: true') && config.includes('aiDevBrowserBridgeEnabled: true'), 'legacy AI transport configuration is preserved');
check(!/DEV_AUTH_TOKEN|ADMIN_DEV_TOKEN|Bearer\s+[A-Za-z0-9._-]{16,}/.test(config + '\n' + js), 'no secrets in frontend');
check(js.includes('devBridgeIsEnabled()') && js.includes('openDevBridgeSession') && js.includes('closeDevBridgeSession'), 'generic DEV session methods exist');
check(js.includes('window.BisiBackendConnection') && js.includes('establish({ force = false'), 'backend connection coordinator exists');
check(js.includes("document.dispatchEvent(new CustomEvent('bisi:backend-connected'"), 'connection-ready event exists');
check(js.includes('withSession') && js.includes("error?.status !== 401 && error?.status !== 403"), 'one reconnect path exists for expired DEV session');
check(js.includes('probePlannerTransport') && js.includes('window.BisiBackend.listTasks()'), 'planner read transport is reachable through authenticated connection');
check(js.includes('window.BisiProfileSync') && js.includes('updateProfile(snapshot())'), 'profile/preferences sync to backend is wired');
check(js.includes("Intl.DateTimeFormat().resolvedOptions().timeZone"), 'browser timezone is included in profile sync');
check(js.includes("const LS_KEY = 'wabi.v6'") && js.includes('W.tasks = obj.tasks || {}'), 'planner remains local-first in this foundation step');
check(!js.includes('BisiBackendConnection.createTask(') && !js.includes('BisiBackendConnection.updateTask(') && !js.includes('BisiBackendConnection.deleteTask('), 'planner mutations are not switched early');
check(js.includes('syncAiShadow') && js.includes('aiTurn('), 'paused legacy AI/frontend path remains present');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
