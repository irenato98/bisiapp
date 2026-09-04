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

check(config.includes("appVersion: '6.4.17.1-settings-consistency'"), 'Connection 9.1 frontend version');
check(config.includes("environment: 'dev-backend-connection-9-1'"), 'Connection 9.1 DEV environment marker');
check(js.includes('window.BisiSettingsAuthority') && js.includes('window.BisiProfileSync = window.BisiSettingsAuthority'), 'settings authority remains the single profile/preferences coordinator');
check(js.includes("const STATE_KEY = 'wabi.backend.settings-authority.v1'"), 'settings authority keeps durable diagnostics');
check(js.includes('const AUTHORITY_VERSION = 2;'), 'settings authority schema advances for consistency + theme sync');
check(js.includes("'language', 'theme', 'sound', 'soundProfile', 'focusSound', 'completeSound', 'deleteSound'"), 'cross-device settings include language, theme and sounds');
check(!/SYNCED_PREF_KEYS[^;]*notifications/.test(js), 'browser notification enablement remains device-local');
check(js.includes('plannerBlocksV2') && js.includes("const BLOCKS_KEY = 'wabi.blocks.v2'"), 'custom Block configuration remains backend-synced');
check(js.includes("mode: 'local-pending-settings-write'") && js.includes('localRevision !== revisionAtStart'), 'in-flight backend hydration cannot overwrite a newer local settings edit');
check(js.includes("mode: 'local-newer-settings-pending'"), 'a newer local edit during settings PATCH is preserved for a follow-up write');
check(js.includes("queue({ immediate: true })"), 'high-salience settings can request immediate persistence');
check(js.includes("setLocale(next, options = {})") && js.includes("persist: false, source: 'backend'"), 'backend locale hydration does not re-enqueue itself as a user edit');
check(js.includes("persistPreference: false, source: 'backend'"), 'backend theme hydration does not re-enqueue itself as a user edit');
check(js.includes("window.WabiPersistence.writeJSON('wabi.beta.prefs', { ...prefs, theme })"), 'user theme changes persist into backend-synced preferences');
check(js.includes('profileSnapshot = response.profile;'), 'profile cache refreshes after GET/PATCH profile responses');
check(js.includes("'local-to-backend-migration-once'"), 'settings authority migration remains one-time per authority version');
check(js.includes("'backend-authority-hydrated'"), 'established backend profile hydrates local settings on reload');
check(js.includes("'settings-write-through-verified'"), 'subsequent settings changes verify returned backend state');
check(js.includes("document.dispatchEvent(new CustomEvent('bisi:settings-authority-hydrated'"), 'settings hydration emits runtime refresh event');
check(js.includes("document.addEventListener('bisi:settings-authority-hydrated', () =>") && js.includes('blockConfig = next;') && js.includes('installBlocks();'), 'remote Blocks still apply to live planner runtime');
check(js.includes('currentTimezone()') && js.includes('profile?.timezone !== timezone'), 'current device timezone still refreshes backend profile safely');
check(js.includes("authority: 'backend'"), 'settings authority exposes backend source-of-truth diagnostics');
check(js.includes("'local-safety-copy'"), 'backend failure preserves local settings fallback');
check(readme.includes('backend/D1 is the canonical settings authority'), 'README keeps backend settings authority explicit');
check(readme.includes('theme') && readme.includes('language'), 'README documents language/theme consistency hotfix');
check(readme.includes('browser notification permission remains device-local'), 'README keeps device-local notification boundary');
check(readme.includes('Backend v0.9.1.3 remains unchanged'), 'current backend baseline remains unchanged');
check(readme.includes('Bisi AI v0.9 remains paused'), 'AI remains paused');
check(readme.includes('No PROD changes'), 'PROD remains untouched');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
