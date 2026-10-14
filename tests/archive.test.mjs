import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/archive.js';

function response() {
    return { headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.statusCode=code; return this; }, json(data) { this.data=data; return this; } };
}

test('Archive reads published Sanity items newest first without caching deleted content', async t => {
    let queryURL;
    const item={id:'archive-test',client:'Example',category:'Branding',cover:'https://cdn.sanity.io/images/project/dataset/image.png'};
    t.mock.method(globalThis,'fetch',async url=>{queryURL=url;return {ok:true,json:async()=>({result:[item]})};});
    const res=response();await handler({method:'GET'},res);
    assert.deepEqual(res.data.items,[item]);
    assert.equal(queryURL.searchParams.get('perspective'),'published');
    assert(queryURL.searchParams.get('query').includes('drafts.**'));
    assert(queryURL.searchParams.get('query').includes('versions.**'));
    assert(queryURL.searchParams.get('query').includes('order(coalesce(order, -1) asc, _createdAt desc)'));
    assert.equal(res.headers['Cache-Control'],'no-store');
});

test('Deleting all Archive items leaves an empty Archive instead of restoring local content', async t => {
    t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({result:[]})}));
    const res=response();await handler({method:'GET'},res);
    assert.equal(res.statusCode,200);assert.deepEqual(res.data,{items:[]});
});

test('CMS failure does not resurrect deleted items and unsupported methods are rejected', async t => {
    t.mock.method(globalThis,'fetch',async()=>{throw new Error('private detail')});
    const res=response();await handler({method:'GET'},res);
    assert.equal(res.statusCode,502);assert.equal(res.data.items,undefined);
    assert(!res.data.error.includes('private'));
    const bad=response();await handler({method:'POST'},bad);
    assert.equal(bad.statusCode,405);assert.equal(bad.headers.Allow,'GET');
});
