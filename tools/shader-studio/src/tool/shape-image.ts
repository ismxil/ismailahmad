/* ---------------------------------------------------------------------------
   The custom shape: an SVG (or PNG) dropped in the document panel, turned
   (or a line of text) into a signed distance field once, so the Smiley layer's "My SVG" mode can
   draw it flat (crisp at any zoom, outline included) or extrude it in 3D just
   like the smiley. Trimmed to its ink, centred, padded so bevels and outlines
   have room. Kept in IndexedDB: too large for localStorage and share links.
--------------------------------------------------------------------------- */
export interface ShapeImage {
  /** signed distance in face units (the shape is 2 units tall), row 0 = top, negative inside */
  sdf: Float32Array
  w: number
  h: number
  /** content height / texture width and height, halved: face q → uv is 0.5 + q * k */
  k: [number, number]
  /** content aspect, width / height */
  aspect: number
}

let shape: ShapeImage | null = null
let version = 0
const subs = new Set<() => void>()

export const getShape = () => shape
export const shapeVersion = () => version
export const onShape = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn) } }

const RASTER = 2048 // first pass, to find the ink
const CONTENT = 640 // long edge of the ink in the distance field
const PAD = 0.3 // padding, as a share of the ink's height

/** 1D squared distance transform (Felzenszwalb & Huttenlocher, 2012). */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]) }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]] }
}
/** Distance (px) from every cell to the nearest cell where `on` is true. */
function edt(on: Uint8Array, w: number, h: number, want: number) {
  const INF = 1e20, g = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) g[i] = on[i] === want ? 0 : INF
  const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1)
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) g[y * w + x] = d[y] }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]) }
  return g
}

export type ShapeSource = { kind: 'svg'; src: string } | { kind: 'text'; text: string; font: string }

export const FONTS: Record<string, string> = {
  mono: '700 200px ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  sans: '800 200px InterVariable, Inter, system-ui, sans-serif',
  serif: '700 200px Georgia, "Times New Roman", serif',
}

/** Draw the source big enough to trim and resample cleanly. */
async function raster(source: ShapeSource) {
  const big = document.createElement('canvas')
  const bx = big.getContext('2d', { willReadFrequently: true })!
  if (source.kind === 'text') {
    const font = FONTS[source.font] ?? FONTS.mono
    await document.fonts.load(font, source.text).catch(() => undefined)
    bx.font = font
    const m = bx.measureText(source.text)
    big.width = Math.min(8192, Math.ceil(m.width) + 80); big.height = 320
    bx.font = font
    bx.textBaseline = 'middle'
    bx.fillText(source.text, 40, 160)
  } else {
    const img = new Image()
    img.src = source.src
    await img.decode()
    // SVGs with no width/height report 0 (or 150 × 150): draw them at full resolution regardless
    const w0 = img.naturalWidth || 1024, h0 = img.naturalHeight || 1024
    const k0 = RASTER / Math.max(w0, h0)
    big.width = Math.round(w0 * k0); big.height = Math.round(h0 * k0)
    bx.drawImage(img, 0, 0, big.width, big.height)
  }
  return { big, bx }
}

async function build(source: ShapeSource): Promise<ShapeImage | null> {
  const { big, bx } = await raster(source)
  // trim to the ink
  const a = bx.getImageData(0, 0, big.width, big.height).data
  let x0 = big.width, y0 = big.height, x1 = -1, y1 = -1
  for (let y = 0; y < big.height; y++) for (let x = 0; x < big.width; x++) {
    if (a[(y * big.width + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  if (x1 < 0) return null
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1
  const s = CONTENT / Math.max(cw, ch)
  const Wc = Math.max(1, Math.round(cw * s)), Hc = Math.max(1, Math.round(ch * s))
  const pad = Math.round(PAD * Hc + 8)
  const W = Wc + 2 * pad, H = Hc + 2 * pad
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const cx = c.getContext('2d', { willReadFrequently: true })!
  cx.drawImage(big, x0, y0, cw, ch, pad, pad, Wc, Hc)
  const px = cx.getImageData(0, 0, W, H).data
  const inside = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) inside[i] = px[i * 4 + 3] > 127 ? 1 : 0
  const toIn = edt(inside, W, H, 1), toOut = edt(inside, W, H, 0)
  const sdf = new Float32Array(W * H), unit = 2 / Hc
  for (let i = 0; i < W * H; i++) sdf[i] = (inside[i] ? -(toOut[i] - 0.5) : toIn[i] - 0.5) * unit
  return { sdf, w: W, h: H, k: [Hc / W / 2, Hc / H / 2], aspect: Wc / Hc }
}

let pending = ''
export async function loadShape(source: ShapeSource | null) {
  const key = JSON.stringify(source)
  pending = key
  const next = source ? await build(source) : null
  if (pending !== key) return // a newer source won
  shape = next
  version++
  subs.forEach((f) => f())
}

/* ---------- IndexedDB: one key, the dropped file as a data URL ---------- */
const DB = 'smiley-shader', STORE = 'assets', KEY = 'shape'
const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE)
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open()
  return new Promise<T>((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}
export const savedShape = () => tx<string | undefined>('readonly', (s) => s.get(KEY)).catch(() => undefined)
export const saveShape = (url: string | null) =>
  (url ? tx('readwrite', (s) => s.put(url, KEY)) : tx('readwrite', (s) => s.delete(KEY))).catch(() => undefined)
