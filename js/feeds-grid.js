/**
 * Feeds infinite layers grid — adapted from Codrops Infinite Layers Grid
 * https://tympanus.net/Tutorials/InfiniteLayersGrid/
 */

import InfiniteGrid from './infinite-grid.js';
import { openFeedModal } from './feed-modal.js';
import { getFeedItems, loadFeedItems } from './feed-items.js';

const VISUAL_SCALE = 4;
const ITEM_GAP = 64;

const BASE_LAYOUT = [
  { x: 71, y: 58, w: 400, h: 270 },
  { x: 211, y: 255, w: 540, h: 360 },
  { x: 631, y: 158, w: 400, h: 270 },
  { x: 1191, y: 245, w: 260, h: 195 },
  { x: 351, y: 687, w: 260, h: 290 },
  { x: 751, y: 824, w: 205, h: 154 },
  { x: 911, y: 540, w: 260, h: 350 },
  { x: 1051, y: 803, w: 400, h: 300 },
  { x: 71, y: 922, w: 350, h: 260 },
];

// Codrops layout bounds (one repeating tile)
const LAYOUT_W = 1522;
const LAYOUT_H = 1238;
const UNIT_W = LAYOUT_W * VISUAL_SCALE + ITEM_GAP * 2;
const UNIT_H = LAYOUT_H * VISUAL_SCALE + ITEM_GAP * 2;

/** One tile of positioned slots — infinite-grid repeats this via repsX/repsY */
function buildTileData() {
  return BASE_LAYOUT.map((base) => ({
    x: base.x * VISUAL_SCALE + ITEM_GAP,
    y: base.y * VISUAL_SCALE + ITEM_GAP,
    w: base.w * VISUAL_SCALE,
    h: base.h * VISUAL_SCALE,
  }));
}

function buildOriginalSize() {
  return {
    w: UNIT_W,
    h: UNIT_H,
  };
}

function buildSources(items) {
  return items.map((item, feedIndex) => ({
    src: item.cover,
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

  const data = buildTileData();
  const originalSize = buildOriginalSize();
  const sources = buildSources(items);

  return new InfiniteGrid({
    el: container,
    sources,
    data,
    originalSize,
    onItemClick: (feedIndex) => openFeedModal(feedIndex),
  });
}

const container = document.getElementById('feeds-grid');
if (container) {
  initFeedsGrid(container);
}
