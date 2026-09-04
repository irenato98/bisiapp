import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const js = read('assets/js/bisi.js');
const config = read('assets/js/bisi.config.js');
const readme = read('README_PATCH.md');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};

check(config.includes("appVersion: '6.4.13.2-durable-delete-intent'"), 'Connection 5.2 frontend version');
check(config.includes("environment: 'dev-backend-connection-5-2'"), 'Connection 5.2 DEV environment marker');
check(config.includes('backendEnabled: true') && config.includes('bisiapp-backend-dev.renabiboovie.workers.dev/api'), 'write-through remains DEV-only transport');
check(js.includes('window.BisiPlannerWriteThrough') && js.includes("MARKER_KEY = 'wabi.backend.planner.writeThrough.v1'"), 'write-through coordinator + diagnostic marker exist');
check(js.includes("new Set(['created', 'edited', 'moved', 'completed', 'uncompleted', 'deleted', 'restored', 'recurrence-projected'])"), 'normal + recurrence projection mutation kinds trigger sync');

const writeThroughStart = js.indexOf('window.BisiPlannerWriteThrough');
const writeThroughEnd = js.indexOf('W.suspendUserState', writeThroughStart);
const writeThroughSection = js.slice(writeThroughStart, writeThroughEnd);
check(writeThroughSection.includes("document.addEventListener('bisi:calendar-operation'"), 'write-through subscribes through DOM event before W.on exists');
check(!writeThroughSection.includes("W.on?.('calendar-operation'"), 'write-through no longer silently depends on late W.on initialization');
check(js.includes("document.dispatchEvent(new CustomEvent('bisi:calendar-operation', { detail: payload }))"), 'calendar operations bridge to early-safe DOM event');
check(js.includes('let knownIds = new Set()') && js.includes('let pendingDeleteIds = new Set()') && js.includes('if (knownIds.has(id) || pendingDeleteIds.has(id)) deletes.push(task);'), 'remote delete is limited to known ids or explicit durable delete intents');
check(writeThroughSection.includes("status: 'pending'") && writeThroughSection.includes('operationKind: operationKind || null'), 'planner mutations persist a durable pending marker before debounce');
check(writeThroughSection.includes('knownIds: [...knownIds]'), 'write-through marker persists known backend ids across reload');
check(writeThroughSection.includes('pendingDeleteIds: [...pendingDeleteIds]'), 'write-through marker persists explicit pending delete ids across reload');
check(writeThroughSection.includes('function rememberDeleteIntent(op)') && writeThroughSection.includes('pendingDeleteIds.add(id)'), 'delete event records durable delete intent before reconciliation');
check(writeThroughSection.includes('function cancelDeleteIntent(op)') && writeThroughSection.includes('pendingDeleteIds.delete(id)'), 'Undo cancels pending delete intent before sync');
check(writeThroughSection.includes('persistedKnownIds') && writeThroughSection.includes('new Set([...persistedKnownIds'), 'reload recovery restores previously known ids before diff');
check(writeThroughSection.includes('persistedPendingDeleteIds') && writeThroughSection.includes('pendingDeleteIds = new Set(persistedPendingDeleteIds)'), 'reload recovery restores durable pending delete ids before diff');
check(writeThroughSection.includes('recoveringPendingWrite') && writeThroughSection.includes('dirty = true'), 'pending/interrupted write resumes automatically after bootstrap');
check(js.includes("reason: 'unknown-remote-activities'") && js.includes("state = 'needs-review'"), 'unexpected backend-only activities stop for review instead of being deleted');
check(writeThroughSection.includes('function approveReviewDeletes(ids = [])') && writeThroughSection.includes('reviewIds.has(id)'), 'explicit review resolver can authorize only ids present in the current safety review');
check(writeThroughSection.includes('approveReviewDeletes,') && writeThroughSection.includes('pendingDeleteIds: () => [...pendingDeleteIds]'), 'diagnostic API exposes safe review resolution and pending delete ids');
check(writeThroughSection.includes('pendingDeleteIds = new Set();') && writeThroughSection.includes("marker({ status: 'ready', ...lastResult })"), 'verified reconciliation clears completed delete intents');
check(js.includes('for (const task of before.creates) await window.BisiBackendConnection.createTask(task);'), 'missing local activity creates remotely');
check(js.includes('for (const task of before.updates) await window.BisiBackendConnection.updateTask(String(task.id), task);'), 'changed local activity patches complete current payload');
check(js.includes('for (const task of before.deletes) await window.BisiBackendConnection.deleteTask(String(task.id));'), 'known deleted local activity deletes remotely');
check(js.includes('const verify = await window.BisiBackendConnection.listTasks();') && js.includes('planner_sync_verification_failed'), 'write batch verifies fresh backend snapshot');
check(js.includes('dirty = true') && js.includes('scheduleRetry()') && js.includes('}, 3000);'), 'network failure leaves dirty retry state');
check(js.includes("window.addEventListener('online'") && js.includes('if (activate()) queue(0);'), 'online recovery retries current planner snapshot');
check(js.includes("document.addEventListener('bisi:planner-bootstrap-complete'") && js.includes("event?.detail?.state === 'ready'"), 'write-through activates only after safe bootstrap');
check(js.includes("emitCalendarOperation('uncompleted'"), 'uncomplete mutation is observable for persistence');
check(js.includes("emitCalendarOperation('restored'"), 'delete Undo is observable for persistence');
check(js.includes("const LS_KEY = 'wabi.v6'") && js.includes('W.saveState();'), 'local planner safety copy remains in place');
check(readme.includes('unexpected backend-only activity is **not deleted**'), 'README documents remote-only safety stop');
check(readme.includes('Bisi AI v0.9 remains paused'), 'AI v0.9 remains paused');
check(readme.includes('No PROD changes'), 'PROD remains untouched');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
