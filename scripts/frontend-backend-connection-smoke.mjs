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

check(config.includes("appVersion: '6.4.11-planner-write-through'"), 'Connection 3 frontend version');
check(config.includes('backendEnabled: true'), 'general backend enabled');
check(config.includes('devBrowserBridgeEnabled: true'), 'general DEV bridge enabled');
check(config.includes("apiBase: 'https://bisiapp-backend-dev.renabiboovie.workers.dev/api'"), 'general API points to DEV Worker');
check(config.includes('aiBackendEnabled: true') && config.includes('aiDevBrowserBridgeEnabled: true'), 'legacy AI transport configuration is preserved');
check(!/DEV_AUTH_TOKEN|ADMIN_DEV_TOKEN|Bearer\s+[A-Za-z0-9._-]{16,}/.test(config + '\n' + js), 'no secrets in frontend');
check(js.includes('devBridgeIsEnabled()') && js.includes('openDevBridgeSession') && js.includes('closeDevBridgeSession'), 'generic DEV session methods exist');
check(js.includes('window.BisiBackendConnection') && js.includes('establish({ force = false'), 'backend connection coordinator exists');
check(js.includes("document.dispatchEvent(new CustomEvent('bisi:backend-connected'"), 'connection-ready event exists');
check(js.includes('withSession') && js.includes("error?.status !== 401 && error?.status !== 403"), 'one reconnect path exists for expired DEV session');
check(js.includes('window.BisiProfileSync') && js.includes('updateProfile(snapshot())'), 'profile/preferences sync remains wired');
check(js.includes('window.BisiPlannerBootstrap') && js.includes("MARKER_KEY = 'wabi.backend.planner.bootstrap.v1'"), 'planner bootstrap coordinator exists');
check(js.includes('createTask: (task, options = {}) => withSession(() => window.BisiBackend.createTask(task), options)'), 'authenticated create transport is exposed for bootstrap');
check(js.includes("document.dispatchEvent(new CustomEvent('bisi:planner-runtime-ready'))"), 'planner readiness waits until recurrence cleanup is complete');
check(js.includes("const LS_KEY = 'wabi.v6'") && js.includes('W.tasks = obj.tasks || {}'), 'local planner safety copy remains intact');
check(js.includes('window.BisiPlannerWriteThrough') && js.includes("MARKER_KEY = 'wabi.backend.planner.writeThrough.v1'"), 'planner write-through coordinator exists');
check(js.includes('updateTask: (id, patch, options = {}) => withSession') && js.includes('deleteTask: (id, options = {}) => withSession'), 'authenticated update/delete transports are exposed');
check(js.includes('syncAiShadow') && js.includes('aiTurn('), 'paused legacy AI/frontend path remains present');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
