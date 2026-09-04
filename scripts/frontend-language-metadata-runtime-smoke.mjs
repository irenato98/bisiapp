import fs from 'node:fs';
import vm from 'node:vm';

const js = fs.readFileSync('assets/js/bisi.js', 'utf8');
let pass = 0;
let fail = 0;
function check(ok, label) {
  if (ok) { pass += 1; console.log(`PASS ${label}`); }
  else { fail += 1; console.error(`FAIL ${label}`); }
}

const start = js.indexOf('    function expectedDocumentLanguage()');
const end = js.indexOf('    function setLocale(next, options = {})', start);
check(start >= 0 && end > start, 'language metadata helper section is extractable');
if (start < 0 || end <= start) process.exit(1);
const helpers = js.slice(start, end);

const root = { lang: 'fr', dataset: { wabiLocale: 'es-419' } };
const meta = {
  content: 'fr',
  getAttribute(name) { return name === 'content' ? this.content : null; },
  setAttribute(name, value) { if (name === 'content') this.content = value; }
};
let observerCallback = null;
class MutationObserver {
  constructor(cb) { observerCallback = cb; }
  observe(target, options) { this.target = target; this.options = options; }
}
const listeners = new Map();
const windowListeners = new Map();
const context = {
  locale: 'es-419',
  MutationObserver,
  document: {
    documentElement: root,
    hidden: false,
    querySelector(sel) { return sel === 'meta#bisi-content-language' ? meta : null; },
    addEventListener(type, cb) { listeners.set(type, cb); }
  },
  window: {
    addEventListener(type, cb) { windowListeners.set(type, cb); }
  }
};
vm.createContext(context);
vm.runInContext(`${helpers}\nthis.syncDocumentLanguageMetadata = syncDocumentLanguageMetadata; this.installDocumentLanguageGuard = installDocumentLanguageGuard; this.setTestLocale = value => { locale = value; };`, context, { filename: 'language-metadata-extract.js' });

context.syncDocumentLanguageMetadata();
check(root.lang === 'es-419', 'Spanish app locale repairs foreign html lang');
check(root.dataset.wabiLocale === 'es-419', 'Spanish dataset locale stays canonical');
check(meta.content === 'es-419', 'Spanish Content-Language follows app locale');

context.installDocumentLanguageGuard();
check(typeof observerCallback === 'function', 'MutationObserver guard is installed');
root.lang = 'fr';
observerCallback?.();
check(root.lang === 'es-419', 'external French lang mutation is automatically repaired');

context.setTestLocale('en');
context.syncDocumentLanguageMetadata();
check(root.lang === 'en' && root.dataset.wabiLocale === 'en' && meta.content === 'en', 'English locale aligns all document language metadata');
root.dataset.wabiLocale = 'fr';
observerCallback?.();
check(root.dataset.wabiLocale === 'en', 'external dataset locale mutation is automatically repaired');

root.lang = 'fr';
windowListeners.get('pageshow')?.();
check(root.lang === 'en', 'pageshow reasserts canonical language metadata');
root.lang = 'fr';
listeners.get('visibilitychange')?.();
check(root.lang === 'en', 'foreground visibility reasserts canonical language metadata');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
