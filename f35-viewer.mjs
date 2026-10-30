import * as THREE from './vendor/three.module.js';
import modelBytes from './assets/f35-geometry.bin';
import { flightPose, rocketProgress } from './flight-motion.mjs';

const stage = document.getElementById('f35-stage');
const status = document.getElementById('f35-status');
const rotateButton = document.getElementById('f35-rotate');
const resetButton = document.getElementById('f35-reset');
const sequence = document.getElementById('flight-sequence');
const caption = document.querySelector('.flight-caption');

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  scene.add(new THREE.HemisphereLight(0xdce9ff, 0x263022, 3));
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-4, 8, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb3d45b, 2);
  rim.position.set(4, 2, -6);
  scene.add(rim);

  const aircraft = new THREE.Group();
  aircraft.name = 'F35-aircraft';
  scene.add(aircraft);
  // Detailed F-35 by bohmerang; geometry is embedded for direct-file viewing.
  const data = modelBytes.slice().buffer;
  const header = new DataView(data);
  const vertexCount = header.getUint32(0, true);
  const indexCount = header.getUint32(4, true);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data, 8, vertexCount * 3), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data, 8 + vertexCount * 12, indexCount), 1));
  geometry.computeVertexNormals();
  const airframe = new THREE.Mesh(geometry);
  aircraft.add(airframe);
  // Show contours and pronounced creases instead of every triangle edge.
  const hologram = new THREE.MeshBasicMaterial({ color: 0xbfc3c7, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.NormalBlending });
  const wire = new THREE.LineBasicMaterial({ color: 0xd5d8dc, transparent: true, opacity: .55, blending: THREE.NormalBlending, depthWrite: false });
  const dots = new THREE.PointsMaterial({ color: 0xe1e3e6, size: .025, transparent: true, opacity: .85, blending: THREE.NormalBlending, depthWrite: false });
  let seed = 35;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const meshes = [];
  aircraft.traverse(object => { if (object.isMesh) meshes.push(object); });
  for (const mesh of meshes) {
    mesh.material = hologram;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 35), wire));
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const vertices = geometry.getAttribute('position');
    const samples = [];
    for (let i = 0; i < 4200; i++) {
      const triangle = Math.floor(random() * (vertices.count / 3)) * 3;
      const u = Math.sqrt(random()), v = random();
      for (let axis = 0; axis < 3; axis++) {
        samples.push((1 - u) * vertices.array[triangle * 3 + axis] + u * (1 - v) * vertices.array[(triangle + 1) * 3 + axis] + u * v * vertices.array[(triangle + 2) * 3 + axis]);
      }
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(samples, 3));
    mesh.add(new THREE.Points(pointGeometry, dots));
    if (geometry !== mesh.geometry) geometry.dispose();
  }

  const grid = new THREE.GridHelper(30, 40, 0x237584, 0x16434b);
  grid.position.y = -1.8;
  grid.material.transparent = true;
  grid.material.opacity = .22;
  scene.add(grid);

  // Decorative rockets launch on separate scroll beats, in world coordinates.
  const rockets = [-1, 1].map((side, index) => {
    const group = new THREE.Group();
    group.name = `F35-rocket-${index + 1}`;
    const material = new THREE.MeshBasicMaterial({ color: 0xdfe1e4 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .65, 8), material);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.045, .2, 8), material);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -.425;
    group.add(nose);
    const trailMaterial = new THREE.MeshBasicMaterial({ color: 0xf1c381, transparent: true, opacity: .65, depthWrite: false });
    const trail = new THREE.Mesh(new THREE.ConeGeometry(.07, 2.8, 8), trailMaterial);
    trail.rotation.x = -Math.PI / 2;
    trail.position.z = 1.7;
    group.add(trail);
    group.visible = false;
    scene.add(group);
    return { group, side, launch: .64 + index * .075, trailMaterial };
  });

  let yaw = 2.2, pitch = .28, distance = 14.5;
  let autoRotate = false, visible = false, dragging = false, lastX = 0, lastY = 0;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let progress = 0;
  function updateProgress() {
    const top = window.innerWidth <= 700 ? 116 : 80;
    const travel = Math.max(1, sequence.offsetHeight - document.getElementById('air-support').offsetHeight);
    progress = THREE.MathUtils.clamp((top - sequence.getBoundingClientRect().top) / travel, 0, 1);
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  const chapters = [
    ['01 / APPROACH', 'CLEAR FOR<br />TAKEOFF.', 'A new perspective. Every angle.', 'APPROACH'],
    ['02 / MANEUVER', 'BREAK THE<br />HORIZON.', 'One complete roll. No ordinary view.', 'BARREL ROLL'],
    ['03 / RELEASE', 'MAKE YOUR<br />MOVE.', 'Two launches. One continuous flight.', 'ROCKET RELEASE'],
  ];
  let chapter = -1;
  const clock = new THREE.Clock();
  function resize() {
    const width = stage.clientWidth, height = stage.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updateProgress();
  }
  function draw() {
    const delta = Math.min(clock.getDelta(), .05);
    if (!visible || document.hidden) return;
    if (autoRotate && !dragging && !motion.matches) yaw += delta * .18;
    const pose = flightPose(progress, motion.matches);
    aircraft.rotation.set(pose.pitch, yaw + pose.yaw, pose.roll, 'YXZ');
    aircraft.position.set(pose.x, pose.y, 0);
    for (const rocket of rockets) {
      const t = rocketProgress(progress, rocket.launch);
      rocket.group.visible = !motion.matches && t > 0 && t < 1;
      if (!rocket.group.visible) continue;
      const launchPose = flightPose(rocket.launch);
      const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(launchPose.pitch, yaw + launchPose.yaw, launchPose.roll, 'YXZ'));
      rocket.group.quaternion.copy(orientation);
      rocket.group.position.set(rocket.side * 1.4, -.25, -.4 - t * 18).applyQuaternion(orientation).add(new THREE.Vector3(launchPose.x, launchPose.y, 0));
      rocket.trailMaterial.opacity = .65 * Math.min(1, t * 12) * (1 - t);
    }
    if (chapter !== pose.phase) {
      chapter = pose.phase;
      const [label, headline, description, phase] = chapters[chapter];
      document.getElementById('flight-chapter').textContent = label;
      document.getElementById('flight-headline').innerHTML = headline;
      document.getElementById('flight-description').textContent = description;
      document.getElementById('flight-phase').textContent = phase;
    }
    caption.style.transform = `translate3d(${pose.x * 22}px, ${-pose.y * 32}px, 0) rotate(${-Math.sin(progress * Math.PI * 2) * (motion.matches ? 0 : 3)}deg)`;
    document.getElementById('flight-progress-fill').style.transform = `scaleX(${progress})`;
    document.getElementById('f35-azimuth').textContent = `${((THREE.MathUtils.radToDeg(yaw + pose.yaw) % 360 + 360) % 360).toFixed(0).padStart(3, '0')}°`;
    const framedDistance = distance * Math.max(1, .95 / camera.aspect);
    camera.position.set(0, framedDistance * Math.sin(.43 + pitch), framedDistance * Math.cos(.43 + pitch));
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(stage);
  renderer.setAnimationLoop(draw);
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true; lastX = event.clientX; lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', event => {
    if (!dragging) return;
    yaw += (event.clientX - lastX) * .008;
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastY) * .005, -.3, .95);
    lastX = event.clientX; lastY = event.clientY;
  });
  function release() { dragging = false; stage.classList.remove('is-dragging'); }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('lostpointercapture', release);
  stage.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') yaw -= .12;
    if (event.key === 'ArrowRight') yaw += .12;
    if (event.key === 'ArrowUp') pitch = Math.min(.95, pitch + .08);
    if (event.key === 'ArrowDown') pitch = Math.max(-.3, pitch - .08);
    if (event.key === '+' || event.key === '=') distance = Math.max(11, distance - 1);
    if (event.key === '-') distance = Math.min(24, distance + 1);
  });
  rotateButton.disabled = false;
  resetButton.disabled = false;
  rotateButton.addEventListener('click', () => {
    autoRotate = !autoRotate;
    rotateButton.setAttribute('aria-pressed', String(autoRotate));
    rotateButton.textContent = autoRotate ? 'Pause rotation' : 'Auto rotate';
  });
  resetButton.addEventListener('click', () => { yaw = 2.2; pitch = .28; distance = 14.5; });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    status.hidden = false;
    status.textContent = '3D graphics interrupted. Reload the page to restore the aircraft.';
    renderer.setAnimationLoop(null);
  });
  resize();
  sequence.classList.add('is-flight-ready');
  resize();
  status.hidden = true;
} catch (error) {
  status.textContent = 'The 3D aircraft requires a browser with WebGL 2 enabled. Try enabling hardware acceleration.';
  console.error('F-35 viewer could not start:', error);
}


