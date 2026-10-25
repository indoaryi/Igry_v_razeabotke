  // ================= catalog of the first yard: the shed with graffiti and the playground =================
  // Local frame: origin on the ground at the object's anchor, +z is the object's front.
  // Everything else the yards stand on (houses, trees, cars, benches…) comes from the engine's library (engine/src/props).
  // ---------- concrete shed with graffiti ----------
  import { M, add, lerpV, rx, ry, rz, tr } from '../../engine/src/core/math.js';
  import { flat, mat, paint } from '../../engine/src/render/materials.js';
  import { ellipsoid, lineMesh, loft, pyramid, torus } from '../../engine/src/render/meshes.js';
  import { getMesh } from '../../engine/src/render/webgl.js';
  import { Kit } from '../../engine/src/render/kit.js';
  import { decalOn } from '../../engine/src/render/decals.js';
  import { CATALOG } from '../../engine/src/world/instances.js';
  function buildGarage(o) {
    const k = new Kit(19);
    const body = mat('#d6d4cc', { pat: 33, b: '#c6c3ba', p: [2.3, 0.28, 9, 0], noise: 0.05, grain: 40 });
    const roofM = mat('#5c5955', { pat: 34, noise: 0.06, grain: 30 });
    const edge = mat('#a3a097', { noise: 0.06, grain: 40 });
    k.boxMM(body, -2.5, 0, -1.5, 2.5, 2.3, 1.5);
    k.boxMM(mat('#aaa79e', { pat: 33, b: '#94918a', p: [0.25, 0.1, 4, 0], noise: 0.07 }), -2.53, 0, -1.53, 2.53, 0.24, 1.53);
    k.box(roofM, [0, 2.38, 0.03], [2.72, 0.08, 1.76], rx(-0.035));
    k.box(edge, [0, 2.36, 1.79], [2.72, 0.07, 0.025], rx(-0.035));
    decalOn(k, 'grafFront', [0, 1.2, 1.503], 'z');
    decalOn(k, 'grafSide', [2.503, 1.2, 0], 'x');
    const slots = [[-1.05, 2.47, 1.52], [-0.4, 2.47, 1.54], [0.3, 2.47, 1.53], [0.95, 2.47, 1.52]];
    // junk by the walls: an old tyre leaning at the corner, a few bricks, a plank
    k.mesh('tyre', () => torus(0.3, 0.1, 16, 6), mat('#2b2b2d', { noise: 0.08, grain: 50 }), M(tr(2.15, 0.36, 1.66), ry(-0.4), rx(1.35)));
    const brickM = mat('#a0533e', { noise: 0.1, grain: 40 }), plank = mat('#6e5640', { pat: 37, b: '#5a4632', p: [0.1, 0, 0, 0], noise: 0.08, grain: 40 });
    k.box(brickM, [-2.05, 0.035, 1.75], [0.12, 0.035, 0.06], ry(0.3)); k.box(brickM, [-1.85, 0.035, 1.82], [0.12, 0.035, 0.06], ry(-0.5));
    k.box(brickM, [-1.97, 0.1, 1.78], [0.12, 0.035, 0.06], ry(0.1));
    k.box(plank, [2.56, 0.9, -0.6], [0.02, 0.92, 0.09], rz(0.16));
    return { kit: k, blocks: [{ rect: [-2.55, -1.55, 2.55, 1.55] }, { c: [2.15, 1.66], r: 0.28 }], spots: [{ kind: 'front', at: [0, 2.35], yaw: Math.PI }], canSlots: slots };
  }

  // ---------- playground complex: two towers, a bridge, climbing bars ----------
  export const TW = { A: { cx: -1.45, hs: 0.55, deck: 0.9, post: 2.7, roof: 2.62 }, B: { cx: 1.7, hs: 0.6, deck: 1.3, post: 3.72, roof: 3.7 } };
  function buildTowers(o) {
    const k = new Kit(23), R = k.R;
    const green = paint('#3f8f46', { rf: 8 }), yellow = paint('#e3be35', { rf: 8 }), red = paint('#c4463a', { rf: 5, rt: 0.86 }), orange = paint('#e2692b'), blue = paint('#3d6db3');
    const roofM = Object.assign(mat('#c94a3d', { pat: 23, p: [9, 0, 0, 0], noise: 0.05, grain: 50, spec: 0.3, gloss: 12 }), { xr: true, fade: true });
    const wood = mat('#6a4b33', { pat: 37, b: '#5a3f2b', p: [0.1, 0, 0, 0], noise: 0.08, grain: 40 });
    for (const key of ['A', 'B']) {
      const T = TW[key], c = T.cx, h = T.hs;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.rod(green, [c + sx * h, 0, sz * h], [c + sx * h, T.post, sz * h], 0.045, 8);
      k.boxMM(yellow, c - h, T.deck - 0.06, -h, c + h, T.deck, h);
      k.boxMM(red, c - h - 0.08, T.roof - 0.07, -h - 0.08, c + h + 0.08, T.roof, h + 0.08);
      k.mesh('pyr' + key, () => pyramid(h + 0.16, h + 0.16, key === 'A' ? 0.66 : 0.74), roofM, tr(c, T.roof, 0));
      k.mesh('knob', () => ellipsoid(0.05, 0.05, 0.05, { seg: 8, rings: 5 }), roofM, tr(c, T.roof + (key === 'A' ? 0.68 : 0.76), 0));
    }
    // tower A: rails on the front and the left
    const A = TW.A, B = TW.B;
    for (const y of [A.deck + 0.32, A.deck + 0.65]) {
      k.rod(yellow, [A.cx - A.hs, y, A.hs], [A.cx + A.hs, y, A.hs], 0.024, 6);
      k.rod(yellow, [A.cx - A.hs, y, -A.hs], [A.cx - A.hs, y, A.hs], 0.024, 6);
    }
    for (let i = 1; i < 4; i++) k.rod(yellow, [A.cx - A.hs + i * 0.275, A.deck, A.hs], [A.cx - A.hs + i * 0.275, A.deck + 0.65, A.hs], 0.016, 5);
    k.boxMM(wood, A.cx - 0.3, 0, -0.25, A.cx + 0.3, 0.4, 0.25);
    // tower B: arched back panel, slotted side panel, curved orange ladder in front
    k.box(mat('#c4463a', { pat: 45, p: [0.24, 0.14, 0.42, 0], noise: 0.05, grain: 50 }), [B.cx, B.deck + 0.66, -B.hs - 0.02], [B.hs, 0.62, 0.02]);
    k.box(mat('#c4463a', { pat: 44, p: [5.5, B.hs - 0.06, 0.44, 1], noise: 0.05, grain: 50 }), [B.cx + B.hs + 0.02, 0.72, 0], [B.hs, 0.5, 0.02], ry(Math.PI / 2));
    k.rod(yellow, [B.cx + B.hs, B.deck + 0.6, -B.hs], [B.cx + B.hs, B.deck + 0.6, B.hs], 0.024, 6);
    k.box(mat('#c4463a', { pat: 44, p: [5.5, B.hs - 0.06, 0.25, -1], noise: 0.05, grain: 50 }), [B.cx + B.hs + 0.02, B.deck + 0.32, 0], [B.hs, 0.3, 0.02], ry(Math.PI / 2));
    const arc = (t) => [0, t * B.deck, B.hs + 0.42 * Math.sin((1 - t) * Math.PI * 0.5) + 0.02];
    for (const sx of [-0.28, 0.28]) {
      let prev = null;
      for (let i = 0; i <= 5; i++) { const p = arc(i / 5); p[0] = B.cx + sx; if (prev) k.rod(orange, prev, p, 0.026, 6); prev = p; }
      k.rod(orange, [B.cx + sx, B.deck, B.hs + 0.02], [B.cx + sx, B.deck + 0.5, B.hs - 0.02], 0.026, 6);
    }
    for (let i = 1; i <= 4; i++) { const p = arc(i / 5); k.rod(orange, [B.cx - 0.28, p[1], p[2]], [B.cx + 0.28, p[1], p[2]], 0.02, 6); }
    // bridge between the towers
    const bx0 = A.cx + A.hs, bx1 = B.cx - B.hs, by = 1.0;
    for (const z of [-0.42, 0.42]) k.rod(blue, [bx0, by, z], [bx1, by, z], 0.04, 8);
    k.boxMM(mat('#d9b437', { pat: 37, b: '#c49e2c', p: [0.14, 1, 0, 0], noise: 0.06, grain: 40 }), bx0, by - 0.02, -0.4, bx1, by + 0.03, 0.4);
    k.box(mat('#c4463a', { pat: 44, p: [5.0, (bx1 - bx0) / 2 - 0.08, 0.3, -1], noise: 0.05, grain: 50 }), [(bx0 + bx1) / 2, by + 0.38, 0.44], [(bx1 - bx0) / 2, 0.34, 0.02]);
    k.rod(yellow, [bx0, by + 0.65, -0.42], [bx1, by + 0.65, -0.42], 0.024, 6);
    for (let i = 1; i < 4; i++) { const x = bx0 + (bx1 - bx0) * i / 4; k.rod(yellow, [x, by, -0.42], [x, by + 0.65, -0.42], 0.016, 5); }
    // blue climbing bars at the left end
    const cx0 = A.cx - A.hs - 0.95, cx1 = A.cx - A.hs - 0.1;
    for (const x of [cx0, cx1]) for (const z of [-0.36, 0.36]) k.rod(blue, [x, 0, z], [x, 1.75, z], 0.035, 8);
    for (const z of [-0.36, 0.36]) k.rod(blue, [cx0, 1.75, z], [cx1, 1.75, z], 0.035, 8);
    for (let y = 0.35; y < 1.7; y += 0.34) k.rod(blue, [cx0, y, 0.36], [cx1, y, 0.36], 0.022, 6);
    for (let x = cx0 + 0.2; x < cx1; x += 0.22) k.rod(blue, [x, 1.75, -0.36], [x, 1.75, 0.36], 0.018, 5);
    return {
      kit: k,
      blocks: [{ rect: [cx0 - 0.1, -0.7, B.cx + B.hs + 0.1, 0.7] }, { rect: [B.cx - 0.38, 0.6, B.cx + 0.38, 1.1] }],
      spots: [{ kind: 'ladder', at: [B.cx, 1.42], yaw: Math.PI }], deck: [B.cx, B.deck, -0.02]
    };
  }

  // ---------- A-frame swing (with a seat) or a bare frame (used as a pull-up bar) ----------
  export const SW = { BAR: 2.3, CH: 1.72, HALF: 1.2, SPL: 0.78, PIV: 0.22 };
  export const SWING_W = Math.sqrt(9.8 / SW.CH);      // how fast a swing swings: the pendulum of its chains
  // a line one metre down from its origin, stretched into the swing chains and the pigeons' legs
  export const UNIT_LINE = () => getMesh('unitLine', () => lineMesh([[[0, 0, 0], [0, -1, 0]]]));
  function buildSwing(o) {
    const k = new Kit(o.seed || 29);
    const pm = paint(o.color || '#4f8a46', { rt: 0.86 });
    const bar = o.bar || SW.BAR, half = o.half || SW.HALF, spl = o.spl || SW.SPL;
    const stub = mat('#a19d94', { noise: 0.08, grain: 40 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        k.rod(pm, [sx * half, bar, 0], [sx * (half + 0.1), 0, sz * spl], 0.04, 8);
        k.boxMM(stub, sx * (half + 0.1) - 0.08, 0, sz * spl - 0.08, sx * (half + 0.1) + 0.08, 0.06, sz * spl + 0.08);
      }
      k.rod(pm, [sx * half, bar * 0.36, -spl * 0.64], [sx * half, bar * 0.36, spl * 0.64], 0.03, 6);
    }
    k.rod(mat('#7d8286', { noise: 0.03, spec: 0.5, gloss: 16 }), [-half - 0.08, bar, 0], [half + 0.08, bar, 0], 0.042, 8);
    const chainM = Object.assign(flat('#4a4c50', 1), { fl: 1, noShadow: true });
    if (!o.seat && !o.plain) k.lines(chainM, [[[-SW.PIV, bar, 0], [-SW.PIV - 0.02, bar - 0.42, 0.02]], [[SW.PIV, bar, 0], [SW.PIV, bar - 0.28, 0]], [[0.6, bar, 0], [0.62, bar - 0.2, 0.01]]]);
    const blocks = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) blocks.push({ c: [sx * (half + 0.1), sz * spl], r: 0.12 });
    for (const sx of [-1, 1]) blocks.push({ rect: [sx * (half + 0.1) - 0.08, -spl, sx * (half + 0.1) + 0.08, spl] });
    if (o.seat) blocks.push({ rect: [-0.4, -0.28, 0.4, 0.28] });
    return { kit: k, blocks, spots: [{ kind: o.seat ? 'swing' : 'bar', at: o.seat ? [0, 0.78] : [0, 0.05], yaw: 0 }], bar };
  }
  // ---------- pull-up bar next to the shed: a yellow A-frame and a red post ----------
  function buildPullbar(o) {
    const k = new Kit(31);
    const yellow = paint('#d9b23b', { rt: 0.84 }), red = paint('#b8402f', { rt: 0.84 }), steel = mat('#8a8f93', { noise: 0.03, spec: 0.6, gloss: 16 });
    const BAR = 2.25;
    for (const sz of [-1, 1]) k.rod(yellow, [-1.15, BAR + 0.05, 0], [-1.3, 0, sz * 0.7], 0.045, 8);
    k.rod(yellow, [-1.3, 0.9, -0.45], [-1.3, 0.9, 0.45], 0.03, 6);
    k.rod(red, [1.15, 0, 0], [1.15, BAR + 0.12, 0], 0.05, 8);
    k.rod(steel, [-1.2, BAR, 0], [1.18, BAR, 0], 0.022, 8);
    return { kit: k, blocks: [{ rect: [-1.4, -0.75, -1.2, 0.75] }, { c: [1.15, 0], r: 0.1 }], spots: [{ kind: 'bar', at: [0, 0.05], yaw: 0 }], bar: BAR };
  }
  // ---------- metal slide ----------
  export const SL = { top: 1.25, z0: -0.55, z1: 1.55, run: 2.0, low: 0.3, lad0: -1.8, lad1: -1.02 };
  function buildSlide(o) {
    const k = new Kit(37);
    const fm = paint('#5c9358'), steel = mat('#b8bdc1', { noise: 0.03, spec: 0.7, gloss: 14 });
    const chuteM = mat('#8d5b3e', { pat: 38, b: '#6c432c', p: [5, 0.8, 0, 0], noise: 0.05, grain: 40, spec: 0.55, gloss: 12 });
    for (const x of [-0.24, 0.24]) {
      k.rod(fm, [x, 0, SL.lad0], [x, SL.top, SL.lad1], 0.03, 7);
      k.rod(fm, [x, SL.top, SL.lad1], [x, SL.top + 0.62, SL.lad1 + 0.05], 0.03, 7);
      k.rod(fm, [x, SL.top + 0.62, SL.lad1 + 0.05], [x, SL.top + 0.58, SL.z0 + 0.05], 0.03, 7);
      k.rod(fm, [x, SL.top + 0.58, SL.z0 + 0.05], [x, SL.top + 0.05, SL.z0 + 0.12], 0.03, 7);
      k.rod(fm, [x, 0, SL.z0 - 0.05], [x, SL.top - 0.04, SL.z0 - 0.05], 0.03, 7);
      k.rod(fm, [x, 0, SL.z1 + 0.25], [x, SL.low - 0.02, SL.z1 + 0.25], 0.028, 7);
    }
    for (let i = 1; i <= 5; i++) { const t = i / 6; const p = lerpV([0, 0, SL.lad0], [0, SL.top, SL.lad1], t); k.rod(steel, [-0.24, p[1], p[2]], [0.24, p[1], p[2]], 0.02, 6); }
    k.boxMM(steel, -0.26, SL.top - 0.05, SL.lad1, 0.26, SL.top, SL.z0);
    const L = Math.hypot(SL.top - SL.low, SL.z1 - SL.z0), ang = Math.atan2(SL.top - SL.low, SL.z1 - SL.z0);
    const mid = [0, (SL.top + SL.low) / 2, (SL.z0 + SL.z1) / 2];
    k.box(chuteM, mid, [0.25, 0.025, L / 2], rx(ang));
    for (const x of [-0.27, 0.27]) k.box(steel, add(mid, [x, 0.06, 0]), [0.02, 0.07, L / 2], rx(ang));
    k.boxMM(chuteM, -0.25, SL.low - 0.05, SL.z1 - 0.02, 0.25, SL.low, SL.run);
    for (const x of [-0.27, 0.27]) k.boxMM(steel, x - 0.02, SL.low - 0.05, SL.z1 - 0.02, x + 0.02, SL.low + 0.09, SL.run);
    return {
      kit: k, blocks: [{ rect: [-0.34, SL.lad0 - 0.05, 0.34, SL.run + 0.02] }],
      spots: [{ kind: 'ladder', at: [0, SL.lad0 - 0.38], yaw: 0 }], ang
    };
  }
  // ---------- long low wooden platform (people sit on it) ----------
  function buildPlatform(o) {
    const k = new Kit(41);
    const wood = mat('#8c8982', { pat: 37, b: '#727069', p: [0.12, 0, 0, 0], noise: 0.08, grain: 45 });
    const legM = paint('#7c3a2b', { rt: 0.85 });
    k.boxMM(wood, -1.5, 0.38, -0.36, 1.5, 0.45, 0.36);
    for (const x of [-1.3, 0, 1.3]) {
      for (const z of [-0.26, 0.26]) k.boxMM(legM, x - 0.035, 0, z - 0.035, x + 0.035, 0.38, z + 0.035);
      k.boxMM(legM, x - 0.03, 0.3, -0.3, x + 0.03, 0.36, 0.3);
    }
    const seats = [{ x: -0.72, z: 0.17, yaw: 0, rifle: [-0.05, 0.47, 0.0] }, { x: 0.74, z: 0.17, yaw: 0, rifle: [1.38, 0.47, 0.0] }];
    return { kit: k, blocks: [{ rect: [-1.55, -0.4, 1.55, 0.4] }], seats, spots: seats.map((s) => ({ kind: 'seat', at: [s.x, 0.78], yaw: 0, seat: s })) };
  }
  // ---------- basketball backboard on a pole ----------
  const HOOP = { rimY: 3.05, rimZ: 0.86, boardZ: 0.58 };
  function buildHoop(o) {
    const k = new Kit(43);
    const pole = paint('#4b6e8d', { rt: 0.88 });
    k.rod(pole, [0, 0, 0], [0, 3.05, 0], 0.055, 8);
    k.rod(pole, [0, 2.9, 0], [0, 3.15, HOOP.boardZ - 0.02], 0.035, 6);
    k.boxMM(mat('#f1f0ea', { pat: 38, b: '#d9d6cc', p: [6, 0.92, 0, 0], noise: 0.03, grain: 40 }), -0.6, 2.9, HOOP.boardZ - 0.04, 0.6, 3.8, HOOP.boardZ);
    decalOn(k, 'board', [0, 3.35, HOOP.boardZ + 0.002], 'z');
    const rimM = mat('#e2602a', { noise: 0.03, spec: 0.5, gloss: 12 });
    k.mesh('rim', () => torus(0.23, 0.013, 20, 5), rimM, tr(0, HOOP.rimY, HOOP.rimZ));
    k.boxMM(rimM, -0.05, HOOP.rimY - 0.04, HOOP.boardZ, 0.05, HOOP.rimY, HOOP.rimZ - 0.22);
    const net = Object.assign(mat('#f2f2ee', { pat: 46, p: [3.2, 7, 0, 0], noise: 0 }), { fl: 1, noShadow: true });
    k.mesh('net', () => loft([{ a: -0.42, hu: 0.15, hv: 0.15 }, { a: 0, hu: 0.225, hv: 0.225 }], { seg: 14, capA: false, capB: false }), net, tr(0, HOOP.rimY, HOOP.rimZ));
    k.boxMM(mat('#a39f96', { noise: 0.08 }), -0.15, 0, -0.15, 0.15, 0.06, 0.15);
    return { kit: k, blocks: [{ c: [0, 0], r: 0.16 }], spots: [{ kind: 'throw', at: [0, 3.25], yaw: Math.PI }], rim: [0, HOOP.rimY, HOOP.rimZ] };
  }

  Object.assign(CATALOG, {
    garage: { build: buildGarage, name: 'Сарай с граффити', size: '5 × 3 м', note: 'Рисунки — отдельные наклейки поверх стены. На крыше банки.', xray: true, hug: true, litter: 24 },
    towers: { build: buildTowers, name: 'Игровой комплекс', size: '6 × 1,4 м, 4 м', note: 'Две башни, мостик, дуга-лестница и шведская стенка.', hug: true },
    swing: { build: buildSwing, name: 'Качели', size: '2,6 × 1,6 м', note: 'Каркас, перекладина и сиденье на цепях. Без сиденья — турник.', litter: 6 },
    pullbar: { build: buildPullbar, name: 'Турник', size: '2,6 м', note: 'Жёлтая рама и красный столб, как у сарая на фото.' },
    slide: { build: buildSlide, name: 'Горка', size: '0,7 × 3,8 м', note: 'Лестница, площадка и желоб под углом.' },
    platform: { build: buildPlatform, name: 'Помост', size: '3 × 0,7 м', note: 'Длинная низкая доска на ножках, на ней сидят.', litter: 24 },
    hoop: { build: buildHoop, name: 'Баскетбольный щит', size: '3,8 м', note: 'Щит, кольцо и сетка на столбе.' }
  });
  // the bench and the bin came over from the old pixel yard
  CATALOG.bench.note = 'Та самая лавочка из первого двора.';
  CATALOG.urn.note = 'Тоже из первого двора.';
