/**
 * Feeds infinite layers grid — adapted from Codrops Infinite Layers Grid
 * https://tympanus.net/Tutorials/InfiniteLayersGrid/
 */

import InfiniteGrid from './infinite-grid.js';
import { openFeedModal } from './feed-modal.js';
import { getFeedItems, loadFeedItems } from './feed-items.js';

const VISUAL_SCALE = 4;
const ITEM_GAP = 64;
// Render tiles larger than the Codrops default (smaller originalSize → bigger on screen)
const SIZE_BOOST = 1.55;

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

// One repeating tile unit — used for screen scaling (matches Codrops tutorial)
const UNIT_W = 1522 * VISUAL_SCALE + ITEM_GAP * 2;
const UNIT_H = 1238 * VISUAL_SCALE + ITEM_GAP * 2;
const TILES_PER_ROW = 3;

function buildLayout(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    const base = BASE_LAYOUT[i % BASE_LAYOUT.length];
    const block = Math.floor(i / BASE_LAYOUT.length);
    const blockCol = block % TILES_PER_ROW;
    const blockRow = Math.floor(block / TILES_PER_ROW);
    data.push({
      x: base.x * VISUAL_SCALE + ITEM_GAP + blockCol * UNIT_W,
      y: base.y * VISUAL_SCALE + ITEM_GAP + blockRow * UNIT_H,
      w: base.w * VISUAL_SCALE,
      h: base.h * VISUAL_SCALE,
    });
  }

  return {
    data,
    // One repeating unit for scaling — not the full multi-block canvas (which shrinks tiles)
    originalSize: {
      w: UNIT_W / SIZE_BOOST,
      h: UNIT_H / SIZE_BOOST,
    },
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

  const { data, originalSize } = buildLayout(items.length);
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
