// The Chartres (Plan 7040, Elevation A) — interactive exterior study.
// Sources: City Design & Plans main-floor sheet dated 11/9/2026 + front render (chartres-hero.webp).
// Units: 1 = 1 foot. Plan coords: x = feet from LEFT side (as seen from street), y = feet back from the FRONT-most wall.
// World: X = x - CX, Z = CZ - y  (front faces +Z), Y up.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/OrbitControls.js';

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
mount.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, innerWidth / innerHeight, 0.5, 1500);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, {enableDamping: true, dampingFactor: 0.07, minDistance: 18, maxDistance: 260, maxPolarAngle: Math.PI * 0.485, screenSpacePanning: true});
// (shadowSide set after materials)
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
};

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
const house = new THREE.Group(), bay3 = new THREE.Group(); scene.add(house); house.add(bay3);
const PL = 10.5;      // wall plate / main eave height (10' ceilings + slab)
const PITCH = 7 / 12; // hip pitch (render reads ~7:12)
const OV = 1.6;       // eave overhang

// Wall masses (plan dims from sheet 2, 11/9/2026)
B(0, 12.81, 0, 22, 0, PL, M.stucco, house);            // Bedroom 3 wing (projects 3' past Bedroom 2)
B(0, 24.0, 3, 55.4, 0, PL, M.stucco, house);           // Bedroom 2 / bath / primary suite wing
B(16.5, 41, 9.2, 62.1, 0, PL, M.stucco, house);        // entry hall / great room core
B(32.0, 55, 5.8, 62.1, 0, PL, M.stucco, house);        // 2-car garage + mud/pantry/kitchen/dining
B(3.83, 16.5, 55.4, 67.4, 0, PL, M.stucco, house);     // Flex / retreat
// Garage pilasters (2'-7.5" wide, 1'-6" proud of door wall) with cast-stone bases
for (const [a, b] of [[32.0, 34.62], [52.38, 55]]) { B(a, b, 4.3, 5.8, 0, PL, M.stucco, house); B(a - 0.08, b + 0.08, 4.22, 5.88, 0, 1.3, M.base, house); }
B(34.62, 52.38, 5.62, 5.8, PL - 1.6, PL - 0.7, M.trimStucco, house); // header band over garage door
// Stucco water-table/base around bedroom wing front (subtle)
// 2-car door 16'x8'
{ const g = new THREE.PlaneGeometry(16, 8); g.translate(W(43.5), 4, Zp(5.8) + 0.04); add(g, M.gdoor2, house, false); }
{ const g = new THREE.BoxGeometry(16.6, 0.3, 0.2); g.translate(W(43.5), 8.15, Zp(5.8) + 0.1); add(planarUV(g), M.trimStucco, house); }

// 3rd bay (optional on plan; shown in render)
const PL3 = 9.6;
B(55, 67, 8.8, 34, 0, PL3, M.stucco, bay3);
for (const [a, b] of [[55, 56.6], [65.4, 67]]) { B(a, b, 7.3, 8.8, 0, PL3, M.stucco, bay3); B(a - 0.08, b + 0.08, 7.22, 8.88, 0, 1.3, M.base, bay3); }
B(56.6, 65.4, 8.62, 8.8, PL3 - 1.5, PL3 - 0.7, M.trimStucco, bay3);
{ const g = new THREE.PlaneGeometry(8, 7); g.translate(W(61), 3.5, Zp(8.8) + 0.04); add(g, M.gdoor3, bay3, false); }

// Entry tower: arched porch opening (5'-6" clear), 14' porch ceiling, roof eave ~15.5'
const TX0 = 23.0, TX1 = 33.5, TY0 = 1.0, TH = 15.8; // tower face ~1' proud of plan reading so the main eave dies into it as in the render
{
  const w = TX1 - TX0, hw = w / 2, ow = 3.0, spring = 8.9, rise = 1.8;
  const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, TH); s.lineTo(-hw, TH); s.lineTo(-hw, 0);
  const hole = new THREE.Path(); hole.moveTo(-ow, 0); hole.lineTo(ow, 0); hole.lineTo(ow, spring);
  const R = (ow * ow + rise * rise) / (2 * rise), cy = spring + rise - R, a0 = Math.asin(ow / R);
  hole.absarc(0, cy, R, Math.PI / 2 - a0, Math.PI / 2 + a0, false); hole.lineTo(-ow, 0); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, {depth: 1.0, bevelEnabled: false, curveSegments: 24}); g.translate(W((TX0 + TX1) / 2), 0, Zp(TY0) - 1.0);
  add(planarUV(g), M.stucco, house);
  // raised arch trim band (archivolt) like the render
  const tr = new THREE.Shape(); const bw = 0.5;
  tr.moveTo(-ow - bw, spring); tr.absarc(0, cy, R + bw, Math.PI / 2 + Math.asin((ow + bw) / (R + bw)), Math.PI / 2 - Math.asin((ow + bw) / (R + bw)), true);
  tr.lineTo(ow + bw, spring - 0.2); tr.lineTo(ow, spring - 0.2); tr.lineTo(ow, spring); tr.absarc(0, cy, R, Math.PI / 2 - a0, Math.PI / 2 + a0, false); tr.lineTo(-ow, spring - 0.2); tr.lineTo(-ow - bw, spring - 0.2); tr.lineTo(-ow - bw, spring);
  const tg = new THREE.ExtrudeGeometry(tr, {depth: 0.14, bevelEnabled: false, curveSegments: 24}); tg.translate(W((TX0 + TX1) / 2), 0, Zp(TY0));
  add(planarUV(tg), M.trimStucco, house);
  // impost/side trims down the jambs
  if (0) for (const sg of [-1, 1]) { const jg = new THREE.BoxGeometry(bw, spring - 0.2, 0.14); jg.translate(W((TX0 + TX1) / 2) + sg * (ow + bw / 2), (spring - 0.2) / 2, Zp(TY0) + 0.07); add(planarUV(jg), M.trimStucco, house); }
  B(TX0, TX0 + 0.85, TY0 + 1, 12, 0, TH, M.stucco, house); B(TX1 - 0.85, TX1, TY0 + 1, 12, 0, TH, M.stucco, house);
  B(TX0, TX1, 9.2, 12, 0, TH, M.stucco, house); B(TX0, TX1, TY0 + 1, 12, 14, TH, M.stucco, house);
  const pc = new THREE.PlaneGeometry(TX1 - TX0 - 1.7, 7); pc.rotateX(Math.PI / 2); pc.translate(W((TX0 + TX1) / 2), 13.99, Zp(TY0 + 1 + 3.5)); add(pc, M.porchCeil, house, false);
  B(TX0 + 0.85, TX1 - 0.85, TY0, 9.2, 0, 0.45, M.walk, house); // porch slab
  B(24.5, 32.0, TY0 - 1.2, TY0, 0, 0.22, M.walk, house); // step
  // Front door 3'-6" x 8'-0" with lantern
  const dg = new THREE.PlaneGeometry(3.5, 8); dg.translate(W(28.25), 0.45 + 4, Zp(9.2) + 0.05); add(dg, M.door, house, false);
  const fr = (sx, sy, px, py) => { const g2 = new THREE.BoxGeometry(sx, sy, 0.25); g2.translate(W(28.25) + px, py, Zp(9.2) + 0.12); add(g2, M.corbel, house); };
  fr(0.3, 8.3, -1.9, 4.6); fr(0.3, 8.3, 1.9, 4.6); fr(4.1, 0.3, 0, 8.6);
  sconce(house, 28.25, TY0, 12.2, 0.0, 1.35);   // lantern centered above the arch
  sconce(house, 28.25 - 4.15, TY0, 7.6, 0.0, 1);  // flanking sconces on the tower piers, as in the render
  sconce(house, 28.25 + 4.15, TY0, 7.6, 0.0, 1);
}
sconce(house, 54.0, 4.3, 7.6, 0, 1);
sconce(bay3, 66.2, 7.3, 7.2, 0, 1);

// Windows — front (positions from the sheet's front dimension string)
windowAt(house, {x: 6.4, y: 0, sill: 2.4, w: 3.0, h: 6.3, cols: 2, rows: 3, shutters: true});       // Bedroom 3: 3'-0" window with shutters
windowAt(house, {x: 18.8, y: 3, sill: 2.0, w: 6.0, h: 7.0, cols: 3, rows: 1, transom: 0.74});                       // Bedroom 2: pair of 3/0x7/0, black frames
// sides
windowAt(house, {x: 0, y: 10, rotY: -Math.PI / 2, sill: 2.4, w: 3, h: 6.3, cols: 2, rows: 3});
windowAt(house, {x: 0, y: 38, rotY: -Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});
windowAt(house, {x: 0, y: 46, rotY: -Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});
windowAt(house, {x: 3.83, y: 61.4, rotY: -Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});
windowAt(house, {x: 55, y: 50.5, rotY: Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});
windowAt(house, {x: 55, y: 55.5, rotY: Math.PI / 2, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});
// rear (rotY = PI faces -Z)
for (const xc of [6.5, 10.33, 14.17]) windowAt(house, {x: xc, y: 67.4, rotY: Math.PI, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});
windowAt(house, {x: 19.9, y: 62.1, rotY: Math.PI, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});
windowAt(house, {x: 28.4, y: 62.1, rotY: Math.PI, sill: 0.3, w: 10, h: 8, cols: 4, rows: 1, door: true}); // 10/0x8/0 slider
windowAt(house, {x: 37.3, y: 62.1, rotY: Math.PI, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});
for (const xc of [44, 48.5, 53]) windowAt(house, {x: xc, y: 62.1, rotY: Math.PI, sill: 2.0, w: 3, h: 7, cols: 2, rows: 2});

// Covered patio (21'-2" x ~10'-11", vaulted) with stucco columns
B(16.5, 41, 62.1, 73, 0, 0.35, M.walk, house);
for (const xa of [16.5, 39.33]) { B(xa, xa + 1.67, 71.33, 73, 0, PL, M.stucco, house); B(xa - 0.08, xa + 1.75, 71.25, 73.08, 0, 1.3, M.base, house); }
B(16.5, 41, 71.33, 73, PL - 1.2, PL, M.stucco, house); // beam

// ---------- roofs ----------
const R = {};
R.main = hipRoof(0, 41, 3, 62.1, PL, PITCH, OV, house, {maxTop: 18.6, ovF: 1.25});
R.left = R.main;
R.bed3 = hipRoof(0, 12.81, 0, 22, PL, PITCH, OV, house);
R.right = hipRoof(32.0, 55, 4.3, 62.1, PL, PITCH, OV, house, {maxTop: 15.0});
R.flex = hipRoof(3.83, 16.5, 55.4, 67.4, PL, PITCH, OV, house);
R.patio = hipRoof(16.5, 41, 60, 73, PL, PITCH * 0.7, OV, house);
R.tower = hipRoof(TX0, TX1, TY0, 12, TH, 4.5 / 12, 2.2, house, {fascia: 1.1});
R.bay3 = hipRoof(55, 67, 7.3, 34, PL3, PITCH, OV, bay3);
// Corbels / lights along the street-facing eaves
eaveDetail(0.6, 12.2, 0, PL, OV, R.bed3.fh, house);
eaveDetail(13.4, 23.2, 3, PL, 1.25, R.left.fh, house, {spacing: 3.4});
eaveDetail(TX0 + 0.3, TX1 - 0.3, TY0, TH, 2.2, R.tower.fh, house, {spacing: 3.3, washH: 6});
eaveDetail(34.0, 54.6, 4.3, PL, OV, R.right.fh, house, {spacing: 4.4, washH: 2.1});
eaveDetail(55.4, 66.6, 7.3, PL3, OV, R.bay3.fh, bay3, {spacing: 3.7, washH: 1.4});

// ---------- site ----------
const site = new THREE.Group(); scene.add(site);
{ const g = new THREE.PlaneGeometry(700, 700); g.rotateX(-Math.PI / 2); const m = add(planarUV(g), M.lawn, site, false); m.position.y = -0.02; }
function flat(poly, y, mat, parent = site) {
  const s = new THREE.Shape(); poly.forEach(([x, yy], i) => i ? s.lineTo(W(x), -Zp(yy)) : s.moveTo(W(x), -Zp(yy)));
  const g = new THREE.ShapeGeometry(s, 8); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return add(planarUV(g), mat, parent, false);
}
const drive3 = flat([[32, 5.8], [55, 5.8], [55, 8.8], [67, 8.8], [67.5, -4], [70, -18], [74, -36], [40, -36], [38, -16], [33.5, -4]], 0.03, M.concrete);
const drive2 = flat([[32, 5.8], [55, 5.8], [56, -4], [59, -18], [62, -36], [40, -36], [38, -16], [33.5, -4]], 0.03, M.concrete);
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
  for (const [x0, x1, y0, y1] of [[0, 24, 0, 55.4], [16.5, 55, 2, 62.1], [3.83, 16.5, 55, 67.4], [55, 67, 7.3, 34]]) g.fillRect(x0 * sc, y0 * sc, (x1 - x0) * sc, (y1 - y0) * sc);
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
let isDusk = false;
function setMode(dusk) {
  isDusk = dusk; document.getElementById('dusk').setAttribute('aria-pressed', String(dusk));
  if (!dusk) {
    skyU.top.value.set('#3f7cc4'); skyU.mid.value.set('#8db7e3'); skyU.hor.value.set('#dfe9f0'); skyU.sunCol.value.set('#fff2d0'); skyU.cloudCol.value.set('#f4f6f8');
    sun.position.set(-70, 95, 110); sun.color.set('#fff1dc'); sun.intensity = 3.0;
    hemi.intensity = 0.9; hemi.color.set('#d6e6ff'); fill.intensity = 0.45; renderer.toneMappingExposure = 1.0;
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
  skyU.sunDir.value.copy(sun.position).normalize();
  pts.forEach(p => p.visible = dusk);
  bakeEnv();
}
// a handful of warm point lights for dusk (subset of fixture positions to stay fast on phones)
duskLights.filter((_, i) => i % 2 === 0).slice(0, mobile ? 6 : 12).forEach(p => { const l = new THREE.PointLight('#ffc27a', 9, 16, 1.6); l.position.copy(p); l.visible = false; scene.add(l); pts.push(l); });
function setBay3(on) {
  bay3.visible = on; drive3.visible = on; drive2.visible = !on;
  document.getElementById('bay3').setAttribute('aria-pressed', String(on));
  document.getElementById('bay3').textContent = on ? '3-car' : '2-car';
}

// ---------- views ----------
const VIEWS = mobile ? {
  threeq: [[-32, 12, 200], [4, 8, 10]], front: [[2, 9, 180], [2, 9, 18]], aerial: [[-120, 150, 170], [4, 0, 6]], rear: [[60, 16, -165], [0, 6, 4]]
} : {
  threeq: [[-22, 5.5, 100], [8, 8.5, 20]], front: [[2, 6, 104], [2, 9, 20]], aerial: [[-92, 98, 118], [4, 0, 6]], rear: [[40, 12, -92], [0, 6, 0]]
};
let tween = null;
function view(name, instant = false) {
  const [p, t] = VIEWS[name];
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  if (instant) { camera.position.set(...p); controls.target.set(...t); controls.update(); tween = null; }
  else tween = {f: camera.position.clone(), to: new THREE.Vector3(...p), ft: controls.target.clone(), tt: new THREE.Vector3(...t), k: 0};
}
controls.addEventListener('start', () => { tween = null; document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false')); });
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => view(b.dataset.view));
document.getElementById('reset').onclick = () => view('threeq');
document.getElementById('dusk').onclick = () => setMode(!isDusk);
document.getElementById('bay3').onclick = () => setBay3(!bay3.visible);

setBay3(Q.get('bay') !== '2');
setMode(Q.get('mode') === 'dusk');
view(Q.get('view') && VIEWS[Q.get('view')] ? Q.get('view') : 'threeq', true);

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tween) { tween.k = Math.min(1, tween.k + dt * 1.2); const e = tween.k < 0.5 ? 2 * tween.k * tween.k : 1 - Math.pow(-2 * tween.k + 2, 2) / 2;
    camera.position.lerpVectors(tween.f, tween.to, e); controls.target.lerpVectors(tween.ft, tween.tt, e); if (tween.k === 1) tween = null; }
  controls.update(); renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
requestAnimationFrame(() => requestAnimationFrame(() => { document.getElementById('loading').classList.add('done'); window.__ready = true; }));
window.chartres = {view: (n) => view(n, true), setMode, setBay3};
