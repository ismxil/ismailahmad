/**
 * Feeds page bootstrap — grid, modal, logos. Safe to re-run after SPA navigation.
 */

import { initBrandLogo3D } from './logo-3d.js';
import { initAllHeaderFluids } from './header-fluid.js';

let initPromise = null;
let feedsGridApi = null;
let feedModalApi = null;
let feedItemsApi = null;

async function loadFeedsModules() {
  if (!feedsGridApi || !feedModalApi || !feedItemsApi) {
    [feedsGridApi, feedModalApi, feedItemsApi] = await Promise.all([
      import('./feeds-grid.js'),
      import('./feed-modal.js'),
      import('./feed-items.js'),
    ]);
  }
  return { feedsGridApi, feedModalApi, feedItemsApi };
}

export async function initFeedsPage() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await (window.siteReady ?? Promise.resolve());

    const { feedsGridApi: grid, feedModalApi: modal, feedItemsApi: items } = await loadFeedsModules();

    await modal.initFeedModal();
    await items.loadFeedItems(true);
    await grid.initFeedsGrid(document.getElementById('feeds-grid'));

    try {
      const headerLogo = document.getElementById('feeds-header-logo-c');
      if (headerLogo) initBrandLogo3D(headerLogo);
      initAllHeaderFluids();
    } catch (err) {
      console.warn('[feeds-page] optional chrome init failed', err);
    }
  })().catch((err) => {
    initPromise = null;
    console.error('[feeds-page] init failed', err);
    throw err;
  });

  return initPromise;
}

export function teardownFeedsPage() {
  initPromise = null;
  feedsGridApi = null;
  feedModalApi = null;
  feedItemsApi = null;
  if (typeof window.teardownFeedsGrid === 'function') window.teardownFeedsGrid();
  if (typeof window.teardownFeedModal === 'function') window.teardownFeedModal();
}

window.teardownFeedsPage = teardownFeedsPage;

if (document.getElementById('feeds-grid')) {
  initFeedsPage();
}
