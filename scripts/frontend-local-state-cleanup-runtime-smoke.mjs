import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const js = fs.readFileSync(path.join(root, 'assets/js/bisi.js'), 'utf8');
const start = js.indexOf('window.BisiPlannerBootstrap = window.BisiPlannerBootstrap || (() => {');
const end = js.indexOf('window.BisiPlannerWriteThrough = window.BisiPlannerWriteThrough || (() => {');
if (start < 0 || end < 0) throw new Error('planner bootstrap module not found');
const moduleSource = js.slice(start, end);

let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};

const clone = value => JSON.parse(JSON.stringify(value));
const task = (id, title, dayKey='2026-09-04') => ({ id, title, dayKey, done:false, planned:'0:30', block:'C', priority:'regular', category:'#trabajo', repeat:'none', reminders:[], subtasks:[], notes:'', fixed:false });

function makeHarness({ userId='user-a', localTasks=[], localOwnerId=null, remoteTasks=[], storageSeed={} } = {}) {
  const storage = new Map(Object.entries(clone(storageSeed)));
  let remote = clone(remoteTasks);
  const createCalls = [];
  const updateCalls = [];
  const deleteCalls = [];
  const listeners = new Map();
  const emitted = [];
  const documentMock = {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    dispatchEvent(event) { emitted.push({ type:event.type, detail:event.detail }); for (const fn of listeners.get(event.type) || []) fn(event); return true; }
  };
  class CustomEventMock { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
  const grouped = {};
  for (const row of localTasks) {
    const { dayKey, ...rest } = clone(row);
    (grouped[dayKey] ||= []).push(rest);
  }
  const W = {
    tasks: grouped,
    plannerLocalOwnerId: localOwnerId,
    state: { selectedTask:null, theme:'light', mode:'normal' },
    emit() {},
    saveState() {
      storage.set('wabi.v6', { schemaVersion:9, ownerUserId:this.plannerLocalOwnerId || null, tasks:clone(this.tasks), theme:'light', mode:'normal' });
    }
  };
  const persistence = {
    readJSON(key, fallback) { return storage.has(key) ? clone(storage.get(key)) : fallback; },
    writeJSON(key, value) { storage.set(key, clone(value)); return true; },
    remove(key) { storage.delete(key); }
  };
  const backend = {
    status: () => 'ready',
    profile: () => ({ id:userId }),
    async listTasks() { return { tasks: clone(remote) }; },
    async createTask(row) { createCalls.push(clone(row)); remote.push(clone(row)); return { task:clone(row) }; },
    async updateTask(id, patch) { updateCalls.push({id,patch:clone(patch)}); const i=remote.findIndex(x=>String(x.id)===String(id)); if(i>=0) remote[i]={...remote[i],...clone(patch)}; },
    async deleteTask(id) { deleteCalls.push(String(id)); remote=remote.filter(x=>String(x.id)!==String(id)); }
  };
  const windowMock = {
    wabi: W,
    WabiPersistence: persistence,
    BisiSessionRuntime: { isAuthenticated: () => true },
    BisiBackendConnection: backend,
    BisiPlannerBootstrap: undefined
  };
  const context = vm.createContext({ window:windowMock, W, document:documentMock, CustomEvent:CustomEventMock, console, setTimeout, clearTimeout, Date, JSON, Map, Set, Object, Array, String, Number, Error, Promise });
  vm.runInContext(moduleSource, context, { filename:'planner-bootstrap-extract.js' });
  documentMock.dispatchEvent(new CustomEventMock('bisi:planner-runtime-ready'));
  return { window:windowMock, W, storage, backend, createCalls, updateCalls, deleteCalls, emitted, getRemote:()=>clone(remote) };
}

async function settle(h) {
  for (let i=0;i<20;i++) {
    const r = h.window.BisiPlannerBootstrap.result?.();
    if (r && !['checking','idle'].includes(r.state)) return r;
    await new Promise(r=>setTimeout(r,0));
  }
  return await h.window.BisiPlannerBootstrap.run();
}

// 1) Foreign browser residue must never migrate into a different account.
{
  const foreign = task('old-1','OLD USER');
  const own = task('new-1','NEW USER');
  const h = makeHarness({ userId:'user-new', localTasks:[foreign], localOwnerId:'user-old', remoteTasks:[own], storageSeed:{
    'wabi.backend.planner.writeThrough.v1': { status:'pending', ownerUserId:'user-old', knownIds:['old-1'] }
  }});
  const result = await settle(h);
  const rows = h.window.BisiPlannerBootstrap.flattenLocal();
  const quarantine = h.storage.get('wabi.backend.planner.quarantine.v1');
  check(result?.state === 'ready' && result?.authority === 'backend', 'foreign-owner state resolves with backend authority');
  check(h.createCalls.length === 0, 'foreign-owner local activity is never uploaded to new account');
  check(rows.length === 1 && rows[0].id === 'new-1', 'new account hydrates only its backend activity');
  check(quarantine?.sourceOwnerUserId === 'user-old' && quarantine?.currentUserId === 'user-new', 'foreign local snapshot is quarantined with both owners');
}

// 2) Once authority is established, stale local-only residue is backed up and pruned.
{
  const canonical = task('a-1','CANONICAL');
  const stale = task('stale-1','STALE LOCAL');
  const h = makeHarness({ userId:'user-a', localTasks:[canonical,stale], localOwnerId:'user-a', remoteTasks:[canonical], storageSeed:{
    'wabi.backend.planner.authority.v2.user-a': { version:2, authority:'backend' }
  }});
  const result = await settle(h);
  const rows = h.window.BisiPlannerBootstrap.flattenLocal();
  const safety = h.storage.get('wabi.backend.planner.localSafety.v1');
  check(result?.mode === 'server-authority-pruned-stale-local', 'established authority prunes stale local-only residue');
  check(h.createCalls.length === 0 && rows.length === 1 && rows[0].id === 'a-1', 'stale residue is not re-uploaded after authority establishment');
  check(safety?.count === 2 && JSON.stringify(safety?.tasks || {}).includes('stale-1'), 'pruned residue is backed up before replacement');
}

// 3) Legacy unowned local state can still migrate once when backend is empty.
{
  const legacy = task('legacy-1','LEGACY LOCAL');
  const h = makeHarness({ userId:'user-legacy', localTasks:[legacy], localOwnerId:null, remoteTasks:[] });
  const result = await settle(h);
  check(result?.mode === 'uploaded-local-then-server-authority' && result?.uploaded === 1, 'first legacy unowned planner migrates once to empty backend');
  check(h.createCalls.length === 1 && h.W.plannerLocalOwnerId === 'user-legacy', 'verified legacy migration claims local copy for current user');
  check(Number(h.storage.get('wabi.backend.planner.authority.v2.user-legacy')?.version) === 2, 'verified migration establishes durable per-user authority sentinel');
}

// 4) Pending write-through for the current user still protects local changes across reload.
{
  const local = task('p-1','LOCAL NEW');
  const remote = task('p-1','REMOTE OLD');
  const h = makeHarness({ userId:'user-p', localTasks:[local], localOwnerId:'user-p', remoteTasks:[remote], storageSeed:{
    'wabi.backend.planner.authority.v2.user-p': { version:2, authority:'backend' },
    'wabi.backend.planner.writeThrough.v1': { status:'pending', ownerUserId:'user-p', knownIds:['p-1'] }
  }});
  const result = await settle(h);
  const rows = h.window.BisiPlannerBootstrap.flattenLocal();
  check(result?.mode === 'local-pending-write-recovery' && result?.authority === 'local-safety-copy', 'current-user pending write still activates local recovery');
  check(rows[0]?.title === 'LOCAL NEW', 'pending local change is not overwritten by older backend snapshot');
}

// 5) A pending marker owned by another user must not protect/override current account state.
{
  const local = task('x-1','STALE CURRENT LOCAL');
  const remote = task('x-1','BACKEND CURRENT');
  const h = makeHarness({ userId:'user-x', localTasks:[local], localOwnerId:'user-x', remoteTasks:[remote], storageSeed:{
    'wabi.backend.planner.authority.v2.user-x': { version:2, authority:'backend' },
    'wabi.backend.planner.writeThrough.v1': { status:'pending', ownerUserId:'other-user', knownIds:['other-1'] }
  }});
  const result = await settle(h);
  const rows = h.window.BisiPlannerBootstrap.flattenLocal();
  check(result?.authority === 'backend' && result?.mode === 'server-authority-replaced-local', 'foreign pending marker cannot block current backend authority');
  check(rows[0]?.title === 'BACKEND CURRENT', 'current backend snapshot replaces stale local content when foreign marker is ignored');
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
