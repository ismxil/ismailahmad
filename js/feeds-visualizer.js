/**
 * Feeds 3D visualizer — adapted from J0SUKE/spotify-visualiser
 * https://github.com/J0SUKE/spotify-visualiser
 */

import * as THREE from 'three';
import { openFeedModal } from './feed-modal.js';
import { getFeedItems, loadFeedItems } from './feed-items.js';

const MESH_COUNT = 400;
const CLICK_DRAG_THRESHOLD = 18;

const vertexShader = `
varying vec2 vUv;
attribute vec3 aInitialPosition;
attribute float aMeshSpeed;
attribute vec4 aTextureCoords;
uniform float uTime;
uniform vec2 uMaxXdisplacement;
uniform vec2 uDrag;
uniform float uSpeedY;
uniform float uScrollY;
varying float vVisibility;
varying vec4 vTextureCoords;

float remap(float value, float originMin, float originMax) {
  return clamp((value - originMin) / (originMax - originMin), 0.0, 1.0);
}

void main() {
  vec3 newPosition = position + aInitialPosition;
  float maxX = uMaxXdisplacement.x;
  float maxY = uMaxXdisplacement.y;
  float maxYoffset = distance(aInitialPosition.y, maxY);
  float minYoffset = distance(aInitialPosition.y, -maxY);
  float maxXoffset = distance(aInitialPosition.x, maxX);
  float minXoffset = distance(aInitialPosition.x, -maxX);
  float xDisplacement = mod(minXoffset - uDrag.x + uTime * aMeshSpeed, maxXoffset + minXoffset) - minXoffset;
  float yDisplacement = mod(minYoffset - uDrag.y, maxYoffset + minYoffset) - minYoffset;
  float maxZ = 12.0;
  float minZ = -30.0;
  float maxZoffset = distance(aInitialPosition.z, maxZ);
  float minZoffset = distance(aInitialPosition.z, minZ);
  float zDisplacement = mod(uScrollY + minZoffset, maxZoffset + minZoffset) - minZoffset;
  newPosition.x += xDisplacement;
  newPosition.y += yDisplacement;
  newPosition.z += zDisplacement;
  vVisibility = remap(newPosition.z, minZ, minZ + 5.0);
  vec4 modelPosition = modelMatrix * instanceMatrix * vec4(newPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
  vUv = uv;
  vTextureCoords = aTextureCoords;
}
`;

const fragmentShader = `
varying vec2 vUv;
varying float vVisibility;
varying vec4 vTextureCoords;
uniform sampler2D uWrapperTexture;
uniform sampler2D uAtlas;
uniform sampler2D uBlurryAtlas;

void main() {
  vec4 texel = texture2D(uWrapperTexture, vUv);
  if (texel.a == 0.0) discard;
  float xStart = vTextureCoords.x;
  float xEnd = vTextureCoords.y;
  float yStart = vTextureCoords.z;
  float yEnd = vTextureCoords.w;
  vec2 atlasUV = vec2(
    mix(xStart, xEnd, vUv.x),
    mix(yStart, yEnd, (1.0 - vUv.y) * 1.5)
  );
  vec4 blurryTexel = texture2D(uBlurryAtlas, atlasUV);
  vec4 color = texel.b < 0.02 ? texture2D(uAtlas, atlasUV) : texel + blurryTexel * 0.8;
  color.a *= vVisibility;
  color.r = min(color.r, 1.0);
  color.g = min(color.g, 1.0);
  color.b = min(color.b, 1.0);
  gl_FragColor = color;
}
`;

function normalizeWheel(event) {
  let pixelX = event.deltaX;
  let pixelY = event.deltaY;
  if (event.deltaMode === 1) {
    pixelX *= 16;
    pixelY *= 16;
  } else if (event.deltaMode === 2) {
    pixelX *= window.innerHeight;
    pixelY *= window.innerHeight;
  }
  return { pixelX, pixelY };
}

function lerp(current, target, ease) {
  return current + (target - current) * ease;
}

function glslMod(x, y) {
  return ((x % y) + y) % y;
}

function getInstanceCenter(i, planes) {
  const initPos = planes.geometry.attributes.aInitialPosition;
  const meshSpeed = planes.geometry.attributes.aMeshSpeed;
  const ax = initPos.getX(i);
  const ay = initPos.getY(i);
  const az = initPos.getZ(i);
  const speed = meshSpeed.getX(i);

  const maxX = planes.shaderParameters.maxX;
  const maxY = planes.shaderParameters.maxY;
  const drag = planes.material.uniforms.uDrag.value;
  const time = planes.material.uniforms.uTime.value;
  const scrollY = planes.material.uniforms.uScrollY.value;

  const maxYoffset = Math.abs(ay - maxY);
  const minYoffset = Math.abs(ay + maxY);
  const maxXoffset = Math.abs(ax - maxX);
  const minXoffset = Math.abs(ax + maxX);

  const xDisplacement = glslMod(minXoffset - drag.x + time * speed, maxXoffset + minXoffset) - minXoffset;
  const yDisplacement = glslMod(minYoffset - drag.y, maxYoffset + minYoffset) - minYoffset;

  const maxZ = 12.0;
  const minZ = -30.0;
  const maxZoffset = Math.abs(az - maxZ);
  const minZoffset = Math.abs(az - minZ);
  const zDisplacement = glslMod(scrollY + minZoffset, maxZoffset + minZoffset) - minZoffset;

  return new THREE.Vector3(ax + xDisplacement, ay + yDisplacement, az + zDisplacement);
}

function getInstanceVisibility(worldZ) {
  const minZ = -30.0;
  return Math.max(0, Math.min(1, (worldZ - minZ) / 5.0));
}

class FeedsPlanes {
  constructor(scene, sizes) {
    this.scene = scene;
    this.sizes = sizes;
    this.meshCount = MESH_COUNT;
    this.imageInfos = [];
    this.atlasTexture = null;
    this.blurryAtlasTexture = null;
    this.drag = {
      xCurrent: 0,
      xTarget: 0,
      yCurrent: 0,
      yTarget: 0,
      isDown: false,
      lastX: 0,
      lastY: 0,
    };
    this.scrollY = { target: 0, current: 0 };
    this.dragSensitivity = 1;
    this.dragDamping = 0.1;
    this.isModalOpen = false;
    this.shaderParameters = {
      maxX: sizes.width * 2,
      maxY: sizes.height * 2,
    };

    this.createGeometry();
    this.createMaterial();
    this.createInstancedMesh();
    this.ready = this.initCovers();

    this._onWheel = this.onWheel.bind(this);
    window.addEventListener('wheel', this._onWheel, { passive: false });
  }

  createGeometry() {
    this.geometry = new THREE.PlaneGeometry(1, 1.69, 1, 1);
    this.geometry.scale(2, 2, 2);
  }

  createMaterial() {
    const wrapper = new THREE.TextureLoader().load('assets/feeds/spt-3.png', (tex) => {
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
    });

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uMaxXdisplacement: {
          value: new THREE.Vector2(this.shaderParameters.maxX, this.shaderParameters.maxY),
        },
        uWrapperTexture: { value: wrapper },
        uAtlas: { value: null },
        uBlurryAtlas: { value: null },
        uScrollY: { value: 0 },
        uSpeedY: { value: 0 },
        uDrag: { value: new THREE.Vector2(0, 0) },
      },
    });
  }

  createInstancedMesh() {
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.meshCount);
    this.scene.add(this.mesh);
  }

  async loadImage(path) {
    const res = await fetch(path);
    const blob = await res.blob();
    return createImageBitmap(blob);
  }

  async initCovers() {
    await loadFeedItems();
    const items = getFeedItems();
    if (!items.length) return;
    await this.loadCovers(items.map((item) => item.cover));
  }

  async loadCovers(coverUrls) {
    const images = await Promise.all(
      coverUrls.map(async (path) => {
        try {
          return await this.loadImage(path);
        } catch (err) {
          console.warn('[feeds] Failed to load cover:', path, err);
          return null;
        }
      })
    );

    const validImages = images.filter(Boolean);
    if (!validImages.length) return;

    const atlasWidth = Math.max(...validImages.map((img) => img.width));
    let totalHeight = 0;
    images.forEach((img) => {
      if (img) totalHeight += img.height;
    });

    const canvas = document.createElement('canvas');
    canvas.width = atlasWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    let currentY = 0;
    this.imageInfos = [];
    images.forEach((img, feedIndex) => {
      if (!img) return;
      ctx.drawImage(img, 0, currentY);
      this.imageInfos.push({
        feedIndex,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        uvs: {
          xStart: 0,
          xEnd: img.width / atlasWidth,
          yStart: 1 - currentY / totalHeight,
          yEnd: 1 - (currentY + img.height) / totalHeight,
        },
      });
      currentY += img.height;
    });

    this.atlasTexture = new THREE.Texture(canvas);
    this.atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.atlasTexture.minFilter = THREE.LinearFilter;
    this.atlasTexture.magFilter = THREE.LinearFilter;
    this.atlasTexture.needsUpdate = true;
    this.material.uniforms.uAtlas.value = this.atlasTexture;

    const blurryCanvas = document.createElement('canvas');
    blurryCanvas.width = canvas.width;
    blurryCanvas.height = canvas.height;
    const bctx = blurryCanvas.getContext('2d');
    bctx.filter = 'blur(100px)';
    bctx.drawImage(canvas, 0, 0);
    this.blurryAtlasTexture = new THREE.Texture(blurryCanvas);
    this.blurryAtlasTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.blurryAtlasTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.blurryAtlasTexture.minFilter = THREE.LinearFilter;
    this.blurryAtlasTexture.magFilter = THREE.LinearFilter;
    this.blurryAtlasTexture.needsUpdate = true;
    this.material.uniforms.uBlurryAtlas.value = this.blurryAtlasTexture;

    this.fillMeshData();
  }

  fillMeshData() {
    const initialPosition = new Float32Array(this.meshCount * 3);
    const meshSpeed = new Float32Array(this.meshCount);
    const aTextureCoords = new Float32Array(this.meshCount * 4);

    for (let i = 0; i < this.meshCount; i++) {
      initialPosition[i * 3] = (Math.random() - 0.5) * this.shaderParameters.maxX * 2;
      initialPosition[i * 3 + 1] = (Math.random() - 0.5) * this.shaderParameters.maxY * 2;
      initialPosition[i * 3 + 2] = Math.random() * 37 - 30;
      meshSpeed[i] = Math.random() * 0.5 + 0.5;

      const imageIndex = i % this.imageInfos.length;
      aTextureCoords[i * 4] = this.imageInfos[imageIndex].uvs.xStart;
      aTextureCoords[i * 4 + 1] = this.imageInfos[imageIndex].uvs.xEnd;
      aTextureCoords[i * 4 + 2] = this.imageInfos[imageIndex].uvs.yStart;
      aTextureCoords[i * 4 + 3] = this.imageInfos[imageIndex].uvs.yEnd;
    }

    this.geometry.setAttribute('aInitialPosition', new THREE.InstancedBufferAttribute(initialPosition, 3));
    this.geometry.setAttribute('aMeshSpeed', new THREE.InstancedBufferAttribute(meshSpeed, 1));
    this.mesh.geometry.setAttribute('aTextureCoords', new THREE.InstancedBufferAttribute(aTextureCoords, 4));
  }

  bindDrag(element) {
    const pointerStart = { x: 0, y: 0 };
    let didDrag = false;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const dummy = new THREE.Object3D();

    const onPointerDown = (e) => {
      if (this.isModalOpen) return;
      this.drag.isDown = true;
      didDrag = false;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
      pointerStart.x = e.clientX;
      pointerStart.y = e.clientY;
      element.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!this.drag.isDown || this.isModalOpen) return;
      const dx = e.clientX - this.drag.lastX;
      const dy = e.clientY - this.drag.lastY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) didDrag = true;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
      const worldPerPixelX = (this.sizes.width / window.innerWidth) * this.dragSensitivity;
      const worldPerPixelY = (this.sizes.height / window.innerHeight) * this.dragSensitivity;
      this.drag.xTarget += -dx * worldPerPixelX;
      this.drag.yTarget += dy * worldPerPixelY;
    };

    const tryOpenCard = async (clientX, clientY) => {
      await this.ready;
      const pick = this.pickInstance(clientX, clientY, raycaster, ndc, dummy);
      if (pick) openFeedModal(pick.imageIndex);
    };

    const onPointerUp = (e) => {
      const wasDown = this.drag.isDown;
      this.drag.isDown = false;
      try {
        element.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (!wasDown || this.isModalOpen) return;

      const moved = Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y);
      if (didDrag && moved > CLICK_DRAG_THRESHOLD) return;

      tryOpenCard(e.clientX, e.clientY);
    };

    element.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  pickInstance(clientX, clientY, raycaster, ndc, dummy) {
    if (!this.imageInfos.length || !this.camera) return null;

    this.camera.updateMatrixWorld(true);

    ndc.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(ndc, this.camera);

    for (let i = 0; i < this.meshCount; i++) {
      const center = getInstanceCenter(i, this);
      if (getInstanceVisibility(center.z) < 0.05) continue;
      dummy.position.copy(center);
      dummy.quaternion.set(0, 0, 0, 1);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    const hits = raycaster.intersectObject(this.mesh, false);
    if (!hits.length) return null;

    const hit = hits[0];
    if (hit.instanceId === undefined) return null;

    const atlasIndex = hit.instanceId % this.imageInfos.length;
    const feedIndex = this.imageInfos[atlasIndex].feedIndex;

    return {
      instanceId: hit.instanceId,
      imageIndex: feedIndex,
      center: hit.point,
    };
  }

  setModalOpen(isOpen) {
    this.isModalOpen = isOpen;
    if (isOpen) {
      this.drag.isDown = false;
    }
  }

  onWheel(event) {
    if (this.isModalOpen) return;
    event.preventDefault();
    const normalized = normalizeWheel(event);
    const scrollY = (normalized.pixelY * this.sizes.height) / window.innerHeight;
    this.scrollY.target += scrollY;
    this.material.uniforms.uSpeedY.value += scrollY;
  }

  resize(sizes) {
    this.sizes = sizes;
    this.shaderParameters.maxX = sizes.width * 2;
    this.shaderParameters.maxY = sizes.height * 2;
    this.material.uniforms.uMaxXdisplacement.value.set(this.shaderParameters.maxX, this.shaderParameters.maxY);
  }

  render(delta) {
    this.material.uniforms.uTime.value += delta * 0.015;
    this.drag.xCurrent += (this.drag.xTarget - this.drag.xCurrent) * this.dragDamping;
    this.drag.yCurrent += (this.drag.yTarget - this.drag.yCurrent) * this.dragDamping;
    this.material.uniforms.uDrag.value.set(this.drag.xCurrent, this.drag.yCurrent);
    this.scrollY.current = lerp(this.scrollY.current, this.scrollY.target, 0.12);
    this.material.uniforms.uScrollY.value = this.scrollY.current;
    this.material.uniforms.uSpeedY.value *= 0.835;
  }

  dispose() {
    window.removeEventListener('wheel', this._onWheel);
  }
}

class FeedsVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.sizes = this.getSizes();
    this.planes = new FeedsPlanes(this.scene, this.sizes);
    this.planes.camera = this.camera;
    this.planes.bindDrag(this.renderer.domElement);

    this._onResize = this.onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._onModalOpen = () => this.planes.setModalOpen(true);
    this._onModalClose = () => this.planes.setModalOpen(false);
    window.addEventListener('feed-modal-open', this._onModalOpen);
    window.addEventListener('feed-modal-close', this._onModalClose);

    this.animate();
  }

  getSizes() {
    const fov = this.camera.fov * (Math.PI / 180);
    const height = this.camera.position.z * Math.tan(fov / 2) * 2;
    const width = height * this.camera.aspect;
    return { width, height };
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.sizes = this.getSizes();
    this.planes.resize(this.sizes);
  }

  animate() {
    const now = this.clock.getElapsedTime();
    const delta = now - this.time;
    this.time = now;
    this.planes.render(delta / (1 / 60));
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('feed-modal-open', this._onModalOpen);
    window.removeEventListener('feed-modal-close', this._onModalClose);
    this.planes.dispose();
    this.renderer.dispose();
  }
}

const canvas = document.getElementById('feeds-webgl');
if (canvas) {
  canvas.style.pointerEvents = 'auto';
  new FeedsVisualizer(canvas);
}
