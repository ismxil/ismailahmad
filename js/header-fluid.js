/**
 * GPU fluid clipped to header brand text — Medium preset inspired by
 * https://haxiomic.github.io/GPU-Fluid-Experiments/html5/?q=Medium
 */

const MEDIUM = {
  simResolution: 128,
  dyeResolution: 512,
  pressureIterations: 12,
  curl: 24,
  densityDissipation: 0.965,
  velocityDissipation: 0.985,
  splatRadius: 0.014,
  splatForce: 3200,
};

const BASE_VERT = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const SPLAT_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_target;
uniform float u_aspect;
uniform vec2 u_point;
uniform vec3 u_color;
uniform float u_radius;
void main() {
  vec2 p = v_uv - u_point;
  p.x *= u_aspect;
  vec2 tex = texture2D(u_target, v_uv).xy;
  float d = exp(-dot(p, p) / u_radius);
  tex += u_color.xy * d;
  gl_FragColor = vec4(tex, 0.0, 1.0);
}`;

const DYE_SPLAT_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_target;
uniform float u_aspect;
uniform vec2 u_point;
uniform vec3 u_color;
uniform float u_radius;
void main() {
  vec2 p = v_uv - u_point;
  p.x *= u_aspect;
  vec3 tex = texture2D(u_target, v_uv).rgb;
  float d = exp(-dot(p, p) / u_radius);
  tex += u_color * d;
  gl_FragColor = vec4(tex, 1.0);
}`;

const ADVECT_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_texel;
uniform float u_dt;
uniform float u_dissipation;
void main() {
  vec2 vel = texture2D(u_velocity, v_uv).xy;
  vec2 coord = v_uv - u_dt * vel * u_texel * 8.0;
  gl_FragColor = u_dissipation * texture2D(u_source, coord);
}`;

const DIVERGENCE_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
void main() {
  float L = texture2D(u_velocity, v_uv - vec2(u_texel.x, 0.0)).x;
  float R = texture2D(u_velocity, v_uv + vec2(u_texel.x, 0.0)).x;
  float T = texture2D(u_velocity, v_uv + vec2(0.0, u_texel.y)).y;
  float B = texture2D(u_velocity, v_uv - vec2(0.0, u_texel.y)).y;
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const PRESSURE_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_texel;
void main() {
  float L = texture2D(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
  float R = texture2D(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
  float T = texture2D(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
  float B = texture2D(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
  float C = texture2D(u_pressure, v_uv).x;
  float div = texture2D(u_divergence, v_uv).x;
  float pressure = (L + R + B + T - div) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const GRADIENT_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
void main() {
  float L = texture2D(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
  float R = texture2D(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
  float T = texture2D(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
  float B = texture2D(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
  vec2 vel = texture2D(u_velocity, v_uv).xy;
  vel.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}`;

const CURL_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
void main() {
  float L = texture2D(u_velocity, v_uv - vec2(u_texel.x, 0.0)).y;
  float R = texture2D(u_velocity, v_uv + vec2(u_texel.x, 0.0)).y;
  float T = texture2D(u_velocity, v_uv + vec2(0.0, u_texel.y)).x;
  float B = texture2D(u_velocity, v_uv - vec2(0.0, u_texel.y)).x;
  float curl = R - L - T + B;
  gl_FragColor = vec4(0.5 * curl, 0.0, 0.0, 1.0);
}`;

const VORTICITY_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_curlTex;
uniform vec2 u_texel;
uniform float u_strength;
uniform float u_dt;
void main() {
  float L = texture2D(u_curlTex, v_uv - vec2(u_texel.x, 0.0)).x;
  float R = texture2D(u_curlTex, v_uv + vec2(u_texel.x, 0.0)).x;
  float T = texture2D(u_curlTex, v_uv + vec2(0.0, u_texel.y)).x;
  float B = texture2D(u_curlTex, v_uv - vec2(0.0, u_texel.y)).x;
  float C = texture2D(u_curlTex, v_uv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= u_strength * C;
  force.y *= -1.0;
  vec2 vel = texture2D(u_velocity, v_uv).xy;
  vel += force * u_dt;
  gl_FragColor = vec4(vel, 0.0, 1.0);
}`;

const CLEAR_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform float u_value;
void main() {
  gl_FragColor = u_value * texture2D(u_texture, v_uv);
}`;

const DISPLAY_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_dye;
uniform vec3 u_brand;
void main() {
  vec3 dye = texture2D(u_dye, v_uv).rgb;
  float flow = clamp(length(dye) * 1.8, 0.0, 1.0);
  vec3 fill = mix(u_brand, u_brand + dye * 1.35, flow);
  gl_FragColor = vec4(fill, 1.0);
}`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vert, frag) {
  const program = gl.createProgram();
  const vs = createShader(gl, gl.VERTEX_SHADER, vert);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function getUniforms(gl, program) {
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return uniforms;
}

function createFBO(gl, w, h, internalFormat, format, type, filter) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return { texture, fbo, width: w, height: h, texelX: 1 / w, texelY: 1 / h };
}

function createDoubleFBO(gl, w, h, internalFormat, format, type, filter) {
  let fbo1 = createFBO(gl, w, h, internalFormat, format, type, filter);
  let fbo2 = createFBO(gl, w, h, internalFormat, format, type, filter);
  return {
    width: w,
    height: h,
    texelX: 1 / w,
    texelY: 1 / h,
    read() {
      return fbo1;
    },
    write() {
      return fbo2;
    },
    swap() {
      const t = fbo1;
      fbo1 = fbo2;
      fbo2 = t;
    },
  };
}

function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    default:
      return [v, p, q];
  }
}

class HeaderFluidEffect {
  constructor(root) {
    this.root = root;
    this.content = root.querySelector('.header-fluid__content') || root;
    this.title = this.content.querySelector('h1');
    this.logo = this.content.querySelector('img');
    if (this.logo && !this.logo.parentElement.classList.contains('header-fluid__logo-wrap')) {
      const wrap = document.createElement('span');
      wrap.className = 'header-fluid__logo-wrap';
      this.logo.parentNode.insertBefore(wrap, this.logo);
      wrap.appendChild(this.logo);
      this.logoWrap = wrap;
    } else {
      this.logoWrap = this.logo?.parentElement;
    }
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'header-fluid__canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.content.appendChild(this.canvas);

    this.active = false;
    this.idleTimer = 0;
    this.raf = 0;
    this.lastTime = 0;
    this.fillFrame = 0;
    this.pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false };
    this.hue = Math.random();
    this.brandColor = [0.224, 0.231, 0.996];
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (this.reducedMotion || !this.initGL()) {
      this.canvas.remove();
      return;
    }

    this.resize();
    this.bindEvents();
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.content);
    }
    window.addEventListener('resize', this.onResize);
    if (document.fonts) {
      document.fonts.ready.then(() => {
        this.resize();
      });
    }
    if (this.logo && !this.logo.complete) {
      this.logo.addEventListener('load', () => {
        if (this.active) this.applyFill();
      }, { once: true });
    }
  }

  onResize = () => this.resize();

  initGL() {
    const gl =
      this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
      }) || null;
    if (!gl) return false;

    this.gl = gl;
    const halfFloat = gl.getExtension('OES_texture_half_float');
    const halfFloatLinear = gl.getExtension('OES_texture_half_float_linear');
    const supportLinear = !!halfFloatLinear;
    const type = halfFloat ? halfFloat.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
    const filter = supportLinear ? gl.LINEAR : gl.NEAREST;

    this.ext = { type, filter, format: gl.RGBA, internalFormat: gl.RGBA };
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.programs = {
      splat: createProgram(gl, BASE_VERT, SPLAT_FRAG),
      dyeSplat: createProgram(gl, BASE_VERT, DYE_SPLAT_FRAG),
      advect: createProgram(gl, BASE_VERT, ADVECT_FRAG),
      divergence: createProgram(gl, BASE_VERT, DIVERGENCE_FRAG),
      pressure: createProgram(gl, BASE_VERT, PRESSURE_FRAG),
      gradient: createProgram(gl, BASE_VERT, GRADIENT_FRAG),
      curl: createProgram(gl, BASE_VERT, CURL_FRAG),
      vorticity: createProgram(gl, BASE_VERT, VORTICITY_FRAG),
      clear: createProgram(gl, BASE_VERT, CLEAR_FRAG),
      display: createProgram(gl, BASE_VERT, DISPLAY_FRAG),
    };

    if (!this.programs.display) return false;

    this.uniforms = {};
    Object.keys(this.programs).forEach((key) => {
      this.uniforms[key] = getUniforms(gl, this.programs[key]);
    });

    this.initFramebuffers();
    return true;
  }

  initFramebuffers() {
    const gl = this.gl;
    const { type, filter, format, internalFormat } = this.ext;
    const sim = MEDIUM.simResolution;
    const dye = MEDIUM.dyeResolution;

    this.velocity = createDoubleFBO(gl, sim, sim, internalFormat, format, type, filter);
    this.dyeFBO = createDoubleFBO(gl, dye, dye, internalFormat, format, type, filter);
    this.divergence = createFBO(gl, sim, sim, internalFormat, format, type, filter);
    this.curl = createFBO(gl, sim, sim, internalFormat, format, type, filter);
    this.pressure = createDoubleFBO(gl, sim, sim, internalFormat, format, type, filter);
  }

  bindQuad(program) {
    const gl = this.gl;
    const loc = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  blit(target, name, uniforms) {
    const gl = this.gl;
    const program = this.programs[name];
    const u = this.uniforms[name];
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(0, 0, target ? target.width : this.canvas.width, target ? target.height : this.canvas.height);
    gl.useProgram(program);
    this.bindQuad(program);

    Object.keys(uniforms).forEach((key) => {
      const loc = u[key];
      const val = uniforms[key];
      if (loc == null || val == null) return;
      if (val.texture != null) {
        gl.activeTexture(gl.TEXTURE0 + val.unit);
        gl.bindTexture(gl.TEXTURE_2D, val.texture);
        gl.uniform1i(loc, val.unit);
      } else if (typeof val === 'number') {
        gl.uniform1f(loc, val);
      } else if (val.length === 2) {
        gl.uniform2f(loc, val[0], val[1]);
      } else if (val.length === 3) {
        gl.uniform3f(loc, val[0], val[1], val[2]);
      }
    });

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize() {
    if (!this.gl) return;
    const rect = this.content.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const padX = 40;
    const padY = 56;
    const w = Math.max(1, Math.ceil((rect.width + padX) * dpr));
    const h = Math.max(1, Math.ceil((rect.height + padY) * dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.left = `${-padX * 0.5}px`;
    this.canvas.style.top = `${-padY * 0.5}px`;
    this.canvas.style.width = `${rect.width + padX}px`;
    this.canvas.style.height = `${rect.height + padY}px`;
    this.aspect = w / h;
    this.initFramebuffers();
    if (this.active) this.applyFill();
  }

  canvasBackgroundStyles(targetEl) {
    const canvasRect = this.canvas.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    return {
      backgroundSize: `${canvasRect.width}px ${canvasRect.height}px`,
      backgroundPosition: `${canvasRect.left - targetRect.left}px ${canvasRect.top - targetRect.top}px`,
      backgroundRepeat: 'no-repeat',
    };
  }

  applyFill() {
    const url = this.canvas.toDataURL();

    if (this.title) {
      const bg = this.canvasBackgroundStyles(this.title);
      this.title.style.backgroundImage = `url(${url})`;
      this.title.style.backgroundSize = bg.backgroundSize;
      this.title.style.backgroundPosition = bg.backgroundPosition;
      this.title.style.backgroundRepeat = bg.backgroundRepeat;
    }

    if (this.logo && this.logoWrap) {
      const bg = this.canvasBackgroundStyles(this.logoWrap);
      this.logoWrap.style.backgroundImage = `url(${url})`;
      this.logoWrap.style.backgroundSize = bg.backgroundSize;
      this.logoWrap.style.backgroundPosition = bg.backgroundPosition;
      this.logoWrap.style.backgroundRepeat = bg.backgroundRepeat;
      this.logoWrap.style.webkitMaskImage = `url(${this.logo.src})`;
      this.logoWrap.style.maskImage = `url(${this.logo.src})`;
      this.logoWrap.style.webkitMaskSize = 'contain';
      this.logoWrap.style.maskSize = 'contain';
      this.logoWrap.style.webkitMaskRepeat = 'no-repeat';
      this.logoWrap.style.maskRepeat = 'no-repeat';
      this.logoWrap.style.webkitMaskPosition = 'center';
      this.logoWrap.style.maskPosition = 'center';
    }
  }

  clearFill() {
    if (this.title) {
      this.title.style.backgroundImage = '';
      this.title.style.backgroundSize = '';
      this.title.style.backgroundPosition = '';
      this.title.style.backgroundRepeat = '';
    }

    if (this.logoWrap) {
      this.logoWrap.style.backgroundImage = '';
      this.logoWrap.style.backgroundSize = '';
      this.logoWrap.style.backgroundPosition = '';
      this.logoWrap.style.backgroundRepeat = '';
      this.logoWrap.style.webkitMaskImage = '';
      this.logoWrap.style.maskImage = '';
      this.logoWrap.style.webkitMaskSize = '';
      this.logoWrap.style.maskSize = '';
      this.logoWrap.style.webkitMaskRepeat = '';
      this.logoWrap.style.maskRepeat = '';
      this.logoWrap.style.webkitMaskPosition = '';
      this.logoWrap.style.maskPosition = '';
    }
  }

  bindEvents() {
    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = 1 - (clientY - rect.top) / rect.height;
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
      this.pointer.dx = nx - this.pointer.x;
      this.pointer.dy = ny - this.pointer.y;
      this.pointer.x = nx;
      this.pointer.y = ny;
      this.pointer.moved = true;
      this.setActive(true);
    };

    this.canvas.addEventListener('pointerenter', () => this.setActive(true));
    this.canvas.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      onMove(e.clientX, e.clientY);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.targetTouches[0];
      if (t) onMove(t.clientX, t.clientY);
    }, { passive: false });

    this.root.addEventListener('pointerleave', () => {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.setActive(false), 900);
    });
  }

  setActive(value) {
    if (this.active === value) {
      if (value && !this.raf) this.raf = requestAnimationFrame(this.loop);
      return;
    }
    this.active = value;
    if (value) {
      this.root.classList.add('is-active');
      this.seedFluid();
      this.applyFill();
      if (!this.raf) this.raf = requestAnimationFrame(this.loop);
      return;
    }
    this.root.classList.remove('is-active');
    this.clearFill();
  }

  seedFluid() {
    for (let i = 0; i < 5; i++) {
      const x = 0.12 + Math.random() * 0.76;
      const y = 0.28 + Math.random() * 0.44;
      this.splat(
        x,
        y,
        (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.03,
        this.brandColor
      );
    }
  }

  splat(x, y, dx, dy, color) {
    const gl = this.gl;
    const aspect = this.aspect;

    this.blit(this.velocity.write(), 'splat', {
      u_target: { texture: this.velocity.read().texture, unit: 0 },
      u_aspect: aspect,
      u_point: [x, y],
      u_color: [dx * MEDIUM.splatForce, dy * MEDIUM.splatForce, 0],
      u_radius: MEDIUM.splatRadius,
    });
    this.velocity.swap();

    this.blit(this.dyeFBO.write(), 'dyeSplat', {
      u_target: { texture: this.dyeFBO.read().texture, unit: 0 },
      u_aspect: aspect,
      u_point: [x, y],
      u_color: color,
      u_radius: MEDIUM.splatRadius,
    });
    this.dyeFBO.swap();
  }

  step(dt) {
    const curl = MEDIUM.curl;
    const pressureIters = MEDIUM.pressureIterations;

    this.blit(this.curl, 'curl', {
      u_velocity: { texture: this.velocity.read().texture, unit: 0 },
      u_texel: [this.velocity.texelX, this.velocity.texelY],
    });

    this.blit(this.velocity.write(), 'vorticity', {
      u_velocity: { texture: this.velocity.read().texture, unit: 0 },
      u_curlTex: { texture: this.curl.texture, unit: 1 },
      u_texel: [this.velocity.texelX, this.velocity.texelY],
      u_strength: curl,
      u_dt: dt,
    });
    this.velocity.swap();

    this.blit(this.velocity.write(), 'advect', {
      u_velocity: { texture: this.velocity.read().texture, unit: 0 },
      u_source: { texture: this.velocity.read().texture, unit: 1 },
      u_texel: [this.velocity.texelX, this.velocity.texelY],
      u_dt: dt,
      u_dissipation: MEDIUM.velocityDissipation,
    });
    this.velocity.swap();

    this.blit(this.dyeFBO.write(), 'advect', {
      u_velocity: { texture: this.velocity.read().texture, unit: 0 },
      u_source: { texture: this.dyeFBO.read().texture, unit: 1 },
      u_texel: [this.dyeFBO.texelX, this.dyeFBO.texelY],
      u_dt: dt,
      u_dissipation: MEDIUM.densityDissipation,
    });
    this.dyeFBO.swap();

    this.blit(this.divergence, 'divergence', {
      u_velocity: { texture: this.velocity.read().texture, unit: 0 },
      u_texel: [this.velocity.texelX, this.velocity.texelY],
    });

    this.blit(this.pressure.write(), 'clear', {
      u_texture: { texture: this.pressure.read().texture, unit: 0 },
      u_value: 0.8,
    });
    this.pressure.swap();

    for (let i = 0; i < pressureIters; i++) {
      this.blit(this.pressure.write(), 'pressure', {
        u_pressure: { texture: this.pressure.read().texture, unit: 0 },
        u_divergence: { texture: this.divergence.texture, unit: 1 },
        u_texel: [this.pressure.texelX, this.pressure.texelY],
      });
      this.pressure.swap();
    }

    this.blit(this.velocity.write(), 'gradient', {
      u_pressure: { texture: this.pressure.read().texture, unit: 0 },
      u_velocity: { texture: this.velocity.read().texture, unit: 1 },
      u_texel: [this.velocity.texelX, this.velocity.texelY],
    });
    this.velocity.swap();
  }

  render() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.blit(null, 'display', {
      u_dye: { texture: this.dyeFBO.read().texture, unit: 0 },
      u_brand: this.brandColor,
    });

    gl.disable(gl.BLEND);
  }

  loop = (time) => {
    this.raf = 0;
    if (!this.active) return;

    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0.016);
    this.lastTime = time;

    if (this.pointer.moved) {
      this.hue = (this.hue + 0.008) % 1;
      const rgb = hsvToRgb(this.hue, 0.42, 1.0);
      const blend = [
        this.brandColor[0] * 0.35 + rgb[0] * 0.65,
        this.brandColor[1] * 0.35 + rgb[1] * 0.65,
        this.brandColor[2] * 0.35 + rgb[2] * 0.65,
      ];
      this.splat(this.pointer.x, this.pointer.y, this.pointer.dx, this.pointer.dy, blend);
      this.pointer.moved = false;
    }

    this.step(dt);
    this.render();

    this.fillFrame += 1;
    if (this.fillFrame % 2 === 0) this.applyFill();

    this.raf = requestAnimationFrame(this.loop);
  };

  destroy() {
    if (this.ro) this.ro.disconnect();
    window.removeEventListener('resize', this.onResize);
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}

export function initHeaderFluid(root) {
  if (!root || root.dataset.headerFluidReady) return null;
  root.dataset.headerFluidReady = '1';
  const brand = getComputedStyle(root).getPropertyValue('--brand').trim();
  const effect = new HeaderFluidEffect(root);
  if (brand.startsWith('#') && effect.gl) {
    const hex = brand.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    effect.brandColor = [r, g, b];
  }
  return effect;
}

export function initAllHeaderFluids(selector = '[data-header-fluid]') {
  return Array.from(document.querySelectorAll(selector)).map(initHeaderFluid).filter(Boolean);
}
