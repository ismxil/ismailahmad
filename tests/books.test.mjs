import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { parseWidget, widgetHTML, widgetURL } from '../api/books.js';

function response() {
    return { headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.statusCode=code; return this; }, json(data) { this.data=data; return this; } };
}

// The widget as Goodreads sends it: HTML escaped into a string literal.
function widget(books) {
    const html = books.map(({ review, book, title, author, stars = 0, tags = '' }) => `      <div class="gr_custom_each_container_7">
          <div class="gr_custom_book_container_7">
            <a title="${title}" href="https://www.goodreads.com/review/show/${review}"><img alt="${title}" src="https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1440763417l/${book}._SX98_.jpg" /></a>
          </div>
          <div class="gr_custom_rating_7"><span class=" staticStars notranslate">${'<img src="gr_flat_red_star_active.png" />'.repeat(stars)}${'<img src="gr_flat_red_star_inactive.png" />'.repeat(5 - stars)}</span></div>
          <div class="gr_custom_title_7"><a href="https://www.goodreads.com/review/show/${review}">${title}</a></div>
          <div class="gr_custom_author_7">by <a href="/author/show/1">${author}</a></div>
          <div class="gr_custom_tags_7">tagged: ${tags}</div>
      </div>`).join('\n');
    return `  var widget_code = '${html.replace(/\//g, '\\/').replace(/"/g, '\\"').replace(/\n/g, '\\n')}';\n  var widget_div = document.getElementById('gr_custom_widget_7')`;
}

test('A widget book becomes title, author, rating, topics, a large cover and its Goodreads page', () => {
    const [book] = parseWidget(widgetHTML(widget([{ review: 9, book: 40102, title: 'Blink &amp; Think', author: 'Malcolm Gladwell', stars: 4, tags: 'read, philosophy und strategy' }])), 'read');
    assert.deepEqual(book, {
        id: '9', title: 'Blink & Think', author: 'Malcolm Gladwell', shelf: 'read', rating: 4,
        tags: ['philosophy', 'strategy'],
        cover: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1440763417l/40102._SX320_.jpg',
        url: 'https://www.goodreads.com/book/show/40102',
    });
});

test('Each request has its own widget id, renewed hourly, because Goodreads freezes a widget_id', () => {
    const now = Date.UTC(2026, 9, 28, 17);
    const a = widgetURL('read', ['date_added', 'd'], '11', now).searchParams.get('widget_id');
    const b = widgetURL('to-read', ['date_added', 'd'], '31', now).searchParams.get('widget_id');
    const later = widgetURL('read', ['date_added', 'd'], '11', now + 3600000).searchParams.get('widget_id');
    assert.notEqual(a, b);
    assert.notEqual(a, later);
});

test('A shelf past the 100 limit is joined from both ends and by title, without repeats', async t => {
    const span = (from, to) => Array.from({ length: to - from }, (_, i) => ({ review: from + i, book: from + i, title: `T${String(from + i).padStart(3, '0')}`, author: 'A' }));
    const all = span(0, 203); // index 0 newest
    t.mock.method(globalThis, 'fetch', async url => {
        const q = url.searchParams;
        let list = [];
        if (q.get('shelf') === 'to-read') {
            if (q.get('sort') === 'date_added') list = q.get('order') === 'd' ? all.slice(0, 100) : all.slice(103).reverse();
            else list = q.get('order') === 'a' ? all.slice(0, 100) : all.slice(0, 103).reverse().slice(0, 100);
        }
        return { ok: true, text: async () => widget(list) };
    });
    const res = response(); await handler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 200);
    const ids = res.data.books.map(b => b.id);
    const expected = all.map(b => String(b.review));
    // Newest and oldest hundred in order; the few between have no date to sort by.
    assert.deepEqual(ids.slice(0, 100), expected.slice(0, 100));
    assert.deepEqual(ids.slice(103), expected.slice(103));
    assert.deepEqual(ids.slice(100, 103).sort(), expected.slice(100, 103).sort());
    assert.match(res.headers['Cache-Control'], /s-maxage=3600/);
});

test('Failures stay private, and only GET is answered', async t => {
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('private detail'); });
    const failed = response(); await handler({ method: 'GET' }, failed);
    assert.equal(failed.statusCode, 502); assert(!failed.data.error.includes('private'));
    const bad = response(); await handler({ method: 'POST' }, bad);
    assert.equal(bad.statusCode, 405); assert.equal(bad.headers.Allow, 'GET');
});
