import { spawnSync } from 'node:child_process';

const checks = [
  ['Settings authority source', ['scripts/frontend-settings-authority-smoke.mjs']],
  ['Settings authority runtime', ['scripts/frontend-settings-authority-runtime-smoke.mjs']],
];

let pass = 0;
for (const [label, args] of checks) {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nFAIL ${label}`);
    console.error(`SETTINGS AUTHORITY RESULT: ${pass} PASS / 1 FAIL`);
    process.exit(result.status || 1);
  }
  pass += 1;
}
console.log(`\nSETTINGS AUTHORITY RESULT: ${pass} PASS / 0 FAIL`);
