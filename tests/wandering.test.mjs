import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/wandering.js';

function response() {
    return { headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.statusCode=code; return this; }, json(data) { this.data=data; return this; } };
}

test('Wandering reads published places in sort order without caching', async t => {
    let queryURL;
    const place={id:'wandering-malta',place:'Malta',photos:[{src:'https://cdn.sanity.io/images/p/d/a-1200x1600.jpg',alt:'Harbour',focus:{x:0.5,y:0.4}}]};
    t.mock.method(globalThis,'fetch',async url=>{queryURL=url;return {ok:true,json:async()=>({result:[place]})};});
    const res=response();await handler({method:'GET'},res);
    assert.deepEqual(res.data.places,[place]);
    assert.equal(queryURL.searchParams.get('perspective'),'published');
    const query=queryURL.searchParams.get('query');
    assert(query.includes('"wanderingPlace"'));
    assert(query.includes('drafts.**'));
    assert(query.includes('versions.**'));
    assert(query.includes('order(coalesce(order'));
    assert.equal(res.headers['Cache-Control'],'no-store');
});

test('No published places is an empty list, and failures stay private', async t => {
    t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({result:[]})}));
    const empty=response();await handler({method:'GET'},empty);
    assert.equal(empty.statusCode,200);assert.deepEqual(empty.data,{places:[]});

    t.mock.method(globalThis,'fetch',async()=>{throw new Error('private detail')});
    const failed=response();await handler({method:'GET'},failed);
    assert.equal(failed.statusCode,502);assert(!failed.data.error.includes('private'));

    const bad=response();await handler({method:'POST'},bad);
    assert.equal(bad.statusCode,405);assert.equal(bad.headers.Allow,'GET');
});
