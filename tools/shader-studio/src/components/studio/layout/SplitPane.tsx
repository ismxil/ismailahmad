import { useId, useRef, useState, type ReactNode } from 'react'
import { clamp, cn } from '../core/cn'

export interface SplitPaneProps {
  a: ReactNode
  b: ReactNode
  /** persistence key for the uncontrolled ratio */
  id?: string
  orientation?: 'horizontal' | 'vertical'
  show?: 'both' | 'a' | 'b'
  ratio?: number
  onRatioChange?: (r: number) => void
  defaultRatio?: number
  min?: number
  max?: number
  /** accessible name of the separator */
  label?: string
  className?: string
}

const read = (key: string | null, fallback: number) => {
  if (!key) return fallback
  try { const v = Number(localStorage.getItem(key)); return v > 0 && v < 1 ? v : fallback } catch { return fallback }
}

export function SplitPane({
  a, b, id, orientation = 'horizontal', show = 'both', ratio: controlled, onRatioChange, defaultRatio = 0.55, min = 0.2, max = 0.8,
  label = 'Resize panes', className,
}: SplitPaneProps) {
  const key = id ? `studio:${id}:split` : null
  const [own, setOwn] = useState(() => read(key, defaultRatio))
  const ratio = clamp(controlled ?? own, min, max)
  const [drag, setDrag] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const paneId = useId()
  const horizontal = orientation === 'horizontal'

  const setRatio = (r: number) => {
    const v = clamp(r, min, max)
    if (controlled === undefined) {
      setOwn(v)
      if (key) try { localStorage.setItem(key, String(v)) } catch { /* private mode */ }
    }
    onRatioChange?.(v)
  }

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    ;(e.currentTarget as HTMLElement).focus()
    setDrag(true)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag || !root.current) return
    const r = root.current.getBoundingClientRect()
    setRatio(horizontal ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height)
  }
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02
    const less = horizontal ? 'ArrowLeft' : 'ArrowUp'
    const more = horizontal ? 'ArrowRight' : 'ArrowDown'
    if (e.key === less) { e.preventDefault(); setRatio(ratio - step) }
    else if (e.key === more) { e.preventDefault(); setRatio(ratio + step) }
    else if (e.key === 'Home') { e.preventDefault(); setRatio(min) }
    else if (e.key === 'End') { e.preventDefault(); setRatio(max) }
    else if (e.key === 'Enter') { e.preventDefault(); setRatio(defaultRatio) }
  }

  const both = show === 'both'
  return (
    <div ref={root} className={cn('flex h-full w-full min-h-0 min-w-0', !horizontal && 'flex-col', drag && (horizontal ? 'cursor-col-resize' : 'cursor-row-resize'), drag && 'select-none', className)}>
      <div id={paneId} className={cn('relative min-h-0 min-w-0', show === 'b' && 'hidden')} style={{ flex: both ? `${ratio} 1 0` : '1 1 0' }}>{a}</div>
      {both && (
        <div
          role="separator"
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-label={label}
          aria-controls={paneId}
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={Math.round(min * 100)}
          aria-valuemax={Math.round(max * 100)}
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => setDrag(false)}
          onPointerCancel={() => setDrag(false)}
          onDoubleClick={() => setRatio(defaultRatio)}
          onKeyDown={onKey}
          className={cn('group/split relative flex shrink-0 touch-none items-center justify-center outline-none',
            horizontal ? 'w-[var(--gutter)] cursor-col-resize' : 'h-[var(--gutter)] cursor-row-resize')}
        >
          <span className={cn('rounded-full transition-colors', horizontal ? 'h-10 w-[3px]' : 'h-[3px] w-10',
            drag ? 'bg-signal' : 'bg-transparent group-hover/split:bg-line-strong group-focus-visible/split:bg-signal')} />
        </div>
      )}
      <div className={cn('relative min-h-0 min-w-0', show === 'a' && 'hidden')} style={{ flex: both ? `${1 - ratio} 1 0` : '1 1 0' }}>{b}</div>
    </div>
  )
}
