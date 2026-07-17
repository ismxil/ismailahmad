/**
 * Font preload helper (optional). Prefer site-loader.js for page boot.
 * Avoid awaiting document.fonts.ready — it can hang when faces 404.
 */
const FONTS = [
  '400 1em "Reckless"',
  '500 1em "Reckless"',
  '400 1em "Suisse Intl"',
  '500 1em "Suisse Intl"',
];
const FONTS_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => { window.setTimeout(resolve, ms); });
}

async function waitForFonts() {
  if (!document.fonts) return;
  const loads = Promise.all(
    FONTS.map((face) => document.fonts.load(face).catch(() => {}))
  );
  await Promise.race([loads, sleep(FONTS_MS)]);
}

window.siteReady = waitForFonts();
