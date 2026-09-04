import { spawnSync } from 'node:child_process';
const tests=[
  ['source',['scripts/frontend-sync-conflict-smoke.mjs']],
  ['runtime',['scripts/frontend-sync-conflict-runtime-smoke.mjs']],
  ['bootstrap runtime',['scripts/frontend-sync-conflict-bootstrap-runtime-smoke.mjs']],
];
let pass=0;
for(const [label,args] of tests){
  console.log(`\n=== Sync conflicts ${label} ===`);
  const r=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(r.status!==0){ console.error(`SYNC CONFLICT RESULT: ${pass} PASS / 1 FAIL`); process.exit(r.status||1); }
  pass++;
}
console.log(`\nSYNC CONFLICT RESULT: ${pass} PASS / 0 FAIL`);
