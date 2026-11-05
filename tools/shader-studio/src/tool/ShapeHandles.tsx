/* Move, scale and rotate handles for the selected Smiley, over the live
   canvas. Drag the box to move, a corner to scale (about the centre), the
   knob above it to rotate (shift snaps to 15°). Each drag is one undo step;
   arrow keys nudge the focused box (shift = 10×). */
import { useRef, useSyncExternalStore } from 'react'
import { params, updateLayer } from './state'
import type { Layer } from './layers'
import { getShape, onShape, shapeVersion } from './shape-image'

const shapeAspect = () => getShape()?.aspect ?? 1

type Frame = { x: number; y: number; w: number; h: number }
type Drag =
  | { kind: 'move'; x0: number; y0: number; pos: { x: number; y: number } }
  | { kind: 'scale'; d0: number; size: number }
  | { kind: 'rotate'; a0: number; angle: number }
  | { kind: 'stretch'; axis: 'x' | 'y'; p0: number; stretch: { x: number; y: number } }

const r4 = (n: number) => Math.round(n * 10000) / 10000

export function ShapeHandles({ layer, frame }: { layer: Layer; frame: Frame }) {
  const v = layer.params
  // shader: q = rot(-angle) * (p - pos) * (asp, 1) / (size / 2), p y-up → box half-height = size / 2 frame heights
  const cx = v.pos.x * frame.w, cy = (1 - v.pos.y) * frame.h
  // the smiley fills a size × size box; your shape fits inside it, keeping its own aspect
  useSyncExternalStore(onShape, shapeVersion) // re-measure when your shape loads
  const a = v.shape === 'svg' ? shapeAspect() : 1
  const st = v.stretch ?? { x: 1, y: 1 }
  const halfW = (v.size / 2) * frame.h * Math.min(1, a) * st.x
  const half = (v.size / 2) * frame.h / Math.max(1, a) * st.y
  // the box's own axes on screen (it turns counter-clockwise by angle)
  const th = (v.angle * Math.PI) / 180
  const ax = { x: Math.cos(th), y: -Math.sin(th) }, ay = { x: -Math.sin(th), y: -Math.cos(th) }
  const drag = useRef<Drag | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const set = (patch: Record<string, unknown>, commit: boolean, label: string) =>
    updateLayer(layer.id, (l) => ({ ...l, params: { ...l.params, ...patch } }), commit, label)
  const local = (e: React.PointerEvent) => {
    const r = rootRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const start = (e: React.PointerEvent, d: Drag) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = d
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const at = local(e)
    if (d.kind === 'move') {
      set({ pos: { x: r4(d.pos.x + (at.x - d.x0) / frame.w), y: r4(d.pos.y - (at.y - d.y0) / frame.h) } }, false, 'Move smiley')
    } else if (d.kind === 'scale') {
      const dist = Math.hypot(at.x - cx, at.y - cy)
      set({ size: r4(Math.max(0.05, d.size * dist / Math.max(d.d0, 1))) }, false, 'Scale smiley')
    } else if (d.kind === 'stretch') {
      const dir = d.axis === 'x' ? ax : ay
      const p = Math.abs((at.x - cx) * dir.x + (at.y - cy) * dir.y)
      const k = Math.max(0.1, Math.min(5, d.stretch[d.axis] * p / Math.max(d.p0, 1)))
      set({ stretch: { ...d.stretch, [d.axis]: r4(k) } }, false, 'Stretch shape')
    } else {
      let a = d.angle + (d.a0 - Math.atan2(at.y - cy, at.x - cx)) * 180 / Math.PI
      if (e.shiftKey) a = Math.round(a / 15) * 15
      a = ((a % 360) + 540) % 360 - 180
      set({ angle: Math.round(a * 10) / 10 }, false, 'Rotate smiley')
    }
  }
  const end = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    params.commit(d.kind === 'move' ? 'Move smiley' : d.kind === 'scale' ? 'Scale smiley' : d.kind === 'stretch' ? 'Stretch shape' : 'Rotate smiley')
  }
  const handlers = { onPointerMove: move, onPointerUp: end, onPointerCancel: end }

  const corner = 'pointer-events-auto absolute size-2.5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-[2px] bg-white shadow-[0_0_0_1.5px_var(--signal)]'
  return (
    <div ref={rootRef} className="pointer-events-none absolute" style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}>
      <div
        className="absolute"
        style={{ left: cx - halfW, top: cy - half, width: halfW * 2, height: half * 2, transform: `rotate(${-v.angle}deg)` }}
      >
        <button
          type="button"
          aria-label="Smiley — drag to move, arrow keys to nudge"
          className="pointer-events-auto absolute inset-0 touch-none outline outline-1 outline-[var(--signal)] focus-visible:outline-2"
          style={{ cursor: 'move', background: 'transparent' }}
          onPointerDown={(e) => { const at = local(e); start(e, { kind: 'move', x0: at.x, y0: at.y, pos: { ...v.pos } }) }}
          onKeyDown={(e) => {
            const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
            if (!dir) return
            e.preventDefault()
            e.stopPropagation()
            const step = e.shiftKey ? 10 : 1
            set({ pos: { x: r4(v.pos.x + dir[0] * step / frame.w), y: r4(v.pos.y + dir[1] * step / frame.h) } }, true, 'Nudge smiley')
          }}
          {...handlers}
        />
        {[[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => (
          <span key={`${x}${y}`} aria-hidden className={corner}
            style={{ left: `${x * 100}%`, top: `${y * 100}%`, cursor: (x ^ y) ? 'nesw-resize' : 'nwse-resize' }}
            onPointerDown={(e) => { const at = local(e); start(e, { kind: 'scale', d0: Math.hypot(at.x - cx, at.y - cy), size: v.size }) }}
            {...handlers} />
        ))}
        {([['x', 0, 0.5], ['x', 1, 0.5], ['y', 0.5, 0], ['y', 0.5, 1]] as const).map(([axis, x, y]) => (
          <span key={`${axis}${x}${y}`} aria-hidden title={axis === 'x' ? 'Stretch the width' : 'Stretch the height'}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 touch-none rounded-full bg-white shadow-[0_0_0_1.5px_var(--signal)]"
            style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: axis === 'x' ? 6 : 14, height: axis === 'x' ? 14 : 6, cursor: axis === 'x' ? 'ew-resize' : 'ns-resize' }}
            onPointerDown={(e) => {
              const at = local(e), dir = axis === 'x' ? ax : ay
              start(e, { kind: 'stretch', axis, p0: Math.abs((at.x - cx) * dir.x + (at.y - cy) * dir.y), stretch: { ...st } })
            }}
            {...handlers} />
        ))}
        <span aria-hidden className="pointer-events-auto absolute left-1/2 h-4 w-px -translate-x-1/2 bg-[var(--signal)]" style={{ top: -16 }} />
        <span aria-hidden title="Rotate (shift snaps to 15°)"
          className="pointer-events-auto absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full bg-white shadow-[0_0_0_1.5px_var(--signal)]"
          style={{ top: -18, cursor: 'grab' }}
          onPointerDown={(e) => { const at = local(e); start(e, { kind: 'rotate', a0: Math.atan2(at.y - cy, at.x - cx), angle: v.angle }) }}
          {...handlers} />
      </div>
    </div>
  )
}
