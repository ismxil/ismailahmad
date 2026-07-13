import { loadFeedItems, getFeedItem, resolveFeedCover } from './feed-items.js';

let backdrop;
let modal;
let iconEl;
let logoEl;
let titleEl;
let metaEl;
let taglineEl;
let statsEl;
let problemSection;
let problemBodyEl;
let marketSection;
let marketStatEl;
let marketDescEl;
let marketSourceEl;
let ctaEl;
let ctaLabelEl;
let linkEl;
let linkLabelEl;
let heroImg;
let closeBtn;
let isOpen = false;
let bound = false;
let cardClicksBound = false;
let onBackdropClick;
let onKeydown;
let onCardClick;

function cacheElements() {
  backdrop = document.getElementById('feed-modal-backdrop');
  modal = document.getElementById('feed-modal');
  iconEl = document.getElementById('feed-modal-icon');
  logoEl = document.getElementById('feed-modal-logo');
  titleEl = document.getElementById('feed-modal-title');
  metaEl = document.getElementById('feed-modal-meta');
  taglineEl = document.getElementById('feed-modal-tagline');
  statsEl = document.getElementById('feed-modal-stats');
  problemSection = document.getElementById('feed-modal-problem');
  problemBodyEl = document.getElementById('feed-modal-problem-body');
  marketSection = document.getElementById('feed-modal-market');
  marketStatEl = document.getElementById('feed-modal-market-stat');
  marketDescEl = document.getElementById('feed-modal-market-desc');
  marketSourceEl = document.getElementById('feed-modal-market-source');
  ctaEl = document.getElementById('feed-modal-cta');
  ctaLabelEl = document.getElementById('feed-modal-cta-label');
  linkEl = document.getElementById('feed-modal-link');
  linkLabelEl = document.getElementById('feed-modal-link-label');
  heroImg = document.getElementById('feed-modal-hero-img');
  closeBtn = document.getElementById('feed-modal-close');
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
    .replace(/\n/g, '<br>');
}

function linkLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'View project';
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

function populate(data, index) {
  if (!data || !modal) return false;

  const accent = data.accent || '#393bfe';
  const cover = data.heroImage || resolveFeedCover(data, index);
  const title = data.name || data.title || data.client || 'Project';
  const tagline = data.tagline || data.headline || '';
  const stats = Array.isArray(data.stats) ? data.stats.filter(Boolean) : [];
  const liveUrl = data.liveUrl || data.link || data.url || '';
  const ctaUrl = data.ctaUrl || liveUrl;
  const market = data.market || {};

  modal.style.setProperty('--feed-modal-accent', accent);

  if (iconEl) {
    if (data.logo && logoEl) {
      logoEl.src = data.logo;
      logoEl.alt = title;
      logoEl.hidden = false;
      iconEl.style.backgroundColor = 'transparent';
      iconEl.classList.add('has-logo');
    } else {
      if (logoEl) {
        logoEl.removeAttribute('src');
        logoEl.hidden = true;
      }
      iconEl.style.backgroundColor = accent;
      iconEl.classList.remove('has-logo');
    }
  }

  setText(titleEl, title);
  setText(taglineEl, tagline);
  setHidden(taglineEl, !tagline);

  if (metaEl) {
    metaEl.innerHTML = '';
    [data.projectType || data.category, data.years].filter(Boolean).forEach((part) => {
      const span = document.createElement('span');
      span.textContent = part;
      metaEl.appendChild(span);
    });
    metaEl.hidden = !metaEl.children.length;
  }

  if (statsEl) {
    statsEl.innerHTML = '';
    stats.forEach((stat) => {
      const pill = document.createElement('span');
      pill.className = 'feed-modal__stat';
      if (typeof stat === 'object' && stat.value) {
        const value = document.createElement('strong');
        value.className = 'feed-modal__stat-value';
        value.textContent = stat.value;
        pill.appendChild(value);
        if (stat.label) {
          pill.appendChild(document.createTextNode(' '));
          const label = document.createElement('span');
          label.className = 'feed-modal__stat-label';
          label.textContent = stat.label;
          pill.appendChild(label);
        }
      } else if (typeof stat === 'string') {
        pill.textContent = stat;
      }
      statsEl.appendChild(pill);
    });
    statsEl.hidden = !stats.length;
  }

  const problemHtml = renderMarkdown(data.problemBody || data.content || data.description || '');
  if (problemBodyEl) problemBodyEl.innerHTML = problemHtml;
  setHidden(problemSection, !problemHtml);

  const bigStat = market.bigStat || '';
  const marketDesc = market.description || '';
  const marketSource = market.source || '';
  setText(marketStatEl, bigStat);
  setText(marketDescEl, marketDesc);
  setHidden(marketDescEl, !marketDesc);
  setText(marketSourceEl, marketSource);
  setHidden(marketSourceEl, !marketSource);
  setHidden(marketSection, !(bigStat || marketDesc || marketSource));

  if (ctaEl && ctaLabelEl) {
    if (ctaUrl) {
      ctaEl.href = ctaUrl;
      ctaLabelEl.textContent = data.ctaLabel || 'View project';
      ctaEl.hidden = false;
    } else {
      ctaEl.hidden = true;
    }
  }

  if (linkEl && linkLabelEl) {
    if (liveUrl) {
      linkEl.href = liveUrl;
      linkLabelEl.textContent = linkLabel(liveUrl);
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
    }
  }

  if (heroImg) {
    heroImg.src = cover;
    heroImg.alt = title + ' preview';
  }

  modal.setAttribute('aria-label', title + ' project details');
  return true;
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
    if (backdrop && onBackdropClick) backdrop.removeEventListener('click', onBackdropClick);
    if (onKeydown) document.removeEventListener('keydown', onKeydown);
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

  closeBtn?.addEventListener('click', closeFeedModal);
  backdrop.addEventListener('click', onBackdropClick);
  document.addEventListener('keydown', onKeydown);
  bound = true;

  bindFeedCardClicks();
  window.openFeedModal = openFeedModal;
  window.closeFeedModal = closeFeedModal;
}

export function teardownFeedModal() {
  closeFeedModal();

  if (bound) {
    closeBtn?.removeEventListener('click', closeFeedModal);
    if (backdrop && onBackdropClick) backdrop.removeEventListener('click', onBackdropClick);
    if (onKeydown) document.removeEventListener('keydown', onKeydown);
    bound = false;
  }

  unbindFeedCardClicks();
  isOpen = false;
  backdrop = null;
  modal = null;
}

window.teardownFeedModal = teardownFeedModal;
