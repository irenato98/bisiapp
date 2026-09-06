import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const config = read('assets/js/bisi.config.js');
const js = read('assets/js/bisi.js');
const readme = read('README_PATCH.md');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};

check(config.includes("appVersion: '6.4.18.3-ai-core5-conversation-ux'"), 'Connection 9 frontend version');
check(config.includes("environment: 'dev-ai-v09-frontend-1'"), 'Connection 9 DEV environment marker');
check(js.includes("const LS_KEY = 'wabi.v6'") && js.includes('saveLocalSafety('), 'wabi.v6 remains a safety/fallback snapshot');
check(js.includes('BisiPlannerBootstrap') && js.includes("authority: 'backend'"), 'planner backend authority remains explicit');
check(js.includes('BisiPlannerWriteThrough') && js.includes('refreshFromBackend'), 'connected planner refresh path remains available');
check(!js.includes('syncAiShadow'), 'legacy AI shadow synchronizer is removed');
check(!js.includes('shadowSignature') && !js.includes('lastShadowSignature') && !js.includes('shadowSyncPromise'), 'legacy AI shadow bookkeeping is removed');
check(!js.includes('aiListTasks(options') && !js.includes('aiCreateTask(task') && !js.includes('aiUpdateTask(id'), 'frontend exposes no secondary AI /tasks mutation transport');
check(js.includes('const plannerCandidateTasks = () =>') && js.includes('Object.entries(W.tasks || {})'), 'AI candidate IDs come from hydrated planner runtime');
check(js.includes('const candidateTaskIds = () => plannerCandidateTasks().map(task => task.id)'), 'AI candidate IDs reuse canonical activity IDs');
check(js.includes('messageNeedsPlannerCandidates') && js.includes('recentHistoryNeedsPlannerCandidates'), 'existing-activity matching still requests candidate IDs when needed');
check(!js.includes('mirrorExecutionLocally'), 'AI confirmation local execution mirror is removed');
check(js.includes('const refreshPlannerAfterAiExecution = async') && js.includes('window.BisiPlannerWriteThrough?.refreshFromBackend'), 'AI confirmation refreshes through connected planner coordinator');
check(js.includes("refresh('ai-confirm-backend-authority')"), 'AI refresh is labeled as backend-authority reconciliation');
check((js.match(/await refreshPlannerAfterAiExecution\(proposal, response\);/g) || []).length >= 3, 'all proposal confirm variants refresh backend state');
check(js.includes("['local-write-pending', 'planner-interaction-active']"), 'AI refresh waits rather than overwriting pending planner interaction');
check(js.includes('confirmAiProposal') && js.includes('cancelAiProposal') && js.includes('reviseAiProposal'), 'AI proposal lifecycle remains intact while paused');
check(js.includes('aiTurn(payload') && js.includes('aiStatus(options'), 'AI transport remains available for later resume');
check(readme.includes('Connection 9') && readme.includes('backend/D1') && readme.includes('shadow'), 'README documents authority cleanup');
check(readme.includes('Backend v0.9.1.3 remains unchanged') && readme.includes('No PROD changes'), 'README records backend baseline and PROD safety');

console.log(`\nAUTHORITY CLEANUP RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
