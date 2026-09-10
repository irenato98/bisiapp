import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const js = fs.readFileSync(path.join(process.cwd(), 'assets/js/bisi.js'), 'utf8');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};
const between = (startText, endText) => {
  const start = js.indexOf(startText);
  const end = js.indexOf(endText, start);
  if (start < 0 || end < 0) throw new Error(`source section not found: ${startText}`);
  return js.slice(start, end);
};
const clone = value => JSON.parse(JSON.stringify(value));

// The production locator follows canonical identity after W.tasks is reconstructed or rebucketed.
{
  const W = { tasks: { '2026-09-01': [{ id: 'card-a', title: 'before' }] } };
  const context = vm.createContext({ W, String, Object });
  vm.runInContext(between('W.findTaskById = function (id) {', 'W.plannerLocalOwnerId = null;'), context, { filename: 'planner-id-locator.js' });
  const first = W.findTaskById('card-a');
  W.tasks = { '2026-09-08': [{ id: 'card-a', title: 'after hydration' }] };
  const hydrated = W.findTaskById('card-a');
  W.tasks = { '2026-09-10': [hydrated.task] };
  const moved = W.findTaskById('card-a');
  check(first?.key === '2026-09-01' && hydrated?.key === '2026-09-08' && hydrated?.task?.title === 'after hydration', 'canonical Card lookup follows a reconstructed backend snapshot');
  check(moved?.key === '2026-09-10' && moved?.task === hydrated.task, 'canonical Card lookup follows a drag move by ID');
  check(W.findTaskById('missing') === null, 'canonical lookup does not invent a missing Card');
}

// Bootstrap must re-read local state after its backend await and preserve a
// one-click Focus Start as a pending write instead of hydrating over it.
{
  const bootstrapSource = between(
    'window.BisiPlannerBootstrap = window.BisiPlannerBootstrap || (() => {',
    'window.BisiPlannerWriteThrough = window.BisiPlannerWriteThrough || (() => {'
  );
  const storage = new Map();
  const listeners = new Map();
  const initialTask = { id: 'focus-bootstrap', title: 'Focus', planned: '0:30', block: 'C', repeat: 'none', timerRunning: false };
  const remoteTask = { ...clone(initialTask), dayKey: '2026-09-04', updatedAtServer: 'v1', createdAtServer: 'created' };
  const W = {
    tasks: { '2026-09-04': [clone(initialTask)] },
    plannerLocalOwnerId: 'user-a',
    state: { selectedTask: null },
    saveState() {},
    emit() {}
  };
  let releaseRead;
  const pendingRead = new Promise(resolve => { releaseRead = resolve; });
  const seeded = [];
  const documentMock = {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); return true; }
  };
  class CustomEventMock { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const persistence = {
    readJSON(key, fallback) { return storage.has(key) ? clone(storage.get(key)) : fallback; },
    writeJSON(key, value) { storage.set(key, clone(value)); return true; },
    remove(key) { storage.delete(key); return true; }
  };
  const windowMock = {
    wabi: W,
    WabiPersistence: persistence,
    BisiSessionRuntime: { isAuthenticated: () => true },
    BisiPlannerTabIdentity: { id: () => 'tab-bootstrap' },
    BisiBackendConnection: {
      status: () => 'ready',
      profile: () => ({ id: 'user-a' }),
      listTasks: () => pendingRead,
      createTask: async () => { throw new Error('unexpected bootstrap create'); }
    },
    BisiPlannerWriteThrough: {
      seedPendingBootstrapBaseline(rows) { seeded.push(clone(rows)); return { seeded: true, count: rows.length }; }
    }
  };
  const context = vm.createContext({
    window: windowMock, W, document: documentMock, CustomEvent: CustomEventMock,
    console, Promise, Date, JSON, Map, Set, Object, Array, String, Number, Error
  });
  vm.runInContext(bootstrapSource, context, { filename: 'planner-bootstrap-focus-race.js' });
  documentMock.dispatchEvent(new CustomEventMock('bisi:planner-runtime-ready'));
  const run = windowMock.BisiPlannerBootstrap.run();
  await Promise.resolve();
  Object.assign(W.tasks['2026-09-04'][0], { timerRunning: true, timerStartedAt: 1000 });
  persistence.writeJSON('wabi.backend.planner.writeThrough.v2.tab-bootstrap', {
    status: 'pending', operationKind: 'edited', ownerUserId: 'user-a', tabId: 'tab-bootstrap'
  });
  releaseRead({ tasks: [remoteTask] });
  const result = await run;
  check(result?.mode === 'local-pending-write-recovery' && result?.authority === 'local-safety-copy', 'bootstrap preserves a Focus Start created while listTasks is pending');
  check(W.tasks['2026-09-04'][0]?.timerRunning === true && W.tasks['2026-09-04'][0]?.timerStartedAt === 1000, 'one Focus Start click survives bootstrap hydration');
  check(seeded.length === 1 && seeded[0][0]?.id === 'focus-bootstrap', 'bootstrap seeds the remote conflict baseline for normal write-through recovery');
}

const makeRecurrenceContext = tasks => {
  const emitted = [];
  const W = {
    tasks: clone(tasks),
    fromKey: key => new Date(`${key}T12:00:00Z`),
    addDays(date, count) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + count); return next; },
    dateKey: date => date.toISOString().slice(0, 10)
  };
  const all = () => Object.entries(W.tasks).flatMap(([key, list]) => (list || []).map(task => ({ key, task })));
  const recurrenceSpec = task => task?.repeat && task.repeat !== 'none' ? { type: task.repeat } : null;
  const seriesIdOf = task => task?.recurrenceSeriesId || (task && recurrenceSpec(task) ? task.id : null);
  const cleanRecurrenceProjectionFields = task => { delete task.recurrenceGenerated; delete task.recurrenceRootId; delete task.recurrenceForDate; delete task.recurrenceOverride; delete task.recurrenceStopHere; return task; };
  const detachOccurrence = (task, key) => { cleanRecurrenceProjectionFields(task); delete task.recurrenceSeriesId; task.repeat = 'none'; task.recurrenceStart = key; delete task.recurrenceUntil; delete task.recurrenceExceptions; return task; };
  const recurrenceRootFor = task => all().find(row => row.task.id === task?.recurrenceRootId)?.task || null;
  const previousDayKey = key => W.dateKey(W.addDays(W.fromKey(key), -1));
  const cloneTaskSnapshot = task => clone(task);
  const cloneRepeat = value => value && typeof value === 'object' ? { ...value } : value;
  const occurrenceFor = (rootId, key) => all().find(row => row.task.recurrenceRootId === rootId && row.task.recurrenceForDate === key)?.task || null;
  const nextRecurringKey = (_root, afterKey) => W.dateKey(W.addDays(W.fromKey(afterKey), 1));
  const removeSeriesChildren = (rootId, { fromDate = null, excludeId = null } = {}) => {
    const removed = [];
    for (const [dayKey, list] of Object.entries(W.tasks)) {
      const kept = [];
      for (let index = 0; index < list.length; index += 1) {
        const task = list[index], effective = task.recurrenceForDate || dayKey;
        if (task.recurrenceRootId === rootId && task.id !== excludeId && (!fromDate || effective >= fromDate)) removed.push({ dayKey, index, task });
        else kept.push(task);
      }
      if (kept.length) W.tasks[dayKey] = kept;
      else delete W.tasks[dayKey];
    }
    return { removed, independentDates: [] };
  };
  const emitStructuralDeleteIntent = (removed, source) => emitted.push({ ids: removed.map(row => row.task.id), source });
  const context = vm.createContext({
    W, recurrenceSpec, seriesIdOf, cleanRecurrenceProjectionFields, detachOccurrence, recurrenceRootFor,
    previousDayKey, cloneTaskSnapshot, cloneRepeat, occurrenceFor, nextRecurringKey, removeSeriesChildren,
    emitStructuralDeleteIntent, nextId: () => 'new-series-root', console, Object, Array, String, Set
  });
  vm.runInContext(between('function splitGeneratedOccurrencePreservingFuture(task, key) {', 'function removeAutomaticLineageFromDate('), context, { filename: 'planner-series-split.js' });
  vm.runInContext(between('function removeAutomaticLineageFromDate(', 'function stopOldSeriesAtOccurrence('), context, { filename: 'planner-series-remove.js' });
  vm.runInContext(between('function stopOldSeriesAtOccurrence(', 'function materializeAsNewSeries('), context, { filename: 'planner-series-stop.js' });
  vm.runInContext(between('function materializeAsNewSeries(', 'function migrateLegacyRecurrenceLinks('), context, { filename: 'planner-series-materialize.js' });
  return { context, W, emitted, all };
};

// "No repetir" at a current generated occurrence preserves history and detached exceptions.
{
  const root = { id: 'root', title: 'Serie', repeat: 'weekdays', recurrenceStart: '2026-09-01', recurrenceSeriesId: 'root', recurrenceExceptions: [] };
  const past = { id: 'past', title: 'Serie', repeat: 'weekdays', recurrenceGenerated: true, recurrenceRootId: 'root', recurrenceSeriesId: 'root', recurrenceForDate: '2026-09-02' };
  const selected = { id: 'selected', title: 'Serie', repeat: 'weekdays', recurrenceGenerated: true, recurrenceRootId: 'root', recurrenceSeriesId: 'root', recurrenceForDate: '2026-09-03' };
  const future = { id: 'future', title: 'Serie', repeat: 'weekdays', recurrenceGenerated: true, recurrenceRootId: 'root', recurrenceSeriesId: 'root', recurrenceForDate: '2026-09-04' };
  const detachedLegacy = { id: 'detached', title: 'Excepción', repeat: 'weekdays', recurrenceGenerated: true, recurrenceRootId: 'root', recurrenceSeriesId: 'root', recurrenceForDate: '2026-09-07', recurrenceOverride: true };
  const h = makeRecurrenceContext({
    '2026-09-01': [root], '2026-09-02': [past], '2026-09-03': [selected],
    '2026-09-04': [future], '2026-09-07': [detachedLegacy]
  });
  const stopped = h.context.stopOldSeriesAtOccurrence(h.context.W.tasks['2026-09-03'][0], '2026-09-03');
  h.context.materializeAsNewSeries(h.context.W.tasks['2026-09-03'][0], '2026-09-03', 'none', { exceptions: stopped.exceptions, until: stopped.oldUntil });
  const ids = h.all().map(row => row.task.id);
  check(h.context.W.tasks['2026-09-01'][0]?.recurrenceUntil === '2026-09-02' && ids.includes('past'), 'No repeat preserves the historical root boundary and prior occurrence');
  check(h.context.W.tasks['2026-09-03'][0]?.repeat === 'none' && !h.context.W.tasks['2026-09-03'][0]?.recurrenceGenerated, 'selected occurrence becomes a normal Card');
  check(!ids.includes('future') && ids.includes('detached'), 'future generated occurrence is removed while detached occurrence survives');
  check(h.context.W.tasks['2026-09-07'][0]?.repeat === 'none' && h.emitted[0]?.ids?.includes('future') && !h.emitted[0]?.ids?.includes('detached'), 'structural delete intent names only removed automatic occurrences');
}

// Moving one generated occurrence detaches it and re-roots only the valid future segment.
{
  const root = { id: 'root-move', repeat: 'daily', recurrenceStart: '2026-09-01', recurrenceSeriesId: 'root-move' };
  const past = { id: 'move-past', repeat: 'daily', recurrenceGenerated: true, recurrenceRootId: 'root-move', recurrenceSeriesId: 'root-move', recurrenceForDate: '2026-09-02' };
  const selected = { id: 'move-selected', repeat: 'daily', recurrenceGenerated: true, recurrenceRootId: 'root-move', recurrenceSeriesId: 'root-move', recurrenceForDate: '2026-09-03' };
  const next = { id: 'move-next', repeat: 'daily', recurrenceGenerated: true, recurrenceRootId: 'root-move', recurrenceSeriesId: 'root-move', recurrenceForDate: '2026-09-04' };
  const later = { id: 'move-later', repeat: 'daily', recurrenceGenerated: true, recurrenceRootId: 'root-move', recurrenceSeriesId: 'root-move', recurrenceForDate: '2026-09-05' };
  const h = makeRecurrenceContext({
    '2026-09-01': [root], '2026-09-02': [past], '2026-09-03': [selected],
    '2026-09-04': [next], '2026-09-05': [later]
  });
  const moving = h.context.W.tasks['2026-09-03'][0];
  h.context.splitGeneratedOccurrencePreservingFuture(moving, '2026-09-03');
  h.context.W.tasks['2026-09-03'] = [];
  moving.recurrenceStart = '2026-09-08';
  h.context.W.tasks['2026-09-08'] = [moving];
  check(moving.repeat === 'none' && !moving.recurrenceGenerated, 'moving one occurrence detaches only the selected Card');
  check(h.context.W.tasks['2026-09-02'][0]?.id === 'move-past' && h.context.W.tasks['2026-09-01'][0]?.recurrenceUntil === '2026-09-02', 'moving an occurrence preserves past history');
  check(h.context.W.tasks['2026-09-04'][0]?.id === 'move-next' && h.context.W.tasks['2026-09-05'][0]?.recurrenceRootId === 'move-next', 'future recurrence continues from its next occurrence');
}

// Source wiring supplements the runtime sequences: real Focus/drag handlers consume the tested ID locator.
{
  const focus = between('function openFocusMode(key, id) {', 'let cardHoverPoint =');
  const drag = between('let dragState = null, undoTimer = null, dragCopyModifier = false;', 'function dayHeaderHTML(');
  const calendar = between('calendarOps.updateTask = function', 'calendarOps.deleteTask = function');
  check(focus.includes('currentLocation = () => W.findTaskById?.(taskId)') && focus.includes('const currentTask = () => currentLocation()?.task'), 'Focus mutable handlers are wired to current Card identity');
  check(drag.includes('currentDragLocation') && drag.includes("document.body.classList.add('wabi-is-dragging')") && !drag.includes('dragState.key'), 'drag state is ID-keyed and exposes active-interaction protection');
  check(calendar.includes("emitCalendarOperation('edited'") && !calendar.includes('beforePlan !== calendarPlanSignature'), 'timer-only updates emit a Planner operation');
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
