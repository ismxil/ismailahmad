/* The live artwork. Full-bleed (Fill) or a fixed-ratio frame placed clear of
   the floating panels. Renders only when time moves or something changed,
   adapts its drawing resolution to hold the frame rate, and stops when the
   tab is hidden. When a Smiley is selected, it gets move, scale and rotate
   handles. */
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { TriangleAlert } from 'lucide-react'
import { useStudio, useValues } from '@kit'
import { ShaderRenderer } from './renderer'
import { structureKey } from './codegen'
import { bgOf, canvasSize, clock, FORMATS, getLayers, params, perf, ui, zoomBy } from './state'
import { onShape } from './shape-image'
import type { Layer } from './layers'
import { ShapeHandles } from './ShapeHandles'
import { useFitFrame } from '@kit/stage/fit-frame'

/** The live canvas + its CSS frame, for exports that size from what you see. */
export const live = { canvas: null as HTMLCanvasElement | null }

export function ShaderStage() {
  const { present } = useStudio()
  const format = useValues(params, (v) => v.format)
  const csW = useValues(params, (v) => canvasSize(v)?.w ?? 0)
  const csH = useValues(params, (v) => canvasSize(v)?.h ?? 0)
  const quality = useValues(params, (v) => v.quality)
  const previewing = useStore(ui, (s) => !!s.preview)
  const wrap = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const aspect = csW && csH ? csW / csH : null
  const selId = useStore(ui, (s) => s.selected)
  const board = useValues(params, (v) => v.layers.find((l: Layer) => l.id === selId && l.type === 'smiley' && l.visible) ?? null)
  const fit = useFitFrame(wrap, aspect, { pad: present ? 32 : 12 })
  // the view zoom scales the fitted frame about its centre, then pans it
  const zoom = useStore(ui, (s) => (aspect ? s.zoom : 1))
  const panX = useStore(ui, (s) => (aspect ? s.panX : 0))
  const panY = useStore(ui, (s) => (aspect ? s.panY : 0))
  const frame = { x: Math.round(fit.x + fit.w / 2 + panX - (fit.w * zoom) / 2), y: Math.round(fit.y + fit.h / 2 + panY - (fit.h * zoom) / 2), w: Math.round(fit.w * zoom), h: Math.round(fit.h * zoom) }
  const [panning, setPanning] = useState(false)
  const frameRef = useRef(frame)
  frameRef.current = frame
  useEffect(() => { if (fit.w && fit.h) ui.setState({ frameW: fit.w, frameH: fit.h, frameX: fit.x, frameY: fit.y }) }, [fit.w, fit.h, fit.x, fit.y])

  // ⌘/ctrl + wheel and trackpad pinch zoom at the pointer; a plain wheel pans once zoomed in
  useEffect(() => {
    const el = wrap.current
    if (!el || !aspect) return
    const onWheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        zoomBy(Math.exp(-e.deltaY * 0.01), { x: e.clientX - r.left, y: e.clientY - r.top })
      } else {
        const s = ui.getState()
        if (s.zoom <= 1.001 && !s.panX && !s.panY) return
        e.preventDefault()
        ui.setState({ panX: s.panX - e.deltaX, panY: s.panY - e.deltaY })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [aspect])

  // Middle-drag pans (Space is play / pause in this tool), ahead of the shape and canvas handles
  const panRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const onPanDown = (e: React.PointerEvent) => {
    if (!aspect || e.button !== 1) return
    e.preventDefault()
    e.stopPropagation()
    const s = ui.getState()
    panRef.current = { x: e.clientX, y: e.clientY, px: s.panX, py: s.panY }
    wrap.current!.setPointerCapture(e.pointerId)
    setPanning(true)
  }
  const onPanMove = (e: React.PointerEvent) => {
    const d = panRef.current
    if (d) ui.setState({ panX: d.px + e.clientX - d.x, panY: d.py + e.clientY - d.y })
  }
  const onPanUp = () => { panRef.current = null; setPanning(false) }
  const qualityRef = useRef(quality)
  qualityRef.current = quality

  useEffect(() => {
    const c = canvasRef.current!
    let r: ShaderRenderer
    try { r = new ShaderRenderer(c) } catch (e) { setError((e as Error).message); return }
    live.canvas = c
    let dirty = true
    let lastT = -1
    let last = performance.now()
    let avg = 16.7
    let auto = 1
    let since = 0
    let lastErr: string | null = null
    const mark = () => { dirty = true }
    let key = ''
    const offP = params.subscribe((st) => { dirty = true; const k = structureKey(st.values.layers); if (k !== key) { key = k; since = 0 } })
    const offU = ui.subscribe(mark)
    const offPh = onShape(mark)

    const tick = () => {
      if (document.hidden) return
      const now = performance.now()
      const dt = Math.min(250, now - last)
      last = now
      const v = params.values()
      const playing = clock.getState().playing && v.speed > 0
      if (playing) {
        avg = avg * 0.92 + dt * 0.08
        perf.fps = 1000 / avg
        perf.ms = avg
      }
      // Auto resolution: drop 15% when frames run long, creep back up when there is headroom.
      const q = qualityRef.current
      // Warm-up after mount / recompiles: first frames include shader compiles and thumbnails.
      if (q === 'auto' && playing && ++since > 60) {
        if (avg > 23 && auto > 0.35) { auto = Math.max(0.35, auto * 0.85); since = 0; avg = 16.7 }
        else if (avg < 17.4 && auto < 1 && since > 90) { auto = Math.min(1, auto * 1.12); since = 0 }
      }
      const s = q === 'auto' ? auto : Number(q) || 1
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const f = frameRef.current
      // zoomed far in, the backing store would outgrow the GPU: cap its long edge
      const cap = Math.min(1, 4096 / Math.max(1, Math.max(f.w, f.h) * dpr * s))
      const bw = Math.max(2, Math.round(f.w * dpr * s * cap))
      const bh = Math.max(2, Math.round(f.h * dpr * s * cap))
      if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; dirty = true }
      const t = clock.time()
      if (!dirty && t === lastT) return
      dirty = false
      lastT = t
      const u = ui.getState()
      r.render(u.preview?.layers ?? getLayers(v), { time: t / 1000, loop: v.loop, seed: u.preview?.seed ?? v.seed, bg: u.preview?.bg ?? v.bg, ...(u.preview ? {} : bgOf(v)) })
      perf.scale = s
      perf.res = `${bw} × ${bh}${q === 'auto' && s < 1 ? ` · ${Math.round(s * 100)}%` : ''}`
      if (r.error !== lastErr) { lastErr = r.error; setError(r.error) }
    }
    const offT = clock.onTick(tick)

    // Hidden tab: stop the clock (and therefore the GPU), resume where we were.
    let resume = false
    const onVis = () => {
      if (document.hidden) { resume = clock.getState().playing; if (resume) clock.pause() }
      else { if (resume) clock.play(); resume = false; last = performance.now(); dirty = true }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { offP(); offU(); offPh(); offT(); document.removeEventListener('visibilitychange', onVis); r.dispose(); if (live.canvas === c) live.canvas = null }
  }, [])

  const framed = !!aspect
  return (
    <div ref={wrap} className="absolute inset-0 overflow-hidden" style={{ background: framed ? undefined : '#000', cursor: panning ? 'grabbing' : undefined }}
      onPointerDownCapture={onPanDown} onPointerMove={onPanMove} onPointerUp={onPanUp} onPointerCancel={onPanUp}>
      <canvas
        ref={canvasRef}
        aria-label="Smiley artwork"
        role="img"
        className={framed ? 'absolute shadow-[var(--shadow-artboard)]' : 'absolute'}
        style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}
      />
      {board && !present && !previewing && frame.w > 0 && (
        <ShapeHandles layer={board} frame={frame} />
      )}
      {framed && !present && frame.w > 0 && (
        <>
          <div className="pointer-events-none absolute flex items-center gap-1.5 text-ui text-fg-faint no-select" style={{ left: frame.x, top: frame.y - 20 }}>
            <span>{FORMATS.find((f) => f.value === format)?.label.split(' · ')[0]}</span>
            <span className="tabular opacity-70">{csW} × {csH} px</span>
          </div>
          {!previewing && <CanvasResize frame={frame} w={csW} h={csH} />}
        </>
      )}
      {previewing && (
        <div className="pointer-events-none absolute top-[60px] left-1/2 -translate-x-1/2 rounded-full bg-overlay px-2.5 py-1 text-ui text-fg-muted shadow-[var(--shadow-cluster)]">
          Previewing — click to apply
        </div>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-20 mx-auto flex w-fit max-w-[520px] items-start gap-2 rounded-pop bg-overlay px-pad py-2 text-ui text-fg shadow-[var(--shadow-pop)]">
          <TriangleAlert size={14} strokeWidth={1.5} className="mt-px shrink-0 text-rec" />
          <span className="line-clamp-3 font-mono text-ui text-fg-muted">{error}</span>
        </div>
      )}
    </div>
  )
}

/* Drag the artboard's right edge, bottom edge or corner to set a custom size.
   The frame stays centred, so the size changes twice as fast as the edge
   moves on screen, keeping the edge under the pointer. One undo step. */
function CanvasResize({ frame, w, h }: { frame: { x: number; y: number; w: number; h: number }; w: number; h: number }) {
  const drag = useRef<{ x: number; y: number; w: number; h: number; k: number; ax: number; ay: number } | null>(null)
  const start = (ax: number, ay: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, w, h, k: w / frame.w, ax, ay }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const even = (n: number) => Math.max(16, Math.min(8192, Math.round(n / 2) * 2))
    let nw = d.w + d.ax * (e.clientX - d.x) * 2 * d.k
    let nh = d.h + d.ay * (e.clientY - d.y) * 2 * d.k
    if (e.shiftKey && d.ax && d.ay) { const s = Math.max(nw / d.w, nh / d.h); nw = d.w * s; nh = d.h * s }
    params.patch({ format: 'custom', size: { w: even(nw), h: even(nh) } }, { commit: false })
  }
  const end = () => { if (drag.current) { drag.current = null; params.commit('Resize canvas') } }
  const h_ = { onPointerMove: move, onPointerUp: end, onPointerCancel: end }
  const r = frame.x + frame.w, b = frame.y + frame.h
  return (
    <>
      <div aria-hidden title="Drag to resize the canvas" className="absolute touch-none" style={{ left: r - 3, top: frame.y, width: 8, height: frame.h, cursor: 'ew-resize' }} onPointerDown={start(1, 0)} {...h_} />
      <div aria-hidden title="Drag to resize the canvas" className="absolute touch-none" style={{ left: frame.x, top: b - 3, width: frame.w, height: 8, cursor: 'ns-resize' }} onPointerDown={start(0, 1)} {...h_} />
      <div aria-hidden title="Drag to resize the canvas (shift keeps the ratio)" className="absolute size-3 touch-none rounded-[2px] bg-white shadow-[0_0_0_1.5px_var(--signal)]" style={{ left: r - 6, top: b - 6, cursor: 'nwse-resize' }} onPointerDown={start(1, 1)} {...h_} />
    </>
  )
}
