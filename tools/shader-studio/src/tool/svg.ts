/* The Smiley layer as a real SVG, from the same numbers the shader draws.
   Drawn in face space (−1…1, y up) inside a flipped group, so arc sweep 1 is
   counter-clockwise. Hearts: Inigo Quilez's heart is a square on its tip plus
   two half circles; the smile is a ring cut by a tilted line. */
import { copyText, download, toast } from '@kit'
import type { Layer } from './layers'
import { getLayers, ui } from './state'

const f = (n: number) => +n.toFixed(4)
const R = Math.SQRT2 / 4
const HEART = `M0 0L.5 .5A${f(R)} ${f(R)} 0 0 1 0 1A${f(R)} ${f(R)} 0 0 1 -.5 .5Z`

function smilePath(ra: number, th: number, cy: number, cut: number, tiltDeg: number) {
  const c = (tiltDeg * Math.PI) / 180
  const ro = ra + th / 2, ri = Math.max(1e-3, ra - th / 2)
  const ends = (r: number) => {
    const k = Math.asin(Math.max(-0.999, Math.min(0.999, cut / r)))
    return [c + Math.PI - k, c + 2 * Math.PI + k]
  }
  const pt = (r: number, a: number) => `${f(r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`
  const [ao, bo] = ends(ro), [ai, bi] = ends(ri)
  return `M${pt(ro, ao)}A${f(ro)} ${f(ro)} 0 ${bo - ao > Math.PI ? 1 : 0} 1 ${pt(ro, bo)}` +
    `L${pt(ri, bi)}A${f(ri)} ${f(ri)} 0 ${bi - ai > Math.PI ? 1 : 0} 0 ${pt(ri, ai)}Z`
}

export function smileySVG(l: Layer, px = 1024) {
  const v = l.params
  const outline = v.fill === 'outline'
  const paint = outline
    ? `fill="none" stroke="${v.color}" stroke-width="${f(v.stroke)}" stroke-linejoin="round"`
    : `fill="${v.fill === 'invert' ? '#000000' : v.color}"`
  const heart = (side: -1 | 1) =>
    `<path d="${HEART}" transform="translate(${f(side * v.eyeX)} ${f(v.eyeY)}) rotate(${f(-side * v.eyeTilt)}) scale(${f(v.eyeSize)}) translate(0 -.5)"${outline ? ` vector-effect="non-scaling-stroke"` : ''}/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2" width="${px}" height="${px}">
  <g ${paint} transform="scale(1 -1)">
    ${heart(-1)}
    ${heart(1)}
    <path d="${smilePath(v.smileR, v.thick, v.smileY, v.cut, v.cutTilt)}"/>
  </g>
</svg>
`
}

/** The selected Smiley, else the top one. */
const target = () => {
  const layers = getLayers().filter((l) => l.type === 'smiley' && l.params.shape === 'smiley')
  return layers.find((l) => l.id === ui.getState().selected) ?? layers[0] ?? null
}

export async function copySmileySVG() {
  const l = target()
  if (!l) return toast('No smiley layer to export', { type: 'error' })
  const ok = await copyText(smileySVG(l))
  toast(ok ? 'SVG copied' : 'Clipboard blocked', { type: ok ? 'success' : 'error' })
}

export function downloadSmileySVG() {
  const l = target()
  if (!l) return toast('No smiley layer to export', { type: 'error' })
  download(new Blob([smileySVG(l)], { type: 'image/svg+xml' }), 'smiley.svg')
}
