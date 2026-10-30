import { drawKidsArt, shapeKinds, type KidsShape } from './kids-art'
export type Account = 'Personal' | 'Business' | 'Kids'
export type ChipStyle = 'Standard silver' | 'Premium silver'
export type SecurityMark = 'Silver hologram' | 'Copper debit hologram' | 'Silver foil' | 'Gold foil'
export type LogoMode = 'Auto' | 'Light' | 'Dark'
export type CardState = {
  tier: number; color: string; pattern: string; flow: number; scale: number; grain: number;
  speed: number; finish: string; name: string; currency: string; network: string; type: string;
  chip: boolean; contactless: boolean; branding: boolean; back: boolean;
  chipStyle: ChipStyle; securityMark: SecurityMark; logoMode: LogoMode; kidsShapes: KidsShape[]; kidsNickname: string;
}
export const accounts: Account[] = ['Personal', 'Business', 'Kids']
export const tiers = [
  { name: 'Classic', category: 'Personal', color: '#bf323d', network: 'Verve', currency: 'NGN', type: 'Debit', premium: false },
  { name: 'Prime', category: 'Personal', color: '#b7b8bc', network: 'Mastercard', currency: 'NGN', type: 'Debit', premium: false },
  { name: 'World', category: 'Personal', color: '#42474b', network: 'Mastercard', currency: 'USD', type: 'Debit', premium: false },
  { name: 'World Elite', category: 'Personal', color: '#202123', network: 'Mastercard', currency: 'USD', type: 'Debit', premium: true },
  { name: 'Business', category: 'Business', color: '#28745b', network: 'Mastercard', currency: 'NGN', type: 'Debit', premium: false },
  { name: 'Prepaid Cyan', category: 'Kids', color: '#31afd2', network: 'Verve', currency: 'NGN', type: 'Prepaid', premium: false },
  { name: 'Prepaid Magenta', category: 'Kids', color: '#e650a0', network: 'Verve', currency: 'NGN', type: 'Prepaid', premium: false },
  { name: 'Prepaid Yellow', category: 'Kids', color: '#f4dc00', network: 'Verve', currency: 'NGN', type: 'Prepaid', premium: false },
  { name: 'Prepaid Purple', category: 'Kids', color: '#7b4ff4', network: 'Verve', currency: 'NGN', type: 'Prepaid', premium: false },
] as const
export const CARD = { width: 85.6, height: 53.98, radius: 3.18, inset: 3, nfcHeight: 4.5, nfcClearance: 2 }
export function tierDefaults(index: number): Partial<CardState> {
  const tier = tiers[index]
  return { tier: index, color: tier.color, network: tier.network, currency: tier.currency, type: tier.type,
    logoMode: 'Auto', kidsShapes: [], kidsNickname: '', pattern: tier.category === 'Kids' ? 'Pure' : 'Silk', grain: tier.category === 'Kids' ? 0 : 18,
    chipStyle: index > 0 && index < 4 ? 'Premium silver' : 'Standard silver',
    securityMark: tier.network === 'Mastercard' ? 'Silver hologram' : 'Silver foil' }
}
export function networksFor(index: number): string[] {
  return index === 0 ? ['Verve', 'AfriGO', 'Mastercard'] : tiers[index].category === 'Kids' ? ['Verve', 'AfriGO'] : ['Mastercard']
}
export function securityMarksFor(network: string, type: string): SecurityMark[] {
  return network === 'Mastercard'
    ? type === 'Debit' ? ['Silver hologram', 'Copper debit hologram'] : ['Silver hologram']
    : ['Silver foil', 'Gold foil']
}
export function normalizeCard(value: CardState): CardState {
  const next = { ...value }
  if (!tiers[next.tier]) next.tier = 0
  if (!networksFor(next.tier).includes(next.network)) next.network = tiers[next.tier].network
  if (tiers[next.tier].category === 'Kids') { next.type = 'Prepaid'; next.currency = 'NGN'; next.pattern = 'Pure'; next.grain = 0 }
  else if (!['Debit', 'Credit'].includes(next.type)) next.type = 'Debit'
  if (!securityMarksFor(next.network, next.type).includes(next.securityMark)) next.securityMark = securityMarksFor(next.network, next.type)[0]
  if (!['Auto','Light','Dark'].includes(next.logoMode)) next.logoMode='Auto'
  next.kidsNickname=typeof next.kidsNickname==='string'?next.kidsNickname.slice(0,20):''
  next.kidsShapes=Array.isArray(next.kidsShapes)?next.kidsShapes.filter(s=>s&&typeof s.id==='string'&&/^[a-z0-9_-]+$/i.test(s.id)&&shapeKinds.includes(s.kind)&&[s.x,s.y,s.size,s.rotation].every(Number.isFinite)&&/^#[0-9a-f]{6}$/i.test(s.color)).slice(0,16).map(s=>({...s,x:Math.max(-20,Math.min(120,s.x)),y:Math.max(-20,Math.min(120,s.y)),size:Math.max(5,Math.min(120,s.size)),visible:s.visible!==false})):[]
  return next
}
export function paletteFor(index: number): string[] {
  const category = tiers[index].category
  return category === 'Business' ? ['#28745b', '#245e49', '#195c4a', '#39866b', '#124b3b', '#3a7350']
    : category === 'Kids' ? ['#31afd2', '#e650a0', '#f4dc00', '#7b4ff4']
    : ['#bf323d', '#b7b8bc', '#42474b', '#202123', '#a32b37', '#986f53']
}
export function inkFor(color: string): string {
  const channels = color.slice(1).match(/../g)?.map(c => {
    const v = parseInt(c, 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
  }) || [0, 0, 0]
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722 > .40 ? '#171717' : '#ffffff'
}
// Contrast follows the artwork beneath each mark, including editable Kids shapes.
let inkSampleKey=''
let inkSample:CanvasRenderingContext2D|null=null
function artworkInk(state:CardState,x:number,y:number):string{
 if(tiers[state.tier].category!=='Kids'||state.back)return inkFor(state.color)
 const key=JSON.stringify([state.color,state.kidsShapes])
 if(!inkSample){const c=document.createElement('canvas');c.width=171;c.height=108;inkSample=c.getContext('2d',{willReadFrequently:true})!}
 if(inkSampleKey!==key){inkSample.fillStyle=state.color;inkSample.fillRect(0,0,171,108);drawKidsArt(inkSample,state,171,108);inkSampleKey=key}
 const pixel=inkSample.getImageData(Math.max(0,Math.min(170,Math.round(x/CARD.width*171))),Math.max(0,Math.min(107,Math.round(y/CARD.height*108))),1,1).data
 return inkFor('#'+Array.from(pixel.slice(0,3)).map(v=>v.toString(16).padStart(2,'0')).join(''))
}
const asset = (filename: string) => '/assets/card-studio/cards/' + filename
export type CardElement = { id: string; x: number; y: number; width: number; height: number; radius?: number } & (
  { kind: 'image'; src: string; alt: string; tone?: 'black' | 'white' } |
  { kind: 'text'; text: string; size: number; color: string; align?: 'left' | 'right'; font?: 'Youth' | 'InterVariable'; tracking?: number } |
  { kind: 'rect'; color: string }
)
const image = (id: string, file: string, alt: string, x: number, y: number, width: number, height: number, tone?: 'black' | 'white'): CardElement =>
  ({ id, kind: 'image', src: asset(file), alt, x, y, width, height, tone })
const text = (id: string, value: string, x: number, y: number, width: number, size: number, color: string, align: 'left' | 'right' = 'left', font: 'Youth' | 'InterVariable' = 'Youth', tracking = 0): CardElement =>
  ({ id, kind: 'text', text: value, x, y, width, height: size * 1.2, size, color, align, font, tracking })

/** Physical millimetres are the shared source of truth for preview and export. */
export function cardElements(state: CardState): CardElement[] {
  const tier = tiers[state.tier], ink = inkFor(state.color), light = ink === '#171717'
  const elements: CardElement[] = []
  if (!state.back) {
    if (state.branding) elements.push(image('wordmark', 'sterling-wordmark.svg', 'Sterling', 56.6, 3, 26, 26 * 37 / 143, artworkInk(state,69.6,6.3)==='#171717' ? 'black' : undefined))
    if (state.chip) {
      const premium = state.chipStyle === 'Premium silver'
      elements.push(image('chip', premium ? 'chip-silver-premium-aligned.svg' : 'chips.svg', state.chipStyle + ' chip', 9.7, 20.2, 12.5, premium ? 12.5 * 92.6 / 131.75 : 12.5 * 110 / 144))
    }
    const label = tier.category === 'Kids' ? state.kidsNickname || 'PREPAID' : tier.category === 'Business' ? 'BUSINESS' : state.currency === 'NGN' ? '' : state.currency
    if (label) elements.push(text('account-label', label, 3.2, 47.3, 28, 2.5, artworkInk(state,15,48.5), 'left', tier.category === 'Kids' ? 'Youth' : 'InterVariable'))
    if (state.network === 'Mastercard') {
      const premium = tier.premium
      const width = premium ? 18.3 : 18.5, height = premium ? 18.3 * 166 / 213 : 18.5 * 132 / 213
      elements.push(image('network', premium ? 'mc-logo.svg' : 'mc-color-logo.svg', premium ? 'Mastercard premium silver brand mark' : 'Mastercard', CARD.width - 3 - width, CARD.height - 3 - height, width, height))
    } else {
      const verve = state.network === 'Verve'
      const width = 18.5, height = width * (verve ? 75 / 213 : 90 / 223)
      const dark = state.logoMode==='Dark'||state.logoMode==='Auto'&&artworkInk(state,74,48)==='#171717'
      elements.push(image('network', verve ? dark?'verve-logo-black.svg':'verve-logo.svg' : 'afrigo-logo.svg', state.network, CARD.width-3-width, CARD.height-3-height, width, height, !verve && dark ? 'black' : undefined))
    }
  } else {
    elements.push({ id: 'magstripe', kind: 'rect', x: 0, y: 4.5, width: CARD.width, height: 10.8, color: '#100f0f' })
    elements.push(text('bank-reference', 'STERLING BANK NIGERIA - 1556/234/56789102/00', 3, 1.6, 79.6, 1.25, ink, 'right'))
    elements.push(text('holder-name', state.name, 3.2, 19.4, 70, 3.6, ink))
    elements.push(text('pan', '5574 3210 0123 4756', 3.2, 24.4, 70, 5.3, ink, 'left', 'Youth', .4))
    elements.push(text('expiry-label', 'EXP', 3.2, 31.9, 4.7, 1.9, ink, 'left', 'Youth', .1))
    elements.push(text('expiry', '01/30', 9, 31.4, 13.5, 3, ink, 'left', 'Youth', .2))
    elements.push(text('cvv-label', 'CVV', 25, 31.9, 5, 1.9, ink, 'left', 'Youth', .1))
    elements.push(text('cvv', '756', 31.4, 31.4, 10.5, 3, ink, 'left', 'Youth', .2))
    if (state.contactless) elements.push(image('contactless', 'nfc.svg', 'Contactless', 78.1, 22.5, 4.5 * 42 / 54, 4.5, artworkInk(state,79.8,24.75)==='#171717' ? 'black' : 'white'))
    const securityAssets: Record<SecurityMark, string> = {
      'Silver hologram': 'mc-silver-hologram.svg.svg', 'Copper debit hologram': 'mc-copper-hologram.svg',
      'Silver foil': 'silver-foil.svg', 'Gold foil': 'gold-foil.svg'
    }
    // Below, rather than behind, the front chip safety area.
    const securityHeight = state.network === 'Mastercard' ? 7 * 133 / 160 : 7 * 61 / 84
    elements.push(image('security-mark', securityAssets[state.securityMark], state.securityMark, 34, CARD.height - 3 - securityHeight, 7, securityHeight))
    const program = tier.category === 'Kids' ? 'prepaid' : tier.category === 'Business' ? 'business ' + state.type.toLowerCase()
      : state.tier === 1 ? 'platinum ' + state.type.toLowerCase() : state.tier > 1 ? tier.name.toLowerCase() + ' ' + state.type.toLowerCase() : state.type.toLowerCase()
    if (state.tier !== 0) elements.push(text('program', program, 3.2, 39.3, 47, 2.2, ink, 'left', 'InterVariable'))
    elements.push(text('support-1', 'NEED HELP? VISIT STERLING.NG/HELP', 47, 47.3, 35.4, 1.25, ink, 'right'))
    elements.push(text('support-2', 'OR CALL 055 869 69653', 47, 49.3, 35.4, 1.25, ink, 'right'))
    if (state.branding) {
      elements.push(image('symbol', 'sterling-symbol.svg', 'Sterling symbol', 3.2, 45.8, 5.2, 5.2, light ? 'black' : undefined))
      elements.push(image('back-wordmark', 'sterling-wordmark.svg', 'Sterling', 9.2, 47.0, 12.2, 12.2 * 37 / 143, light ? 'black' : undefined))
    }
  }
  return elements
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export function cardMarkup(state: CardState): string {
  return cardElements(state).map(e => {
    const position = `left:${e.x / CARD.width * 100}%;top:${e.y / CARD.height * 100}%;width:${e.width / CARD.width * 100}%;height:${e.height / CARD.height * 100}%;`
    if (e.kind === 'image') return `<img data-card-element="${e.id}" class="card-asset ${e.tone ? 'asset-' + e.tone : ''}" src="${e.src}" alt="${e.alt}" style="${position}" draggable="false"/>`
    if (e.kind === 'rect') return `<span data-card-element="${e.id}" class="card-shape" style="${position}background:${e.color};border-radius:${(e.radius || 0) / CARD.width * 100}cqw"></span>`
    return `<span data-card-element="${e.id}" class="card-text" style="${position}font-family:${e.font};font-size:${e.size / CARD.width * 100}cqw;color:${e.color};text-align:${e.align};letter-spacing:${(e.tracking || 0) / CARD.width * 100}cqw">${escapeHtml(e.text)}</span>`
  }).join('')
}
const images = new Map<string, Promise<HTMLImageElement>>()
function loadImage(src: string): Promise<HTMLImageElement> {
  if (!images.has(src)) images.set(src, new Promise((resolve, reject) => {
    const img = new window.Image(); img.onload = () => resolve(img); img.onerror = () => { images.delete(src); reject(new Error('Could not load ' + src)) }; img.src = src
  }))
  return images.get(src)!
}
export async function exportCard(state: CardState, surface: HTMLCanvasElement): Promise<Blob> {
  const elements = cardElements(state)
  const frozenSurface=document.createElement('canvas');frozenSurface.width=surface.width;frozenSurface.height=surface.height;frozenSurface.getContext('2d')!.drawImage(surface,0,0)
  await Promise.all([
    document.fonts.load('700 40px Youth'), document.fonts.load('40px InterVariable'),
    ...elements.filter(e => e.kind === 'image').map(e => loadImage(e.src)),
  ])
  const out = document.createElement('canvas'); out.width = 1712; out.height = 1080
  const ctx = out.getContext('2d')!, sx = out.width / CARD.width, sy = out.height / CARD.height
  ctx.beginPath(); ctx.roundRect(0, 0, out.width, out.height, CARD.radius * sx); ctx.clip()
  ctx.fillStyle = state.color; ctx.fillRect(0, 0, out.width, out.height); ctx.drawImage(frozenSurface, 0, 0, out.width, out.height)
  if(tiers[state.tier].category==='Kids')drawKidsArt(ctx,state,out.width,out.height)
  for (const e of elements) {
    const x = e.x * sx, y = e.y * sy, w = e.width * sx, h = e.height * sy
    if (e.kind === 'image') {
      const img = await loadImage(e.src)
      ctx.save(); if (e.tone) ctx.filter = e.tone === 'black' ? 'brightness(0)' : 'brightness(0) invert(1)'
      ctx.drawImage(img, x, y, w, h); ctx.restore()
    } else if (e.kind === 'rect') { ctx.fillStyle = e.color; ctx.beginPath(); ctx.roundRect(x, y, w, h, (e.radius || 0) * sx); ctx.fill() }
    else {
      ctx.fillStyle = e.color; ctx.font = `${e.font === 'Youth' ? 700 : 400} ${e.size * sx}px ${e.font}`
      // Match the preview's top-aligned line box, including the font's ascent.
      ctx.letterSpacing = `${(e.tracking || 0) * sx}px`
      const metrics = ctx.measureText(e.text), measured = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = e.align || 'left'; ctx.letterSpacing = `${(e.tracking || 0) * sx}px`
      const baseline = y + (e.size * sx - measured) / 2 + metrics.fontBoundingBoxAscent
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillText(e.text, e.align === 'right' ? x + w : x, baseline); ctx.restore()
    }
  }
  return new Promise((resolve, reject) => out.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG rendering failed')), 'image/png'))
}


export type CardGuide = { id: string; label: string; x: number; y: number; width: number; height: number; kind?: string }

/** Shared physical layout bounds for the blue editor overlay and PDF guide sheet. */
export function cardGuides(state: CardState): CardGuide[] {
  const elements=cardElements(state)
  const guides: CardGuide[]=[{id:'safe-inset',label:'3 mm safe inset',x:CARD.inset,y:CARD.inset,width:CARD.width-2*CARD.inset,height:CARD.height-2*CARD.inset,kind:'safe'}]
  const bounds=(id:string,label:string,padding=0,kind='placement')=>{
    const e=elements.find(e=>e.id===id)
    if(e)guides.push({id,label,x:e.x-padding,y:e.y-padding,width:e.width+padding*2,height:e.height+padding*2,kind})
  }
  if(state.back){
    bounds('magstripe','Magnetic stripe',0,'stripe')
    guides.push({id:'account-details',label:'Account details',x:3.2,y:18.9,width:70,height:16.3})
    guides.push({id:'chip-exclusion',label:'No hologram behind chip',x:CARD.width-9.7-12.5,y:20.2,width:12.5,height:12,kind:'exclusion'})
    if(state.branding)guides.push({id:'issuer-lockup',label:'Issuer',x:3.2,y:45.8,width:18.2,height:5.2})
    bounds('security-mark','Security foil')
    guides.push({id:'support',label:'Support',x:47,y:46.9,width:35.4,height:4.1})
  }else{
    bounds('wordmark','Sterling wordmark')
    bounds('chip','Chip')
    bounds('network',tiers[state.tier].premium?'Premium mark · 18.3 mm':'Network mark')
  }
  bounds('contactless','Contactless · 2 mm clear',CARD.nfcClearance,'clearance')
  return guides
}

export function guideMarkup(state: CardState): string {
  const boxes=cardGuides(state).map(g=>`<div data-guide="${g.id}" class="layout-guide guide-${g.kind||'placement'}" style="left:${g.x/CARD.width*100}%;top:${g.y/CARD.height*100}%;width:${g.width/CARD.width*100}%;height:${g.height/CARD.height*100}%"><span>${escapeHtml(g.label)}</span></div>`).join('')
  // Shared alignment rails meet the inset and account/footer edges.
  const rails=state.back
    ? [{axis:'x',value:3.2},{axis:'x',value:82.4},{axis:'y',value:45.3}]
    : [{axis:'x',value:9.7},{axis:'x',value:82.6}]
  return boxes+rails.map((r,i)=>`<i data-guide="rail-${i}" class="guide-rail rail-${r.axis}" style="${r.axis==='x'?'left':'top'}:${r.value/(r.axis==='x'?CARD.width:CARD.height)*100}%"></i>`).join('')
}
