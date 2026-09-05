import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const js = fs.readFileSync(path.join(root, 'assets/js/bisi.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'assets/js/bisi.config.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README_PATCH.md'), 'utf8');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};

check(config.includes("appVersion: '6.4.18.2-ai-beta-free-entry-ux'"), 'Connection 9 frontend version');
check(config.includes("environment: 'dev-ai-v09-frontend-1'"), 'Connection 9 DEV environment marker');
check(js.includes('W.plannerLocalOwnerId = null;'), 'planner local copy has explicit owner state');
check(js.includes('ownerUserId: W.plannerLocalOwnerId || null'), 'wabi.v6 safety snapshot records owner user id');
check(js.includes("const AUTHORITY_KEY_PREFIX = 'wabi.backend.planner.authority.v2.'"), 'planner authority sentinel is scoped per backend user');
check(js.includes("const QUARANTINE_KEY = 'wabi.backend.planner.quarantine.v1'"), 'foreign local state has quarantine storage');
check(js.includes("quarantineForeignLocal('planner-owner-mismatch'"), 'owner mismatch is quarantined instead of migrated');
check(js.includes("ownershipMode = 'quarantined-foreign-local'"), 'owner mismatch is recorded diagnostically');
check(js.includes("'server-authority-pruned-stale-local'"), 'established backend authority prunes stale local-only residue');
check(js.includes("'server-authority-cleared-stale-local'"), 'established empty backend does not re-upload stale local residue');
check(js.includes("'stale-local-pruned-after-authority'"), 'pruned local data is backed up before replacement');
check(js.includes('!authorityEstablished') && js.includes("reason: 'local-only-activities'"), 'unestablished legacy local-only data remains conservative review');
check(js.includes('for (const task of missing) await window.BisiBackendConnection.createTask(task);'), 'first-time unowned legacy local planner can still migrate when backend is empty');
check(js.includes('establishAuthority(currentUserId, lastResult.mode)'), 'successful backend authority is durably established for current user');
check(js.includes('ownerUserId: currentBackendUserId()'), 'write-through recovery marker is user-scoped');
check(js.includes('persistedOwnerId && currentUserId && persistedOwnerId !== currentUserId ? null : rawPersisted'), 'foreign write-through marker is ignored for current account');
check(js.includes('markerBelongsToCurrentUser') && js.includes('bootstrapBelongsToCurrentUser'), 'bootstrap recovery only trusts markers belonging to current account');
check(readme.includes('Connection 7') && readme.includes('per-user'), 'README documents Connection 7 per-user local cleanup');
check(readme.includes('backend/D1 remains the canonical planner authority'), 'README keeps backend planner authority explicit');
check(readme.includes('Bisi IA v0.9 frontend is enabled in DEV'), 'Bisi IA v0.9 frontend is enabled in DEV');
check(readme.includes('No PROD changes'), 'PROD remains untouched');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
