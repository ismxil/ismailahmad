// Vertical project stack — covers flush to the bottom of the viewport.
// Wheel/touch cycles projects. Click opens the project modal (no expand-to-fill).

const EDGE_SCALE = 0.88;
const FADE_START = 0.85;
const FADE_END = 1.35;
const REST_PROGRESS = 0;
const ENTRY_FROM = 1.2;
const ENTRY_MS = 900;
const TAP_THRESHOLD = 8;
const CARD_GAP = 32;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export class StackCards {
  constructor(stageEl, workEl, slots, { onSelect } = {}) {
    this.stage = stageEl;
    this.work = workEl;
    this.slots = slots;
    this.onSelect = onSelect || (() => {});
    this.N = slots.length;
    this._items = [];
    this._progress = ENTRY_FROM;
    this._snapTimer = null;
    this._touchY = null;
    this._pointer = { active: false, moved: false, slotIndex: null };
    this._suppressClick = false;

    this._onWheel = this._onWheel.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  _metrics() {
    const VW = window.innerWidth;
    const VH = window.innerHeight;
    const mob = VW <= 768;
    const hPad = mob ? 16 : 24;

    // Figma cover proportion (~996×560), flush to bottom edge
    const cardW = mob
      ? VW - hPad * 2
      : Math.min(996, VW - hPad * 2);
    const cardH = Math.round(cardW * (560 / 996));
    const restTop = VH - cardH; // flush bottom
    const left = Math.round((VW - cardW) / 2);
    const step = cardH + CARD_GAP;

    return { VW, VH, cardW, cardH, restTop, left, step, mob };
  }

  _delta(i, p) {
    const raw = i - p;
    return raw - this.N * Math.round(raw / this.N);
  }

  _selectSlot(index) {
    if (this._isScrollLocked()) return;
    this.onSelect(index, this.slots[index]);
  }

  _openSlot(index) {
    this._suppressClick = true;
    this._selectSlot(index);
  }

  start() {
    this._build();
    this._measure();
    this._applyTransforms(this._progress);
    this._playEntrance();
    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd);
    window.addEventListener('touchcancel', this._onTouchEnd);
    if (this.stage) {
      this.stage.addEventListener('pointerdown', this._onPointerDown);
      this.stage.addEventListener('pointermove', this._onPointerMove);
      this.stage.addEventListener('pointerup', this._onPointerUp);
      this.stage.addEventListener('pointercancel', this._onPointerUp);
    }
    window.addEventListener('resize', this._onResize);
  }

  stop() {
    if (this._snapTimer) clearTimeout(this._snapTimer);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchEnd);
    if (this.stage) {
      this.stage.removeEventListener('pointerdown', this._onPointerDown);
      this.stage.removeEventListener('pointermove', this._onPointerMove);
      this.stage.removeEventListener('pointerup', this._onPointerUp);
      this.stage.removeEventListener('pointercancel', this._onPointerUp);
    }
    window.removeEventListener('resize', this._onResize);
    document.documentElement.style.removeProperty('--home-chrome-opacity');
    document.documentElement.classList.remove('is-cover-expanding');
    if (window.__stackCards === this) window.__stackCards = null;
  }

  _scheduleSnap() {
    if (this._snapTimer) clearTimeout(this._snapTimer);
    this._snapTimer = setTimeout(() => {
      this._snapTimer = null;
      if (this._isScrollLocked()) return;
      const target = Math.round(this._progress);
      if (target === this._progress) return;
      this._applyTransforms(target);
    }, 120);
  }

  _build() {
    const esc = (s) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    this.stage.innerHTML = this.slots
      .map((s, i) => {
        const img = s.image
          ? `<img class="stack-card__img" src="${esc(s.image)}" alt="" draggable="false" />`
          : '';
        return `<div class="stack-item" data-index="${i}">
        <div class="stack-card-wrap">
          <button type="button" class="stack-card"
            aria-label="Open ${esc(s.title)}"
            style="--card-color:${esc(s.color)}"
          >${img}</button>
        </div>
        <div class="stack-item__meta">
          <h3 class="stack-item__title">${esc(s.title)}</h3>
          <p class="stack-item__desc">${esc(s.subtitle || '')}</p>
        </div>
      </div>`;
      })
      .join('');

    this._items = Array.from(this.stage.querySelectorAll('.stack-item'));
    this._items.forEach((el, i) => {
      const open = () => {
        if (this._suppressClick) {
          this._suppressClick = false;
          return;
        }
        this._openSlot(i);
      };
      el.querySelector('.stack-card').addEventListener('click', open);
      el.addEventListener('click', (e) => {
        if (e.target.closest('.stack-card')) return;
        open();
      });
    });
  }

  _measure() {
    if (this.work) this.work.style.height = '0px';
  }

  _applyTransforms(p) {
    this._progress = p;
    const { cardW, cardH, restTop, left, step } = this._metrics();
    const order = [];

    for (let i = 0; i < this.N; i++) {
      const el = this._items[i];
      const wrap = el.querySelector('.stack-card-wrap');
      const card = el.querySelector('.stack-card');
      const meta = el.querySelector('.stack-item__meta');
      const delta = this._delta(i, p);
      const absD = Math.abs(delta);

      const scale =
        absD <= 1
          ? 1 - (1 - EDGE_SCALE) * absD
          : EDGE_SCALE * Math.max(0, 1 - (absD - 1) / (FADE_END - FADE_START));

      const opacity =
        absD <= FADE_START
          ? 1
          : Math.max(0, 1 - (absD - FADE_START) / (FADE_END - FADE_START));

      // Active flush to bottom; others stack above / below
      const itemTop = Math.round(restTop + delta * step);
      const visualH = Math.round(cardH * scale);

      el.style.width = cardW + 'px';
      el.style.left = left + 'px';
      el.style.top = itemTop + 'px';
      el.style.opacity = String(opacity.toFixed(3));
      el.style.zIndex = String(Math.round(20 - absD * 2));
      el.style.pointerEvents = opacity < 0.05 ? 'none' : 'auto';
      el.classList.remove('is-expanding');

      wrap.style.height = visualH + 'px';
      wrap.style.borderRadius = '0';

      card.style.height = cardH + 'px';
      card.style.transform = scale === 1 ? 'none' : `scale(${scale.toFixed(4)})`;
      card.style.borderRadius = '0';

      // Titles sit under the cover; mostly below the fold when flush
      meta.style.opacity = String((opacity * (absD < 0.35 ? 1 : Math.max(0, 1 - absD))).toFixed(3));

      order.push({ el, absD });
    }

    order.sort((a, b) => b.absD - a.absD);
    order.forEach(({ el }) => this.stage.appendChild(el));

    if (this.stage) this.stage.style.zIndex = '';
  }

  _playEntrance() {
    requestAnimationFrame(() => {
      const t = `top ${ENTRY_MS}ms cubic-bezier(.16,1,.3,1), opacity ${ENTRY_MS * 0.8}ms ease, transform ${ENTRY_MS}ms cubic-bezier(.16,1,.3,1)`;
      this._items.forEach((el) => {
        el.style.transition = t;
        el.querySelector('.stack-card').style.transition = t;
      });
      requestAnimationFrame(() => {
        this._applyTransforms(REST_PROGRESS);
        setTimeout(() => {
          this._items.forEach((el) => {
            el.style.transition = '';
            el.querySelector('.stack-card').style.transition = '';
          });
        }, ENTRY_MS);
      });
    });
  }

  _setProgress(p) {
    if (p === this._progress) return;
    this._applyTransforms(p);
  }

  _nudgeScroll(deltaY) {
    const VH = window.innerHeight || 1;
    this._setProgress(this._progress + deltaY / VH);
    this._scheduleSnap();
  }

  _isActive() {
    return !!(this.stage && this.stage.isConnected);
  }

  _isScrollLocked() {
    const backdrop = document.getElementById('modal-backdrop');
    return !!(backdrop && backdrop.classList.contains('is-open'));
  }

  _slotFromTarget(target) {
    const item = target?.closest?.('.stack-item');
    if (!item) return null;
    const index = Number(item.dataset.index);
    return Number.isNaN(index) ? null : index;
  }

  _onPointerDown(e) {
    if (!this._isActive() || this._isScrollLocked()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this._pointer.active = true;
    this._pointer.moved = false;
    this._pointer.startY = e.clientY;
    this._pointer.lastY = e.clientY;
    this._pointer.slotIndex = this._slotFromTarget(e.target);
  }

  _onPointerMove(e) {
    if (!this._isActive() || !this._pointer.active || this._isScrollLocked()) return;
    const dy = e.clientY - this._pointer.startY;
    if (!this._pointer.moved && Math.abs(dy) > TAP_THRESHOLD) this._pointer.moved = true;
    if (!this._pointer.moved) return;
    const stepDy = e.clientY - this._pointer.lastY;
    this._pointer.lastY = e.clientY;
    this._nudgeScroll(-stepDy);
    e.preventDefault();
  }

  _onPointerUp() {
    if (!this._pointer.active) return;
    const slotIndex = this._pointer.slotIndex;
    const tapped = slotIndex != null && !this._pointer.moved;
    this._pointer.active = false;
    this._pointer.slotIndex = null;
    if (tapped) this._openSlot(slotIndex);
  }

  _onWheel(e) {
    if (!this._isActive() || this._isScrollLocked()) return;
    e.preventDefault();
    this._nudgeScroll(e.deltaY);
  }

  _onTouchStart(e) {
    if (!this._isActive() || this._isScrollLocked()) return;
    this._touchY = e.touches[0].clientY;
    this._touchStartY = e.touches[0].clientY;
    this._touchMoved = false;
    this._touchSlot = this._slotFromTarget(e.target);
  }

  _onTouchMove(e) {
    if (!this._isActive() || this._isScrollLocked() || this._touchY == null) return;
    const y = e.touches[0].clientY;
    if (!this._touchMoved && Math.abs(y - this._touchStartY) > TAP_THRESHOLD) {
      this._touchMoved = true;
    }
    if (!this._touchMoved) return;
    this._nudgeScroll(this._touchY - y);
    this._touchY = y;
    e.preventDefault();
  }

  _onTouchEnd() {
    if (this._touchSlot != null && !this._touchMoved) this._openSlot(this._touchSlot);
    this._touchY = null;
    this._touchStartY = null;
    this._touchMoved = false;
    this._touchSlot = null;
  }

  _onResize() {
    this._measure();
    this._applyTransforms(this._progress);
  }
}
