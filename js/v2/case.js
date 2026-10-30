import { withContentTransition } from './page-transition.js';
import { caseSkeleton, watchImageSkeletons } from './skeleton.js';

/**
 * Case page — renders one published case study from Sanity.
 *
 * The slug arrives either as a clean path (/work/lemfi, via the vercel.json
 * rewrite) or as ?case=lemfi, which is what a plain static file server can
 * serve. Both resolve the same way.
 */

import { getCases } from './case-data.js';
import { cadanaHero } from './cadana-hero.js';
import { anchorIds, contentsHTML, trackContents } from './contents.js';
import { openAccessDialog, renderAccessGate } from './case-access.js';
import { initPageSearch } from './page-search.js';
import { cardStudio, initCardStudio } from './card-studio.js';

/**
 * Case data stores repo-relative paths ("assets/..."). This page is served
 * at /work/<slug>, so those would resolve to /work/assets/... and 404 —
 * anchor them at the root instead.
 */
function asset(src) {
    const v = String(src || '');
    if (!v || /^(https?:)?\/\//.test(v) || v.startsWith('/')) return v;
    return `/${v}`;
}

function escape(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

/** Body copy arrives as one string with blank lines between paragraphs. */
function paragraphs(body) {
    return String(body || '')
        .split(/\n\n+/)
        .filter(Boolean)
        .map((p) => `<p>${escape(p)}</p>`)
        .join('');
}

function figure(src, alt, geometry = {}) {
    const ratio = Number(geometry.aspectRatio);
    const fit = ['cover', 'contain', 'fill'].includes(geometry.objectFit) ? geometry.objectFit : 'cover';
    const sizing = Number.isFinite(ratio) && ratio > 0 && ratio <= 10
        ? ` style="aspect-ratio:${ratio};--case-image-fit:${fit}"` : '';
    return `<figure class="case-figure${sizing ? ' case-figure--sized' : ''}"${sizing}>
        <img src="${escape(asset(src))}" alt="${escape(alt)}" loading="lazy" decoding="async" />
    </figure>`;
}

/**
 * Video sections loop muted, like a moving image rather than a player, and
 * only while on screen. Reduced motion leaves them on their first frame.
 */
const still = matchMedia('(prefers-reduced-motion: reduce)');

function videoFigure(b) {
    return `<figure class="case-figure">
        <video src="${escape(asset(b.video))}"${b.src ? ` poster="${escape(asset(b.src))}"` : ''}
            muted loop playsinline disablepictureinpicture preload="metadata"
            ${b.alt ? `aria-label="${escape(b.alt)}"` : 'aria-hidden="true"'}></video>
    </figure>`;
}

function playWhenVisible(mount) {
    const videos = mount.querySelectorAll('.case-hero video, .case-figure video');
    if (!videos.length) return;
    if (!('IntersectionObserver' in window)) {
        if (!still.matches) videos.forEach((v) => v.play().catch(() => {}));
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting && !still.matches) target.play().catch(() => {});
            else target.pause();
        });
    }, { rootMargin: '200px 0px' });
    videos.forEach((v) => observer.observe(v));
}

function actions(list) {
    if (!list || !list.length) return '';
    return `<p class="case-actions">${list
        .map((a) => `<a class="chip" href="${escape(a.href)}" target="_blank"
            rel="noopener noreferrer">${escape(a.label)}</a>`)
        .join('')}</p>`;
}

/* ── Contents ────────────────────────────────────────────── */

/** Results always carry their heading, the other text blocks only when labelled. */
function headingOf(b) {
    if (b.type === 'results') return 'Results';
    return (b.type === 'section' || b.type === 'overlay') ? b.label || '' : '';
}

function assignAnchors(blocks) {
    const headed = (blocks || []).filter(headingOf);
    anchorIds(headed.map(headingOf), ['overview']).forEach((id, i) => { headed[i].anchor = id; });
    return headed;
}

function anchor(b) {
    return b.anchor ? ` id="${escape(b.anchor)}"` : '';
}

/* ── Block renderers ─────────────────────────────────────── */

const BLOCKS = {
    image: (b) => figure(b.src, b.alt, b),

    video: (b) => (b.video ? videoFigure(b) : ''),

    pair: (b) => `<div class="case-pair">${
        (b.images || []).map((im) => (im.video ? videoFigure(im) : figure(im.src, im.alt, im))).join('')
    }</div>`,

    section: (b) => `<section class="case-block"${anchor(b)}>
        ${b.label ? `<h2 class="case-block__title">${escape(b.label)}</h2>` : ''}
        <div class="case-prose">${paragraphs(b.body)}</div>
        ${actions(b.actions)}
    </section>`,

    callout: (b) => `<aside class="case-callout">
        ${b.label ? `<p class="case-callout__label">${escape(b.label)}</p>` : ''}
        <p class="case-callout__body">${escape(b.body)}</p>
    </aside>`,

    quotes: (b) => `<ul class="case-quotes">${
        (b.items || []).map((q) => `<li class="case-quote">
            <blockquote>${escape(q.quote)}</blockquote>
            <div class="case-quote__who">
                ${q.avatar ? `<img src="${escape(asset(q.avatar))}" alt="" aria-hidden="true" loading="lazy" />` : ''}
                <span><strong>${escape(q.name)}</strong>${
                    q.role ? `<span class="case-quote__role">${escape(q.role)}</span>` : ''
                }</span>
            </div>
        </li>`).join('')
    }</ul>`,

    results: (b) => `<section class="case-block"${anchor(b)}>
        <h2 class="case-block__title">Results</h2>
        ${b.summary ? `<div class="case-prose">${paragraphs(b.summary)}</div>` : ''}
        <ul class="case-metrics">${
            (b.metrics || []).map((m) => `<li>
                <span class="case-metric__value">${escape(m.value)}</span>
                <span class="case-metric__text">${escape(m.text)}</span>
            </li>`).join('')
        }</ul>
    </section>`,

    overlay: (b, slug) => `<section class="case-overlay"${anchor(b)}>
        ${figure(b.src, b.alt)}
        <div class="case-overlay__content">
            ${b.label ? `<h2 class="case-overlay__label">${escape(b.label)}</h2>` : ''}
            <div class="case-overlay__body">${paragraphs(b.body)}</div>
            ${b.note ? `<p class="case-overlay__note">${escape(b.note)}</p>` : ''}
            ${actions(b.actions)}
        </div>
    </section>`,
};

function renderBlocks(blocks, slug) {
    return (blocks || [])
        .map((b) => slug === 'sterling' && b._key === 'artwork-12'
            ? cardStudio()
            : (BLOCKS[b.type] ? BLOCKS[b.type](b, slug) : ''))
        .join('');
}

/* ── Meta grid ───────────────────────────────────────────── */

function metaCell(label, value) {
    const lines = Array.isArray(value) ? value : [value];
    if (!lines.filter(Boolean).length) return '';
    return `<div class="case-meta__cell">
        <dt>${escape(label)}</dt>
        ${lines.filter(Boolean).map((l) => `<dd>${escape(l)}</dd>`).join('')}
    </div>`;
}

/* ── Page ────────────────────────────────────────────────── */

function slugFromLocation() {
    const q = new URLSearchParams(window.location.search).get('case');
    if (q) return q;
    const parts = window.location.pathname.replace(/\/+$/, '').split('/');
    const last = parts[parts.length - 1];
    return last && last !== 'case.html' ? last.replace(/\.html$/, '') : '';
}

async function renderContent() {
    const mount = document.getElementById('case');
    if (!mount) return;

    const slug = slugFromLocation();
    mount.innerHTML = caseSkeleton();
    let cases;
    try {
        cases = await getCases();
    } catch {
        document.title = 'Case studies unavailable — Ismail Ahmad';
        mount.innerHTML = '<section class="case-block"><h1 class="case-headline">Could not load this case study.</h1><p class="case-prose">Please refresh to try again.</p><p class="case-actions"><a class="chip" href="/work">Back to work</a></p></section>';
        return;
    }
    let item = cases.find(c => c.slug === slug);

    if (!item) {
        document.title = 'Case not found — Ismail Ahmad';
        mount.innerHTML = `<section class="case-block">
            <h1 class="case-headline">That case isn't here.</h1>
            <div class="case-prose"><p>Try one of these:</p></div>
            <ul class="case-fallback">${cases
                .map((c) => `<li><a class="chip" href="?case=${c.slug}">${escape(c.name)}</a></li>`)
                .join('')}</ul>
        </section>`;
        return;
    }

    mount.dataset.case = item.slug;

    document.title = `${item.name} — Ismail Ahmad`;
    document.querySelector('meta[name="description"]').content = item.headline || item.name;
    const crumb = document.getElementById('crumb-case');
    if (crumb) crumb.textContent = item.name;

    const next = cases[(cases.indexOf(item) + 1) % cases.length];
    if (item.locked) {
        try {
            const response = await fetch(`/api/case-access?slug=${encodeURIComponent(item.slug)}${item.hasPreview ? '&preview=1' : ''}`, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                if (data.case) item = data.case;
                else throw new Error('Missing case');
            } else throw new Error('Locked');
        } catch {
            renderAccessGate(mount, item, content => {
                renderItem(mount, content, next);
                initPageSearch();
                const headline = mount.querySelector('h1');
                headline.tabIndex = -1;
                headline.focus({ preventScroll: true });
            });
            return;
        }
    }
    renderItem(mount, item, next);
}

function renderItem(mount, item, next) {
    const headed = assignAnchors(item.blocks);

    mount.innerHTML = `
        ${contentsHTML({ href: '/work', label: 'Work' }, [
            { id: 'overview', label: 'Overview' },
            ...headed.map((b) => ({ id: b.anchor, label: headingOf(b) })),
            ...(item.preview ? [{ id: 'case-unlock', label: 'Unlock case studies' }] : []),
        ])}

        <div class="case-hero" id="overview">${item.slug === 'cadana'
            ? cadanaHero(escape(item.name))
            : item.heroVideo
            ? `<video src="${escape(asset(item.heroVideo))}"${item.hero ? ` poster="${escape(asset(item.hero))}"` : ''}
                muted loop playsinline disablepictureinpicture preload="auto"
                aria-label="${escape(item.name)}"></video>`
            : `<img src="${escape(asset(item.hero))}" alt="${escape(item.name)}" />`}
        </div>

        <header class="case-intro">
            <h1 class="case-headline">${escape(item.headline)}</h1>
            <div class="case-prose case-lede">${
                (item.lede || []).map((p) => `<p>${escape(p)}</p>`).join('')
            }</div>
        </header>

        <dl class="case-meta">
            ${metaCell('Role', [item.role, item.years])}
            ${metaCell('Scope', item.scope)}
            ${metaCell('Type', item.type)}
            ${metaCell('Industry', item.industry)}
        </dl>

        <div class="case-body">${renderBlocks(item.blocks, item.slug)}${item.preview ? lockedPreview(item) : ''}</div>

        <nav class="case-next">
            <a href="?case=${next.slug}" data-slug="${next.slug}">
                <span class="case-next__label">Next case</span>
                <span class="case-next__name">${escape(next.name)}
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"
                        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M7.25 4.75 11.5 9l-4.25 4.25" />
                    </svg>
                </span>
            </a>
        </nav>`;

    const teaser = mount.querySelector('.case-unlock__preview img');
    teaser?.addEventListener('error', () => { teaser.src = teaser.dataset.fallback; }, { once: true });
    watchImageSkeletons(mount);
    playWhenVisible(mount);
    trackContents(mount);
    initCardStudio(mount);

    mount.querySelector('.case-unlock__button')?.addEventListener('click', () => openAccessDialog(item, content => {
        const firstPrivateBlock = item.blocks.length;
        renderItem(mount, content, next);
        initPageSearch();
        if (location.hash === '#case-unlock') history.replaceState(null, '', location.pathname + location.search);
        const revealed = mount.querySelector('.case-body').children[firstPrivateBlock];
        if (revealed) {
            revealed.tabIndex = -1;
            revealed.focus({ preventScroll: true });
            revealed.scrollIntoView({ block: 'start', behavior: 'instant' });
        }
    }));

    // Keep clean URLs when they are available, fall back to the query form
    if (window.location.pathname.startsWith('/work/')) {
        const link = mount.querySelector('.case-next a');
        if (link) link.setAttribute('href', `/work/${next.slug}`);
    }
}

function lockedPreview(item) {
    // The derivative proxy keeps the original private URL out of the markup.
    const image = [...item.blocks].reverse().flatMap(block => block.src || block.images?.map(image => image.src) || []).find(Boolean) || item.cover;
    return `<section class="case-unlock" id="case-unlock" aria-label="Protected case study content">
        <div class="case-unlock__preview" aria-hidden="true" inert>
            <img src="/api/case-preview?slug=${encodeURIComponent(item.slug)}" data-fallback="${escape(asset(image))}" alt="" loading="lazy" />
            <div class="case-unlock__lines">${'<span></span>'.repeat(5)}</div>
        </div>
        <div class="case-unlock__prompt">
            <img class="case-unlock__mark" src="/assets/icons/lock.svg" width="56" height="56" alt="" />
            <button type="button" class="case-unlock__button" aria-haspopup="dialog">Unlock case studies</button>
        </div>
    </section>`;
}

export function renderCase() {
    return withContentTransition(document.getElementById('case'), renderContent);
}
