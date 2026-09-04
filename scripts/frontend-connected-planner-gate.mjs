import { spawnSync } from 'node:child_process';

const gates = [
  ['JavaScript syntax', ['--check', 'assets/js/bisi.js']],
  ['AI isolation', ['scripts/frontend-ai-dev-smoke.mjs']],
  ['Backend connection', ['scripts/frontend-backend-connection-smoke.mjs']],
  ['Server-authority bootstrap', ['scripts/frontend-planner-bootstrap-smoke.mjs']],
  ['Planner write-through', ['scripts/frontend-planner-write-through-smoke.mjs']],
  ['Recurrence connected', ['scripts/frontend-planner-recurrence-smoke.mjs']],
];

let pass = 0;
for (const [label, args] of gates) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nFAIL ${label}`);
    console.error(`RESULT: ${pass} PASS / 1 FAIL`);
    process.exit(result.status || 1);
  }
  pass += 1;
  console.log(`PASS GATE ${label}`);
}

console.log(`\nCONNECTED PLANNER GATE RESULT: ${pass} PASS / 0 FAIL`);
