/**
 * Feeds masonry grid — structured columns, no overlap, infinite scroll
 */

import InfiniteGrid from './infinite-grid.js';
import { openFeedModal } from './feed-modal.js';
import { getFeedItems, loadFeedItems, resolveFeedCover } from './feed-items.js';

const GAP = 64;
const CAPTION_SPACE = 80;

function buildSources(items) {
  return items.map((item, feedIndex) => ({
    src: resolveFeedCover(item, feedIndex),
    feedIndex,
    caption: [
      item.client,
      item.category,
      item.years,
    ].join('<br>'),
  }));
}

export async function initFeedsGrid(container) {
  if (!container) return null;

  await loadFeedItems();
  const items = getFeedItems();
  if (!items.length) return null;

  return new InfiniteGrid({
    el: container,
    sources: buildSources(items),
    gap: GAP,
    captionSpace: CAPTION_SPACE,
    onItemClick: (feedIndex) => openFeedModal(feedIndex),
  });
}

const container = document.getElementById('feeds-grid');
if (container) {
  const ready = window.siteReady ?? Promise.resolve();
  const withTimeout = Promise.race([
    ready,
    new Promise((resolve) => { window.setTimeout(resolve, 4000); }),
  ]);
  withTimeout.then(() => initFeedsGrid(container));
}
