/**
 * Case page — renders one entry from data/cases.js.
 *
 * The slug arrives either as a clean path (/work/lemfi, via the vercel.json
 * rewrite) or as ?case=lemfi, which is what a plain static file server can
 * serve. Both resolve the same way.
 */

import { cases, getCase } from '../../data/cases.js';

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

function figure(src, alt, extraClass = '') {
    return `<figure class="case-figure ${extraClass}">
        <img src="${escape(asset(src))}" alt="${escape(alt)}" loading="lazy" decoding="async" />
    </figure>`;
}

function actions(list) {
    if (!list || !list.length) return '';
    return `<p class="case-actions">${list
        .map((a) => `<a class="chip" href="${escape(a.href)}" target="_blank"
            rel="noopener noreferrer">${escape(a.label)}</a>`)
        .join('')}</p>`;
}

/* ── Block renderers ─────────────────────────────────────── */

const BLOCKS = {
    image: (b) => figure(b.src, b.alt),

    pair: (b) => `<div class="case-pair">${
        (b.images || []).map((im) => figure(im.src, im.alt)).join('')
    }</div>`,

    section: (b) => `<section class="case-block">
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

    results: (b) => `<section class="case-block">
        <h2 class="case-block__title">Results</h2>
        ${b.summary ? `<div class="case-prose">${paragraphs(b.summary)}</div>` : ''}
        <ul class="case-metrics">${
            (b.metrics || []).map((m) => `<li>
                <span class="case-metric__value">${escape(m.value)}</span>
                <span class="case-metric__text">${escape(m.text)}</span>
            </li>`).join('')
        }</ul>
    </section>`,

    overlay: (b) => `<section class="case-block">
        ${figure(b.src, b.alt)}
        ${b.label ? `<h2 class="case-block__title">${escape(b.label)}</h2>` : ''}
        <div class="case-prose">${paragraphs(b.body)}</div>
        ${b.note ? `<p class="case-note">${escape(b.note)}</p>` : ''}
        ${actions(b.actions)}
    </section>`,
};

function renderBlocks(blocks) {
    return (blocks || [])
        .map((b) => (BLOCKS[b.type] ? BLOCKS[b.type](b) : ''))
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

export function renderCase() {
    const mount = document.getElementById('case');
    if (!mount) return;

    const slug = slugFromLocation();
    const item = getCase(slug);

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

    document.title = `${item.name} — Ismail Ahmad`;
    const crumb = document.getElementById('crumb-case');
    if (crumb) crumb.textContent = item.name;

    const next = cases[(cases.indexOf(item) + 1) % cases.length];

    mount.innerHTML = `
        <div class="case-hero">
            <img src="${escape(asset(item.hero))}" alt="${escape(item.name)}" />
        </div>

        <header class="case-intro">
            <h1 class="case-headline">${escape(item.headline)}</h1>
            <div class="case-prose case-lede">${
                item.lede.map((p) => `<p>${escape(p)}</p>`).join('')
            }</div>
        </header>

        <dl class="case-meta">
            ${metaCell('Role', [item.role, item.years])}
            ${metaCell('Scope', item.scope)}
            ${metaCell('Type', item.type)}
            ${metaCell('Industry', item.industry)}
        </dl>

        <div class="case-body">${renderBlocks(item.blocks)}</div>

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

    // Keep clean URLs when they are available, fall back to the query form
    if (window.location.pathname.startsWith('/work/')) {
        const link = mount.querySelector('.case-next a');
        if (link) link.setAttribute('href', `/work/${next.slug}`);
    }
}
