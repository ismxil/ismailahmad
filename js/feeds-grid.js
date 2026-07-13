/**
 * Feeds masonry grid — structured columns, no overlap, infinite scroll
 */

import InfiniteGrid from './infinite-grid.js';
import { openFeedModal } from './feed-modal.js';
import { getFeedItems, loadFeedItems, resolveFeedCover } from './feed-items.js';

const GAP = 64;
const CAPTION_SPACE = 80;
const FALLBACK_ASPECTS = [1.2, 0.82, 1.05, 0.72, 1.28, 0.9, 1.15, 0.78, 1.35, 0.88];

let activeGrid = null;

function buildSources(items) {
  return items.map((item, feedIndex) => ({
    src: resolveFeedCover(item, feedIndex),
    feedIndex,
    caption: [
      item.name || item.client || item.title,
      item.projectType || item.category,
      item.years,
    ].join('<br>'),
  }));
}

function loadSourceAspects(sources) {
  return Promise.all(sources.map((source, index) => new Promise((resolve) => {
    const img = new Image();
    const fallback = FALLBACK_ASPECTS[index % FALLBACK_ASPECTS.length];
    const finish = (aspect) => resolve(aspect > 0 ? aspect : fallback);

    img.onload = () => finish(img.naturalWidth / img.naturalHeight);
    img.onerror = () => finish(fallback);
    img.src = source.src;
  })));
}

export async function initFeedsGrid(container) {
  if (!container) return null;

  teardownFeedsGrid();

  await loadFeedItems();
  const items = getFeedItems();
  if (!items.length) return null;

  const sources = buildSources(items);
  const aspects = await loadSourceAspects(sources);

  activeGrid = new InfiniteGrid({
    el: container,
    sources,
    aspects,
    gap: GAP,
    captionSpace: CAPTION_SPACE,
    onItemClick: (feedIndex) => {
      const open = window.openFeedModal;
      if (typeof open === 'function') open(feedIndex);
      else openFeedModal(feedIndex);
    },
  });

  window.__feedsGrid = activeGrid;
  return activeGrid;
}

export function teardownFeedsGrid() {
  if (activeGrid) {
    activeGrid.destroy();
    activeGrid = null;
  }
  if (window.__feedsGrid) window.__feedsGrid = null;
}

window.teardownFeedsGrid = teardownFeedsGrid;
