const $ = id => document.getElementById(id);
// On tiny-lagos.ismailahmad.com the atlas is the root page.
if(location.hostname.startsWith('tiny-lagos.'))document.querySelector('.brand').href='/';
const canvas = $('map'), ctx = canvas.getContext('2d');
const places = [
 {id:'marina',name:'Marina',icon:'▥',x:1030,y:610,lat:6.451,lng:3.392,category:'Lagos Island · Waterfront',description:'The waterfront face of Lagos Island. A place of ferries, busy streets, and a skyline that tells the story of a trading city.'},
 {id:'third-mainland',name:'Third Mainland Bridge',icon:'⌁',x:1070,y:145,lat:6.495,lng:3.4,category:'Across the lagoon',description:'A familiar journey over open water, linking the mainland with Lagos Island. Look back toward the city and watch the skyline unfold.'},
 {id:'national-theatre',name:'National Theatre',icon:'◒',x:395,y:510,lat:6.476,lng:3.3727,category:'Iganmu · Arts & culture',description:'An unmistakable silhouette in Iganmu and a landmark of Nigerian performing arts. Its sweeping form takes centre stage in this little city.'},
 {id:'ikoyi',name:'Ikoyi',icon:'♧',x:1640,y:275,lat:6.452,lng:3.435,category:'Island life · Neighbourhood',description:'Leafy streets, waterside views, and towers rising above the trees. Explore this quiet pocket between the lagoon and the bustle of the islands.'},
 {id:'lekki',name:'Lekki–Ikoyi Bridge',icon:'⋀',x:1480,y:655,lat:6.4475,lng:3.4365,category:'Over the water · Architecture',description:'The cable-stayed bridge connecting Ikoyi and Lekki is one of the city’s most recognisable contemporary silhouettes.'},
 {id:'eko-atlantic',name:'Eko Atlantic',icon:'▥',x:1010,y:1130,lat:6.41,lng:3.406,category:'Atlantic coast · A growing skyline',description:'A new city rising beside the Atlantic. Here, an imagined cluster of sunlit towers marks the southern edge of our illustrated Lagos.'},
 {id:'victoria-island',name:'Victoria Island',icon:'▥',x:1000,y:900,lat:6.428,lng:3.422,category:'Island life · Neighbourhood',description:'A lively mix of offices, places to eat, and waterfront streets between the lagoon and the Atlantic coast.'},
 {id:'makoko',name:'Makoko',icon:'⌂',x:690,y:230,lat:6.496,lng:3.389,category:'Lagos Lagoon · Community',description:'A waterfront community closely connected to the lagoon. This illustration offers only a small, stylized glimpse of a complex and living neighbourhood.'}
];
// Mainland districts are placed from their real coordinates (checked against Apple Maps).
// The painted mainland is stylized and its airport is roughly twice life size, so each axis
// is mapped piecewise: the real airport footprint lands on the painted one, and districts keep
// their true north/south/east/west order around it. The waterfront art keeps hand-placed pins.
const LNG_TO_X=[[3.17,-1050],[3.305,470],[3.338,1450],[3.40,1880]];
const LAT_TO_Y=[[6.46,150],[6.49,-100],[6.553,-610],[6.603,-1450],[6.68,-1640]];
function along(stops,value){
 let i=1;while(i<stops.length-1&&value>stops[i][0])i++;
 const [a,from]=stops[i-1],[b,to]=stops[i];return Math.round(from+(value-a)/(b-a)*(to-from));
}
function project(lat,lng){return {x:along(LNG_TO_X,lng),y:along(LAT_TO_Y,lat)}}
for(const [id,name,icon,lat,lng,category,description] of [
 ['ikeja','Ikeja','▦',6.6018,3.3515,'Mainland · State capital','The state capital, east of the airport: government offices, Allen Avenue, Computer Village, and busy commercial streets.'],
 ['airport','Murtala Muhammed Airport','✈',6.5774,3.3212,'Mainland · Airport','The airport anchors the mainland section, with runways, terminal buildings, and surrounding neighbourhoods. This is an illustrated interpretation, not an airport navigation chart.'],
 ['agege','Agege','▦',6.618,3.3209,'Mainland · District','North of the airport, known for its markets, its railway line, and the famous Agege bread.'],
 ['ojokoro','Ojokoro','▦',6.668,3.31,'Mainland · District','The northern edge of the atlas, around Ijaiye and the road out toward Ogun State.'],
 ['ojodu','Ojodu Berger','▦',6.642,3.37,'Mainland · District','A busy northern gateway where the Lagos–Ibadan Expressway meets the city.'],
 ['ketu','Ketu','▦',6.597,3.389,'Mainland · District','Along Ikorodu Road in Kosofe, home to the Mile 12 market and a steady stream of buses heading east.'],
 ['alimosho','Alimosho','▦',6.605,3.268,'Western mainland · District','Lagos’s most populous area: Egbeda, Ipaja and Idimu, with dense residential streets, markets, and green pockets.'],
 ['ikotun','Ikotun','▦',6.55,3.264,'Western mainland · District','A western mainland junction town in Alimosho, busy with markets and buses.'],
 ['ejigbo','Ejigbo','▦',6.553,3.305,'Mainland · District','Residential neighbourhoods between Isolo and Ikotun, south of the airport.'],
 ['oshodi','Oshodi','▦',6.555,3.343,'Mainland · Transport hub','One of the city’s great crossroads, where the Apapa–Oshodi Expressway, Agege Motor Road and the new transport interchange meet.'],
 ['isolo','Isolo','▦',6.537,3.323,'Mainland · District','Residential and industrial streets west of Mushin, along the Oshodi–Apapa Expressway.'],
 ['ilupeju','Ilupeju','▦',6.553,3.357,'Mainland · District','A mix of factories, offices, and quiet residential streets just east of Oshodi.'],
 ['mushin','Mushin','▦',6.5273,3.3449,'Mainland · District','Dense, lively streets and the big Mushin market, between Oshodi and Surulere.'],
 ['luth','Idi-Araba','✚',6.517,3.353,'Mainland · Teaching hospital','Home to the Lagos University Teaching Hospital, on the edge of Mushin.'],
 ['shomolu','Shomolu','▦',6.539,3.384,'Mainland · District','Famous for its printing presses, between Ikorodu Road and the lagoon.'],
 ['yaba','Yaba','▦',6.5095,3.378,'Mainland · Neighbourhood','A mainland neighbourhood with a rich mix of learning, technology, markets, and everyday Lagos life.'],
 ['ojuelegba','Ojuelegba','▦',6.509,3.364,'Mainland · Junction','The busy junction where Surulere meets Yaba, made famous by Wizkid’s song.'],
 ['surulere','Surulere','◒',6.495,3.35,'Mainland · District','Residential streets around the National and Teslim Balogun stadiums, between Mushin and the lagoon.'],
 ['festac','Festac Town','▦',6.466,3.284,'Western mainland · District','The planned town built for FESTAC ’77, the 1977 festival of Black and African arts and culture, in Amuwo-Odofin.'],
 ['ojo','Ojo / Satellite Town','▦',6.466,3.182,'Western mainland · District','The western end of the atlas, toward Ojo and the Lagos Trade Fair Complex.']
])places.push({id,name,icon,lat,lng,...project(lat,lng),category,description});
// The painted stadium sits at (800,-183) on the mainland art, where the projection above
// would put Surulere's streets, so it gets its own pin on the painting.
places.push({id:'national-stadium',name:'National Stadium',icon:'◎',x:800,y:-183,lat:6.4983,lng:3.3646,category:'Surulere · Sport',description:'Opened in 1972 and host of the 1973 All-Africa Games, the great bowl on Western Avenue in Surulere.'});
// The illustration occupies a fixed world rectangle; pins and camera use the same coordinates.
const WORLD = { width: 2000, height: 1333 };
let width=0,height=0,ratio=1,scale=1,base=1,pan={x:0,y:0},night=false,selected=null,labelsVisible=true;
// Keep the detailed city in its original coordinates. The forest is a separate
// world-space layer, so zooming out never resamples or replaces the city source.
const forest = new Image();
let forestReady=false;
forest.onload=()=>{forestReady=true;draw()};
forest.onerror=()=>{forestReady=false;draw()};
forest.src='/assets/lagos/forest-canopy-v1.png';
const COVERAGE={x:-1200,y:-1700,width:3200,height:3033};
const OVERVIEW={x:-1500,y:-2000,width:4000,height:3700};
const mainland = new Image();
let mainlandReady=false;
mainland.onload=()=>{mainlandReady=true;draw()};
mainland.onerror=()=>{toast('The mainland artwork could not load. Reload to try again.');draw()};
mainland.src='/assets/lagos/lagos-mainland-v1.png';
function traceMainland(target){
 const points=[[-1150,-1550],[-940,-1600],[-750,-1680],[-450,-1630],[-120,-1700],[180,-1650],[520,-1690],[850,-1580],[1110,-1650],[1440,-1540],[1660,-1390],[1880,-1410],[2000,-1160],[1930,-920],[1990,-640],[1870,-390],[1960,-150],[1840,150],[1560,350],[1210,410],[850,380],[450,420],[80,350],[-250,410],[-580,360],[-850,410],[-1100,280],[-1200,40],[-1140,-260],[-1190,-540],[-1100,-830],[-1190,-1120]];
 target.beginPath();points.forEach(([x,y],i)=>i?target.lineTo(x,y):target.moveTo(x,y));target.closePath();
}
const boundary=[[60,80],[230,95],[345,35],[540,65],[670,25],[850,70],[1040,25],[1190,75],[1400,30],[1570,90],[1780,45],[1900,140],[1950,300],[1890,435],[1970,575],[1910,760],[1960,920],[1850,1040],[1760,1180],[1590,1225],[1430,1180],[1240,1290],[1060,1250],[900,1300],[700,1220],[540,1260],[410,1190],[260,1210],[150,1070],[45,1000],[85,820],[20,660],[85,510],[25,330],[90,210]];
function traceBoundary(target){
 target.beginPath();
 boundary.forEach(([x,y],i)=>{
  if(!i){target.moveTo(x,y);return}
  const [px,py]=boundary[i-1],length=Math.hypot(x-px,y-py),steps=Math.ceil(length/12);
  for(let j=1;j<=steps;j++){
   const t=j/steps,offset=j===steps?0:Math.sin(i*17+j*13)*5;
   target.lineTo(px+(x-px)*t+(y-py)/length*offset,py+(y-py)*t-(x-px)/length*offset);
  }
 });target.closePath();
}
// The city is composed once per lighting into one canvas (both paintings, clipped to
// their cut-outs), so each frame only copies pixels instead of re-clipping and
// re-scaling the source art. 0.77 px per unit matches the waterfront painting.
const CITY_DENSITY=.77, cityCache={};
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function composedCity(mode){
 if(cityCache[mode]!==undefined)return cityCache[mode];
 if(!mainlandReady||!artworkReady)return null;
 const k=CITY_DENSITY,c=makeCanvas(Math.round(COVERAGE.width*k),Math.round(COVERAGE.height*k)),g=c.getContext('2d');
 if(!g)return (cityCache[mode]=null);
 g.setTransform(k,0,0,k,-COVERAGE.x*k,-COVERAGE.y*k);
 g.save();traceMainland(g);g.clip();g.drawImage(mainland,-1200,-1700,3200,2133);g.restore();
 g.save();traceBoundary(g);g.clip();g.drawImage(illustration,0,0,WORLD.width,WORLD.height);g.restore();
 if(mode==='night')nightGrade(c);
 return (cityCache[mode]=c);
}
// Night is a grade, not a dimmer: the painting sinks into blue, and its own lights
// (amber street lamps, cyan edges, yellow danfos) plus scattered windows glow.
function nightGrade(c){
 const g=c.getContext('2d'),w=c.width,h=c.height;
 g.setTransform(1,0,0,1,0,0);
 let data;
 try{data=g.getImageData(0,0,w,h)}catch{return}
 const src=data.data,lights=new ImageData(w,h),out=lights.data;
 for(let i=0,n=0;i<src.length;i+=4,n++){
  const r=src[i],gr=src[i+1],b=src[i+2],a=src[i+3];
  if(!a)continue;
  const max=Math.max(r,gr,b),min=Math.min(r,gr,b),sat=max?(max-min)/max:0;
  const warm=r>200&&gr>140&&b<120&&sat>.4, cyan=b>190&&gr>170&&r<150;
  const green=gr>r&&gr>b, water=b>gr*.85&&b>r*1.2;
  // Windows: a sparse, stable scatter over built-up (not green, not water) pixels.
  const hash=((n*2654435761)>>>0)/4294967296;
  const window=!green&&!water&&max>120&&hash<.012;
  if(warm||cyan||window){
   const glow=window?[255,206,120]:cyan?[120,235,255]:[255,190,95];
   out[i]=glow[0];out[i+1]=glow[1];out[i+2]=glow[2];out[i+3]=window?230:255;
  }
  // Moonlit blue: keep the painting's shapes, drop most of its daylight.
  src[i]=r*.2+6;src[i+1]=gr*.25+10;src[i+2]=b*.42+28;
 }
 g.putImageData(data,0,0);
 const glowLayer=makeCanvas(w,h),lg=glowLayer.getContext('2d');lg.putImageData(lights,0,0);
 g.save();g.globalCompositeOperation='lighter';
 g.filter='blur(6px)';g.globalAlpha=.55;g.drawImage(glowLayer,0,0);
 g.filter='blur(1.5px)';g.globalAlpha=.8;g.drawImage(glowLayer,0,0);
 g.filter='none';g.globalAlpha=.9;g.drawImage(glowLayer,0,0);
 g.restore();
}
const forestPatterns={};
function forestPattern(target,mode){
 const key=mode;
 if(forestPatterns[key]!==undefined)return forestPatterns[key];
 if(!forestReady)return null;
 let source=forest;
 if(mode==='night'){
  const c=makeCanvas(forest.naturalWidth||forest.width,forest.naturalHeight||forest.height),g=c.getContext('2d');
  if(g){g.drawImage(forest,0,0);g.globalCompositeOperation='multiply';g.fillStyle='#1a2448';g.fillRect(0,0,c.width,c.height);source=c}
 }
 return (forestPatterns[key]=target.createPattern(source,'repeat'));
}
function paintScene(target,originX,originY,unit,viewWidth,viewHeight){
 const mode=night?'night':'day',tile=420;
 target.save();target.translate(originX,originY);target.scale(unit,unit);
 const left=-originX/unit,top=-originY/unit,viewW=viewWidth/unit,viewH=viewHeight/unit;
 target.fillStyle=night?'#101a33':'#42674e';target.fillRect(left,top,viewW,viewH);
 const pattern=forestPattern(target,mode);
 if(pattern&&pattern.setTransform&&typeof DOMMatrix!=='undefined'){
  const w=forest.naturalWidth||forest.width;
  pattern.setTransform(new DOMMatrix().scale(tile/w));
  target.fillStyle=pattern;target.fillRect(left,top,viewW,viewH);
 }
 const city=composedCity(mode);
 if(city)target.drawImage(city,COVERAGE.x,COVERAGE.y,COVERAGE.width,COVERAGE.height);
 target.restore();
}
// Zooming out stops at a third of the detailed view.
function minimumScale(){return base*.33}
function fitEntireMap(){
 scale=Math.max(minimumScale(),Math.min(width/COVERAGE.width,height/COVERAGE.height)*.82);
 pan={x:-(COVERAGE.x+COVERAGE.width/2-WORLD.width/2)*scale,y:-(COVERAGE.y+COVERAGE.height/2-WORLD.height/2)*scale};draw();
}
const illustration = new Image();
let artworkReady = false;
illustration.onload = () => { artworkReady=true; $('art-status').hidden=true; draw(); };
illustration.onerror = () => { $('art-status').textContent='The illustration could not load. Reload to try again.'; };
illustration.src='/assets/lagos/lagos-atlas-v3.png';
function renderArt(){draw()}
// Once the map fits inside the viewport on an axis, it locks to the centre of
// that axis. Zoomed in, the camera can pan across the map plus a little forest,
// and that margin shrinks to nothing as the map approaches the viewport size.
function constrainCamera(){
 const clamp=(center,start,span,view)=>{const spare=Math.max(0,span-view)/2,range=spare+Math.min(300,spare),middle=start+span/2;return Math.max(middle-range,Math.min(middle+range,center))};
 const cx=clamp(WORLD.width/2-pan.x/scale,COVERAGE.x,COVERAGE.width,width/scale);
 const cy=clamp(WORLD.height/2-pan.y/scale,COVERAGE.y,COVERAGE.height,height/scale);
 pan.x=-(cx-WORLD.width/2)*scale;pan.y=-(cy-WORLD.height/2)*scale;
}
function screen(x,y){return {x:(x-WORLD.width/2)*scale+width/2+pan.x,y:(y-WORLD.height/2)*scale+height/2+pan.y}}
let frameRequested=0,velocity=null;
// Every caller asks for a frame; the work happens at most once per display refresh.
function draw(){
 if(typeof requestAnimationFrame!=='function')return drawNow();
 if(!frameRequested)frameRequested=requestAnimationFrame(frame);
}
function frame(now){
 frameRequested=0;
 if(velocity){
  const dt=Math.min(48,now-velocity.time);velocity.time=now;
  pan.x+=velocity.x*dt;pan.y+=velocity.y*dt;
  const decay=Math.pow(.92,dt/16);velocity.x*=decay;velocity.y*=decay;
  if(Math.hypot(velocity.x,velocity.y)<.02)velocity=null;
 }
 drawNow();
 if(velocity)draw();
}
function drawNow(){
 constrainCamera();
 ctx.setTransform(ratio,0,0,ratio,0,0);
 const origin=screen(0,0);
 ctx.save();
 paintScene(ctx,origin.x,origin.y,scale,width,height);
 ctx.restore();
 const zoomedOut=scale/base<.75;
 document.body.classList.toggle('map-overview',zoomedOut);
 for(const p of places){
  const el=$('pin-'+p.id),s=screen(p.x,p.y);
  el.style.left=s.x+'px';el.style.top=(s.y-8*scale)+'px';
  el.hidden=!labelsVisible||(zoomedOut&&selected!==p.id&&!['marina','ikeja','alimosho','ojo'].includes(p.id))||s.x<35||s.x>width-35||s.y<100||s.y>height-90||(width<750&&selected!==p.id&&!['marina','lekki','national-theatre'].includes(p.id));
 }
 $('zoom-level').textContent=Math.round(scale/base*100)+'%';
 drawMinimap();
}
function reset(){base=Math.max(width/WORLD.width,height/WORLD.height)*1.04;scale=base;pan={x:0,y:0};draw()}
function resize(){const relativeZoom=scale/base,cx=WORLD.width/2-pan.x/scale,cy=WORLD.height/2-pan.y/scale,initialized=width>0;width=innerWidth;height=$('explorer').clientHeight;ratio=Math.min(devicePixelRatio||1,2);canvas.width=width*ratio;canvas.height=height*ratio;reset();if(initialized){scale=Math.max(minimumScale(),base*relativeZoom);pan.x=-(cx-WORLD.width/2)*scale;pan.y=-(cy-WORLD.height/2)*scale;draw()}}
function zoom(factor,x=width/2,y=height/2){const next=Math.max(minimumScale(),Math.min(base*4,scale*factor));const f=next/scale;pan.x=x-width/2-(x-width/2-pan.x)*f;pan.y=y-height/2-(y-height/2-pan.y)*f;scale=next;draw()}
function selectPlace(id,focus=true){const p=places.find(p=>p.id===id);if(!p)return;selected=id;$('place-title').textContent=p.name;$('place-category').textContent=p.category;$('place-description').textContent=p.description;$('apple-maps').href='https://maps.apple.com/?ll='+p.lat+','+p.lng+'&q='+encodeURIComponent(p.name)+'&z=15';$('place-card').hidden=false;$('place-index').hidden=true;$('places-toggle').setAttribute('aria-expanded','false');$('results').hidden=true;$('search').value='';document.querySelectorAll('[data-place]').forEach(el=>el.classList.toggle('selected',el.dataset.place===id));if(focus){scale=base*1.5;pan.x=-(p.x-WORLD.width/2)*scale;pan.y=-(p.y-WORLD.height/2)*scale}history.replaceState(null,'','#'+id);draw()}
for(const p of places){const pin=document.createElement('button');pin.className='pin';pin.id='pin-'+p.id;pin.dataset.place=p.id;pin.innerHTML='<span class="dot" aria-hidden="true"></span><span class="pin-name">'+p.name+'</span>';pin.addEventListener('click',()=>selectPlace(p.id));$('pins').append(pin)}
for(const p of places){const button=document.createElement('button');button.dataset.place=p.id;button.innerHTML='<span class="mini" aria-hidden="true">'+p.icon+'</span><span>'+p.name+'</span>';button.addEventListener('click',()=>selectPlace(p.id));$('destinations').append(button)}
$('zoom-in').onclick=()=>zoom(1.25);$('zoom-out').onclick=()=>zoom(.8);$('reset').onclick=reset;$('fit-map').onclick=fitEntireMap;
function setNight(value){night=value;document.body.classList.toggle('night',night);$('day').classList.toggle('active',!night);$('night').classList.toggle('active',night);$('day').setAttribute('aria-pressed',String(!night));$('night').setAttribute('aria-pressed',String(night));renderArt()}
$('day').onclick=()=>setNight(false);$('night').onclick=()=>setNight(true);
$('surprise').onclick=()=>{const candidates=places.filter(p=>p.id!==selected);selectPlace(candidates[Math.floor(Math.random()*candidates.length)].id)};
$('close-place').onclick=()=>{selected=null;$('place-card').hidden=true;document.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));history.replaceState(null,'',location.pathname+location.search);draw()};
const about=$('about');$('about-button').onclick=()=>about.showModal();$('close-about').onclick=()=>about.close();about.addEventListener('click',e=>{if(e.target===about){const r=about.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)about.close()}});
$('search').addEventListener('input',()=>{const q=$('search').value.trim().toLowerCase();$('results').replaceChildren();$('results').hidden=!q;if(!q)return;const found=places.filter(p=>(p.name+' '+p.category).toLowerCase().includes(q));if(!found.length){const empty=document.createElement('p');empty.textContent='No places found. Try Marina, Yaba, or Lekki.';$('results').append(empty)}for(const p of found){const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>selectPlace(p.id);$('results').append(b)}});
$('search').addEventListener('keydown',e=>{if(e.key==='Escape')$('results').hidden=true;if(e.key==='ArrowDown'){e.preventDefault();$('results').querySelector('button')?.focus()}if(e.key==='Enter')$('results').querySelector('button')?.click()});
let toastTimer;function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2500)}
async function shareView(){
 const url=new URL(location.href);
 url.searchParams.set('x',String(Math.round(WORLD.width/2-pan.x/scale)));
 url.searchParams.set('y',String(Math.round(WORLD.height/2-pan.y/scale)));
 url.searchParams.set('z',(scale/base).toFixed(2));
 if(night)url.searchParams.set('night','1');else url.searchParams.delete('night');
 history.replaceState(null,'',url);
 try{await navigator.clipboard.writeText(url.href);toast('View copied. Send someone your corner of Lagos!')}
 catch{toast('Your view is saved in the address bar. Copy it to share.')}
}
$('share').onclick=shareView;$('share-view').onclick=shareView;
$('places-toggle').onclick=()=>{
 const opening=$('place-index').hidden;
 $('place-index').hidden=!opening;
 $('places-toggle').setAttribute('aria-expanded',String(opening));
 if(opening)$('place-card').hidden=true;
};
$('labels-toggle').onclick=()=>{
 labelsVisible=!labelsVisible;
 $('labels-toggle').setAttribute('aria-pressed',String(labelsVisible));
 $('labels-toggle').textContent=labelsVisible?'Labels on':'Labels off';draw();
};
const minimap=$('minimap'), miniCtx=minimap.getContext('2d');
const miniCache={};
function drawMinimap(){
 if(!miniCtx)return;
 const mx=minimap.width/OVERVIEW.width,my=minimap.height/OVERVIEW.height,mode=night?'night':'day';
 if(!miniCache[mode]){
  const c=makeCanvas(minimap.width,minimap.height),g=c.getContext('2d');
  if(g)paintScene(g,-OVERVIEW.x*mx,-OVERVIEW.y*my,mx,minimap.width,minimap.height);
  if(g&&composedCity(mode))miniCache[mode]=c;
  miniCtx.drawImage(c,0,0);
 }else miniCtx.drawImage(miniCache[mode],0,0);
 const left=(WORLD.width/2-(width/2+pan.x)/scale-OVERVIEW.x)*mx;
 const top=(WORLD.height/2-(height/2+pan.y)/scale-OVERVIEW.y)*my;
 const right=left+width/scale*mx,bottom=top+height/scale*my;
 const x=Math.max(0,Math.min(minimap.width,left)),y=Math.max(0,Math.min(minimap.height,top));
 const w=Math.max(0,Math.min(minimap.width,right)-x),h=Math.max(0,Math.min(minimap.height,bottom)-y);
 miniCtx.fillStyle='#17243288';
 miniCtx.fillRect(0,0,minimap.width,y);
 miniCtx.fillRect(0,y+h,minimap.width,minimap.height-y-h);
 miniCtx.fillRect(0,y,x,h);
 miniCtx.fillRect(x+w,y,minimap.width-x-w,h);
 miniCtx.strokeStyle='#202832';miniCtx.lineWidth=5;miniCtx.strokeRect(x,y,w,h);
 miniCtx.strokeStyle='#fff5bd';miniCtx.lineWidth=2;miniCtx.strokeRect(x,y,w,h);
}

function navigateOverview(e){
 const r=minimap.getBoundingClientRect();
 if(!r.width||!r.height)return;
 const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*OVERVIEW.width+OVERVIEW.x;
 const y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))*OVERVIEW.height+OVERVIEW.y;
 pan.x=-(x-WORLD.width/2)*scale;pan.y=-(y-WORLD.height/2)*scale;draw();
}
let miniDragging=false;
minimap.addEventListener('pointerdown',e=>{miniDragging=true;minimap.setPointerCapture(e.pointerId);navigateOverview(e)});
minimap.addEventListener('pointermove',e=>{if(miniDragging)navigateOverview(e)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])minimap.addEventListener(event,()=>{miniDragging=false});
minimap.addEventListener('keydown',e=>{
 const moves={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]};
 if(!moves[e.key])return;e.preventDefault();pan.x+=moves[e.key][0];pan.y+=moves[e.key][1];draw();
});
$('mini-toggle').onclick=()=>{minimap.hidden=!minimap.hidden;$('mini-toggle').setAttribute('aria-expanded',String(!minimap.hidden));$('mini-toggle').querySelector('span').textContent=minimap.hidden?'+':'−'};
const pointers=new Map();let lastPinch=0,track=[];
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});lastPinch=0;velocity=null;track=[{x:e.clientX,y:e.clientY,t:performance.now()}];canvas.classList.add('dragging')});
canvas.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;
 const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch)zoom(distance/lastPinch,(a.x+b.x)/2,(a.y+b.y)/2);lastPinch=distance;track=[];return}
 pan.x+=e.clientX-old.x;pan.y+=e.clientY-old.y;
 const now=performance.now();track.push({x:e.clientX,y:e.clientY,t:now});while(track.length>2&&now-track[0].t>90)track.shift();
 draw();
});
// Let go mid-drag and the map keeps gliding, slowing to a stop.
function endDrag(e){
 if(!pointers.delete(e.pointerId))return;lastPinch=0;
 if(pointers.size)return;
 canvas.classList.remove('dragging');
 const now=performance.now(),first=track[0],last=track[track.length-1];
 if(track.length>1&&now-last.t<60){const dt=Math.max(16,last.t-first.t),vx=(last.x-first.x)/dt,vy=(last.y-first.y)/dt;if(Math.hypot(vx,vy)>.08){velocity={x:vx,y:vy,time:now};draw()}}
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endDrag);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY)},{passive:false});canvas.addEventListener('dblclick',e=>zoom(1.5,e.clientX,e.clientY));
document.addEventListener('keydown',e=>{if(about.open)return;if(e.key==='/'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();$('search').focus()}if(document.activeElement!==canvas)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','=','-','0'].includes(e.key))e.preventDefault();if(e.key==='ArrowUp')pan.y+=45;if(e.key==='ArrowDown')pan.y-=45;if(e.key==='ArrowLeft')pan.x+=45;if(e.key==='ArrowRight')pan.x-=45;if(e.key==='+'||e.key==='=')zoom(1.2);if(e.key==='-')zoom(1/1.2);if(e.key==='0')reset();draw()});
window.addEventListener('resize',resize);
window.addEventListener('hashchange',()=>{if(location.hash)selectPlace(location.hash.slice(1))});
resize();
// Start with the whole atlas; selecting a place restores the detailed view.
fitEntireMap();
if(location.hash)selectPlace(location.hash.slice(1));
const query=new URLSearchParams(location.search);
const savedX=Number(query.get('x')),savedY=Number(query.get('y')),savedZ=Number(query.get('z'));
if(query.has('x')&&query.has('y')&&query.has('z')&&[savedX,savedY,savedZ].every(Number.isFinite)){
 scale=Math.max(minimumScale(),base*Math.min(4,savedZ));
 pan.x=-(savedX-WORLD.width/2)*scale;pan.y=-(savedY-WORLD.height/2)*scale;
}
if(query.get('night')==='1')setNight(true);
renderArt();
