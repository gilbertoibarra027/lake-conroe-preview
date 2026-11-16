// The Chartres (Plan 7040, Elevation A) — interactive exterior study.
// Sources: City Design & Plans main-floor sheet dated 11/9/2026 + front render (chartres-hero.webp).
// Units: 1 = 1 foot. Plan coords: x = feet from LEFT side (as seen from street), y = feet back from the FRONT-most wall.
// World: X = x - CX, Z = CZ - y  (front faces +Z), Y up.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/OrbitControls.js';
import {mergeGeometries} from 'three/addons/BufferGeometryUtils.js';

const Q = new URLSearchParams(location.search);
if (Q.get('ui') === '0') document.body.classList.add('noui');
const CX = 33.5, CZ = 36.5;
const W = (x) => x - CX, Zp = (y) => CZ - y;
const mobile = matchMedia('(max-width: 640px)').matches || /Mobi|Android/i.test(navigator.userAgent);

// ---------- renderer / scene ----------
const mount = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('shot')});
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 2 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
mount.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, innerWidth / innerHeight, 0.5, 1500);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, {enableDamping: true, dampingFactor: 0.07, minDistance: 18, maxDistance: 260, maxPolarAngle: Math.PI * 0.485, screenSpacePanning: true});
// (shadowSide set after materials)
if (Q.get('fov')) { camera.fov = +Q.get('fov'); camera.updateProjectionMatrix(); }
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

// ---------- seeded random ----------
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- procedural textures ----------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
  return t;
}
function speckle(g, w, h, n, colors, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.4 + rnd() * 0.6); g.fillStyle = colors[(rnd() * colors.length) | 0];
    const r = rmin + rnd() * (rmax - rmin), x = rnd() * w, y = rnd() * h;
    g.fillRect(x, y, r, r); // wrap
    if (x + r > w) g.fillRect(x - w, y, r, r); if (y + r > h) g.fillRect(x, y - h, r, r);
  }
  g.globalAlpha = 1;
}
function blotches(g, w, h, n, color, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = rmax * (0.3 + rnd() * 0.7);
    for (const [ox, oy] of [[0,0],[w,0],[-w,0],[0,h],[0,-h]]) {
      const gr = g.createRadialGradient(x+ox, y+oy, 0, x+ox, y+oy, r);
      gr.addColorStop(0, color.replace('A', alpha)); gr.addColorStop(1, color.replace('A', 0));
      g.fillStyle = gr; g.fillRect(x+ox - r, y+oy - r, 2*r, 2*r);
    }
  }
}
// Stucco: warm cream, light sand-finish texture (render reads #e3d6bf in daylight).
const stuccoMap = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#e0d1b8'; g.fillRect(0, 0, w, h);
  blotches(g, w, h, 40, 'rgba(190,170,140,A)', 90, 0.10);
  blotches(g, w, h, 30, 'rgba(255,250,238,A)', 80, 0.12);
  speckle(g, w, h, 26000, ['#f6efe1', '#cdbfa6', '#d9cbb2', '#bfae92'], 1, 2.2, 0.45);
});
const stuccoBump = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 14000, ['#ffffff', '#000000', '#a0a0a0', '#505050'], 1, 2, 0.5);
}, false);
// Architectural shingles: dark charcoal, staggered tabs, shadow lines.
function shingleDraw(g, w, h, bump) {
  const rows = 8, rh = h / rows;
  g.fillStyle = bump ? '#707070' : '#3b3d40'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 60;
    while (x < w) {
      const tw = 30 + rnd() * 50, shade = bump ? 110 + rnd() * 60 : 46 + rnd() * 26;
      const c = bump ? `rgb(${shade},${shade},${shade})` : `rgb(${shade},${shade + 1},${shade + 4})`;
      g.fillStyle = c; g.fillRect(x + 1, r * rh, tw - 2, rh - 3);
      if (!bump && rnd() < 0.5) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 1, r * rh + rh * 0.45, tw - 2, rh * 0.5); }
      x += tw;
    }
    g.fillStyle = bump ? '#202020' : 'rgba(10,10,12,0.75)'; g.fillRect(0, r * rh + rh - 3, w, 3);
  }
  if (!bump) speckle(g, w, h, 30000, ['#5a5d61', '#25272a', '#6b6a66', '#444'], 1, 1.6, 0.6);
}
const shingleMap = canvasTex(512, 512, (g, w, h) => shingleDraw(g, w, h, false));
seed = 7; const shingleBump = canvasTex(512, 512, (g, w, h) => shingleDraw(g, w, h, true), false);
const concreteMap = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#c9c5bd'; g.fillRect(0, 0, w, h);
  blotches(g, w, h, 30, 'rgba(150,145,135,A)', 110, 0.14);
  blotches(g, w, h, 20, 'rgba(235,232,225,A)', 90, 0.18);
  speckle(g, w, h, 20000, ['#b5b0a6', '#dcd8d0', '#a39e94'], 1, 2, 0.35);
  g.fillStyle = 'rgba(80,76,70,0.55)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); // control joints at tile edges
});
const asphaltMap = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3c3d3f'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 12000, ['#555659', '#2a2b2d', '#6a6a6a'], 1, 2, 0.5);
});
// Lawn: St. Augustine green with alternating mowing stripes (as in the render). Tile = 24 ft.
const lawnMap = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#4a7e2c'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(160,200,90,0.09)'; g.fillRect(0, 0, w / 2, h);
  blotches(g, w, h, 40, 'rgba(40,80,20,A)', 120, 0.18);
  for (let i = 0; i < 60000; i++) {
    const x = rnd() * w, y = rnd() * h, l = 3 + rnd() * 5;
    const s = rnd(); g.strokeStyle = s < 0.33 ? 'rgba(115,170,60,0.55)' : s < 0.66 ? 'rgba(45,95,25,0.55)' : 'rgba(85,140,45,0.5)';
    g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 2, y - l); g.stroke();
  }
});
const mulchMap = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 6000, ['#5a3f2b', '#2a1d14', '#6b4a32'], 1, 4, 0.7);
});
function woodDraw(base, dark, light) {
  return (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = rnd() < 0.5 ? dark : light; g.globalAlpha = 0.25 + rnd() * 0.3; g.lineWidth = 0.6 + rnd() * 1.6;
      const x = rnd() * w; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.02 + i) * 2.5, y); g.stroke();
    }
    g.globalAlpha = 1;
  };
}
const woodMap = canvasTex(256, 256, woodDraw('#4a3222', '#2a1a10', '#6a4a32'));
// Garage door (carriage style, dark charcoal; top row of lites, vertical V-groove boards).
function garageTex(wFt, hFt, groups) {
  const ppf = 32, w = wFt * ppf, h = hFt * ppf;
  const mk = (emis) => canvasTex(w, h, (g) => {
    g.fillStyle = emis ? '#000' : '#2f2e2d'; g.fillRect(0, 0, w, h);
    if (!emis) {
      for (let x = 0; x < w; x += ppf * 0.5) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, 0, 2, h); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + 2, 0, 1, h); }
      for (let s = 1; s < 4; s++) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, s * h / 4 - 1, w, 3); }
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      g.lineWidth = 4; for (let k = 0; k < groups; k++) { const x0 = (k + 0.5) * w / groups; g.beginPath(); g.moveTo(x0, h * 0.27); g.lineTo(x0, h); g.stroke(); }
    }
    const top = h * 0.07, wh = h * 0.16, gw = w / groups;
    for (let k = 0; k < groups; k++) {
      const gx = k * gw + gw * 0.08, ww = gw * 0.84;
      if (!emis) { g.fillStyle = '#1b1b1b'; g.fillRect(gx - 4, top - 4, ww + 8, wh + 8); }
      for (let p = 0; p < 4; p++) {
        const px = gx + p * ww / 4 + 3, pw = ww / 4 - 6;
        if (emis) { const gr = g.createLinearGradient(0, top, 0, top + wh); gr.addColorStop(0, '#ffd9a0'); gr.addColorStop(1, '#b07a40'); g.fillStyle = gr; }
        else g.fillStyle = '#4a5560';
        g.fillRect(px, top + 3, pw, wh - 6);
      }
    }
  });
  return {map: mk(false), emis: mk(true)};
}
const gdoor2 = garageTex(16, 8, 4), gdoor3 = garageTex(8, 7, 2);
const doorTex = (() => {
  const w = 112, h = 256;
  const map = canvasTex(w, h, (g) => {
    woodDraw('#3f2416', '#22120a', '#5b3824')(g, w, h);
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = w / 4; x < w; x += w / 4) g.fillRect(x - 1, 70, 2, h);
    g.fillStyle = '#1e140e'; g.fillRect(12, 12, w - 24, 52);
    g.fillStyle = '#56616b'; g.fillRect(16, 16, (w - 36) / 2, 44); g.fillRect(20 + (w - 36) / 2, 16, (w - 36) / 2, 44);
  });
  const emis = canvasTex(w, h, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcf8a'; g.fillRect(16, 16, (w - 36) / 2, 44); g.fillRect(20 + (w - 36) / 2, 16, (w - 36) / 2, 44); });
  map.wrapS = map.wrapT = emis.wrapS = emis.wrapT = THREE.ClampToEdgeWrapping;
  return {map, emis};
})();
gdoor2.map.wrapS = gdoor2.map.wrapT = gdoor3.map.wrapS = gdoor3.map.wrapT = THREE.ClampToEdgeWrapping;
// Warm interior glow for windows at dusk (brighter toward top/center).
const glowTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(w * 0.5, h * 0.35, 4, w * 0.5, h * 0.5, w * 0.75);
  gr.addColorStop(0, '#fff0d0'); gr.addColorStop(0.5, '#e9a860'); gr.addColorStop(1, '#6b4020');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;
// Uplight "scallop" wash for walls under the soffit lights.
const washTex = canvasTex(128, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const gr = g.createRadialGradient(w / 2, 0, 2, w / 2, h * 0.05, h * 0.95);
  gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.35, 'rgba(255,190,120,0.45)'); gr.addColorStop(1, 'rgba(255,170,100,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2 - 6, 0); g.lineTo(w / 2 + 6, 0); g.lineTo(w, h); g.lineTo(0, h); g.fill();
});
washTex.wrapS = washTex.wrapT = THREE.ClampToEdgeWrapping;

// Interior finishes: wide-plank oak and 24" porcelain tile
const plankMap = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#b48d63'; g.fillRect(0, 0, w, h);
  const bw = w / 12;
  for (let i = 0; i < 12; i++) { let y = -rnd() * 200; while (y < h) { const l = 140 + rnd() * 220, c = 150 + rnd() * 40;
    g.fillStyle = `rgb(${c + 30},${c + 2},${c - 38})`; g.fillRect(i * bw + 1, y + 1, bw - 2, l - 2);
    for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(90,60,30,0.18)'; g.lineWidth = 1; const xx = i * bw + 3 + rnd() * (bw - 6); g.beginPath(); g.moveTo(xx, y); g.lineTo(xx + (rnd() - 0.5) * 3, y + l); g.stroke(); }
    g.fillStyle = 'rgba(70,45,25,0.5)'; g.fillRect(i * bw, y, bw, 1.5); y += l; } g.fillStyle = 'rgba(70,45,25,0.45)'; g.fillRect(i * bw, 0, 1.5, h); }
});
const tileMap = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b9b3aa'; g.fillRect(0, 0, w, h);
  for (const [x, y] of [[0, 0], [w / 2, 0], [0, h / 2], [w / 2, h / 2]]) { const c = 220 + rnd() * 12; g.fillStyle = `rgb(${c},${c - 4},${c - 10})`; g.fillRect(x + 2, y + 2, w / 2 - 4, h / 2 - 4); }
  speckle(g, w, h, 1500, ['#cfc9bf', '#ece8e1'], 1, 2, 0.4);
});
function tiled(t, ft) { const c = t.clone(); c.repeat.set(1 / ft, 1 / ft); c.needsUpdate = true; return c; }

// ---------- materials ----------
const M = {
  stucco: new THREE.MeshStandardMaterial({map: tiled(stuccoMap, 7), bumpMap: tiled(stuccoBump, 3), bumpScale: 0.6, roughness: 0.93}),
  trimStucco: new THREE.MeshStandardMaterial({color: '#efe6d4', map: tiled(stuccoMap, 7), bumpMap: tiled(stuccoBump, 3), bumpScale: 0.4, roughness: 0.9}),
  base: new THREE.MeshStandardMaterial({color: '#d8d4cb', roughness: 0.85, map: tiled(concreteMap, 6)}),
  roof: new THREE.MeshStandardMaterial({map: tiled(shingleMap, 3.4), bumpMap: tiled(shingleBump, 3.4), bumpScale: 1.6, roughness: 0.92}),
  ridge: new THREE.MeshStandardMaterial({color: '#55585c', roughness: 0.9, map: tiled(shingleMap, 3.4)}),
  fascia: new THREE.MeshStandardMaterial({color: '#2c2b2a', roughness: 0.7}),
  soffit: new THREE.MeshStandardMaterial({color: '#7a6e62', roughness: 0.9}),
  corbel: new THREE.MeshStandardMaterial({map: tiled(woodMap, 3), color: '#8a7060', roughness: 0.75}),
  frame: new THREE.MeshStandardMaterial({color: '#1b1c1e', roughness: 0.45, metalness: 0.3}),
  glass: new THREE.MeshStandardMaterial({color: '#56636e', roughness: 0.06, metalness: 0.35, envMapIntensity: 1.3, emissive: '#000000', emissiveMap: glowTex}),
  shutter: new THREE.MeshStandardMaterial({map: tiled(woodMap, 4), color: '#9a7a62', roughness: 0.7}),
  door: new THREE.MeshStandardMaterial({map: doorTex.map, emissiveMap: doorTex.emis, emissive: '#000', roughness: 0.55}),
  gdoor2: new THREE.MeshStandardMaterial({map: gdoor2.map, emissiveMap: gdoor2.emis, emissive: '#000', roughness: 0.6, metalness: 0.15}),
  gdoor3: new THREE.MeshStandardMaterial({map: gdoor3.map, emissiveMap: gdoor3.emis, emissive: '#000', roughness: 0.6, metalness: 0.15}),
  concrete: new THREE.MeshStandardMaterial({map: tiled(concreteMap, 10), roughness: 0.92}),
  walk: new THREE.MeshStandardMaterial({map: tiled(concreteMap, 4), roughness: 0.92}),
  asphalt: new THREE.MeshStandardMaterial({map: tiled(asphaltMap, 6), roughness: 0.95}),
  lawn: new THREE.MeshStandardMaterial({map: tiled(lawnMap, 24), roughness: 1}),
  mulch: new THREE.MeshStandardMaterial({map: tiled(mulchMap, 4), roughness: 1}),
  shrub: new THREE.MeshStandardMaterial({color: '#3f6b2c', roughness: 0.95, flatShading: true}),
  lamp: new THREE.MeshStandardMaterial({color: '#2a2622', roughness: 0.5, metalness: 0.6}),
  lampGlass: new THREE.MeshStandardMaterial({color: '#e8d9b8', emissive: '#000', roughness: 0.3}),
  porchCeil: new THREE.MeshStandardMaterial({color: '#ece2d0', emissive: '#000', roughness: 0.9}),
  wash: new THREE.MeshBasicMaterial({map: washTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true}),
  can: new THREE.MeshBasicMaterial({color: '#fff2d6'}),
  contact: null,
  doorTrim: new THREE.MeshStandardMaterial({map: tiled(woodMap, 3), color: '#8a7060', roughness: 0.75}),
  paint: new THREE.MeshStandardMaterial({color: '#efe9df', roughness: 0.92}),
  cap: new THREE.MeshStandardMaterial({color: '#fbf8f1', roughness: 0.9, emissive: '#3a3833', side: THREE.DoubleSide}),
  wood: new THREE.MeshStandardMaterial({map: tiled(plankMap, 6), roughness: 0.55}),
  tile: new THREE.MeshStandardMaterial({map: tiled(tileMap, 4), roughness: 0.35}),
  garageFloor: new THREE.MeshStandardMaterial({color: '#a9a69f', map: tiled(concreteMap, 12), roughness: 0.6}),
  fabric: new THREE.MeshStandardMaterial({color: '#b8b0a3', roughness: 0.95}),
  linen: new THREE.MeshStandardMaterial({color: '#f4f1ea', roughness: 0.95}),
  throw: new THREE.MeshStandardMaterial({color: '#8a9aa6', roughness: 0.95}),
  woodDark: new THREE.MeshStandardMaterial({map: tiled(woodMap, 3), color: '#a08068', roughness: 0.6}),
  rug: new THREE.MeshStandardMaterial({color: '#d9d0c1', roughness: 1}),
  metal: new THREE.MeshStandardMaterial({color: '#a9adb1', roughness: 0.35, metalness: 0.8}),
  cabinet: new THREE.MeshStandardMaterial({color: '#f2efe9', roughness: 0.6}),
  quartz: new THREE.MeshStandardMaterial({color: '#e9e6e1', roughness: 0.25}),
  porcelain: new THREE.MeshStandardMaterial({color: '#fbfbf9', roughness: 0.2}),
  showerGlass: new THREE.MeshStandardMaterial({color: '#cfe3ea', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35}),
  water: new THREE.MeshStandardMaterial({color: '#bfe0ea', roughness: 0.1}),
  stone: new THREE.MeshStandardMaterial({color: '#e2ddd3', map: tiled(stuccoMap, 5), roughness: 0.8}),
  cooktop: new THREE.MeshStandardMaterial({color: '#151515', roughness: 0.3}),
  firebox: new THREE.MeshStandardMaterial({color: '#1c1b1a', emissive: '#ff8a3a', emissiveIntensity: 0.25, roughness: 0.6}),
  shelf: new THREE.MeshStandardMaterial({color: '#e9e3d8', roughness: 0.8}),
};
// Dollhouse cut plane (keeps y <= constant). 1000 = no cut.
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
for (const k of ['stucco', 'trimStucco', 'base', 'frame', 'glass', 'shutter', 'door', 'gdoor2', 'gdoor3', 'lamp', 'lampGlass', 'porchCeil', 'doorTrim',
  'paint', 'stone', 'shelf', 'cabinet', 'metal', 'showerGlass', 'fabric']) { M[k].clippingPlanes = [cutPlane]; M[k].clipShadows = true; }
const ROOFMATS = ['roof', 'ridge', 'fascia', 'soffit', 'corbel', 'can'];

M.roof.shadowSide = M.ridge.shadowSide = M.fascia.shadowSide = THREE.DoubleSide;
// ---------- geometry helpers ----------
// Planar UVs in world feet so textures stay continuous and to scale across every mesh.
const UP = new THREE.Vector3(0, 1, 0);
function planarUV(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(e.subVectors(a, b)).normalize();
    if (Math.abs(n.y) > 0.97) { e.set(1, 0, 0); s.set(0, 0, -1); }
    else { e.crossVectors(UP, n).normalize(); s.crossVectors(n, e).normalize(); }
    for (let k = 0; k < 3; k++) { const v = [a, b, c][k]; uv[(i + k) * 2] = v.dot(e); uv[(i + k) * 2 + 1] = v.dot(s); }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
function add(geo, mat, parent, cast = true, receive = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); return m;
}
// Box from plan rectangle x0..x1, y0..y1 (front..back), heights h0..h1.
function B(x0, x1, y0, y1, h0, h1, mat, parent, cast = true) {
  const g = new THREE.BoxGeometry(x1 - x0, h1 - h0, y1 - y0);
  g.translate(W((x0 + x1) / 2), (h0 + h1) / 2, Zp((y0 + y1) / 2));
  return add(planarUV(g), mat, parent, cast);
}
// Hip roof over plan rect with overhang; ridge auto-oriented along the long side.
function hipRoof(x0, x1, y0, y1, eave, pitch, over, parent, opt = {}) {
  const X0 = W(x0 - over), X1 = W(x1 + over), Zf = Zp(y0 - (opt.ovF ?? over)), Zb = Zp(y1 + over);
  const w = X1 - X0, d = Zf - Zb, cxw = (X0 + X1) / 2, czw = (Zf + Zb) / 2;
  let half = Math.min(w, d) / 2, top = eave + half * pitch;
  // Optional flat-top ("truncated") hip: common on wide Texas hip roofs; reads as a long ridge from the street.
  if (opt.maxTop && top > opt.maxTop) { top = opt.maxTop; half = (top - eave) / pitch; }
  const c00 = [X0, eave, Zf], c10 = [X1, eave, Zf], c11 = [X1, eave, Zb], c01 = [X0, eave, Zb];
  let r1, r2, tris, caps;
  const flatTop = Math.min(w, d) / 2 - half > 0.05;
  if (flatTop) {
    const i00 = [X0 + half, top, Zf - half], i10 = [X1 - half, top, Zf - half], i11 = [X1 - half, top, Zb + half], i01 = [X0 + half, top, Zb + half];
    tris = [[c00, c10, i10], [c00, i10, i00], [c10, c11, i11], [c10, i11, i10], [c11, c01, i01], [c11, i01, i11], [c01, c00, i00], [c01, i00, i01], [i00, i10, i11], [i00, i11, i01]];
    caps = [[c00, i00], [c10, i10], [c11, i11], [c01, i01], [i00, i10]];
  } else {
    if (w >= d) { r1 = [X0 + half, top, czw]; r2 = [X1 - half, top, czw]; } else { r1 = [cxw, top, Zf - half]; r2 = [cxw, top, Zb + half]; }
    if (w >= d) { tris = [[c00, c10, r2], [c00, r2, r1], [c11, c01, r1], [c11, r1, r2], [c01, c00, r1], [c10, c11, r2]]; caps = [[r1, r2], [c00, r1], [c01, r1], [c10, r2], [c11, r2]]; }
    else { tris = [[c00, c10, r1], [c10, c11, r2], [c10, r2, r1], [c11, c01, r2], [c01, c00, r1], [c01, r1, r2]]; caps = [[r1, r2], [c00, r1], [c10, r1], [c01, r2], [c11, r2]]; }
  }
  const pos = [];
  for (const t of tris) {
    const A = new THREE.Vector3(...t[0]), Bv = new THREE.Vector3(...t[1]), C = new THREE.Vector3(...t[2]);
    const n = new THREE.Vector3().subVectors(C, Bv).cross(new THREE.Vector3().subVectors(A, Bv));
    const ordered = n.y >= 0 ? [A, Bv, C] : [A, C, Bv];
    for (const v of ordered) pos.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  add(planarUV(g), M.roof, parent);
  // fascia (deep, stucco-wrapped like the render) + soffit
  const fh = opt.fascia ?? 0.8;
  const fasc = new THREE.Group(); parent.add(fasc);
  const fz = (x0w, x1w, z0w, z1w) => { const gg = new THREE.BoxGeometry(x1w - x0w, fh, z1w - z0w); gg.translate((x0w + x1w) / 2, eave - fh / 2 + 0.02, (z0w + z1w) / 2); add(planarUV(gg), M.fascia, fasc); };
  const t = 0.25; fz(X0, X1, Zf - t, Zf); fz(X0, X1, Zb, Zb + t); fz(X0, X0 + t, Zb, Zf); fz(X1 - t, X1, Zb, Zf);
  const so = new THREE.PlaneGeometry(w, d); so.rotateX(Math.PI / 2); so.translate(cxw, eave - fh + 0.02, czw);
  add(so, M.soffit, parent, false);
  // ridge / hip caps
  const cap = (p, q) => {
    const P = new THREE.Vector3(...p), Qv = new THREE.Vector3(...q), len = P.distanceTo(Qv);
    if (len < 0.1) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, len), M.ridge);
    m.position.copy(P).add(Qv).multiplyScalar(0.5); m.position.y += 0.06; m.lookAt(Qv.x, Qv.y + 0.06, Qv.z); m.castShadow = true; parent.add(m);
  };
  for (const [p1, p2] of caps) cap(p1, p2);
  return {eave, top, fh};
}
// Corbels (rafter-tail brackets) + soffit can lights + wall wash, along a front-facing eave.
const duskLights = [];
function eaveDetail(xa, xb, wallY, eave, over, fh, parent, opt = {}) {
  const sp = opt.spacing ?? 4.6, n = Math.max(2, Math.round((xb - xa) / sp) + 1), step = (xb - xa) / (n - 1);
  const zw = Zp(wallY);
  for (let i = 0; i < n; i++) {
    const x = W(xa + i * step);
    const cg = new THREE.BoxGeometry(0.38, 0.95, over + 0.1); cg.translate(x, eave - fh - 0.4, zw + (over + 0.1) / 2);
    add(planarUV(cg), M.corbel, parent);
    if (i < n - 1 && !opt.noLights) {
      const lx = x + step / 2;
      const can = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), M.can); can.rotation.x = Math.PI / 2; can.position.set(lx, eave - fh, zw + over * 0.45); parent.add(can);
      const wh = Math.min(eave - fh - 0.3, opt.washH ?? 6.5), ww = 4.2;
      const wsh = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), M.wash); wsh.position.set(lx, eave - fh - wh / 2, zw + 0.06); wsh.renderOrder = 2; parent.add(wsh);
      duskLights.push(new THREE.Vector3(lx, eave - fh - 0.5, zw + 1.2));
    }
  }
}
// Window: built facing +Z at plan (xc, wall y); rotY rotates for side/rear walls.
function windowAt(parent, {x, y, rotY = 0, sill, w, h, cols = 2, rows = 2, shutters = false, surround = true, door = false, transom = 0}) {
  const g = new THREE.Group(); parent.add(g);
  g.position.set(W(x), 0, Zp(y)); g.rotation.y = rotY;
  const L = (geo, mat, cast = true) => add(planarUV(geo), mat, g, cast);
  const bx = (cx, cy, cz, sx, sy, sz, mat) => { const b = new THREE.BoxGeometry(sx, sy, sz); b.translate(cx, cy, cz); return L(b, mat); };
  const yc = sill + h / 2, ft = 0.22, rp = surround ? 0.32 : 0.02; // surround projection makes the window read as recessed
  if (surround) {
    const sw = 0.42;
    bx(-(w / 2 + sw / 2), yc, rp / 2, sw, h + (door ? sw : 2 * sw), rp, M.trimStucco);
    bx(w / 2 + sw / 2, yc, rp / 2, sw, h + (door ? sw : 2 * sw), rp, M.trimStucco);
    bx(0, sill + h + sw / 2, rp / 2, w + 2 * sw, sw, rp, M.trimStucco);
    // inner reveal faces (stucco returns)
    bx(0, sill + h - 0.03, rp / 2, w, 0.06, rp, M.trimStucco);
    if (!door) bx(0, sill - 0.12, rp / 2 + 0.12, w + 2 * sw + 0.3, 0.24, rp + 0.24, M.base); // cast-stone sill
  }
  const gl = new THREE.PlaneGeometry(w - 0.1, h - 0.1); gl.translate(0, yc, 0.06);
  const glass = new THREE.Mesh(gl, M.glass); glass.receiveShadow = true; g.add(glass);
  const fz = 0.14;
  bx(0, sill + ft / 2, fz / 2 + 0.03, w, ft, fz, M.frame); bx(0, sill + h - ft / 2, fz / 2 + 0.03, w, ft, fz, M.frame);
  bx(-w / 2 + ft / 2, yc, fz / 2 + 0.03, ft, h, fz, M.frame); bx(w / 2 - ft / 2, yc, fz / 2 + 0.03, ft, h, fz, M.frame);
  for (let c = 1; c < cols; c++) bx(-w / 2 + c * w / cols, yc, 0.1, c % (cols / (opt2(cols))) ? 0.07 : 0.16, h, 0.1, M.frame);
  for (let r = 1; r < rows; r++) bx(0, sill + r * h / rows, 0.1, w, 0.07, 0.1, M.frame);
  if (transom) bx(0, sill + h * transom, 0.1, w, 0.16, 0.12, M.frame);
  if (shutters) {
    const sw = w * 0.55, sh = h + 0.4;
    for (const sgn of [-1, 1]) {
      const sx = sgn * (w / 2 + 0.42 + sw / 2 + 0.05);
      bx(sx, yc, rp + 0.08, sw, sh, 0.16, M.shutter);
      for (let k = -1; k <= 1; k += 2) bx(sx, yc + k * sh * 0.3, rp + 0.18, sw - 0.12, 0.28, 0.06, M.shutter); // battens
      bx(sx - sgn * (sw / 2 - 0.2), yc + sh * 0.2, rp + 0.2, 0.25, 0.08, 0.05, M.lamp); // strap hinges
      bx(sx - sgn * (sw / 2 - 0.2), yc - sh * 0.2, rp + 0.2, 0.25, 0.08, 0.05, M.lamp);
    }
  }
  return g;
}
function opt2(c) { return c >= 4 ? 2 : 1; }
function sconce(parent, x, y, h, zOff = 0.1, scale = 1, rotY = 0) {
  const g = new THREE.Group(); g.position.set(W(x), h, Zp(y) + zOff); g.rotation.y = rotY; g.scale.setScalar(scale); parent.add(g);
  const b = (sx, sy, sz, px, py, pz, m) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); mm.position.set(px, py, pz); mm.castShadow = true; g.add(mm); };
  b(0.35, 0.6, 0.08, 0, 0, 0.04, M.lamp); b(0.12, 0.12, 0.45, 0, 0.18, 0.25, M.lamp);
  b(0.55, 0.8, 0.55, 0, -0.05, 0.6, M.lampGlass); b(0.7, 0.12, 0.7, 0, 0.42, 0.6, M.lamp); b(0.62, 0.08, 0.62, 0, -0.48, 0.6, M.lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.35, 4), M.lamp); cap.rotation.y = Math.PI / 4; cap.position.set(0, 0.64, 0.6); g.add(cap);
  duskLights.push(new THREE.Vector3(W(x), h, Zp(y) + zOff + 0.8));
}

// ---------- house ----------
// Groups: mass = solid exterior volumes (roof-on); roofG = roofs + eave details (lift off);
// cutaway = thick-wall shell + interior partitions, floors, furniture (roof-off dollhouse).
const house = new THREE.Group(), bay3 = new THREE.Group(); scene.add(house); house.add(bay3);
const mass = new THREE.Group(), massB3 = new THREE.Group(); house.add(mass); bay3.add(massB3);
const roofG = new THREE.Group(), roofB3 = new THREE.Group(); scene.add(roofG); roofG.add(roofB3);
const cutaway = new THREE.Group(); scene.add(cutaway); cutaway.visible = false;
const PL = 10.5;      // wall plate / main eave height (10' ceilings + slab)
const PITCH = 7 / 12; // hip pitch (render reads ~7:12)
const OV = 1.6;       // eave overhang
const PL3 = 9.6;
const CUT = 8.5;      // dollhouse wall cut height

// Wall masses (plan dims from sheet 2, 11/9/2026). Garage setbacks re-measured in v13 at 1/8" = 1'-0".
B(0, 12.81, 0, 22, 0, PL, M.stucco, mass);            // Bedroom 3 wing (projects 3' past Bedroom 2)
B(0, 24.0, 3, 55.4, 0, PL, M.stucco, mass);           // Bedroom 2 / bath / primary suite wing
B(16.5, 41, 9.7, 62.1, 0, PL, M.stucco, mass);        // entry / gallery / great room core
B(31.7, 55, 9.0, 62.1, 0, PL, M.stucco, mass);        // 2-car garage + mud/pantry/kitchen/dining
B(3.83, 16.8, 55.4, 67.4, 0, PL, M.stucco, mass);     // Flex / retreat
for (const [a, b] of [[31.7, 34.3], [52.4, 55]]) B(a, b, 7.4, 9.0, 0, PL, M.stucco, mass);
for (const [a, b] of [[31.7, 34.3], [52.4, 55]]) B(a - 0.08, b + 0.08, 7.32, 9.08, 0, 1.3, M.base, house);
B(34.3, 52.4, 8.82, 9.0, PL - 1.6, PL - 0.7, M.trimStucco, house); // header band over garage door
{ const g = new THREE.PlaneGeometry(16, 8); g.translate(W(43.5), 4, Zp(9.0) + 0.04); add(g, M.gdoor2, house, false); }
{ const g = new THREE.BoxGeometry(16.6, 0.3, 0.2); g.translate(W(43.5), 8.15, Zp(9.0) + 0.1); add(planarUV(g), M.trimStucco, house); }
// 3rd bay (optional on plan; shown in render)
B(55, 67, 12, 36, 0, PL3, M.stucco, massB3);
for (const [a, b] of [[55, 56.6], [65.4, 67]]) B(a, b, 10.4, 12, 0, PL3, M.stucco, massB3);
for (const [a, b] of [[55, 56.6], [65.4, 67]]) B(a - 0.08, b + 0.08, 10.32, 12.08, 0, 1.3, M.base, bay3);
B(56.6, 65.4, 11.82, 12, PL3 - 1.5, PL3 - 0.7, M.trimStucco, bay3);
{ const g = new THREE.PlaneGeometry(8, 7); g.translate(W(61), 3.5, Zp(12) + 0.04); add(g, M.gdoor3, bay3, false); }

// Entry tower: arched porch opening, 14' porch ceiling, roof eave ~15.8'
const TX0 = 23.0, TX1 = 33.5, TY0 = 1.0, TH = 15.8; // tower face ~1' proud of plan reading so the main eave dies into it as in the render
const DOORY = 9.7; // front door wall (entry), from plan
{
  const w = TX1 - TX0, hw = w / 2, ow = 3.0, spring = 8.9, rise = 1.8;
  const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, TH); s.lineTo(-hw, TH); s.lineTo(-hw, 0);
  const hole = new THREE.Path(); hole.moveTo(-ow, 0); hole.lineTo(ow, 0); hole.lineTo(ow, spring);
  const R = (ow * ow + rise * rise) / (2 * rise), cy = spring + rise - R, a0 = Math.asin(ow / R);
  hole.absarc(0, cy, R, Math.PI / 2 - a0, Math.PI / 2 + a0, false); hole.lineTo(-ow, 0); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, {depth: 1.0, bevelEnabled: false, curveSegments: 24}); g.translate(W((TX0 + TX1) / 2), 0, Zp(TY0) - 1.0);
  add(planarUV(g), M.stucco, mass);
  const tr = new THREE.Shape(); const bw = 0.5;
  tr.moveTo(-ow - bw, spring); tr.absarc(0, cy, R + bw, Math.PI / 2 + Math.asin((ow + bw) / (R + bw)), Math.PI / 2 - Math.asin((ow + bw) / (R + bw)), true);
  tr.lineTo(ow + bw, spring - 0.2); tr.lineTo(ow, spring - 0.2); tr.lineTo(ow, spring); tr.absarc(0, cy, R, Math.PI / 2 - a0, Math.PI / 2 + a0, false); tr.lineTo(-ow, spring - 0.2); tr.lineTo(-ow - bw, spring - 0.2); tr.lineTo(-ow - bw, spring);
  const tg = new THREE.ExtrudeGeometry(tr, {depth: 0.14, bevelEnabled: false, curveSegments: 24}); tg.translate(W((TX0 + TX1) / 2), 0, Zp(TY0));
  add(planarUV(tg), M.trimStucco, mass);
  B(TX0, TX0 + 0.85, TY0 + 1, 12, 0, TH, M.stucco, mass); B(TX1 - 0.85, TX1, TY0 + 1, 12, 0, TH, M.stucco, mass);
  B(TX0, TX1, DOORY, 12, 0, TH, M.stucco, mass); B(TX0, TX1, TY0 + 1, 12, 14, TH, M.stucco, mass);
  const pc = new THREE.PlaneGeometry(TX1 - TX0 - 1.7, DOORY - TY0 - 1); pc.rotateX(Math.PI / 2); pc.translate(W((TX0 + TX1) / 2), 13.99, Zp((TY0 + 1 + DOORY) / 2)); add(pc, M.porchCeil, mass, false);
  B(TX0 + 0.85, TX1 - 0.85, TY0, DOORY, 0, 0.45, M.walk, house); // porch slab
  B(24.5, 32.0, TY0 - 1.2, TY0, 0, 0.22, M.walk, house); // step
  // Front door 3'-6" x 8'-0"
  const dg = new THREE.PlaneGeometry(3.5, 8); dg.translate(W(28.25), 0.45 + 4, Zp(DOORY) + 0.05); add(dg, M.door, house, false);
  const fr = (sx, sy, px, py) => { const g2 = new THREE.BoxGeometry(sx, sy, 0.25); g2.translate(W(28.25) + px, py, Zp(DOORY) + 0.12); add(g2, M.doorTrim, house); };
  fr(0.3, 8.3, -1.9, 4.6); fr(0.3, 8.3, 1.9, 4.6); fr(4.1, 0.3, 0, 8.6);
  sconce(house, 28.25, TY0, 12.2, 0.0, 1.35);   // lantern centered above the arch
  sconce(house, 28.25 - 4.15, TY0, 7.6, 0.0, 1);  // flanking sconces on the tower piers, as in the render
  sconce(house, 28.25 + 4.15, TY0, 7.6, 0.0, 1);
}
sconce(house, 54.0, 7.4, 7.6, 0, 1);
sconce(bay3, 66.2, 10.4, 7.2, 0, 1);

// Windows — positions measured on the 11/9 sheet (1/8" = 1'-0").
const WIN = [
  {x: 6.4, y: 0, sill: 2.4, w: 3.0, h: 6.3, cols: 2, rows: 3, shutters: true},     // Bedroom 3 (3/0x6/0) with shutters
  {x: 18.8, y: 3, sill: 2.0, w: 6.0, h: 7.0, cols: 3, rows: 1, transom: 0.74},     // Bedroom 2: pair of 3/0x7/0
  {x: 0, y: 19.4, rotY: -Math.PI / 2, sill: 4.5, w: 2.5, h: 4, cols: 2, rows: 2},  // Bath 2 (2/6x4/0)
  {x: 0, y: 30.8, rotY: -Math.PI / 2, sill: 3.5, w: 4, h: 5, cols: 2, rows: 2},    // Primary bath (4/0x5/0)
  {x: 0, y: 41.5, rotY: -Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2},    // Primary bedroom
  {x: 0, y: 47.3, rotY: -Math.PI / 2, sill: 6.5, w: 6, h: 2, cols: 3, rows: 1},    // Primary bedroom transom (6/0x2/0) over bed
  {x: 0, y: 53.0, rotY: -Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2},
  {x: 3.83, y: 63.7, rotY: -Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2}, // Flex side
  {x: 55, y: 54.0, rotY: Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2},    // Dining side
  {x: 55, y: 58.0, rotY: Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2},
  {x: 16.8, y: 64.65, rotY: Math.PI / 2, sill: 0.05, w: 2.67, h: 6.67, cols: 1, rows: 1, door: true}, // Flex -> patio door 2/8x6/8
  ...[6.6, 10.5, 14.3].map(x => ({x, y: 67.4, rotY: Math.PI, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2})),  // Flex rear
  {x: 21.3, y: 62.1, rotY: Math.PI, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2},
  {x: 28.8, y: 62.1, rotY: Math.PI, sill: 0.3, w: 10, h: 8, cols: 4, rows: 1, door: true}, // 10/0x8/0 slider
  {x: 36.3, y: 62.1, rotY: Math.PI, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2},
  ...[42.9, 47.4, 51.9].map(x => ({x, y: 62.1, rotY: Math.PI, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2})),
];
for (const w of WIN) windowAt(house, w);
const opening = (w) => ({a: (w.rotY ? Math.abs(w.rotY) === Math.PI ? w.x : w.y : w.x) - w.w / 2 - 0.1, b: (w.rotY ? Math.abs(w.rotY) === Math.PI ? w.x : w.y : w.x) + w.w / 2 + 0.1, sill: w.sill, head: w.sill + w.h});
const opensOn = (test) => WIN.filter(test).map(opening);

// Covered patio (21'-2" between columns, vaulted) with stucco columns
B(16.5, 41, 62.1, 73, 0, 0.35, M.walk, house);
for (const xa of [16.5, 39.33]) { B(xa, xa + 1.67, 71.33, 73, 0, PL, M.stucco, mass); B(xa - 0.08, xa + 1.75, 71.25, 73.08, 0, 1.3, M.base, house); }
B(16.5, 41, 71.33, 73, PL - 1.2, PL, M.stucco, mass); // beam

// ---------- roofs ----------
const R = {};
R.main = hipRoof(0, 41, 3, 62.1, PL, PITCH, OV, roofG, {maxTop: 18.6, ovF: 1.25});
R.bed3 = hipRoof(0, 12.81, 0, 22, PL, PITCH, OV, roofG);
R.right = hipRoof(31.7, 55, 7.4, 62.1, PL, PITCH, OV, roofG, {maxTop: 15.0});
R.flex = hipRoof(3.83, 16.8, 55.4, 67.4, PL, PITCH, OV, roofG);
R.patio = hipRoof(16.5, 41, 60, 73, PL, PITCH * 0.7, OV, roofG);
R.tower = hipRoof(TX0, TX1, TY0, 12, TH, 4.5 / 12, 2.2, roofG, {fascia: 1.1});
R.bay3 = hipRoof(55, 67, 10.4, 36, PL3, PITCH, OV, roofB3);
eaveDetail(0.6, 12.2, 0, PL, OV, R.bed3.fh, roofG);
eaveDetail(13.4, 23.2, 3, PL, 1.25, R.main.fh, roofG, {spacing: 3.4});
eaveDetail(TX0 + 0.3, TX1 - 0.3, TY0, TH, 2.2, R.tower.fh, roofG, {spacing: 3.3, washH: 6});
eaveDetail(34.6, 54.6, 7.4, PL, OV, R.right.fh, roofG, {spacing: 4.0, washH: 1.9});
eaveDetail(55.4, 66.6, 10.4, PL3, OV, R.bay3.fh, roofB3, {spacing: 3.7, washH: 1.4});

// ---------- dollhouse cutaway (roof-off) ----------
// Geometry is accumulated per material and merged into a handful of meshes so phones stay fast.
const ACC = new Map(); // key -> {mat, geos:[], group}
function acc(group, mat, geo) {
  const k = group.uuid + mat.uuid; if (!ACC.has(k)) ACC.set(k, {mat, geos: [], group});
  ACC.get(k).geos.push(planarUV(geo));
}
function boxGeo(x0, x1, y0, y1, h0, h1) { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), h1 - h0, Math.abs(y1 - y0)); g.translate(W((x0 + x1) / 2), (h0 + h1) / 2, Zp((y0 + y1) / 2)); return g; }
const cutMain = new THREE.Group(), cutB3 = new THREE.Group(), cutB2 = new THREE.Group(); cutaway.add(cutMain, cutB3, cutB2);
const capG = new THREE.Group(), capB3 = new THREE.Group(), capB2 = new THREE.Group(); cutaway.add(capG); cutB3.add(capB3); cutB2.add(capB2);
const capOf = (g) => g === cutB3 ? capB3 : g === cutB2 ? capB2 : capG;
// Solid piece; full-height pieces get a light "poché" cap that rides the cut plane.
function SB(x0, x1, y0, y1, h0, h1, mat, grp = cutMain) {
  if (x1 - x0 < 0.01 || y1 - y0 < 0.01 || h1 - h0 < 0.01) return;
  acc(grp, mat, boxGeo(x0, x1, y0, y1, h0, h1));
  if (h0 < CUT && h1 >= 9.4) { const c = new THREE.PlaneGeometry(x1 - x0, y1 - y0); c.rotateX(-Math.PI / 2); c.translate(W((x0 + x1) / 2), 0, Zp((y0 + y1) / 2)); acc(capOf(grp), M.cap, c); }
}
// Exterior wall: outer face at c, runs a0..a1 along axis; out=-1 => outside toward smaller coord.
function exWall(axis, c, a0, a1, out, opens = [], h = PL, grp = cutMain, t = 0.55) {
  const skin = 0.14, segs = [];
  let p = a0; const os = opens.filter(o => o.b > a0 && o.a < a1).sort((m, n) => m.a - n.a);
  for (const o of os) { if (o.a > p) segs.push([p, o.a, 0, h]); if (o.sill > 0.06) segs.push([Math.max(o.a, a0), Math.min(o.b, a1), 0, o.sill]); if (o.head < h) segs.push([Math.max(o.a, a0), Math.min(o.b, a1), o.head, h]); p = o.b; }
  if (p < a1) segs.push([p, a1, 0, h]);
  const oc0 = out < 0 ? c : c - skin, oc1 = out < 0 ? c + skin : c;          // stucco skin
  const ic0 = out < 0 ? c + skin : c - t, ic1 = out < 0 ? c + t : c - skin;   // painted core
  for (const [s0, s1, h0, h1] of segs) {
    if (axis === 'x') { SB(s0, s1, oc0, oc1, h0, h1, M.stucco, grp); acc(grp, M.paint, boxGeo(s0, s1, ic0, ic1, h0, h1)); }
    else { SB(oc0, oc1, s0, s1, h0, h1, M.stucco, grp); acc(grp, M.paint, boxGeo(ic0, ic1, s0, s1, h0, h1)); }
    if (h0 < CUT && h1 >= 9.4) { const lo = Math.min(oc0, ic0), hi = Math.max(oc1, ic1); const cg = axis === 'x' ? new THREE.PlaneGeometry(s1 - s0, hi - lo) : new THREE.PlaneGeometry(hi - lo, s1 - s0);
      cg.rotateX(-Math.PI / 2); cg.translate(axis === 'x' ? W((s0 + s1) / 2) : W((lo + hi) / 2), 0, axis === 'x' ? Zp((lo + hi) / 2) : Zp((s0 + s1) / 2)); acc(capOf(grp), M.cap, cg); }
  }
}
// Interior partition on centerline c, with door gaps [[a,b],...]
function inW(axis, c, a0, a1, gaps = [], t = 0.42) {
  let p = a0; const segs = [];
  for (const [a, b] of [...gaps].sort((m, n) => m[0] - n[0])) { if (a > p) segs.push([p, a]); p = b; }
  if (p < a1) segs.push([p, a1]);
  for (const [s0, s1] of segs) axis === 'x' ? SB(s0, s1, c - t / 2, c + t / 2, 0, PL, M.paint) : SB(c - t / 2, c + t / 2, s0, s1, 0, PL, M.paint);
}
const onWall = (axis, c) => (w) => axis === 'x' ? (Math.abs(w.y - c) < 0.05 && (!w.rotY || Math.abs(w.rotY) === Math.PI)) : (Math.abs(w.x - c) < 0.05 && Math.abs(Math.abs(w.rotY || 0) - Math.PI / 2) < 0.01);
// --- exterior shell (outer faces match the massing above) ---
exWall('x', 0, 0, 12.8, -1, opensOn(onWall('x', 0)));
exWall('y', 12.8, 0, 3.0, +1);
exWall('x', 3.0, 12.8, 24.75, -1, opensOn(onWall('x', 3)));
for (const [a, b] of [[TX0, 25.25], [31.25, TX1]]) SB(a, b, TY0, TY0 + 1, 0, TH, M.stucco);
SB(25.25, 31.25, TY0, TY0 + 1, 9.2, TH, M.stucco);
SB(TX0, TX0 + 0.85, TY0 + 1, 3.0, 0, TH, M.stucco); SB(TX1 - 0.85, TX1, TY0 + 1, 7.4, 0, TH, M.stucco);
exWall('y', 24.75, 3.0, DOORY, +1);
exWall('x', DOORY, 24.75, 31.7, -1, [{a: 26.5, b: 30.0, sill: 0, head: 8.45}]);
exWall('y', 31.7, 7.4, DOORY, -1);
for (const [a, b] of [[31.7, 34.3], [52.4, 55]]) SB(a, b, 7.4, 9.0, 0, PL, M.stucco);
SB(34.3, 35.5, 9.0, 9.5, 0, PL, M.paint); SB(51.5, 52.4, 9.0, 9.5, 0, PL, M.paint); SB(35.5, 51.5, 9.0, 9.5, 8.0, PL, M.paint);
exWall('y', 55, 9.0, 33.4, +1, [], PL, cutB2);                         // 2-car only: right garage wall
exWall('y', 55, 9.0, 10.4, +1, [], PL, cutB3);                          // 3-car: short return to the 3rd-bay pilaster
for (const [a, b] of [[55, 56.6], [65.4, 67]]) SB(a, b, 10.4, 12, 0, PL3, M.stucco, cutB3);
SB(56.6, 57, 12, 12.5, 0, PL3, M.paint, cutB3); SB(65, 65.4, 12, 12.5, 0, PL3, M.paint, cutB3); SB(57, 65, 12, 12.5, 7.0, PL3, M.paint, cutB3);
exWall('y', 67, 12, 36, +1, [], PL3, cutB3);
exWall('x', 36, 55, 67, +1, [], PL3, cutB3);
exWall('y', 55, 33.4, 62.1, +1, opensOn(onWall('y', 55)));
exWall('x', 62.1, 16.8, 55, +1, opensOn(onWall('x', 62.1)));
exWall('y', 16.8, 62.1, 67.4, +1, opensOn(onWall('y', 16.8)));
exWall('x', 67.4, 3.83, 16.8, +1, opensOn(onWall('x', 67.4)));
exWall('y', 3.83, 55.5, 67.4, -1, opensOn(onWall('y', 3.83)));
exWall('x', 55.5, 0, 3.83, +1);
exWall('y', 0, 0, 55.5, -1, opensOn(onWall('y', 0)));
for (const xa of [16.5, 39.33]) SB(xa, xa + 1.67, 71.33, 73, 0, PL, M.stucco);
// --- interior partitions (centerlines measured on the 11/9 sheet; gaps = door openings) ---
inW('y', 12.8, 3.0, 15.5);                          // Bedroom 3 | Bedroom 2
inW('x', 12.4, 0.5, 12.8, [[3, 7], [10.1, 12.5]]);   // Bedroom 3 top: closet bifold + bedroom door
inW('x', 15.3, 0.5, 9.4);                           // closet | bath 2
inW('y', 9.4, 12.4, 24.4, [[19.6, 22.0]]);          // closet / bath 2 east wall, bath door off hall
inW('x', 15.5, 12.8, 24.75, [[13.6, 16.2], [19.6, 23.6]]); // Bedroom 2 back wall: door + closet bifold
inW('y', 18.6, 15.5, 18.5); inW('x', 18.5, 18.6, 24.75);   // Bedroom 2 closet
inW('x', 22.6, 9.4, 24.75, [[16.6, 19.2], [20.4, 22.9]]);  // hall north wall: utility + linen
inW('x', 24.4, 0.5, 9.4);                           // bath 2 | primary bath
inW('y', 12.8, 22.6, 40, [[33.4, 35.9]]);           // utility & closet | primary bath (closet door)
inW('x', 31.6, 12.8, 24.75, [[18.5, 21.0]]);        // utility | primary closet (optional door)
inW('y', 24.75, DOORY, 40, [[18.5, 22.6]]);         // gallery west wall, opening to bedroom hall
inW('y', 19.5, 22.6, 25.4); inW('x', 25.4, 19.5, 24.75);   // linen closet
inW('y', 9.4, 22.6, 29.5); inW('x', 29.5, 9.4, 12.8, [[10, 12.3]]); // primary WC
inW('x', 40, 0.5, 31.7, [[9.4, 12.0], [25.6, 31.1]]);      // primary bath/closet/gallery north wall
inW('y', 17.55, 40, 55.5, [[40.6, 43.2]], 1.5);     // primary bedroom | great room (fireplace wall)
inW('y', 16.8, 55.5, 62.1, [[59, 61.5]]);           // flex | great room (optional door)
inW('x', 55.5, 3.83, 16.8, [[10, 15]]);             // primary bedroom | flex (optional 5/0 opening)
inW('y', 31.95, DOORY, 33.4, [], 0.55);             // gallery | garage
inW('x', 33.15, 31.7, 55, [[41.6, 44.3]], 0.5);     // garage | powder/mud/pantry (mud door)
inW('x', 40, 31.7, 54.45, [[32.0, 34.6], [40.6, 44.1]]);   // service row | great room & kitchen
inW('y', 34.9, 33.4, 40, [[37.0, 39.4]]);           // powder
inW('y', 39.9, 33.4, 40);                           // powder | mud
inW('y', 46.4, 33.4, 40, [[35.0, 37.5]]);           // mud | pantry
// --- floors ---
const FL = (x0, x1, y0, y1, mat, grp = cutMain) => { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.rotateX(-Math.PI / 2); g.translate(W((x0 + x1) / 2), 0.06, Zp((y0 + y1) / 2)); acc(grp, mat, g); };
for (const r of [[0, 12.8, 0, 12.4], [0, 9.4, 12.4, 15.3], [12.8, 24.75, 3, 15.5], [9.4, 12.8, 12.4, 18.5], [12.8, 24.75, 15.5, 18.5], [9.4, 24.75, 18.5, 22.6],
  [12.8, 24.75, 31.6, 40], [24.75, 31.7, DOORY, 40], [0, 16.8, 40, 55.5], [3.83, 16.8, 55.5, 67.4], [16.8, 55, 40, 62.1], [31.7, 34.9, 33.4, 40]]) FL(...r, M.wood);
for (const r of [[0, 9.4, 15.3, 24.4], [9.4, 12.8, 22.6, 24.4], [12.8, 24.75, 22.6, 31.6], [0, 12.8, 24.4, 40], [34.9, 39.9, 33.4, 40], [39.9, 46.4, 33.4, 40], [46.4, 55, 33.4, 40]]) FL(...r, M.tile);
FL(31.7, 55, 9.0, 33.4, M.garageFloor); FL(34.3, 52.4, 7.4, 9.0, M.garageFloor); FL(55, 67, 12, 36, M.garageFloor, cutB3);
// --- furniture (simple, low-poly) ---
const F = (x0, x1, y0, y1, h0, h1, mat, grp = cutMain) => acc(grp, mat, boxGeo(x0, x1, y0, y1, h0, h1));
function bedX(x0, yc, len, wid, faceRight = true) { // headboard at x0, bed extends +x
  const x1 = x0 + len, y0 = yc - wid / 2, y1 = yc + wid / 2;
  F(x0, x0 + 0.35, y0 - 0.2, y1 + 0.2, 0, 4.2, M.fabric);       // upholstered headboard
  F(x0 + 0.35, x1, y0, y1, 0.3, 1.1, M.woodDark);               // base
  F(x0 + 0.35, x1, y0 + 0.05, y1 - 0.05, 1.1, 2.0, M.linen);     // mattress + bedding
  F(x0 + 2.2, x1 + 0.05, y0 - 0.05, y1 + 0.05, 1.9, 2.15, M.throw); // duvet
  F(x0 + 0.45, x0 + 1.5, y0 + 0.4, yc - 0.15, 2.0, 2.55, M.linen); F(x0 + 0.45, x0 + 1.5, yc + 0.15, y1 - 0.4, 2.0, 2.55, M.linen); // pillows
  F(x0, x0 + 1.6, y0 - 2.0, y0 - 0.4, 0, 2.1, M.woodDark); F(x0, x0 + 1.6, y1 + 0.4, y1 + 2.0, 0, 2.1, M.woodDark); // nightstands
}
function bedXrev(x1, yc, len, wid) { // headboard at x1, bed extends -x
  const x0 = x1 - len, y0 = yc - wid / 2, y1 = yc + wid / 2;
  F(x1 - 0.35, x1, y0 - 0.2, y1 + 0.2, 0, 4.2, M.fabric); F(x0, x1 - 0.35, y0, y1, 0.3, 1.1, M.woodDark);
  F(x0, x1 - 0.35, y0 + 0.05, y1 - 0.05, 1.1, 2.0, M.linen); F(x0 - 0.05, x1 - 2.2, y0 - 0.05, y1 + 0.05, 1.9, 2.15, M.throw);
  F(x1 - 1.5, x1 - 0.45, y0 + 0.4, yc - 0.15, 2.0, 2.55, M.linen); F(x1 - 1.5, x1 - 0.45, yc + 0.15, y1 - 0.4, 2.0, 2.55, M.linen);
  F(x1 - 1.6, x1, y0 - 2.0, y0 - 0.4, 0, 2.1, M.woodDark); F(x1 - 1.6, x1, y1 + 0.4, y1 + 2.0, 0, 2.1, M.woodDark);
}
function rug(x0, x1, y0, y1) { F(x0, x1, y0, y1, 0.06, 0.1, M.rug); }
function sofaY(x0, x1, y0, y1, backAtX1) { // seat along y, back on x0 or x1 side
  F(x0, x1, y0, y1, 0.3, 1.45, M.fabric); const bx = backAtX1 ? [x1 - 0.7, x1] : [x0, x0 + 0.7]; F(bx[0], bx[1], y0, y1, 1.45, 2.7, M.fabric);
  F(x0, x1, y0, y0 + 0.6, 1.45, 2.1, M.fabric); F(x0, x1, y1 - 0.6, y1, 1.45, 2.1, M.fabric);
}
function sofaX(x0, x1, y0, y1, backAtY1) {
  F(x0, x1, y0, y1, 0.3, 1.45, M.fabric); const by = backAtY1 ? [y1 - 0.7, y1] : [y0, y0 + 0.7]; F(x0, x1, by[0], by[1], 1.45, 2.7, M.fabric);
  F(x0, x0 + 0.6, y0, y1, 1.45, 2.1, M.fabric); F(x1 - 0.6, x1, y0, y1, 1.45, 2.1, M.fabric);
}
function table(x0, x1, y0, y1, h = 2.5, mat = M.woodDark, legMat = M.metal) {
  F(x0, x1, y0, y1, h - 0.12, h, mat);
  for (const [lx, ly] of [[x0 + 0.2, y0 + 0.2], [x1 - 0.35, y0 + 0.2], [x0 + 0.2, y1 - 0.35], [x1 - 0.35, y1 - 0.35]]) F(lx, lx + 0.15, ly, ly + 0.15, 0, h - 0.12, legMat);
}
function chair(xc, yc, s = 1.5, mat = M.fabric) { F(xc - s / 2, xc + s / 2, yc - s / 2, yc + s / 2, 0, 1.55, mat); }
function counter(x0, x1, y0, y1, h = 3.0) { F(x0, x1, y0, y1, 0, h - 0.13, M.cabinet); F(x0 - 0.04, x1 + 0.04, y0 - 0.04, y1 + 0.04, h - 0.13, h, M.quartz); }
function toilet(xc, yc, rotX = false) { if (rotX) { F(xc - 0.9, xc - 0.5, yc - 0.8, yc + 0.8, 0, 2.6, M.porcelain); F(xc - 0.5, xc + 0.9, yc - 0.6, yc + 0.6, 0, 1.3, M.porcelain); } else { F(xc - 0.8, xc + 0.8, yc - 0.9, yc - 0.5, 0, 2.6, M.porcelain); F(xc - 0.6, xc + 0.6, yc - 0.5, yc + 0.9, 0, 1.3, M.porcelain); } }
// Bedroom 3: queen on the side wall
bedX(0.55, 6.6, 6.9, 5.0); rug(2.5, 9.5, 3.2, 10.0); F(11.1, 12.55, 2.0, 6.5, 0, 2.8, M.woodDark);
F(0.6, 9.0, 13.9, 15.05, 0, 7, M.shelf);   // closet shelving
// Bedroom 2: queen on the porch-side wall
bedXrev(24.2, 9.4, 6.9, 5.0); rug(15.5, 22.2, 6.0, 12.8); F(13.05, 14.4, 6.5, 12.0, 0, 2.8, M.woodDark);
F(19.0, 24.4, 17.0, 18.25, 0, 7, M.shelf);
// Bath 2: tub, double vanity, toilet
F(0.6, 6.1, 15.55, 18.1, 0, 1.8, M.porcelain); F(1.6, 8.0, 22.35, 24.15, 0, 2.9, M.cabinet); F(1.55, 8.05, 22.3, 24.18, 2.9, 3.0, M.quartz);
toilet(7.9, 16.6, true);
// Utility: washer/dryer + sink cabinets; linen shelving
F(22.3, 24.45, 26.0, 28.1, 0, 3.3, M.porcelain); F(22.3, 24.45, 28.3, 30.4, 0, 3.3, M.porcelain); counter(13.05, 15.1, 25.2, 31.3);
F(19.8, 24.5, 22.85, 24.0, 0, 7, M.shelf);
// Primary bath: walk-in shower (glass), freestanding tub, double vanity, WC
F(0.6, 8.5, 29.15, 29.3, 0.1, 7, M.showerGlass); F(0.6, 2.2, 24.7, 29.1, 0, 1.5, M.quartz);
F(0.9, 3.4, 30.4, 35.3, 0, 1.9, M.porcelain); F(1.2, 3.1, 30.9, 34.8, 1.6, 1.92, M.water);
F(0.8, 5.0, 37.9, 39.75, 0, 2.9, M.cabinet); F(5.6, 9.3, 37.9, 39.75, 0, 2.9, M.cabinet); F(0.75, 9.35, 37.85, 39.78, 2.9, 3.0, M.quartz);
toilet(11.1, 25.6);
// Primary closet: hanging/shelving both walls + center island
F(13.05, 14.6, 32.0, 39.6, 0, 7, M.shelf); F(22.9, 24.5, 32.0, 39.6, 0, 7, M.shelf); counter(17.4, 20.2, 34.3, 37.6);
// Primary bedroom: king centered under the 6/0x2/0 transom, bench, chair
bedX(0.55, 47.3, 7.0, 6.6); F(7.8, 9.3, 44.5, 50.1, 0, 1.5, M.fabric); rug(3.0, 11.5, 43.0, 51.6); chair(13.8, 52.5, 2.6); F(13.8, 16.3, 41.0, 42.6, 0, 2.8, M.woodDark);
// Flex / retreat: sofa + lounge chairs
sofaY(4.4, 7.2, 58.5, 64.8, false); chair(12.8, 59.5, 2.6); chair(12.8, 63.6, 2.6); table(8.6, 10.8, 60.0, 63.3, 1.4); rug(5.5, 14.8, 57.6, 65.8);
// Great room: 72" linear fireplace on the primary-bedroom wall, L-sofa facing it
F(18.3, 19.1, 45.5, 55.6, 0, CUT + 0.2, M.stone); F(19.1, 19.16, 47.6, 53.6, 1.6, 3.0, M.firebox); F(19.1, 19.4, 45.6, 55.5, 0, 0.6, M.stone);
sofaY(27.0, 29.9, 44.6, 56.0, true); sofaX(22.0, 27.0, 44.6, 47.5, false); table(22.6, 25.6, 48.8, 53.2, 1.35, M.woodDark, M.woodDark);
chair(22.4, 58.8, 2.6); rug(20.6, 31.2, 43.6, 57.3);
counter(34.7, 41.9, 40.25, 41.8);                  // dry bar along the service wall (per plan)
// Kitchen: perimeter run with range, refrigerator, island with sink + stools
counter(48.4, 54.45, 40.25, 42.4); F(45.3, 48.3, 40.25, 42.7, 0, 7.0, M.metal);      // fridge
counter(52.4, 54.45, 42.4, 51.3); F(52.45, 54.4, 45.4, 47.9, 3.0, 3.05, M.cooktop);   // range cooktop
F(53.5, 54.45, 42.4, 51.3, 5.2, 8.0, M.cabinet);                                      // uppers
counter(45.8, 48.9, 45.1, 51.4); F(45.3, 45.8, 45.1, 51.4, 2.87, 3.0, M.quartz); F(46.6, 48.1, 47.4, 49.1, 3.0, 3.02, M.metal);
for (const yy of [46.3, 48.25, 50.2]) F(44.2, 45.0, yy - 0.4, yy + 0.4, 0, 2.5, M.woodDark);
// Dining: 8-seat table
table(47.6, 51.2, 53.2, 60.6, 2.5); for (const yy of [54.4, 56.9, 59.4]) { chair(46.6, yy, 1.5, M.fabric); chair(52.2, yy, 1.5, M.fabric); }
// Powder / mud / pantry
F(35.3, 38.0, 38.9, 39.75, 0, 2.9, M.cabinet); toilet(38.8, 34.4); F(40.35, 45.9, 38.5, 39.75, 0, 7, M.cabinet); F(40.35, 45.9, 37.6, 38.5, 0, 1.5, M.woodDark);
F(46.85, 54.4, 33.6, 34.9, 0, 7, M.shelf); F(53.1, 54.4, 34.9, 39.75, 0, 7, M.shelf); F(46.85, 48.1, 37.8, 39.75, 0, 7, M.shelf);
// Entry console, patio seating
F(25.2, 26.4, 11.5, 15.0, 0, 2.6, M.woodDark);
sofaX(21.0, 28.0, 66.6, 69.4, true); chair(19.6, 64.6, 2.4, M.fabric); table(22.5, 26.5, 63.6, 65.4, 1.35, M.woodDark, M.woodDark); table(32.5, 37.5, 64.2, 68.2, 2.5);
for (const [xx, yy] of [[31.6, 65.2], [31.6, 67.2], [38.4, 65.2], [38.4, 67.2]]) chair(xx, yy, 1.4, M.woodDark);
// merge everything per (group, material)
for (const {mat, geos, group} of ACC.values()) {
  const m = new THREE.Mesh(mergeGeometries(geos, false), mat); m.castShadow = mat !== M.cap && mat !== M.rug && mat !== M.water; m.receiveShadow = true; group.add(m);
  geos.forEach(g => g.dispose());
}
// Room labels (HTML) — dims only where the sheet states them clearly.
const ROOMS = [
  ['Bedroom 3', 6.4, 9.5, `12'-9½" × 12'-0"`], ['Bedroom 2', 18.8, 6.0, `12'-2½" × 12'-3½"`], ['Bath 2', 4.7, 20.0], ['Utility', 17.5, 28.0],
  ['Primary Bath', 6.0, 33.0], ['Primary Closet', 18.8, 33.0, '', 1], ['Primary Bedroom', 7.6, 53.2, `16'-10" wide`], ['Flex / Retreat', 10.3, 66.0, `13'-0" × 12'-0"`],
  ['Great Room', 26.4, 59.6, `21'-1½" · vaulted`], ['Kitchen', 50.0, 43.8], ['Dining', 49.4, 61.0, `10'-11½" deep`], ['Powder', 37.4, 36.0, '', 1], ['Mud', 43.1, 35.4, '', 1], ['Pantry', 50.7, 37.0, '', 1],
  ['Entry', 28.25, 13.0], ['Gallery', 28.25, 27.0, `12' ceiling`], ['Covered Porch', 28.25, 5.2], ['Covered Patio', 28.8, 71.0, `21'-2" between columns`],
  ['2-Car Garage', 43.5, 21.0, `22'-11" × 24'-0"`], ['3rd Bay (optional)', 61.0, 24.0, `12'-3½" × 24'-0"`, 0, 'b3'],
];
const labelBox = document.createElement('div'); labelBox.id = 'roomlabels'; document.body.appendChild(labelBox);
const LBL = ROOMS.map(([name, x, y, dims = '', small = 0, only]) => {
  const el = document.createElement('div'); el.className = 'lbl' + (small ? ' sm' : ''); el.innerHTML = `<b>${name}</b>${dims ? `<span>${dims}</span>` : ''}`;
  labelBox.appendChild(el); return {el, p: new THREE.Vector3(W(x), 1.2, Zp(y)), only};
});

// ---------- site ----------
const site = new THREE.Group(); scene.add(site);
{ const g = new THREE.PlaneGeometry(700, 700); g.rotateX(-Math.PI / 2); const m = add(planarUV(g), M.lawn, site, false); m.position.y = -0.02; }
function flat(poly, y, mat, parent = site) {
  const s = new THREE.Shape(); poly.forEach(([x, yy], i) => i ? s.lineTo(W(x), -Zp(yy)) : s.moveTo(W(x), -Zp(yy)));
  const g = new THREE.ShapeGeometry(s, 8); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return add(planarUV(g), mat, parent, false);
}
const drive3 = flat([[33.6, 7.4], [55, 7.4], [55, 10.4], [67, 10.4], [67.5, -4], [70, -18], [74, -36], [40, -36], [38, -16], [33.6, -4]], 0.03, M.concrete);
flat([[34.3, 7.3], [52.4, 7.3], [52.4, 9.05], [34.3, 9.05]], 0.035, M.concrete); flat([[56.6, 10.3], [65.4, 10.3], [65.4, 12.05], [56.6, 12.05]], 0.035, M.concrete, bay3);
const drive2 = flat([[33.6, 7.4], [55, 7.4], [56, -4], [59, -18], [62, -36], [40, -36], [38, -16], [33.6, -4]], 0.03, M.concrete);
drive2.visible = false;
flat([[24.6, 0.8], [31.4, 0.8], [31.4, -2.5], [24.6, -2.5]], 0.04, M.walk);   // landing at porch
flat([[31.4, -0.6], [34.2, -0.6], [34.2, -2.5], [31.4, -2.5]], 0.04, M.walk);  // walk to driveway
flat([[-200, -36], [250, -36], [250, -40], [-200, -40]], 0.04, M.walk);         // public sidewalk
flat([[-200, -42], [250, -42], [250, -66], [-200, -66]], 0.02, M.asphalt);      // street
// Planting beds with low clipped boxwoods (no trees, per request)
flat([[-1, 0.4], [12.8, 0.4], [12.8, 2.9], [23.4, 2.9], [23.4, -0.5], [24.4, -0.5], [24.4, -3.6], [12.8, -3.6], [-1, -3.6]], 0.035, M.mulch);
flat([[-1, -3.6], [-1, 21], [-4, 21], [-4, -3.6]], 0.035, M.mulch);
{
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const spots = [];
  for (let x = 0.8; x < 24; x += 2.3) spots.push([x, -2.2, 0.7 + rnd() * 0.25]);
  for (let y = 1; y < 20; y += 2.6) spots.push([-2.5, y, 0.7 + rnd() * 0.2]);
  for (const x of [13.8, 15.6, 22.2]) spots.push([x, 1.6, 0.8]);
  const im = new THREE.InstancedMesh(geo, M.shrub, spots.length); const mx = new THREE.Matrix4(), q = new THREE.Quaternion();
  spots.forEach(([x, y, r], i) => { mx.compose(new THREE.Vector3(W(x), r * 0.75, Zp(y)), q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0)), new THREE.Vector3(r, r * 0.85, r)); im.setMatrixAt(i, mx); });
  im.castShadow = true; im.receiveShadow = true; site.add(im);
}
// Soft contact shadow under the house (cheap ambient-occlusion stand-in)
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const sc = 256 / 100; g.translate(256 / 2 - 33.5 * sc, 256 / 2 - 36.5 * sc);
  g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 14; g.fillStyle = 'rgba(0,0,0,0.55)';
  for (const [x0, x1, y0, y1] of [[0, 24, 0, 55.4], [16.5, 55, 2, 62.1], [3.83, 16.8, 55, 67.4], [55, 67, 10.4, 36]]) g.fillRect(x0 * sc, y0 * sc, (x1 - x0) * sc, (y1 - y0) * sc);
  const t = new THREE.CanvasTexture(c);
  const pg = new THREE.PlaneGeometry(100, 100); pg.rotateX(-Math.PI / 2); pg.translate(0, 0.05, 0);
  const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({map: t, transparent: true, depthWrite: false, opacity: 0.35})); m.renderOrder = 1; site.add(m);
}

// ---------- sky + lighting ----------
const skyU = {top: {value: new THREE.Color()}, mid: {value: new THREE.Color()}, hor: {value: new THREE.Color()}, sunDir: {value: new THREE.Vector3()}, sunCol: {value: new THREE.Color()}, cloudCol: {value: new THREE.Color('#ffffff')}, cloud: {value: 0.85}};
const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec3 vP; uniform vec3 top, mid, hor, sunCol, sunDir, cloudCol;
  uniform float cloud;
  float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float nz(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hsh(i), hsh(i+vec2(1,0)), f.x), mix(hsh(i+vec2(0,1)), hsh(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*nz(p); p *= 2.03; a *= .5; } return v; }
  void main(){ float h = max(vP.y, 0.0); vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.15, 0.7, h));
  float s = max(dot(normalize(vP), normalize(sunDir)), 0.0); c += sunCol * (pow(s, 6.0) * 0.35 + pow(s, 400.0) * 1.5);
  if (vP.y > 0.02) { vec2 uv = vP.xz / (vP.y + 0.12) * 1.6; float cl = smoothstep(0.52, 0.85, fbm(uv + vec2(3.1, 7.7))); c = mix(c, cloudCol, cl * cloud * smoothstep(0.02, 0.25, vP.y)); }
  if (vP.y < 0.0) c = hor * 0.85; gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  }`
}));
sky.renderOrder = -1; scene.add(sky);
const hemi = new THREE.HemisphereLight('#d6e6ff', '#5e5a44', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 3.2); sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
Object.assign(sun.shadow.camera, {left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 400});
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight('#cfe0f5', 0.5); fill.position.set(90, 40, -60); scene.add(fill);
const pts = [];
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
function bakeEnv() {
  const es = new THREE.Scene(); const s2 = sky.clone(); s2.material = sky.material; es.add(s2);
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(700, 32), new THREE.MeshBasicMaterial({color: isDusk ? '#26301f' : '#8a9a78'})); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -5; es.add(gnd);
  if (envRT) envRT.dispose(); envRT = pmrem.fromScene(es, 0.02, 1, 2000); scene.environment = envRT.texture;
}
let isDusk = false, hemiBase = 1, sunBase = 3;
function setMode(dusk) {
  isDusk = dusk; document.getElementById('dusk').setAttribute('aria-pressed', String(dusk));
  if (!dusk) {
    skyU.top.value.set('#3f7cc4'); skyU.mid.value.set('#8db7e3'); skyU.hor.value.set('#dfe9f0'); skyU.sunCol.value.set('#fff2d0'); skyU.cloudCol.value.set('#f4f6f8');
    sun.position.set(-70, 95, 110); sun.color.set('#fff1dc'); sun.intensity = 3.0;
    hemi.intensity = 0.9; hemi.color.set('#d6e6ff'); fill.intensity = 0.45; renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
    M.glass.emissive.set('#000'); M.door.emissive.set('#000'); M.gdoor2.emissive.set('#000'); M.gdoor3.emissive.set('#000');
    M.lampGlass.emissive.set('#000'); M.porchCeil.emissive.set('#000'); M.wash.opacity = 0; M.can.color.set('#f2ead8');
    scene.environmentIntensity = 0.55; M.roof.emissive.set('#000');
  } else {
    skyU.top.value.set('#14295a'); skyU.mid.value.set('#4f6fa8'); skyU.hor.value.set('#f0a56a'); skyU.sunCol.value.set('#ff9a50'); skyU.cloudCol.value.set('#f2a77a');
    sun.position.set(-60, 14, -120); sun.color.set('#ffb07a'); sun.intensity = 0.55;
    hemi.intensity = 1.0; hemi.color.set('#7f95cf'); fill.intensity = 0.15; renderer.toneMappingExposure = 1.05;
    M.glass.emissive.set('#ffbe78'); M.glass.emissiveIntensity = 1.1; M.door.emissive.set('#ffcf8a'); M.gdoor2.emissive.set('#ffffff'); M.gdoor3.emissive.set('#ffffff');
    M.gdoor2.emissiveIntensity = M.gdoor3.emissiveIntensity = 0.8;
    M.lampGlass.emissive.set('#ffb35a'); M.lampGlass.emissiveIntensity = 2.2; M.porchCeil.emissive.set('#ffcf8f'); M.porchCeil.emissiveIntensity = 0.35;
    M.wash.opacity = 0.62; M.can.color.set('#fff1d0');
    scene.environmentIntensity = 0.7; M.roof.emissive.set('#2a2f3c');
  }
  skyU.sunDir.value.copy(sun.position).normalize(); hemiBase = hemi.intensity; sunBase = sun.intensity; lastRoofT = -1;
  pts.forEach(p => p.visible = dusk);
  bakeEnv();
}
// a handful of warm point lights for dusk (subset of fixture positions to stay fast on phones)
duskLights.filter((_, i) => i % 2 === 0).slice(0, mobile ? 6 : 12).forEach(p => { const l = new THREE.PointLight('#ffc27a', 9, 16, 1.6); l.position.copy(p); l.visible = false; scene.add(l); pts.push(l); });
function setBay3(on) {
  bay3.visible = on; drive3.visible = on; drive2.visible = !on; roofB3.visible = on; cutB3.visible = on; cutB2.visible = !on;
  LBL.forEach(l => { if (l.only === 'b3') l.el.dataset.off = on ? '' : '1'; });
  document.getElementById('bay3').setAttribute('aria-pressed', String(on));
  document.getElementById('bay3').textContent = on ? '3-car' : '2-car';
}

// ---------- views ----------
const VIEWS = mobile ? {
  threeq: [[-32, 12, 200], [4, 8, 10]], front: [[2, 9, 180], [2, 9, 18]], aerial: [[-120, 150, 170], [4, 0, 6]], rear: [[60, 16, -165], [0, 6, 4]], interior: [[-40, 178, 122], [5, 0, 5]], interiorR: [[75, 120, 120], [2, -2, 2]], top: [[0, 175, 0.01], [0, 0, 0]], plan: [[0, 250, 0.01], [0, 0, 0]]
} : {
  threeq: [[-22, 5.5, 100], [8, 8.5, 20]], front: [[2, 6, 104], [2, 9, 20]], aerial: [[-92, 98, 118], [4, 0, 6]], rear: [[40, 12, -92], [0, 6, 0]], interior: [[-46, 90, 82], [4, -4, 2]], interiorR: [[62, 62, 78], [2, -4, 4]], top: [[0, 118, 0.01], [0, 0, 0]], plan: [[0, 250, 0.01], [0, 0, 0]]
};
let tween = null;
function view(name, instant = false) {
  const [p, t] = VIEWS[name];
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  if (instant) { camera.position.set(...p); controls.target.set(...t); controls.update(); tween = null; }
  else tween = {f: camera.position.clone(), to: new THREE.Vector3(...p), ft: controls.target.clone(), tt: new THREE.Vector3(...t), k: 0};
}
controls.addEventListener('start', () => { tween = null; document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false')); });
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => view(roofOff && b.dataset.view === 'aerial' ? 'interior' : b.dataset.view));
document.getElementById('reset').onclick = () => { if (roofOff) setRoof(false); view('threeq'); };
// ---------- roof-off dollhouse ----------
let roofOff = false, roofT = 0, labelsOn = Q.get('labels') !== '0';
const roofBtn = document.getElementById('roof'), lblBtn = document.getElementById('labels');
function setRoof(off, instant = false) {
  roofOff = off; roofBtn.setAttribute('aria-pressed', String(off)); roofBtn.textContent = off ? 'Show roof' : 'Remove roof';
  lblBtn.hidden = !off; document.body.classList.toggle('roofoff', off);
  if (instant) roofT = off ? 1 : 0;
  if (off) view('interior', instant); else if (!instant) view('threeq');
}
function setLabels(on) { labelsOn = on; lblBtn.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('labels-on', on); }
roofBtn.onclick = () => setRoof(!roofOff); lblBtn.onclick = () => setLabels(!labelsOn);
const ease = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let lastRoofT = -1;
function applyRoof() {
  if (roofT === lastRoofT) return; lastRoofT = roofT;
  const e = ease(roofT), on = roofT === 0;
  mass.visible = massB3.visible = on; cutaway.visible = !on;
  roofG.visible = roofT < 1; roofG.position.y = e * 30;
  const op = 1 - sstep(0.05, 0.75, e);
  for (const k of ROOFMATS) { const m = M[k]; const tr = op < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op; }
  M.wash.userData.k = op;
  cutPlane.constant = on ? 1000 : THREE.MathUtils.lerp(TH + 1, CUT, sstep(0.0, 0.8, e));
  for (const cg of [capG, capB3, capB2]) { cg.visible = cutPlane.constant <= 9.4; cg.position.y = cutPlane.constant + 0.01; }
  hemi.intensity = hemiBase * (1 + 0.6 * e); sun.intensity = sunBase * (1 - 0.4 * e);
}
document.getElementById('dusk').onclick = () => setMode(!isDusk);
document.getElementById('bay3').onclick = () => setBay3(!bay3.visible);

setBay3(Q.get('bay') !== '2');
setMode(Q.get('mode') === 'dusk');
setLabels(labelsOn);
view(Q.get('view') && VIEWS[Q.get('view')] ? Q.get('view') : 'threeq', true);
if (Q.get('roof') === 'off') { setRoof(true, true); if (Q.get('view')) view(Q.get('view'), true); }

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tween) { tween.k = Math.min(1, tween.k + dt * 1.2); const e = tween.k < 0.5 ? 2 * tween.k * tween.k : 1 - Math.pow(-2 * tween.k + 2, 2) / 2;
    camera.position.lerpVectors(tween.f, tween.to, e); controls.target.lerpVectors(tween.ft, tween.tt, e); if (tween.k === 1) tween = null; }
  const goal = roofOff ? 1 : 0;
  if (roofT !== goal) roofT = goal > roofT ? Math.min(1, roofT + dt / 1.5) : Math.max(0, roofT - dt / 1.2);
  applyRoof();
  const wk = M.wash.userData.k ?? 1; M.wash.opacity = (isDusk ? 0.62 : 0) * wk;
  controls.update(); renderer.render(scene, camera);
  const elev = (camera.position.y - controls.target.y) / camera.position.distanceTo(controls.target);
  document.body.style.setProperty('--lblop', String(sstep(0.8, 1, roofT) * sstep(0.42, 0.6, elev)));
  if (roofT > 0.8 && labelsOn && elev > 0.42) {
    const hw = innerWidth / 2, hh = innerHeight / 2, v = new THREE.Vector3();
    for (const l of LBL) { v.copy(l.p).project(camera); const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && !l.el.dataset.off;
      l.el.style.display = vis ? '' : 'none'; if (vis) l.el.style.transform = `translate3d(${(v.x * hw + hw).toFixed(1)}px,${(-v.y * hh + hh).toFixed(1)}px,0) translate(-50%,-50%)`; }
  }
}
renderer.setAnimationLoop(frame);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
requestAnimationFrame(() => requestAnimationFrame(() => { document.getElementById('loading').classList.add('done'); window.__ready = true; }));
window.chartres = {get drawCalls() { return renderer.info.render.calls; }, view: (n) => view(n, true), setMode, setBay3, setRoof, setLabels, get roofT() { return roofT; }};
