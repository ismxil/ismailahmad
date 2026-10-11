import { initDock } from './dock.js';
import { initPageSearch } from './page-search.js';
import { getPosts, escapeHTML, formatDate } from './blog-data.js';
import { renderBody } from '../generated/post-body.js';

initDock();
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
document.getElementById('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
});

const mount = document.getElementById('blog-content');
const isArticle = document.body.dataset.page === 'article';
const slug = isArticle ? decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()) : null;

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
