export function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function safeURL(value) {
    try {
        const url = new URL(value);
        return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
}

export function formatDate(value) {
    return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export async function getPosts(slug) {
    const response = await fetch(`/api/posts${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`);
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || 'The blog is temporarily unavailable.');
        error.status = response.status;
        throw error;
    }
    return slug ? data.post : data.posts;
}
