import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const js = fs.readFileSync(path.join(root, 'assets/js/bisi.js'), 'utf8');
const start = js.indexOf('window.BisiPlannerWriteThrough = window.BisiPlannerWriteThrough || (() => {');
const end = js.indexOf('W.suspendUserState = function () {', start);
if (start < 0 || end < 0) throw new Error('planner write-through module not found');
const moduleSource = js.slice(start, end);

let pass = 0, fail = 0;
const check = (ok, label, detail='') => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};
const clone = value => JSON.parse(JSON.stringify(value));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const task = (id, title, dayKey='2026-09-04', version='v1') => ({
  id, title, dayKey, done:false, planned:'0:30', block:'C', priority:'regular', category:'#trabajo', repeat:'none', reminders:[], subtasks:[], notes:'', fixed:false,
  updatedAtServer: version, createdAtServer:'created'
});

function makeHarness({ rows=[], localRowsSeed=null, userId='user-a', tabId='tab-a', storageSeed={}, updateRace=null }={}) {
  let uiBlocked = false;
  let remote = clone(rows);
  let versionCounter = 10;
  const storage = new Map(Object.entries(clone(storageSeed)));
  const docListeners = new Map();
  const winListeners = new Map();
  const updateCalls = [], deleteCalls = [], createCalls = [], toasts=[];
  const documentMock = {
    visibilityState: 'visible',
    body: { classList: { contains() { return false; } } },
    querySelector() { return uiBlocked ? {} : null; },
    addEventListener(type, fn) { if (!docListeners.has(type)) docListeners.set(type, []); docListeners.get(type).push(fn); },
    dispatchEvent(event) { for (const fn of docListeners.get(event.type) || []) fn(event); return true; }
  };
  class CustomEventMock { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
  const grouped = {};
  for (const raw of (localRowsSeed || rows)) {
    const { dayKey, updatedAtServer, createdAtServer, ...clean } = clone(raw);
    (grouped[dayKey] ||= []).push(clean);
  }
  const W = {
    tasks: grouped,
    plannerLocalOwnerId: userId,
    state: { selectedTask:null },
    saveState() {},
    emit() {},
    toast(message) { toasts.push(message); }
  };
  const flattenLocal = () => {
    const out=[];
    for (const [dayKey,list] of Object.entries(W.tasks || {})) for (const raw of list || []) out.push({...clone(raw), dayKey});
    return out;
  };
  const applyBackendSnapshot = (rawRows) => {
    const next={};
    for (const raw of rawRows || []) {
      const { dayKey, updatedAtServer, createdAtServer, key, ...clean } = clone(raw);
      if (!dayKey) continue;
      (next[dayKey] ||= []).push(clean);
    }
    W.tasks=next;
    return {state:'ready', authority:'backend'};
  };
  const persistence = {
    readJSON(key, fallback) { return storage.has(key) ? clone(storage.get(key)) : fallback; },
    writeJSON(key, value) { storage.set(key, clone(value)); return true; },
    remove(key) { storage.delete(key); return true; }
  };
  const backend = {
    status: () => 'ready',
    profile: () => ({id:userId}),
    async listTasks() { return { tasks: clone(remote) }; },
    async createTask(row) {
      createCalls.push(clone(row));
      if (remote.some(x => String(x.id)===String(row.id))) { const e=new Error('conflict'); e.status=409; e.code='conflict'; throw e; }
      remote.push({...clone(row), updatedAtServer:`v${++versionCounter}`, createdAtServer:'created'});
      return {task: clone(remote.at(-1))};
    },
    async updateTask(id, patch, options={}) {
      updateCalls.push({id:String(id), patch:clone(patch), options:clone(options)});
      const i=remote.findIndex(x=>String(x.id)===String(id));
      if (i<0) { const e=new Error('not found'); e.status=404; throw e; }
      if (typeof updateRace === 'function') updateRace({id:String(id), remote, index:i});
      const expected=options?.expectedUpdatedAtServer || null;
      if (expected && remote[i].updatedAtServer !== expected) { const e=new Error('conflict'); e.status=409; e.code='conflict'; throw e; }
      remote[i]={...remote[i],...clone(patch),id:String(id),updatedAtServer:`v${++versionCounter}`};
      return {task:clone(remote[i])};
    },
    async deleteTask(id, options={}) {
      deleteCalls.push({id:String(id), options:clone(options)});
      const i=remote.findIndex(x=>String(x.id)===String(id));
      if(i<0) { const e=new Error('not found'); e.status=404; throw e; }
      const expected=options?.expectedUpdatedAtServer || null;
      if(expected && remote[i].updatedAtServer !== expected) { const e=new Error('conflict'); e.status=409; e.code='conflict'; throw e; }
      remote.splice(i,1);
      return {ok:true,deleted:true,id:String(id)};
    }
  };
  const windowMock = {
    wabi: W,
    WabiPersistence: persistence,
    BisiSessionRuntime: { isAuthenticated: () => true },
    BisiBackendConnection: backend,
    BisiPlannerBootstrap: { status:()=> 'ready', flattenLocal, applyBackendSnapshot },
    BisiPlannerTabIdentity: { id:()=>tabId },
    addEventListener(type, fn) { if (!winListeners.has(type)) winListeners.set(type, []); winListeners.get(type).push(fn); },
  };
  const context = vm.createContext({
    window:windowMock, W, document:documentMock, CustomEvent:CustomEventMock, console,
    setTimeout, clearTimeout, Date, JSON, Map, Set, Object, Array, String, Number, Error, Promise, Math,
    navigator:{onLine:true}
  });
  vm.runInContext(moduleSource, context, {filename:'planner-write-through-extract.js'});
  const emitDoc=(type,detail={})=>documentMock.dispatchEvent(new CustomEventMock(type,{detail}));
  const emitWin=(type,event={})=>{ for(const fn of winListeners.get(type)||[]) fn(event); };
  const setLocal=(id, patch) => {
    for(const list of Object.values(W.tasks)) {
      const row=list.find(x=>String(x.id)===String(id));
      if(row){ Object.assign(row,clone(patch)); return true; }
    }
    return false;
  };
  const deleteLocal=(id) => {
    for(const [dayKey,list] of Object.entries(W.tasks)) {
      const i=list.findIndex(x=>String(x.id)===String(id));
      if(i>=0){ const [removed]=list.splice(i,1); if(!list.length) delete W.tasks[dayKey]; return removed; }
    }
    return null;
  };
  const remotePatch=(id,patch) => {
    const i=remote.findIndex(x=>String(x.id)===String(id));
    if(i<0) return false;
    remote[i]={...remote[i],...clone(patch),updatedAtServer:`v${++versionCounter}`}; return true;
  };
  const remoteDelete=id=>{ remote=remote.filter(x=>String(x.id)!==String(id)); };
  const remoteAdd=row=>{ remote.push(clone(row)); };
  return {window:windowMock,W,storage,backend,updateCalls,deleteCalls,createCalls,toasts,emitDoc,emitWin,setLocal,deleteLocal,remotePatch,remoteDelete,remoteAdd,setUIBlocked:value=>{uiBlocked=!!value;},getRemote:()=>clone(remote),flattenLocal};
}

async function activate(h){
  h.emitDoc('bisi:planner-bootstrap-complete',{state:'ready',authority:'backend'});
  await sleep(8);
  // Initial no-op sync may still be settling.
  await h.window.BisiPlannerWriteThrough.flush();
  await sleep(2);
}
async function mutateAndFlush(h, kind='edited', detail={}){
  h.emitDoc('bisi:calendar-operation',{kind,...detail});
  return await h.window.BisiPlannerWriteThrough.flush();
}

// 1) Same task edited in two tabs auto-rolls back the stale tab to the backend winner.
{
  const h=makeHarness({rows:[task('a','BASE')]});
  await activate(h);
  h.setLocal('a',{title:'LOCAL EDIT'});
  h.remotePatch('a',{title:'REMOTE EDIT'});
  const result=await mutateAndFlush(h,'edited',{id:'a'});
  check(result?.state==='ready' && result?.conflictsResolved===1 && result?.conflictResolution==='remote-wins', 'same-task concurrent edits auto-resolve to backend winner');
  check(h.updateCalls.length===0 && h.getRemote()[0]?.title==='REMOTE EDIT' && h.flattenLocal()[0]?.title==='REMOTE EDIT', 'stale local edit is rolled back without overwriting remote task');
  check(h.toasts.some(x=>String(x).includes('not saved') || String(x).includes('no se guardó')), 'user sees clear stale-change-not-saved message');
}

// 2) Different tasks can reconcile safely: remote change is merged, local change is written conditionally.
{
  const h=makeHarness({rows:[task('a','A BASE'),task('b','B BASE')]});
  await activate(h);
  h.setLocal('b',{title:'B LOCAL'});
  h.remotePatch('a',{title:'A REMOTE'});
  const result=await mutateAndFlush(h,'edited',{id:'b'});
  const local=h.flattenLocal();
  check(result?.state==='ready' && h.updateCalls.length===1 && h.updateCalls[0].id==='b', 'different-task concurrent edits reconcile without false conflict');
  check(local.find(x=>x.id==='a')?.title==='A REMOTE' && local.find(x=>x.id==='b')?.title==='B LOCAL', 'safe merge keeps remote A and local B');
  check(typeof h.updateCalls[0]?.options?.expectedUpdatedAtServer==='string', 'local update carries expected backend version');
}

// 3) A new task created in another tab is hydrated, never deleted as "unknown remote".
{
  const h=makeHarness({rows:[task('a','A')]});
  await activate(h);
  h.remoteAdd(task('c','REMOTE NEW','2026-09-05','v50'));
  const result=await h.window.BisiPlannerWriteThrough.refreshFromBackend('cross-tab-signal');
  check(result?.state==='ready' && h.flattenLocal().some(x=>x.id==='c'), 'cross-tab remote addition hydrates into idle tab');
  check(h.deleteCalls.length===0, 'remote-only addition is never auto-deleted');
}

// 4) An idle tab accepts a remote delete when its local copy is unchanged.
{
  const h=makeHarness({rows:[task('a','A'),task('b','B')]});
  await activate(h);
  h.remoteDelete('a');
  const result=await h.window.BisiPlannerWriteThrough.refreshFromBackend('focus-refresh');
  check(result?.state==='ready' && !h.flattenLocal().some(x=>x.id==='a'), 'idle tab refresh accepts backend deletion');
}

// 5) Backend conditional version closes the read->write race with HTTP 409 and auto-recovers.
{
  let raced=false;
  const h=makeHarness({rows:[task('a','BASE')], updateRace:({remote,index})=>{
    if(!raced){ raced=true; remote[index]={...remote[index],title:'RACE REMOTE',updatedAtServer:'v999'}; }
  }});
  await activate(h);
  h.setLocal('a',{title:'LOCAL'});
  const result=await mutateAndFlush(h,'edited',{id:'a'});
  check(result?.state==='ready' && result?.conflictsResolved===1, 'backend 409 auto-recovers instead of leaving needs-review');
  check(h.getRemote()[0]?.title==='RACE REMOTE' && h.flattenLocal()[0]?.title==='RACE REMOTE', 'TOCTOU remote winner is preserved and hydrated locally');
}

// 6) A local delete cannot erase a task that changed remotely after the shared baseline; remote wins automatically.
{
  const h=makeHarness({rows:[task('a','BASE')]});
  await activate(h);
  const removed=h.deleteLocal('a');
  h.remotePatch('a',{title:'REMOTE CHANGED'});
  const result=await mutateAndFlush(h,'deleted',{id:'a',transaction:{rows:[{dayKey:'2026-09-04',task:removed}]}});
  check(result?.state==='ready' && result?.conflictsResolved===1 && h.deleteCalls.length===0, 'stale local delete auto-recovers when remote task changed');
  check(h.getRemote()[0]?.title==='REMOTE CHANGED' && h.flattenLocal()[0]?.title==='REMOTE CHANGED', 'remote changed task survives and is restored into stale tab');
}

// 7) A stale-write needs-review marker left by Connection 8 auto-recovers after reload.
{
  const seed=makeHarness({rows:[task('a','BASE')],tabId:'tab-recover'});
  await activate(seed);
  const scopedKey='wabi.backend.planner.writeThrough.v2.tab-recover';
  const marker=clone(seed.storage.get(scopedKey));
  marker.status='needs-review';
  marker.reason='stale-write-conflict';
  marker.conflictIds=['a'];
  marker.ownerUserId='user-a';
  marker.tabId='tab-recover';
  const storageSeed=Object.fromEntries(seed.storage.entries());
  storageSeed[scopedKey]=marker;
  storageSeed['wabi.backend.planner.writeThrough.v1']=clone(marker);
  const h=makeHarness({
    rows:[task('a','REMOTE AFTER OLD REVIEW','2026-09-04','v9')],
    localRowsSeed:[task('a','LOCAL STALE','2026-09-04','v1')],
    tabId:'tab-recover',
    storageSeed
  });
  await activate(h);
  await h.window.BisiPlannerWriteThrough.flush();
  await sleep(8);
  check(h.window.BisiPlannerWriteThrough.status()==='ready', 'persisted stale-write review returns to ready automatically');
  check(h.flattenLocal()[0]?.title==='REMOTE AFTER OLD REVIEW' && h.getRemote()[0]?.title==='REMOTE AFTER OLD REVIEW', 'persisted stale review converges to current backend version');
}

// 8) Per-tab recovery marker is used and includes baseline signatures.
{
  const h=makeHarness({rows:[task('a','A')],tabId:'tab-unique'});
  await activate(h);
  h.setLocal('a',{title:'A LOCAL'});
  h.emitDoc('bisi:calendar-operation',{kind:'edited',id:'a'});
  const scoped=h.storage.get('wabi.backend.planner.writeThrough.v2.tab-unique');
  check(scoped?.tabId==='tab-unique' && scoped?.status==='pending', 'pending recovery marker is scoped to the current tab');
  check(scoped?.baselineSignatures && typeof scoped.baselineSignatures.a==='string', 'per-tab marker persists shared conflict baseline');
}


// 9) A cross-tab refresh must not rewrite planner state underneath an open editor/drag.
{
  const h=makeHarness({rows:[task('a','BASE')]});
  await activate(h);
  h.setUIBlocked(true);
  h.remotePatch('a',{title:'REMOTE WHILE EDITING'});
  const blocked=await h.window.BisiPlannerWriteThrough.refreshFromBackend('cross-tab-signal');
  check(blocked?.state==='waiting' && blocked?.reason==='planner-interaction-active' && h.flattenLocal()[0]?.title==='BASE', 'open planner interaction defers cross-tab hydration');
  h.setUIBlocked(false);
  const refreshed=await h.window.BisiPlannerWriteThrough.refreshFromBackend('manual-refresh');
  check(refreshed?.state==='ready' && h.flattenLocal()[0]?.title==='REMOTE WHILE EDITING', 'deferred refresh converges once planner interaction closes');
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
