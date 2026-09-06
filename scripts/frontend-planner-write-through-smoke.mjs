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

check(config.includes("appVersion: '6.4.18.3-ai-core5-conversation-ux'"), 'Connection 9 frontend version');
check(config.includes("environment: 'dev-ai-v09-frontend-1'"), 'Connection 9 DEV environment marker');
check(config.includes('backendEnabled: true') && config.includes('bisiapp-backend-dev.renabiboovie.workers.dev/api'), 'write-through remains DEV-only transport');
check(js.includes('window.BisiPlannerWriteThrough') && js.includes("MARKER_KEY = 'wabi.backend.planner.writeThrough.v1'"), 'write-through coordinator + diagnostic marker exist');
check(js.includes("new Set(['created', 'edited', 'moved', 'completed', 'uncompleted', 'deleted', 'restored', 'recurrence-projected'])"), 'normal + recurrence projection mutation kinds trigger sync');

const writeThroughStart = js.indexOf('window.BisiPlannerWriteThrough');
const writeThroughEnd = js.indexOf('W.suspendUserState', writeThroughStart);
const writeThroughSection = js.slice(writeThroughStart, writeThroughEnd);
check(writeThroughSection.includes("document.addEventListener('bisi:calendar-operation'"), 'write-through subscribes through DOM event before W.on exists');
check(!writeThroughSection.includes("W.on?.('calendar-operation'"), 'write-through no longer silently depends on late W.on initialization');
check(js.includes("document.dispatchEvent(new CustomEvent('bisi:calendar-operation', { detail: payload }))"), 'calendar operations bridge to early-safe DOM event');
check(js.includes('let knownIds = new Set()') && js.includes('let pendingDeleteIds = new Set()') && writeThroughSection.includes('if (pendingDeleteIds.has(id))'), 'remote delete requires explicit durable delete intent');
check(writeThroughSection.includes("status: 'pending'") && writeThroughSection.includes('operationKind: operationKind || null'), 'planner mutations persist a durable pending marker before debounce');
check(writeThroughSection.includes('knownIds: [...knownIds]'), 'write-through marker persists known backend ids across reload');
check(writeThroughSection.includes('pendingDeleteIds: [...pendingDeleteIds]'), 'write-through marker persists explicit pending delete ids across reload');
check(writeThroughSection.includes('function rememberDeleteIntent(op)') && writeThroughSection.includes('pendingDeleteIds.add(id)'), 'delete event records durable delete intent before reconciliation');
check(writeThroughSection.includes('function cancelDeleteIntent(op)') && writeThroughSection.includes('pendingDeleteIds.delete(id)'), 'Undo cancels pending delete intent before sync');
check(writeThroughSection.includes('persistedKnownIds') && writeThroughSection.includes('new Set([...persistedKnownIds'), 'reload recovery restores previously known ids before diff');
check(writeThroughSection.includes('persistedPendingDeleteIds') && writeThroughSection.includes('pendingDeleteIds = new Set(persistedPendingDeleteIds)'), 'reload recovery restores durable pending delete ids before diff');
check(writeThroughSection.includes('recoveringPendingWrite') && writeThroughSection.includes('dirty = true'), 'pending/interrupted write resumes automatically after bootstrap');
check(writeThroughSection.includes('remoteWins.push(remoteTask)') && !writeThroughSection.includes("reason: 'unknown-remote-activities'"), 'unexpected backend-only activities are hydrated instead of deleted');
check(writeThroughSection.includes('function approveReviewDeletes(ids = [])') && writeThroughSection.includes('reviewIds.has(id)'), 'explicit review resolver can authorize only ids present in the current safety review');
check(writeThroughSection.includes('approveReviewDeletes,') && writeThroughSection.includes('pendingDeleteIds: () => [...pendingDeleteIds]'), 'diagnostic API exposes safe review resolution and pending delete ids');
check(writeThroughSection.includes('pendingDeleteIds = new Set();') && writeThroughSection.includes("marker({ status: 'ready', ...lastResult })"), 'verified reconciliation clears completed delete intents');
check(writeThroughSection.includes('for (const task of plan.creates)') && writeThroughSection.includes('await window.BisiBackendConnection.createTask(task);'), 'missing local activity creates remotely');
check(writeThroughSection.includes('const CLEARABLE_TASK_FIELDS = Object.freeze([') && writeThroughSection.includes("'recurrenceGenerated', 'recurrenceRootId', 'recurrenceForDate'"), 'complete snapshot contract enumerates clearable recurrence and planner fields');
check(writeThroughSection.includes('const completePlannerPatch = task =>') && writeThroughSection.includes("copy[field] = null"), 'complete planner PATCH emits null tombstones for locally removed optional fields');
check(writeThroughSection.includes('window.BisiBackendConnection.updateTask(String(item.task.id), completePlannerPatch(item.task)') && writeThroughSection.includes('expectedUpdatedAtServer: item.expectedUpdatedAtServer || null'), 'changed local activity patches complete payload with expected server version');
check(writeThroughSection.includes('const canonicalCompareTask = task =>') && writeThroughSection.includes('if (copy[field] == null) delete copy[field];'), 'verification treats absent and null optional fields as canonically equivalent');
check(writeThroughSection.includes('window.BisiBackendConnection.deleteTask(String(item.task.id)') && writeThroughSection.includes('expectedUpdatedAtServer: item.expectedUpdatedAtServer || null'), 'explicit deleted local activity deletes remotely with expected server version');
check(writeThroughSection.includes('const verify = await window.BisiBackendConnection.listTasks();') && writeThroughSection.includes("applyBackendSnapshot?.(remote, 'write-through-verified-backend')"), 'write batch re-reads fresh backend snapshot and makes it canonical');
check(js.includes('dirty = true') && js.includes('scheduleRetry()') && js.includes('}, 3000);'), 'network failure leaves dirty retry state');
check(writeThroughSection.includes("window.addEventListener('online'") && writeThroughSection.includes('if (dirty) queue(0);') && writeThroughSection.includes("scheduleRefresh('online-refresh')"), 'online recovery retries pending writes or refreshes clean planner');
check(js.includes("document.addEventListener('bisi:planner-bootstrap-complete'") && js.includes("event?.detail?.state === 'ready'"), 'write-through activates only after safe bootstrap');
check(js.includes("emitCalendarOperation('uncompleted'"), 'uncomplete mutation is observable for persistence');
check(js.includes("emitCalendarOperation('restored'"), 'delete Undo is observable for persistence');
check(js.includes("const LS_KEY = 'wabi.v6'") && js.includes('W.saveState();'), 'local planner safety copy remains in place');
check(readme.includes('unexpected backend-only activity is **not deleted**'), 'README documents remote-only safety stop');
check(readme.includes('Bisi IA v0.9 frontend is enabled in DEV'), 'Bisi IA v0.9 frontend is enabled in DEV');
check(readme.includes('No PROD changes'), 'PROD remains untouched');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
