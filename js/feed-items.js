/**
 * Feed CMS loader — reads copy and image paths from data/feed-items.json
 */

const FEED_DATA_URL = 'data/feed-items.json';

let feedItems = [];
let loadPromise = null;

export function getFeedItems() {
  return feedItems;
}

export function getFeedItem(index) {
  if (!feedItems.length) return null;
  const i = ((index % feedItems.length) + feedItems.length) % feedItems.length;
  return feedItems[i];
}

export function getFeedItemCount() {
  return feedItems.length;
}

/** Resolve cover URL — prefers item.cover, falls back to index in assets/feeds/ */
export function resolveFeedCover(item, index) {
  if (item?.cover) {
    return item.cover.replace('assets/feeds/covers/', 'assets/feeds/');
  }
  return `assets/feeds/image_${index}.jpg`;
}

export async function loadFeedItems() {
  if (loadPromise) return loadPromise;

  loadPromise = fetch(FEED_DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error('Feed data not found');
      return res.json();
    })
    .then((data) => {
      feedItems = Array.isArray(data.items) ? data.items : [];
      if (!feedItems.length) throw new Error('Feed data is empty');
      return feedItems;
    })
    .catch((err) => {
      console.error('[feed-items]', err);
      feedItems = [];
      return feedItems;
    });

  return loadPromise;
}
