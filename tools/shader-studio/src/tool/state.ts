/* ---------------------------------------------------------------------------
   Document state. Everything undoable lives in ONE param store — including the
   layer stack, a hidden `p.data<Layer[]>()` value. So ⌘Z, looks, A/B, share
   links and persistence all cover adding, deleting, reordering and editing
   layers.
--------------------------------------------------------------------------- */
import { createStore } from 'zustand/vanilla'
import { createClock, createParams, defineSchema, folder, p, toast } from '@kit'
import { LAYER_TYPES, makeLayer, newId, type Layer, type LayerType } from './layers'
import { randomPalette, rng } from './color'
import { loadShape, saveShape, savedShape, type ShapeSource } from './shape-image'

/* ---------- looks (built-in presets) ----------
   Colours from the Rueca palette and its tonal ramps (brand/data.js ruecaPalette,
   ruecaRamps). The first look, the default, is the logo's three dyes on walnut. */
const L = makeLayer
// Preset layers get ids from the look's name: a layer's id salts its noise, so a time-based id drew a different
// picture on every load (and the homepage thumbnail never matched the live shell)
const look = (name: string, bg: string, seed: number, layers: Layer[]) =>
  ({ name, values: { bg, seed, layers: layers.map((l, i) => ({ ...l, id: `${name.toLowerCase().replace(/\W+/g, '-')}-${i}` })) } })

/** A look that also sets the custom shape (Document → Custom shape) it draws. */
const withShape = <T extends { values: object }>(l: T, shape: { source: string; text: string; font: string }) => ({ ...l, values: { ...l.values, ...shape } })

export const LOOKS = [
  // Cadara brand: flat signal green, glossy black 3D objects (after its social posts)
  look('Cadara gloss', '#6BE45A', 4127, [
    L('smiley', { params: { render: '3d', material: 'gloss', color: '#0c0c0c', size: 0.6, spin: 1, yaw: -25, tilt: -10, wobble: 0.3, shadow: 0.25 } }),
  ]),
  look('Cadara op-art', '#F1F0EB', 3301, [
    L('smiley', { params: { render: '3d', material: 'gloss', color: '#0c0c0c', size: 0.58, spin: 1, scene: 0.35 } }),
    L('chevron', { params: { ink: '#6BE45A', paper: '#F1F0EB' } }),
  ]),
  look('Cadara screen', '#6BE45A', 5150, [
    L('smiley', { params: { render: '3d', material: 'dither', clear: true, color: '#0c0c0c', size: 0.62, cell: 3, spin: 1, light: 40, shadow: 0 } }),
  ]),
  look('Bayer smile', '#6BE45A', 6120, [
    L('smiley', { params: { render: '3d', material: 'dither', pattern: 'bayer8', clear: true, color: '#0c0c0c', size: 0.62, cell: 3, spin: 1, light: 40 } }),
  ]),
  // after the DELIBERACY reel: tiled text rows that scroll and flicker, sliced by a glitch
  withShape(look('Deliberacy', '#18E33C', 2718, [
    L('glitch', { params: { amount: 0.18, shift: 0.05, bands: 22, rate: 6, bar: 0.7, barColor: '#D7FF3A', barSize: 5 } }),
    L('smiley', { name: 'Text rows', params: { shape: 'svg', color: '#0c0c0c', size: 0.5, pos: { x: 0.5, y: 0.5 }, tile: true, gap: 0.55, scroll: -1, flicker: 0.75, beat: 0 } }),
  ]), { source: 'text', text: 'DELIBERACY', font: 'mono' }),
  // 1-bit screen-space dither, after 3D halftone renders
  look('Screen space', '#F1F0EB', 7240, [
    L('smiley', { params: { render: '3d', material: 'dither', color: '#111111', paper: '#F1F0EB', size: 0.62, cell: 3, spin: 1, light: 40, shadow: 0 } }),
  ]),
  // The smiley on top, the generated pattern as its background.
  look('Neon op-art', '#F4F4EF', 4127, [
    L('smiley'),
    L('chevron'),
  ]),
  look('Knockout', '#F4F4EF', 812, [
    L('smiley', { params: { fill: 'invert', size: 0.7 } }),
    L('grain', { blend: 'multiply', opacity: 0.14, params: { size: 1.4, animated: false } }),
    L('chevron', { params: { ink: '#FF2E88', tilt: 20, center: { x: 0, y: 0 }, radius: 0.95, outside: 'paper', pixel: 6, freq: 11 } }),
  ]),
  look('Flat zigzag', '#F4F4EF', 2290, [
    L('smiley', { params: { fill: 'outline', stroke: 0.05, color: '#111111' } }),
    L('chevron', { params: { ink: '#3D5BD6', bulge: 0, pixel: 0, freq: 14, amp: 0.6, period: 0.3, tilt: 0, speckle: 0.15, bevel: 0, flow: 1, spin: 0 } }),
  ]),
  look('Pixel sphere', '#FFD000', 5531, [
    L('smiley', { params: { fill: 'invert', size: 0.6 } }),
    L('chevron', { params: { ink: '#111111', paper: '#FFD000', pixel: 18, radius: 1.1, center: { x: 0, y: 0 }, freq: 7, bevel: 0.08 } }),
  ]),
  look('Chrome heart eyes', '#14070d', 913, [
    L('object', { name: 'Left eye', params: { shape: 'heart', material: 'chrome', color: '#ffd7e6', size: 0.24, pos: { x: 0.37, y: 0.64 }, spin: 1, scene: 0.5, shadow: 0 } }),
    L('object', { name: 'Right eye', params: { shape: 'heart', material: 'chrome', color: '#ffd7e6', size: 0.24, pos: { x: 0.63, y: 0.64 }, spin: -1, scene: 0.5, shadow: 0 } }),
    L('smiley', { params: { color: '#F5F3F2', eyeSize: 0.05 } }),
    L('warp', { params: { amount: 0.35, scale: 0.9, detail: 3, evolve: 0.5 } }),
    L('mesh', { params: { colors: ['#14070d', '#E5195E', '#FF8A3D', '#FFD6E5', '#5B2AE0'], softness: 0.6, drift: 0.7 } }),
  ]),
  // Gradient looks from upstream rueca's Gradient studio, with the smiley on top
  look('Achiote', '#171615', 4127, [
    L('smiley', { params: { color: '#F5F3F2' } }),
    L('grain', { params: { size: 1.2 } }),
    L('vignette', { opacity: 0.6 }),
    L('warp', { params: { amount: 0.3, scale: 0.85, detail: 3, evolve: 0.45 } }),
    L('mesh', { params: { colors: ['#171615', '#561600', '#F6571C', '#FFD000', '#5070F0'], softness: 0.62, drift: 0.65 } }),
  ]),
  look('Riso', '#F5F3F2', 2290, [
    L('smiley', { params: { color: '#F5F3F2' } }),
    L('grain', { blend: 'multiply', opacity: 0.18, params: { size: 2, animated: false } }),
    L('halftone', { params: { shape: 'dot', cell: 11, angle: 22, contrast: 1.2, inkMode: 'source', paper: '#F5F3F2' } }),
    L('warp', { params: { style: 'swirl', amount: 0.8, scale: 1.6, cycles: 1 } }),
    L('mesh', { params: { colors: ['#F6571C', '#3D5BD6', '#FFD000', '#F5F3F2', '#84C900'], softness: 0.5, drift: 0.7 } }),
  ]),
  look('Nocturne', '#0D0B0B', 5531, [
    L('smiley', { params: { color: '#F5F3F2' } }),
    L('scanlines', { opacity: 0.22, params: { pitch: 3.5, sharpness: 0.3, roll: 2 } }),
    L('vignette', { opacity: 0.85, params: { size: 0.45, softness: 1.1 } }),
    L('chromatic', { params: { amount: 9, radial: true } }),
    L('warp', { params: { amount: 0.5, scale: 1.1, detail: 4, evolve: 0.7 } }),
    L('mesh', { params: { colors: ['#0D0B0B', '#182768', '#B0006A', '#7088FF', '#421e49'], softness: 0.42, drift: 0.8 } }),
  ]),
]

/* ---------- canvas formats ---------- */
export const FORMATS = [
  { value: 'poster', label: 'Poster 4:5 · 1080 × 1350', w: 1080, h: 1350 },
  { value: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { value: 'story', label: 'Story 9:16 · 1080 × 1920', w: 1080, h: 1920 },
  { value: 'landscape', label: 'Landscape 16:9 · 1920 × 1080', w: 1920, h: 1080 },
  { value: 'board', label: 'Billboard 4:3 · 2400 × 1800', w: 2400, h: 1800 },
  { value: 'a4', label: 'A4 portrait · 2480 × 3508', w: 2480, h: 3508 },
  { value: 'custom', label: 'Custom size', w: 0, h: 0 },
  { value: 'fill', label: 'Fill window', w: 0, h: 0 },
] as const

/* ---------- schema ---------- */
export const perf = { fps: 60, ms: 16.7, scale: 1, res: '—' }

// Layers arrive from share links and saved looks — check each one names a known type (break-it S4).
const validLayers = (v: unknown) => Array.isArray(v) && v.every((l) =>
  !!l && typeof l === 'object' && typeof (l as Layer).id === 'string' && (l as Layer).type in LAYER_TYPES &&
  typeof (l as Layer).visible === 'boolean' && typeof (l as Layer).opacity === 'number' &&
  !!(l as Layer).params && typeof (l as Layer).params === 'object')

export const schema = defineSchema({
  // the look's own settings stay in the inspector; presets vary both
  canvas: folder('Canvas', {
    format: p.select('poster', FORMATS.map((f) => ({ value: f.value, label: f.label })), { display: 'dropdown', hint: 'The artwork size. Drag the canvas edges to set a custom size.' }),
    size: p.size({ w: 1080, h: 1350 }, { min: 16, max: 8192, label: 'Size (px)', hint: 'Output size in pixels. Exports render at exactly this size.', when: (v) => v.format === 'custom' }),
    seed: p.seed(LOOKS[0].values.seed, { hint: 'Reshuffles point positions and noise. R randomises colours too.' }),
  }),
  background: folder('Background', {
    bgMode: p.select('solid', [{ value: 'solid', label: 'Solid' }, { value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }], { label: 'Fill', hint: 'What shows beneath the bottom layer: one colour or a gradient.' }),
    bg: p.color(LOOKS[0].values.bg, { alpha: false, label: 'Colour', hint: 'The background, or where the gradient starts.' }),
    bg2: p.color('#F1F0EB', { alpha: false, label: 'To', when: (v) => v.bgMode !== 'solid' }),
    bgAngle: p.angle(180, { label: 'Angle', when: (v) => v.bgMode === 'linear' }),
  }),
  custom: folder('Text & SVG', {
    source: p.select('svg', [{ value: 'svg', label: 'SVG' }, { value: 'text', label: 'Text' }], { hint: 'What Text / SVG layers draw: an SVG you drop in, or a line of text.' }),
    custom: p.image(null, { label: 'SVG', accept: 'image/svg+xml,image/png,image/webp', hint: 'Drop an SVG (or a PNG with transparency). Its filled shapes become the shape. Kept in this browser.', when: (v) => v.source === 'svg' }),
    text: p.text('DELIBERACY', { multiline: false, when: (v) => v.source === 'text' }),
    font: p.select('mono', [{ value: 'mono', label: 'Mono' }, { value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }], { when: (v) => v.source === 'text' }),
  }),
  document: folder('Document', {
    loop: p.number(10, { min: 2, max: 30, step: 0.5, unit: 's', label: 'Loop length', hint: 'All motion repeats exactly once per loop, so recordings tile.' }),
  }, { place: 'settings' }),
  // the transport is home to speed, resolution and the frame rate, so <SettingsMenu> leaves these out
  time: folder('Time', {
    speed: p.number(1, { min: 0, max: 3, step: 0.05, unit: '×', hint: 'Playback rate. Video exports keep the loop seamless at any speed.' }),
  }, { place: 'settings' }),
  render: folder('Render', {
    quality: p.select('auto', [{ value: 'auto', label: 'Auto' }, { value: '0.5', label: '50%' }, { value: '0.75', label: '75%' }, { value: '1', label: '100%' }], { label: 'Resolution', hint: 'Auto lowers the drawing resolution when the frame rate drops, and raises it again when there is headroom.' }),
    fps: p.monitor(() => perf.fps, { label: 'Frame rate', graph: true, min: 0, max: 75, fmt: (v) => `${Math.round(v)} fps` }),
    drawing: p.monitor(() => perf.res, { label: 'Drawing at' }),
  }, { collapsed: true, place: 'settings' }),
  // never rendered as a row; the layers panel edits it. Shared, so a link carries the whole look.
  stack: folder('Stack', { layers: p.data<Layer[]>(LOOKS[0].values.layers, { label: 'Layers', share: true, validate: validLayers }) }),
})

export const LOOK_KEYS = ['layers', 'bg', 'seed'] as const
// "Save current look" captures the stack + background + seed, never canvas or playback settings.
export const params = createParams(schema, { id: 'smiley-shader', presets: LOOKS, presetKeys: [...LOOK_KEYS] })
export type V = ReturnType<typeof params.values>

export const lookOf = (v: V) => ({ layers: v.layers, bg: v.bg, seed: v.seed })

/* ---------- clock: one loop, rate = speed ---------- */
export const clock = createClock({ duration: params.values().loop * 1000, loop: true, fps: 60 })
clock.setRate(params.values().speed)
params.subscribe((s, prev) => {
  if (s.values.loop !== prev.values.loop) clock.setState({ duration: s.values.loop * 1000 })
  if (s.values.speed !== prev.values.speed) clock.setRate(s.values.speed)
})

/** The artwork's output size in px, or null when it fills the window. */
export function canvasSize(v: { format: string; size: { w: number; h: number } } = params.values()) {
  if (v.format === 'fill') return null
  if (v.format === 'custom') return v.size
  const f = FORMATS.find((x) => x.value === v.format) ?? FORMATS[0]
  return { w: f.w, h: f.h }
}
// Switching from a preset to Custom starts from the preset's size.
params.subscribe((s, prev) => {
  if (s.values.format !== 'custom' || prev.values.format === 'custom' || prev.values.format === 'fill') return
  const from = canvasSize(prev.values)
  if (from) params.setValue('size', from, { commit: false })
})

/* ---------- custom shape: the param holds the drop, IndexedDB keeps it across reloads ---------- */
const shapeSource = (v = params.values()): ShapeSource | null =>
  v.source === 'text' ? (v.text.trim() ? { kind: 'text', text: v.text, font: v.font } : null) : v.custom ? { kind: 'svg', src: v.custom } : null

let restoring = false
export async function restoreShape() {
  const saved = await savedShape()
  restoring = true
  if (saved) params.setValue('custom', saved, { commit: false })
  restoring = false
  await loadShape(shapeSource()).catch(() => loadShape(null))
}
params.subscribe((s, prev) => {
  const v = s.values, o = prev.values
  if (v.custom !== o.custom) saveShape(v.custom)
  if (v.custom === o.custom && v.source === o.source && v.text === o.text && v.font === o.font) return
  loadShape(shapeSource(v)).catch(() => toast('Could not read that file', { type: 'error' }))
  // A new SVG or text takes the smiley's place, unless a layer already draws the custom shape
  const fresh = (v.source === 'svg' && v.custom && v.custom !== o.custom) || (v.source === 'text' && (v.text !== o.text || v.source !== o.source))
  if (fresh && !restoring && !v.layers.some((l: Layer) => l.type === 'smiley' && l.params.shape === 'svg' && l.visible)) {
    queueMicrotask(() => { if (replaceSmiley()) toast('Your shape replaced the smiley', { type: 'success', description: 'Same style. Switch back in Text & SVG → Style.' }) })
  }
})

/** The background gradient's uniforms, from the document values. */
export const bgOf = (v: { bg2: string; bgMode: string; bgAngle: number }) =>
  ({ bg2: v.bg2, bgMode: ['solid', 'linear', 'radial'].indexOf(v.bgMode), bgAngle: v.bgAngle })

/* ---------- ui state (not undoable) ---------- */
export interface Look { layers: Layer[]; bg: string; seed: number }
export const ui = createStore<{
  selected: string | null; preview: Look | null
  /** the fitted frame (zoom 1), in stage px */
  frameW: number; frameH: number; frameX: number; frameY: number
  /** view zoom relative to fit, and pan in stage px — the view only, never undoable or exported */
  zoom: number; panX: number; panY: number
}>(() => ({ selected: null, preview: null, frameW: 1280, frameH: 720, frameX: 0, frameY: 0, zoom: 1, panX: 0, panY: 0 }))

/* ---------- view zoom ---------- */
const Z_MIN = 0.1, Z_MAX = 32
/** Zoom to `z` (relative to fit), keeping the stage point `at` still; the frame's centre by default. */
export function zoomTo(z: number, at?: { x: number; y: number }) {
  const s = ui.getState()
  const nz = Math.min(Z_MAX, Math.max(Z_MIN, z))
  const cx = s.frameX + s.frameW / 2, cy = s.frameY + s.frameH / 2
  const ax = at ? at.x : cx + s.panX, ay = at ? at.y : cy + s.panY
  const k = nz / s.zoom
  ui.setState({ zoom: nz, panX: ax - cx - (ax - cx - s.panX) * k, panY: ay - cy - (ay - cy - s.panY) * k })
}
export const zoomBy = (f: number, at?: { x: number; y: number }) => zoomTo(ui.getState().zoom * f, at)
export const zoomFit = () => ui.setState({ zoom: 1, panX: 0, panY: 0 })
/** Zoom so one output pixel is one screen point (100%). Fill window is always 100%. */
export const zoomActual = (pct = 1) => { const c = canvasSize(); if (c) zoomTo((c.w * pct) / ui.getState().frameW) }
/** Output pixels per screen point, as a percentage. */
export const zoomPct = (s = ui.getState()) => { const c = canvasSize(); return c ? Math.round((s.zoom * s.frameW / c.w) * 100) : 100 }

/* ---------- layer operations: each is one undo step ---------- */
export const getLayers = (v: V = params.values()) => v.layers
export const setLayers = (next: Layer[], commit = true, label?: string) => params.setValue('layers', next, { commit, label })
const nameOf = (id: string) => getLayers().find((l) => l.id === id)?.name ?? 'layer'

export function updateLayer(id: string, fn: (l: Layer) => Layer, commit = true, label?: string) {
  setLayers(getLayers().map((l) => (l.id === id ? fn(l) : l)), commit, label)
}

export function addLayer(type: LayerType) {
  const layers = getLayers()
  const sel = ui.getState().selected
  const at = Math.max(0, layers.findIndex((l) => l.id === sel))
  const layer = makeLayer(type)
  const next = [...layers]
  next.splice(sel ? at : 0, 0, layer)
  setLayers(next, true, `Add ${LAYER_TYPES[type].label.toLowerCase()}`)
  ui.setState({ selected: layer.id })
}

/** Add a pattern as the background: the bottom of the stack. */
export function addBackgroundLayer(type: LayerType) {
  const layer = makeLayer(type)
  setLayers([...getLayers(), layer], true, `Add ${LAYER_TYPES[type].label.toLowerCase()} background`)
  ui.setState({ selected: layer.id })
}

/** Swap a smiley for the custom shape in place, keeping its style (3D, material, colour, size…).
 *  The selected Smiley layer, or the top one. Returns false when there is none. */
export function replaceSmiley() {
  const layers = getLayers()
  const sel = layers.find((l) => l.id === ui.getState().selected && l.type === 'smiley')
  const l = sel ?? layers.find((x) => x.type === 'smiley' && x.params.shape === 'smiley')
  if (!l) return false
  setLayers(layers.map((x) => (x.id === l.id ? { ...x, name: x.name === 'Smiley' ? 'Text / SVG' : x.name, params: { ...x.params, shape: 'svg' } } : x)), true, 'Replace smiley with your shape')
  ui.setState({ selected: l.id })
  return true
}

/** Add a layer that draws the custom shape (Document → Text & SVG), flat or in 3D, on top. */
export function addShapeLayer(render: 'flat' | '3d' = 'flat') {
  const layer = makeLayer('smiley', { name: 'Text / SVG', params: { shape: 'svg', render, color: '#0c0c0c', beat: 0, size: 0.35 } })
  setLayers([layer, ...getLayers()], true, 'Add text / SVG')
  ui.setState({ selected: layer.id })
}

export function removeLayer(id: string) {
  const layers = getLayers()
  const i = layers.findIndex((l) => l.id === id)
  if (i < 0) return
  const next = layers.filter((l) => l.id !== id)
  setLayers(next, true, `Remove ${nameOf(id)}`)
  ui.setState({ selected: next[Math.min(i, next.length - 1)]?.id ?? null })
}

export function duplicateLayer(id: string) {
  const layers = getLayers()
  const i = layers.findIndex((l) => l.id === id)
  if (i < 0) return
  const src = structuredClone(layers[i])
  const copy: Layer = { ...src, id: newId(), name: `${src.name} copy` }
  const next = [...layers]
  next.splice(i, 0, copy)
  setLayers(next, true, `Duplicate ${src.name}`)
  ui.setState({ selected: copy.id })
}

export function moveLayer(id: string, to: number) {
  const layers = [...getLayers()]
  const from = layers.findIndex((l) => l.id === id)
  if (from < 0) return
  const [it] = layers.splice(from, 1)
  layers.splice(Math.max(0, Math.min(layers.length, to)), 0, it)
  setLayers(layers, true, `Move ${it.name}`)
}

export const moveBy = (id: string, d: number) => { const i = getLayers().findIndex((l) => l.id === id); if (i >= 0) moveLayer(id, i + d) }

/* ---------- randomise: one commit, keeps the stack's structure ---------- */
export function randomise() {
  const seed = Math.floor(Math.random() * 99999)
  const r = rng(seed ^ 0x9e3779b9)
  const pal = randomPalette(seed)
  const layers = getLayers().map((l): Layer => {
    switch (l.type) {
      case 'mesh': return { ...l, params: { ...l.params, colors: pal, softness: 0.35 + r() * 0.45, drift: 0.35 + r() * 0.7 } }
      case 'gradmap': return { ...l, params: { ...l.params, colors: [pal[0], pal[Math.floor(pal.length / 2)], pal.at(-1)!] } }
      case 'gradient': return { ...l, params: { ...l.params, ramp: { angle: Math.round(r() * 360), stops: pal.slice(0, 3).map((c, i) => ({ pos: i / 2, color: c })) } } }
      case 'warp': return { ...l, params: { ...l.params, amount: +(0.2 + r() * 0.7).toFixed(2), scale: +(0.8 + r() * 1.8).toFixed(2) } }
      case 'halftone': return { ...l, params: { ...l.params, angle: Math.round(r() * 90) } }
      case 'object': return { ...l, params: { ...l.params, color: pal[Math.floor(r() * pal.length)], yaw: Math.round(r() * 360), light: Math.round(r() * 360) } }
      default: return l
    }
  })
  params.patch({ seed, layers }, { label: 'Randomise' })
}
