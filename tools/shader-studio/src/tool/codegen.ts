/* ---------------------------------------------------------------------------
   Stack → one GLSL ES 3.00 fragment shader.

   Every visible layer becomes a function L<i>(p) that renders the stack up to
   and including itself at coordinate p, calling L<i-1> for what is below. That
   one idea gives correct ordering for every kind of layer: a warp re-maps p
   before calling below, a halftone samples below at its cell centres, an RGB
   split samples below three times. No render targets, no passes.

   Pure: string in, string out. The renderer compiles it; "Copy as code" ships it.
--------------------------------------------------------------------------- */
import { LAYER_TYPES, type BlendMode, type Layer } from './layers'
import { hexToRgb01 } from './color'
import { getShape } from './shape-image'

export interface DocUniforms {
  /** seconds since loop start */
  time: number
  /** loop length in seconds — uPhase runs 0 → 2π once per loop */
  loop: number
  seed: number
  bg: string
  /** background gradient: second colour, 0 solid / 1 linear / 2 radial, linear angle (degrees) */
  bg2?: string
  bgMode?: number
  bgAngle?: number
  width: number
  height: number
}

export type UniformValue = number | number[]
export interface UniformDecl { name: string; type: string }

const BLEND_FN: Record<BlendMode, string> = {
  normal: 'B_normal', multiply: 'B_multiply', screen: 'B_screen', overlay: 'B_overlay',
  'soft-light': 'B_softlight', 'hard-light': 'B_hardlight', add: 'B_add', difference: 'B_difference',
}

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uRes;    // output size in px
uniform float uTime;  // seconds into the loop
uniform float uPhase; // 0..2π across one loop — every motion is periodic in this
uniform vec3 uBg;     // document background (the gradient's first colour)
uniform vec3 uBg2;    // the background gradient's second colour
uniform vec2 uBgMode; // x: 0 solid, 1 linear, 2 radial; y: linear angle in degrees
uniform sampler2D uShape; // the custom shape's signed distance field (.r, face units), rows top-down
uniform vec4 uShapeK;     // xy: face q → uv is 0.5 + vec2(q.x, -q.y) * uShapeK.xy; z: the shape's width / height
out vec4 fragColor;

#define TAU 6.28318530718

float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
// Hash without Sine — Copyright (c) 2014 David Hoskins, MIT. See THIRD_PARTY_NOTICES.md
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

// 2D simplex noise — webgl-noise, Copyright (C) 2011 Ashima Arts / Ian McEwan,
// (C) 2011-2016 Stefan Gustavson, MIT. See THIRD_PARTY_NOTICES.md
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p, int oct) {
  float s = 0.0, a = 0.5;
  // Rotate each octave by ~0.52 rad to break up grid alignment; lacunarity 1.97.
  mat2 r = mat2(0.866, 0.5, -0.5, 0.866);
  for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * snoise(p); p = r * p * 1.97 + vec2(3.1, 5.3); a *= 0.5; }
  return s;
}

// OKLab → sRGB, after Björn Ottosson's reference (c) 2020, public domain / MIT. See THIRD_PARTY_NOTICES.md
vec3 oklab2srgb(vec3 c) {
  float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  float l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  vec3 lin = clamp(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
   -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
   -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s), 0.0, 1.0);
  return mix(12.92 * lin, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, lin));
}

// blend modes (sRGB-encoded, as in Photoshop / Figma)
vec3 B_normal(vec3 b, vec3 s) { return s; }
vec3 B_multiply(vec3 b, vec3 s) { return b * s; }
vec3 B_screen(vec3 b, vec3 s) { return 1.0 - (1.0 - b) * (1.0 - s); }
vec3 B_overlay(vec3 b, vec3 s) { return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, b)); }
vec3 B_softlight(vec3 b, vec3 s) { return mix(2.0 * b * s + b * b * (1.0 - 2.0 * s), sqrt(max(b, 0.0)) * (2.0 * s - 1.0) + 2.0 * b * (1.0 - s), step(0.5, s)); }
vec3 B_hardlight(vec3 b, vec3 s) { return B_overlay(s, b); }
vec3 B_add(vec3 b, vec3 s) { return min(b + s, 1.0); }
vec3 B_difference(vec3 b, vec3 s) { return abs(b - s); }
`

const HELPERS: Record<string, string> = {
  dither: /* glsl */ `
// Ordered (Bayer) dither thresholds, by recursive interleave
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
// 1 where a tone of brightness lum gets ink, on a grid of cells (g = cell index, f = position inside it).
// 0 lines, 1 Bayer 4×4, 2 Bayer 8×8, 3 halftone dots, 4 crosshatch, 5 noise
float ditherInk(float lum, vec2 g, vec2 f, int pat) {
  lum = clamp(lum, 0.0, 1.0);
  if (pat == 0) {
    float r3 = mod(g.y, 3.0), r2 = mod(g.y, 2.0), ck = mod(g.x + g.y, 2.0);
    return lum > 0.9 ? 0.0 : lum > 0.66 ? step(r3, 0.5) : lum > 0.46 ? step(r2, 0.5) : lum > 0.26 ? max(step(r2, 0.5), step(ck, 0.5)) : 1.0;
  }
  if (pat == 1) return step(lum, bayer4(g) * 0.98 + 0.01);
  if (pat == 2) return step(lum, bayer8(g) * 0.98 + 0.01);
  if (pat == 3) {
    // dots on a 4-cell grid, rotated 45°, radius from darkness
    vec2 h = (g + f) / 4.0;
    h = vec2(h.x + h.y, h.y - h.x) * 0.7071;
    float d = length(fract(h) - 0.5);
    return step(d, sqrt(1.0 - lum) * 0.62);
  }
  if (pat == 4) {
    float a = step(mod(g.x + g.y, 4.0), 0.5), b = step(mod(g.x - g.y, 4.0), 0.5), c = step(mod(g.y, 3.0), 0.5);
    return lum > 0.85 ? 0.0 : lum > 0.6 ? a : lum > 0.38 ? max(a, b) : lum > 0.18 ? max(max(a, b), c) : 1.0;
  }
  return step(lum, hash12(g + 17.0));
}`,
  sdf2: /* glsl */ `
// 2D signed distances. sdHeart2 after Inigo Quilez, "2D distance functions" (MIT). See THIRD_PARTY_NOTICES.md
float dot2(vec2 v) { return dot(v, v); }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float sdHeart2(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}`,
  smiley: /* glsl */ `
// The heart-eyed smiley in face space (about -1..1, y up): two hearts leaning
// outward, and a thick ring cut flat by a tilted line.
// The face as the 3D object's shape 8 reads it (set by the Smiley layer before it marches)
vec4 gEye = vec4(0.34, 0.4, 0.44, 12.0);
vec4 gMouth = vec4(0.56, 0.3, -0.12, 0.04);
float gCut = -0.1222, gPulse = 1.0;
vec3 gDepth = vec3(0.22, 0.05, 0.0); // depth, bevel, inflate
float smileySDF(vec2 q, vec4 eye, float pulse, vec4 mouth, float cutTilt) {
  float es = eye.z * pulse;
  float tl = radians(eye.w);
  vec2 a = rot2(-tl) * (q - vec2(-eye.x, eye.y));
  vec2 c = rot2(tl) * (q - vec2(eye.x, eye.y));
  float h = min(sdHeart2(a / es + vec2(0.0, 0.5)), sdHeart2(c / es + vec2(0.0, 0.5))) * es;
  vec2 m = q - vec2(0.0, mouth.z);
  float ring = abs(length(m) - mouth.x) - mouth.y * 0.5;
  vec2 n = vec2(-sin(cutTilt), cos(cutTilt));
  return min(h, max(ring, dot(m, n) - mouth.w));
}
// A dropped SVG as a shape: its height is the layer's size (q.y in -1..1). Outside the
// padded field, add the distance to its edge so marching still converges.
float shapeImageSDF(vec2 q) {
  vec2 uv = 0.5 + vec2(q.x, -q.y) * uShapeK.xy;
  vec2 uc = clamp(uv, 0.0, 1.0);
  vec2 ts = vec2(textureSize(uShape, 0));
  float beyond = length((uv - uc) * ts) * uShapeK.y * 4.0 / ts.y;
  return textureLod(uShape, uc, 0.0).r + beyond;
}`,
  chevron: /* glsl */ `
float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }
// Op-art chevrons: zigzag stripes on a sphere, quantised into square cells,
// two inks with a bevel sliver and paper speckle.
vec3 chevronFill(vec2 p, vec4 st, float tilt, vec4 sp, int outside, vec3 ink, vec3 paper, vec3 pr, vec2 mo, float salt) {
  float asp = uRes.x / uRes.y;
  vec2 q = (p - 0.5) * vec2(asp, 1.0);
  float cell = pr.x / 1080.0;
  if (cell > 0.0) q = (floor(q / cell) + 0.5) * cell;
  vec2 d = (q - sp.zw) / max(sp.y, 1e-3);
  float r = length(d);
  float z = sqrt(max(1.0 - r * r, 0.0));
  vec2 sph = vec2(atan(d.x, max(z, 1e-4)), asin(clamp(d.y, -1.0, 1.0))) / 1.5707963;
  vec2 c = rot2(tilt) * mix(d, sph, sp.x * step(r, 1.0));
  c.x += uPhase / TAU * st.w * mo.x;
  float f = (c.y + st.z * st.w * tri(c.x / st.w)) * st.x - uPhase / TAU * mo.y;
  float band = fract(f);
  float aa = cell > 0.0 ? 1e-4 : max(fwidth(f), 1e-4);
  float e = band < st.y ? min(band, st.y - band) : -min(band - st.y, 1.0 - band);
  float inkM = clamp(e / aa + 0.5, 0.0, 1.0);
  float bev = step(st.y, band) * step(band, st.y + pr.y);
  vec3 col = mix(paper, ink, inkM);
  col = mix(col, mix(ink, vec3(0.0), 0.3), bev * (1.0 - inkM));
  float inside = cell > 0.0 ? step(r, 1.0) : clamp((1.0 - r) / max(fwidth(r), 1e-5) + 0.5, 0.0, 1.0);
  col = mix(outside == 0 ? ink : outside == 1 ? paper : col, col, inside);
  // paper through the ink, in clumps
  float k = clamp(length(col - paper) / max(length(ink - paper), 1e-3), 0.0, 1.0);
  float g = hash12(floor(gl_FragCoord.xy / max(uRes.y / 1080.0 * 1.3, 1.0)) + salt * 17.0);
  float clump = 0.5 + 0.5 * snoise((p - 0.5) * vec2(asp, 1.0) * 7.0 + salt);
  col = mix(col, paper, step(g, pr.z * (0.12 + 0.4 * clump)) * k * 0.85);
  return col;
}`,
  object3d: /* glsl */ `
// Signed distance functions after Inigo Quilez, "distance functions" (MIT). See THIRD_PARTY_NOTICES.md
struct ObjHit { float cover; vec3 n; vec3 rd; };
float sdRoundBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdCappedTorus(vec3 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  float k = (sc.y * p.x > sc.x * p.y) ? dot(p.xy, sc) : length(p.xy);
  return sqrt(dot(p, p) + ra * ra - 2.0 * ra * k) - rb;
}
float objSDF(vec3 q, int shape, float morph) {
  if (shape == 0) return length(q) - 0.8;
  if (shape == 1) return length(vec2(length(q.xy) - 0.62, q.z)) - 0.26;
  if (shape == 2) return sdRoundBox(q, vec3(0.58), 0.16);
  if (shape == 3) { q.y -= clamp(q.y, -0.45, 0.45); return length(q) - 0.38; }
  if (shape == 4) {
    // puffed like a balloon: thicker toward the middle of the 2D heart
    float d2 = sdHeart2(q.xy * 1.15 + vec2(0.0, 0.55)) / 1.15;
    float th = 0.05 + 0.3 * sqrt(clamp(-d2 * 3.0, 0.0, 1.0));
    vec2 w = vec2(d2, abs(q.z) - th);
    return (min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - 0.06) * 0.75;
  }
  if (shape == 5) {
    float d = length(q) - 0.72;
    d += morph * 0.14 * sin(3.1 * q.x + uPhase) * sin(2.7 * q.y + 2.0 * uPhase) * sin(3.3 * q.z - uPhase);
    return d * 0.7;
  }
  if (shape == 6) {
    float a = q.y * (0.4 + morph * 2.2);
    float c = cos(a), s = sin(a);
    q.xz = mat2(c, -s, s, c) * q.xz;
    return sdRoundBox(q, vec3(0.4, 0.78, 0.4), 0.1) * 0.7;
  }
  if (shape == 8 || shape == 9) {
    // the smiley (8) or the dropped SVG (9), extruded gDepth.x deep with gDepth.y rounded edges
    float b = gDepth.y;
    // a wide SVG or line of text is shrunk to fit the scene (k = its aspect), so it can turn
    // without leaving the camera's depth range; the layer scales its size back up by k
    float k = shape == 9 ? max(1.0, uShapeK.z) : 1.0;
    float d2 = shape == 8 ? smileySDF(q.xy, gEye, gPulse, gMouth, gCut) : shapeImageSDF(q.xy * k) / k;
    b /= k;
    float th = gDepth.x / k;
    if (gDepth.z > 0.001) {
      // inflate: thickness follows a round profile from the outline inward, like a balloon
      float t = clamp(-d2 / (gDepth.z * 1.2), 0.0, 1.0);
      th *= sqrt(t * (2.0 - t));
      b = min(b, th);
    }
    vec2 w = vec2(d2 + b, abs(q.z) - th + b);
    return (min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - b) * (gDepth.z > 0.001 ? 0.6 : 0.9);
  }
  vec3 r = vec3(q.x, 0.2 - q.y, q.z);
  float an = radians(mix(35.0, 175.0, morph));
  return sdCappedTorus(r, vec2(sin(an), cos(an)), 0.62, 0.17);
}
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
// a studio of softboxes for reflections: bright top, two strip lights, dark floor
vec3 studioEnv(vec3 r) {
  float top = smoothstep(0.25, 0.95, r.y);
  float strip = smoothstep(0.82, 0.97, abs(r.x)) * smoothstep(-0.5, 0.2, r.y);
  float horizon = smoothstep(-0.25, 0.25, r.y) * (1.0 - top);
  return vec3(0.06) + vec3(0.95) * top + vec3(0.85) * strip + vec3(0.22) * horizon;
}
// a 2D stretch of the rendered object (the Smiley layer's width / height), screen-aligned
vec2 gStretch = vec2(1.0);
ObjHit objMarch(vec2 p, vec2 c, float size, float yaw, float pitch, float roll, int shape, float morph) {
  float asp = uRes.x / uRes.y;
  vec2 q = (p - c) * vec2(asp, 1.0) / max(size * 0.5, 1e-3) / gStretch;
  vec3 ro = vec3(0.0, 0.0, 4.0);
  vec3 rd = normalize(vec3(q * 0.25, -1.0));
  mat3 Ri = transpose(rotZ(roll) * rotX(pitch) * rotY(yaw));
  float t = 2.4, minD = 1e9, tMin = t;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    float d = objSDF(Ri * (ro + rd * t), shape, morph);
    if (d < minD) { minD = d; tMin = t; }
    if (d < 0.001) { hit = true; break; }
    t += d;
    if (t > 6.0) break;
  }
  ObjHit h;
  h.rd = rd;
  float px = 2.0 / (uRes.y * max(size * 0.5, 1e-3));
  h.cover = hit ? 1.0 : 1.0 - smoothstep(0.0, px * 1.5, minD);
  if (h.cover <= 0.0) { h.n = vec3(0.0, 0.0, 1.0); return h; }
  vec3 pos = ro + rd * (hit ? t : tMin);
  vec2 e = vec2(0.0015, 0.0);
  h.n = normalize(vec3(
    objSDF(Ri * (pos + e.xyy), shape, morph) - objSDF(Ri * (pos - e.xyy), shape, morph),
    objSDF(Ri * (pos + e.yxy), shape, morph) - objSDF(Ri * (pos - e.yxy), shape, morph),
    objSDF(Ri * (pos + e.yyx), shape, morph) - objSDF(Ri * (pos - e.yyx), shape, morph)));
  return h;
}
// Materials: 0 gloss, 1 chrome, 2 glass, 3 clay, 4 pearl, 5 toon, 6 screen dither
vec3 shadeObj(ObjHit h, int m, vec3 tint, vec3 paper, vec3 L, vec3 envScene, vec3 refr, float scene, float shift, vec2 cell) {
  vec3 n = h.n, v = -h.rd;
  float ndv = max(dot(n, v), 0.0);
  float fr = mix(0.04, 1.0, pow(1.0 - ndv, 5.0));
  vec3 r = reflect(h.rd, n);
  vec3 env = studioEnv(r);
  float dif = max(dot(n, L), 0.0);
  float spec = pow(max(dot(r, L), 0.0), 64.0);
  vec3 c;
  if (m == 0) {
    // black lacquer: a dark body, sharp softbox reflections, a hot highlight
    vec3 e = mix(env, envScene, scene * 0.6);
    c = tint * (0.08 + 0.3 * dif) + e * mix(0.05, 0.95, fr) + smoothstep(0.55, 0.9, env.r) * 0.45 + pow(max(dot(r, L), 0.0), 140.0) * 1.6;
  } else if (m == 1) {
    c = mix(env, envScene, scene) * mix(vec3(1.0), tint, 0.6) + spec * 1.4;
  } else if (m == 2) {
    c = mix(refr * mix(vec3(1.0), tint, 0.55), mix(env, envScene, scene * 0.5), clamp(fr * 1.3 + 0.05, 0.0, 1.0)) + spec * 1.6;
  } else if (m == 3) {
    c = tint * (0.22 + 0.85 * (dif * 0.7 + 0.3)) * (0.8 + 0.2 * n.y) + pow(1.0 - ndv, 3.0) * 0.12 + spec * 0.1;
  } else if (m == 4) {
    vec3 film = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + ndv * 1.4 + shift));
    c = mix(tint, film, 0.6) * (0.35 + 0.7 * dif) + mix(env, envScene, scene) * (fr * 0.8 + 0.15) + spec * 1.1;
  } else if (m == 5) {
    float band = dif > 0.65 ? 1.0 : dif > 0.25 ? 0.7 : 0.42;
    c = mix(tint * band * 0.15, tint * band + step(0.45, spec) * 0.5, smoothstep(0.0, 0.35, ndv));
  } else {
    // 1-bit screen dither in screen-space cells, in the chosen pattern
    float lum = 0.06 + 0.85 * dif + spec * 0.5;
    vec2 cp = gl_FragCoord.xy / max(cell.x * uRes.y / 1080.0, 1.0);
    float ink = ditherInk(lum, floor(cp), fract(cp), int(cell.y));
    c = mix(paper, tint, ink);
  }
  return clamp(c, 0.0, 1.0);
}`,
  meshGradient: /* glsl */ `
vec3 meshGradient(vec2 p, vec3 cols[8], int n, float soft, float scale, float drift, float cycles, float salt) {
  float asp = uRes.x / uRes.y;
  vec2 q = (p - 0.5) * vec2(asp, 1.0) / scale;
  vec3 acc = vec3(0.0);
  float tw = 0.0;
  float pw = mix(7.0, 1.4, soft);
  for (int k = 0; k < 8; k++) {
    if (k >= n) break;
    float fk = float(k) + salt;
    vec2 home = (vec2(hash11(fk * 3.17 + 0.3), hash11(fk * 7.41 + 1.9)) - 0.5) * vec2(asp * 0.95, 0.95);
    float ph = hash11(fk * 1.93 + 4.2) * TAU;
    float dir = hash11(fk * 5.3 + 2.7) > 0.5 ? 1.0 : -1.0;
    float a = uPhase * cycles * dir + ph;
    vec2 orbit = vec2(cos(a), sin(a * (1.0 + mod(float(k), 2.0)))) * 0.3 * drift;
    float d = length(q - home - orbit);
    float w = 1.0 / (pow(d, pw) + 1e-4);
    acc += cols[k] * w;
    tw += w;
  }
  return oklab2srgb(acc / max(tw, 1e-6));
}`,
  gradientFill: /* glsl */ `
vec3 gradientFill(vec2 p, float pos[8], vec3 cols[8], int n, float ang, int shape, float spin) {
  float asp = uRes.x / uRes.y;
  vec2 q = (p - 0.5) * vec2(asp, 1.0);
  float a = radians(ang) + uPhase * spin;
  float t;
  if (shape == 0) { vec2 d = vec2(sin(a), cos(a)); float ext = abs(d.x) * asp * 0.5 + abs(d.y) * 0.5; t = dot(q, d) / (2.0 * ext) + 0.5; }
  else if (shape == 1) { t = length(q) / (0.5 * length(vec2(asp, 1.0))); }
  else { t = fract((atan(q.x, q.y) - a) / TAU); }
  t = clamp(t, 0.0, 1.0);
  vec3 c = cols[0];
  for (int k = 1; k < 8; k++) { if (k >= n) break; c = mix(c, cols[k], clamp((t - pos[k - 1]) / max(pos[k] - pos[k - 1], 1e-4), 0.0, 1.0)); }
  return oklab2srgb(c);
}`,
  warpDomain: /* glsl */ `
vec2 warpDomain(vec2 p, int style, float amt, float sc, int oct, float evolve, float cycles, float salt) {
  vec2 k = vec2(uRes.x / uRes.y, 1.0);
  vec2 q = (p - 0.5) * k;
  if (style == 0) {
    vec2 s = q * sc + salt * 3.1;
    vec2 o = vec2(cos(uPhase), sin(uPhase)) * evolve;
    // Two-level domain warp (technique described by Inigo Quilez, "Domain warping"); offsets are our own.
    vec2 a = vec2(fbm(s + o, oct), fbm(s + vec2(3.7, 6.1) - o, oct));
    vec2 b = vec2(fbm(s + 1.6 * a + vec2(4.9, 2.3) + o * 0.5, oct), fbm(s + 1.6 * a + vec2(7.4, 8.6) - o * 0.5, oct));
    q += amt * 0.4 * b;
  } else if (style == 1) {
    float r = length(q);
    float ang = amt * 3.0 * exp(-r * sc * 1.2) * (1.0 + 0.35 * sin(uPhase * cycles));
    float c = cos(ang), s2 = sin(ang);
    q = mat2(c, s2, -s2, c) * q;
  } else if (style == 2) {
    q += amt * 0.06 * vec2(sin(q.y * sc * TAU + uPhase * cycles), sin(q.x * sc * 5.3 + uPhase * cycles + 1.7));
  } else {
    float r = length(q) + 1e-4;
    q += (q / r) * amt * 0.03 * sin(r * sc * 24.0 - uPhase * cycles);
  }
  return q / k + 0.5;
}`,
  gradientMap: /* glsl */ `
vec3 gradientMap(float t, vec3 cols[8], int n) {
  if (n < 2) return oklab2srgb(cols[0]);
  float x = t * float(n - 1);
  int i = clamp(int(floor(x)), 0, n - 2);
  return oklab2srgb(mix(cols[i], cols[i + 1], clamp(x - float(i), 0.0, 1.0)));
}`,
  grainNoise: /* glsl */ `
vec3 grainNoise(vec2 p, float size, float anim, float chroma, float salt) {
  vec2 cell = floor(p * uRes / max(size * uRes.y / 1080.0, 1e-3));
  float f = anim > 0.5 ? floor(uTime * 24.0) : 0.0;
  vec2 o = vec2(f * 17.13 + salt * 11.0, f * 7.31);
  // two taps → a soft bell around 0.5, closer to film than flat white noise
  float n = (hash12(cell + o) + hash12(cell + o + 91.3)) * 0.5;
  return chroma > 0.5 ? vec3(n, (hash12(cell + o + 31.7) + hash12(cell + o + 12.9)) * 0.5, (hash12(cell + o + 63.1) + hash12(cell + o + 47.3)) * 0.5) : vec3(n);
}`,
}
const HELPER_FOR: Partial<Record<string, string[]>> = {
  mesh: ['meshGradient'], gradient: ['gradientFill'], warp: ['warpDomain'], gradmap: ['gradientMap'], grain: ['grainNoise'],
  smiley: ['dither', 'sdf2', 'smiley', 'object3d'], chevron: ['sdf2', 'chevron'], object: ['dither', 'sdf2', 'smiley', 'object3d'], dither: ['dither'],
}

/** stable 0–10 salt per layer id, so reordering never reshuffles a layer's noise */
const saltOf = (id: string, seed: number) => {
  let h = 2166136261
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (((h >>> 0) % 1000) / 100 + (seed % 997) * 0.731) % 50
}

const visibleBottomUp = (layers: Layer[]) => layers.filter((l) => l.visible).slice().reverse()

/** A key that changes only when the shader source must change (types, order, visibility, blend). */
export const structureKey = (layers: Layer[]) => visibleBottomUp(layers).map((l) => `${l.type}:${l.blend}`).join('|')

export function buildShader(layers: Layer[]): { fragment: string; uniforms: UniformDecl[] } {
  const stack = visibleBottomUp(layers)
  const decls: UniformDecl[] = [
    { name: 'uRes', type: 'vec2' }, { name: 'uTime', type: 'float' }, { name: 'uPhase', type: 'float' }, { name: 'uBg', type: 'vec3' }, { name: 'uBg2', type: 'vec3' }, { name: 'uBgMode', type: 'vec2' }, { name: 'uShape', type: 'sampler2D' }, { name: 'uShapeK', type: 'vec4' },
  ]
  const helpers = new Set<string>()
  const fns: string[] = [`// 0 · background
vec3 L0(vec2 p) {
  if (uBgMode.x < 0.5) return uBg;
  float asp = uRes.x / uRes.y;
  vec2 q = (p - 0.5) * vec2(asp, 1.0);
  float t;
  if (uBgMode.x < 1.5) { float a = radians(uBgMode.y); vec2 d = vec2(sin(a), cos(a)); t = dot(q, d) / (abs(d.x) * asp + abs(d.y)) + 0.5; }
  else t = length(q) / (0.5 * length(vec2(asp, 1.0)));
  return mix(uBg, uBg2, smoothstep(0.0, 1.0, clamp(t, 0.0, 1.0)));
}`]
  const uniformLines: string[] = []

  stack.forEach((layer, k) => {
    const i = k + 1
    const def = LAYER_TYPES[layer.type]
    const u = (n: string) => `u${i}_${n}`
    const prev = `L${i - 1}`
    const all = [...def.uniforms.map((x) => ({ name: x.name, type: x.type })), { name: 'opacity', type: 'float' }, { name: 'salt', type: 'float' }]
    for (const x of all) {
      const arr = x.type.match(/^(\w+)\[(\d+)\]$/)
      uniformLines.push(arr ? `uniform ${arr[1]} ${u(x.name)}[${arr[2]}];` : `uniform ${x.type} ${u(x.name)};`)
      decls.push({ name: u(x.name), type: x.type })
    }
    for (const h of HELPER_FOR[layer.type] ?? []) helpers.add(h)
    const head = `// ${i} · ${layer.name}${def.kind === 'domain' ? '' : ` · ${layer.blend}`}`
    if (def.kind === 'fill') {
      fns.push(`${head}\nvec3 L${i}(vec2 p) {\n  vec3 b = ${prev}(p);\n  vec4 s;\n  ${def.glsl(u, prev).trim()}\n  return mix(b, ${BLEND_FN[layer.blend]}(b, s.rgb), clamp(s.a * ${u('opacity')}, 0.0, 1.0));\n}`)
    } else if (def.kind === 'domain') {
      fns.push(`${head}\nvec3 L${i}(vec2 p) {\n  vec2 w;\n  ${def.glsl(u, prev).trim()}\n  return ${prev}(mix(p, w, ${u('opacity')}));\n}`)
    } else {
      fns.push(`${head}\nvec3 L${i}(vec2 p) {\n  vec3 b, s;\n  ${def.glsl(u, prev).trim()}\n  return mix(b, ${BLEND_FN[layer.blend]}(b, s), clamp(${u('opacity')}, 0.0, 1.0));\n}`)
    }
  })

  const top = `L${stack.length}`
  const fragment = [
    COMMON.trim(),
    uniformLines.length ? `\n// layer uniforms\n${uniformLines.join('\n')}` : '',
    ...[...helpers].map((h) => HELPERS[h]),
    '',
    fns.join('\n\n'),
    '',
    `void main() {
  vec2 p = gl_FragCoord.xy / uRes;
  vec3 c = ${top}(p);
  c += (hash12(gl_FragCoord.xy) - 0.5) / 255.0; // de-band smooth gradients
  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
  ].join('\n')
  return { fragment, uniforms: decls }
}

/** Uniform values for one frame. Pure in (layers, doc). */
export function uniformValues(layers: Layer[], doc: DocUniforms): Record<string, UniformValue> {
  const out: Record<string, UniformValue> = {
    uRes: [doc.width, doc.height],
    uTime: doc.time,
    uPhase: (doc.time / Math.max(0.001, doc.loop)) * Math.PI * 2,
    uBg: hexToRgb01(doc.bg),
    uBg2: hexToRgb01(doc.bg2 ?? doc.bg),
    uBgMode: [doc.bgMode ?? 0, doc.bgAngle ?? 180],
    uShapeK: ((sh) => (sh ? [sh.k[0], sh.k[1], sh.aspect, 0] : [0.5, 0.5, 1, 0]))(getShape()),
  }
  visibleBottomUp(layers).forEach((layer, k) => {
    const i = k + 1
    const def = LAYER_TYPES[layer.type]
    for (const x of def.uniforms) out[`u${i}_${x.name}`] = x.get(layer.params)
    out[`u${i}_opacity`] = layer.opacity
    out[`u${i}_salt`] = saltOf(layer.id, doc.seed)
  })
  return out
}
