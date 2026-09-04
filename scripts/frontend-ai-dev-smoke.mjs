import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
const check = (ok, label) => {
  if (ok) { console.log(`PASS  ${label}`); pass++; }
  else { console.error(`FAIL  ${label}`); fail++; }
};

const config = read('assets/js/bisi.config.js');
const js = read('assets/js/bisi.js');
const css = read('assets/css/bisi.css');
const html = read('index.html');
const renderProposalSource = js.slice(js.indexOf('const renderProposal = async rawProposal => {'), js.indexOf('const stopAiSession = () => {'));
const renderPrioritiesSource = js.slice(js.indexOf('const renderPriorities = priorities => {'), js.indexOf('const resolveProposalIfNeeded = async proposal => {'));

check(config.includes("appVersion: '6.4.14-settings-authority'"), 'frontend version');
check(!js.includes('plannerTaskBucketsForAi'), 'experimental V6.4.7.1 shadow-state recovery is absent');
check(config.includes('backendEnabled: true'), 'general backend is enabled in DEV');
check(config.includes('devBrowserBridgeEnabled: true'), 'general DEV browser bridge enabled');
check(config.includes("apiBase: 'https://bisiapp-backend-dev.renabiboovie.workers.dev/api'"), 'general DEV Worker API configured');
check(js.includes('openDevBridgeSession') && js.includes('devBridgeIsEnabled'), 'general backend DEV bridge bootstrap exists');
check(js.includes('BisiBackendConnection') && js.includes('probePlannerTransport'), 'general backend connection coordinator + planner transport probe exist');
check(js.includes('BisiProfileSync') && js.includes("const PROFILE_KEY = 'wabi.beta.profile'") && js.includes("const PREFS_KEY = 'wabi.beta.prefs'"), 'local profile/preferences sync foundation is wired');
check(js.includes("const LS_KEY = 'wabi.v6'") && js.includes('hydrateFromBackend(remoteRows, localRows'), 'planner keeps local safety copy while backend can hydrate canonical reload state');
check(config.includes('aiBackendEnabled: true'), 'AI backend enabled');
check(config.includes('aiDevBrowserBridgeEnabled: true'), 'DEV browser bridge enabled');
check(config.includes('https://bisiapp-backend-dev.renabiboovie.workers.dev/api'), 'DEV Worker API configured');
check(!/DEV_AUTH_TOKEN|ADMIN_DEV_TOKEN|Bearer\s+[A-Za-z0-9._-]{16,}/.test(config + '\n' + js), 'no DEV/admin secret in frontend JS');
check(js.includes('openAiDevBridgeSession') && js.includes('/auth/dev-browser-login'), 'DEV AI session bootstrap');
check(js.includes('closeAiDevBridgeSession') && js.includes('/auth/logout'), 'DEV AI session revoke');
check(js.includes('__bisiAiBridgeClosePromise') && js.includes('waitForBridgeClose'), 'bridge close/open race is serialized');
check(js.includes('recoverAiBackendSession') && js.includes('withAiReconnect'), '401/403 gets one automatic reconnect attempt');
check(js.includes('syncAiShadow') && js.includes('aiListTasks') && js.includes('aiUpdateTask') && js.includes('aiCreateTask'), 'local planner shadow sync');
check(js.includes('messageNeedsShadow') && js.includes('needsShadow ? candidateTaskIds() : []'), 'simple chat does not wait for shadow matching');
check(js.includes('recentHistoryNeedsShadow') && js.includes('messageNeedsShadow(text) || recentHistoryNeedsShadow(priorHistory)'), 'existing-card follow-ups preserve shadow candidates from recent chat context');
check(js.includes("split(/\\n\\s*\\n+/)") && css.includes('.wabi-ai-assistant-copy>p+p{margin-top:9px}'), 'assistant blank-line paragraphs render with compact 9px spacing');
check(js.includes('márcal[oa]') && js.includes('prioridad|priority'), 'explicit existing-card priority commands request shadow candidates');
for (const status of ['need_match', 'proposal', 'safety']) {
  check(js.includes(`ai.status === '${status}'`), `render ${status}`);
}
check(js.includes("ai.status === 'priority_suggestion'") && js.includes('renderPriorities(ai.priorities)'), 'render recommended order for priority_suggestion');

check(html.includes('<div class="sidebar-section">Peso</div>') && !html.includes('<div class="sidebar-section">Prioridad</div>'), 'planner sidebar uses Peso instead of Prioridad');
check(js.includes("uiCopy('Peso', 'Weight')") && js.includes("priority: 'Weight'") && js.includes("priority: 'Peso'"), 'visible Weight/Peso labels are wired in planner and AI');
check(js.includes("'Peso': 'Weight'") && !js.includes("'Prioridad': 'Priority'"), 'locale map translates Peso to Weight');
check(!js.includes('Primeros 50 miembros') && !js.includes('First 50 members') && !js.includes('Los primeros 50 usuarios'), 'public Founder copy exposes no numerical slot count');
check(js.includes('data-founder-card hidden') && js.includes("if (x?.founder === true)") && js.includes('card.hidden = false'), 'Founder card is hidden until backend authority confirms founder');
check(renderPrioritiesSource.includes('const unique = new Map()') && renderPrioritiesSource.includes('item?.itemRef'), 'recommended order dedupes by backend activity reference');
check(renderPrioritiesSource.includes("appendCard('wabi-ai-priority-list')") && !renderPrioritiesSource.includes('wabi-ai-structured'), 'recommended order renders as compact chat list, not structured proposal card');
check(!renderPrioritiesSource.includes('eisenhowerQuadrant') && !renderPrioritiesSource.includes('quadrantLabel'), 'recommended order does not expose Eisenhower quadrant labels as Weight');
check(renderProposalSource.includes("action.type === 'move_card'") && renderProposalSource.includes('action.currentPlacement') && renderProposalSource.includes('wabi-ai-diff-edit-row'), 'existing move proposal renders current-to-proposed diffs');
check(renderProposalSource.includes("action.type === 'set_priority'") && renderProposalSource.includes('action.currentPriority') && renderProposalSource.includes('wabi-ai-diff-arrow'), 'existing Weight proposal renders old-to-new Weight diff');
check(renderProposalSource.includes('C.unchanged') && js.includes("unchanged: 'Lo demás se mantiene igual.'") && js.includes("unchanged: 'Everything else stays the same.'"), 'existing proposals state that untouched fields remain unchanged');
check(!js.includes('Más detalles') && !js.includes('More details'), 'no More details expander');
check(js.includes('const candidateTaskIds = () => [...new Set('), 'shadow candidate IDs are deduped before AI requests');
check(!js.includes('Nueva tarea') && !js.includes('Tarea creada') && !js.includes('Tarea eliminada') && !js.includes('Eliminar tarea'), 'legacy visible tarea labels are normalized to Actividad');
check(css.includes('V6.4.7 — Weight semantics') && css.includes('.wabi-ai-unchanged-note') && css.includes('.wabi-ai-diff-time-controls'), 'V6.4.7 compact list/diff CSS present');
check(js.includes('closeAiSession === true'), 'safety closeAiSession');
check(js.includes('confirmAiProposal') && js.includes('cancelAiProposal'), 'proposal Confirm/Cancel');
check(js.includes('reviseAiProposal') && js.includes('/revise'), 'immutable proposal revision endpoint wired');
check(js.includes("if (ai.status === 'priority_suggestion' && Array.isArray(ai.priorities)"), 'recommended order is not re-rendered as part of proposal status');
check(js.includes("action.type === 'set_priority'") && js.includes('priorityLabel(action.priority)'), 'explicit priority proposal has review UI');
check(js.includes('Array.isArray(data.proposals)') && js.includes('actions.length !== 1'), 'multi-card response renders as individual proposals only');
check(!js.includes('multiUnsupported'), 'old multi-card browser block removed');
check(js.includes('wabi-ai-clock-edit') && js.includes('AM/PM'), 'fixed-time proposal editor keeps explicit AM/PM control');
check(js.includes('estimatedDuration') && js.includes('blockSelect'), 'flexible proposal editor exposes estimated duration + block');
check(renderProposalSource.includes("const titleHost = makeFieldRow(item, C.name)") && renderProposalSource.includes("const dateHost = makeFieldRow(item, C.date)") && renderProposalSource.includes("const startHost = makeFieldRow(item, C.start)") && renderProposalSource.includes("const endHost = makeFieldRow(item, C.end)"), 'fixed create proposal keeps only its required scheduling fields before optional mentions');
check(js.includes('categories: (W.CATS || []).map') && js.includes('reminderOptions: [...REMINDER_VALUES]') && js.includes('repeatOptions: [...REPEAT_VALUES]'), 'AI planner context uses live Create Activity options');
check(renderProposalSource.includes("mentionedFields.has('priority')") && renderProposalSource.includes("mentionedFields.has('category')") && renderProposalSource.includes("mentionedFields.has('reminder')") && renderProposalSource.includes("mentionedFields.has('repeat')") && renderProposalSource.includes("mentionedFields.has('notes')") && renderProposalSource.includes("mentionedFields.has('subtasks')"), 'create proposal shows only optional fields explicitly mentioned for that activity');
check(js.includes('REMINDER_VALUES.map') && js.includes('REPEAT_VALUES.map') && js.includes('W.CATS || []'), 'proposal selects reuse Create Activity option sources');
check(js.includes("action.reminderMinutes == null ? [] : [Number(action.reminderMinutes)]") && js.includes("category: action.category || null") && js.includes("repeat: action.repeat || 'none'") && js.includes("notes: String(action.notes || '')"), 'local mirror preserves category/reminder/repeat/note');
check(js.includes('Array.isArray(action.subtasks) ? action.subtasks.map'), 'local mirror preserves subtasks');
check(js.includes("proposal?.requiresPlacementResolution === true || proposal?.resolutionRequired === true") && js.includes('resolveProposalIfNeeded(proposal)'), 'flexible proposal resolves only at Confirm');
check(js.includes('mirrorExecutionLocally') && js.includes("priority: action.priority || 'regular'") && js.includes("action.type === 'set_priority'") && js.includes('renderSurface(); syncShell();'), 'planner mirrors create/move/priority execution and refreshes');
check(js.includes("fixed = p.mode === 'fixed'") || js.includes("const fixed = p.mode === 'fixed'"), 'flexible proposals stay flexible locally');
check(js.includes('Bisi IA está en beta. Puede cometer errores.') && js.includes('Este chat no se guarda. Si lo cierras, perderás la conversación.'), 'approved ES beta + ephemeral chat notice');
check(js.includes('Bisi AI is in beta. It can make mistakes.') && js.includes("This chat isn’t saved. If you close it, the conversation will be lost."), 'approved EN beta + ephemeral chat notice');
check(js.includes('history.slice(-6)') && !/localStorage[^\n]{0,120}(?:history|chat)/i.test(js), 'chat context remains short-lived in memory');
check(js.includes('createStarter') && js.includes('prioritizeStarter') && js.includes('usePreset'), 'preset buttons guide locally without spending AI');
check(js.includes('sessionReadyPromise') && js.includes('bootController') && js.includes('shadowSyncPromise'), 'AI boot remains non-blocking');
check(js.includes('bisi:locale-changed') && js.includes('onLocaleChanged'), 'AI panel resets cleanly when app language changes');
check(js.includes('lastShadowSignature') && js.includes('shadowSignature'), 'unchanged shadow sync is skipped');
check(css.includes('.wabi-ai-proposal-editable') && css.includes('.wabi-ai-edit-row'), 'proposal editor CSS present');
check(js.includes('parseClockEntry') && js.includes('text24') && js.includes('clock24Parts'), 'time editor displays normalized 24h values directly');
check(!js.includes('wabi-ai-clock-24') && !js.includes('C.clock24'), 'old per-field 24h helper removed');
check(!renderProposalSource.includes('fixedBlockNote') && !renderProposalSource.includes('timeFormatNote') && !renderProposalSource.includes('blockRef') && !renderProposalSource.includes('durationRef'), 'fixed create proposal stays compact: no derived Block/duration rows or extra time note');
check(js.includes("text.addEventListener('blur', () => refresh(true))"), 'time editor auto-normalizes missing minutes on blur');
check(js.includes("meridiem.addEventListener('change'") && js.includes("if (meridiem.value === 'PM' && h < 12) h += 12"), 'AM/PM selector updates visible 24h field');
check(js.includes('editVersion') && js.includes('preserveVisibleEdits') && js.includes('newerVisibleEdit'), 'stale proposal revisions cannot bounce AM/PM or overwrite newer visible edits');
check(js.includes("messages.scrollTo({ top: Math.max(0, target), behavior: reducedMotion() ? 'auto' : 'smooth' })") && js.includes('preferStart: true'), 'long AI responses smooth-scroll to the start of the new Bisi turn');
check(!js.includes('messages.scrollTop = messages.scrollHeight'), 'AI responses never hard-jump directly to the bottom');
check(js.includes('turnCharacterBlink') && js.includes('turnCharacterBase') && js.includes('frames = [turnCharacterBlink'), 'assistant turn character triple-blink assets wired');
check(js.includes('prefers-reduced-motion: reduce') && js.includes('reducedMotion'), 'assistant entry blink respects reduced motion');
check(js.includes('revealMessageNode') && js.includes('requestAnimationFrame(() => requestAnimationFrame'), 'proposal/message visibility recalculated after full render');
check(css.includes('overflow-y:auto!important') && css.includes('overflow-x:hidden!important') && css.includes('scrollbar-gutter:stable'), 'AI message column is vertical-only and resilient');
check(css.includes('.wabi-ai-scrim{overflow:hidden!important}') && css.includes('.wabi-ai-message.user{width:auto!important;max-width:88%!important'), 'AI sheet has final zero-horizontal-overflow guards');
check(css.includes('.wabi-ai-proposal-actions{position:static!important'), 'proposal actions remain in normal vertical flow');
check(css.includes('grid-template-columns:30px minmax(0,1fr)') && css.includes('max-width:30px!important'), 'assistant turn avatar is hard-capped at 30px desktop');
check(css.includes('width:28px!important') && css.includes('max-width:28px!important'), 'assistant turn avatar is hard-capped at 28px mobile');
check(!css.includes('\\n\\n/* V6.4.3'), 'malformed escaped V6.4.3 CSS block removed');

const fonts = [
  'inter-variable.woff2', 'inter-variable-italic.woff2',
  'open-sans-variable.woff2', 'open-sans-variable-italic.woff2',
  'work-sans-variable.woff2', 'work-sans-variable-italic.woff2'
];
for (const font of fonts) check(fs.existsSync(path.join(root, 'assets/fonts', font)), `font exists: ${font}`);
check(!/url\(["']?\/fonts\//.test(css), 'CSS has no root /fonts references');
check((css.match(/\.\.\/fonts\//g) || []).length >= 6, 'CSS uses assets/fonts-relative paths');

const syntax = spawnSync(process.execPath, ['--check', path.join(root, 'assets/js/bisi.js')], { encoding: 'utf8' });
check(syntax.status === 0, 'bisi.js syntax');

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
