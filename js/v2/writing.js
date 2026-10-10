import { getPosts, escapeHTML } from './blog-data.js';

export async function renderWriting(mount) {
    if (!mount) return;
    mount.innerHTML = '<li role="status">Loading writing…</li>';
    try {
        const posts = await getPosts();
        mount.innerHTML = posts.slice(0, 4).map(post => `<li>
            <a class="lede" href="/writing/${encodeURIComponent(post.slug)}">
                <span class="lede__title">${escapeHTML(post.title)}</span>
                <span class="lede__rule" aria-hidden="true"></span>
                <time class="lede__date" datetime="${escapeHTML(post.publishedAt)}">${new Date(post.publishedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</time>
            </a></li>`).join('') || '<li>No articles published yet.</li>';
        const count = document.querySelector('[data-count="writing"]');
        if (count) count.textContent = String(posts.length);
    } catch {
        mount.innerHTML = '<li>Writing is temporarily unavailable. <a href="/writing">Try the writing page</a>.</li>';
    }
}
