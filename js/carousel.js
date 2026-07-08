/**
 * Infinite carousel — adapted from bnpne/page-transitions-with-webgpu-vanilla-js
 */

const LERP = 0.12;
const GAP_PX = 16;
const DISPLAY_SCALE = 0.74;
const DRAG_THRESHOLD_PX = 8;
const SCROLL_EPSILON = 0.25;

export class Carousel {
  constructor(rootEl, slots, { onActiveChange, onSelect } = {}) {
    this.root = rootEl;
    this.slots = slots;
    this.onActiveChange = onActiveChange || (() => {});
    this.onSelect = onSelect || (() => {});

    this.scrollX = 0;
    this.targetScrollX = 0;
    this.periodX = 0;
    this.activeIndex = -1;
    this.hoveredIndex = -1;
    this.pointerActive = false;
    this.dragMoved = false;
    this.dragStartX = 0;
    this.dragStartScroll = 0;
    this.fitScale = 1;
    this.stageTop = 0;
    this.stageHeight = 0;
    this._raf = null;
    this._layoutCache = [];
    this._hoverAnimTimer = null;

    this._onWheel = this._onWheel.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._tick = this._tick.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  build() {
    const escapeHtml = (value) =>
      String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    this.root.innerHTML = this.slots
      .map(
        (slot, i) => `
      <button type="button" class="carousel-slot" data-index="${i}" aria-label="Open ${escapeHtml(slot.title)}">
        <span class="carousel-slot__body">
          <span class="carousel-card-wrap" aria-hidden="true">
            <span class="carousel-card" aria-hidden="true"></span>
            ${slot.image ? `<img class="carousel-card-img" src="${slot.image}" alt="" loading="lazy">` : ''}
          </span>
          <span class="carousel-meta">
            <span class="carousel-meta__title">${escapeHtml(slot.title)}</span>
            <span class="carousel-meta__reveal">
              <span class="carousel-meta__desc">${escapeHtml(slot.metaDesc)}</span>
              <span class="carousel-meta__view">View</span>
            </span>
          </span>
        </span>
      </button>`
      )
      .join('');

    this.slotEls = Array.from(this.root.querySelectorAll('.carousel-slot'));
    this.bodyEls = this.slotEls.map((el) => el.querySelector('.carousel-slot__body'));

    this.slotEls.forEach((el) => {
      const idx = parseInt(el.dataset.index, 10);

      el.addEventListener('mouseenter', () => {
        this._setHovered(idx);
      });
      el.addEventListener('mouseleave', () => {
        if (this.hoveredIndex === idx) this._setHovered(-1);
      });
      el.addEventListener('focusin', () => {
        this._setHovered(idx);
      });
      el.addEventListener('focusout', (e) => {
        if (!el.contains(e.relatedTarget) && this.hoveredIndex === idx) {
          this._setHovered(-1);
        }
      });
      el.addEventListener('click', () => {
        if (this.dragMoved) {
          this.dragMoved = false;
          return;
        }
        this.onSelect(idx, this.slots[idx]);
      });
    });
  }

  measure() {
    const heights = this.slots.map((s) => s.height);
    const widths = this.slots.map((s) => s.width);
    this.maxCardH = Math.max(...heights);
    this.maxCardW = Math.max(...widths);

    this.baseOffsets = this.slots.map((_, i) => this._offsetBetween(this.centerIndex, i));
    this.periodX = 0;
    for (let i = 0; i < this.slots.length; i++) {
      const next = (i + 1) % this.slots.length;
      this.periodX += this.slots[i].width / 2 + GAP_PX + this.slots[next].width / 2;
    }
    this.stepX = this.maxCardW + GAP_PX;
    this._layoutCache = this.slots.map(() => ({
      x: 0,
      y: 0,
      spreadPx: 0,
      cardW: 0,
      cardH: 0,
      opacity: 1,
      z: 0,
      hovered: false,
      active: false,
    }));
  }

  get centerIndex() {
    return Math.floor(this.slots.length / 2);
  }

  _spacingBetween(a, b) {
    return this.slots[a].width / 2 + GAP_PX + this.slots[b].width / 2;
  }

  _offsetBetween(from, to) {
    if (from === to) return 0;
    let offset = 0;
    if (to > from) {
      for (let j = from; j < to; j++) offset += this._spacingBetween(j, j + 1);
    } else {
      for (let j = to; j < from; j++) offset -= this._spacingBetween(j, j + 1);
    }
    return offset;
  }

  _relOffsets() {
    const half = this.periodX / 2;
    return this.slots.map((_, i) => {
      let relX = this.baseOffsets[i] - this.scrollX;
      relX = ((relX % this.periodX) + this.periodX) % this.periodX;
      if (relX >= half) relX -= this.periodX;
      return relX;
    });
  }

  _hoverExtraWidth(slot) {
    return (slot.hoverWidth || slot.width) - slot.width;
  }

  _spreadForHover(relXs) {
    if (this.hoveredIndex < 0) return relXs;

    const spread = relXs.slice();
    const h = this.hoveredIndex;
    const extraW = this._hoverExtraWidth(this.slots[h]);
    const hRelX = relXs[h];

    for (let i = 0; i < this.slots.length; i++) {
      if (i === h) continue;
      const delta = relXs[i] - hRelX;
      if (delta <= 0) continue;
      if (delta <= this.stepX * 1.45) spread[i] += extraW;
    }

    return spread;
  }

  _setHovered(idx) {
    if (this.hoveredIndex === idx) return;
    this.hoveredIndex = idx;
    this.root.classList.add('is-hover-animating');
    clearTimeout(this._hoverAnimTimer);
    this._hoverAnimTimer = setTimeout(() => {
      this.root.classList.remove('is-hover-animating');
    }, 460);
    this.applyTransforms();
  }

  _refreshStageMetrics() {
    const stage = this.root.closest('.carousel-stage');
    const stageRect = stage ? stage.getBoundingClientRect() : this.root.getBoundingClientRect();
    this.stageTop = stageRect.top;
    this.stageHeight = stageRect.height || this.root.offsetHeight;
  }

  _ensureTick() {
    if (this._raf == null) this._raf = requestAnimationFrame(this._tick);
  }

  start(initialIndex = 0) {
    this.build();
    this.measure();
    this.scrollX = this._indexToScroll(initialIndex);
    this.targetScrollX = this.scrollX;
    this._refreshStageMetrics();
    this.applyTransforms();
    this.root.classList.add('is-ready');

    window.addEventListener('wheel', this._onWheel, { capture: true, passive: false });
    this.root.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('resize', this._onResize);
    this._ensureTick();
  }

  stop() {
    window.removeEventListener('wheel', this._onWheel, { capture: true });
    this.root.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _indexToScroll(index) {
    return this._offsetBetween(this.centerIndex, index);
  }

  _onResize() {
    this.measure();
    this._refreshStageMetrics();
    this.applyTransforms();
    this._ensureTick();
  }

  _onWheel(e) {
    if (e.target.closest('#modal-backdrop.is-open')) return;
    if (e.target.closest('#story-sheet-backdrop.is-open')) return;
    if (e.target.closest('#page-backdrop.is-open')) return;
    if (e.target.closest('#insight-backdrop.is-open')) return;
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.targetScrollX += delta / (this.fitScale || 1);
    this._ensureTick();
  }

  _onPointerDown(e) {
    if (e.button !== 0) return;
    this.pointerActive = true;
    this.dragMoved = false;
    this.dragStartX = e.clientX;
    this.dragStartScroll = this.targetScrollX;
    this._ensureTick();
  }

  _onPointerMove(e) {
    if (!this.pointerActive) return;
    const dx = e.clientX - this.dragStartX;
    if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
    if (!this.dragMoved) {
      this.dragMoved = true;
      this._setHovered(-1);
      this.root.classList.add('is-dragging');
    }
    this.targetScrollX = this.dragStartScroll - dx / (this.fitScale || 1);
    this._ensureTick();
  }

  _onPointerUp(e) {
    if (!this.pointerActive) return;
    const dx = e.clientX - this.dragStartX;
    if (Math.abs(dx) < DRAG_THRESHOLD_PX) this.dragMoved = false;
    this.pointerActive = false;
    this.root.classList.remove('is-dragging');
    this._ensureTick();
  }

  applyTransforms() {
    const vw = window.innerWidth;
    const stageH = this.stageHeight;
    if (!vw || !stageH) return;

    const heightScale = Math.min(1, (stageH - 12) / this.maxCardH);
    this.fitScale = heightScale * DISPLAY_SCALE;

    const baseRelXs = this._relOffsets();
    const spreadRelXs = this._spreadForHover(baseRelXs);
    const rowHeight = this.maxCardH * this.fitScale;
    const rowTop = this.stageTop + (stageH - rowHeight) * 0.42;
    const fit = this.fitScale;

    let closestIdx = 0;
    let closestDist = Infinity;
    let activeRelX = 0;

    for (let i = 0; i < this.slots.length; i++) {
      const relX = baseRelXs[i];
      const dist = Math.abs(relX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
        activeRelX = relX;
      }
    }

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const isHovered = i === this.hoveredIndex;
      const cardW = slot.width * fit;
      const cardH = slot.height * fit;
      const x = vw / 2 + baseRelXs[i] * fit - cardW / 2;
      const y = rowTop;
      const spreadPx = (spreadRelXs[i] - baseRelXs[i]) * fit;
      const dist = Math.abs(baseRelXs[i]);
      const isActive = i === closestIdx && closestDist < this.stepX * 0.55;
      const z = isHovered ? 200 : Math.round((1 - dist / (this.stepX * 1.8)) * 100);

      const cache = this._layoutCache[i];
      const el = this.slotEls[i];
      const body = this.bodyEls[i];

      if (cache.x !== x || cache.y !== y) {
        el.style.transform = `translate3d(${x}px,${y}px,0)`;
        cache.x = x;
        cache.y = y;
      }

      if (cache.spreadPx !== spreadPx) {
        body.style.transform = spreadPx ? `translate3d(${spreadPx}px,0,0)` : '';
        cache.spreadPx = spreadPx;
      }

      if (cache.cardW !== cardW) {
        el.style.setProperty('--card-w', `${cardW}px`);
        el.style.setProperty('--hover-w', `${(slot.hoverWidth || slot.width) * fit}px`);
        cache.cardW = cardW;
      }

      if (cache.cardH !== cardH) {
        el.style.setProperty('--card-h', `${cardH}px`);
        cache.cardH = cardH;
      }

      if (cache.z !== z) {
        el.style.zIndex = String(z);
        cache.z = z;
      }

      el.style.setProperty('--card-color', slot.color);

      if (cache.hovered !== isHovered) {
        el.classList.toggle('is-hovered', isHovered);
        cache.hovered = isHovered;
      }

      if (cache.active !== isActive) {
        el.classList.toggle('is-active', isActive);
        cache.active = isActive;
      }
    }

    if (closestIdx !== this.activeIndex) {
      this.activeIndex = closestIdx;
      this.onActiveChange(closestIdx, this.slots[closestIdx]);
    }

    const detail = document.getElementById('project-detail');
    if (detail) {
      detail.classList.toggle('is-faded', Math.abs(activeRelX) > this.stepX * 0.7);
    }
  }

  _tick() {
    const before = this.scrollX;
    this.scrollX += (this.targetScrollX - this.scrollX) * LERP;
    const scrolling =
      Math.abs(this.targetScrollX - this.scrollX) > SCROLL_EPSILON ||
      Math.abs(before - this.scrollX) > 0.01;

    if (scrolling || this.pointerActive) {
      this.applyTransforms();
      this._raf = requestAnimationFrame(this._tick);
      return;
    }

    this.scrollX = this.targetScrollX;
    this.applyTransforms();
    this._raf = null;
  }
}
