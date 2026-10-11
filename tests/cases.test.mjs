import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/cases.js';

const response = () => ({ headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.statusCode=code; return this; }, json(data) { this.data=data; return this; } });

test('Case API uses published content and retains ordered blocks and image URLs', async t => {
    let query;
    const original={slug:'example',name:'Example',blocks:[{type:'section',label:'Problem',body:'Paragraph one\n\nParagraph two',images:null},{type:'pair',images:[{src:'https://cdn.sanity.io/one.png',alt:'One'},{src:'https://cdn.sanity.io/two.png',alt:'Two'}],body:null}]};
    t.mock.method(globalThis,'fetch',async url=>{query=url;return {ok:true,json:async()=>({result:[original]})}});
    const res=response();await handler({method:'GET'},res);
    assert.equal(query.searchParams.get('perspective'),'published');
    assert.match(query.searchParams.get('query'),/drafts\.\*\*/);assert.match(query.searchParams.get('query'),/versions\.\*\*/);
    assert.equal(res.headers['Cache-Control'],'no-store');
    assert.deepEqual(res.data.cases[0].blocks,[{type:'section',label:'Problem',body:'Paragraph one\n\nParagraph two'},{type:'pair',images:original.blocks[1].images}]);
});

test('An empty published collection stays empty, without resurrecting local cases', async t => {
    t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({result:[]})}));
    const res=response();await handler({method:'GET'},res);assert.deepEqual(res.data,{cases:[]});
});

test('A failed CMS returns an error instead of silently substituting stale cases', async t => {
    t.mock.method(globalThis,'fetch',async()=>{throw new Error('private error')});
    const res=response();await handler({method:'GET'},res);assert.equal(res.statusCode,502);assert(!res.data.error.includes('private'));
    const invalid=response();await handler({method:'DELETE'},invalid);assert.equal(invalid.statusCode,405);
});
