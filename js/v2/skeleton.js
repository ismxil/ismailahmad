/**
 * Skeletons — the shape of what is coming, held in place while it is fetched.
 *
 * Each one is built from the same classes the real thing uses, so the
 * placeholder occupies the layout the content will occupy and nothing
 * jumps when the two swap. They are inert: aria-hidden, with the mount
 * already marked aria-busy by page-transition.js, so a screen reader is
 * told the region is loading rather than read a wall of empty boxes.
 */

const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

/** A bar standing in for a line of text. */
const line = (width, extra = '') =>
    `<span class="skeleton skeleton__line" style="width:${width};${extra}"></span>`;

/** A bar standing in for a picture, holding the ratio it will arrive at. */
const block = (ratio, extra = '') =>
    `<span class="skeleton skeleton__block" style="aspect-ratio:${ratio};${extra}"></span>`;

/**
 * The work grid on the home and work pages. Four is what the grid holds
 * today; a different count only changes how long the last row sits empty.
 */
export function caseCardsSkeleton(count = 4) {
    return repeat(count, () => `<li aria-hidden="true">
        <span class="case-card skeleton-card">
            <span class="case-card__art skeleton"></span>
            <span class="case-card__text">
                ${line('42%', 'height:17px')}
                ${line('92%', 'height:15px')}
                ${line('64%', 'height:15px')}
                ${line('34%', 'height:14px;margin-top:4px')}
            </span>
        </span>
    </li>`);
}

/**
 * The archive wall. The published set is a mix of landscape, square and
 * portrait, so the placeholders are too — a column of identical boxes
 * reads as a table, and the masonry would reflow the moment the real
 * proportions landed. The cycle is long enough not to read as a pattern.
 */
export function archiveGridSkeleton(count = 12) {
    const ratios = ['4 / 3', '1 / 1', '16 / 10', '3 / 4', '3 / 2', '5 / 4', '2 / 3', '1 / 1'];
    return repeat(count, (i) => `<li aria-hidden="true">
        <span class="archive-tile skeleton-tile">
            <span class="skeleton" style="aspect-ratio:${ratios[i % ratios.length]}"></span>
        </span>
    </li>`);
}

/** The Wandering wall: six plates and the "+N", at the 3:4 they arrive at. */
export function wanderWallSkeleton(count = 7) {
    return repeat(count, () => `<li class="wander-cell" aria-hidden="true">
        <span class="wander-frame skeleton"></span>
    </li>`);
}

/** Books: a cover at 2:3, then a title and an author. */
export function booksSkeleton(count = 4) {
    return repeat(count, () => `<li class="book" aria-hidden="true">
        <span class="book__link skeleton-card">
            <span class="book__cover skeleton"></span>
            <span class="book__text">
                ${line('78%', 'height:16px')}
                ${line('52%', 'height:14px')}
            </span>
        </span>
    </li>`);
}

/** The blog index: a run of entries, each a heading, a line or two, a date. */
export function blogListSkeleton(count = 5) {
    return `<ul class="blog-list" aria-hidden="true">${repeat(count, (i) => `<li>
        <span class="skeleton-post">
            ${line(i % 2 ? '58%' : '74%', 'height:22px')}
            ${line('100%', 'height:17px;margin-top:8px')}
            ${line('86%', 'height:17px')}
            ${line('26%', 'height:15px;margin-top:12px')}
        </span>
    </li>`)}</ul>`;
}

/**
 * An article. The run of lines is deliberately uneven — a paragraph that
 * ends mid-line reads as prose, where a stack of full-width bars reads as
 * a table.
 */
export function articleSkeleton() {
    const para = (widths) => `<span class="skeleton-para">${
        widths.map((w) => line(w, 'height:17px')).join('')
    }</span>`;
    return `<div class="skeleton-prose" aria-hidden="true">
        ${para(['100%', '97%', '100%', '62%'])}
        ${para(['100%', '91%', '48%'])}
        ${block('16 / 10', 'margin-top:24px')}
        ${para(['100%', '95%', '100%', '71%'])}
        ${para(['88%', '100%', '55%'])}
    </div>`;
}

/**
 * A case study: the full-bleed hero, the headline and lede, the meta row,
 * then the alternating figures and prose the body is built from.
 */
export function caseSkeleton() {
    const para = (widths) => `<span class="skeleton-para">${
        widths.map((w) => line(w, 'height:17px')).join('')
    }</span>`;
    return `<div class="skeleton-case" aria-hidden="true">
        <span class="case-hero skeleton skeleton__hero"></span>

        <span class="skeleton-case__intro">
            ${line('86%', 'height:30px')}
            ${line('58%', 'height:30px')}
            <span class="skeleton-para skeleton-case__lede">
                ${line('100%', 'height:17px')}
                ${line('93%', 'height:17px')}
                ${line('44%', 'height:17px')}
            </span>
        </span>

        <span class="skeleton-case__meta">
            ${repeat(4, () => `<span class="skeleton-case__cell">
                ${line('54%', 'height:14px')}
                ${line('78%', 'height:16px;margin-top:6px')}
            </span>`)}
        </span>

        <span class="skeleton-case__body">
            ${para(['100%', '96%', '100%', '67%'])}
            ${block('16 / 9')}
            ${para(['100%', '89%', '52%'])}
            ${block('16 / 9')}
        </span>
    </div>`;
}

/**
 * The article's own heading and byline, so the top of the page is not a
 * literal "Loading article…" sitting over a skeleton body.
 */
export function articleHeadSkeleton() {
    return {
        title: `<span class="skeleton-head" aria-hidden="true">${
            line('88%', 'height:30px')}${line('52%', 'height:30px')}</span>`,
        meta: `<span class="skeleton-head" aria-hidden="true">${
            line('38%', 'height:15px')}</span>`,
    };
}

/** Keep individual image placeholders alive after the content request finishes. */
export function watchImageSkeletons(mount) {
    mount.querySelectorAll('img').forEach(image => {
        if (image.complete && image.naturalWidth > 0) return;
        const frame = image.ownerDocument.createElement('span');
        frame.className = 'image-skeleton skeleton';
        frame.setAttribute('aria-hidden', 'true');
        image.before(frame);
        frame.append(image);
        image.classList.add('image-skeleton__pending');

        const finish = () => {
            image.removeEventListener('load', loaded);
            image.removeEventListener('error', finish);
            image.classList.remove('image-skeleton__pending');
            if (frame.parentNode) frame.replaceWith(image);
        };
        const loaded = async () => {
            try { await image.decode?.(); } catch (_) {}
            finish();
        };
        image.addEventListener('load', loaded, { once: true });
        image.addEventListener('error', finish, { once: true });
        // Handle cached successes and failures that settled before listeners.
        if (image.complete) {
            if (image.naturalWidth > 0) loaded();
            else finish();
        }
    });
}
