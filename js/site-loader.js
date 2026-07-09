/**
 * Site loader — white screen + logo immediately, fonts in parallel, then animate out.
 * Feed grid intro (infinite-grid.js) is unchanged — it runs after this resolves.
 */
import { runSiteLoaderLogo } from './site-loader-logo.js';

const HOLD_MS = 180;
const FONTS = [
  '400 1em "Reckless"',
  '500 1em "Reckless"',
  '400 1em "Suisse Intl"',
  '500 1em "Suisse Intl"',
];

function waitForFonts() {
  if (!document.fonts) return Promise.resolve();
  return Promise.all(
    FONTS.map((face) => document.fonts.load(face).catch(() => {}))
  ).then(() => document.fonts.ready);
}

function shouldSkipLogoAnim() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return !window.gsap || !document.getElementById('site-loader-canvas');
}

function revealContent() {
  const root = document.documentElement;
  const loader = document.getElementById('site-loader');

  root.classList.add('is-ready');
  root.classList.remove('is-loading');

  if (loader) loader.classList.add('is-revealing');
}

function finishLoader() {
  const loader = document.getElementById('site-loader');
  if (!loader) return;

  loader.classList.add('is-done');

  const removeLoader = () => {
    loader.remove();
  };

  loader.addEventListener('transitionend', removeLoader, { once: true });
  window.setTimeout(removeLoader, 700);
}

function holdAssembled() {
  return new Promise((resolve) => { window.setTimeout(resolve, HOLD_MS); });
}

async function boot() {
  let revealed = false;

  function revealOnce() {
    if (revealed) return;
    revealed = true;
    revealContent();
  }

  try {
    const fonts = waitForFonts();
    const canvas = document.getElementById('site-loader-canvas');

    if (!shouldSkipLogoAnim()) {
      await runSiteLoaderLogo(canvas, {
        beforeDeconstruct: () => Promise.all([fonts, holdAssembled()]),
        onDeconstructStart: revealOnce,
      });
    } else {
      await fonts;
      revealOnce();
    }
  } catch (err) {
    console.error('Site loader failed:', err);
    revealOnce();
  } finally {
    finishLoader();
  }
}

window.siteReady = boot();

if (document.fonts?.ready) {
  document.fonts.ready.catch(() => {});
}
