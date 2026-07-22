import { loadFeedItems, getFeedItem, getFeedItemById, resolveFeedCover } from './feed-items.js';

let backdrop;
let modal;
let simpleEl;
let caseEl;
let caseBlocksEl;
let iconEl;
let logoEl;
let titleEl;
let metaEl;
let taglineEl;
let problemBodyEl;
let ctaEl;
let ctaLabelEl;
let heroImg;
let captionEl;
let closeBtn;
let caseIconEl;
let caseLogoEl;
let caseTitleEl;
let caseMetaEl;
let caseTaglineEl;
let isOpen = false;
let bound = false;
let cardClicksBound = false;
let onBackdropClick;
let onKeydown;
let onCardClick;
let onCaseClick;

function cacheElements() {
  backdrop = document.getElementById('feed-modal-backdrop');
  modal = document.getElementById('feed-modal');
  simpleEl = document.getElementById('feed-modal-simple');
  caseEl = document.getElementById('feed-modal-case');
  caseBlocksEl = document.getElementById('feed-modal-case-blocks');
  iconEl = document.getElementById('feed-modal-icon');
  logoEl = document.getElementById('feed-modal-logo');
  titleEl = document.getElementById('feed-modal-title');
  metaEl = document.getElementById('feed-modal-meta');
  taglineEl = document.getElementById('feed-modal-tagline');
  problemBodyEl = document.getElementById('feed-modal-problem-body');
  ctaEl = document.getElementById('feed-modal-cta');
  ctaLabelEl = document.getElementById('feed-modal-cta-label');
  heroImg = document.getElementById('feed-modal-hero-img');
  captionEl = document.getElementById('feed-modal-caption');
  closeBtn = document.getElementById('feed-modal-close');
  caseIconEl = document.getElementById('feed-modal-case-icon');
  caseLogoEl = document.getElementById('feed-modal-case-logo');
  caseTitleEl = document.getElementById('feed-modal-case-title');
  caseMetaEl = document.getElementById('feed-modal-case-meta');
  caseTaglineEl = document.getElementById('feed-modal-case-tagline');
}

function renderMarkdown(markdown) {
  if (!markdown) return '';
  if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
    return marked.parse(markdown);
  }
  return markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function openTalkCta(e) {
  e.preventDefault();
  closeFeedModal();
  if (typeof window.openContactPanel === 'function') {
    window.openContactPanel();
  }
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value || '';
}

function setHidden(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
}

function syncOpenState() {
  const liveBackdrop = document.getElementById('feed-modal-backdrop');
  if (!liveBackdrop || !liveBackdrop.isConnected) {
    isOpen = false;
    backdrop = liveBackdrop;
    return;
  }
  backdrop = liveBackdrop;
  if (isOpen && !liveBackdrop.classList.contains('is-open')) {
    isOpen = false;
    document.body.classList.remove('feed-modal-open');
    if (window.__feedsGrid) window.__feedsGrid.isDisabled = false;
  }
}

function bindFeedCardClicks() {
  if (cardClicksBound) return;

  onCardClick = (e) => {
    const card = e.target.closest('#feeds-grid .feed-grid__item');
    if (!card) return;

    const idx = Number(card.dataset.feedIndex);
    if (Number.isNaN(idx)) return;

    e.preventDefault();
    e.stopPropagation();
    openFeedModal(idx);
  };

  document.addEventListener('click', onCardClick, true);
  cardClicksBound = true;
}

function unbindFeedCardClicks() {
  if (!cardClicksBound || !onCardClick) return;
  document.removeEventListener('click', onCardClick, true);
  onCardClick = null;
  cardClicksBound = false;
}

function setLogo(icon, logo, data, title) {
  if (!icon) return;
  if (data.logo && logo) {
    logo.src = data.logo;
    logo.alt = title;
    logo.hidden = false;
    icon.style.backgroundColor = 'transparent';
    icon.classList.add('has-logo');
  } else {
    if (logo) {
      logo.removeAttribute('src');
      logo.hidden = true;
    }
    icon.style.backgroundColor = data.accent || '#393bfe';
    icon.classList.remove('has-logo');
  }
}

function renderMeta(el, data) {
  if (!el) return;
  el.innerHTML = '';
  const parts =
    Array.isArray(data.tags) && data.tags.length
      ? data.tags
      : [data.projectType || data.category, data.years].filter(Boolean);

  parts.forEach((part) => {
    const span = document.createElement('span');
    span.textContent = part;
    el.appendChild(span);
  });
  el.hidden = !el.children.length;
}

function createCaseImage(src, alt) {
  const wrap = document.createElement('figure');
  wrap.className = 'feed-modal__case-image';
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  // Eager: lazy-load inside the modal scrollport collapses unloaded images to 0
  // height, so only the first few appear and later frames never reserve space.
  img.loading = 'eager';
  img.decoding = 'async';
  wrap.appendChild(img);
  return wrap;
}

function createCaseSection(block) {
  const section = document.createElement('section');
  section.className = 'feed-modal__case-section';

  const label = document.createElement('h3');
  label.className = 'feed-modal__case-label';
  label.textContent = block.label || '';
  section.appendChild(label);

  const content = document.createElement('div');
  content.className = 'feed-modal__case-copy';
  const html = renderMarkdown(block.body || '');
  content.innerHTML = html.startsWith('<') ? html : `<p>${html}</p>`;
  section.appendChild(content);

  if (Array.isArray(block.actions) && block.actions.length) {
    const row = document.createElement('div');
    row.className = 'feed-modal__case-actions';
    block.actions.forEach((action) => {
      if (!action) return;
      let el;
      if (action.action === 'talk') {
        el = document.createElement('button');
        el.type = 'button';
        el.dataset.caseAction = 'talk';
      } else {
        el = document.createElement('a');
        el.href = action.href || '#';
        el.target = '_blank';
        el.rel = 'noopener';
      }
      el.className =
        'feed-modal__case-btn' + (action.primary ? ' feed-modal__case-btn--primary' : '');
      el.textContent = action.label || '';
      row.appendChild(el);
    });
    content.appendChild(row);
  }

  return section;
}

function createCasePair(block) {
  const wrap = document.createElement('div');
  wrap.className = 'feed-modal__case-pair';
  (block.images || []).forEach((image) => {
    if (!image?.src) return;
    wrap.appendChild(createCaseImage(image.src, image.alt));
  });
  return wrap;
}

function createCaseResults(block, data) {
  const wrap = document.createElement('section');
  wrap.className = 'feed-modal__case-results';

  const section = createCaseSection({
    label: 'Results',
    body: block.summary || '',
  });
  wrap.appendChild(section);

  const grid = document.createElement('div');
  grid.className = 'feed-modal__case-metrics';
  const metrics = block.metrics || data.metrics || [];
  metrics.forEach((metric) => {
    const card = document.createElement('article');
    card.className = 'feed-modal__case-metric';
    const value = document.createElement('p');
    value.className = 'feed-modal__case-metric-value';
    value.textContent = metric.value || '';
    const text = document.createElement('p');
    text.className = 'feed-modal__case-metric-text';
    text.textContent = metric.text || '';
    card.appendChild(value);
    card.appendChild(text);
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}

function createCaseNext(block) {
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className = 'feed-modal__case-next';
  wrap.dataset.caseAction = 'next';
  wrap.dataset.nextId = block.id || '';

  const label = document.createElement('span');
  label.className = 'feed-modal__case-next-label';
  label.textContent = 'Next';

  const titleWrap = document.createElement('span');
  titleWrap.className = 'feed-modal__case-next-title-wrap';
  const title = document.createElement('span');
  title.className = 'feed-modal__case-next-title';
  title.textContent = block.name || 'Next project';
  const subtitle = document.createElement('span');
  subtitle.className = 'feed-modal__case-next-subtitle';
  subtitle.textContent = block.subtitle || '';
  titleWrap.appendChild(title);
  if (block.subtitle) titleWrap.appendChild(subtitle);

  wrap.appendChild(label);
  wrap.appendChild(titleWrap);
  return wrap;
}

function resolveCaseBlocks(data) {
  if (Array.isArray(data.caseBlocks) && data.caseBlocks.length) return data.caseBlocks;
  // Fallback: full preview gallery as a vertical image stack (never truncate).
  const media = Array.isArray(data.previewMedia) ? data.previewMedia.filter(Boolean) : [];
  return media.map((src, i) => ({
    type: 'image',
    src,
    alt: `${data.name || data.client || 'Project'} image ${i + 1}`,
  }));
}

function renderCaseBlocks(data) {
  if (!caseBlocksEl) return;
  caseBlocksEl.innerHTML = '';
  resolveCaseBlocks(data).forEach((block) => {
    if (!block?.type) return;
    if (block.type === 'image' && block.src) {
      caseBlocksEl.appendChild(createCaseImage(block.src, block.alt));
      return;
    }
    if (block.type === 'pair') {
      caseBlocksEl.appendChild(createCasePair(block));
      return;
    }
    if (block.type === 'section') {
      caseBlocksEl.appendChild(createCaseSection(block));
      return;
    }
    if (block.type === 'results') {
      caseBlocksEl.appendChild(createCaseResults(block, data));
      return;
    }
    if (block.type === 'next') {
      caseBlocksEl.appendChild(createCaseNext(block));
    }
  });
}

function resolveSimpleCaption(data, index) {
  if (data.caption) return data.caption;
  if (data.modalTitle) return data.modalTitle;
  // Prefer explicit image-number titles once provided via feed data.
  if (data.imageTitle) return data.imageTitle;
  const cover = data.cover || data.heroImage || '';
  const match = String(cover).match(/image_(\d+)/i);
  if (match && data.imageTitles && data.imageTitles[match[1]]) {
    return data.imageTitles[match[1]];
  }
  return data.name || data.client || data.title || (Number.isFinite(index) ? `Image ${index}` : '');
}

function fitSimpleModalToImage() {
  if (!modal || !heroImg) return;
  const nw = heroImg.naturalWidth;
  const nh = heroImg.naturalHeight;
  if (!nw || !nh) return;

  const maxW = Math.min(1120, window.innerWidth - 48);
  const maxH = Math.min(window.innerHeight - 48, window.innerHeight * 0.92);
  const ratio = nw / nh;

  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }

  modal.classList.add('is-image-fit');
  modal.style.setProperty('--feed-modal-w', Math.round(width) + 'px');
  modal.style.setProperty('--feed-modal-h', Math.round(height) + 'px');
}

function clearSimpleModalFit() {
  if (!modal) return;
  modal.classList.remove('is-image-fit');
  modal.style.removeProperty('--feed-modal-w');
  modal.style.removeProperty('--feed-modal-h');
}

function populateSimple(data, index) {
  const accent = data.accent || '#393bfe';
  const cover = data.heroImage || resolveFeedCover(data, index);
  const title = data.name || data.title || data.client || 'Project';
  const caption = resolveSimpleCaption(data, index);

  modal.style.setProperty('--feed-modal-accent', accent);

  if (heroImg) {
    const applyFit = () => fitSimpleModalToImage();
    heroImg.onload = applyFit;
    heroImg.src = cover;
    heroImg.alt = title + ' preview';
    if (heroImg.complete && heroImg.naturalWidth) applyFit();
  }
  setText(captionEl, caption);
}

function populateCase(data) {
  const accent = data.accent || '#059669';
  const title = data.name || data.title || data.client || 'Project';
  const tagline = data.tagline || data.headline || '';

  modal.style.setProperty('--feed-modal-accent', accent);
  setLogo(caseIconEl, caseLogoEl, data, title);
  setText(caseTitleEl, title);
  setText(caseTaglineEl, tagline);
  setHidden(caseTaglineEl, !tagline);
  renderMeta(caseMetaEl, data);
  renderCaseBlocks(data);

  if (caseEl) caseEl.scrollTop = 0;
}

function populate(data, index) {
  if (!data || !modal) return false;

  const caseBlocks = resolveCaseBlocks(data);
  const isCase = data.layout === 'case' && caseBlocks.length > 0;
  // Ensure populateCase always receives the full resolved block list.
  if (isCase) {
    data = { ...data, caseBlocks };
  }
  modal.classList.toggle('is-case', isCase);
  setHidden(simpleEl, isCase);
  setHidden(caseEl, !isCase);

  if (isCase) {
    clearSimpleModalFit();
    populateCase(data);
  } else {
    populateSimple(data, index);
  }

  modal.setAttribute('aria-label', (data.name || data.client || 'Project') + ' project details');
  return true;
}

async function openNextProject(nextId) {
  if (!nextId) return;
  await loadFeedItems();
  const found = getFeedItemById(nextId);
  if (!found) return;
  closeFeedModal();
  requestAnimationFrame(() => openFeedModal(found.index));
}

export async function openFeedModal(itemIndex) {
  try {
    cacheElements();
    syncOpenState();
    if (!backdrop || !modal) {
      console.warn('[feed-modal] modal elements missing — hard refresh feeds.html');
      return;
    }
    if (isOpen) return;

    await loadFeedItems();
    const item = getFeedItem(itemIndex);
    if (!item) {
      console.warn('[feed-modal] no item for index', itemIndex);
      return;
    }

    if (!populate(item, itemIndex)) return;

    isOpen = true;
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('feed-modal-open');
    window.dispatchEvent(new CustomEvent('feed-modal-open'));
    closeBtn?.focus({ preventScroll: true });
  } catch (err) {
    isOpen = false;
    cacheElements();
    backdrop?.classList.remove('is-open');
    backdrop?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('feed-modal-open');
    if (window.__feedsGrid) window.__feedsGrid.isDisabled = false;
    console.error('[feed-modal] open failed', err);
  }
}

export function closeFeedModal() {
  if (!isOpen) {
    syncOpenState();
    return;
  }
  isOpen = false;
  cacheElements();
  if (backdrop) {
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('feed-modal-open');
  if (window.__feedsGrid) window.__feedsGrid.isDisabled = false;
  window.dispatchEvent(new CustomEvent('feed-modal-close'));
}

export async function initFeedModal() {
  cacheElements();
  if (!backdrop) return;

  await loadFeedItems();

  if (bound) {
    closeBtn?.removeEventListener('click', closeFeedModal);
    ctaEl?.removeEventListener('click', openTalkCta);
    if (backdrop && onBackdropClick) backdrop.removeEventListener('click', onBackdropClick);
    if (onKeydown) document.removeEventListener('keydown', onKeydown);
    if (caseEl && onCaseClick) caseEl.removeEventListener('click', onCaseClick);
    bound = false;
  }

  onBackdropClick = (e) => {
    if (e.target === backdrop) closeFeedModal();
  };
  onKeydown = (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closeFeedModal();
    }
  };
  onCaseClick = (e) => {
    const actionEl = e.target.closest('[data-case-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.caseAction;
    if (action === 'talk') {
      openTalkCta(e);
      return;
    }
    if (action === 'next') {
      e.preventDefault();
      openNextProject(actionEl.dataset.nextId);
    }
  };

  closeBtn?.addEventListener('click', closeFeedModal);
  ctaEl?.addEventListener('click', openTalkCta);
  caseEl?.addEventListener('click', onCaseClick);
  backdrop.addEventListener('click', onBackdropClick);
  document.addEventListener('keydown', onKeydown);
  bound = true;

  unbindFeedCardClicks();
  bindFeedCardClicks();
  window.openFeedModal = openFeedModal;
  window.closeFeedModal = closeFeedModal;
}

export function teardownFeedModal() {
  closeFeedModal();

  if (bound) {
    closeBtn?.removeEventListener('click', closeFeedModal);
    ctaEl?.removeEventListener('click', openTalkCta);
    if (backdrop && onBackdropClick) backdrop.removeEventListener('click', onBackdropClick);
    if (onKeydown) document.removeEventListener('keydown', onKeydown);
    if (caseEl && onCaseClick) caseEl.removeEventListener('click', onCaseClick);
    bound = false;
  }

  unbindFeedCardClicks();
  isOpen = false;
  delete window.openFeedModal;
  delete window.closeFeedModal;
  backdrop = null;
  modal = null;
}

window.teardownFeedModal = teardownFeedModal;
