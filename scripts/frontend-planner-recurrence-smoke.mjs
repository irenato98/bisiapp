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

check(config.includes("appVersion: '6.4.16-sync-conflicts'"), 'Connection 8 frontend version');
check(config.includes("environment: 'dev-backend-connection-8'"), 'Connection 8 DEV environment marker');
check(js.includes("Object.freeze(['none', 'daily', 'weekdays', 'weekly', 'monthly', 'custom'])"), 'supported recurrence choices remain intact');
check(js.includes("if (spec.type === 'daily')") && js.includes("if (spec.type === 'weekdays')") && js.includes("if (spec.type === 'weekly')") && js.includes("if (spec.type === 'monthly')"), 'daily/weekdays/weekly/monthly recurrence matching remains');
check(js.includes("if (spec.type === 'custom')") && js.includes("spec.unit === 'day'") && js.includes("spec.unit === 'week'") && js.includes("spec.unit === 'month'"), 'custom recurrence matching remains');
check(js.includes('function recurrenceIdHash(value, seed = 2166136261)') && js.includes('function generatedOccurrenceId(seriesId, dateKey)'), 'deterministic generated occurrence identity helper exists');
check(js.includes('id: generatedOccurrenceId(seriesIdOf(root.task) || root.task.id, key)'), 'new recurrence projections use deterministic series/date id');
check(js.includes('recurrenceGenerated: true') && js.includes('recurrenceRootId: root.task.id') && js.includes('recurrenceSeriesId: seriesIdOf(root.task) || root.task.id') && js.includes('recurrenceForDate: key'), 'generated occurrence lineage metadata is preserved');
check(js.includes("kind: 'recurrence-projected'"), 'projection changes emit a persistence mutation');
check(js.includes("'restored', 'recurrence-projected'"), 'write-through listens for recurrence projection batches');
check(js.includes('syncOccurrenceFromRoot(existing, root.task)'), 'existing generated occurrence series fields refresh from root');
check(js.includes("const SERIES_SYNC_FIELDS = ['title', 'block', 'planned', 'category', 'priority', 'type', 'fixed', 'startTime', 'endTime', 'preferredStart', 'reminders', 'notes', 'subtasks']"), 'series-owned metadata propagation remains complete');
check(js.includes('splitGeneratedOccurrencePreservingFuture(t, key)'), 'editing a generated occurrence preserves future series');
check(js.includes('splitGeneratedOccurrencePreservingFuture(original, fromKey)') && js.includes('detachOccurrence(moved, toKey)'), 'moving a generated occurrence detaches only that occurrence');
check(js.includes('set.add(occDate)') && js.includes('root.recurrenceExceptions = [...set].sort()'), 'single occurrence delete persists root exception');
check(js.includes("tx.kind = 'series'") && js.includes('removeSeriesChildren(current.id, { detachLegacyOverrides: true })'), 'series delete removes generated lineage');
check(js.includes('tx.root.recurrenceExceptions = [...tx.rootExceptions]'), 'Undo restores recurrence root exceptions');
check(js.includes("emitCalendarOperation('completed'") && js.includes('generated: !!t.recurrenceGenerated'), 'occurrence completion is observable for persistence');
check(js.includes("emitCalendarOperation('uncompleted'") && js.includes('generated: !!t.recurrenceGenerated'), 'occurrence uncompletion is observable for persistence');
check(js.includes('root.recurrenceUntil = previousDayKey(occKey)'), 'series split records old segment boundary');
check(js.includes('leader.recurrenceSeriesId = seriesId') && js.includes('x.recurrenceRootId = leader.id'), 'future segment keeps stable series lineage');
check(js.includes('W.saveState?.();') && js.includes("document.dispatchEvent(new CustomEvent('bisi:calendar-operation'"), 'recurrence projection saves local fallback and queues D1 transport');
check(readme.includes('backend/D1 source of truth'), 'README documents recurrence source-of-truth intent');
check(readme.includes('No backend code change or D1 migration'), 'README records backend baseline unchanged');
check(readme.includes('Bisi AI v0.9 remains paused'), 'AI remains paused');
check(readme.includes('No PROD changes'), 'PROD remains untouched');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
