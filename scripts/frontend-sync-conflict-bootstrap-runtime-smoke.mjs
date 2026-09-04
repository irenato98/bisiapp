import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const js=fs.readFileSync(path.join(root,'assets/js/bisi.js'),'utf8');
const start=js.indexOf('window.BisiPlannerBootstrap = window.BisiPlannerBootstrap || (() => {');
const end=js.indexOf('window.BisiPlannerWriteThrough = window.BisiPlannerWriteThrough || (() => {',start);
if(start<0||end<0) throw new Error('bootstrap module not found');
const source=js.slice(start,end);
let pass=0,fail=0;
const check=(ok,label)=>{if(ok){pass++;console.log(`PASS ${label}`)}else{fail++;console.error(`FAIL ${label}`)}};
const clone=v=>JSON.parse(JSON.stringify(v));
const task=(id,title,dayKey='2026-09-04')=>({id,title,dayKey,done:false,planned:'0:30',block:'C',priority:'regular',category:'#trabajo',repeat:'none',reminders:[],subtasks:[],notes:'',fixed:false});

function harness({tabId,localTitle,remoteTitle,storageSeed={}}){
  const storage=new Map(Object.entries(clone(storageSeed)));
  const listeners=new Map();
  const documentMock={
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
    dispatchEvent(ev){for(const fn of listeners.get(ev.type)||[])fn(ev);return true;}
  };
  class CustomEventMock{constructor(type,init={}){this.type=type;this.detail=init.detail}}
  const W={
    tasks:{'2026-09-04':[(({dayKey,...rest})=>rest)(task('a',localTitle))]},plannerLocalOwnerId:'user-a',
    state:{selectedTask:null,theme:'light',mode:'normal'},emit(){},saveState(){storage.set('wabi.v6',{schemaVersion:9,ownerUserId:this.plannerLocalOwnerId,tasks:clone(this.tasks),theme:'light',mode:'normal'})}
  };
  const persistence={readJSON:(k,f)=>storage.has(k)?clone(storage.get(k)):f,writeJSON:(k,v)=>{storage.set(k,clone(v));return true},remove:k=>storage.delete(k)};
  const backend={status:()=> 'ready',profile:()=>({id:'user-a'}),async listTasks(){return{tasks:[task('a',remoteTitle)]}},async createTask(){throw new Error('unexpected create')}};
  const windowMock={wabi:W,WabiPersistence:persistence,BisiSessionRuntime:{isAuthenticated:()=>true},BisiBackendConnection:backend,BisiPlannerTabIdentity:{id:()=>tabId}};
  const context=vm.createContext({window:windowMock,W,document:documentMock,CustomEvent:CustomEventMock,console,setTimeout,clearTimeout,Date,JSON,Map,Set,Object,Array,String,Number,Error,Promise});
  vm.runInContext(source,context,{filename:'bootstrap-c8.js'});
  documentMock.dispatchEvent(new CustomEventMock('bisi:planner-runtime-ready'));
  return {window:windowMock,W,storage};
}
const settle=async h=>{for(let i=0;i<20;i++){const r=h.window.BisiPlannerBootstrap.result?.();if(r&&!['checking','idle'].includes(r.state))return r;await new Promise(r=>setTimeout(r,0));}return h.window.BisiPlannerBootstrap.run()};

// Other tab's pending marker must not protect this tab's stale memory.
{
 const h=harness({tabId:'tab-b',localTitle:'STALE B',remoteTitle:'REMOTE A',storageSeed:{
   'wabi.backend.planner.authority.v2.user-a':{version:2,authority:'backend'},
   'wabi.backend.planner.writeThrough.v1':{status:'pending',ownerUserId:'user-a',tabId:'tab-a',baselineSignatures:{a:'x'}},
   'wabi.backend.planner.writeThrough.v2.tab-a':{status:'pending',ownerUserId:'user-a',tabId:'tab-a',baselineSignatures:{a:'x'}}
 }});
 const r=await settle(h);
 const local=h.window.BisiPlannerBootstrap.flattenLocal();
 check(r?.authority==='backend' && r?.mode==='server-authority-replaced-local','other-tab pending marker cannot block current tab backend hydration');
 check(local[0]?.title==='REMOTE A','current tab receives backend canonical content despite other-tab pending marker');
}

// This tab's own scoped pending marker must still protect its unsynced local edit across reload.
{
 const h=harness({tabId:'tab-a',localTitle:'LOCAL PENDING',remoteTitle:'REMOTE OLD',storageSeed:{
   'wabi.backend.planner.authority.v2.user-a':{version:2,authority:'backend'},
   'wabi.backend.planner.writeThrough.v2.tab-a':{status:'pending',ownerUserId:'user-a',tabId:'tab-a',baselineSignatures:{a:'x'}}
 }});
 const r=await settle(h);
 const local=h.window.BisiPlannerBootstrap.flattenLocal();
 check(r?.mode==='local-pending-write-recovery' && r?.authority==='local-safety-copy','same-tab scoped pending marker preserves reload recovery');
 check(local[0]?.title==='LOCAL PENDING','same-tab pending local edit is not overwritten during reload');
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if(fail) process.exit(1);
