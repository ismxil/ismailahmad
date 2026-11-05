/* ---------------------------------------------------------------------------
   Raw WebGL2 renderer for a layer stack. One full-screen triangle, one
   generated fragment shader per stack *structure* (cached), uniforms per
   frame. Used three ways: the live stage, the preset thumbnails and the
   exporter (which renders at the true output size rather than upscaling).
--------------------------------------------------------------------------- */
import { buildShader, structureKey, uniformValues, type DocUniforms, type UniformDecl } from './codegen'
import type { Layer } from './layers'
import { getShape, shapeVersion } from './shape-image'

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

interface Compiled { prog: WebGLProgram; locs: { name: string; type: string; loc: WebGLUniformLocation | null }[] }

export class ShaderRenderer {
  readonly gl: WebGL2RenderingContext
  private cache = new Map<string, Compiled>()
  private current: Compiled | null = null
  private vao: WebGLVertexArrayObject | null
  private shapeTex: WebGLTexture | null = null
  private shapeVer = -1
  error: string | null = null
  lost = false

  constructor(readonly canvas: HTMLCanvasElement | OffscreenCanvas, opts: { preserve?: boolean } = {}) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve, powerPreference: 'high-performance' }) as WebGL2RenderingContext | null
    if (!gl) throw new Error('WebGL2 is not available in this browser.')
    this.gl = gl
    this.vao = gl.createVertexArray()
    if ('addEventListener' in canvas) {
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true }, false)
      canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.cache.clear(); this.current = null; this.vao = this.gl.createVertexArray(); this.shapeTex = null; this.shapeVer = -1 }, false)
    }
  }

  private compile(layers: Layer[]): Compiled | null {
    const key = structureKey(layers)
    const hit = this.cache.get(key)
    if (hit) return hit
    const { fragment, uniforms } = buildShader(layers)
    const gl = this.gl
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(log ?? 'Shader failed to compile') }
      return s
    }
    try {
      const vs = sh(gl.VERTEX_SHADER, VERT)
      const fs = sh(gl.FRAGMENT_SHADER, fragment)
      const prog = gl.createProgram()!
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'Link failed')
      const locs = uniforms.map((u: UniformDecl) => ({ ...u, loc: gl.getUniformLocation(prog, u.name) }))
      const c = { prog, locs }
      this.cache.set(key, c)
      if (this.cache.size > 32) { const [k0, v0] = this.cache.entries().next().value!; if (v0 !== c) { gl.deleteProgram(v0.prog); this.cache.delete(k0) } }
      this.error = null
      return c
    } catch (e) {
      this.error = (e as Error).message
      console.error('[smiley studio] shader error\n', this.error)
      return null
    }
  }

  /** Upload the custom shape's distance field when it changed (or first use): far away when there is none.
   *  Linear, no mipmaps: layers sample it inside branches. */
  private bindShape() {
    const gl = this.gl
    if (!this.shapeTex) this.shapeTex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.shapeTex)
    if (this.shapeVer === shapeVersion()) return
    const sh = getShape()
    // the distance field as one 16-bit float channel (filterable in WebGL2 without extensions)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    if (sh) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, sh.w, sh.h, 0, gl.RED, gl.FLOAT, sh.sdf)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, 1, 1, 0, gl.RED, gl.FLOAT, new Float32Array([100]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.shapeVer = shapeVersion()
  }

  /** Draw one frame of `layers` at the canvas's current backing size. */
  render(layers: Layer[], doc: Omit<DocUniforms, 'width' | 'height'>) {
    if (this.lost) return
    const gl = this.gl
    const c = this.compile(layers) ?? this.current
    if (!c) return
    this.current = c
    const w = this.canvas.width, h = this.canvas.height
    gl.viewport(0, 0, w, h)
    gl.useProgram(c.prog)
    this.bindShape()
    const vals = uniformValues(layers, { ...doc, width: w, height: h })
    for (const u of c.locs) {
      if (!u.loc) continue
      if (u.type === 'sampler2D') { gl.uniform1i(u.loc, 0); continue }
      const v = vals[u.name]
      if (v === undefined) continue
      switch (u.type) {
        case 'float': gl.uniform1f(u.loc, v as number); break
        case 'int': gl.uniform1i(u.loc, v as number); break
        case 'vec2': gl.uniform2fv(u.loc, v as number[]); break
        case 'vec3': gl.uniform3fv(u.loc, v as number[]); break
        case 'vec3[8]': gl.uniform3fv(u.loc, v as number[]); break
        case 'vec4': gl.uniform4fv(u.loc, v as number[]); break
        case 'float[8]': gl.uniform1fv(u.loc, v as number[]); break
      }
    }
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** Free programs. The context itself is kept: React StrictMode re-mounts onto the same canvas, and
   *  getContext() would hand back a lost context if we had forced a loss here. */
  dispose() {
    for (const c of this.cache.values()) this.gl.deleteProgram(c.prog)
    this.cache.clear()
    this.current = null
    if (this.vao) this.gl.deleteVertexArray(this.vao)
    if (this.shapeTex) this.gl.deleteTexture(this.shapeTex)
    this.shapeTex = null
    this.shapeVer = -1
    this.vao = null
  }
}
