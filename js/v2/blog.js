import { articleSignature } from './icons.js';
import { initDock } from './dock.js';
import { initPageSearch } from './page-search.js';
import { getPosts, escapeHTML, formatDate } from './blog-data.js';
import { renderBody } from '../generated/post-body.js';
import { renderSubscribe } from './subscribe.js';

initDock();
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
document.getElementById('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
});

const mount = document.getElementById('blog-content');
const isArticle = document.body.dataset.page === 'article';
const slug = isArticle ? decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()) : null;

/**
 * "Read next": the following article in the published order, wrapping to
 * the newest at the end of the run, the way the case studies do.
 */
async function renderReadNext(post) {
    const mount = document.getElementById('read-next');
    if (!mount) return;
    const posts = await getPosts();
    if (posts.length < 2) return;
    const index = posts.findIndex(item => item.slug === post.slug);
    const next = posts[(index + 1) % posts.length];
    if (!next || next.slug === post.slug) return;
    mount.innerHTML = `<a href="/blog/${encodeURIComponent(next.slug)}">
        <span class="read-next__label">Read next</span>
        <span class="read-next__name">${escapeHTML(next.title)}
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M7.25 4.75 11.5 9l-4.25 4.25" />
            </svg>
        </span>
    </a>`;
}

try {
    if (isArticle) {
        const post = await getPosts(slug);
        const canonical = document.createElement('link');
        canonical.rel = 'canonical';
        canonical.href = `https://www.ismailahmad.com/blog/${encodeURIComponent(post.slug)}`;
        document.head.appendChild(canonical);
        document.title = `${post.title} — Ismail Ahmad`;
        document.querySelector('meta[name="description"]').content = post.excerpt || post.title;
        document.getElementById('page-title').textContent = post.title;
        document.getElementById('post-meta').textContent = `${formatDate(post.publishedAt)} · ${post.author || 'Ismail Ahmad'}`;
        mount.innerHTML = renderBody(post.body || []);
        const signatureTemplate = document.createElement('template');
        signatureTemplate.innerHTML = articleSignature;
        const signature = signatureTemplate.content.firstElementChild;
        mount.after(signature);
        // Draw once as the reader reaches the end, using the same pen stroke
        // and reduced-motion treatment as the signature elsewhere on the site.
        if ('IntersectionObserver' in window) {
            signature.classList.add('post-signature--waiting');
            const observer = new IntersectionObserver(entries => {
                if (!entries.some(entry => entry.isIntersecting)) return;
                signature.classList.remove('post-signature--waiting');
                signature.classList.add('sig--draw');
                observer.disconnect();
            }, { threshold: 0.5 });
            observer.observe(signature);
        } else {
            signature.classList.add('sig--draw');
        }
        renderSubscribe(document.getElementById('subscribe'), `article:${post.slug}`);
        // The list is a second request, so the article is already on screen
        // before this arrives; a failure here must not cost the reader the
        // piece they came for.
        renderReadNext(post).catch(() => {});
    } else {
        const posts = await getPosts();
        mount.innerHTML = posts.length ? `<ul class="blog-list">${posts.map(post => `<li>
            <a href="/blog/${encodeURIComponent(post.slug)}">
                <h2>${escapeHTML(post.title)}</h2>
                ${post.excerpt ? `<p>${escapeHTML(post.excerpt)}</p>` : ''}
                <time datetime="${escapeHTML(post.publishedAt)}">${formatDate(post.publishedAt)}</time>
            </a></li>`).join('')}</ul>` : '<p>No articles published yet.</p>';
        // Index only once the list exists. An article page gets no page
        // search at all — a search field over prose is a distraction.
        initPageSearch();
    }
} catch (error) {
    if (isArticle) document.getElementById('page-title').textContent = error.status === 404 ? 'Article not found' : 'Could not load this article';
    mount.textContent = error.message;
    const retry = document.createElement('button');
    retry.className = 'blog-retry'; retry.textContent = 'Try again';
    retry.addEventListener('click', () => location.reload());
    if (error.status !== 404) mount.append(document.createElement('br'), retry);
}
