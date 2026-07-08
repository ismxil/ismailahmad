/**
 * Infinite carousel — adapted from bnpne/page-transitions-with-webgpu-vanilla-js
 */

const LERP = 0.1;
const GAP_PX = 16;

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
    this.isDragging = false;
    this.dragMoved = false;
    this.dragStartX = 0;
    this.dragStartScroll = 0;
    this.fitScale = 1;

    this._onWheel = this._onWheel.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._tick = this._tick.bind(this);
    this._onResize = this._onResize.bind(this);
    this._raf = null;
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
      </button>`
      )
      .join('');

    this.slotEls = Array.from(this.root.querySelectorAll('.carousel-slot'));
    this.slotEls.forEach((el) => {
      const idx = parseInt(el.dataset.index, 10);

      el.addEventListener('mouseenter', () => {
        this.hoveredIndex = idx;
        this.applyTransforms();
      });
      el.addEventListener('mouseleave', () => {
        if (this.hoveredIndex === idx) this.hoveredIndex = -1;
        this.applyTransforms();
      });
      el.addEventListener('focusin', () => {
        this.hoveredIndex = idx;
        this.applyTransforms();
      });
      el.addEventListener('focusout', (e) => {
        if (!el.contains(e.relatedTarget)) {
          if (this.hoveredIndex === idx) this.hoveredIndex = -1;
          this.applyTransforms();
        }
      });
      el.addEventListener('click', () => {
        if (this.dragMoved) return;
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

  start(initialIndex = 0) {
    this.build();
    this.measure();
    this.scrollX = this._indexToScroll(initialIndex);
    this.targetScrollX = this.scrollX;
    this.applyTransforms();
    this.root.classList.add('is-ready');

    window.addEventListener('wheel', this._onWheel, { capture: true, passive: false });
    this.root.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('resize', this._onResize);
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    window.removeEventListener('wheel', this._onWheel, { capture: true });
    this.root.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _indexToScroll(index) {
    return this._offsetBetween(this.centerIndex, index);
  }

  _onResize() {
    this.measure();
    this.applyTransforms();
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
  }

  _onPointerDown(e) {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = e.clientX;
    this.dragStartScroll = this.targetScrollX;
    this.root.classList.add('is-dragging');
    this.root.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    if (Math.abs(dx) > 4) this.dragMoved = true;
    this.targetScrollX = this.dragStartScroll - dx / (this.fitScale || 1);
  }

  _onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.root.classList.remove('is-dragging');
  }

  applyTransforms() {
    const stage = this.root.closest('.carousel-stage');
    const stageRect = stage ? stage.getBoundingClientRect() : this.root.getBoundingClientRect();
    const vw = window.innerWidth;
    const stageH = stageRect.height || this.root.offsetHeight;
    if (!vw || !stageH) return;

    const heightScale = Math.min(1, (stageH - 12) / this.maxCardH);
    this.fitScale = heightScale;

    const half = this.periodX / 2;
    const rowHeight = this.maxCardH * this.fitScale;
    const rowTop = stageRect.top + (stageRect.height - rowHeight) * 0.5;

    let closestIdx = 0;
    let closestDist = Infinity;
    let activeRelX = 0;

    for (let i = 0; i < this.slots.length; i++) {
      let relX = this.baseOffsets[i] - this.scrollX;
      relX = ((relX % this.periodX) + this.periodX) % this.periodX;
      if (relX >= half) relX -= this.periodX;

      const dist = Math.abs(relX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
        activeRelX = relX;
      }

      const slot = this.slots[i];
      const fit = this.fitScale;
      const cardW = slot.width * fit;
      const cardH = slot.height * fit;
      const hoverW = (slot.hoverWidth || slot.width) * fit;
      const x = vw / 2 + relX * fit - cardW / 2;
      const y = rowTop;
      const isHovered = i === this.hoveredIndex;
      const isActive = i === closestIdx && closestDist < this.stepX * 0.55;

      const el = this.slotEls[i];
      el.style.setProperty('--card-w', `${cardW}px`);
      el.style.setProperty('--card-h', `${cardH}px`);
      el.style.setProperty('--hover-w', `${hoverW}px`);
      el.style.setProperty('--card-color', slot.color);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = '1';
      el.style.zIndex = String(isHovered ? 999 : Math.round((1 - dist / (this.stepX * 1.8)) * 100));
      el.classList.toggle('is-hovered', isHovered);
      el.classList.toggle('is-active', isActive);
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
    this.scrollX += (this.targetScrollX - this.scrollX) * LERP;
    this.applyTransforms();
    this._raf = requestAnimationFrame(this._tick);
  }
}
