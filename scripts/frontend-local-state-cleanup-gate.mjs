import { spawnSync } from 'node:child_process';

const tests = [
  ['Local-state cleanup source', ['scripts/frontend-local-state-cleanup-smoke.mjs']],
  ['Local-state cleanup runtime', ['scripts/frontend-local-state-cleanup-runtime-smoke.mjs']],
];
let pass = 0;
for (const [label,args] of tests) {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(process.execPath,args,{stdio:'inherit'});
  if (result.status !== 0) {
    console.error(`\nFAIL ${label}`);
    console.error(`LOCAL STATE CLEANUP RESULT: ${pass} PASS / 1 FAIL`);
    process.exit(result.status || 1);
  }
  pass += 1;
}
console.log(`\nLOCAL STATE CLEANUP RESULT: ${pass} PASS / 0 FAIL`);
