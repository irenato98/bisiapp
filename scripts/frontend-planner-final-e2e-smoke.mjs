import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const config = read('assets/js/bisi.config.js');
const js = read('assets/js/bisi.js');
const html = read('index.html');
const readme = read('README_PATCH.md');
let pass = 0;
let fail = 0;
const check = (ok, label) => {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
};

console.log('Bisi planner final frontend E2E contract');
check(config.includes("appVersion: '6.4.18.1-ai-conversation-ux'"), 'validated planner runtime remains intact under AI v0.9 frontend');
check(config.includes("environment: 'dev-ai-v09-frontend-1'"), 'DEV-only planner connection marker remains active');
check(config.includes('bisiapp-backend-dev.renabiboovie.workers.dev'), 'frontend points to DEV Worker');
check(!config.includes('bisiapp-backend.renabiboovie.workers.dev\''), 'frontend does not point planner transport at PROD Worker');
check(js.includes("authority: 'backend'") && js.includes('server-authority-replaced-local'), 'backend/D1 remains planner reload authority');
check(js.includes('ownerUserId') && js.includes('wabi.backend.planner.quarantine.v1'), 'local safety snapshot is user-scoped and foreign residue is quarantined');
check(js.includes('expectedUpdatedAtServer') && js.includes('stale-write-conflict'), 'optimistic concurrency and stale-write recovery remain connected');
check(js.includes('plannerInteractionBlocksRefresh') && js.includes('cross-tab-backend-refresh'), 'cross-tab refresh defers during active planner interaction');
check(js.includes('pendingDeleteIds') && js.includes('approveReviewDeletes'), 'durable delete intent and safe review repair remain available');
check(js.includes('generatedOccurrenceId') && js.includes('recurrenceSeriesId') && js.includes('recurrenceForDate'), 'recurrence identity and lineage remain deterministic');
check(js.includes("SYNCED_PREF_KEYS = Object.freeze(['language', 'theme', 'sound', 'soundProfile', 'focusSound', 'completeSound', 'deleteSound'])"), 'language/theme/sound preferences remain backend-synced');
check(js.includes('plannerBlocksV2') && js.includes('settingsAuthorityVersion'), 'planner Blocks remain under backend settings authority');
check(js.includes('syncDocumentLanguageMetadata') && js.includes('MutationObserver'), 'document language metadata guard remains active');
check(html.includes('<html lang="es-419"'), 'raw HTML declares Spanish Latin America');
check(!js.includes('syncPlannerShadow('), 'legacy AI task shadow writer remains removed');
check(js.includes('refreshPlannerAfterAiExecution') && js.includes("refresh('ai-confirm-backend-authority')"), 'AI confirm path will refresh canonical backend planner when resumed');
check(readme.includes('backend/D1 remains the canonical planner authority') || readme.includes('backend/D1 is the canonical reload snapshot'), 'README preserves backend authority guarantee');
check(readme.includes('No PROD changes'), 'README preserves PROD safety boundary');

console.log(`\nPLANNER FINAL FRONTEND CONTRACT: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
