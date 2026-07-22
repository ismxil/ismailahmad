/**
 * Feed CMS loader — Sanity first, local JSON fallback.
 */

import { sanityConfig, isSanityConfigured } from './sanity-config.js';

const FEED_DATA_URL = 'data/feed-items.json';

const DEFAULT_CTA_LABEL = "Let's talk";

let feedItems = [];
let loadPromise = null;

function formatYears(year, yearEnd, legacyYears) {
  if (legacyYears) {
    return String(legacyYears).replace(/^\(+|\)+$/g, '').trim();
  }
  if (!year) return '';
  if (yearEnd && yearEnd !== year) return `${year} - ${yearEnd}`;
  return String(year);
}

function normalizePreviewMedia(media) {
  if (!Array.isArray(media)) return [];
  return media
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      const src = item.url || item.src || item.asset || '';
      if (!src) return null;
      return typeof src === 'string' ? src : src.url || '';
    })
    .filter(Boolean);
}

function normalizeItem(item) {
  if (!item) return null;

  const name = item.name || item.title || item.client || '';
  const year = item.year ?? null;
  const yearEnd = item.yearEnd ?? null;
  const projectType = item.projectType || item.category || item.type || '';
  const liveUrl = item.liveUrl || item.link || item.url || '';
  const tagline = item.tagline || item.headline || '';
  const previewMedia = normalizePreviewMedia(item.previewMedia);
  const cover = item.cover || previewMedia[0] || item.heroImage || '';
  const heroImage = item.heroImage || previewMedia[0] || cover || '';
  const logo = item.logo || '';
  const problemBody = item.problemBody || item.content || item.description || '';
  const ctaUrl = item.ctaUrl || liveUrl || '';
  const ctaLabel = item.ctaLabel || DEFAULT_CTA_LABEL;
  const layout = item.layout || (Array.isArray(item.caseBlocks) && item.caseBlocks.length ? 'case' : 'simple');
  const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
  const caseBlocks = Array.isArray(item.caseBlocks) ? item.caseBlocks : [];
  const metrics = Array.isArray(item.metrics) ? item.metrics : [];

  return {
    id: item.id || item.slug || '',
    name,
    title: name,
    client: name,
    slug: item.slug || item.id || '',
    logo,
    year,
    yearEnd,
    projectType,
    category: projectType,
    type: projectType,
    tags,
    liveUrl,
    link: liveUrl,
    url: liveUrl,
    tagline,
    headline: tagline,
    years: formatYears(year, yearEnd, item.years),
    accent: item.accent || '#393bfe',
    cover,
    heroImage,
    previewMedia,
    problemBody,
    content: problemBody,
    description: item.description || problemBody,
    caption: item.caption || item.modalTitle || item.imageTitle || '',
    modalTitle: item.modalTitle || item.caption || '',
    imageTitle: item.imageTitle || '',
    ctaLabel,
    ctaUrl,
    layout,
    caseBlocks,
    metrics,
    nextProject: item.nextProject || null,
  };
}

function normalizeItems(items) {
  return (items || []).map(normalizeItem).filter(Boolean);
}

async function fetchFromSanity() {
  const { projectId, dataset, apiVersion } = sanityConfig;
  const query = encodeURIComponent(`*[_type == "feedItem"] | order(order asc, _createdAt desc) {
    "id": slug.current,
    "slug": slug.current,
    name,
    year,
    yearEnd,
    projectType,
    liveUrl,
    tagline,
    accent,
    ctaLabel,
    ctaUrl,
    problemBody,
    layout,
    tags,
    metrics,
    nextProject,
    caseBlocks,
    "logo": logo.asset->url,
    "cover": coalesce(cover.asset->url, previewMedia[0].asset->url),
    "previewMedia": previewMedia[].asset->url,
    "heroImage": coalesce(previewMedia[0].asset->url, cover.asset->url)
  }`);

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Sanity query failed');
  const data = await res.json();
  const items = normalizeItems(data.result);
  if (!items.length) throw new Error('Sanity returned no feed items');
  return items;
}

/** Merge local JSON (canonical list) with Sanity enrichment for matching ids. */
function mergeWithLocalCaseData(sanityItems, localItems) {
  if (!localItems?.length) return sanityItems || [];
  if (!sanityItems?.length) return localItems;

  const remoteById = new Map();
  sanityItems.forEach((item) => {
    const id = item.id || item.slug;
    if (id) remoteById.set(id, item);
  });

  // Local JSON is the allowlist — removals there stay removed even if Sanity still has them.
  return localItems.map((local) => {
    const remote = remoteById.get(local.id) || remoteById.get(local.slug);
    if (!remote) return local;
    const caseBlocks =
      Array.isArray(remote.caseBlocks) && remote.caseBlocks.length
        ? remote.caseBlocks
        : local.caseBlocks;
    const previewMedia =
      Array.isArray(remote.previewMedia) && remote.previewMedia.length
        ? remote.previewMedia
        : local.previewMedia;
    return {
      ...local,
      ...remote,
      // Prefer local cover/paths so broken Sanity assets don't win.
      cover: local.cover || remote.cover,
      heroImage: local.heroImage || remote.heroImage,
      layout: local.layout || remote.layout,
      caseBlocks: caseBlocks || [],
      previewMedia: previewMedia || [],
      metrics: remote.metrics?.length ? remote.metrics : local.metrics,
      tags: remote.tags?.length ? remote.tags : local.tags,
      nextProject: remote.nextProject || local.nextProject,
      logo: remote.logo || local.logo,
    };
  });
}

async function fetchFromJson() {
  const res = await fetch(FEED_DATA_URL);
  if (!res.ok) throw new Error('Feed data not found');
  const data = await res.json();
  const items = normalizeItems(data.items);
  if (!items.length) throw new Error('Feed data is empty');
  return items;
}

export function getFeedItems() {
  return feedItems;
}

export function getFeedItem(index) {
  if (!feedItems.length) return null;
  const i = ((index % feedItems.length) + feedItems.length) % feedItems.length;
  return feedItems[i];
}

export function getFeedItemById(id) {
  if (!id) return null;
  const index = feedItems.findIndex((item) => item.id === id || item.slug === id);
  if (index < 0) return null;
  return { item: feedItems[index], index };
}

export function getFeedItemCount() {
  return feedItems.length;
}

/** Resolve cover URL — prefers item.cover, falls back to index in assets/feeds/ */
export function resolveFeedCover(item, index) {
  if (item?.cover) {
    if (item.cover.startsWith('http')) return item.cover;
    return item.cover.replace('assets/feeds/covers/', 'assets/feeds/');
  }
  return `assets/feeds/image_${index}.jpg`;
}

export async function loadFeedItems(force = false) {
  if (force) {
    loadPromise = null;
    feedItems = [];
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    let localItems = [];
    try {
      localItems = await fetchFromJson();
    } catch (jsonErr) {
      console.warn('[feed-items] local JSON unavailable', jsonErr);
    }

    try {
      if (isSanityConfigured()) {
        const sanityItems = await fetchFromSanity();
        feedItems = mergeWithLocalCaseData(sanityItems, localItems);
        return feedItems;
      }
      feedItems = localItems;
      if (!feedItems.length) throw new Error('Feed data is empty');
      return feedItems;
    } catch (sanityOrJsonErr) {
      console.warn('[feed-items] primary source failed, trying fallback JSON', sanityOrJsonErr);
      try {
        feedItems = localItems.length ? localItems : await fetchFromJson();
        return feedItems;
      } catch (jsonErr) {
        console.error('[feed-items]', jsonErr);
        feedItems = [];
        return feedItems;
      }
    }
  })();

  return loadPromise;
}
