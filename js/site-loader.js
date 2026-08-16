/**
 * Site loader — white overlay + signature construct/deconstruct on every page.
 */
// Version query kept in step with the ?v= on the <script>/<link> tags in the
// HTML. Without it a returning visitor's cached copy of this module would keep
// importing the deleted 3D-logo module, the import would fail, and the loader
// would never run — leaving a white screen until the inline 7s fallback fires.
import { runSiteLoaderSignature } from './site-loader-signature.js?v=signature-1';

const HOLD_MS = 180;
const FONTS_MS = 1500;
const LOADER_MAX_MS = 5500;
const FONTS = [
  '400 1em "Reckless"',
  '500 1em "Reckless"',
  '400 1em "Suisse Intl"',
  '500 1em "Suisse Intl"',
];

let finished = false;

function sleep(ms) {
  return new Promise((resolve) => { window.setTimeout(resolve, ms); });
}

function withTimeout(promise, ms) {
  return Promise.race([promise, sleep(ms)]);
}

function waitForFonts() {
  if (!document.fonts) return Promise.resolve();
  // Load faces but do NOT await document.fonts.ready — it can hang forever
  // on Safari/Firefox when @font-face sources 404 or never settle.
  const loads = Promise.all(
    FONTS.map((face) => document.fonts.load(face).catch(() => {}))
  );
  return withTimeout(loads, FONTS_MS);
}

function shouldSkipSignatureAnim() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return !window.gsap || !document.getElementById('site-loader-signature');
}

function clearLoadingState() {
  document.documentElement.classList.remove('is-loading');
}

function finishLoader() {
  if (finished) return;
  finished = true;

  const loader = document.getElementById('site-loader');
  if (!loader) {
    clearLoadingState();
    return;
  }

  loader.classList.add('is-done', 'is-revealing');
  clearLoadingState();

  const cleanup = () => {
    loader.remove();
  };

  loader.addEventListener('transitionend', cleanup, { once: true });
  window.setTimeout(cleanup, 600);
}

function holdAssembled() {
  return sleep(HOLD_MS);
}

async function runLoader() {
  const fonts = waitForFonts();
  const svg = document.getElementById('site-loader-signature');

  try {
    if (!shouldSkipSignatureAnim()) {
      await runSiteLoaderSignature(svg, {
        beforeDeconstruct: () => Promise.all([fonts, holdAssembled()]),
      });
    } else {
      await fonts;
    }
  } catch (err) {
    console.error('Site loader failed:', err);
    await fonts.catch(() => {});
  }
}

async function boot() {
  // Attach catch on the work promise so a late rejection after the race
  // timeout cannot become an unhandled rejection.
  const work = runLoader();
  try {
    await withTimeout(work, LOADER_MAX_MS);
  } catch (err) {
    console.error('Site loader boot failed:', err);
  } finally {
    finishLoader();
  }
  // Keep swallowing late errors from work after we already dismissed.
  work.catch(() => {});
}

window.siteReady = boot();

// Absolute fallback if the module body runs but boot somehow stalls before finally.
window.setTimeout(finishLoader, LOADER_MAX_MS + 500);
