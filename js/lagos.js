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
const mainlandOutline=[[-1150,-1550],[-940,-1600],[-750,-1680],[-450,-1630],[-120,-1700],[180,-1650],[520,-1690],[850,-1580],[1110,-1650],[1440,-1540],[1660,-1390],[1880,-1410],[2000,-1160],[1930,-920],[1990,-640],[1870,-390],[1960,-150],[1840,150],[1560,350],[1210,410],[850,380],[450,420],[80,350],[-250,410],[-580,360],[-850,410],[-1100,280],[-1200,40],[-1140,-260],[-1190,-540],[-1100,-830],[-1190,-1120]];
function traceMainland(target){
 target.beginPath();mainlandOutline.forEach(([x,y],i)=>i?target.lineTo(x,y):target.moveTo(x,y));target.closePath();
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
// Zoomed right out, the map locks to the middle of the screen. As you zoom in, the camera
// is freed quickly (fully once the map is an eighth bigger than the screen), so zooming in
// toward a corner goes to that corner instead of being pulled back to the middle.
function constrainCamera(){
 const clamp=(center,start,span,view)=>{
  const free=Math.max(0,Math.min(1,(span-view)/(span*.12))),range=span/2*free+Math.min(300,Math.max(0,span-view)/2),middle=start+span/2;
  return Math.max(middle-range,Math.min(middle+range,center));
 };
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
$('day').onclick=()=>{manualLight=true;setNight(false)};$('night').onclick=()=>{manualLight=true;setNight(true)};
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
// ---------- the painting on the real map ----------
// The painting is stylised, so there is no exact projection. Every place carries both its
// painted position and its real coordinates. A north-up least-squares fit (east from x,
// north from y, no shear) plus a smooth inverse-distance correction turns any painted point
// into a real one, and back.
const controls=places.map(p=>({x:p.x,y:p.y,lng:p.lng,lat:p.lat}));
function fit1(xs,ts){const n=xs.length,mx=xs.reduce((a,b)=>a+b)/n,mt=ts.reduce((a,b)=>a+b)/n;let sxx=0,sxt=0;xs.forEach((x,i)=>{sxx+=(x-mx)**2;sxt+=(x-mx)*(ts[i]-mt)});const k=sxt/sxx;return [k,mt-k*mx]}
const fitLng=fit1(controls.map(c=>c.x),controls.map(c=>c.lng)),fitLat=fit1(controls.map(c=>c.y),controls.map(c=>c.lat));
const affineGeo=(x,y)=>({lng:fitLng[0]*x+fitLng[1],lat:fitLat[0]*y+fitLat[1]});
for(const c of controls){const g=affineGeo(c.x,c.y);c.dlng=c.lng-g.lng;c.dlat=c.lat-g.lat}
function worldToGeo(x,y){
 const g=affineGeo(x,y);let w=0,dl=0,da=0;
 for(const c of controls){const k=1/((c.x-x)**2+(c.y-y)**2+250**2);w+=k;dl+=k*c.dlng;da+=k*c.dlat}
 return {lng:g.lng+dl/w,lat:g.lat+da/w};
}
function geoToWorld(lng,lat){
 // Invert the linear fit, then correct with a few fixed-point steps; the correction is smooth.
 let x=(lng-fitLng[1])/fitLng[0],y=(lat-fitLat[1])/fitLat[0];
 for(let i=0;i<8;i++){const g=worldToGeo(x,y);x+=(lng-g.lng)/fitLng[0];y+=(lat-g.lat)/fitLat[0]}
 return {x,y};
}

// ---------- minimap: the painted area cut out of real satellite imagery ----------
const minimap=$('minimap'),miniCtx=minimap.getContext('2d');
// lagos-satellite.webp is Esri World Imagery, web mercator, covering SAT.
const SAT={west:3.05,east:3.70,south:6.33,north:6.75};
const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
const satellite=new Image();let satelliteReady=false;
satellite.onload=()=>{satelliteReady=true;miniBase=null;draw()};
satellite.src='/assets/lagos/lagos-satellite.webp';
// The minimap frames the painted area with a margin of real Lagos around it.
const coverageGeo=[mainlandOutline,boundary].map(ring=>ring.map(([x,y])=>worldToGeo(x,y)));
const VIEW=(()=>{
 const all=coverageGeo.flat(),lngs=all.map(g=>g.lng),lats=all.map(g=>g.lat);
 let west=Math.min(...lngs),east=Math.max(...lngs),south=Math.min(...lats),north=Math.max(...lats);
 const padX=(east-west)*.18,padY=(north-south)*.18;west-=padX;east+=padX;south-=padY;north+=padY;
 // Match the canvas shape, growing whichever side is short.
 const want=minimap.width/minimap.height,have=(east-west)/(merc(north)-merc(south))*Math.PI/180;
 if(have<want){const grow=((merc(north)-merc(south))*want*180/Math.PI-(east-west))/2;west-=grow;east+=grow}
 else{const mid=(merc(north)+merc(south))/2,half=(east-west)*Math.PI/180/want/2;north=Math.atan(Math.sinh(mid+half))*180/Math.PI;south=Math.atan(Math.sinh(mid-half))*180/Math.PI}
 return {west:Math.max(SAT.west,west),east:Math.min(SAT.east,east),south:Math.max(SAT.south,south),north:Math.min(SAT.north,north)};
})();
const geoToMini=(lng,lat)=>({x:(lng-VIEW.west)/(VIEW.east-VIEW.west)*minimap.width,y:(merc(VIEW.north)-merc(lat))/(merc(VIEW.north)-merc(VIEW.south))*minimap.height});
const miniToGeo=(mx,my)=>{const m=merc(VIEW.north)-my/minimap.height*(merc(VIEW.north)-merc(VIEW.south));return {lng:VIEW.west+mx/minimap.width*(VIEW.east-VIEW.west),lat:Math.atan(Math.sinh(m))*180/Math.PI}};
let miniBase=null;
// The two paintings overlap, so the cut-out is their union: each shape is filled on its own.
function coverageMask(w,h,grow=0){
 const c=makeCanvas(w,h),g=c.getContext('2d');
 g.fillStyle=g.strokeStyle='#000';g.lineJoin='round';g.lineWidth=grow*2;
 for(const ring of coverageGeo){g.beginPath();ring.forEach((p,i)=>{const q=geoToMini(p.lng,p.lat);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y)});g.closePath();g.fill();if(grow)g.stroke()}
 return c;
}
function buildMiniBase(){
 const c=makeCanvas(minimap.width,minimap.height),g=c.getContext('2d');
 if(!g||!satelliteReady)return null;
 const sx=(VIEW.west-SAT.west)/(SAT.east-SAT.west)*satellite.naturalWidth,sw=(VIEW.east-VIEW.west)/(SAT.east-SAT.west)*satellite.naturalWidth;
 const span=merc(SAT.north)-merc(SAT.south),sy=(merc(SAT.north)-merc(VIEW.north))/span*satellite.naturalHeight,sh=(merc(VIEW.north)-merc(VIEW.south))/span*satellite.naturalHeight;
 g.drawImage(satellite,sx,sy,sw,sh,0,0,c.width,c.height);
 const mask=coverageMask(c.width,c.height);
 // Everything outside the painted area recedes.
 const dim=makeCanvas(c.width,c.height),d=dim.getContext('2d');
 d.fillStyle='rgba(16,22,30,.45)';d.fillRect(0,0,c.width,c.height);
 d.globalCompositeOperation='destination-out';d.drawImage(mask,0,0);
 g.drawImage(dim,0,0);
 // A bold ink outline around the cut-out: the shape grown by a few pixels, minus the shape.
 const edge=coverageMask(c.width,c.height,4),e=edge.getContext('2d');
 e.globalCompositeOperation='source-in';e.fillStyle='#14181f';e.fillRect(0,0,c.width,c.height);
 e.globalCompositeOperation='destination-out';e.drawImage(mask,0,0);
 g.drawImage(edge,0,0);
 return c;
}
function drawMinimap(){
 if(!miniCtx||!settings.minimap)return;
 if(!miniBase)miniBase=buildMiniBase();
 miniCtx.clearRect(0,0,minimap.width,minimap.height);
 if(miniBase)miniCtx.drawImage(miniBase,0,0);
 if(night){miniCtx.fillStyle='rgba(10,18,52,.45)';miniCtx.fillRect(0,0,minimap.width,minimap.height)}
 // The view: centred on the real spot you're looking at, sized by the overall fit, so it
 // stays a clean north-up rectangle even where the painting's scale changes.
 const cx=WORLD.width/2-pan.x/scale,cy=WORLD.height/2-pan.y/scale,centre=worldToGeo(cx,cy);
 const halfLng=Math.abs(fitLng[0])*width/scale/2,halfLat=Math.abs(fitLat[0])*height/scale/2;
 const a=geoToMini(centre.lng-halfLng,centre.lat+halfLat),b=geoToMini(centre.lng+halfLng,centre.lat-halfLat);
 miniCtx.beginPath();miniCtx.rect(a.x,a.y,b.x-a.x,b.y-a.y);
 miniCtx.lineJoin='round';
 miniCtx.strokeStyle='#14181f';miniCtx.lineWidth=6;miniCtx.stroke();
 miniCtx.strokeStyle='#fffbe9';miniCtx.lineWidth=3;miniCtx.stroke();
}
function navigateOverview(e){
 const r=minimap.getBoundingClientRect();
 if(!r.width||!r.height)return;
 const g=miniToGeo((e.clientX-r.left)/r.width*minimap.width,(e.clientY-r.top)/r.height*minimap.height),w=geoToWorld(g.lng,g.lat);
 velocity=null;pan.x=-(w.x-WORLD.width/2)*scale;pan.y=-(w.y-WORLD.height/2)*scale;draw();
}
let miniDragging=false;
minimap.addEventListener('pointerdown',e=>{miniDragging=true;minimap.setPointerCapture?.(e.pointerId);navigateOverview(e)});
minimap.addEventListener('pointermove',e=>{if(miniDragging)navigateOverview(e)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])minimap.addEventListener(event,()=>{miniDragging=false});
minimap.addEventListener('keydown',e=>{
 const moves={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]};
 if(!moves[e.key])return;e.preventDefault();pan.x+=moves[e.key][0];pan.y+=moves[e.key][1];draw();
});

// ---------- settings ----------
const settings=(()=>{const saved={};try{Object.assign(saved,JSON.parse(localStorage.getItem('tiny-lagos-settings')||'{}'))}catch{}
 return {minimap:saved.minimap!==false,labels:saved.labels!==false,weather:saved.weather!==false}})();
function applySettings(){
 labelsVisible=settings.labels;
 $('overview').hidden=!settings.minimap;
 document.querySelectorAll('[data-setting]').forEach(b=>{const on=(b.dataset.value==='on')===settings[b.dataset.setting];b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
 $('weather').hidden=!settings.weather||!weatherNow;
 if(!settings.weather){$('forecast').hidden=true;stopWeatherEffects()}else applyWeather();
 try{localStorage.setItem('tiny-lagos-settings',JSON.stringify(settings))}catch{}
 draw();
}
function setSetting(key,value){settings[key]=value;applySettings()}
document.querySelectorAll('[data-setting]').forEach(b=>b.addEventListener('click',()=>setSetting(b.dataset.setting,b.dataset.value==='on')));
$('settings-button').onclick=()=>{const open=$('settings').hidden;$('settings').hidden=!open;$('settings-button').setAttribute('aria-expanded',String(open))};
document.addEventListener('keydown',e=>{
 if(e.metaKey||e.ctrlKey||e.altKey||['INPUT','TEXTAREA'].includes(document.activeElement.tagName)||about.open)return;
 const key={m:'minimap',l:'labels',w:'weather'}[e.key.toLowerCase()];
 if(key)setSetting(key,!settings[key]);
 if(e.key==='Escape'&&!$('settings').hidden){$('settings').hidden=true;$('settings-button').setAttribute('aria-expanded','false')}
});

// ---------- live weather and time in Lagos (Open-Meteo, no key needed) ----------
const LAGOS={lat:6.4541,lng:3.3947,zone:'Africa/Lagos'};
const WMO={0:['Clear','sun'],1:['Mostly clear','sun'],2:['Partly cloudy','cloud-sun'],3:['Overcast','cloud'],45:['Fog','fog'],48:['Fog','fog'],
 51:['Light drizzle','rain'],53:['Drizzle','rain'],55:['Heavy drizzle','rain'],61:['Light rain','rain'],63:['Rain','rain'],65:['Heavy rain','rain'],
 80:['Light showers','rain'],81:['Showers','rain'],82:['Heavy showers','rain'],95:['Thunderstorm','storm'],96:['Thunderstorm','storm'],99:['Thunderstorm','storm']};
const RAIN={51:.25,53:.4,55:.55,61:.45,63:.7,65:1,80:.5,81:.75,82:1,95:.9,96:1,99:1};
const ICONS={
 sun:'<circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
 moon:'<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13 7 7 0 0 1-5-13z"/>',
 cloud:'<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>',
 'cloud-sun':'<path d="M8 5.5a3.5 3.5 0 0 1 5.6 1.3M5 9H3.5M6 4.6 5 3.6"/><path d="M8 19h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.2A2.9 2.9 0 0 0 8 19z"/>',
 fog:'<path d="M4 9h16M3 13h18M5 17h14"/>',
 rain:'<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
 storm:'<path d="M7 13h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 13z"/><path d="m12 14-2 4h3l-2 4"/>'};
const icon=(name,isDay)=>'<svg viewBox="0 0 24 24">'+ICONS[name==='sun'&&!isDay?'moon':name]+'</svg>';
let weatherNow=null,weatherHours=[],manualLight=false;
const lagosTime=date=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:LAGOS.zone}).format(date);
function renderWeather(){
 if(!weatherNow)return;
 const [label,kind]=WMO[weatherNow.code]||['Clear','sun'];
 $('weather-icon').innerHTML=icon(kind,weatherNow.isDay);
 $('weather-time').textContent=lagosTime(new Date());
 $('weather-text').textContent=`${label} · ${Math.round(weatherNow.temp)}°C · ${weatherNow.isDay?'Day':'Night'}`;
 $('forecast').replaceChildren(...weatherHours.map(h=>{
  const row=document.createElement('div'),[l,k]=WMO[h.code]||['Clear','sun'];
  row.innerHTML=`<span>${h.time}</span>${icon(k,h.isDay)}<span>${Math.round(h.temp)}°</span><span class="rain-chance">${h.rain}%</span>`;row.title=l;return row}));
}
async function loadWeather(){
 try{
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${LAGOS.lat}&longitude=${LAGOS.lng}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day,precipitation_probability&forecast_hours=8&timezone=${encodeURIComponent(LAGOS.zone)}`;
  const data=await (await fetch(url)).json(),c=data.current,h=data.hourly;
  // ?weather=63 previews a weather code (63 rain, 95 storm, 45 fog) over the real conditions.
  const preview=new URLSearchParams(location.search).get('weather');
  weatherNow={code:preview!==null&&WMO[preview]?Number(preview):c.weather_code,temp:c.temperature_2m,isDay:c.is_day===1};
  weatherHours=h.time.slice(1,7).map((t,i)=>({time:t.slice(11,16),code:h.weather_code[i+1],temp:h.temperature_2m[i+1],isDay:h.is_day[i+1]===1,rain:h.precipitation_probability[i+1]??0}));
  renderWeather();applySettings();
 }catch{/* No weather is fine: the map works the same without it. */}
}
$('weather').onclick=()=>{const open=$('forecast').hidden;$('forecast').hidden=!open;$('weather').setAttribute('aria-expanded',String(open))};
// Time of day follows Lagos unless you pick Day or Night yourself.
function applyWeather(){
 if(!settings.weather||!weatherNow)return;
 if(!manualLight&&night===weatherNow.isDay)setNight(!weatherNow.isDay);
 startWeatherEffects(RAIN[weatherNow.code]||0,weatherNow.code>=95,weatherNow.code===45||weatherNow.code===48);
}
// Rain streaks over the map, with lightning in a storm and haze in fog.
const fx=$('weather-fx'),fxCtx=fx.getContext('2d');
let drops=[],fxFrame=0,fxState={rain:0,storm:false,fog:false},flash=0,lastFx=0;
function startWeatherEffects(rain,storm,fog){
 fxState={rain,storm,fog};
 const reduced=matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 fx.hidden=!(rain||fog);
 if(!fxCtx||fx.hidden)return stopWeatherEffects();
 fx.width=innerWidth;fx.height=innerHeight;
 drops=Array.from({length:Math.round(rain*260)},()=>({x:Math.random()*fx.width,y:Math.random()*fx.height,l:10+Math.random()*16,v:.7+Math.random()*.6}));
 if(reduced){paintWeather(0);return}
 if(!fxFrame)fxFrame=requestAnimationFrame(animateWeather);
}
function stopWeatherEffects(){if(fxFrame)cancelAnimationFrame(fxFrame);fxFrame=0;fx.hidden=true}
function paintWeather(dt){
 fxCtx.clearRect(0,0,fx.width,fx.height);
 if(fxState.fog){fxCtx.fillStyle=night?'rgba(120,135,160,.18)':'rgba(235,238,240,.28)';fxCtx.fillRect(0,0,fx.width,fx.height)}
 fxCtx.strokeStyle=night?'rgba(170,200,255,.45)':'rgba(255,255,255,.55)';fxCtx.lineWidth=1.2;fxCtx.lineCap='round';fxCtx.beginPath();
 for(const d of drops){d.y+=d.v*dt*.9;d.x-=d.v*dt*.18;if(d.y>fx.height){d.y=-d.l;d.x=Math.random()*fx.width*1.2}fxCtx.moveTo(d.x,d.y);fxCtx.lineTo(d.x+d.l*.2,d.y-d.l)}
 fxCtx.stroke();
 if(fxState.storm){if(flash<=0&&Math.random()<.0015*dt)flash=1;if(flash>0){fxCtx.fillStyle=`rgba(230,240,255,${flash*.35})`;fxCtx.fillRect(0,0,fx.width,fx.height);flash-=dt/220}}
}
function animateWeather(now){
 const dt=Math.min(50,now-(lastFx||now));lastFx=now;
 paintWeather(dt);
 fxFrame=requestAnimationFrame(animateWeather);
}
window.addEventListener('resize',()=>{if(!fx.hidden)startWeatherEffects(fxState.rain,fxState.storm,fxState.fog)});
setInterval(()=>{if(weatherNow)$('weather-time').textContent=lagosTime(new Date())},20000);
setInterval(loadWeather,15*60*1000);
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
// Wheel and trackpad zoom anywhere on the map, including over pins and labels. Pinches
// arrive as ctrl+wheel with small deltas, so they get a higher rate than wheel notches.
$('explorer').addEventListener('wheel',e=>{
 if(e.target.closest('#place-card,#place-index,#results,#settings,#forecast,dialog'))return;
 e.preventDefault();
 const unit=e.deltaMode===1?40:e.deltaMode===2?800:1;
 zoom(Math.exp(-e.deltaY*unit*(e.ctrlKey?.012:.0025)),e.clientX,e.clientY);
},{passive:false});$('explorer').addEventListener('dblclick',e=>{if(e.target===canvas||e.target.closest('#pins'))zoom(1.5,e.clientX,e.clientY)});
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
if(query.get('night')==='1'){manualLight=true;setNight(true)}
applySettings();
loadWeather();
renderArt();
