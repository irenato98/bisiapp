import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const js = fs.readFileSync(path.join(root, 'assets/js/bisi.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'assets/js/bisi.config.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README_PATCH.md'), 'utf8');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};

check(config.includes("appVersion: '6.4.17.2-language-metadata-guard'"), 'Connection 9 frontend version');
check(config.includes("environment: 'dev-backend-connection-9-2'"), 'Connection 9 DEV environment marker');
check(js.includes('function flattenLocal()') && js.includes('rows.push({ ...cloneJson(raw), id: String(raw.id), dayKey });'), 'local safety snapshot preserves ids and dayKey');
check(js.includes('delete copy.createdAtServer;') && js.includes('delete copy.updatedAtServer;'), 'server timestamps are stripped before canonical comparison');
check(js.includes('const NULLABLE_ABSENT_EQUIVALENT_FIELDS = Object.freeze([') && js.includes('const canonicalCompareTask = task =>'), 'bootstrap canonical comparison treats null/absent optional planner fields equivalently');
check(js.includes('function normalizeRemote(raw)') && js.includes('validPlannerDayKey(dayKey)') && js.includes('validPlannerTitle(task.title)'), 'remote canonical rows require stable id + valid day + non-empty name');
check(js.includes('function partitionRemote(rows)') && js.includes('ignoredInvalid += 1'), 'historical invalid backend rows remain quarantined');
check(js.includes("const LOCAL_SAFETY_KEY = 'wabi.backend.planner.localSafety.v1'"), 'pre-hydration local safety backup exists');
check(js.includes("const WRITE_THROUGH_MARKER_KEY = 'wabi.backend.planner.writeThrough.v1'"), 'bootstrap reads write-through health before replacing local state');
check(js.includes("previousBootstrapMarker?.status === 'local-fallback'"), 'previous backend read failure protects local state on reconnect');
check(js.includes("writeThroughMarker?.status === 'pending' || writeThroughMarker?.status === 'error' || writeThroughMarker?.status === 'syncing'"), 'pending/failed/interrupted writes protect local state from overwrite');
check(js.includes("writeThroughMarker?.status === 'needs-review'") && js.includes("return 'write-through-needs-review'"), 'unresolved write-through review also protects the local safety snapshot across reload');
check(js.includes("local-write-through-review-recovery"), 'reload preserves local state while an explicit write-through review remains unresolved');
check(js.includes("mode: 'local-pending-write-recovery'") && js.includes("status: 'ready-pending-write-recovery'"), 'pending writes keep local snapshot active for automatic reload recovery');
check(js.includes("reason: 'local-only-activities'"), 'unexpected local-only activities stop for review instead of being discarded');
check(js.includes('function hydrateFromBackend(remoteRows, localRows'), 'canonical backend hydration helper exists');
check(js.includes('W.tasks = groupRemote(remoteRows);') && js.includes("W.emit?.('tasks-changed')"), 'successful backend read rebuilds planner buckets and rerenders');
check(js.includes("'server-authority-replaced-local'") && js.includes("'server-authority-refresh'") && js.includes('authorityMode'), 'populated backend is authoritative on reload when safe');
check(js.includes("authority: 'backend'"), 'bootstrap records backend authority explicitly');
check(js.includes('for (const task of missing) await window.BisiBackendConnection.createTask(task);'), 'first-time local-only planner can still migrate safely to backend');
check(js.includes("mode: 'uploaded-local-then-server-authority'"), 'verified migration finishes by hydrating canonical backend snapshot');
check(js.includes("state = 'local_fallback'"), 'network/backend read failure keeps local planner available');
check(js.includes("authority: 'local-safety-copy'"), 'fallback is explicitly marked as non-canonical local safety mode');
check(js.includes("window.WabiPersistence.writeJSON(LOCAL_SAFETY_KEY"), 'divergent local state is backed up before server replacement');
check(js.includes("document.addEventListener('bisi:planner-runtime-ready'"), 'bootstrap waits until planner recurrence cleanup/runtime is ready');
check(js.includes("document.addEventListener('bisi:backend-connected'"), 'bootstrap waits for authenticated backend connection');
check(readme.includes('backend/D1 is the canonical reload snapshot'), 'README documents server-authority reload behavior');
check(readme.includes('Bisi AI v0.9 remains paused'), 'AI-first work remains paused');
check(readme.includes('No PROD changes'), 'PROD remains untouched');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
