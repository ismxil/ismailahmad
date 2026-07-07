/**
 * Infinite carousel — adapted from bnpne/page-transitions-with-webgpu-vanilla-js
 */

const LERP = 0.1;
const GAP_PX = 16;
const TILT_RAD_PER_PX = 0.004;
const TILT_MAX_RAD = 0.06;
const TILT_LERP = 0.09;

export class Carousel {
  constructor(rootEl, slots, { onActiveChange, onSelect } = {}) {
    this.root = rootEl;
    this.slots = slots;
    this.onActiveChange = onActiveChange || (() => {});
    this.onSelect = onSelect || (() => {});

    this.scrollX = 0;
    this.targetScrollX = 0;
    this.periodX = 0;
    this.velocity = 0;
    this.tilt = 0;
    this.activeIndex = -1;
    this.isDragging = false;
    this.dragMoved = false;
    this.dragStartX = 0;
    this.dragStartScroll = 0;

    this._onWheel = this._onWheel.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._tick = this._tick.bind(this);
    this._onResize = this._onResize.bind(this);
    this._raf = null;
  }

  build() {
    this.root.innerHTML = this.slots
      .map(
        (slot, i) => `
      <button type="button" class="carousel-slot" data-index="${i}" style="--card-w:${slot.width}px;--card-h:${slot.height}px;--card-color:${slot.color}">
        <span class="carousel-card" aria-hidden="true"></span>
        ${slot.image ? `<img class="carousel-card-img" src="${slot.image}" alt="" loading="lazy">` : ''}
      </button>`
      )
      .join('');
    this.slotEls = Array.from(this.root.querySelectorAll('.carousel-slot'));
    this.slotEls.forEach((el) => {
      el.addEventListener('click', () => {
        if (this.dragMoved) return;
        const idx = parseInt(el.dataset.index, 10);
        this.onSelect(idx, this.slots[idx]);
      });
    });
  }

  measure() {
    const widths = this.slots.map((s) => s.width);
    this.stepX = Math.max(...widths) + GAP_PX;
    this.periodX = this.slots.reduce((sum, s) => sum + s.width + GAP_PX, 0);
  }

  start(initialIndex = 0) {
    this.build();
    this.measure();
    const c = Math.floor(this.slots.length / 2);
    const offset = this._indexToScroll(initialIndex);
    this.scrollX = offset;
    this.targetScrollX = offset;

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
    let offset = 0;
    const c = Math.floor(this.slots.length / 2);
    for (let i = c; i < index; i++) offset += this.slots[i].width + GAP_PX;
    for (let i = index; i < c; i++) offset -= this.slots[i].width + GAP_PX;
    return offset;
  }

  _onResize() {
    this.measure();
    this.applyTransforms();
  }

  _onWheel(e) {
    if (e.target.closest('#modal-backdrop.is-open')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.targetScrollX += delta;
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
    this.targetScrollX = this.dragStartScroll - dx;
  }

  _onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.root.classList.remove('is-dragging');
  }

  applyTransforms() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const half = this.periodX / 2;
    const c = Math.floor(this.slots.length / 2);

    let closestIdx = 0;
    let closestDist = Infinity;
    let activeRelX = 0;

    const offsets = this.slots.map((_, i) => {
      let x = 0;
      for (let j = c; j < i; j++) x += this.slots[j].width + GAP_PX;
      for (let j = i; j < c; j++) x -= this.slots[j].width + GAP_PX;
      return x;
    });

    for (let i = 0; i < this.slots.length; i++) {
      let relX = offsets[i] - this.scrollX;
      relX = ((relX % this.periodX) + this.periodX) % this.periodX;
      if (relX >= half) relX -= this.periodX;

      const dist = Math.abs(relX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
        activeRelX = relX;
      }

      const slot = this.slots[i];
      const w = slot.width;
      const h = slot.height;
      const x = vw / 2 + relX - w / 2;
      const y = vh * 0.38 - h / 2;

      const normDist = Math.min(dist / (this.stepX * 2.2), 1);
      const scale = 1 - normDist * 0.12;
      const opacity = 1 - normDist * 0.3;
      const slotTilt = this.tilt * (1 - normDist * 0.5);

      const el = this.slotEls[i];
      el.style.transform = `translate(${x}px, ${y}px) rotateY(${slotTilt}rad) scale(${scale})`;
      el.style.opacity = opacity;
      el.style.zIndex = Math.round((1 - normDist) * 100);
      el.classList.toggle('is-active', i === closestIdx && closestDist < this.stepX * 0.55);
    }

    if (closestIdx !== this.activeIndex) {
      this.activeIndex = closestIdx;
      this.onActiveChange(closestIdx, this.slots[closestIdx]);
    }

    const detail = document.getElementById('project-detail');
    if (detail) {
      const activeH = this.slots[closestIdx]?.height || 400;
      detail.style.top = `${vh * 0.38 + activeH / 2 + 40}px`;
      detail.classList.toggle('is-faded', Math.abs(activeRelX) > this.stepX * 0.7);
    }
  }

  _tick() {
    const prev = this.scrollX;
    this.scrollX += (this.targetScrollX - this.scrollX) * LERP;
    this.velocity = this.scrollX - prev;

    const targetTilt = Math.max(-TILT_MAX_RAD, Math.min(TILT_MAX_RAD, this.velocity * TILT_RAD_PER_PX));
    this.tilt += (targetTilt - this.tilt) * TILT_LERP;

    this.applyTransforms();
    this._raf = requestAnimationFrame(this._tick);
  }
}
