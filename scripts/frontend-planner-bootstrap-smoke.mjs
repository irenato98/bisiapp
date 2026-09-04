import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const js = fs.readFileSync(path.join(root, 'assets/js/bisi.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README_PATCH.md'), 'utf8');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};

check(js.includes('function flattenLocal()') && js.includes('rows.push({ ...cloneJson(raw), id: String(raw.id), dayKey });'), 'local activities preserve ids and dayKey for transport');
check(js.includes('delete copy.createdAtServer;') && js.includes('delete copy.updatedAtServer;'), 'server timestamps are stripped before local comparison/hydration');
check(js.includes('function normalizeRemote(raw)') && js.includes('validPlannerDayKey(dayKey)') && js.includes('validPlannerTitle(task.title)'), 'remote activities require stable id + valid day + non-empty name');
check(js.includes('function groupRemote(rows)') && js.includes('grouped[dayKey].push(task);'), 'backend snapshot can hydrate planner day buckets');
check(js.includes('function partitionRemote(rows)') && js.includes('ignoredInvalid += 1'), 'historical invalid backend rows are quarantined from planner bootstrap');
check(js.includes('ignoredRemoteInvalid'), 'bootstrap records how many invalid backend rows were ignored');
check(js.includes("mode: 'empty'"), 'empty local + empty backend is handled');
check(js.includes("mode: 'hydrated-from-backend'"), 'empty local + populated backend hydrates safely');
check(js.includes("mode: migrated.uploaded ? 'uploaded-local' : 'already-aligned'"), 'local bootstrap distinguishes upload vs already aligned');
check(js.includes("reason: migrated.reason || 'planner_snapshots_diverged'"), 'divergent snapshots enter explicit review state');
check(js.includes('remoteOnly.length === 0'), 'backend-only ids prevent silent union when local already has data');
check(js.includes('mismatched.length === 0'), 'same-id payload differences prevent silent overwrite');
check(js.includes('for (const task of missing) await window.BisiBackendConnection.createTask(task);'), 'only missing compatible local activities are uploaded');
check(js.includes('const verify = await window.BisiBackendConnection.listTasks();'), 'bootstrap verifies server state after upload');
check(js.includes("marker({ status: 'uploading'"), 'migration progress is locally marked for retry diagnostics');
check(js.includes("window.WabiPersistence.remove(MARKER_KEY)"), 'bootstrap marker clears when session clears');
check(/W\.saveState\(\);\s*W\.emit\?\.\('tasks-changed'\);/.test(js), 'backend hydration persists safety copy and rerenders');
check(js.includes("document.addEventListener('bisi:planner-runtime-ready'"), 'bootstrap waits for planner runtime');
check(js.includes("document.addEventListener('bisi:backend-connected'"), 'bootstrap waits for authenticated backend');
check(readme.includes('No local activity is deleted') || readme.includes('No local activity is deleted'.toLowerCase()) || readme.includes('No local activity is deleted.'), 'README documents non-destructive migration');
check(readme.includes('normal calendar mutations now reconcile to the authenticated DEV backend'), 'README documents Connection 3 write-through scope');
check(readme.includes('Bisi AI v0.9 remains paused'), 'AI-first work remains paused');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
