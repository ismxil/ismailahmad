// Scroll-driven vertical card stack

const PAST_SCALE = 0.38;
const PEEK_FRAC  = 0.38; // fraction of card height visible when entering (displacement = 1)
const PAST_GAP   = 8;    // px gap between past card's bottom and active card's top

export class StackCards {
  constructor(stageEl, workEl, slots, { onSelect } = {}) {
    this.stage   = stageEl;
    this.work    = workEl;
    this.slots   = slots;
    this.onSelect = onSelect || (() => {});
    this.N       = slots.length;
    this._cards  = [];
    this._raf    = null;
    this._lastP  = null;

    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  // ─── geometry ────────────────────────────────────────────────────────────────
  _metrics() {
    const VW    = window.innerWidth;
    const VH    = window.innerHeight;
    const mob   = VW <= 768;
    const hPad  = mob ? 16 : 24;

    // Card fills most of the viewport — hero scrolls away before card is active
    const cardH   = Math.round(VH * (mob ? 0.80 : 0.86));
    const cardW   = mob ? VW - hPad * 2 : Math.min(VW - hPad * 2, 900);

    // Past card sits at the very top; active card starts right below it
    const pastTop   = 12;
    const pastH     = Math.round(cardH * PAST_SCALE);   // visual height of scaled past card
    const activeTop = pastTop + pastH + PAST_GAP;        // active card starts here
    const peekTop   = VH - Math.round(cardH * PEEK_FRAC); // card top when peeking

    return { VW, VH, cardW, cardH, pastTop, activeTop, peekTop };
  }

  // ─── progress ────────────────────────────────────────────────────────────────
  // progress = -1 at scroll=0  →  card 0 at d=1 (peeking from bottom, 38% visible)
  // progress =  0 at scroll=VH →  card 0 fully active (hero has scrolled away)
  // progress =  1 at scroll=2VH → card 1 active, etc.
  _progress() {
    return window.scrollY / window.innerHeight - 1;
  }

  // ─── lifecycle ───────────────────────────────────────────────────────────────
  start() {
    this._build();
    this._measure();
    const p = this._progress();
    this._lastP = p;
    this._applyTransforms(p);
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize);
  }

  stop() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _build() {
    const esc = s => String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    this.stage.innerHTML = this.slots.map((s, i) =>
      `<button type="button" class="stack-card" data-index="${i}"
        aria-label="Open ${esc(s.title)}"
        style="--card-color:${esc(s.color)}"
      >${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy">` : ''
      }<span class="stack-card__label">${esc(s.title)}</span
      ></button>`
    ).join('');

    this._cards = Array.from(this.stage.querySelectorAll('.stack-card'));
    this._cards.forEach((el, i) => {
      el.addEventListener('click', () => this.onSelect(i, this.slots[i]));
    });
  }

  _measure() {
    const VH = window.innerHeight;
    // Hero (#home-layout at 100svh) provides first VH of scroll.
    // Work section below adds (N - 0.5) * VH so the last card settles.
    this.work.style.height = (this.N - 0.5) * VH + 'px';
  }

  // ─── transforms ──────────────────────────────────────────────────────────────
  _applyTransforms(p) {
    this._lastP = p;
    const { VW, VH, cardW, cardH, pastTop, activeTop, peekTop } = this._metrics();

    for (let i = 0; i < this.N; i++) {
      const el = this._cards[i];
      const d  = i - p; // <0 = past, 0 = active, >0 = upcoming

      let top, scale, opacity, z;

      if (d <= -1) {
        // Fully past — tiny thumbnail at top
        top = pastTop; scale = PAST_SCALE; opacity = 1;
        z = i; // earlier past cards sit beneath later ones
      } else if (d < 0) {
        // Exiting: active → past
        const t = -d;
        top   = activeTop + (pastTop   - activeTop) * t;
        scale = 1         + (PAST_SCALE - 1)        * t;
        opacity = 1; z = 100;
      } else if (d <= 1) {
        // Active (d=0) or entering from below (d=1 = initial peek)
        const t = d;
        top   = activeTop + (peekTop - activeTop) * t;
        scale = 1; opacity = 1;
        z = t < 0.5 ? 100 : 60 - i;
      } else {
        // Far ahead — fully hidden below viewport
        top = VH; scale = 1; opacity = 0;
        z = 60 - i;
      }

      const x = (VW - cardW) / 2;
      el.style.width     = cardW + 'px';
      el.style.height    = cardH + 'px';
      el.style.transform = `translate3d(${Math.round(x)}px,${Math.round(top)}px,0) scale(${scale.toFixed(4)})`;
      el.style.opacity   = String(opacity);
      el.style.zIndex    = String(z);
    }
  }

  // ─── events ──────────────────────────────────────────────────────────────────
  _onScroll() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      const p = this._progress();
      if (p !== this._lastP) this._applyTransforms(p);
    });
  }

  _onResize() {
    this._measure();
    this._applyTransforms(this._progress());
  }
}
