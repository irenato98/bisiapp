import fs from 'node:fs';
import vm from 'node:vm';

const js = fs.readFileSync('assets/js/bisi.js', 'utf8');
const start = js.indexOf('window.BisiSettingsAuthority = window.BisiSettingsAuthority || (() => {');
const end = js.indexOf('window.BisiDeliveryQueue = window.BisiDeliveryQueue || (() => {', start);
if (start < 0 || end < 0) throw new Error('settings authority module not found');
const moduleSource = js.slice(start, end);

let pass = 0;
let fail = 0;
function check(ok, label) {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const store = new Map();
const hooks = new Set();
const listeners = new Map();
const windowListeners = new Map();
const emitted = [];
const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
let updateCalls = [];
let serverProfile = null;
let localeApplied = null;
let localeApplyOptions = null;
let themeApplied = null;
let themeApplyOptions = null;
let failUpdates = false;
let deferredGet = null;

function addListener(map, type, fn) {
  if (!map.has(type)) map.set(type, new Set());
  map.get(type).add(fn);
}
function dispatch(map, event) {
  for (const fn of map.get(event.type) || []) fn(event);
}
class MiniCustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}

const persistence = {
  readJSON(key, fallback) {
    if (!store.has(key)) return fallback;
    try { return JSON.parse(store.get(key)); } catch { return fallback; }
  },
  writeJSON(key, value) {
    store.set(key, JSON.stringify(value));
    for (const fn of hooks) fn({ type: 'set', key, value: JSON.stringify(value) });
    return true;
  },
  onWrite(fn) { hooks.add(fn); return () => hooks.delete(fn); }
};

function mergeProfilePatch(patch) {
  serverProfile = {
    ...serverProfile,
    ...(Object.prototype.hasOwnProperty.call(patch, 'displayName') ? { displayName: patch.displayName } : {}),
    ...(Object.prototype.hasOwnProperty.call(patch, 'locale') ? { locale: patch.locale } : {}),
    ...(Object.prototype.hasOwnProperty.call(patch, 'timezone') ? { timezone: patch.timezone } : {}),
    preferences: {
      ...(serverProfile?.preferences || {}),
      ...(patch.preferences || {})
    }
  };
  return { profile: structuredClone(serverProfile) };
}

const documentElement = { dataset: { theme: 'light' }, lang: 'es-419' };
const windowMock = {
  WabiPersistence: persistence,
  BisiPersistence: persistence,
  BisiBackend: { isEnabled: () => true },
  BisiSessionRuntime: { isAuthenticated: () => true },
  BisiBackendConnection: {
    async getProfile() {
      if (deferredGet) return deferredGet.promise;
      return { profile: structuredClone(serverProfile) };
    },
    async updateProfile(patch) {
      updateCalls.push(structuredClone(patch));
      if (failUpdates) throw Object.assign(new Error('network'), { status: 503, code: 'network' });
      return mergeProfilePatch(patch);
    }
  },
  BisiV17: { i18n: { getLocale: () => localeApplied || 'es-419', setLocale: (value, options) => { localeApplied = value; localeApplyOptions = options || null; } } },
  WabiV17: null,
  wabi: {
    state: { theme: 'light' },
    applyTheme(value, options) { this.state.theme = value; themeApplied = value; themeApplyOptions = options || null; documentElement.dataset.theme = value; }
  },
  addEventListener(type, fn) { addListener(windowListeners, type, fn); },
  dispatchEvent(event) { dispatch(windowListeners, event); }
};
windowMock.WabiV17 = windowMock.BisiV17;
const documentMock = {
  documentElement,
  addEventListener(type, fn) { addListener(listeners, type, fn); },
  dispatchEvent(event) { emitted.push(event); dispatch(listeners, event); return true; }
};

const context = vm.createContext({
  window: windowMock,
  document: documentMock,
  CustomEvent: MiniCustomEvent,
  Intl,
  Date,
  JSON,
  Object,
  Array,
  Number,
  String,
  Boolean,
  Math,
  TypeError,
  Error,
  setTimeout,
  clearTimeout,
  structuredClone,
  console
});
vm.runInContext(moduleSource, context, { filename: 'settings-authority-extract.js' });
const authority = windowMock.BisiSettingsAuthority;

// Scenario 1: schema v2 migration keeps existing remote values and fills new theme from local state.
store.set('wabi.beta.profile', JSON.stringify({ name: 'Local Name', provider: 'Google' }));
store.set('wabi.beta.prefs', JSON.stringify({ language: 'es-419', theme: 'dark', notifications: true, sound: false, focusSound: false, completeSound: true, deleteSound: true, soundProfile: 'clear' }));
const localBlocks = { dayStart: 0, blocks: [{ key: 'A', name: 'Morning', end: 720 }, { key: 'B', name: 'Later', end: 1440 }] };
store.set('wabi.blocks.v2', JSON.stringify(localBlocks));
serverProfile = { displayName: 'Remote Name', locale: 'en', timezone: localTimezone, preferences: { settingsAuthorityVersion: 1, language: 'en', sound: true } };
updateCalls = [];
await authority.bootstrap(structuredClone(serverProfile));
await sleep(5);
const migration = updateCalls[0] || {};
const migratedPrefs = persistence.readJSON('wabi.beta.prefs', {});
check(updateCalls.length === 1, 'v2 bootstrap performs exactly one schema migration PATCH');
check(migration.displayName === 'Remote Name', 'existing remote display name wins during schema migration');
check(migration.locale === 'en' && migration.preferences?.language === 'en', 'existing remote language wins during schema migration');
check(migration.preferences?.theme === 'dark', 'missing remote theme is filled from current local theme');
check(migration.preferences?.sound === true, 'existing remote sound preference wins over local migration copy');
check(!Object.prototype.hasOwnProperty.call(migration.preferences || {}, 'notifications'), 'device notification enablement is excluded from backend PATCH');
check(JSON.stringify(migration.preferences?.plannerBlocksV2) === JSON.stringify(localBlocks), 'local Block configuration migrates when backend has none');
check(migration.preferences?.settingsAuthorityVersion === 2, 'authority migration writes v2 sentinel');
check(migratedPrefs.notifications === true, 'device-local notification preference survives backend hydration');
check(authority.result()?.state === 'ready' && authority.result()?.authority === 'backend', 'schema migration finishes with backend authority ready');

// Scenario 2: established authority hydrates language/theme/sounds/Blocks without pushing stale local values.
const remoteBlocks = { dayStart: 0, blocks: [{ key: 'A', name: 'Deep work', end: 600 }, { key: 'B', name: 'Rest of day', end: 1440 }] };
serverProfile = {
  displayName: 'Server Canonical',
  locale: 'es-419',
  timezone: localTimezone,
  preferences: {
    settingsAuthorityVersion: 2,
    language: 'es-419',
    theme: 'dark',
    sound: false,
    soundProfile: 'soft',
    focusSound: true,
    completeSound: false,
    deleteSound: true,
    plannerBlocksV2: remoteBlocks
  }
};
updateCalls = [];
localeApplied = 'en'; localeApplyOptions = null; themeApplied = null; themeApplyOptions = null; windowMock.wabi.state.theme = 'light'; documentElement.dataset.theme = 'light';
store.set('wabi.beta.profile', JSON.stringify({ name: 'Stale Local', provider: 'Google' }));
store.set('wabi.beta.prefs', JSON.stringify({ language: 'en', theme: 'light', notifications: true, sound: true, soundProfile: 'clear' }));
store.set('wabi.blocks.v2', JSON.stringify(localBlocks));
await authority.bootstrap(structuredClone(serverProfile));
await sleep(5);
const afterHydrateProfile = persistence.readJSON('wabi.beta.profile', {});
const afterHydratePrefs = persistence.readJSON('wabi.beta.prefs', {});
check(updateCalls.length === 0, 'established authority reload does not push stale local settings');
check(afterHydrateProfile.name === 'Server Canonical', 'backend display name replaces stale local name');
check(afterHydratePrefs.language === 'es-419' && afterHydratePrefs.sound === false, 'backend language and sound hydrate local settings');
check(afterHydratePrefs.theme === 'dark' && themeApplied === 'dark', 'backend theme hydrates local preference and live UI');
check(themeApplyOptions?.persistPreference === false && themeApplyOptions?.source === 'backend', 'backend theme hydration cannot loop back as a user write');
check(localeApplied === 'es-419' && localeApplyOptions?.persist === false && localeApplyOptions?.source === 'backend', 'backend locale hydration cannot loop back as a user write');
check(afterHydratePrefs.notifications === true, 'backend hydration leaves device notification enablement untouched');
check(JSON.stringify(persistence.readJSON('wabi.blocks.v2', null)) === JSON.stringify(remoteBlocks), 'backend Block configuration replaces stale local Block copy');
check(emitted.some(e => e.type === 'bisi:settings-authority-hydrated'), 'backend hydration emits live runtime refresh event');

// Scenario 3: explicit user language/theme/sound edit writes through and returned backend state is canonical.
const edited = { ...afterHydratePrefs, language: 'en', theme: 'light', sound: true, soundProfile: 'clear' };
persistence.writeJSON('wabi.beta.prefs', edited);
updateCalls = [];
const flushResult = await authority.flush();
await sleep(5);
check(updateCalls.length === 1, 'explicit settings flush issues one profile PATCH');
check(updateCalls[0]?.locale === 'en' && updateCalls[0]?.preferences?.language === 'en', 'language change PATCHes locale and preference together');
check(updateCalls[0]?.preferences?.theme === 'light', 'theme change is included in backend preferences');
check(updateCalls[0]?.preferences?.sound === true && updateCalls[0]?.preferences?.soundProfile === 'clear', 'sound changes are included in backend preferences');
check(!Object.prototype.hasOwnProperty.call(updateCalls[0]?.preferences || {}, 'notifications'), 'settings write-through still excludes device notification enablement');
check(flushResult?.state === 'ready' && flushResult?.mode === 'settings-write-through-verified', 'settings write-through verifies returned backend profile');

// Scenario 4: a stale backend GET finishing after a local language edit must never revert the local edit.
serverProfile = {
  displayName: 'Server Canonical', locale: 'en', timezone: localTimezone,
  preferences: { settingsAuthorityVersion: 2, language: 'en', theme: 'light', sound: true, soundProfile: 'clear', focusSound: true, completeSound: true, deleteSound: true, plannerBlocksV2: remoteBlocks }
};
store.set('wabi.beta.prefs', JSON.stringify({ ...persistence.readJSON('wabi.beta.prefs', {}), language: 'en' }));
updateCalls = [];
let resolveGet;
deferredGet = {};
deferredGet.promise = new Promise(resolve => { resolveGet = resolve; });
const inFlightBootstrap = authority.bootstrap();
await sleep(1);
persistence.writeJSON('wabi.beta.prefs', { ...persistence.readJSON('wabi.beta.prefs', {}), language: 'es-419' });
resolveGet({ profile: structuredClone(serverProfile) });
const raced = await inFlightBootstrap;
deferredGet = null;
check(raced?.mode === 'local-pending-settings-write' && raced?.authority === 'local', 'stale backend hydration yields to a newer local language edit');
check(persistence.readJSON('wabi.beta.prefs', {}).language === 'es-419', 'newer Spanish selection stays visible instead of reverting to English');
await sleep(220);
check(serverProfile.locale === 'es-419' && serverProfile.preferences?.language === 'es-419', 'newer Spanish selection is persisted to backend after the race');
check(authority.result()?.state === 'ready' && authority.result()?.authority === 'backend', 'post-race settings sync returns to backend authority');

// Scenario 5: profile name and Blocks remain covered by the same coordinator.
updateCalls = [];
persistence.writeJSON('wabi.beta.profile', { name: 'Updated Name', provider: 'Google' });
const newerBlocks = { dayStart: 0, blocks: [{ key: 'A', name: 'Focus', end: 480 }, { key: 'B', name: 'Everything else', end: 1440 }] };
persistence.writeJSON('wabi.blocks.v2', newerBlocks);
await authority.flush();
check(updateCalls.at(-1)?.displayName === 'Updated Name', 'display name continues to write through');
check(JSON.stringify(updateCalls.at(-1)?.preferences?.plannerBlocksV2) === JSON.stringify(newerBlocks), 'Block edits continue to write through');

// Scenario 6: transport failure preserves local state.
failUpdates = true;
persistence.writeJSON('wabi.beta.prefs', { ...persistence.readJSON('wabi.beta.prefs', {}), sound: false });
const beforeError = store.get('wabi.beta.prefs');
const errorResult = await authority.flush();
check(errorResult?.state === 'error' && errorResult?.authority === 'local', 'profile transport error falls back to local authority diagnostics');
check(store.get('wabi.beta.prefs') === beforeError, 'profile transport error does not erase local settings');
failUpdates = false;

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
