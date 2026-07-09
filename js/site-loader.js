/**
 * Site loader — fonts + logo construct/deconstruct before first paint.
 * Feed grid intro (infinite-grid.js) is unchanged — it runs after this resolves.
 */
import { runSiteLoaderLogo } from './site-loader-logo.js';

const MIN_MS = 320;
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

function minDelay() {
  return new Promise((resolve) => { window.setTimeout(resolve, MIN_MS); });
}

function shouldSkipLogoAnim() {
  const welcome = document.getElementById('welcome');
  if (welcome && !sessionStorage.getItem('pv')) return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return !window.gsap || !document.getElementById('site-loader-canvas');
}

function revealContent() {
  const root = document.documentElement;
  root.classList.add('is-ready');
  root.classList.remove('is-loading');
}

function finishLoader() {
  const loader = document.getElementById('site-loader');
  if (!loader) return;

  loader.classList.add('is-done');
  loader.addEventListener('transitionend', () => {
    loader.remove();
  }, { once: true });
}

async function boot() {
  const fonts = waitForFonts();
  const canvas = document.getElementById('site-loader-canvas');

  if (!shouldSkipLogoAnim()) {
    const logoDone = runSiteLoaderLogo(canvas, {
      onDeconstructStart: revealContent,
    });
    await Promise.all([fonts, logoDone]);
  } else {
    await Promise.all([fonts, minDelay()]);
    revealContent();
  }

  finishLoader();
}

window.siteReady = boot();

if (document.fonts?.ready) {
  document.fonts.ready.catch(() => {});
}
