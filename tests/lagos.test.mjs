import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../lagos.html',import.meta.url),'utf8');
const script=await readFile(new URL('../js/lagos.js',import.meta.url),'utf8');
function setup(hash=''){
 const dom=new JSDOM(html,{url:'http://localhost/lagos'+hash,runScripts:'outside-only'});
 const {window:w}=dom;
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]??(()=>{})});
 w.HTMLCanvasElement.prototype.getContext=()=>context;
 Object.defineProperty(w.document.getElementById('explorer'),'clientHeight',{value:900});
 w.eval(script);return {w,d:w.document,close:()=>w.close()};
}
test('search selects a landmark, updates its shareable URL, and closes cleanly',()=>{
 const {w,d,close}=setup();const input=d.getElementById('search');input.value='lekki';input.dispatchEvent(new w.Event('input'));
 assert.equal(d.querySelectorAll('#results button').length,1);d.querySelector('#results button').click();
 assert.equal(d.getElementById('place-title').textContent,'Lekki–Ikoyi Bridge');assert.equal(w.location.hash,'#lekki');assert.equal(d.getElementById('place-card').hidden,false);
 d.getElementById('close-place').click();assert.equal(d.getElementById('place-card').hidden,true);assert.equal(w.location.hash,'');close();
});
test('deep links, zoom limits, reset, lighting, and empty search work',()=>{
 const {w,d,close}=setup('#marina');assert.equal(d.getElementById('place-title').textContent,'Marina');
 for(let i=0;i<20;i++)d.getElementById('zoom-in').click();assert.equal(d.getElementById('zoom-level').textContent,'400%');
 d.getElementById('reset').click();assert.equal(d.getElementById('zoom-level').textContent,'100%');
 d.getElementById('night').click();assert.equal(d.getElementById('night').getAttribute('aria-pressed'),'true');assert.ok(d.body.classList.contains('night'));
 d.getElementById('day').click();assert.equal(d.getElementById('day').getAttribute('aria-pressed'),'true');
 const input=d.getElementById('search');input.value='unknown place';input.dispatchEvent(new w.Event('input'));assert.match(d.getElementById('results').textContent,/No places found/);close();
});
test('atlas controls expose places, toggle labels, and collapse the overview',()=>{
 const {d,close}=setup();
 d.getElementById('places-toggle').click();assert.equal(d.getElementById('place-index').hidden,false);
 assert.equal(d.querySelectorAll('#destinations button').length,29);
 d.querySelector('#destinations button').click();assert.equal(d.getElementById('place-index').hidden,true);
 d.getElementById('labels-toggle').click();assert.equal(d.getElementById('labels-toggle').getAttribute('aria-pressed'),'false');
 assert.ok([...d.querySelectorAll('.pin')].every(p=>p.hidden));
 d.getElementById('mini-toggle').click();assert.equal(d.getElementById('minimap').hidden,true);
 assert.equal(d.getElementById('mini-toggle').getAttribute('aria-expanded'),'false');close();
});
test('shared camera URLs restore zoom and lighting',()=>{
 const {d,close}=setup('?x=1000&y=700&z=2.5&night=1');
 assert.equal(d.getElementById('zoom-level').textContent,'250%');
 assert.equal(d.getElementById('night').getAttribute('aria-pressed'),'true');close();
});
test('zooming out reveals the whole cutout and can return to the detailed view',()=>{
 const {d,close}=setup();
 d.getElementById('fit-map').click();
 assert.ok(parseInt(d.getElementById('zoom-level').textContent)<100);
 assert.ok(d.body.classList.contains('map-overview'));
 for(let i=0;i<40;i++)d.getElementById('zoom-out').click();
 const minimum=parseInt(d.getElementById('zoom-level').textContent);
 assert.ok(minimum>0&&minimum<50);
 d.getElementById('zoom-out').click();assert.equal(parseInt(d.getElementById('zoom-level').textContent),minimum);
 d.getElementById('reset').click();assert.equal(d.getElementById('zoom-level').textContent,'100%');
 assert.ok(!d.body.classList.contains('map-overview'));close();
});
test('zoomed-out shared views and resize retain the camera zoom',()=>{
 const {w,d,close}=setup('?x=1000&y=666&z=0.5');
 assert.equal(d.getElementById('zoom-level').textContent,'50%');
 Object.defineProperty(w,'innerWidth',{value:1100,configurable:true});w.dispatchEvent(new w.Event('resize'));
 assert.equal(d.getElementById('zoom-level').textContent,'50%');close();
});
test('mainland districts are searchable and navigation reaches outside the waterfront',()=>{
 const {w,d,close}=setup();const search=d.getElementById('search');
 search.value='Alimosho';search.dispatchEvent(new w.Event('input'));d.querySelector('#results button').click();
 assert.equal(d.getElementById('place-title').textContent,'Alimosho');assert.equal(w.location.hash,'#alimosho');
 assert.equal(d.getElementById('pin-alimosho').hidden,false);
 assert.equal(d.getElementById('zoom-level').textContent,'150%');
 d.getElementById('fit-map').click();assert.ok(parseInt(d.getElementById('zoom-level').textContent)<50);close();
});
test('zooming out stops at 33% and keeps the map centred',()=>{
 const {w,d,close}=setup('?x=-1100&y=-1600&z=0.6');
 for(let i=0;i<20;i++)d.getElementById('zoom-out').click();
 assert.equal(d.getElementById('zoom-level').textContent,'33%');
 // The hand-placed Marina (1030,610) and National Theatre (395,510) pins give the camera's scale and centre.
 const at=id=>{const s=d.getElementById('pin-'+id).style;return [parseFloat(s.left),parseFloat(s.top)]};
 const [mx,my]=at('marina'),[tx]=at('national-theatre'),scale=(mx-tx)/635;
 assert.ok(Math.abs(1030-(mx-w.innerWidth/2)/scale-400)<1);
 assert.ok(Math.abs(610-(my+8*scale-450)/scale-(-1700+3033/2))<1);close();
});
test('places carry real coordinates and open in Apple Maps',()=>{
 const {d,close}=setup('#oshodi');
 assert.equal(d.getElementById('place-title').textContent,'Oshodi');
 assert.match(d.getElementById('apple-maps').href,/^https:\/\/maps\.apple\.com\/\?ll=6\.555,3\.343&q=Oshodi/);
 // Real geography reads correctly on the mainland: Ikeja is east of Agege, Oshodi is north of Mushin.
 const left=id=>parseFloat(d.getElementById('pin-'+id).style.left),top=id=>parseFloat(d.getElementById('pin-'+id).style.top);
 assert.ok(left('ikeja')>left('agege'));assert.ok(top('oshodi')<top('mushin'));close();
});
