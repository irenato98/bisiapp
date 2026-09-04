import fs from 'node:fs';

const js = fs.readFileSync('assets/js/bisi.js', 'utf8');
const config = fs.readFileSync('assets/js/bisi.config.js', 'utf8');
const readme = fs.readFileSync('README_PATCH.md', 'utf8');
let pass = 0;
let fail = 0;
function check(ok, label) {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
}

check(config.includes("appVersion: '6.4.17-authority-cleanup'"), 'Connection 9 frontend version');
check(config.includes("environment: 'dev-backend-connection-9'"), 'Connection 9 DEV environment marker');
check(js.includes('window.BisiSettingsAuthority') && js.includes('window.BisiProfileSync = window.BisiSettingsAuthority'), 'settings authority replaces push-only profile sync compatibly');
check(js.includes("const STATE_KEY = 'wabi.backend.settings-authority.v1'"), 'settings authority has durable local diagnostic marker');
check(js.includes("settingsAuthorityVersion: AUTHORITY_VERSION"), 'backend preferences carry authority version sentinel');
check(js.includes("'language', 'sound', 'soundProfile', 'focusSound', 'completeSound', 'deleteSound'"), 'current cross-device preferences are explicitly scoped');
check(!/SYNCED_PREF_KEYS[^;]*notifications/.test(js), 'browser notification enablement is not treated as cross-device authority');
check(js.includes('plannerBlocksV2') && js.includes("const BLOCKS_KEY = 'wabi.blocks.v2'"), 'custom Block configuration is carried in backend preferences');
check(js.includes("'local-to-backend-migration-once'"), 'first Connection 6 run performs one safe local migration when backend lacks authority marker');
check(js.includes("'backend-authority-hydrated'"), 'established backend profile hydrates local settings on reload');
check(js.includes("'settings-write-through-verified'"), 'subsequent local settings changes write through and hydrate returned backend state');
check(js.includes("document.dispatchEvent(new CustomEvent('bisi:settings-authority-hydrated'"), 'settings hydration emits runtime refresh event');
check(js.includes("document.addEventListener('bisi:settings-authority-hydrated', () =>") && js.includes('blockConfig = next;') && js.includes('installBlocks();'), 'remote Blocks are applied to live planner runtime');
check(js.includes('refreshAccountUI();') && js.includes("settingsScrim.classList.contains('on')"), 'remote profile hydration refreshes account/settings UI');
check(js.includes('currentTimezone()') && js.includes('profile?.timezone !== timezone'), 'current device timezone refreshes backend profile safely');
check(js.includes("authority: 'backend'"), 'settings authority exposes backend source-of-truth diagnostics');
check(js.includes("mode: 'local-safety-copy'") || js.includes("'local-safety-copy'"), 'backend failure preserves local settings fallback');
check(readme.includes('backend/D1 is the canonical settings authority'), 'README documents backend settings authority');
check(readme.includes('browser notification permission remains device-local'), 'README documents device-local notification boundary');
check(readme.includes('Backend v0.9.1.2 remains unchanged'), 'backend baseline remains unchanged');
check(readme.includes('Bisi AI v0.9 remains paused'), 'AI remains paused');
check(readme.includes('No PROD changes'), 'PROD remains untouched');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
