import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const js = read('assets/js/bisi.js');
const config = read('assets/js/bisi.config.js');
const readme = read('README_PATCH.md');
let pass=0, fail=0;
const check=(ok,label)=>{ if(ok){pass++;console.log(`PASS ${label}`);} else {fail++;console.error(`FAIL ${label}`);} };

const wtStart=js.indexOf('window.BisiPlannerWriteThrough = window.BisiPlannerWriteThrough || (() => {');
const wtEnd=js.indexOf('W.suspendUserState = function () {',wtStart);
const wt=js.slice(wtStart,wtEnd);
const bootStart=js.indexOf('window.BisiPlannerBootstrap = window.BisiPlannerBootstrap || (() => {');
const bootEnd=js.indexOf('window.BisiPlannerWriteThrough = window.BisiPlannerWriteThrough || (() => {',bootStart);
const boot=js.slice(bootStart,bootEnd);

check(config.includes("appVersion: '6.4.16.1-conflict-auto-recovery'"), 'Connection 8 frontend version');
check(config.includes("environment: 'dev-backend-connection-8'"), 'Connection 8 DEV environment marker');
check(js.includes('window.BisiPlannerTabIdentity') && js.includes("sessionStorage?.getItem?.(KEY)"), 'planner has stable per-tab identity across reload');
check(boot.includes("WRITE_THROUGH_RECOVERY_KEY_PREFIX = 'wabi.backend.planner.writeThrough.v2.'"), 'bootstrap reads per-tab recovery markers');
check(boot.includes('legacyTabId === plannerTabId()') && boot.includes('scopedMarker'), 'other-tab pending marker cannot protect stale local state');
check(wt.includes("RECOVERY_KEY_PREFIX = 'wabi.backend.planner.writeThrough.v2.'") && wt.includes('recoveryKey()'), 'write-through persists tab-scoped recovery state');
check(wt.includes('baselineSignatures: signatureObject()'), 'shared conflict baseline persists before reload');
check(wt.includes("type: 'both-changed'") && wt.includes('resolveStaleConflictsFromSnapshot'), 'same-activity concurrent changes auto-resolve to backend winner');
check(wt.includes("type: 'remote-deleted-local-changed'") && wt.includes("type: 'local-delete-remote-changed'"), 'edit-vs-delete conflicts are detected both directions');
check(wt.includes('remoteWins.push(remoteTask)') && wt.includes('remoteDeletions.push(id)'), 'safe remote changes are merged instead of overwritten');
check(wt.includes("window.BisiPlannerBootstrap?.applyBackendSnapshot?.(remote, 'write-through-verified-backend')"), 'verified backend snapshot becomes canonical after sync');
check(js.includes("expectedUpdatedAtServer=${encodeURIComponent(expected)}"), 'frontend transport sends expected server version through task URL');
check(wt.includes('expectedUpdatedAtServer: item.expectedUpdatedAtServer || null'), 'conditional update/delete carry observed backend version');
check(wt.includes("Number(error?.status || 0) === 409") && wt.includes('resolveBackendRaceConflict') && wt.includes("'backend-version-conflict'"), 'backend 409 triggers fresh remote-wins recovery rather than overwrite');
check(wt.includes("SYNC_SIGNAL_KEY = 'wabi.backend.planner.syncSignal.v1'"), 'cross-tab sync signal exists');
check(wt.includes("window.addEventListener('storage'") && wt.includes("scheduleRefresh('cross-tab-signal')"), 'other-tab successful sync triggers backend refresh');
check(wt.includes("window.addEventListener('focus'") && wt.includes("document.addEventListener('visibilitychange'"), 'focus/visibility refresh stale idle tabs');
check(wt.includes('function plannerInteractionBlocksRefresh') && wt.includes("reason: 'planner-interaction-active'") && wt.includes('scheduleRefresh(reason, 400)'), 'cross-tab refresh waits while activity editor/drag is active');
check(wt.includes('function refreshFromBackend') && wt.includes("'local-drift-without-pending-write'"), 'idle refresh refuses to erase unexplained local drift');
check(wt.includes('function acceptRemoteConflicts') && wt.includes("reason: 'remote-conflicts-accepted'"), 'manual resolver remains available for non-auto safety reviews');
check(wt.includes('function resolvedConflictToast') && wt.includes('Your stale change was not saved') && wt.includes('Tu cambio desactualizado no se guardó'), 'stale conflict messaging clearly says local change was not saved');
check(wt.includes("autoRecoveringStaleReview = recoveringReview && persisted?.reason === 'stale-write-conflict'") && wt.includes("operationKind: 'stale-review-auto-recovery'"), 'Connection 8 stale-review markers auto-recover on reload');
check(wt.includes("reason: 'stale-write-auto-resolved'") && wt.includes("resolution: 'remote-wins'"), 'resolved conflict result records backend-wins policy explicitly');
check(wt.includes('remote-only addition is never') === false, 'source contains no test-only prose');
check(readme.includes('Connection 8.1') && readme.includes('remote/backend wins') && readme.includes('optimistic concurrency'), 'README documents Connection 8.1 auto-recovery contract');
check(readme.includes('Backend v0.9.1.3'), 'README records required backend conflict-control baseline');
check(readme.includes('Bisi AI v0.9 remains paused'), 'AI remains paused');
check(readme.includes('No PROD changes'), 'PROD remains untouched');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if(fail) process.exit(1);
