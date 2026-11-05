/* ---------------------------------------------------------------------------
   Effect layer types. Each type is: a kit schema (drives its inspector), the
   uniforms it needs, and a GLSL snippet. codegen.ts stitches the visible
   stack into ONE fragment shader — so the stack you see is exactly the code
   you copy out.

   Additions in this tool (not upstream rueca): Smiley is the editable
   vector shape (or any SVG you drop in), Op-art chevrons is a pattern
   generator after screen-printed op-art posters, and 3D object raymarches a
   lit SDF shape that reflects and refracts the layers below it.

   Three kinds of layer:
     fill      produces a colour `s` (+ coverage) composited onto what is below
               with a blend mode and opacity (gradients, grain, vignette…)
     domain    bends the coordinates of everything below it (warp)
     resample  re-reads what is below at other coordinates (halftone, RGB split)
--------------------------------------------------------------------------- */
import { Aperture, Blend, Box, Contrast, Focus, Grid3x3, Grip, Rainbow, Rows3, Smile, Waves, Zap, type LucideIcon } from 'lucide-react'
import { Grain, Gradient } from './icons'
import { defineSchema, folder, p, defaultsOf, type Schema } from '@kit'
import { hexToOklab, hexToRgb01 } from './color'

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light' | 'add' | 'difference'
export const BLENDS: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft light' },
  { value: 'hard-light', label: 'Hard light' },
  { value: 'add', label: 'Add' },
  { value: 'difference', label: 'Difference' },
]

export type LayerType = 'smiley' | 'mesh' | 'gradient' | 'chevron' | 'object' | 'warp' | 'chromatic' | 'halftone' | 'posterize' | 'gradmap' | 'dither' | 'glitch' | 'grain' | 'vignette' | 'scanlines'

export interface Layer {
  id: string
  type: LayerType
  name: string
  visible: boolean
  blend: BlendMode
  opacity: number
  params: Record<string, any>
}

type Uni = { name: string; type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'vec3[8]' | 'float[8]'; get: (p: any) => number | number[] }

export interface LayerTypeDef {
  type: LayerType
  label: string
  category: 'Shape' | 'Fill' | '3D' | 'Distort' | 'Stylise' | 'Finish'
  icon: LucideIcon
  kind: 'fill' | 'domain' | 'resample'
  hint: string
  schema: Schema
  blend: BlendMode
  opacity: number
  uniforms: Uni[]
  /** GLSL. `u('x')` is this layer's uniform, `prev` the function that renders everything below. */
  glsl: (u: (n: string) => string, prev: string) => string
}

/* --- helpers for uniform packing --- */
const lab8 = (colors: string[]) => { const out: number[] = []; for (let i = 0; i < 8; i++) out.push(...hexToOklab(colors[Math.min(i, colors.length - 1)] ?? '#000000')); return out }
const rgb = (hex: string) => hexToRgb01(hex) as number[]
const idx = (opts: string[]) => (v: string) => Math.max(0, opts.indexOf(v))

const WARP_STYLES = ['flow', 'swirl', 'waves', 'ripple']
const GRAD_SHAPES = ['linear', 'radial', 'conic']
const HT_SHAPES = ['dot', 'line', 'square']
export const SHAPES = ['sphere', 'torus', 'cube', 'capsule', 'heart', 'blob', 'twist', 'arc', 'smiley', 'svg']
const MATERIALS = ['gloss', 'chrome', 'glass', 'clay', 'pearl', 'toon', 'dither']
export const MATERIALS_LIST = () => MATERIALS.map((m) => ({ value: m, label: MATERIAL_LABEL[m] }))
const MATERIAL_LABEL: Record<string, string> = { gloss: 'Black gloss', chrome: 'Chrome', glass: 'Glass', clay: 'Clay', pearl: 'Pearl', toon: 'Toon', dither: 'Screen dither' }
const SMILEY_SHAPES = ['smiley', 'svg']
export const DITHERS = ['lines', 'bayer4', 'bayer8', 'halftone', 'crosshatch', 'noise']
export const DITHER_LABEL: Record<string, string> = { lines: 'Scanlines', bayer4: 'Bayer 4×4', bayer8: 'Bayer 8×8', halftone: 'Halftone dots', crosshatch: 'Crosshatch', noise: 'Noise' }
const SMILEY_FILLS = ['solid', 'invert', 'outline']
const OUTSIDE = ['ink', 'paper', 'pattern']

/** Lit 3D shading shared by the 3D object and the Smiley's 3D mode. `march` is an objMarch(...) call.
 *  Needs the uniforms pos, size, material, color, paper, ior, scene, shift, cell, light, shadow. */
const shade3d = (u: (n: string) => string, prev: string, march: string) => `
    float asp = uRes.x / uRes.y;
    vec2 a2 = vec2(1.0 / asp, 1.0);
    ObjHit h = ${march};
    vec3 L = normalize(vec3(cos(radians(${u('light')})), sin(radians(${u('light')})), 0.9));
    // contact shadow: a soft ellipse thrown away from the light, under the object
    vec2 sq = (p - ${u('pos')}) * vec2(asp, 1.0) / (${u('size')} * 0.5) + L.xy * 0.3 + vec2(0.0, 0.55);
    float sh = ${u('shadow')} * (1.0 - smoothstep(0.15, 1.05, length(sq * vec2(0.9, 2.2)))) * 0.8;
    vec3 base = b * (1.0 - sh);
    vec3 col = base;
    if (h.cover > 0.001) {
      int m = ${u('material')};
      vec3 r = reflect(h.rd, h.n);
      vec3 envScene = (m == 0 || m == 1 || m == 2 || m == 4) ? ${prev}(clamp(p + r.xy * 0.22 * a2, 0.0, 1.0)) : b;
      vec3 refr = b;
      if (m == 2) {
        vec3 rf = refract(h.rd, h.n, 1.0 / ${u('ior')});
        refr = ${prev}(clamp(p + (rf.xy - h.rd.xy) * 0.28 * ${u('size')} * a2, 0.0, 1.0));
      }
      vec3 c = shadeObj(h, m, ${u('color')}, ${u('clear')} > .5 ? base : ${u('paper')}, L, envScene, refr, ${u('scene')}, ${u('shift')}, ${u('cell')});
      col = mix(base, c, h.cover);
    }
    s = vec4(col, 1.0);`

/** Material knobs shared by the 3D object and the Smiley's 3D mode. */
const materialKnobs = (when: (v: any) => boolean = () => true, withColor = true) => ({
  material: p.select('gloss', MATERIALS.map((m) => ({ value: m, label: MATERIAL_LABEL[m] })), { display: 'dropdown', hint: 'Gloss is black lacquer; chrome and pearl reflect the layers below; glass refracts them; screen dither is a 1-bit print look.', when }),
  ...(withColor ? { color: p.color('#0c0c0c', { alpha: false, label: 'Colour', when }) } : {}),
  clear: p.boolean(false, { label: 'See-through', hint: 'The light tone shows the background, so only the ink reveals the shape.', when: (v) => when(v) && v.material === 'dither' }),
  paper: p.color('#F1F0EB', { alpha: false, label: 'Screen colour', hint: 'The light tone of the dither.', when: (v) => when(v) && v.material === 'dither' && !v.clear }),
  pattern: p.select('lines', DITHERS.map((d) => ({ value: d, label: DITHER_LABEL[d] })), { display: 'dropdown', label: 'Pattern', hint: 'How tones become 1-bit ink.', when: (v) => when(v) && v.material === 'dither' }),
  cell: p.number(3, { min: 1, max: 12, step: 0.5, unit: 'px', label: 'Dot size', hint: 'Dither cell at 1080p.', when: (v) => when(v) && v.material === 'dither' }),
  ior: p.number(1.45, { min: 1, max: 2.4, step: 0.01, label: 'Refraction', hint: 'Index of refraction. 1.0 is air, 1.5 glass, 2.4 diamond.', when: (v) => when(v) && v.material === 'glass' }),
  scene: p.number(0.5, { min: 0, max: 1, step: 0.01, label: 'Reflect scene', hint: 'How much the layers below show in reflections, against a studio softbox.', when: (v) => when(v) && ['chrome', 'glass', 'pearl', 'gloss'].includes(v.material) }),
  shift: p.number(0, { min: 0, max: 1, step: 0.01, label: 'Film hue', hint: 'Rotates the thin-film colours.', when: (v) => when(v) && v.material === 'pearl' }),
})
const is3d = (v: any) => v.render === '3d'
const materialUniforms: Uni[] = [
  { name: 'material', type: 'int', get: (v) => idx(MATERIALS)(v.material) },
  { name: 'color', type: 'vec3', get: (v) => rgb(v.color) },
  { name: 'paper', type: 'vec3', get: (v) => rgb(v.paper) },
  { name: 'clear', type: 'float', get: (v) => (v.clear ? 1 : 0) },
  { name: 'cell', type: 'vec2', get: (v) => [v.cell, idx(DITHERS)(v.pattern ?? 'lines')] },
  { name: 'ior', type: 'float', get: (v) => v.ior },
  { name: 'scene', type: 'float', get: (v) => v.scene },
  { name: 'shift', type: 'float', get: (v) => v.shift },
]

/* --------------------------------------------------------------------------- */
export const LAYER_TYPES: Record<LayerType, LayerTypeDef> = {
  smiley: {
    type: 'smiley', label: 'Smiley', category: 'Shape', icon: Smile, kind: 'fill', blend: 'normal', opacity: 1,
    hint: 'The heart-eyed smiley as a vector shape: every part is a knob. Drag it on the canvas; export it as SVG. Or drop your own SVG in the document panel.',
    schema: defineSchema({
      shape: folder('Shape', {
        shape: p.select('smiley', [{ value: 'smiley', label: 'Smiley' }, { value: 'svg', label: 'My SVG / text' }], { hint: 'My SVG / text uses Document → Custom shape: an SVG you drop in, or a line of text.' }),
        render: p.select('flat', [{ value: 'flat', label: 'Flat' }, { value: '3d', label: '3D' }], { hint: '3D extrudes the shape into a solid that spins, lit and shaded by the material below.' }),
        pos: p.vec2({ x: 0.5, y: 0.5 }, { min: 0, max: 1, step: 0.005, label: 'Position', display: 'pad', hint: 'Centre in the frame, 0–1 from the bottom left. Or drag the shape.' }),
        size: p.number(0.62, { min: 0.05, max: 2, step: 0.01, hint: 'Height as a share of the frame. Or drag a corner handle.' }),
        stretch: p.vec2({ x: 1, y: 1 }, { min: 0.1, max: 5, step: 0.01, display: 'fields', hint: 'Width and height on their own. Or drag a side handle on the canvas.' }),
        angle: p.angle(0, { label: 'Rotation' }),
      }),
      eyes: folder('Eyes', {
        eyeSize: p.number(0.44, { min: 0.05, max: 0.8, step: 0.01, label: 'Size' }),
        eyeX: p.number(0.34, { min: 0, max: 0.9, step: 0.01, label: 'Spacing', hint: 'Distance of each heart from the centre.' }),
        eyeY: p.number(0.4, { min: -0.6, max: 0.9, step: 0.01, label: 'Height' }),
        eyeTilt: p.angle(12, { label: 'Tilt', hint: 'Each heart leans outward by this much.' }),
      }, { when: (v) => v.shape === 'smiley' }),
      mouth: folder('Smile', {
        smileR: p.number(0.56, { min: 0.1, max: 1, step: 0.01, label: 'Radius' }),
        thick: p.number(0.3, { min: 0.02, max: 0.8, step: 0.01, label: 'Thickness' }),
        smileY: p.number(-0.12, { min: -0.8, max: 0.6, step: 0.01, label: 'Height' }),
        cut: p.number(0.04, { min: -0.6, max: 0.6, step: 0.01, label: 'Open', hint: 'Where the band is cut flat. 0 is a half ring; higher closes it.' }),
        cutTilt: p.angle(-7, { label: 'Cut angle', hint: 'Tilts the flat cut, so one end rises higher.' }),
      }, { when: (v) => v.shape === 'smiley' }),
      solid: folder('3D', {
        depth: p.number(0.22, { min: 0.03, max: 0.8, step: 0.01, hint: 'How thick the extruded face is.' }),
        bevel: p.number(0.05, { min: 0, max: 0.15, step: 0.005, hint: 'Rounds every edge. Higher catches more highlights.' }),
        inflate: p.number(0, { min: 0, max: 1, step: 0.01, hint: 'Puffs it up like a balloon: thick in the middle, thinning to the edges. Raise Depth with it for a fuller shape.' }),
        ...materialKnobs(undefined, false),
        spin: p.number(1, { min: -3, max: 3, step: 1, hint: 'Full turns per loop. Whole numbers loop seamlessly. 0 holds still.' }),
        yaw: p.angle(-25, { label: 'Turn' }),
        tilt: p.angle(-10),
        wobble: p.number(0.3, { min: 0, max: 1, step: 0.01, hint: 'A gentle rock back and forth through the loop.' }),
        light: p.angle(60, { label: 'Light' }),
        shadow: p.number(0, { min: 0, max: 1, step: 0.01, hint: 'Soft contact shadow under it.' }),
      }, { when: (v) => v.render === '3d' }),
      fill: folder('Fill', {
        fill: p.select('solid', [{ value: 'solid', label: 'Solid' }, { value: 'invert', label: 'Invert' }, { value: 'outline', label: 'Outline' }], { hint: 'Invert flips the pattern under the shape.', when: (v) => !is3d(v) }),
        color: p.color('#111111', { alpha: false, hint: 'Fill colour, or the 3D material’s colour.', when: (v) => is3d(v) || v.fill !== 'invert' }),
        stroke: p.number(0.04, { min: 0.005, max: 0.3, step: 0.005, label: 'Stroke', when: (v) => !is3d(v) && v.fill === 'outline' }),
      }),
      motion: folder('Motion', {
        beat: p.number(0.25, { min: 0, max: 1, step: 0.01, label: 'Heartbeat', hint: 'The hearts pulse twice per loop.' }),
        sway: p.number(0, { min: 0, max: 30, step: 0.5, unit: '°', hint: 'Rocks the whole face through the loop.' }),
      }, { collapsed: true }),
      rows: folder('Rows', {
        tile: p.boolean(false, { label: 'Repeat rows', hint: 'Tiles the shape into rows down the whole frame.' }),
        gap: p.number(0.4, { min: -0.5, max: 4, step: 0.01, hint: 'Space between rows, as a share of the shape’s height.' }),
        scroll: p.number(-1, { min: -6, max: 6, step: 1, hint: 'Rows travelled per loop. Whole numbers loop seamlessly.' }),
        flicker: p.number(0.7, { min: 0, max: 1, step: 0.01, hint: 'Each row fades in and out on its own beat.' }),
      }, { toggle: 'tile', collapsed: true, when: (v) => v.render !== '3d' }),
    }),
    uniforms: [
      { name: 'shape', type: 'int', get: (v) => idx(SMILEY_SHAPES)(v.shape) },
      { name: 'pos', type: 'vec2', get: (v) => [v.pos.x, v.pos.y] },
      { name: 'size', type: 'float', get: (v) => v.size },
      { name: 'angle', type: 'float', get: (v) => v.angle },
      { name: 'eye', type: 'vec4', get: (v) => [v.eyeX, v.eyeY, v.eyeSize, v.eyeTilt] },
      { name: 'mouth', type: 'vec4', get: (v) => [v.smileR, v.thick, v.smileY, v.cut] },
      { name: 'cutTilt', type: 'float', get: (v) => v.cutTilt },
      { name: 'fill', type: 'int', get: (v) => idx(SMILEY_FILLS)(v.fill) },
      { name: 'color', type: 'vec3', get: (v) => rgb(v.color) },
      { name: 'stroke', type: 'float', get: (v) => v.stroke },
      { name: 'beat', type: 'float', get: (v) => v.beat },
      { name: 'sway', type: 'float', get: (v) => v.sway },
      { name: 'render', type: 'int', get: (v) => (v.render === '3d' ? 1 : 0) },
      { name: 'stretch', type: 'vec2', get: (v) => [v.stretch?.x ?? 1, v.stretch?.y ?? 1] },
      { name: 'tile', type: 'vec4', get: (v) => [v.tile ? 1 : 0, v.gap, v.scroll, v.flicker] },
      { name: 'depth', type: 'vec3', get: (v) => [v.depth, Math.min(v.bevel, v.depth * 0.95), v.inflate ?? 0] },
      ...materialUniforms.filter((x) => x.name !== 'color'),
      { name: 'spin', type: 'float', get: (v) => v.spin },
      { name: 'yaw', type: 'float', get: (v) => v.yaw },
      { name: 'tilt', type: 'float', get: (v) => v.tilt },
      { name: 'wobble', type: 'float', get: (v) => v.wobble },
      { name: 'light', type: 'float', get: (v) => v.light },
      { name: 'shadow', type: 'float', get: (v) => v.shadow },
    ],
    glsl: (u, prev) => `
    float pulse = 1.0 + ${u('beat')} * 0.18 * pow(max(sin(uPhase * 2.0), 0.0), 6.0);
    if (${u('render')} == 1) {
      gStretch = ${u('stretch')};
      gEye = ${u('eye')}; gMouth = ${u('mouth')}; gCut = radians(${u('cutTilt')}); gPulse = pulse; gDepth = ${u('depth')};
      float sz = ${u('size')};
      ${shade3d(u, prev, `objMarch(p, ${u('pos')}, sz, radians(${u('yaw')}) + uPhase * ${u('spin')}, radians(${u('tilt')}) + 0.35 * sin(uPhase) * ${u('wobble')}, radians(${u('angle')} + ${u('sway')} * sin(uPhase)), ${u('shape')} == 0 ? 8 : 9, 0.0)`).trim()}
    } else {
      float asp = uRes.x / uRes.y;
      float ang = radians(${u('angle')} + ${u('sway')} * sin(uPhase));
      vec2 q = rot2(-ang) * ((p - ${u('pos')}) * vec2(asp, 1.0)) / max(${u('size')} * 0.5, 1e-4);
      // your shape fits the same box as the smiley: a wide one is scaled so its width is the size
      float fk = ${u('shape')} == 1 ? max(1.0, uShapeK.z) : 1.0;
      q = q / ${u('stretch')} * fk;
      // tile into rows that scroll through the loop and flicker one by one
      float rowA = 1.0;
      if (${u('tile')}.x > 0.5) {
        float per = 2.0 * (1.0 + ${u('tile')}.y);
        float yy = q.y + per * 0.5 + uPhase / TAU * per * ${u('tile')}.z;
        float row = floor(yy / per);
        q.y = yy - row * per - per * 0.5;
        float ph = hash11(row * 7.13 + 3.7) * TAU;
        rowA = mix(1.0, 0.5 + 0.5 * sin(uPhase * floor(1.0 + 3.0 * hash11(row * 3.1)) + ph), ${u('tile')}.w);
      }
      float d = (${u('shape')} == 0 ? smileySDF(q, ${u('eye')}, pulse, ${u('mouth')}, radians(${u('cutTilt')})) : shapeImageSDF(q)) / fk;
      if (${u('fill')} == 2) d = abs(d) - ${u('stroke')} * 0.5;
      float cov = clamp(0.5 - d / max(fwidth(d), 1e-5), 0.0, 1.0);
      s = vec4(${u('fill')} == 1 ? 1.0 - b : ${u('color')}, cov * rowA);
    }`,
  },

  mesh: {
    type: 'mesh', label: 'Mesh gradient', category: 'Fill', icon: Blend, kind: 'fill', blend: 'normal', opacity: 1,
    hint: 'Soft colour points drifting on looping orbits, mixed in OKLab.',
    schema: defineSchema({
      mesh: folder('Mesh', {
        colors: p.palette(['#171615', '#6E1A3E', '#F6571C', '#FFD000', '#F5F3F2'], { max: 8, hint: 'Each colour is a point in the mesh. Up to eight.' }),
        softness: p.number(0.55, { min: 0, max: 1, step: 0.01, hint: 'How far each colour bleeds into its neighbours.' }),
        scale: p.number(1, { min: 0.3, max: 3, step: 0.01, unit: '×', hint: 'Zoom of the point field.' }),
        drift: p.number(0.6, { min: 0, max: 1.5, step: 0.01, hint: 'How far points travel around their home position.' }),
        cycles: p.number(1, { min: 0, max: 4, step: 1, hint: 'Orbits per loop. Whole numbers keep the loop seamless.' }),
      }),
    }),
    uniforms: [
      { name: 'colors', type: 'vec3[8]', get: (v) => lab8(v.colors) },
      { name: 'count', type: 'int', get: (v) => Math.min(8, v.colors.length) },
      { name: 'softness', type: 'float', get: (v) => v.softness },
      { name: 'scale', type: 'float', get: (v) => v.scale },
      { name: 'drift', type: 'float', get: (v) => v.drift },
      { name: 'cycles', type: 'float', get: (v) => v.cycles },
    ],
    glsl: (u) => `s = vec4(meshGradient(p, ${u('colors')}, ${u('count')}, ${u('softness')}, ${u('scale')}, ${u('drift')}, ${u('cycles')}, ${u('salt')}), 1.0);`,
  },

  gradient: {
    type: 'gradient', label: 'Gradient', category: 'Fill', icon: Gradient, kind: 'fill', blend: 'normal', opacity: 1,
    hint: 'Linear, radial or conic ramp, interpolated in OKLab.',
    schema: defineSchema({
      gradient: folder('Gradient', {
        ramp: p.gradient({ angle: 160, stops: [{ pos: 0, color: '#6E1A3E' }, { pos: 0.55, color: '#F6571C' }, { pos: 1, color: '#F2DB95' }] }, { hint: 'Stops and direction.' }),
        shape: p.select('linear', GRAD_SHAPES),
        spin: p.number(0, { min: -3, max: 3, step: 1, hint: 'Full turns per loop.' }),
      }),
    }),
    uniforms: [
      { name: 'pos', type: 'float[8]', get: (v) => { const s = [...v.ramp.stops].sort((a: any, b: any) => a.pos - b.pos); return Array.from({ length: 8 }, (_, i) => s[Math.min(i, s.length - 1)].pos) } },
      { name: 'colors', type: 'vec3[8]', get: (v) => lab8([...v.ramp.stops].sort((a: any, b: any) => a.pos - b.pos).map((s: any) => s.color)) },
      { name: 'count', type: 'int', get: (v) => Math.min(8, v.ramp.stops.length) },
      { name: 'angle', type: 'float', get: (v) => v.ramp.angle },
      { name: 'shape', type: 'int', get: (v) => idx(GRAD_SHAPES)(v.shape) },
      { name: 'spin', type: 'float', get: (v) => v.spin },
    ],
    glsl: (u) => `s = vec4(gradientFill(p, ${u('pos')}, ${u('colors')}, ${u('count')}, ${u('angle')}, ${u('shape')}, ${u('spin')}), 1.0);`,
  },

  chevron: {
    type: 'chevron', label: 'Op-art chevrons', category: 'Fill', icon: Zap, kind: 'fill', blend: 'normal', opacity: 1,
    hint: 'Two-ink zigzag stripes wrapped on a sphere, stepped into pixels at the edges, like a screen-printed op-art poster.',
    schema: defineSchema({
      stripes: folder('Stripes', {
        freq: p.number(9, { min: 1, max: 40, step: 0.5, label: 'Stripes', hint: 'Stripes per sphere radius.' }),
        duty: p.number(0.5, { min: 0.05, max: 0.95, step: 0.01, label: 'Ink width', hint: 'Share of each stripe that is ink.' }),
        amp: p.number(0.4, { min: 0, max: 1.5, step: 0.01, label: 'Zigzag', hint: 'Depth of the chevrons. 0 is straight lines.' }),
        period: p.number(0.55, { min: 0.05, max: 2, step: 0.01, label: 'Zigzag width' }),
        tilt: p.angle(-35, { hint: 'Direction of the stripes.' }),
      }),
      sphere: folder('Sphere', {
        bulge: p.number(1, { min: 0, max: 1, step: 0.01, hint: 'Wraps the stripes around a sphere, so they bunch up toward its rim. 0 is flat.' }),
        radius: p.number(0.8, { min: 0.1, max: 2, step: 0.01 }),
        center: p.vec2({ x: -0.42, y: 0.12 }, { min: -1, max: 1, step: 0.01, display: 'pad', hint: 'Sphere centre, in frame heights from the middle.' }),
        outside: p.select('ink', OUTSIDE, { label: 'Around it', hint: 'What fills the frame outside the sphere.' }),
      }),
      print: folder('Print', {
        ink: p.color('#2BF53A', { alpha: false }),
        paper: p.color('#F4F4EF', { alpha: false }),
        pixel: p.number(9, { min: 0, max: 60, step: 0.5, unit: 'px', hint: 'Steps the pattern into square cells at 1080p, giving staircase edges and checkers where stripes crowd. 0 is smooth.' }),
        bevel: p.number(0.12, { min: 0, max: 0.4, step: 0.01, hint: 'A darker sliver on one edge of every stripe, like a raised fold.' }),
        speckle: p.number(0.2, { min: 0, max: 1, step: 0.01, hint: 'Paper showing through the ink, as in risograph and screen print.' }),
      }),
      motion: folder('Motion', {
        spin: p.number(1, { min: -4, max: 4, step: 1, hint: 'Zigzags travelling around the sphere per loop. Whole numbers loop seamlessly.' }),
        flow: p.number(0, { min: -6, max: 6, step: 1, hint: 'Stripes per loop moving across.' }),
      }, { collapsed: true }),
    }),
    uniforms: [
      { name: 'stripe', type: 'vec4', get: (v) => [v.freq, v.duty, v.amp, v.period] },
      { name: 'tilt', type: 'float', get: (v) => v.tilt },
      { name: 'sphere', type: 'vec4', get: (v) => [v.bulge, v.radius, v.center.x, v.center.y] },
      { name: 'outside', type: 'int', get: (v) => idx(OUTSIDE)(v.outside) },
      { name: 'ink', type: 'vec3', get: (v) => rgb(v.ink) },
      { name: 'paper', type: 'vec3', get: (v) => rgb(v.paper) },
  { name: 'clear', type: 'float', get: (v) => (v.clear ? 1 : 0) },
      { name: 'print', type: 'vec3', get: (v) => [v.pixel, v.bevel, v.speckle] },
      { name: 'motion', type: 'vec2', get: (v) => [v.spin, v.flow] },
    ],
    glsl: (u) => `s = vec4(chevronFill(p, ${u('stripe')}, radians(${u('tilt')}), ${u('sphere')}, ${u('outside')}, ${u('ink')}, ${u('paper')}, ${u('print')}, ${u('motion')}, ${u('salt')}), 1.0);`,
  },

  object: {
    type: 'object', label: '3D object', category: '3D', icon: Box, kind: 'fill', blend: 'normal', opacity: 1,
    hint: 'A raymarched 3D shape that spins in a seamless loop. Chrome, pearl and gloss reflect the layers below it; glass refracts them.',
    schema: defineSchema({
      shape: folder('Shape', {
        shape: p.select('smiley', SHAPES, { display: 'dropdown', hint: 'Smiley is the heart-eyed face, extruded. Arc is the open ring of a smile.' }),
        morph: p.number(0.6, { min: 0, max: 1, step: 0.01, hint: 'Blob: how much it wobbles. Twist: turns. Arc: how far it closes.', when: (v) => ['blob', 'twist', 'arc'].includes(v.shape) }),
        size: p.number(0.5, { min: 0.05, max: 1.5, step: 0.01, hint: 'Height as a share of the frame.' }),
        pos: p.vec2({ x: 0.5, y: 0.5 }, { min: 0, max: 1, step: 0.005, label: 'Position', display: 'pad', hint: 'Centre in the frame, 0–1 from the bottom left.' }),
      }),
      material: folder('Material', materialKnobs()),
      motion: folder('Motion', {
        spin: p.number(1, { min: -3, max: 3, step: 1, hint: 'Full turns per loop. Whole numbers keep the loop seamless.' }),
        yaw: p.angle(20, { label: 'Turn' }),
        tilt: p.angle(-12),
        wobble: p.number(0.4, { min: 0, max: 1, step: 0.01, hint: 'A gentle rock back and forth through the loop.' }),
      }),
      light: folder('Light', {
        light: p.angle(55, { label: 'Direction' }),
        shadow: p.number(0.35, { min: 0, max: 1, step: 0.01, hint: 'Soft contact shadow on the layers below.' }),
      }, { collapsed: true }),
    }),
    uniforms: [
      { name: 'shape', type: 'int', get: (v) => idx(SHAPES)(v.shape) },
      { name: 'morph', type: 'float', get: (v) => v.morph },
      { name: 'size', type: 'float', get: (v) => v.size },
      { name: 'pos', type: 'vec2', get: (v) => [v.pos.x, v.pos.y] },
      ...materialUniforms,
      { name: 'spin', type: 'float', get: (v) => v.spin },
      { name: 'yaw', type: 'float', get: (v) => v.yaw },
      { name: 'tilt', type: 'float', get: (v) => v.tilt },
      { name: 'wobble', type: 'float', get: (v) => v.wobble },
      { name: 'light', type: 'float', get: (v) => v.light },
      { name: 'shadow', type: 'float', get: (v) => v.shadow },
    ],
    glsl: (u, prev) => 'gStretch = vec2(1.0); gDepth = vec3(0.22, 0.05, 0.0);' + shade3d(u, prev, `objMarch(p, ${u('pos')}, ${u('size')}, radians(${u('yaw')}) + uPhase * ${u('spin')}, radians(${u('tilt')}) + 0.35 * sin(uPhase) * ${u('wobble')}, 0.0, ${u('shape')}, ${u('morph')})`),
  },

  warp: {
    type: 'warp', label: 'Warp', category: 'Distort', icon: Waves, kind: 'domain', blend: 'normal', opacity: 1,
    hint: 'Bends everything below it. Opacity blends between straight and warped.',
    schema: defineSchema({
      warp: folder('Warp', {
        style: p.select('flow', WARP_STYLES, { display: 'dropdown', hint: 'Flow is a two-level noise domain warp; the others are geometric.' }),
        amount: p.number(0.45, { min: 0, max: 1.5, step: 0.01 }),
        scale: p.number(1.4, { min: 0.2, max: 8, step: 0.05, hint: 'Feature size. Higher = busier.' }),
        detail: p.number(4, { min: 1, max: 7, step: 1, hint: 'Noise octaves. Costs GPU time.', when: (v) => v.style === 'flow' }),
        evolve: p.number(0.6, { min: 0, max: 2, step: 0.01, hint: 'How far the noise travels through one loop.', when: (v) => v.style === 'flow' }),
        cycles: p.number(1, { min: 0, max: 6, step: 1, hint: 'Wave cycles per loop.', when: (v) => v.style !== 'flow' }),
      }),
    }),
    uniforms: [
      { name: 'style', type: 'int', get: (v) => idx(WARP_STYLES)(v.style) },
      { name: 'amount', type: 'float', get: (v) => v.amount },
      { name: 'scale', type: 'float', get: (v) => v.scale },
      { name: 'detail', type: 'int', get: (v) => v.detail },
      { name: 'evolve', type: 'float', get: (v) => v.evolve },
      { name: 'cycles', type: 'float', get: (v) => v.cycles },
    ],
    glsl: (u) => `w = warpDomain(p, ${u('style')}, ${u('amount')}, ${u('scale')}, ${u('detail')}, ${u('evolve')}, ${u('cycles')}, ${u('salt')});`,
  },

  chromatic: {
    type: 'chromatic', label: 'Chromatic aberration', category: 'Distort', icon: Aperture, kind: 'resample', blend: 'normal', opacity: 1,
    hint: 'Splits red and blue apart. Renders everything below three times.',
    schema: defineSchema({
      rgb: folder('Split', {
        amount: p.number(6, { min: 0, max: 60, step: 0.5, unit: 'px', hint: 'Offset at 1080p; scales with the output.' }),
        radial: p.boolean(true, { hint: 'Push channels away from the centre, like a lens.' }),
        angle: p.angle(0, { when: (v) => !v.radial }),
      }),
    }),
    uniforms: [
      { name: 'amount', type: 'float', get: (v) => v.amount },
      { name: 'radial', type: 'float', get: (v) => (v.radial ? 1 : 0) },
      { name: 'angle', type: 'float', get: (v) => v.angle },
    ],
    glsl: (u, prev) => `
    vec2 dir = ${u('radial')} > .5 ? (p - .5) * 2.0 * vec2(uRes.x / uRes.y, 1.0) : vec2(cos(radians(${u('angle')})), sin(radians(${u('angle')})));
    vec2 o = dir * (${u('amount')} / 1080.0) / vec2(uRes.x / uRes.y, 1.0);
    b = ${prev}(p);
    s = vec3(${prev}(p + o).r, b.g, ${prev}(p - o).b);`,
  },

  halftone: {
    type: 'halftone', label: 'Halftone', category: 'Stylise', icon: Grip, kind: 'resample', blend: 'normal', opacity: 1,
    hint: 'Re-screens everything below as a rotated dot, line or square grid.',
    schema: defineSchema({
      screen: folder('Screen', {
        shape: p.select('dot', HT_SHAPES),
        cell: p.number(14, { min: 3, max: 80, step: 0.5, unit: 'px', hint: 'Cell size at 1080p.' }),
        angle: p.angle(45),
        contrast: p.number(1.1, { min: 0.3, max: 3, step: 0.01, hint: 'Gamma on darkness before it becomes dot size.' }),
      }),
      ink: folder('Ink', {
        inkMode: p.select('source', [{ value: 'source', label: 'Source' }, { value: 'ink', label: 'Single ink' }], { label: 'Colour', hint: 'Dots take the colour beneath them, or one ink.' }),
        ink: p.color('#171615', { alpha: false, when: (v) => v.inkMode === 'ink' }),
        paper: p.color('#F5F3F2', { alpha: false }),
      }),
    }),
    uniforms: [
      { name: 'shape', type: 'int', get: (v) => idx(HT_SHAPES)(v.shape) },
      { name: 'cell', type: 'float', get: (v) => v.cell },
      { name: 'angle', type: 'float', get: (v) => v.angle },
      { name: 'contrast', type: 'float', get: (v) => v.contrast },
      { name: 'mode', type: 'int', get: (v) => (v.inkMode === 'ink' ? 1 : 0) },
      { name: 'ink', type: 'vec3', get: (v) => rgb(v.ink) },
      { name: 'paper', type: 'vec3', get: (v) => rgb(v.paper) },
  { name: 'clear', type: 'float', get: (v) => (v.clear ? 1 : 0) },
    ],
    glsl: (u, prev) => `
    float asp = uRes.x / uRes.y;
    float cell = ${u('cell')} / 1080.0;
    float a = radians(${u('angle')});
    mat2 R = mat2(cos(a), sin(a), -sin(a), cos(a));
    vec2 g = (R * ((p - .5) * vec2(asp, 1.0))) / cell;
    vec2 id = floor(g) + .5;
    vec2 f = g - id;
    vec2 cp = (transpose(R) * (id * cell)) / vec2(asp, 1.0) + .5;
    vec3 sc = ${prev}(cp);
    b = ${prev}(p);
    float dark = clamp(pow(1.0 - dot(sc, vec3(.299, .587, .114)), ${u('contrast')}), 0.0, 1.0);
    float d, r;
    if (${u('shape')} == 0) { d = length(f); r = sqrt(dark) * .7072; }
    else if (${u('shape')} == 1) { d = abs(f.y); r = dark * .5; }
    else { d = max(abs(f.x), abs(f.y)); r = sqrt(dark) * .5; }
    float aa = max(length(fwidth(g)) * .75, 1e-4);
    float m = 1.0 - smoothstep(r - aa, r + aa, d);
    s = mix(${u('paper')}, ${u('mode')} == 0 ? sc : ${u('ink')}, m);`,
  },

  posterize: {
    type: 'posterize', label: 'Posterize', category: 'Stylise', icon: Contrast, kind: 'fill', blend: 'normal', opacity: 1,
    hint: 'Quantises each channel to a few levels — screen-print bands.',
    schema: defineSchema({
      bands: folder('Bands', {
        levels: p.number(5, { min: 2, max: 16, step: 1 }),
        gamma: p.number(1, { min: 0.4, max: 2.5, step: 0.01, hint: 'Shifts where the band edges fall.' }),
      }),
    }),
    uniforms: [
      { name: 'levels', type: 'float', get: (v) => v.levels },
      { name: 'gamma', type: 'float', get: (v) => v.gamma },
    ],
    glsl: (u) => `vec3 g = pow(b, vec3(${u('gamma')})); s = vec4(pow(floor(g * ${u('levels')} + .5) / ${u('levels')}, vec3(1.0 / ${u('gamma')})), 1.0);`,
  },

  gradmap: {
    type: 'gradmap', label: 'Gradient map', category: 'Stylise', icon: Rainbow, kind: 'fill', blend: 'normal', opacity: 1,
    hint: 'Maps brightness onto a colour ramp — duotones and tritones.',
    schema: defineSchema({
      map: folder('Map', {
        colors: p.palette(['#171615', '#F6571C', '#F5F3F2'], { max: 8, hint: 'Shadows to highlights.' }),
        offset: p.number(0, { min: -0.5, max: 0.5, step: 0.01, hint: 'Slides the ramp along brightness.' }),
      }),
    }),
    uniforms: [
      { name: 'colors', type: 'vec3[8]', get: (v) => lab8(v.colors) },
      { name: 'count', type: 'int', get: (v) => Math.min(8, v.colors.length) },
      { name: 'offset', type: 'float', get: (v) => v.offset },
    ],
    glsl: (u) => `s = vec4(gradientMap(clamp(dot(b, vec3(.299, .587, .114)) + ${u('offset')}, 0.0, 1.0), ${u('colors')}, ${u('count')}), 1.0);`,
  },

  dither: {
    type: 'dither', label: 'Dither', category: 'Stylise', icon: Grid3x3, kind: 'resample', blend: 'normal', opacity: 1,
    hint: 'Turns everything below into 1-bit ink and paper: scanlines, Bayer, halftone dots, crosshatch or noise.',
    schema: defineSchema({
      dither: folder('Dither', {
        pattern: p.select('bayer4', DITHERS.map((d) => ({ value: d, label: DITHER_LABEL[d] })), { display: 'dropdown' }),
        cell: p.number(3, { min: 1, max: 24, step: 0.5, unit: 'px', label: 'Dot size', hint: 'Cell size at 1080p.' }),
        threshold: p.number(0, { min: -0.5, max: 0.5, step: 0.01, hint: 'Shifts how much becomes ink.' }),
        contrast: p.number(1.2, { min: 0.3, max: 3, step: 0.01 }),
      }),
      inks: folder('Colours', {
        ink: p.color('#0c0c0c', { alpha: false }),
        clear: p.boolean(false, { label: 'See-through', hint: 'Paper shows the background colour instead.' }),
        paper: p.color('#6BE45A', { alpha: false, label: 'Screen colour', when: (v) => !v.clear }),
      }),
    }),
    uniforms: [
      { name: 'cfg', type: 'vec4', get: (v) => [v.cell, idx(DITHERS)(v.pattern), v.threshold, v.contrast] },
      { name: 'ink', type: 'vec3', get: (v) => rgb(v.ink) },
      { name: 'paper', type: 'vec3', get: (v) => rgb(v.paper) },
      { name: 'clear', type: 'float', get: (v) => (v.clear ? 1 : 0) },
    ],
    glsl: (u, prev) => `
    b = ${prev}(p);
    float lum = (dot(b, vec3(.299, .587, .114)) - 0.5) * ${u('cfg')}.w + 0.5 + ${u('cfg')}.z;
    vec2 cp = gl_FragCoord.xy / max(${u('cfg')}.x * uRes.y / 1080.0, 1.0);
    s = mix(${u('clear')} > .5 ? uBg : ${u('paper')}, ${u('ink')}, ditherInk(lum, floor(cp), fract(cp), int(${u('cfg')}.y)));`,
  },

  glitch: {
    type: 'glitch', label: 'Glitch', category: 'Finish', icon: Zap, kind: 'resample', blend: 'normal', opacity: 1,
    hint: 'Slices the picture into bands that jump sideways, with bright scan bars, re-rolled a few times a second.',
    schema: defineSchema({
      glitch: folder('Glitch', {
        amount: p.number(0.25, { min: 0, max: 1, step: 0.01, hint: 'Share of bands that jump on each beat.' }),
        shift: p.number(0.06, { min: 0, max: 0.5, step: 0.005, hint: 'How far a band jumps, as a share of the width.' }),
        bands: p.number(18, { min: 2, max: 120, step: 1, hint: 'How many horizontal bands.' }),
        rate: p.number(8, { min: 1, max: 30, step: 1, unit: '/s', hint: 'Re-rolls per second.' }),
      }),
      bars: folder('Scan bars', {
        bar: p.number(0.6, { min: 0, max: 1, step: 0.01, label: 'Strength' }),
        barColor: p.color('#D7FF3A', { alpha: false, label: 'Colour' }),
        barSize: p.number(4, { min: 0.5, max: 30, step: 0.5, unit: 'px', label: 'Thickness', hint: 'At 1080p.' }),
      }),
    }),
    uniforms: [
      { name: 'cfg', type: 'vec4', get: (v) => [v.amount, v.shift, v.bands, v.rate] },
      { name: 'bar', type: 'vec2', get: (v) => [v.bar, v.barSize] },
      { name: 'barColor', type: 'vec3', get: (v) => rgb(v.barColor) },
    ],
    glsl: (u, prev) => `
    float fr = floor(uTime * ${u('cfg')}.w);
    float band = floor(p.y * ${u('cfg')}.z);
    float on = step(1.0 - ${u('cfg')}.x, hash12(vec2(band, fr) + ${u('salt')}));
    float dx = (hash12(vec2(band * 1.7, fr + 3.1) + ${u('salt')}) - 0.5) * 2.0 * ${u('cfg')}.y * on;
    b = ${prev}(p);
    s = on > 0.5 ? ${prev}(vec2(fract(p.x + dx), p.y)) : b;
    float th = ${u('bar')}.y / 1080.0, bars = 0.0;
    for (int k = 0; k < 3; k++) {
      float y = hash12(vec2(fr + float(k) * 13.0, 5.0 + ${u('salt')}));
      bars = max(bars, (1.0 - smoothstep(th * 0.5, th * 0.5 + 1.5 / uRes.y, abs(p.y - y))) * step(0.35, hash12(vec2(fr, float(k) + 9.0))));
    }
    s = mix(s, mix(s, ${u('barColor')}, 0.85), bars * ${u('bar')}.x);`,
  },

  grain: {
    type: 'grain', label: 'Grain', category: 'Finish', icon: Grain, kind: 'fill', blend: 'overlay', opacity: 0.32,
    hint: 'Film grain. Overlay at low opacity is the classic recipe.',
    schema: defineSchema({
      grain: folder('Grain', {
        size: p.number(1.4, { min: 0.5, max: 6, step: 0.1, unit: 'px', hint: 'Grain size at 1080p.' }),
        animated: p.boolean(true, { hint: 'Re-roll every frame at 24 fps, like film.' }),
        chroma: p.boolean(false, { label: 'Colour grain', hint: 'Independent noise per channel.' }),
      }),
    }),
    uniforms: [
      { name: 'size', type: 'float', get: (v) => v.size },
      { name: 'animated', type: 'float', get: (v) => (v.animated ? 1 : 0) },
      { name: 'chroma', type: 'float', get: (v) => (v.chroma ? 1 : 0) },
    ],
    glsl: (u) => `s = vec4(grainNoise(p, ${u('size')}, ${u('animated')}, ${u('chroma')}, ${u('salt')}), 1.0);`,
  },

  vignette: {
    type: 'vignette', label: 'Vignette', category: 'Finish', icon: Focus, kind: 'fill', blend: 'multiply', opacity: 0.75,
    hint: 'Darkens or tints toward the edges.',
    schema: defineSchema({
      vignette: folder('Vignette', {
        size: p.number(0.55, { min: 0, max: 1.6, step: 0.01, hint: 'Radius of the clear centre.' }),
        softness: p.number(0.9, { min: 0.02, max: 2, step: 0.01 }),
        roundness: p.number(0.6, { min: 0, max: 1, step: 0.01, hint: '0 follows the frame, 1 is a circle.' }),
        tint: p.color('#171615', { alpha: false }),
      }),
    }),
    uniforms: [
      { name: 'size', type: 'float', get: (v) => v.size },
      { name: 'softness', type: 'float', get: (v) => v.softness },
      { name: 'roundness', type: 'float', get: (v) => v.roundness },
      { name: 'tint', type: 'vec3', get: (v) => rgb(v.tint) },
    ],
    glsl: (u) => `
    vec2 q = (p - .5) * 2.0 * vec2(mix(1.0, uRes.x / uRes.y, ${u('roundness')}), 1.0);
    float m = smoothstep(${u('size')}, ${u('size')} + ${u('softness')}, length(q));
    s = vec4(mix(vec3(1.0), ${u('tint')}, m), 1.0);`,
  },

  scanlines: {
    type: 'scanlines', label: 'Scanlines', category: 'Finish', icon: Rows3, kind: 'fill', blend: 'overlay', opacity: 0.35,
    hint: 'CRT-style horizontal lines that can roll through the loop.',
    schema: defineSchema({
      lines: folder('Lines', {
        pitch: p.number(4, { min: 1.5, max: 40, step: 0.5, unit: 'px', hint: 'Line spacing at 1080p.' }),
        sharpness: p.number(0.5, { min: 0, max: 1, step: 0.01 }),
        roll: p.number(0, { min: -8, max: 8, step: 1, hint: 'Line pitches travelled per loop.' }),
      }),
    }),
    uniforms: [
      { name: 'pitch', type: 'float', get: (v) => v.pitch },
      { name: 'sharpness', type: 'float', get: (v) => v.sharpness },
      { name: 'roll', type: 'float', get: (v) => v.roll },
    ],
    glsl: (u) => `
    float y = p.y * 1080.0 / ${u('pitch')} + uPhase / 6.2831853 * ${u('roll')};
    float l = .5 + .5 * sin(y * 6.2831853);
    l = mix(l, step(.5, l), ${u('sharpness')});
    s = vec4(vec3(l), 1.0);`,
  },

}

export const CATEGORIES = ['Shape', 'Fill', '3D', 'Distort', 'Stylise', 'Finish'] as const

export const typeDefaults = (t: LayerType) => defaultsOf(LAYER_TYPES[t].schema) as Record<string, any>

let n = 0
export const newId = () => `l${Date.now().toString(36)}${(n++).toString(36)}`

export function makeLayer(type: LayerType, over: Partial<Omit<Layer, 'params'>> & { params?: Record<string, any> } = {}): Layer {
  const def = LAYER_TYPES[type]
  return {
    id: newId(),
    type,
    name: def.label,
    visible: true,
    blend: def.blend,
    opacity: def.opacity,
    ...over,
    params: { ...typeDefaults(type), ...(over.params ?? {}) },
  }
}
