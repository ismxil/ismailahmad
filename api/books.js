/**
 * Books — the Goodreads shelves, read live.
 *
 * Goodreads keeps the shelf list behind a sign-in, but the public "custom
 * widget" it offers for blogs carries every shelf: title, author, cover,
 * rating and tags. Two of its quirks shape this file:
 *
 *   - It returns at most 100 books, so a larger shelf is read newest-first
 *     and oldest-first, then A–Z and Z–A for any left in the middle.
 *   - It freezes the first response it gives for a widget_id, whatever is
 *     asked later. Each request gets its own id, renewed every hour, so a
 *     book added on Goodreads appears here within the hour.
 */

export const GOODREADS_USER = '103974207';
const SHELVES = ['currently-reading', 'read', 'to-read', 'did-not-finish'];
const LIMIT = 100;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(text) {
    return String(text)
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
        .replace(/&(\w+);/g, (whole, name) => ENTITIES[name] ?? whole)
        .replace(/\s+/g, ' ')
        .trim();
}

const strip = html => decode(html.replace(/<[^>]*>/g, ' '));

export function widgetURL(shelf, [sort, order], slot, now = Date.now()) {
    const url = new URL(`https://www.goodreads.com/review/custom_widget/${GOODREADS_USER}.books`);
    url.search = new URLSearchParams({
        shelf, sort, order, num_books: String(LIMIT),
        show_title: '1', show_author: '1', show_cover: '1', show_rating: '1', show_tags: '1',
        // Unique per shelf and order, and renewed hourly (see above).
        widget_id: `${slot}${Math.floor(now / 3600000)}`,
    }).toString();
    return url;
}

/** The widget is a script that assigns its HTML to a string literal. */
export function widgetHTML(script) {
    const start = script.indexOf("var widget_code = '");
    if (start < 0) throw new Error('Unexpected widget response');
    const from = start + "var widget_code = '".length;
    const end = script.indexOf("';\n", from);
    return script.slice(from, end < 0 ? undefined : end)
        .replace(/\\n/g, '\n')
        .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\(.)/g, '$1');
}

/** A cover URL ends in a size suffix; swapping it asks for a larger copy. */
function cover(src) {
    if (!src || /nophoto/.test(src)) return null;
    return src.replace(/\._S[XY]\d+_(?=\.\w+$)/, '._SX320_');
}

export function parseWidget(html, shelf) {
    return html.split(/<div class="gr_custom_each_container_\w+">/).slice(1).map(block => {
        const review = /review\/show\/(\d+)/.exec(block)?.[1];
        const img = /<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"/.exec(block);
        const title = strip(/gr_custom_title_\w+">([\s\S]*?)<\/div>/.exec(block)?.[1] || img?.[1] || '');
        const author = strip(/gr_custom_author_\w+">([\s\S]*?)<\/div>/.exec(block)?.[1] || '').replace(/^by\s+/, '');
        // "tagged: a, b and c" — tags have no spaces, so whatever word joins
        // the last two (it follows the visitor's locale) is dropped.
        const tags = strip(/gr_custom_tags_\w+">([\s\S]*?)<\/div>/.exec(block)?.[1] || '')
            .replace(/^tagged:\s*/, '').split(/\s*,\s*/)
            .flatMap(part => { const words = part.split(' '); return words.length > 1 ? [words[0], words.at(-1)].slice(words.length === 2 ? 1 : 0) : words; })
            .filter(Boolean);
        const rating = (/staticStars[\s\S]*?<\/span>/.exec(block)?.[0].match(/star_active/g) || []).length;
        const book = /\/books\/\d+\w\/(\d+)\./.exec(img?.[2] || '')?.[1];
        return {
            id: review || `${shelf}:${title}`,
            title, author, shelf, rating,
            tags: tags.filter(t => t !== shelf),
            cover: cover(img?.[2]),
            url: book ? `https://www.goodreads.com/book/show/${book}`
                : `https://www.goodreads.com/search?q=${encodeURIComponent(`${title} ${author}`)}`,
        };
    }).filter(b => b.title);
}

async function fetchShelf(shelf, sorting, slot) {
    const response = await fetch(widgetURL(shelf, sorting, slot), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ismailahmad.com)' },
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Goodreads ${response.status}`);
    return parseWidget(widgetHTML(await response.text()), shelf);
}

/**
 * Newest first. A full page means the shelf may be longer, so the oldest
 * hundred are read too, and the shelf by title both ways for any that fall
 * between the two. Those few sit in the middle, where they were added.
 */
async function readShelf(shelf, index) {
    const newest = await fetchShelf(shelf, ['date_added', 'd'], `${index}1`);
    if (newest.length < LIMIT) return newest;
    const [oldest, az, za] = await Promise.all([
        fetchShelf(shelf, ['date_added', 'a'], `${index}2`),
        fetchShelf(shelf, ['title', 'a'], `${index}3`),
        fetchShelf(shelf, ['title', 'd'], `${index}4`),
    ]);
    const seen = new Set();
    const fresh = list => list.filter(b => !seen.has(b.id) && seen.add(b.id));
    const head = fresh(newest);
    const tail = fresh(oldest).reverse();
    return [...head, ...fresh([...az, ...za]), ...tail];
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const shelves = await Promise.all(SHELVES.map(readShelf));
        // An hour at the edge, and a stale copy while it refreshes.
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json({ books: shelves.flat(), profile: `https://www.goodreads.com/user/show/${GOODREADS_USER}` });
    } catch {
        return res.status(502).json({ error: 'Books are temporarily unavailable. Please try again.' });
    }
}
