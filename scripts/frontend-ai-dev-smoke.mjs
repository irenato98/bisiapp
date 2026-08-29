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

check(config.includes("appVersion: '6.4.4-dev-ai-priority-ux'"), 'frontend version');
check(config.includes('backendEnabled: false'), 'general backend remains disabled');
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
check(js.includes('márcal[oa]') && js.includes('prioridad|priority'), 'explicit existing-card priority commands request shadow candidates');
for (const status of ['need_match', 'proposal', 'safety']) {
  check(js.includes(`ai.status === '${status}'`), `render ${status}`);
}
check(js.includes('renderPriorities(ai.priorities)'), 'render priority_suggestion / proposal priorities');
check(js.includes('closeAiSession === true'), 'safety closeAiSession');
check(js.includes('confirmAiProposal') && js.includes('cancelAiProposal'), 'proposal Confirm/Cancel');
check(js.includes('reviseAiProposal') && js.includes('/revise'), 'immutable proposal revision endpoint wired');
check(js.includes("Array.isArray(ai.priorities) && ai.priorities.length") && js.includes('renderPriorities(ai.priorities)'), 'priority suggestions render with proposal flows too');
check(js.includes("action.type === 'set_priority'") && js.includes('priorityLabel(action.priority)'), 'explicit priority proposal has review UI');
check(js.includes('Array.isArray(data.proposals)') && js.includes('actions.length !== 1'), 'multi-card response renders as individual proposals only');
check(!js.includes('multiUnsupported'), 'old multi-card browser block removed');
check(js.includes('wabi-ai-clock-edit') && js.includes('AM/PM'), 'fixed-time proposal editor keeps explicit AM/PM control');
check(js.includes('estimatedDuration') && js.includes('blockSelect'), 'flexible proposal editor exposes estimated duration + block');
check(js.includes('fixedBlockNote'), 'fixed proposal block is read-only reference');
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
check(js.includes('Las horas se muestran en formato de 24 h.') && js.includes('wabi-ai-time-format-note'), 'one fixed-proposal 24h note is present');
check(js.includes("text.addEventListener('blur', () => refresh(true))"), 'time editor auto-normalizes missing minutes on blur');
check(js.includes("meridiem.addEventListener('change'") && js.includes("if (meridiem.value === 'PM' && h < 12) h += 12"), 'AM/PM selector updates visible 24h field');
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
