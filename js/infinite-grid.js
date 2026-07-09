import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const CLICK_DRAG_THRESHOLD = 14;

export default class InfiniteGrid {
  constructor({ el, sources, data, originalSize, onItemClick }) {
    this.$container = el;
    this.sources = sources;
    this.data = data;
    this.originalSize = originalSize;
    this.onItemClick = onItemClick || null;

    this.scroll = {
      ease: 0.06,
      current: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      last: { x: 0, y: 0 },
      delta: { x: { c: 0, t: 0 }, y: { c: 0, t: 0 } },
    };

    this.isDragging = false;
    this.isDisabled = false;
    this.didDrag = false;
    this.drag = { startX: 0, startY: 0, scrollX: 0, scrollY: 0 };

    this.mouse = {
      x: { t: 0.5, c: 0.5 },
      y: { t: 0.5, c: 0.5 },
      press: { t: 0, c: 0 },
    };

    this.items = [];
    this.introItems = [];

    this.onResize = this.onResize.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.render = this.render.bind(this);
    this.onModalOpen = () => { this.isDisabled = true; this.isDragging = false; };
    this.onModalClose = () => { this.isDisabled = false; };

    window.addEventListener('resize', this.onResize);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove);
    this.$container.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('feed-modal-open', this.onModalOpen);
    window.addEventListener('feed-modal-close', this.onModalClose);

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('visible', entry.isIntersecting);
      });
    });

    this.onResize();
    this.render();
    this.initIntro();
    this.intro();
  }

  initIntro() {
    this.introItems = [...this.$container.querySelectorAll('.item-wrapper')].filter((item) => {
      const rect = item.getBoundingClientRect();
      return (
        rect.x > -rect.width &&
        rect.x < window.innerWidth + rect.width &&
        rect.y > -rect.height &&
        rect.y < window.innerHeight + rect.height
      );
    });
    this.introItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const x = -rect.x + window.innerWidth * 0.5 - rect.width * 0.5;
      const y = -rect.y + window.innerHeight * 0.5 - rect.height * 0.5;
      gsap.set(item, { x, y });
    });
  }

  intro() {
    gsap.to([...this.introItems].reverse(), {
      duration: 1.6,
      ease: 'expo.inOut',
      x: 0,
      y: 0,
      stagger: 0.04,
    });
  }

  onResize() {
    this.winW = window.innerWidth;
    this.winH = window.innerHeight;

    this.tileSize = {
      w: this.winW,
      h: this.winW * (this.originalSize.h / this.originalSize.w),
    };

    this.scroll.current = { x: 0, y: 0 };
    this.scroll.target = { x: 0, y: 0 };
    this.scroll.last = { x: 0, y: 0 };

    this.$container.innerHTML = '';

    const baseItems = this.data.map((d, i) => {
      const scaleX = this.tileSize.w / this.originalSize.w;
      const scaleY = this.tileSize.h / this.originalSize.h;
      const source = this.sources[i % this.sources.length];
      return {
        src: source.src,
        caption: source.caption,
        feedIndex: source.feedIndex,
        x: d.x * scaleX,
        y: d.y * scaleY,
        w: d.w * scaleX,
        h: d.h * scaleY,
      };
    });

    this.items = [];
    const repsX = [0, this.tileSize.w];
    const repsY = [0, this.tileSize.h];

    baseItems.forEach((base) => {
      repsX.forEach((offsetX) => {
        repsY.forEach((offsetY) => {
          const el = document.createElement('div');
          el.classList.add('feed-grid__item');
          el.style.width = `${base.w}px`;
          el.dataset.feedIndex = String(base.feedIndex);

          const wrapper = document.createElement('div');
          wrapper.classList.add('feed-grid__item-wrapper');
          el.appendChild(wrapper);

          const itemImage = document.createElement('div');
          itemImage.classList.add('feed-grid__item-image');
          itemImage.style.width = `${base.w}px`;
          itemImage.style.height = `${base.h}px`;
          wrapper.appendChild(itemImage);

          const img = document.createElement('img');
          img.src = base.src;
          img.alt = '';
          img.loading = 'lazy';
          img.draggable = false;
          itemImage.appendChild(img);

          const caption = document.createElement('small');
          caption.classList.add('feed-grid__caption');
          caption.innerHTML = base.caption;
          wrapper.appendChild(caption);
          this.observer.observe(caption);

          this.$container.appendChild(el);

          this.items.push({
            el,
            container: itemImage,
            wrapper,
            img,
            feedIndex: base.feedIndex,
            x: base.x + offsetX,
            y: base.y + offsetY,
            w: base.w,
            h: base.h,
            extraX: 0,
            extraY: 0,
            rect: el.getBoundingClientRect(),
            ease: Math.random() * 0.5 + 0.5,
          });
        });
      });
    });

    this.tileSize.w *= 2;
    this.tileSize.h *= 2;

    this.scroll.current.x = this.scroll.target.x = this.scroll.last.x = -this.winW * 0.1;
    this.scroll.current.y = this.scroll.target.y = this.scroll.last.y = -this.winH * 0.1;
  }

  onWheel(e) {
    if (this.isDisabled) return;
    e.preventDefault();
    const factor = 0.45;
    this.scroll.target.x -= e.deltaX * factor;
    this.scroll.target.y -= e.deltaY * factor;
  }

  onPointerDown(e) {
    if (this.isDisabled) return;
    if (e.button !== 0) return;
    e.preventDefault();
    this.isDragging = true;
    this.didDrag = false;
    document.documentElement.classList.add('feed-grid-dragging');
    this.mouse.press.t = 1;
    this.drag.startX = e.clientX;
    this.drag.startY = e.clientY;
    this.drag.scrollX = this.scroll.target.x;
    this.drag.scrollY = this.scroll.target.y;
    this.$container.setPointerCapture(e.pointerId);
  }

  onPointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    document.documentElement.classList.remove('feed-grid-dragging');
    this.mouse.press.t = 0;

    try {
      this.$container.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const moved = Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY);
    if (!this.didDrag && moved < CLICK_DRAG_THRESHOLD && this.onItemClick) {
      const target = e.target.closest('[data-feed-index]');
      if (target) {
        const index = parseInt(target.dataset.feedIndex, 10);
        if (!Number.isNaN(index)) this.onItemClick(index);
      }
    }
  }

  onPointerMove(e) {
    this.mouse.x.t = e.clientX / this.winW;
    this.mouse.y.t = e.clientY / this.winH;

    if (!this.isDragging || this.isDisabled) return;

    const dx = e.clientX - this.drag.startX;
    const dy = e.clientY - this.drag.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.didDrag = true;
    this.scroll.target.x = this.drag.scrollX + dx;
    this.scroll.target.y = this.drag.scrollY + dy;
  }

  render() {
    this.scroll.current.x += (this.scroll.target.x - this.scroll.current.x) * this.scroll.ease;
    this.scroll.current.y += (this.scroll.target.y - this.scroll.current.y) * this.scroll.ease;

    this.scroll.delta.x.t = this.scroll.current.x - this.scroll.last.x;
    this.scroll.delta.y.t = this.scroll.current.y - this.scroll.last.y;
    this.scroll.delta.x.c += (this.scroll.delta.x.t - this.scroll.delta.x.c) * 0.04;
    this.scroll.delta.y.c += (this.scroll.delta.y.t - this.scroll.delta.y.c) * 0.04;
    this.mouse.x.c += (this.mouse.x.t - this.mouse.x.c) * 0.04;
    this.mouse.y.c += (this.mouse.y.t - this.mouse.y.c) * 0.04;
    this.mouse.press.c += (this.mouse.press.t - this.mouse.press.c) * 0.04;

    const dirX = this.scroll.current.x > this.scroll.last.x ? 'right' : 'left';
    const dirY = this.scroll.current.y > this.scroll.last.y ? 'down' : 'up';

    this.items.forEach((item) => {
      const newX = 5 * this.scroll.delta.x.c * item.ease + (this.mouse.x.c - 0.5) * item.rect.width * 0.6;
      const newY = 5 * this.scroll.delta.y.c * item.ease + (this.mouse.y.c - 0.5) * item.rect.height * 0.6;
      const scrollX = this.scroll.current.x;
      const scrollY = this.scroll.current.y;
      const posX = item.x + scrollX + item.extraX + newX;
      const posY = item.y + scrollY + item.extraY + newY;

      const beforeX = posX > this.winW;
      const afterX = posX + item.rect.width < 0;
      if (dirX === 'right' && beforeX) item.extraX -= this.tileSize.w;
      if (dirX === 'left' && afterX) item.extraX += this.tileSize.w;

      const beforeY = posY > this.winH;
      const afterY = posY + item.rect.height < 0;
      if (dirY === 'down' && beforeY) item.extraY -= this.tileSize.h;
      if (dirY === 'up' && afterY) item.extraY += this.tileSize.h;

      const fx = item.x + scrollX + item.extraX + newX;
      const fy = item.y + scrollY + item.extraY + newY;
      item.el.style.transform = `translate(${fx}px, ${fy}px)`;
      item.img.style.transform = `scale(${1.2 + 0.2 * this.mouse.press.c * item.ease}) translate(${-this.mouse.x.c * item.ease * 10}%, ${-this.mouse.y.c * item.ease * 10}%)`;
    });

    this.scroll.last.x = this.scroll.current.x;
    this.scroll.last.y = this.scroll.current.y;

    this._raf = requestAnimationFrame(this.render);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('pointermove', this.onPointerMove);
    this.$container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('feed-modal-open', this.onModalOpen);
    window.removeEventListener('feed-modal-close', this.onModalClose);
    this.observer.disconnect();
  }
}
