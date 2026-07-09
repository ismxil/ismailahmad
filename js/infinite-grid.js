import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const ASPECTS = [1.2, 0.82, 1.05, 0.72, 1.28, 0.9, 1.15, 0.78, 1.35, 0.88];

export default class InfiniteGrid {
  constructor({ el, sources, onItemClick, gap = 56, captionSpace = 76 }) {
    this.$container = el;
    this.sources = sources;
    this.onItemClick = onItemClick || null;
    this.gap = gap;
    this.captionSpace = captionSpace;

    this.scroll = {
      ease: 0.06,
      current: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      last: { x: 0, y: 0 },
      delta: { x: { c: 0, t: 0 }, y: { c: 0, t: 0 } },
    };

    this.isDisabled = false;
    this.items = [];
    this.introItems = [];
    this.$wrap = el.parentElement || el;
    this.pointer = { active: false, lastX: 0, lastY: 0, moved: false };
    this.didPan = false;

    this.onResize = this.onResize.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.render = this.render.bind(this);
    this.onModalOpen = () => { this.isDisabled = true; };
    this.onModalClose = () => { this.isDisabled = false; };

    window.addEventListener('resize', this.onResize);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    this.$wrap.addEventListener('pointerdown', this.onPointerDown);
    this.$wrap.addEventListener('pointermove', this.onPointerMove, { passive: false });
    this.$wrap.addEventListener('pointerup', this.onPointerUp);
    this.$wrap.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('feed-modal-open', this.onModalOpen);
    window.addEventListener('feed-modal-close', this.onModalClose);

    this.onResize();
    this.render();
    this.initIntro();
    this.intro();
  }

  getColumns() {
    if (this.winW >= 1280) return 3;
    if (this.winW >= 768) return 2;
    return 1;
  }

  getPadding() {
    return Math.max(28, Math.round(this.winW * 0.045));
  }

  buildMasonry() {
    const columns = this.getColumns();
    const padding = this.getPadding();
    const layoutW = this.winW - padding * 2;
    const colWidth = (layoutW - this.gap * (columns - 1)) / columns;
    const colHeights = Array.from({ length: columns }, () => padding);
    const placed = [];

    this.sources.forEach((source, index) => {
      let column = 0;
      let minHeight = colHeights[0];
      for (let c = 1; c < columns; c += 1) {
        if (colHeights[c] < minHeight) {
          minHeight = colHeights[c];
          column = c;
        }
      }

      const aspect = ASPECTS[index % ASPECTS.length];
      const imageH = colWidth / aspect;
      const x = padding + column * (colWidth + this.gap);
      const y = colHeights[column];

      placed.push({
        source,
        x,
        y,
        w: colWidth,
        h: imageH,
        blockH: imageH + this.captionSpace,
      });

      colHeights[column] = y + imageH + this.captionSpace + this.gap;
    });

    const totalH = Math.max(...colHeights) + padding;

    return {
      items: placed,
      originalSize: { w: this.winW, h: totalH },
    };
  }

  initIntro() {
    this.introItems = [...this.$container.querySelectorAll('.feed-grid__item')].filter((item) => {
      const rect = item.getBoundingClientRect();
      return (
        rect.x > -rect.width
        && rect.x < window.innerWidth + rect.width
        && rect.y > -rect.height
        && rect.y < window.innerHeight + rect.height
      );
    });

    this.introItems.forEach((item) => {
      gsap.set(item, { opacity: 0 });
    });
  }

  intro() {
    if (!this.introItems.length) return;
    gsap.to(this.introItems, {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.04,
    });
  }

  onResize() {
    this.winW = window.innerWidth;
    this.winH = window.innerHeight;

    const { items, originalSize } = this.buildMasonry();
    this.originalSize = originalSize;

    this.tileSize = {
      w: this.winW,
      h: this.winW * (this.originalSize.h / this.originalSize.w),
    };

    this.scroll.current = { x: 0, y: 0 };
    this.scroll.target = { x: 0, y: 0 };
    this.scroll.last = { x: 0, y: 0 };

    this.$container.innerHTML = '';
    this.items = [];

    const repsX = [0, this.tileSize.w];
    const repsY = [0, this.tileSize.h];

    items.forEach((item, slotIndex) => {
      repsX.forEach((offsetX, repX) => {
        repsY.forEach((offsetY, repY) => {
          const repIndex = repX + repY * repsX.length;
          const source = this.sources[(slotIndex + repIndex * items.length) % this.sources.length];

          const el = document.createElement('button');
          el.type = 'button';
          el.classList.add('feed-grid__item');
          el.style.width = `${item.w}px`;
          el.dataset.feedIndex = String(source.feedIndex);
          el.setAttribute('aria-label', 'Open project details');

          const wrapper = document.createElement('div');
          wrapper.classList.add('feed-grid__item-wrapper');
          el.appendChild(wrapper);

          const itemImage = document.createElement('div');
          itemImage.classList.add('feed-grid__item-image');
          itemImage.style.width = `${item.w}px`;
          itemImage.style.height = `${item.h}px`;
          wrapper.appendChild(itemImage);

          const img = document.createElement('img');
          img.src = source.src;
          img.alt = '';
          img.loading = 'lazy';
          img.draggable = false;
          itemImage.appendChild(img);

          const caption = document.createElement('small');
          caption.classList.add('feed-grid__caption', 'visible');
          caption.innerHTML = source.caption;
          wrapper.appendChild(caption);

          el.addEventListener('click', (e) => {
            if (this.didPan) {
              e.preventDefault();
              e.stopPropagation();
              this.didPan = false;
              return;
            }
            if (this.isDisabled || !this.onItemClick) return;
            e.stopPropagation();
            this.onItemClick(source.feedIndex);
          });

          this.$container.appendChild(el);

          this.items.push({
            el,
            feedIndex: source.feedIndex,
            x: item.x + offsetX,
            y: item.y + offsetY,
            w: item.w,
            blockH: item.blockH,
            extraX: 0,
            extraY: 0,
          });
        });
      });
    });

    this.tileSize.w *= 2;
    this.tileSize.h *= 2;

    this.scroll.current.x = this.scroll.target.x = this.scroll.last.x = 0;
    this.scroll.current.y = this.scroll.target.y = this.scroll.last.y = -this.winH * 0.04;
  }

  onWheel(e) {
    if (this.isDisabled) return;
    e.preventDefault();
    const factor = 0.65;
    this.scroll.target.x -= e.deltaX * factor;
    this.scroll.target.y -= e.deltaY * factor;
  }

  onPointerDown(e) {
    if (this.isDisabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    this.pointer.active = true;
    this.pointer.lastX = e.clientX;
    this.pointer.lastY = e.clientY;
    this.pointer.moved = false;
    this.didPan = false;
    this.$wrap.setPointerCapture(e.pointerId);
  }

  onPointerMove(e) {
    if (!this.pointer.active || this.isDisabled) return;

    const dx = e.clientX - this.pointer.lastX;
    const dy = e.clientY - this.pointer.lastY;
    this.pointer.lastX = e.clientX;
    this.pointer.lastY = e.clientY;

    if (!this.pointer.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      this.pointer.moved = true;
    }

    if (!this.pointer.moved) return;

    this.scroll.target.x += dx;
    this.scroll.target.y += dy;
    e.preventDefault();
  }

  onPointerUp(e) {
    if (!this.pointer.active) return;

    this.pointer.active = false;
    if (this.pointer.moved) this.didPan = true;

    try {
      this.$wrap.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
  }

  render() {
    this.scroll.current.x += (this.scroll.target.x - this.scroll.current.x) * this.scroll.ease;
    this.scroll.current.y += (this.scroll.target.y - this.scroll.current.y) * this.scroll.ease;

    this.scroll.delta.x.t = this.scroll.current.x - this.scroll.last.x;
    this.scroll.delta.y.t = this.scroll.current.y - this.scroll.last.y;
    this.scroll.delta.x.c += (this.scroll.delta.x.t - this.scroll.delta.x.c) * 0.04;
    this.scroll.delta.y.c += (this.scroll.delta.y.t - this.scroll.delta.y.c) * 0.04;

    const dirX = this.scroll.current.x > this.scroll.last.x ? 'right' : 'left';
    const dirY = this.scroll.current.y > this.scroll.last.y ? 'down' : 'up';

    this.items.forEach((item) => {
      const scrollX = this.scroll.current.x;
      const scrollY = this.scroll.current.y;
      const posX = item.x + scrollX + item.extraX;
      const posY = item.y + scrollY + item.extraY;

      const beforeX = posX > this.winW;
      const afterX = posX + item.w < 0;
      if (dirX === 'right' && beforeX) item.extraX -= this.tileSize.w;
      if (dirX === 'left' && afterX) item.extraX += this.tileSize.w;

      const beforeY = posY > this.winH;
      const afterY = posY + item.blockH < 0;
      if (dirY === 'down' && beforeY) item.extraY -= this.tileSize.h;
      if (dirY === 'up' && afterY) item.extraY += this.tileSize.h;

      const fx = item.x + scrollX + item.extraX;
      const fy = item.y + scrollY + item.extraY;
      item.el.style.transform = `translate3d(${fx}px, ${fy}px, 0)`;
    });

    this.scroll.last.x = this.scroll.current.x;
    this.scroll.last.y = this.scroll.current.y;

    this._raf = requestAnimationFrame(this.render);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('wheel', this.onWheel);
    this.$wrap.removeEventListener('pointerdown', this.onPointerDown);
    this.$wrap.removeEventListener('pointermove', this.onPointerMove);
    this.$wrap.removeEventListener('pointerup', this.onPointerUp);
    this.$wrap.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('feed-modal-open', this.onModalOpen);
    window.removeEventListener('feed-modal-close', this.onModalClose);
  }
}
