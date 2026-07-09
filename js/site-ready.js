/**
 * Index homepage — font preload only. Welcome overlay handles the intro.
 */
const FONTS = [
  '400 1em "Reckless"',
  '500 1em "Reckless"',
  '400 1em "Suisse Intl"',
  '500 1em "Suisse Intl"',
];

async function waitForFonts() {
  if (!document.fonts) return;
  await Promise.all(
    FONTS.map((face) => document.fonts.load(face).catch(() => {}))
  );
  await document.fonts.ready;
}

window.siteReady = waitForFonts();
