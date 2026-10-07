import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// 1. 장면, 카메라, 렌더러
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
const DEFAULT_CAM = new THREE.Vector3(0, 60, 120);
camera.position.copy(DEFAULT_CAM);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// 행성 이름표를 위한 HTML 레이어
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// 마우스로 시점 조작
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 4;
controls.maxDistance = 500;

// 2. 조명: 태양이 광원
scene.add(new THREE.AmbientLight(0xffffff, 0.15));
const sunLight = new THREE.PointLight(0xffffff, 3, 0, 0);
scene.add(sunLight);

// 3. 배경 별
const starPositions = [];
for (let i = 0; i < 4000; i++) {
  const v = new THREE.Vector3().randomDirection().multiplyScalar(400 + Math.random() * 600);
  starPositions.push(v.x, v.y, v.z);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2 })));

// 4. 텍스처를 코드로 직접 그리기 (이미지 파일 없이)
function makePlanetTexture(hex, type) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const base = new THREE.Color(hex);
  ctx.fillStyle = '#' + base.getHexString();
  ctx.fillRect(0, 0, 512, 256);

  if (type === 'gas') {
    // 가스 행성: 가로 줄무늬
    for (let y = 0; y < 256; y += 4) {
      const t = base.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.14);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#' + t.getHexString();
      ctx.fillRect(0, y, 512, 2 + Math.random() * 6);
    }
  } else if (type === 'earth') {
    // 지구: 바다 위 대륙과 극지방 얼음
    const land = ['#3f8f3a', '#6b8e3d', '#8a7a4a'];
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = land[i % 3];
      ctx.beginPath();
      ctx.arc(Math.random() * 512, 40 + Math.random() * 176, 8 + Math.random() * 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 14);
    ctx.fillRect(0, 242, 512, 14);
  } else {
    // 암석 행성 / 태양: 얼룩
    for (let i = 0; i < 400; i++) {
      const t = base.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#' + t.getHexString();
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, 2 + Math.random() * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,230,150,1)');
  g.addColorStop(0.25, 'rgba(255,170,50,0.45)');
  g.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function makeLabel(text) {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = text;
  return new CSS2DObject(div);
}

const clickable = [];

// 5. 태양
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(6, 48, 48),
  new THREE.MeshBasicMaterial({ map: makePlanetTexture(0xffb733, 'rocky') })
);
sun.userData.info = {
  name: '태양', size: 6,
  desc: '태양계의 중심에 있는 항성. 태양계 전체 질량의 약 99.8%를 차지한다.',
  data: '지름 약 1,392,700km · 표면 온도 약 5,500℃',
};
scene.add(sun);
clickable.push(sun);

const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
}));
glow.scale.set(34, 34, 1);
sun.add(glow);

const sunLabel = makeLabel('태양');
sunLabel.position.set(0, 8, 0);
sun.add(sunLabel);

// 6. 행성 데이터 (크기·거리는 보기 좋게 조정한 값)
const PLANETS = [
  { name: '수성', color: 0x9e9e9e, type: 'rocky', size: 0.8, dist: 12, period: 0.24,
    desc: '태양에 가장 가까운 행성. 대기가 거의 없어 낮과 밤의 온도 차가 매우 크다.',
    data: '공전 주기 88일 · 지름 4,879km' },
  { name: '금성', color: 0xe8c27a, type: 'rocky', size: 1.4, dist: 17, period: 0.62,
    desc: '두꺼운 이산화탄소 대기 때문에 표면 온도가 약 460℃에 달한다.',
    data: '공전 주기 225일 · 지름 12,104km' },
  { name: '지구', color: 0x2f6fd0, type: 'earth', size: 1.5, dist: 23, period: 1, moon: true,
    desc: '액체 상태의 물과 생명체가 존재하는 것으로 알려진 유일한 행성.',
    data: '공전 주기 365일 · 지름 12,742km · 위성 1개' },
  { name: '화성', color: 0xc1440e, type: 'rocky', size: 1.1, dist: 29, period: 1.88,
    desc: '산화철 때문에 붉게 보인다. 태양계에서 가장 높은 화산인 올림푸스 산이 있다.',
    data: '공전 주기 687일 · 지름 6,779km' },
  { name: '목성', color: 0xd8a77a, type: 'gas', size: 3.6, dist: 40, period: 11.9,
    desc: '태양계에서 가장 큰 가스 행성. 거대한 폭풍인 대적점이 있다.',
    data: '공전 주기 약 11.9년 · 지름 139,820km' },
  { name: '토성', color: 0xe3d29b, type: 'gas', size: 3.0, dist: 53, period: 29.5, ring: true,
    desc: '얼음과 암석 조각으로 이루어진 화려한 고리를 가진 가스 행성.',
    data: '공전 주기 약 29.5년 · 지름 116,460km' },
  { name: '천왕성', color: 0x9fe3e8, type: 'gas', size: 2.2, dist: 64, period: 84,
    desc: '자전축이 약 98° 기울어져 있어 거의 누운 채로 공전한다.',
    data: '공전 주기 약 84년 · 지름 50,724km' },
  { name: '해왕성', color: 0x3f54ba, type: 'gas', size: 2.1, dist: 74, period: 165,
    desc: '태양계 가장 바깥쪽 행성. 태양계에서 가장 강한 바람이 분다.',
    data: '공전 주기 약 165년 · 지름 49,244km' },
];

const planets = [];
const orbitLines = [];

for (const p of PLANETS) {
  // pivot(태양 중심)을 회전시키면 그 자식인 행성이 공전한다
  const pivot = new THREE.Object3D();
  pivot.rotation.y = Math.random() * Math.PI * 2;
  scene.add(pivot);

  const holder = new THREE.Group();
  holder.position.x = p.dist;
  pivot.add(holder);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.size, 48, 48),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture(p.color, p.type), roughness: 0.9 })
  );
  mesh.userData.info = p;
  holder.add(mesh);
  clickable.push(mesh);

  if (p.ring) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(p.size * 1.4, p.size * 2.3, 96),
      new THREE.MeshBasicMaterial({ color: 0xcdb98a, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = -Math.PI / 2 + 0.45;
    holder.add(ring);
  }

  let moonPivot = null;
  if (p.moon) {
    moonPivot = new THREE.Object3D();
    holder.add(moonPivot);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 24, 24),
      new THREE.MeshStandardMaterial({ map: makePlanetTexture(0xbbbbbb, 'rocky'), roughness: 1 })
    );
    moon.position.x = 2.8;
    moonPivot.add(moon);
  }

  const label = makeLabel(p.name);
  label.position.set(0, p.size + 1.2, 0);
  holder.add(label);

  // 궤도선
  const pts = [];
  for (let i = 0; i < 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * p.dist, 0, Math.sin(a) * p.dist));
  }
  const orbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x3a4a70, transparent: true, opacity: 0.6 })
  );
  scene.add(orbit);
  orbitLines.push(orbit);

  // 실제 공전 주기 비율을 반영하되, 바깥 행성도 움직임이 보이도록 완만하게 조정
  planets.push({ pivot, mesh, moonPivot, orbitSpeed: 0.8 / Math.sqrt(p.period) });
}

// 7. UI 연결
let speed = 1;
const speedInput = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
speedInput.addEventListener('input', () => {
  speed = parseFloat(speedInput.value);
  speedVal.textContent = speed.toFixed(1);
});
document.getElementById('orbits').addEventListener('change', (e) => {
  orbitLines.forEach((o) => (o.visible = e.target.checked));
});
document.getElementById('labels').addEventListener('change', (e) => {
  labelRenderer.domElement.style.display = e.target.checked ? '' : 'none';
});

const infoBox = document.getElementById('info');
const infoName = document.getElementById('infoName');
const infoDesc = document.getElementById('infoDesc');
const infoData = document.getElementById('infoData');

// 8. 클릭한 행성 따라가기
let follow = null;
let flying = false;
let resetting = false;
const flyOffset = new THREE.Vector3();
const prevPos = new THREE.Vector3();
const tmp = new THREE.Vector3();
const desired = new THREE.Vector3();
const delta = new THREE.Vector3();

function select(mesh) {
  const info = mesh.userData.info;
  follow = mesh;
  flying = true;
  resetting = false;
  const d = info.size * 7;
  flyOffset.set(0, d * 0.45, d);
  mesh.getWorldPosition(prevPos);

  infoName.textContent = info.name;
  infoDesc.textContent = info.desc;
  infoData.textContent = info.data;
  infoBox.style.display = 'block';
}

document.getElementById('reset').addEventListener('click', () => {
  follow = null;
  flying = false;
  resetting = true;
  infoBox.style.display = 'none';
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const downPos = new THREE.Vector2();

function pick(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  return hits.length ? hits[0].object : null;
}

renderer.domElement.addEventListener('pointerdown', (e) => downPos.set(e.clientX, e.clientY));
renderer.domElement.addEventListener('pointerup', (e) => {
  // 드래그(시점 회전)와 클릭을 구분
  if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return;
  const hit = pick(e);
  if (hit) select(hit);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  renderer.domElement.style.cursor = pick(e) ? 'pointer' : 'default';
});

// 9. 애니메이션
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);

  sun.rotation.y += 0.1 * dt;
  for (const pl of planets) {
    pl.pivot.rotation.y += pl.orbitSpeed * speed * dt;  // 공전
    pl.mesh.rotation.y += 1.2 * dt;                     // 자전
    if (pl.moonPivot) pl.moonPivot.rotation.y += 2.5 * speed * dt;
  }

  if (follow) {
    const pos = follow.getWorldPosition(tmp);
    if (flying) {
      // 선택한 행성 쪽으로 부드럽게 이동
      desired.copy(pos).add(flyOffset);
      camera.position.lerp(desired, 0.07);
      controls.target.lerp(pos, 0.12);
      if (camera.position.distanceTo(desired) < 0.2) flying = false;
    } else {
      // 도착 후에는 행성이 움직인 만큼 카메라도 함께 이동
      delta.subVectors(pos, prevPos);
      camera.position.add(delta);
      controls.target.add(delta);
    }
    prevPos.copy(pos);
  } else if (resetting) {
    camera.position.lerp(DEFAULT_CAM, 0.06);
    controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.1);
    if (camera.position.distanceTo(DEFAULT_CAM) < 0.5) resetting = false;
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

// 브라우저 창 크기가 바뀌면 화면 비율 갱신
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});
