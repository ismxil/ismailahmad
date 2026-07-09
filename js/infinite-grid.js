import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

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

    this.isDisabled = false;

    this.mouse = {
      x: { t: 0.5, c: 0.5 },
      y: { t: 0.5, c: 0.5 },
    };

    this.items = [];
    this.introItems = [];

    this.onResize = this.onResize.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.render = this.render.bind(this);
    this.onModalOpen = () => { this.isDisabled = true; };
    this.onModalClose = () => { this.isDisabled = false; };

    window.addEventListener('resize', this.onResize);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove);
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
    this.introItems = [...this.$container.querySelectorAll('.feed-grid__item-wrapper')].filter((item) => {
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
    if (!this.introItems.length) return;
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
          const el = document.createElement('button');
          el.type = 'button';
          el.classList.add('feed-grid__item');
          el.style.width = `${base.w}px`;
          el.dataset.feedIndex = String(base.feedIndex);
          el.setAttribute('aria-label', 'Open project details');

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

          el.addEventListener('click', (e) => {
            if (this.isDisabled || !this.onItemClick) return;
            e.stopPropagation();
            this.onItemClick(base.feedIndex);
          });

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
    const factor = 0.55;
    this.scroll.target.x -= e.deltaX * factor;
    this.scroll.target.y -= e.deltaY * factor;
  }

  onPointerMove(e) {
    this.mouse.x.t = e.clientX / this.winW;
    this.mouse.y.t = e.clientY / this.winH;
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

    const dirX = this.scroll.current.x > this.scroll.last.x ? 'right' : 'left';
    const dirY = this.scroll.current.y > this.scroll.last.y ? 'down' : 'up';

    this.items.forEach((item) => {
      const newX = 5 * this.scroll.delta.x.c * item.ease + (this.mouse.x.c - 0.5) * item.rect.width * 0.35;
      const newY = 5 * this.scroll.delta.y.c * item.ease + (this.mouse.y.c - 0.5) * item.rect.height * 0.35;
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
      item.img.style.transform = `scale(1.2) translate(${-this.mouse.x.c * item.ease * 8}%, ${-this.mouse.y.c * item.ease * 8}%)`;
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
    window.removeEventListener('feed-modal-open', this.onModalOpen);
    window.removeEventListener('feed-modal-close', this.onModalClose);
    this.observer.disconnect();
  }
}
