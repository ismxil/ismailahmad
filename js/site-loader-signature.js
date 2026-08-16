/**
 * Site loader — signature path-trace construct/deconstruct.
 * Draws the mark on, holds, then erases it in the same direction it was drawn.
 */

const DRAW_S = 1.4;
const ERASE_S = 0.65;

export async function runSiteLoaderSignature(svg, { beforeDeconstruct } = {}) {
  const gsap = window.gsap;
  const path = svg?.querySelector('path');
  if (!svg || !path || !gsap) return;

  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

  await new Promise((resolve) => {
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: DRAW_S,
      ease: 'power2.inOut',
      onComplete: resolve,
    });
  });

  await beforeDeconstruct?.();

  await new Promise((resolve) => {
    gsap.to(path, {
      strokeDashoffset: -length,
      duration: ERASE_S,
      ease: 'power2.in',
      onComplete: resolve,
    });
  });
}
