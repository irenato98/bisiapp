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

const store = new Map();
const hooks = new Set();
const listeners = new Map();
const windowListeners = new Map();
const emitted = [];
const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
let updateCalls = [];
let serverProfile = null;
let localeApplied = null;
let failUpdates = false;

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

const windowMock = {
  WabiPersistence: persistence,
  BisiPersistence: persistence,
  BisiBackend: { isEnabled: () => true },
  BisiSessionRuntime: { isAuthenticated: () => true },
  BisiBackendConnection: {
    async getProfile() { return { profile: structuredClone(serverProfile) }; },
    async updateProfile(patch) {
      updateCalls.push(structuredClone(patch));
      if (failUpdates) throw Object.assign(new Error('network'), { status: 503, code: 'network' });
      return mergeProfilePatch(patch);
    }
  },
  BisiV17: { i18n: { getLocale: () => localeApplied || 'es-419', setLocale: value => { localeApplied = value; } } },
  WabiV17: null,
  addEventListener(type, fn) { addListener(windowListeners, type, fn); },
  dispatchEvent(event) { dispatch(windowListeners, event); }
};
windowMock.WabiV17 = windowMock.BisiV17;
const documentMock = {
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

// Scenario 1: first-run migration. Existing remote values win when explicit;
// missing values are filled from local state, and device-local notifications never leave the browser.
store.set('wabi.beta.profile', JSON.stringify({ name: 'Local Name', provider: 'Google' }));
store.set('wabi.beta.prefs', JSON.stringify({ language: 'en', notifications: true, sound: false, focusSound: false, completeSound: true, deleteSound: true, soundProfile: 'clear' }));
const localBlocks = { dayStart: 0, blocks: [{ key: 'A', name: 'Morning', end: 720 }, { key: 'B', name: 'Later', end: 1440 }] };
store.set('wabi.blocks.v2', JSON.stringify(localBlocks));
serverProfile = { displayName: 'Remote Name', locale: 'es-419', timezone: localTimezone, preferences: { sound: true } };
updateCalls = [];
await authority.bootstrap(structuredClone(serverProfile));
const migration = updateCalls[0] || {};
const migratedPrefs = persistence.readJSON('wabi.beta.prefs', {});
check(updateCalls.length === 1, 'first bootstrap performs exactly one authority migration PATCH');
check(migration.displayName === 'Remote Name', 'existing remote display name wins during migration');
check(migration.locale === 'en' && migration.preferences?.language === 'en', 'explicit local app language fills missing remote preference consistently');
check(migration.preferences?.sound === true, 'existing remote sound preference wins over local migration copy');
check(!Object.prototype.hasOwnProperty.call(migration.preferences || {}, 'notifications'), 'device notification enablement is excluded from backend PATCH');
check(JSON.stringify(migration.preferences?.plannerBlocksV2) === JSON.stringify(localBlocks), 'local Block configuration migrates when backend has none');
check(migration.preferences?.settingsAuthorityVersion === 1, 'authority migration writes version sentinel');
check(migratedPrefs.notifications === true, 'device-local notification preference survives backend hydration');
check(migratedPrefs.sound === true && migratedPrefs.language === 'en', 'verified backend response becomes local preference snapshot');
check(authority.result()?.state === 'ready' && authority.result()?.authority === 'backend', 'migration finishes with backend authority ready');

// Scenario 2: once authority is established, backend wins on reload and live Block storage is replaced.
const remoteBlocks = { dayStart: 0, blocks: [{ key: 'A', name: 'Deep work', end: 600 }, { key: 'B', name: 'Rest of day', end: 1440 }] };
serverProfile = {
  displayName: 'Server Canonical',
  locale: 'es-419',
  timezone: localTimezone,
  preferences: {
    settingsAuthorityVersion: 1,
    language: 'es-419',
    sound: false,
    soundProfile: 'soft',
    focusSound: true,
    completeSound: false,
    deleteSound: true,
    plannerBlocksV2: remoteBlocks
  }
};
updateCalls = [];
store.set('wabi.beta.profile', JSON.stringify({ name: 'Stale Local', provider: 'Google' }));
store.set('wabi.beta.prefs', JSON.stringify({ language: 'en', notifications: true, sound: true, soundProfile: 'clear' }));
store.set('wabi.blocks.v2', JSON.stringify(localBlocks));
await authority.bootstrap(structuredClone(serverProfile));
const afterHydrateProfile = persistence.readJSON('wabi.beta.profile', {});
const afterHydratePrefs = persistence.readJSON('wabi.beta.prefs', {});
check(updateCalls.length === 0, 'established authority reload does not push stale local settings');
check(afterHydrateProfile.name === 'Server Canonical', 'backend display name replaces stale local name');
check(afterHydratePrefs.language === 'es-419' && afterHydratePrefs.sound === false, 'backend language and sound hydrate local settings');
check(afterHydratePrefs.notifications === true, 'backend hydration leaves device notification enablement untouched');
check(JSON.stringify(persistence.readJSON('wabi.blocks.v2', null)) === JSON.stringify(remoteBlocks), 'backend Block configuration replaces stale local Block copy');
check(emitted.some(e => e.type === 'bisi:settings-authority-hydrated'), 'backend hydration emits live runtime refresh event');

// Scenario 3: local settings edit writes through, then the returned backend profile is re-hydrated.
const edited = { ...afterHydratePrefs, sound: true, soundProfile: 'clear' };
store.set('wabi.beta.prefs', JSON.stringify(edited)); // direct set avoids debounce; flush is tested explicitly below.
updateCalls = [];
const flushResult = await authority.flush();
check(updateCalls.length === 1, 'explicit settings flush issues one profile PATCH');
check(updateCalls[0]?.preferences?.sound === true && updateCalls[0]?.preferences?.soundProfile === 'clear', 'settings PATCH carries current cross-device preferences');
check(!Object.prototype.hasOwnProperty.call(updateCalls[0]?.preferences || {}, 'notifications'), 'settings write-through still excludes device notification enablement');
check(flushResult?.state === 'ready' && flushResult?.mode === 'settings-write-through-verified', 'settings write-through verifies returned backend profile');

// Scenario 4: transport failure preserves local state and exposes fallback/error diagnostics.
failUpdates = true;
store.set('wabi.beta.prefs', JSON.stringify({ ...persistence.readJSON('wabi.beta.prefs', {}), sound: false }));
const beforeError = store.get('wabi.beta.prefs');
const errorResult = await authority.flush();
check(errorResult?.state === 'error' && errorResult?.authority === 'local', 'profile transport error falls back to local authority diagnostics');
check(store.get('wabi.beta.prefs') === beforeError, 'profile transport error does not erase local settings');
failUpdates = false;

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
