  // ================= library: street things — a lamp post, power lines, a bench, a bin, curbs, tyre flower beds =================
  // notices stuck to the lamp post: one with tear-off phone strips, one printed, one faded
  import { M, rx, rz, sc3, tr } from '../core/math.js';
  import { flat, mat, paint } from '../render/materials.js';
  import { catenary, cyl, ellipsoid, loft, polyMesh, torus } from '../render/meshes.js';
  import { Kit } from '../render/kit.js';
  import { SANS, addDecal, decalOn, outlinedText } from '../render/decals.js';
  import { CATALOG } from '../world/instances.js';
  import { leafMat, lumpMesh } from './nature.js';
  addDecal('ads1', 0.22, 0.3, (g, w, h) => {
    g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, w, h - 5);
    outlinedText(g, 'ПРОДАМ', 1, 1, 'bold 5px ' + SANS, '#1d1d1f', null, 0);
    g.fillStyle = '#5b5b58'; for (let y = 9; y < h - 9; y += 2) g.fillRect(1, y, w - 2 - ((y * 5) % 4), 1);
    g.fillStyle = '#f2f0e8'; for (let x = 0; x < w; x += 2) g.fillRect(x, h - 5, 1, 5 - ((x * 3) % 3));
  });
  addDecal('ads2', 0.2, 0.26, (g, w, h) => {
    g.fillStyle = '#e8d562'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8352c'; g.fillRect(1, 1, w - 2, 3);
    g.fillStyle = '#3b3a35'; for (let y = 6; y < h - 2; y += 2) g.fillRect(1, y, w - 2 - ((y * 3) % 5), 1);
  });
  addDecal('ads3', 0.18, 0.2, (g, w, h) => {
    g.fillStyle = '#dcd8cc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9a978e'; for (let y = 2; y < h - 2; y += 3) g.fillRect(1, y, w - 3 - ((y * 7) % 4), 1);
  });

  // ---------- concrete utility pole with a street lamp ----------
  function taperBox(w0, w1, h) {
    const a = [[-w0, 0, -w0], [w0, 0, -w0], [w0, 0, w0], [-w0, 0, w0]], b = [[-w1, h, -w1], [w1, h, -w1], [w1, h, w1], [-w1, h, w1]];
    return polyMesh([[a[3], a[2], b[2], b[3]], [a[2], a[1], b[1], b[2]], [a[1], a[0], b[0], b[1]], [a[0], a[3], b[3], b[0]], [b[3], b[2], b[1], b[0]]]);
  }
  function buildPole(o) {
    const k = new Kit(47);
    const conc = mat('#a9a69e', { pat: 33, b: '#98958d', p: [8.6, 0.3, 11, 0], noise: 0.07, grain: 40 });
    k.mesh('poleBody', () => taperBox(0.13, 0.08, 8.6), conc);
    const steel = paint('#6f7478', { spec: 0.4 });
    k.box(steel, [0, 8.05, 0], [0.06, 0.06, 0.75]);
    const ins = mat('#e6e3da', { pat: 23, p: [40, 0, 0, 0], noise: 0.02, spec: 0.5, gloss: 10 });
    const att = [];
    for (const z of [-0.62, 0, 0.62]) { k.mesh('insul', () => cyl(0.035, 0.03, 0.14, 8), ins, tr(0, 8.11, z)); att.push([0, 8.24, z]); }
    k.rod(steel, [0.05, 7.1, 0], [0.75, 7.55, 0], 0.03, 6);
    k.box(mat('#8d9296', { noise: 0.03, spec: 0.4 }), [0.9, 7.52, 0], [0.22, 0.06, 0.12], rz(-0.1));
    k.box(flat('#efe6c0', 3), [0.92, 7.45, 0], [0.16, 0.012, 0.08]);
    k.boxMM(mat('#8a8f93', { pat: 38, b: '#7b4b32', p: [8, 0.85, 0, 0], noise: 0.05 }), 0.12, 1.6, -0.18, 0.28, 2.15, 0.18);
    decalOn(k, 'ads1', [-0.02, 1.62, 0.127], 'z');
    decalOn(k, 'ads2', [0.06, 1.3, 0.128], 'z');
    decalOn(k, 'ads3', [0.288, 1.42, 0.0], 'x');
    // the street lamp: a sodium bulb that lights the ground round the pole at night (see daytime.js)
    return { kit: k, blocks: [{ c: [0, 0], r: 0.22 }], attach: att, lamp: { at: [0.92, 7.4, 0], r: 15, col: [1.0, 0.7, 0.38], k: 2.4, cone: 0.05, kind: 'street', flicker: !!o.flicker } };
  }

  // ---------- bench and litter bin (the same ones as in the first yard) ----------
  function buildBench(o) {
    const k = new Kit(67);
    const wood = mat('#3f6a58', { pat: 37, b: '#355a4a', p: [0.11, 0, 0, 0], noise: 0.1, grain: 45 }), iron = mat('#2c2b30', { noise: 0.04 });
    for (const z of [-0.11, 0, 0.11]) k.box(wood, [0, 0.44, z], [0.72, 0.017, 0.05]);
    k.box(wood, [0, 0.6, -0.205], [0.72, 0.045, 0.014], rx(-0.12));
    k.box(wood, [0, 0.73, -0.222], [0.72, 0.045, 0.014], rx(-0.12));
    for (const x of [-0.6, 0.6]) {
      k.box(iron, [x, 0.215, 0.15], [0.022, 0.215, 0.022]);
      k.box(iron, [x, 0.39, -0.19], [0.022, 0.39, 0.022], rx(-0.06));
      k.box(iron, [x, 0.41, -0.01], [0.022, 0.018, 0.17]);
    }
    const seats = [{ x: -0.28, z: 0.03, yaw: 0, rifle: [0.36, 0.478, 0.0] }, { x: 0.28, z: 0.03, yaw: 0, rifle: [-0.36, 0.478, 0.0] }];
    return { kit: k, blocks: [{ rect: [-0.75, -0.26, 0.75, 0.22] }], seats, spots: seats.map((s) => ({ kind: 'seat', at: [s.x, 0.58], yaw: 0, seat: s })) };
  }
  function buildUrn(o) {
    const k = new Kit(71);
    k.mesh('urn', () => loft([{ a: 0, hu: 0.13, hv: 0.13 }, { a: 0.05, hu: 0.14, hv: 0.14 }, { a: 0.44, hu: 0.17, hv: 0.17 }, { a: 0.48, hu: 0.185, hv: 0.185 }, { a: 0.53, hu: 0.185, hv: 0.185 }], { seg: 14, capAAt: 0, capB: false }), mat('#7b776f', { noise: 0.1, grain: 40 }));
    k.mesh('hole', () => ellipsoid(0.165, 0.004, 0.165, { seg: 14, rings: 4 }), mat('#1d1a18', { noise: 0 }), tr(0, 0.505, 0));
    return { kit: k, blocks: [{ c: [0, 0], r: 0.22 }] };
  }
  // ---------- painted tyres lying in a row as flower pots ----------
  function buildTires(o) {
    const k = new Kit(o.seed || 91), R = k.R, n = o.count || 3;
    const cols = ['#ecebe4', '#3f7fd2', '#e2c34a', '#d9572f'];
    const soil = mat('#4a3a2c', { noise: 0.12, grain: 50 });
    const petals = ['#f0b52a', '#e0672b', '#f4e04a', '#c8352c'].map((c) => Object.assign(mat(c, { noise: 0.06, wind: [0.01, 1 / 0.4, 2, 0.5] }), { noShadow: true, fl: 1 }));
    const leaves = leafMat('#41712e', 0.02, '#8a8a3a', { dens: 14, cut: 0.5, solid: 0.9, wind: [0.01, 1 / 0.4, 1.8, 0.5] });
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.66, z = Math.sin(i * 1.7) * 0.08;
      k.mesh('tyreFlat', () => torus(0.27, 0.1, 18, 6), mat(cols[(i + (o.shift || 0)) % cols.length], { pat: 38, b: '#2a2a2c', p: [11, 0.84, 0, 0], noise: 0.05, grain: 40 }), tr(x, 0.1, z));
      k.mesh('tyreSoil', () => ellipsoid(0.24, 0.03, 0.24, { seg: 12, rings: 4 }), soil, tr(x, 0.15, z));
      k.put(lumpMesh((R() * 8) | 0), M(tr(x, 0.24, z), sc3(0.2, 0.12, 0.2)), leaves, R());
      for (let j = 0; j < 7; j++) { const a = R() * 6.28, r = R() * 0.17; k.mesh('bloom', () => ellipsoid(0.03, 0.022, 0.03, { seg: 6, rings: 4 }), petals[(R() * petals.length) | 0], tr(x + Math.cos(a) * r, 0.3 + R() * 0.06, z + Math.sin(a) * r), R()); }
    }
    return { kit: k, blocks: [{ rect: [-(n * 0.33 + 0.05), -0.4, n * 0.33 + 0.05, 0.4] }] };
  }
  // ---------- curb stone along a line ----------
  function buildCurb(o) {
    const k = new Kit(73);
    const L = o.len;
    k.boxMM(mat('#b9b6ae', { pat: 48, p: [1, 0, 0, 0], noise: 0.07, grain: 40 }), 0, 0, -0.05, L, 0.12, 0.05);
    return { kit: k, blocks: [] };
  }
  // ---------- power lines between attach points (filled in by the map) ----------
  function buildWires(o) {
    const k = new Kit(79);
    const wm = Object.assign(flat('#2b2c2f', 0), { fl: 1, noShadow: true });
    const segs = [];
    for (const [a, b, sag] of o.runs) segs.push(...catenary(a, b, sag, 16));
    k.lines(wm, segs);
    return { kit: k, blocks: [] };
  }

  // ---------- separate curb stones, a little crooked, along local x ----------
  function buildCurbStones(o) {
    const k = new Kit(o.seed || 97), R = k.R;
    const stone = mat('#cfcabe', { pat: 48, p: [1, 0, 0, 0], noise: 0.07, grain: 40 }), dirty = mat('#b6b1a3', { pat: 48, p: [1, 0, 0, 0], noise: 0.09, grain: 40 });
    for (let x = 0; x < o.len - 0.05; x += 1.0) {
      const tilt = (R() - 0.5) * 0.05, lean = (R() - 0.5) * 0.09, dz = (R() - 0.5) * 0.035, sink = R() * 0.045;
      k.box(R() < 0.3 ? dirty : stone, [x + 0.49, 0.075 - sink, dz], [0.485, 0.125, 0.075], M(rz(tilt), rx(lean)));
    }
    return { kit: k, blocks: [] };
  }

  Object.assign(CATALOG, {
    pole: { build: buildPole, name: 'Столб с фонарём', size: '8,6 м', note: 'Траверса с изоляторами, провода считаются по провису.', hug: true },
    bench: { build: buildBench, name: 'Лавочка', size: '1,5 м', note: 'Деревянные рейки на бетонных ножках.', litter: 24 },
    urn: { build: buildUrn, name: 'Урна', size: '0,4 м', note: 'Железная урна на ножке.', litter: 24 },
    tires: { build: buildTires, name: 'Клумба из шин', size: '2 × 0,7 м', note: 'Покрашенные шины с землёй и бархатцами.', hug: true },
    curb: { build: buildCurb, name: 'Бордюр', size: 'по длине', note: '' },
    wires: { build: buildWires, name: 'Провода', size: '', note: '', bounds: false },
    curbstones: { build: buildCurbStones, name: 'Бордюр', size: 'по длине', note: 'Отдельные камни по метру, каждый чуть сдвинут и наклонён.' }
  });
