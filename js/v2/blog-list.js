/**
 * The blog index: a search field over the list, and a choice of two
 * layouts — the full entries (title, date, excerpt) or a compact table
 * of year, title and day. The layout choice is remembered.
 */
import { escapeHTML } from './blog-data.js';

const VIEW_KEY = 'blog-view';
const VIEWS = ['expanded', 'compact'];

export function readBlogView() {
    try {
        const saved = localStorage.getItem(VIEW_KEY);
        if (VIEWS.includes(saved)) return saved;
    } catch {}
    return 'expanded';
}

function parts(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { year: '', md: '', long: '' };
    const pad = (n) => String(n).padStart(2, '0');
    return {
        year: String(date.getUTCFullYear()),
        md: `${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}`,
        long: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    };
}

const searchIcon = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m13.5 13.5 3.5 3.5" /></svg>`;
const expandedIcon = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" aria-hidden="true"><path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" /></svg>`;
const compactIcon = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" aria-hidden="true"><path d="M3.5 6.5h13M3.5 13.5h7" /></svg>`;

/** Rendered before the posts arrive, so the bar does not jump in later. */
export function blogToolsHTML(view) {
    const button = (name, label, icon) => `<button type="button" class="blog-tools__view"
        data-view="${name}" aria-pressed="${view === name}" aria-label="${label}" title="${label}">${icon}</button>`;
    return `<div class="blog-tools" data-blog-tools>
        <label class="blog-tools__search">
            ${searchIcon}
            <input type="search" placeholder="Search" aria-label="Search writing"
                autocomplete="off" spellcheck="false" enterkeyhint="search" />
        </label>
        <div class="blog-tools__views" role="group" aria-label="Layout">
            ${button('expanded', 'Show excerpts', expandedIcon)}
            ${button('compact', 'Compact list', compactIcon)}
        </div>
    </div>`;
}

export function blogListHTML(posts, base = '') {
    return `<ul class="blog-list" data-view="${readBlogView()}">${posts.map((post) => {
        const date = parts(post.publishedAt);
        const haystack = `${post.title || ''} ${post.excerpt || ''}`.toLowerCase();
        return `<li data-search="${escapeHTML(haystack)}">
            <a href="${base}/${encodeURIComponent(post.slug)}">
                <span class="blog-list__year" aria-hidden="true">${date.year}</span>
                <h2>${escapeHTML(post.title)}</h2>
                <time class="blog-list__date" datetime="${escapeHTML(post.publishedAt)}">${date.long}</time>
                <span class="blog-list__day" aria-hidden="true">${date.md}</span>
                ${post.excerpt ? `<p>${escapeHTML(post.excerpt)}</p>` : ''}
            </a>
        </li>`;
    }).join('')}</ul><p class="blog-empty" role="status" hidden></p>`;
}

export function initBlogTools(mount) {
    const tools = document.querySelector('[data-blog-tools]');
    const list = mount.querySelector('.blog-list');
    if (!tools || !list) return;
    const input = tools.querySelector('input');
    const empty = mount.querySelector('.blog-empty');
    const items = [...list.children];

    function filter() {
        const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let shown = 0;
        items.forEach((item) => {
            const match = terms.every((term) => item.dataset.search.includes(term));
            item.hidden = !match;
            if (match) shown++;
        });
        empty.hidden = shown > 0;
        empty.textContent = shown ? '' : `Nothing matches “${input.value.trim()}”.`;
    }
    input.addEventListener('input', filter);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            input.value = '';
            filter();
            input.blur();
        } else if (e.key === 'Enter') {
            const first = items.find((item) => !item.hidden)?.querySelector('a');
            if (first) first.click();
        }
    });

    tools.querySelectorAll('[data-view]').forEach((button) => {
        button.addEventListener('click', () => {
            const view = button.dataset.view;
            list.dataset.view = view;
            tools.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
            try { localStorage.setItem(VIEW_KEY, view); } catch {}
        });
    });

    // "/" jumps to the field, the way it opened page search before
    document.addEventListener('keydown', (e) => {
        const editing = e.target instanceof Element && (e.target.isContentEditable ||
            e.target.closest('input, textarea, select, [contenteditable], [role="textbox"]'));
        if (e.key !== '/' || editing || e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        input.focus();
    });
}
