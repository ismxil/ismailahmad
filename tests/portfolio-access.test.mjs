import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/case-access.js';
import { portfolioAssetPath } from '../lib/portfolio-assets.js';
import { createSession, cookieName } from '../lib/case-access.js';
const response = () => ({ headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.statusCode=n; return this; }, json(data) { this.data=data; return this; } });
test('PDF access blocks anonymous assets and accepts only the private portfolio code', async t => {
    const old = { ...process.env };
    process.env.SANITY_CASE_READ_TOKEN='test';
    process.env.CASE_ACCESS_SECRET='portfolio-test-secret-at-least-thirty-two-characters';
    t.after(() => { process.env=old; });
    const spy=t.mock.method(globalThis,'fetch',async url => {
        assert.equal(url.searchParams.get('$id'),'"protected.portfolio"');
        assert.match(url.searchParams.get('query'), /protectedPortfolio/);
        return { ok:true, json:async()=>({result:{slug:'portfolio',accessCode:'123456'}}) };
    });
    for (const asset of ['pdf','slides/16.webp','thumbs/01.webp']) {
        const res=response();await handler({method:'GET',query:{slug:'portfolio',asset}},res);
        assert.equal(res.statusCode,401);
    }
    assert.equal(spy.mock.callCount(),0);
    const req=code=>({method:'POST',headers:{origin:'https://pdf.ismailahmad.com'},body:{slug:'portfolio',code}});
    const bad=response();await handler(req('999999'),bad);assert.equal(bad.statusCode,401);
    const good=response();await handler(req('123456'),good);assert.deepEqual(good.data,{unlocked:true});assert.match(good.headers['Set-Cookie'],/HttpOnly/);
    const session=response();await handler({method:'GET',headers:{cookie:`${cookieName('portfolio')}=${createSession('portfolio','123456')}`},query:{slug:'portfolio'}},session);assert.deepEqual(session.data,{unlocked:true});
    const stale=response();await handler({method:'GET',headers:{cookie:`${cookieName('portfolio')}=${createSession('portfolio','654321')}`},query:{slug:'portfolio'}},stale);assert.equal(stale.statusCode,401);
});
test('Protected file selection rejects traversal, unsupported files and nonexistent pages',()=>{
    for(const path of ['../portfolio.pdf','slides/33.webp','slides/00.webp','slides/01.svg','pdf/../pdf','/etc/passwd']) assert.equal(portfolioAssetPath(path),null);
    assert.equal(portfolioAssetPath('slides/32.webp'),'assets/pdf/slides/32.webp');
});
