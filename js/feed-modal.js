import { getFeedItem } from './feed-items.js';

let backdrop;
let modal;
let hero;
let heroImg;
let clientEl;
let headlineEl;
let categoryEl;
let yearsEl;
let descriptionEl;
let closeBtn;
let isOpen = false;

function cacheElements() {
  backdrop = document.getElementById('feed-modal-backdrop');
  modal = document.getElementById('feed-modal');
  hero = document.getElementById('feed-modal-hero');
  heroImg = document.getElementById('feed-modal-hero-img');
  clientEl = document.getElementById('feed-modal-client');
  headlineEl = document.getElementById('feed-modal-headline');
  categoryEl = document.getElementById('feed-modal-category');
  yearsEl = document.getElementById('feed-modal-years');
  descriptionEl = document.getElementById('feed-modal-description');
  closeBtn = document.getElementById('feed-modal-close');
}

function populate(item) {
  const data = getFeedItem(item.id);
  hero.style.backgroundColor = data.accent || '#393bfe';
  heroImg.src = data.cover;
  heroImg.alt = data.client + ' project preview';
  clientEl.textContent = data.client;
  headlineEl.textContent = data.headline;
  categoryEl.textContent = data.category;
  yearsEl.textContent = data.years;
  descriptionEl.textContent = data.description;
  modal.setAttribute('aria-label', data.client + ' project details');
}

export function openFeedModal(itemIndex) {
  if (!backdrop) cacheElements();
  if (!backdrop || isOpen) return;

  const item = getFeedItem(itemIndex);
  populate(item);
  isOpen = true;
  backdrop.classList.add('is-open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('feed-modal-open');
  window.dispatchEvent(new CustomEvent('feed-modal-open'));
  closeBtn.focus({ preventScroll: true });
}

export function closeFeedModal() {
  if (!backdrop || !isOpen) return;
  isOpen = false;
  backdrop.classList.remove('is-open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('feed-modal-open');
  window.dispatchEvent(new CustomEvent('feed-modal-close'));
}

export function initFeedModal() {
  cacheElements();
  if (!backdrop) return;

  closeBtn.addEventListener('click', closeFeedModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeFeedModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closeFeedModal();
    }
  });
}
