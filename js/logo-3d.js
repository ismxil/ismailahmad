/**
 * Brand 3D logo — shared cobalt mark used across the site.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function initBrandLogo3D(canvas, { autoRotate = true, float = true } = {}) {
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
  camera.position.z = 82;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.82));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.9);
  keyLight.position.set(-22, 30, 34);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x9fb1ff, 1.2);
  fillLight.position.set(24, -16, 22);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x0011ff, 1.6);
  rimLight.position.set(0, 8, -36);
  scene.add(rimLight);

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x0011ff,
    metalness: 0.72,
    roughness: 0.16,
    envMapIntensity: 1.65,
    clearcoat: 0.35,
    clearcoatRoughness: 0.18,
  });

  const group = new THREE.Group();
  scene.add(group);

  const CX = 19.8924;
  const CY = 19.8924;
  const DEPTH = 3.5;
  const BEVEL = { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 4 };

  const ring = new THREE.Mesh(new THREE.TorusGeometry(18.6475, 2.48974 / 2, 24, 120), mat);
  ring.position.z = DEPTH / 2;
  group.add(ring);

  const thinLine = (() => {
    const r = 2.48974 / 2;
    const a = new THREE.Vector3(19.703 - CX, -(1.3706 - CY), 0);
    const b = new THREE.Vector3(7.38959 - CX, -(33.6143 - CY), 0);
    const dir = b.clone().sub(a);
    const mid = a.clone().lerp(b, 0.5);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 20), mat);
    mesh.position.set(mid.x, mid.y, DEPTH / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    group.add(mesh);
    return mesh;
  })();

  const thickLine = (() => {
    const r = 6.90648 / 2;
    const a = new THREE.Vector3(18.6145 - CX, -(7.31771 - CY), 0);
    const b = new THREE.Vector3(33.1972 - CX, -(32.5316 - CY), 0);
    const dir = b.clone().sub(a);
    const mid = a.clone().lerp(b, 0.5);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 20), mat);
    mesh.position.set(mid.x, mid.y, DEPTH / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    group.add(mesh);
    return mesh;
  })();

  const orbit = (() => {
    const rx = (38.5398 - 1.24487) / 2;
    const ry = (25.3316 - 14.4531) / 2;
    class EllipseCurve extends THREE.Curve {
      getPoint(t, out) {
        const v = out || new THREE.Vector3();
        return v.set(rx * Math.cos(t * Math.PI * 2), ry * Math.sin(t * Math.PI * 2), 0);
      }
    }
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new EllipseCurve(), 120, 2.48974 / 2, 16, true), mat);
    mesh.position.z = DEPTH / 2;
    group.add(mesh);
    return mesh;
  })();

  const star = (() => {
    const pts = [
      [20.8605, 30.2672], [22.5437, 30.4788], [21.4593, 32.1087], [21.7782, 33.7749],
      [19.8929, 33.2469], [18.4066, 34.0652], [18.0076, 33.7752], [18.3265, 32.1089],
      [17.0891, 30.948], [17.2421, 30.4788], [18.9253, 30.2672], [19.6464, 28.7322], [20.1395, 28.7322],
    ];
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - CX, -(y - CY))));
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, BEVEL), mat);
    group.add(mesh);
    return mesh;
  })();

  group.rotation.x = 0.16;
  group.rotation.y = -0.36;
  group.position.y = -1.5;
  [ring, thinLine, thickLine, orbit, star].forEach((piece, index) => {
    piece.position.z += index === 4 ? 0.9 : 0;
  });

  let raf = 0;
  let visible = true;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(canvas);
  }
  resize();

  function tick() {
    raf = 0;
    if (!visible) return;
    if (autoRotate) group.rotation.y += 0.008;
    if (float) group.position.y = -1.5 + Math.sin(performance.now() * 0.0016) * 1.1;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && !raf) raf = requestAnimationFrame(tick);
      },
      { threshold: 0.08 }
    );
    io.observe(canvas);
  }

  raf = requestAnimationFrame(tick);

  return {
    destroy() {
      visible = false;
      if (raf) cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
}
