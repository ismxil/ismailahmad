import './style.css'

import 'inter-ui/inter-variable-latin.css'
import { createElement, ArrowUpRight, Blend, Check, ChevronDown, ChevronLeft, CircleHelp, Code, Copy, Cpu, Dices, Download, Ellipsis, Eye, FlipHorizontal2, Image, Info, Keyboard, Layers, LayoutGrid, LockKeyhole, Maximize, Pause, Play, Plus, Redo2, RotateCcw, SkipBack, SlidersHorizontal, Sparkles, Sun, Undo2, Waves, X, Trash2, type IconNode } from 'lucide'
const iconNodes:Record<string,IconNode>={chevron:ChevronDown,left:ChevronLeft,plus:Plus,grid:LayoutGrid,layers:Layers,sliders:SlidersHorizontal,undo:Undo2,redo:Redo2,download:Download,arrow:ArrowUpRight,play:Play,pause:Pause,reset:RotateCcw,flip:FlipHorizontal2,expand:Maximize,check:Check,eye:Eye,info:Info,sun:Sun,copy:Copy,dots:Ellipsis,sparkle:Sparkles,help:CircleHelp,lock:LockKeyhole,chip:Cpu,wave:Waves,keyboard:Keyboard,shuffle:Dices,code:Code,back:SkipBack,grain:Blend,image:Image,close:X,trash:Trash2}
const icon=(name:string, cls='')=>createElement(iconNodes[name]||Layers,{class:'icon '+cls,'stroke-width':1.5,'aria-hidden':'true'}).outerHTML
import { tiers, accounts, CARD, tierDefaults, normalizeCard, networksFor, securityMarksFor, paletteFor, cardMarkup, guideMarkup, exportCard, type CardState } from './cards'
import { kidsLooks, drawKidsArt, shapeKinds, type KidsShape, type ShapeKind } from './kids-art'
type State = CardState
let selectedKidsShape:string|null=null
let showGuides = localStorage.getItem('sterling-guides') !== 'hidden'
let collectionFilter = 'All cards'
const initial:State={tier:0,color:tiers[0].color,pattern:'Silk',flow:65,scale:45,grain:18,speed:35,finish:'Satin',name:'NKENNA LOBALOBA',currency:'NGN',network:'Verve',type:'Debit',logoMode:'Auto',kidsShapes:[],kidsNickname:'',chipStyle:'Standard silver',securityMark:'Silver foil',chip:true,contactless:true,branding:true,back:false}
let state:State={...initial};try {const stored=JSON.parse(localStorage.getItem('sterling-studio')||'{}');state={...initial,...tierDefaults(tiers[stored.tier]?stored.tier:0),...stored}}catch{}
state=normalizeCard(state)
let history:State[]=[];let future:State[]=[]; let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;let time=0;let last=performance.now();let zoom=100;let activeTab='Design';let toastTimer:number;
const app=document.querySelector<HTMLDivElement>('#app')!
app.innerHTML=`
<canvas id="ambient" aria-hidden="true"></canvas>
<header class="topbar"><a class="brand island" href="./" aria-label="Sterling Card Studio">${icon('layers')}<span>Card studio</span><span class="brand-divider"></span><strong id="current-title">Classic</strong>${icon('chevron')}</a><div class="toolbar-center island"><button class="text-button" id="randomise" title="Randomise surface (R)">${icon('shuffle')} Randomise</button><button class="icon-button" id="copy-settings" title="Copy design settings">${icon('code')}</button></div><div class="top-actions"><div class="toolbar-actions island"><button class="icon-button" id="settings-info" title="Studio settings">${icon('sliders')}</button><button class="icon-button" id="undo" title="Undo (⌘Z)">${icon('undo')}</button><button class="icon-button" id="redo" title="Redo (⌘⇧Z)">${icon('redo')}</button><button class="icon-button" id="preview" title="Preview card">${icon('eye')}</button></div><button class="button primary" id="export">${icon('download')} Export</button></div></header>
<div class="workspace"><aside class="collection island"><div class="panel-title">Layers <button class="icon-button" id="add" title="Save a variation">${icon('plus')}</button></div><div id="effect-stack"></div><section class="looks-section"><div class="section-bar"><button id="looks-toggle">Looks ${icon('chevron')}</button><button class="icon-button" id="new-card" title="Save this look">${icon('plus')}</button></div><div class="preset-grid" id="presets"></div></section><section class="collection-section"><div class="section-bar"><span>Collection</span><span class="collection-count">8 cards</span></div><div class="collection-tabs"><button class="active" data-filter="All cards">Portfolio</button><button data-filter="Saved">Saved <span id="saved-count">0</span></button></div><div id="account-tabs" class="account-tabs" role="group" aria-label="Account category"></div><div id="tier-list"></div></section></aside>
<main class="main"><section class="stage"><div class="card-scene"><div class="artboard-label"><span id="card-caption">Classic</span><span>85.60 × 53.98 mm</span></div><div id="card" class="bank-card"><canvas id="surface" width="1712" height="1080"></canvas><canvas id="kids-art" width="1712" height="1080" aria-hidden="true"></canvas><div id="shape-selection" aria-hidden="true"></div><div class="card-content" id="card-content"></div><div id="layout-guides" aria-hidden="true"></div></div><div class="card-shadow"></div><div class="artboard-meta"><span id="finish-caption">Satin finish</span><span>CR80</span></div></div><div class="canvas-bottom"><button class="guide-button island" id="guides-button" aria-label="Toggle layout guides" aria-pressed="${showGuides}" title="Toggle layout guides (G)">${icon('grid')} Guides <kbd>G</kbd></button><div class="view-switch island"><button class="active" data-side="front">Front</button><button data-side="back">Back</button><span></span><button id="flip" title="Flip card">${icon('flip')}</button></div><div class="zoom-tools island"><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom" title="Reset zoom">100%</button><button id="zoom-in" aria-label="Zoom in">+</button><button id="fullscreen" title="Focus canvas">${icon('expand')}</button></div></div></section></main>
<aside class="inspector island"><div class="panel-title"><span id="inspector-title">Surface</span><button class="icon-button" id="reset" title="Reset design">${icon('reset')}</button></div><div class="inspector-tabs"><button class="active" data-tab="Design">Surface</button><button data-tab="Details">Card details</button></div><div id="inspector-content"></div></aside></div>
<div class="transport island"><button class="icon-button" id="transport-play" title="Play / pause (Space)">${icon(playing?'pause':'play')}</button><button class="icon-button" id="transport-restart" title="Restart loop">${icon('back')}</button><span class="timecode"><strong id="time-display">0.00s</strong><span> / 10.00s</span></span><input id="playhead" type="range" min="0" max="10" step="0.01" value="0" aria-label="Animation playhead"/><select id="transport-speed" aria-label="Playback speed"><option value="17.5">0.5×</option><option value="35" selected>1×</option><option value="70">2×</option></select><span class="transport-divider"></span><span class="fps">60 fps</span><button class="text-button" id="quality" title="Toggle preview quality">${icon('sliders')} Auto</button></div>
<div class="corner-status"><span class="status-dot"></span><span id="save-status">Saved locally</span><button id="shortcuts" title="Keyboard shortcuts">${icon('keyboard')}</button></div>
<div id="toast" role="status"></div><dialog id="export-dialog"><div class="modal-heading"><div><h2>Export card</h2><p>Render your current card at full resolution.</p></div><button class="icon-button" id="close-modal" aria-label="Close">${icon('close')}</button></div><label class="field-label">Format<select id="export-format"><option value="png">PNG image · 1712 × 1080</option><option value="pdf">PDF templates · front, back &amp; guides</option><option value="json">Design settings · JSON</option></select></label><div class="export-summary">${icon('layers')} <span id="export-summary"></span></div><p class="export-note" id="export-note" hidden></p><button class="button primary" id="download">${icon('download')} Download</button></dialog>`

const canvas=document.querySelector<HTMLCanvasElement>('#surface')!;const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false})
let program:WebGLProgram|null=null;let frameCount=0;let fpsStart=performance.now();let liveFps=60
if(gl){const vert=gl.createShader(gl.VERTEX_SHADER)!;gl.shaderSource(vert,'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}');gl.compileShader(vert);const frag=gl.createShader(gl.FRAGMENT_SHADER)!;gl.shaderSource(frag,`
precision highp float;
uniform vec2 resolution;uniform vec3 color;uniform float time,flow,scale,grain,pattern,finish;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 uv=gl_FragCoord.xy/resolution;vec2 p=(uv-.5)*vec2(1.585,1.);float t=time*.12;
float f=flow*.012;float z=scale*.035+.7;float w=p.y+.28*sin(p.x*2.8+t)+.12*sin(p.x*5.3-t*.6);float k=0.;
if(pattern<.5){k=sin((w+sin(p.x*1.9+w*2.+t)*f*.26)*z*9.);}
else if(pattern<1.5){k=sin((length(p+vec2(.4,-.3))+.07*sin(atan(p.y,p.x)*5.+t))*z*21.);}
else if(pattern<2.5){k=sin((p.y*.7+p.x*.5+sin(p.x*3.+t)*f*.2)*z*12.);}
else if(pattern<3.5){k=sin((w+.16*sin(p.y*4.+p.x*2.+t))*z*30.);}
else{k=0.;}
float ridge=pow(.5+.5*k,5.);float shade=.78+.19*k+.18*ridge;shade+=.12*sin(p.x*2.-p.y*3.);vec3 c=color*shade;
c+=vec3(.12,.045,.035)*ridge*(.20+finish*.12);float light=pow(max(0.,1.-length((uv-vec2(.22,.85))*vec2(.8,1.2))),3.);c+=light*color*.33;
if(pattern>3.5)c=color;
c+=(hash(gl_FragCoord.xy+mod(time,100.))-.5)*grain*.0018;gl_FragColor=vec4(c,1.);}`);gl.compileShader(frag);program=gl.createProgram()!;gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))console.error(gl.getProgramInfoLog(program));gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0)}
const patterns=['Silk','Ripple','Aurora','Contour','Pure']
function renderSurface(){if(!gl||!program){canvas.style.background=state.color;return}gl.useProgram(program);gl.viewport(0,0,canvas.width,canvas.height);const u=(n:string)=>gl.getUniformLocation(program!,n);const hex=state.color.replace('#','');gl.uniform3f(u('color'),parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255);gl.uniform2f(u('resolution'),canvas.width,canvas.height);for(const [k,v] of Object.entries({time,flow:state.flow,scale:state.scale,grain:state.grain,pattern:patterns.indexOf(state.pattern),finish:['Matte','Satin','Gloss'].indexOf(state.finish)}))gl.uniform1f(u(k),v);gl.drawArrays(gl.TRIANGLES,0,6)}
const ambient=document.querySelector<HTMLCanvasElement>('#ambient')!;const ambientCtx=ambient.getContext('2d')!;function sizeAmbient(){ambient.width=Math.min(innerWidth,1600);ambient.height=Math.min(innerHeight,1000)}sizeAmbient();window.addEventListener('resize',sizeAmbient);
let embedVisible = true
window.addEventListener('message', event => {
 if (event.origin === location.origin && event.source === parent && event.data?.type === 'card-studio-visibility') embedVisible = Boolean(event.data.visible)
})
function tick(now:number){if(!embedVisible||document.hidden){last=now;requestAnimationFrame(tick);return}frameCount++;if(now-fpsStart>1000){liveFps=Math.round(frameCount*1000/(now-fpsStart));frameCount=0;fpsStart=now;document.querySelector('.fps')!.textContent=playing?liveFps+' fps':'idle'}if(playing)time+=Math.min(now-last,40)*.001*state.speed/35;last=now;renderSurface();ambientCtx.drawImage(canvas,0,0,ambient.width,ambient.height);const playhead=document.querySelector<HTMLInputElement>('#playhead')!;if(document.activeElement!==playhead)playhead.value=String(time%10);requestAnimationFrame(tick)}requestAnimationFrame(tick)
function toast(message:string){const e=document.querySelector('#toast')!;e.textContent=message;e.classList.add('visible');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>e.classList.remove('visible'),3000)}
function commit(change:Partial<State>){history.push({...state});future=[];state=normalizeCard({...state,...change});save();refresh()}
function save(){localStorage.setItem('sterling-studio',JSON.stringify(state))}
function refresh(){document.body.classList.toggle('kids-mode',isKids());document.querySelector<HTMLElement>('.transport')!.hidden=isKids();document.querySelector('#randomise')!.innerHTML=icon('shuffle')+(isKids()?'Shuffle shapes':'Randomise');renderCollection();renderCard();renderInspector();renderPresets();renderLayers();document.querySelector('#current-title')!.textContent=tiers[state.tier].name;document.querySelector('#card-caption')!.textContent=tiers[state.tier].name;document.querySelector('#finish-caption')!.textContent=state.finish+' finish';document.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(b=>b.classList.toggle('active',(b.dataset.side==='back')===state.back));document.querySelector<HTMLButtonElement>('#undo')!.disabled=history.length===0;document.querySelector<HTMLButtonElement>('#redo')!.disabled=future.length===0;renderSurface()}
// Swap artwork while the card is edge-on; keep the shader and the rest of the UI intact.
let flipping=false
let flipTarget=state.back
async function flipCard(back:boolean){
 flipTarget=back
 if(flipping||back===state.back)return
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){commit({back});return}
 flipping=true
 const card=document.querySelector<HTMLElement>('#card')!
 const direction=back?-1:1
 let animation:Animation|undefined
 try{
  animation=card.animate([
   {transform:'perspective(1200px) rotateY(0deg)'},
   {transform:`perspective(1200px) rotateY(${direction*90}deg)`}
  ],{duration:210,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'})
  await animation.finished
  if(flipTarget!==state.back)commit({back:flipTarget})
  const outgoing=animation
  animation=card.animate([
   {transform:`perspective(1200px) rotateY(${-direction*90}deg)`},
   {transform:'perspective(1200px) rotateY(0deg)'}
  ],{duration:210,easing:'cubic-bezier(0,0,.2,1)',fill:'forwards'})
  outgoing.cancel()
  await animation.finished
 }finally{
  animation?.cancel()
  flipping=false
 }
 if(flipTarget!==state.back)void flipCard(flipTarget)
}
function selectTier(index:number){commit(tierDefaults(index))}
function renderCollection(){
 const category=tiers[state.tier].category;
 document.querySelector('#account-tabs')!.innerHTML=accounts.map(a=>`<button data-account="${a}" class="${category===a?'active':''}" aria-pressed="${category===a}">${a}</button>`).join('');
 document.querySelectorAll<HTMLButtonElement>('[data-account]').forEach(b=>b.onclick=()=>{collectionFilter='All cards';selectTier(tiers.findIndex(t=>t.category===b.dataset.account))});
 document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.getAttribute('data-filter')===collectionFilter));
 document.querySelector('#saved-count')!.textContent=String(saved.filter(s=>tiers[s.tier].category===category).length);
 document.querySelector('.collection-count')!.textContent=`${tiers.filter(t=>t.category===category).length} ${category==='Business'?'card':'cards'}`;
 const list=document.querySelector('#tier-list')!;
 if(collectionFilter==='Saved'){
  const items=saved.map((s,i)=>({s,i})).filter(({s})=>tiers[s.tier].category===category);
  list.innerHTML=items.length?items.map(({s,i})=>`<button class="saved-item" data-saved="${i}"><span class="saved-swatch" style="background:${s.color}"></span><span><strong>${tiers[s.tier].name} / ${s.pattern}</strong><small>${s.finish} · ${category}</small></span>${icon('left')}</button>`).join(''):`<div class="empty-state">${icon('layers')}<strong>No saved ${category.toLowerCase()} cards.</strong><p>Use + to save your current design.</p></div>`;
  document.querySelectorAll<HTMLButtonElement>('[data-saved]').forEach(b=>b.onclick=()=>{commit(normalizeCard(saved[Number(b.dataset.saved)]));toast('Saved variation loaded')});return
 }
 list.innerHTML=tiers.map((t,i)=>t.category!==category?'':`<button class="tier-item ${state.tier===i?'selected':''}" data-tier="${i}"><span class="tier-dot" style="background:${t.color}"></span><strong>${t.name}</strong><span>${t.category==='Kids'?'Prepaid':i===0?'Classic':i===4?'Commercial':'Premium'}</span></button>`).join('');
 document.querySelectorAll<HTMLButtonElement>('[data-tier]').forEach(b=>b.onclick=()=>selectTier(Number(b.dataset.tier)))
}
const collapsedSections=new Set<string>();let selectedLayer='surface';let previousGrain=18;let previousFlow=65;
function renderLayers(){if(isKids()){renderKidsLayers();return}const rows=[{id:'grain',name:'Grain',blend:'Overlay',value:state.grain+'%',enabled:state.grain>0,icon:'grain'},{id:'flow',name:'Flow warp',blend:'Distort',value:state.flow+'%',enabled:state.flow>0,icon:'wave'},{id:'surface',name:state.pattern+' surface',blend:'Normal',value:'100%',enabled:true,icon:'image'},{id:'branding',name:'Card identity',blend:'Normal',value:'100%',enabled:state.branding,icon:'layers'}];document.querySelector('#effect-stack')!.innerHTML=rows.map(r=>`<div class="effect-row ${selectedLayer===r.id?'selected':''}"><button class="layer-select" data-layer="${r.id}">${icon(r.icon)}<span>${r.name}</span></button><span class="blend-mode">${r.blend}</span><span class="layer-opacity">${r.value}</span><button class="icon-button ${r.enabled?'':'muted'}" data-layer-toggle="${r.id}" title="Toggle ${r.name}" aria-label="Toggle ${r.name}" aria-pressed="${r.enabled}">${icon('eye')}</button></div>`).join('');document.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(b=>b.onclick=()=>{selectedLayer=b.dataset.layer!;activeTab=selectedLayer==='branding'?'Details':'Design';syncTabs();renderInspector();renderLayers();const el=document.getElementById(selectedLayer);if(el)el.focus()});document.querySelectorAll<HTMLButtonElement>('[data-layer-toggle]').forEach(b=>b.onclick=()=>{const k=b.dataset.layerToggle;if(k==='grain'){if(state.grain)previousGrain=state.grain;commit({grain:state.grain?0:previousGrain})}else if(k==='flow'){if(state.flow)previousFlow=state.flow;commit({flow:state.flow?0:previousFlow})}else if(k==='branding')commit({branding:!state.branding});else toast('The surface is the base of your card')})}
function syncTabs(){document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.getAttribute('data-tab')===activeTab));document.querySelector('#inspector-title')!.textContent=activeTab==='Design'?(isKids()?'Kids design':'Surface'):'Card details'}
function renderCard(){
 const card=document.querySelector<HTMLElement>('#card')!;
 card.classList.toggle('is-back',state.back);
 document.querySelector('#card-content')!.innerHTML=cardMarkup(state);renderKidsCanvas();
 const guides=document.querySelector<HTMLElement>('#layout-guides')!;
 guides.classList.toggle('visible',showGuides);
 guides.innerHTML=guideMarkup(state);
 const button=document.querySelector('#guides-button')!;button.setAttribute('aria-pressed',String(showGuides));button.setAttribute('title',(showGuides?'Hide':'Show')+' layout guides (G)');
}
function escapeHtml(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
const select=(id:string,values:string[],value:string)=>`<select id="${id}">${values.map(x=>`<option ${x===value?'selected':''}>${x}</option>`).join('')}</select>`
function range(id:string,label:string,value:number,max=100){return `<label class="range-label" for="${id}"><span>${label}</span><span class="range-value" id="${id}-value">${value}<small>${id==='speed'?'%':''}</small></span></label><input id="${id}" type="range" min="0" max="${max}" value="${value}" style="--range:${value/max*100}%"/>`}
function isKids(){return tiers[state.tier].category==='Kids'}
function selectedShape(){return state.kidsShapes.find(s=>s.id===selectedKidsShape)}
function logoControl(){return `<label class="field-label inline-field">${state.network==='Verve'?'Verve logo':'Logo mode'}${select('logo-mode',['Auto','Light','Dark'],state.logoMode)}</label>`}
function renderKidsCanvas(){
 const art=document.querySelector<HTMLCanvasElement>('#kids-art')!,ctx=art.getContext('2d')!;ctx.clearRect(0,0,art.width,art.height)
 if(isKids()){drawKidsArt(ctx,state,art.width,art.height);document.querySelector('#card-content')!.innerHTML=cardMarkup(state)}
 const outline=document.querySelector<HTMLElement>('#shape-selection')!,shape=selectedShape();outline.hidden=!isKids()||state.back||!shape||!shape.visible
 if(shape){const h=shape.size*85.6/53.98;outline.style.cssText=`left:${shape.x-shape.size/2}%;top:${shape.y-h/2}%;width:${shape.size}%;height:${h}%;transform:rotate(${shape.rotation}deg)`}
}
function renderKidsLayers(){
 document.querySelector('#effect-stack')!.innerHTML=state.kidsShapes.map(s=>`<div class="effect-row ${s.id===selectedKidsShape?'selected':''}"><button class="layer-select" data-select-shape="${s.id}">${icon('grid')}<span>${s.kind}</span></button><span class="blend-mode">Shape</span><button class="icon-button ${s.visible?'':'muted'}" data-visibility-shape="${s.id}" aria-label="Toggle ${s.kind}">${icon('eye')}</button></div>`).join('')+`<div class="effect-row"><span class="layer-select">${icon('image')}<span>Flat color</span></span><span class="blend-mode">Solid</span></div><div class="effect-row"><button class="layer-select" id="kids-identity">${icon('layers')}<span>Card identity</span></button><span class="blend-mode">Brand</span></div>`
 bindShapeRows();on('kids-identity',()=>{activeTab='Details';syncTabs();renderInspector()})
}
function kidsInspectorMarkup(){
 const shape=selectedShape()
 return `<section class="inspector-section"><div class="section-title">Flat color ${icon('chevron')}</div><label class="color-field"><span>Base color</span><span class="color-well"><input id="custom-color" type="color" value="${state.color}" aria-label="Custom base color"/><span>${state.color.slice(1).toUpperCase()}</span></span></label><div class="color-palette">${paletteFor(state.tier).map(c=>`<button class="color-swatch ${state.color===c?'active':''}" style="--swatch:${c}" data-color="${c}" title="Use ${c}">${state.color===c?icon('check'):''}</button>`).join('')}</div><label class="field-label inline-field kids-finish">Finish${select('finish-select',['Matte','Satin','Gloss'],state.finish)}</label></section><section class="inspector-section"><div class="section-title">Card identity ${icon('chevron')}</div>${logoControl()}<label class="field-label">Nickname on front<input id="kids-nickname" maxlength="20" value="${escapeHtml(state.kidsNickname)}" placeholder="PREPAID"/></label><label class="field-label inline-field">Network${select('network',networksFor(state.tier),state.network)}</label></section><section class="inspector-section"><div class="section-title">Shapes <span class="shape-count">${state.kidsShapes.length} / 16</span></div><div class="shape-add-row">${select('add-shape-kind',[...shapeKinds],'Burst')}<button class="button" id="add-shape" title="Add shape">${icon('plus')} Add</button></div><div class="shape-list">${state.kidsShapes.length?state.kidsShapes.map(s=>`<div class="shape-row ${s.id===selectedKidsShape?'selected':''}"><button class="shape-row-select" data-select-shape="${s.id}"><span class="shape-color-dot" style="background:${s.color}"></span>${s.kind}</button><button class="icon-button" data-remove-shape="${s.id}" aria-label="Remove ${s.kind}">${icon('trash')}</button></div>`).join(''):'<p class="shape-empty">Add a shape, or start with a playful look.</p>'}</div><p class="shape-hint">Drag shapes on the front to move them.</p></section>${shape?`<section class="inspector-section"><div class="section-title">${shape.kind} ${icon('chevron')}</div><label class="color-field"><span>Shape color</span><span class="color-well"><input id="shape-color" type="color" value="${shape.color}" aria-label="Shape color"/><span>${shape.color.slice(1).toUpperCase()}</span></span></label>${range('shape-x','Horizontal',Math.round(shape.x))}${range('shape-y','Vertical',Math.round(shape.y))}${range('shape-size','Size',Math.round(shape.size))}${range('shape-rotation','Rotation',Math.round(shape.rotation),360)}<button class="button shape-forward" id="shape-forward">Bring to front</button></section>`:''}<section class="inspector-section"><div class="section-title">Document ${icon('chevron')}</div><label class="field-label inline-field">Account${select('account-select',accounts,'Kids')}</label><label class="field-label inline-field">Card tier${select('tier-select',tiers.filter(t=>t.category==='Kids').map(t=>t.name),tiers[state.tier].name)}</label></section>`
}
function bindShapeRows(){
 document.querySelectorAll<HTMLButtonElement>('[data-select-shape]').forEach(b=>b.onclick=()=>{selectedKidsShape=b.dataset.selectShape!;activeTab='Design';syncTabs();renderInspector();renderLayers();renderKidsCanvas()})
 document.querySelectorAll<HTMLButtonElement>('[data-remove-shape]').forEach(b=>b.onclick=()=>{commit({kidsShapes:state.kidsShapes.filter(s=>s.id!==b.dataset.removeShape)});if(selectedKidsShape===b.dataset.removeShape){selectedKidsShape=null;renderInspector()}})
 document.querySelectorAll<HTMLButtonElement>('[data-visibility-shape]').forEach(b=>b.onclick=()=>commit({kidsShapes:state.kidsShapes.map(s=>s.id===b.dataset.visibilityShape?{...s,visible:!s.visible}:s)}))
}
function bindKidsControls(){
 if(!isKids())return
 bindShapeRows()
 const nickname=document.querySelector<HTMLInputElement>('#kids-nickname');if(nickname)nickname.onchange=()=>commit({kidsNickname:nickname.value})
 on('add-shape',()=>{
  if(state.kidsShapes.length>=16){toast('You can add up to 16 shapes');return}
  const kind=document.querySelector<HTMLSelectElement>('#add-shape-kind')!.value as ShapeKind
  const shape:KidsShape={id:crypto.randomUUID(),kind,x:50,y:65,size:25,rotation:0,color:'#7b4ff4',visible:true};selectedKidsShape=shape.id
  commit({kidsShapes:[...state.kidsShapes,shape]});if(state.back)void flipCard(false)
 })
 const color=document.querySelector<HTMLInputElement>('#shape-color');if(color)color.onchange=()=>commit({kidsShapes:state.kidsShapes.map(s=>s.id===selectedKidsShape?{...s,color:color.value}:s)})
 for(const [id,key,max] of [['shape-x','x',100],['shape-y','y',100],['shape-size','size',100],['shape-rotation','rotation',360]] as const){
  const el=document.querySelector<HTMLInputElement>('#'+id);if(!el)continue
  const remember=()=>{history.push({...state});future=[]};el.onpointerdown=remember;el.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))remember()}
  el.oninput=()=>{const value=key==='size'?Math.max(5,Number(el.value)):Number(el.value);state={...state,kidsShapes:state.kidsShapes.map(s=>s.id===selectedKidsShape?{...s,[key]:value}:s)};document.querySelector('#'+id+'-value')!.textContent=String(value);el.style.setProperty('--range',value/max*100+'%');save();renderKidsCanvas();document.querySelector<HTMLButtonElement>('#undo')!.disabled=false}
 }
 on('shape-forward',()=>{const shape=selectedShape();if(shape)commit({kidsShapes:[...state.kidsShapes.filter(s=>s.id!==shape.id),shape]})})
}
function applyKidsLook(index:number){const look=kidsLooks[index];selectedKidsShape=null;commit({tier:look.tier,color:look.color,pattern:'Pure',grain:0,kidsShapes:look.shapes.map(s=>({...s})),kidsNickname:look.shapes.length?state.kidsNickname||'NICKNAME':state.kidsNickname,chipStyle:'Standard silver'});if(state.back)void flipCard(false)}
function renderKidsPresets(){
 const tiny=document.createElement('canvas');tiny.width=200;tiny.height=126;const ctx=tiny.getContext('2d')!
 document.querySelector('#presets')!.innerHTML=kidsLooks.map((look,index)=>{
  const key='kids:'+look.name
  if(!thumbs.has(key)){ctx.fillStyle=look.color;ctx.fillRect(0,0,200,126);drawKidsArt(ctx,{back:false,kidsShapes:look.shapes},200,126);thumbs.set(key,tiny.toDataURL())}
  const active=state.color===look.color&&JSON.stringify(state.kidsShapes)===JSON.stringify(look.shapes)
  return `<button class="preset ${active?'active':''}" data-look="${look.name}" data-kids-look="${index}"><img class="preset-art" src="${thumbs.get(key)}" alt="${look.name} flat Kids design"/><span class="preset-label">${look.name}</span></button>`
 }).join('');document.querySelectorAll<HTMLButtonElement>('[data-kids-look]').forEach(b=>b.onclick=()=>applyKidsLook(Number(b.dataset.kidsLook)))
}

function renderInspector(){document.querySelector('#inspector-title')!.textContent=activeTab==='Design'?(isKids()?'Kids design':'Surface'):'Card details';document.querySelector('[data-tab="Design"]')!.textContent=isKids()?'Design':'Surface';document.querySelector('#inspector-content')!.innerHTML=activeTab==='Design'&&isKids()?kidsInspectorMarkup():activeTab==='Design'?`<section class="inspector-section"><div class="section-title">Pattern ${icon('chevron')}</div><label class="field-label inline-field">Surface${select('pattern-select',patterns,state.pattern)}</label><label class="field-label inline-field">Finish${select('finish-select',['Matte','Satin','Gloss'],state.finish)}</label></section><section class="inspector-section"><div class="section-title">Color ${icon('chevron')}</div><label class="color-field"><span>Base color</span><span class="color-well"><input id="custom-color" type="color" value="${state.color}" aria-label="Custom base color"/><span>${state.color.slice(1).toUpperCase()}</span></span></label><div class="color-palette">${paletteFor(state.tier).map(c=>`<button class="color-swatch ${state.color===c?'active':''}" style="--swatch:${c}" data-color="${c}" title="Use ${c}">${state.color===c?icon('check'):''}</button>`).join('')}</div></section><section class="inspector-section"><div class="section-title">Flow warp ${icon('chevron')}</div>${range('flow','Intensity',state.flow)}${range('scale','Scale',state.scale)}${range('grain','Grain',state.grain)}</section><section class="inspector-section motion-section"><div class="section-title"><span>Animation</span><button class="toggle ${playing?'on':''}" id="motion-toggle" role="switch" aria-checked="${playing}" aria-label="Enable motion"><i></i></button></div>${range('speed','Speed',state.speed)}</section><section class="inspector-section"><div class="section-title">Document ${icon('chevron')}</div><label class="field-label inline-field">Account${select('account-select',accounts,tiers[state.tier].category)}</label><label class="field-label inline-field">Card tier${select('tier-select',tiers.filter(t=>t.category===tiers[state.tier].category).map(t=>t.name),tiers[state.tier].name)}</label><label class="field-label inline-field">Network${select('network',networksFor(state.tier),state.network)}</label><label class="field-label inline-field">Currency${select('currency',tiers[state.tier].category==='Kids'?['NGN']:['NGN','USD','GBP'],state.currency)}</label></section>`:`<section class="inspector-section"><div class="section-title">Cardholder ${icon('chevron')}</div><label class="field-label">Name<input id="holder-name" maxlength="28" value="${escapeHtml(state.name)}" placeholder="Name on card"/></label><label class="field-label inline-field">Type${select('card-type',tiers[state.tier].category==='Kids'?['Prepaid']:['Debit','Credit'],state.type)}</label><label class="field-label inline-field">Currency${select('currency',tiers[state.tier].category==='Kids'?['NGN']:['NGN','USD','GBP'],state.currency)}</label><label class="field-label inline-field">Network${select('network',networksFor(state.tier),state.network)}</label></section><section class="inspector-section elements-section"><div class="section-title">Artwork ${icon('chevron')}</div>${logoControl()}<label class="field-label inline-field">Chip finish${select('chip-style',['Standard silver','Premium silver'],state.chipStyle)}</label><label class="field-label inline-field">Back security${select('security-mark',securityMarksFor(state.network,state.type),state.securityMark)}</label>${[['branding','Sterling identity'],['chip','Chip'],['contactless','Contactless (back)']].map(([k,l])=>`<div class="element-row"><span>${l}</span><button class="icon-button element-toggle ${(state as unknown as Record<string,boolean>)[k]?'':'muted'}" data-element="${k}" aria-label="Toggle ${l}" aria-pressed="${(state as unknown as Record<string,boolean>)[k]}">${icon('eye')}</button></div>`).join('')}</section><section class="inspector-section"><div class="section-title">Card format</div><div class="spec-row"><span>Standard</span><strong>CR80 / ISO 7810</strong></div><div class="spec-row"><span>Width</span><strong>85.60 mm</strong></div><div class="spec-row"><span>Height</span><strong>53.98 mm</strong></div><div class="element-row"><span>Layout guides</span><button class="toggle ${showGuides?'on':''}" id="guides-toggle" role="switch" aria-checked="${showGuides}" aria-label="Show layout guides"><i></i></button></div><p class="detail-note">Sample card details are for design preview only.</p><button class="button" id="save-variation">${icon('plus')} Save variation</button></section>`;
for(const id of ['flow','scale','grain','speed'] as const){const el=document.querySelector<HTMLInputElement>('#'+id);if(el){el.onpointerdown=()=>{history.push({...state});future=[]};el.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){history.push({...state});future=[]}};el.oninput=()=>{state[id]=Number(el.value);el.style.setProperty('--range',el.value+'%');document.querySelector('#'+id+'-value')!.textContent=el.value+(id==='speed'?'%':'');save();renderSurface();renderLayers()};el.onchange=()=>{document.querySelector<HTMLButtonElement>('#undo')!.disabled=false}}}
 document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.onclick=()=>{if(isKids())commit({tier:tiers.findIndex(t=>t.category==='Kids'&&t.color===b.dataset.color),color:b.dataset.color});else commit({color:b.dataset.color})});document.querySelectorAll<HTMLButtonElement>('[data-finish]').forEach(b=>b.onclick=()=>commit({finish:b.dataset.finish}));document.querySelectorAll<HTMLButtonElement>('[data-element]').forEach(b=>b.onclick=()=>{const key=b.dataset.element as 'chip'|'contactless'|'branding';commit({[key]:!state[key]})});bindSelect('pattern-select',v=>commit({pattern:v}));bindSelect('finish-select',v=>commit({finish:v}));bindSelect('account-select',v=>{collectionFilter='All cards';selectTier(tiers.findIndex(t=>t.category===v))});bindSelect('tier-select',v=>selectTier(tiers.findIndex(t=>t.name===v)));bindSelect('chip-style',v=>commit({chipStyle:v as State['chipStyle']}));bindSelect('security-mark',v=>commit({securityMark:v as State['securityMark']}));on('guides-toggle',toggleGuides);bindSelect('network',v=>commit({network:v}));bindSelect('currency',v=>commit({currency:v}));bindSelect('card-type',v=>commit({type:v}));const color=document.querySelector<HTMLInputElement>('#custom-color');if(color)color.onchange=()=>commit({color:color.value});const name=document.querySelector<HTMLInputElement>('#holder-name');if(name)name.onchange=()=>commit({name:name.value});bindSelect('logo-mode',v=>commit({logoMode:v as State['logoMode']}));bindKidsControls();on('play',toggleMotion);on('motion-toggle',toggleMotion);on('restart',()=>{time=0;renderSurface()});on('save-variation',saveVariation);document.querySelectorAll<HTMLElement>('.inspector-section .section-title').forEach(el=>{if(el.querySelector('.toggle'))return;const key=el.textContent!.trim();const section=el.parentElement!;section.classList.toggle('section-collapsed',collapsedSections.has(key));el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-expanded',String(!collapsedSections.has(key)));const toggle=()=>{if(collapsedSections.has(key))collapsedSections.delete(key);else collapsedSections.add(key);renderInspector()};el.onclick=toggle;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();toggle()}}})}
function toggleGuides(){showGuides=!showGuides;localStorage.setItem('sterling-guides',showGuides?'visible':'hidden');renderCard();renderInspector()}
on('guides-button',toggleGuides);
function bindSelect(id:string,fn:(v:string)=>void){const el=document.querySelector<HTMLSelectElement>('#'+id);if(el)el.onchange=()=>fn(el.value)}
function on(id:string,fn:()=>void){const el=document.getElementById(id);if(el)el.onclick=fn}
function toggleMotion(){playing=!playing;renderInspector();document.querySelector('#transport-play')!.innerHTML=icon(playing?'pause':'play')}
const looks=[
 {name:'Silk',pattern:'Silk',flow:65,scale:45,grain:18},
 {name:'Soft folds',pattern:'Silk',flow:35,scale:18,grain:8},
 {name:'Ripple',pattern:'Ripple',flow:65,scale:45,grain:18},
 {name:'Aurora',pattern:'Aurora',flow:75,scale:20,grain:12},
 {name:'Contour',pattern:'Contour',flow:65,scale:45,grain:18},
 {name:'Low tide',pattern:'Ripple',flow:30,scale:15,grain:8},
 {name:'Pure',pattern:'Pure',flow:65,scale:45,grain:0},
 {name:'Fine silk',pattern:'Silk',flow:45,scale:75,grain:22}
];
const thumbs=new Map<string,string>();
function renderPresets(){
 if(isKids()){renderKidsPresets();return}
 const original={...state};const category=tiers[original.tier].category;const palette=paletteFor(original.tier);
 const options=looks.map((preset,i)=>{
  const color=category==='Business'?palette[i%palette.length]:category==='Kids'?palette[i%palette.length]:tiers[original.tier].color;
  return category==='Kids'&&i<3?{name:['Cyan','Magenta','Yellow'][i],pattern:'Pure',flow:65,scale:45,grain:0,color}: {...preset,color}
 });
 const tiny=document.createElement('canvas');tiny.width=200;tiny.height=132;const ctx=tiny.getContext('2d')!;
 document.querySelector('#presets')!.innerHTML=options.map((l,i)=>{
  const key=JSON.stringify(l);
  if(!thumbs.has(key)){state={...original,...l};renderSurface();ctx.drawImage(canvas,0,0,200,132);thumbs.set(key,tiny.toDataURL())}
  const active=original.pattern===l.pattern&&original.color===l.color&&original.flow===l.flow&&original.scale===l.scale&&original.grain===l.grain;
  return `<button class="preset ${active?'active':''}" data-pattern="${l.pattern}" data-look="${l.name}" data-look-index="${i}"><img class="preset-art" src="${thumbs.get(key)}" alt="${l.name} surface"/><span class="preset-label">${l.name}</span></button>`
 }).join('');state=original;renderSurface();
 document.querySelectorAll<HTMLButtonElement>('[data-look]').forEach(b=>b.onclick=()=>{const l=options[Number(b.dataset.lookIndex)];const {name:_,...patch}=l;const tier=category==='Kids'?tiers.findIndex(t=>t.category==='Kids'&&t.color===l.color):state.tier;commit({...patch,tier})})
}
let saved:State[]=[];try{saved=JSON.parse(localStorage.getItem('sterling-variations')||'[]').map((s:State)=>normalizeCard({...initial,...tierDefaults(tiers[s.tier]?s.tier:0),...s}))}catch{}
function saveVariation(){saved.push({...state});localStorage.setItem('sterling-variations',JSON.stringify(saved));renderCollection();toast('Variation saved to your '+tiers[state.tier].category.toLowerCase()+' collection')}
on('new-card',saveVariation);on('add',saveVariation);document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b=>b.onclick=()=>{collectionFilter=b.dataset.filter!;renderCollection()});
on('undo',()=>{if(!history.length)return;future.push({...state});state=history.pop()!;save();refresh()});on('redo',()=>{if(!future.length)return;history.push({...state});state=future.pop()!;save();refresh()});on('reset',()=>{commit({...initial,...tierDefaults(state.tier)});time=0;toast('Design reset')});document.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(b=>b.onclick=()=>{void flipCard(b.dataset.side==='back')});on('flip',()=>{void flipCard(flipping?!flipTarget:!state.back)});document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab!;syncTabs();renderInspector()});
function setZoom(v:number){zoom=Math.max(60,Math.min(130,v));document.querySelector<HTMLElement>('.card-scene')!.style.setProperty('--zoom',String(zoom/100));document.querySelector('#zoom')!.textContent=zoom+'%'}on('zoom-out',()=>setZoom(zoom-10));on('zoom-in',()=>setZoom(zoom+10));on('zoom',()=>setZoom(100));on('fullscreen',()=>{document.body.classList.toggle('focus-mode')});on('preview',()=>{document.body.classList.toggle('preview-mode');document.querySelector('#preview')!.innerHTML=icon('eye');document.querySelector('#preview')!.setAttribute('aria-pressed',String(document.body.classList.contains('preview-mode')))});
const dialog=document.querySelector<HTMLDialogElement>('#export-dialog')!;function updateExportSummary(){
 const pdf=document.querySelector<HTMLSelectElement>('#export-format')!.value==='pdf'
 document.querySelector('#export-summary')!.textContent=tiers[state.tier].name+' / '+state.pattern+' / '+(pdf?'Front + Back + Guides':state.back?'Back':'Front')
 const note=document.querySelector<HTMLElement>('#export-note')!;note.hidden=!pdf;note.textContent='2-page PDF: actual-size front and back templates, plus an enlarged blue layout guide.'
}
on('export',()=>{updateExportSummary();dialog.showModal()});bindSelect('export-format',updateExportSummary);on('close-modal',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
on('download',async()=>{
 const snapshot={...state};
 const filename=`sterling-${tiers[snapshot.tier].category.toLowerCase()}-${tiers[snapshot.tier].name.toLowerCase().replaceAll(' ','-')}-${snapshot.back?'back':'front'}`;
 if(document.querySelector<HTMLSelectElement>('#export-format')!.value==='json'){
  download(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}),filename+'.json');toast('Design settings exported');dialog.close();return
 }
 const button=document.querySelector<HTMLButtonElement>('#download')!;button.disabled=true;button.textContent='Rendering…';
 try{
  renderSurface();const pdf=document.querySelector<HTMLSelectElement>('#export-format')!.value==='pdf'
  if(pdf){
   // Freeze before loading the PDF code so a playing shader exports one coherent instant.
   const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;surface.getContext('2d')!.drawImage(canvas,0,0)
   const {exportTemplatePDF}=await import('./pdf-export')
   const blob=await exportTemplatePDF(snapshot,surface)
   const pdfName=`sterling-${tiers[snapshot.tier].category.toLowerCase()}-${tiers[snapshot.tier].name.toLowerCase().replaceAll(' ','-')}-templates.pdf`
   download(blob,pdfName);toast('Front, back and guide PDF exported')
  }else{const blob=await exportCard(snapshot,canvas);download(blob,filename+'.png');toast('Card exported at 1712 × 1080')}
  dialog.close()
 }
 catch{toast('Could not export the card. Please try again.')}
 finally{button.disabled=false;button.innerHTML=icon('download')+' Download'}
});
on('shortcuts',()=>toast('G: guides · Space: play / pause · F: flip · ⌘Z: undo · Esc: exit preview'));on('settings-info',()=>{document.body.classList.toggle('flat-background');toast(document.body.classList.contains('flat-background')?'Canvas background: neutral':'Canvas background: flowing')});document.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;if(e.code==='Space'&&!isKids()){e.preventDefault();toggleMotion()}if(e.key.toLowerCase()==='g'&&!e.metaKey&&!e.ctrlKey&&!e.altKey)toggleGuides();if(e.key.toLowerCase()==='r'&&!e.metaKey&&!e.ctrlKey)randomise();if(e.key.toLowerCase()==='f')void flipCard(flipping?!flipTarget:!state.back);if(e.key==='Escape'){document.body.classList.remove('focus-mode','preview-mode');document.querySelector('#preview')!.innerHTML=icon('eye')}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();document.querySelector<HTMLButtonElement>(e.shiftKey?'#redo':'#undo')!.click()}});setInterval(()=>{const e=document.querySelector('#time-display');if(e)e.textContent=(time%10).toFixed(2)+'s'},500);refresh()

function randomise(){if(isKids()){applyKidsLook(4+Math.floor(Math.random()*4));toast('New Kids composition');return}commit({pattern:patterns[Math.floor(Math.random()*patterns.length)],flow:25+Math.floor(Math.random()*70),scale:15+Math.floor(Math.random()*65),grain:10+Math.floor(Math.random()*25)});time=Math.random()*10;toast('New flow generated')}
on('randomise',randomise);on('transport-play',toggleMotion);on('transport-restart',()=>{time=0;renderSurface()});document.querySelector<HTMLInputElement>('#playhead')!.oninput=e=>{time=Number((e.target as HTMLInputElement).value);renderSurface()};bindSelect('transport-speed',v=>commit({speed:Number(v)}));on('looks-toggle',()=>{document.querySelector('#presets')!.classList.toggle('collapsed')});on('quality',()=>{const low=canvas.width===1712;canvas.width=low?856:1712;canvas.height=low?540:1080;document.querySelector('#quality')!.innerHTML=icon('sliders')+(low?'50%':'Auto');renderSurface()});on('copy-settings',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(state,null,2));toast('Design settings copied')}catch{toast('Use Export → Design settings to save your settings')}});

// Direct manipulation of the same shape data used by the export renderer.
const cardElement=document.querySelector<HTMLElement>('#card')!
let shapeDrag:{id:string;x:number;y:number;startX:number;startY:number;moved:boolean}|null=null
cardElement.addEventListener('pointerdown',e=>{
 if(!isKids()||state.back||flipping||e.button!==0)return
 const rect=cardElement.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100
 const hit=[...state.kidsShapes].reverse().find(s=>s.visible&&Math.abs(x-s.x)<s.size/2&&Math.abs(y-s.y)<s.size*85.6/53.98/2)
 if(!hit){selectedKidsShape=null;renderKidsCanvas();renderInspector();return}
 selectedKidsShape=hit.id;shapeDrag={id:hit.id,x:hit.x,y:hit.y,startX:e.clientX,startY:e.clientY,moved:false};cardElement.setPointerCapture(e.pointerId);activeTab='Design';syncTabs();renderInspector();renderLayers();renderKidsCanvas();e.preventDefault()
})
cardElement.addEventListener('pointermove',e=>{
 if(!shapeDrag)return
 const dx=e.clientX-shapeDrag.startX,dy=e.clientY-shapeDrag.startY
 if(!shapeDrag.moved&&Math.hypot(dx,dy)<3)return
 if(!shapeDrag.moved){history.push({...state});future=[];shapeDrag.moved=true}
 const rect=cardElement.getBoundingClientRect(),x=Math.max(-20,Math.min(120,shapeDrag.x+dx/rect.width*100)),y=Math.max(-20,Math.min(120,shapeDrag.y+dy/rect.height*100))
 state={...state,kidsShapes:state.kidsShapes.map(s=>s.id===shapeDrag!.id?{...s,x,y}:s)};renderKidsCanvas()
})
const finishShapeDrag=()=>{if(!shapeDrag)return;shapeDrag=null;save();renderInspector();document.querySelector<HTMLButtonElement>('#undo')!.disabled=history.length===0}
cardElement.addEventListener('pointerup',finishShapeDrag);cardElement.addEventListener('pointercancel',finishShapeDrag)
