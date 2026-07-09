/**
 * Site loader — inner pages only. Index uses welcome + site-ready.js.
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

function clearLoadingState() {
  document.documentElement.classList.remove('is-loading');
}

function removeLoader() {
  const loader = document.getElementById('site-loader');
  if (loader) loader.remove();
}

function finishLoader() {
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
  return new Promise((resolve) => { window.setTimeout(resolve, HOLD_MS); });
}

async function boot() {
  const fonts = waitForFonts();
  const canvas = document.getElementById('site-loader-canvas');

  try {
    if (!shouldSkipLogoAnim()) {
      await runSiteLoaderLogo(canvas, {
        beforeDeconstruct: () => Promise.all([fonts, holdAssembled()]),
      });
    } else {
      await fonts;
    }
  } catch (err) {
    console.error('Site loader failed:', err);
    await fonts.catch(() => {});
  } finally {
    finishLoader();
  }
}

window.siteReady = boot();

if (document.fonts?.ready) {
  document.fonts.ready.catch(() => {});
}
