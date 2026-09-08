import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const bisi = read('assets/js/bisi.js');
const foundation = read('assets/js/auth-v1-foundation.js');
const onboardingStart = bisi.indexOf("const FLOW_KEY = 'wabi.onboarding.flow.v3.completed'");
const finishStart = bisi.indexOf('async function finish()', onboardingStart);
const finishEnd = bisi.indexOf('function bindLegalAndLanguage()', finishStart);
const finishBlock = bisi.slice(finishStart, finishEnd);
const finishCatch = finishBlock.slice(finishBlock.indexOf('catch {'), finishBlock.indexOf('finally {'));
const routeStart = bisi.indexOf('window.__bisiApplyBackendAuthState', onboardingStart);
const routeEnd = bisi.indexOf('\n})();', routeStart);
const routeBlock = bisi.slice(routeStart, routeEnd);
const explicitRoute = routeBlock.slice(routeBlock.indexOf('if (onboarding.status)'), routeBlock.indexOf('let cachedComplete'));

const checks = [
  ['current-root runtime sources parse', parses(bisi) && parses(foundation)],
  ['backend client PATCHes /me/onboarding', bisi.includes("updateOnboarding(patch, options = {}) { return this.request('/me/onboarding', { method: 'PATCH', body: patch")],
  ['onboarding PATCH reuses request CSRF handling', bisi.includes("if (!['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase()))") && bisi.includes("opts.headers['X-CSRF-Token'] = csrf")],
  ['base connection exposes authenticated onboarding write', bisi.includes('updateOnboarding: async (patch, options = {}) => {') && bisi.includes('withSession(() => window.BisiBackend.updateOnboarding(patch, options), options)')],
  ['foundation connection exposes authenticated onboarding write', foundation.includes('updateOnboarding: async (patch, options = {}) => {') && foundation.includes('withSession(() => Backend.updateOnboarding(patch, options), options)')],
  ['updated response refreshes onboarding profile snapshot', foundation.includes('onboardingStatus: status, onboardingCurrentStep: currentStep') && bisi.includes('onboardingStatus: status, onboardingCurrentStep: currentStep')],
  ['existing onboarding has one stable import step', bisi.includes("const ONBOARDING_STEP_IMPORT = 'import'") && bisi.includes('normalizeOnboardingStep(currentStep) || ONBOARDING_STEP_IMPORT')],
  ['not_started displays onboarding and starts durable progress', explicitRoute.includes("onboarding.status === 'not_started'") && explicitRoute.includes('showOnboarding(resumableStep, { persistProgress: shouldPersistProgress })')],
  ['beginning onboarding persists in_progress plus currentStep', bisi.includes("queueOnboardingUpdate({ status: 'in_progress', currentStep: stableStep })")],
  ['onboarding writes are serialized against completion races', bisi.includes('onboardingWriteQueue.catch(() => { }).then(async () =>') && bisi.includes('onboardingWriteQueue = request')],
  ['in_progress safely resumes a recognized durable step', explicitRoute.includes('const resumableStep = normalizeOnboardingStep(onboarding.currentStep)') && bisi.includes('layer.dataset.onboardingCurrentStep = stableStep')],
  ['missing in_progress currentStep is durably filled with the real step', explicitRoute.includes("onboarding.status === 'in_progress' && onboarding.currentStep == null")],
  ['unknown durable step is not automatically overwritten', explicitRoute.includes('onboarding.currentStep == null') && bisi.includes('normalizeOnboardingStep(value)')],
  ['finish and legitimate skip share backend completion', bisi.includes("$('[data-entry-finish]', layer).onclick = $('[data-entry-skip]', layer).onclick = finish")],
  ['completion waits for backend and verifies completed status', ordered(finishBlock, "await queueOnboardingUpdate({ status: 'completed'", "onboardingAuthority.status !== 'completed'", "cacheExplicitOnboarding('completed')", 'showAuthenticatedApp()')],
  ['failed completion leaves onboarding active without local success', finishCatch.includes("setAuthState('onboarding')") && finishCatch.includes('button.disabled = false') && !finishCatch.includes('cacheExplicitOnboarding') && !finishCatch.includes('showAuthenticatedApp')],
  ['backend completed user enters app without redundant PATCH', explicitRoute.includes("if (onboarding.status === 'completed')") && explicitRoute.includes('showAuthenticatedApp()') && !explicitRoute.includes('queueOnboardingUpdate')],
  ['explicit backend status outranks legacy completion cache', routeBlock.indexOf('if (onboarding.status)') < routeBlock.indexOf('let cachedComplete')],
  ['older responses retain non-destructive compatibility routing', routeBlock.includes("cachedComplete = window.WabiPersistence.get(FLOW_KEY) === '1'") && routeBlock.includes('showOnboarding();')],
  ['tutorial completion remains separate from onboarding writes', !finishBlock.includes('TOUR_KEY') && !finishBlock.includes('wabi.postonboarding.video.v3.completed') && bisi.includes("window.WabiPersistence.set(TOUR_KEY, '1')")],
];

function parses(source) {
  try { new Function(source); return true; } catch { return false; }
}

function ordered(source, ...needles) {
  let cursor = -1;
  for (const needle of needles) {
    cursor = source.indexOf(needle, cursor + 1);
    if (cursor < 0) return false;
  }
  return true;
}

let pass = 0;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  pass += 1;
  console.log(`PASS ${name}`);
}

console.log(`FRONTEND AUTH V1 DURABLE ONBOARDING: ${pass} PASS / 0 FAIL`);
