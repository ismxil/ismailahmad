/**
 * Site loader — logo construct / deconstruct (same choreography as index welcome).
 * Brand blue on white.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BRAND_BLUE = 0x393bfe;

function buildLogoPieces(group, mat) {
  const CX = 19.8924;
  const CY = 19.8924;
  const DEPTH = 3.5;
  const BEVEL = {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.35,
    bevelSegments: 4,
  };

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(18.6475, 2.48974 / 2, 24, 120),
    mat
  );
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
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new EllipseCurve(), 120, 2.48974 / 2, 16, true),
      mat
    );
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

  return [ring, thinLine, thickLine, orbit, star];
}

function setConstructStartState(pieces, piecesFinalPos) {
  const [ring, thinLine, thickLine, orbit, star] = pieces;
  const thickFinalY = piecesFinalPos[2].y;
  const thinFinalX = piecesFinalPos[1].x;
  const starFinalZ = piecesFinalPos[4].z;

  ring.scale.setScalar(0.01);
  ring.rotation.z = Math.PI * 1.5;
  thickLine.scale.setScalar(0.01);
  thickLine.position.y = thickFinalY + 28;
  thinLine.scale.setScalar(0.01);
  thinLine.position.x = thinFinalX - 22;
  orbit.scale.set(0.01, 0.01, 1);
  star.scale.setScalar(0.01);
  star.rotation.z = Math.PI * 1.2;
  star.position.z = starFinalZ - 8;

  return { thickFinalY, thinFinalX, starFinalZ };
}

function playConstruct(gsap, pieces, piecesFinalPos, camera) {
  const [ring, thinLine, thickLine, orbit, star] = pieces;
  const { thickFinalY, thinFinalX, starFinalZ } = setConstructStartState(pieces, piecesFinalPos);

  gsap.set(camera.position, { z: 118 });

  return new Promise((resolve) => {
    gsap.to(camera.position, { z: 90, duration: 2.6, ease: 'power3.out' });

    const intro = gsap.timeline({ onComplete: resolve });

    intro
      .to(ring.scale, { x: 1, y: 1, z: 1, duration: 0.85, ease: 'elastic.out(1,0.5)' }, 0)
      .to(ring.rotation, { z: 0, duration: 0.75, ease: 'power3.out' }, 0.02)
      .to(thickLine.position, { y: thickFinalY, duration: 0.60, ease: 'power4.out' }, 0.28)
      .to(thickLine.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(1.4)' }, 0.25)
      .to(thinLine.position, { x: thinFinalX, duration: 0.52, ease: 'power3.out' }, 0.48)
      .to(thinLine.scale, { x: 1, y: 1, z: 1, duration: 0.50, ease: 'back.out(2)' }, 0.46)
      .to(orbit.scale, { x: 1, y: 1, duration: 0.75, ease: 'elastic.out(1,0.45)' }, 0.65)
      .to(star.scale, { x: 1, y: 1, z: 1, duration: 0.50, ease: 'back.out(3)' }, 0.85)
      .to(star.rotation, { z: 0, duration: 0.45, ease: 'power3.out' }, 0.85)
      .to(star.position, { z: starFinalZ, duration: 0.40, ease: 'power4.out' }, 0.87);
  });
}

function playDeconstruct(gsap, pieces, piecesFinalPos, camera, mat, group) {
  const [ring, thinLine, thickLine, orbit, star] = pieces;
  const thickFinalY = piecesFinalPos[2].y;
  const thinFinalX = piecesFinalPos[1].x;
  const starFinalZ = piecesFinalPos[4].z;

  return new Promise((resolve) => {
    const outro = gsap.timeline({ onComplete: resolve });

    outro
      .to(star.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.34, ease: 'power3.in' }, 0)
      .to(star.rotation, { z: Math.PI * 1.2, duration: 0.34, ease: 'power3.in' }, 0)
      .to(star.position, { z: starFinalZ - 8, duration: 0.34, ease: 'power3.in' }, 0)
      .to(orbit.scale, { x: 0.01, y: 0.01, duration: 0.30, ease: 'power3.in' }, 0.08)
      .to(thinLine.position, { x: thinFinalX - 22, duration: 0.30, ease: 'power3.in' }, 0.14)
      .to(thinLine.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.28, ease: 'power3.in' }, 0.14)
      .to(thickLine.position, { y: thickFinalY + 28, duration: 0.30, ease: 'power3.in' }, 0.20)
      .to(thickLine.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.28, ease: 'power3.in' }, 0.20)
      .to(ring.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.36, ease: 'power3.in' }, 0.26)
      .to(ring.rotation, { z: Math.PI * 1.5, duration: 0.36, ease: 'power3.in' }, 0.26)
      .to(camera.position, { z: 72, duration: 0.55, ease: 'power3.in' }, 0.12)
      .to(mat, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.in',
        onStart: () => { mat.transparent = true; },
      }, 0.18)
      .to(group.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.55, ease: 'power2.in' }, 0.10);
  });
}

export async function runSiteLoaderLogo(canvas, { beforeDeconstruct } = {}) {
  const gsap = window.gsap;
  if (!canvas || !gsap) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    // No WebGL / context creation failed — skip logo anim so the loader can dismiss.
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  camera.position.z = 118;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(-24, 32, 30);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xc8d0ff, 1.1);
  fillLight.position.set(22, -14, 20);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x393bfe, 1.4);
  rimLight.position.set(0, 6, -40);
  scene.add(rimLight);

  const mat = new THREE.MeshPhysicalMaterial({
    color: BRAND_BLUE,
    metalness: 0.55,
    roughness: 0.2,
    envMapIntensity: 1.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.15,
  });

  const group = new THREE.Group();
  group.rotation.x = 0.14;
  group.rotation.y = -0.32;
  scene.add(group);

  const pieces = buildLogoPieces(group, mat);
  const piecesFinalPos = pieces.map((mesh) => mesh.position.clone());
  setConstructStartState(pieces, piecesFinalPos);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  resize();
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);

  let raf = 0;
  let running = true;

  function tick() {
    raf = 0;
    if (!running) return;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  renderer.render(scene, camera);
  raf = requestAnimationFrame(tick);

  try {
    await playConstruct(gsap, pieces, piecesFinalPos, camera);
    await beforeDeconstruct?.();
    await playDeconstruct(gsap, pieces, piecesFinalPos, camera, mat, group);
  } finally {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    renderer.dispose();
    mat.dispose();
    pieces.forEach((mesh) => {
      mesh.geometry?.dispose();
    });
  }
}
