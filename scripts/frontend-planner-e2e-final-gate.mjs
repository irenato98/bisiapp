import { spawnSync } from 'node:child_process';

console.log('Bisi Connection 10 — FINAL PLANNER FRONTEND E2E');
const result = spawnSync(process.execPath, ['scripts/frontend-connected-planner-gate.mjs'], { stdio: 'inherit' });
if (result.status !== 0) {
  console.error('\nPLANNER FRONTEND FINAL RESULT: 0 PASS / 1 FAIL');
  process.exit(result.status || 1);
}
console.log('\nPLANNER FRONTEND FINAL RESULT: 1 PASS / 0 FAIL');
