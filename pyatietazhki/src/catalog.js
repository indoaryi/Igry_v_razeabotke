  // ================= catalog: every yard object is built here once, in its own local frame =================
  // Local frame: origin on the ground at the object's anchor, +z is the object's front.
  const paint = (hex, o = {}) => mat(hex, { pat: 38, b: o.rustCol || '#7c4c33', p: [o.rf || 6, o.rt ?? 0.9, 0, 0], noise: 0.05, grain: 60, spec: o.spec ?? 0.35, gloss: 14 });
  const flat = (hex, idx) => mat(hex, { pat: 10, p: [idx, 0, 0, 0] });
  const leafMat = (hex, aut, autHex, o = {}) => Object.assign(mat(hex, { pat: 35, b: autHex, p: [aut, o.cell || 15, o.cut || 0.3, 0], noise: 0.05, grain: 30 }), { fade: true, fl: 4 });
  const grassMat = (hex, dryHex, h, dry) => Object.assign(mat(hex, { pat: 36, b: dryHex, p: [h, 1, dry, 0], noise: 0 }), { fl: 1, noShadow: true });
  const decalCache = new Map();
  const decal = (name) => { let m = decalCache.get(name); if (!m) { m = Object.assign(decalMat(name), { noShadow: true }); decalCache.set(name, m); } return m; };
  // put a decal plate centred at c (local), facing direction f: 'z' (+z), 'x' (+x), '-x'
  function decalOn(k, name, c, f) {
    const d = DECALS[name], h = [d.w / 2, d.h / 2, 0.003];
    const rot = f === 'x' ? ry(Math.PI / 2) : f === '-x' ? ry(-Math.PI / 2) : f === '-z' ? ry(Math.PI) : null;
    k.box(decal(name), c, h, rot, 0);
  }

  // ---------- five-storey brick block ----------
  function buildBlock5(o) {
    const k = new Kit(o.seed || 7), R = k.R;
    const L = o.len, Dp = o.depth || 12, F = 5, FH = 2.8, BASE = 0.75, H = BASE + F * FH + 0.2;
    const nb = Math.round(L / 3.1), bw = L / nb;
    const brick = mat(o.brick, { pat: 30, b: o.brick2, p: [0.1512, 0.52, 0.1, 0.86], noise: 0.03, grain: 40 });
    const baseM = mat(o.base || '#9a948a', { pat: 33, b: '#8a847a', p: [BASE, 0.2, 3, 0], noise: 0.08, grain: 45 });
    const conc = mat('#b7b3a9', { pat: 48, p: [1, 0, 0, 0], noise: 0.07, grain: 40 });
    const slabM = mat('#c4c0b7', { noise: 0.05, grain: 40 });
    const roofM = mat('#5d5a56', { pat: 34, noise: 0.06, grain: 30 });
    const parM = mat('#aca89f', { noise: 0.06, grain: 40 });
    const sill = mat('#a9aeb1', { noise: 0.03, spec: 0.4, gloss: 16 });
    const pipe = mat('#8f9599', { pat: 23, p: [1.2, 0, 0, 0], noise: 0.03, spec: 0.4, gloss: 16 });
    const fr = o.frame || '#eceae4';
    const winA = mat('#4b6680', { pat: 43, b: fr, p: [2, 0.055, 0.75, 0.725], r: [0.022, 0, 0, 0], noise: 0 });
    const winB = mat('#4b6680', { pat: 43, b: fr, p: [3, 0.055, 1.05, 0.725], r: [0.022, 0, 0, 0], noise: 0 });
    const winS = mat('#4b6680', { pat: 43, b: fr, p: [2, 0.05, 0.5, 0.6], r: [0.022, 0, 0, 0], noise: 0 });
    const glazF = mat('#56718c', { pat: 43, b: fr, p: [4, 0.05, 1.27, 0.76], r: [0.012, 0, 0, 0], noise: 0 });
    const glazS = mat('#56718c', { pat: 43, b: fr, p: [2, 0.05, 0.56, 0.76], r: [0.012, 0, 0, 0], noise: 0 });
    const panel = mat(o.panel, { pat: 38, b: o.panel2 || '#7c4c33', p: [5, 0.93, 0, 0], noise: 0.05, grain: 50 });
    const doorM = mat(o.door || '#5a4434', { pat: 38, b: '#7b4b32', p: [7, 0.88, 0, 0], noise: 0.05, grain: 60, spec: 0.3, gloss: 12 });
    const darkM = mat('#3a3633', { noise: 0.04 });
    const acM = mat('#e4e3de', { pat: 12, p: [0.1, 34, 0, 0], noise: 0.03 });
    const dishM = mat('#d9d9d4', { noise: 0.02, spec: 0.4, gloss: 10 });
    const lampM = mat('#d8d2b8', { noise: 0.02 });
    const railM = flat('#3b3d40', 1);
    // body, plinth, roof
    k.boxMM(brick, 0, 0, -Dp, L, H, 0);
    k.boxMM(baseM, -0.05, 0, -Dp - 0.05, L + 0.05, BASE, 0.06);
    k.boxMM(roofM, 0.2, H, -Dp + 0.2, L - 0.2, H + 0.22, -0.2);
    k.boxMM(parM, -0.04, H, -0.26, L + 0.04, H + 0.6, 0.04);
    k.boxMM(parM, -0.04, H, -Dp - 0.04, L + 0.04, H + 0.6, -Dp + 0.22);
    k.boxMM(parM, -0.04, H, -Dp, 0.24, H + 0.6, 0);
    k.boxMM(parM, L - 0.24, H, -Dp, L + 0.04, H + 0.6, 0);
    const rail = [];
    for (let x = 0.2; x <= L - 0.1; x += 1.6) rail.push([[x, H + 0.6, -0.1], [x, H + 1.35, -0.1]]);
    rail.push([[0.2, H + 1.35, -0.1], [L - 0.2, H + 1.35, -0.1]], [[0.2, H + 1.0, -0.1], [L - 0.2, H + 1.0, -0.1]]);
    k.lines(railM, rail);
    for (let i = 1; i < nb; i += 2) k.boxMM(brick, i * bw - 0.45, H, -Dp * 0.55, i * bw + 0.45, H + 1.15, -Dp * 0.55 + 0.7);
    const ant = [];
    for (const x of [bw * 1.5, L - bw * 2]) { ant.push([[x, H + 0.2, -Dp * 0.4], [x, H + 3.0, -Dp * 0.4]], [[x - 0.6, H + 2.6, -Dp * 0.4], [x + 0.6, H + 2.6, -Dp * 0.4]], [[x - 0.4, H + 2.2, -Dp * 0.4], [x + 0.4, H + 2.2, -Dp * 0.4]]); }
    k.lines(railM, ant);
    // drainpipes
    for (const x of [0.32, L - 0.32]) {
      k.rod(pipe, [x, 0.3, 0.15], [x, H + 0.1, 0.15], 0.065, 8);
      k.boxMM(pipe, x - 0.08, 0.12, 0.08, x + 0.08, 0.3, 0.32);
    }
    // house number plates on both ends
    decalOn(k, 'houseNo', [-0.006, 3.4, -1.2], '-x');
    decalOn(k, 'houseNo', [L + 0.006, 3.4, -1.2], 'x');
    const spots = [], heights = [], blocks = [{ rect: [0, -Dp, L, 0.05] }];
    const window_ = (xc, yF, wide) => {
      const w = wide ? winB : winA, hw = wide ? 1.05 : 0.75, yc = yF + 0.85 + 0.725;
      k.box(w, [xc, yc, 0.025], [hw, 0.725, 0.025], null, R());
      k.boxMM(sill, xc - hw - 0.05, yF + 0.8, 0, xc + hw + 0.05, yF + 0.85, 0.13);
      const r = R();
      if (r < 0.1) k.boxMM(acM, xc + hw + 0.18, yc - 0.05, 0, xc + hw + 0.9, yc + 0.45, 0.3);
      else if (r < 0.15) k.mesh('dish', () => ellipsoid(0.3, 0.3, 0.08, { seg: 12, rings: 5, half: true }), dishM, M(tr(xc - hw - 0.35, yc + 0.35, 0.12), rx(-1.1)), 0);
    };
    const loggia = (xc, yF, top, f) => {
      const x0 = xc - 1.3, x1 = xc + 1.3, D = 1.15;
      k.boxMM(slabM, x0 - 0.03, yF - 0.12, 0, x1 + 0.03, yF, D + 0.04);
      const pm = (R() < 0.55) ? panel : brick;
      k.boxMM(pm, x0, yF, D - 0.07, x1, yF + 1.0, D);
      k.boxMM(pm, x0, yF, 0, x0 + 0.07, yF + 1.0, D - 0.07);
      k.boxMM(pm, x1 - 0.07, yF, 0, x1, yF + 1.0, D - 0.07);
      if (R() < 0.8) {
        k.box(glazF, [xc, yF + 1.76, D - 0.035], [1.27, 0.76, 0.015], null, R());
        k.box(glazS, [x0 + 0.035, yF + 1.76, D / 2], [0.56, 0.76, 0.015], ry(-Math.PI / 2), R());
        k.box(glazS, [x1 - 0.035, yF + 1.76, D / 2], [0.56, 0.76, 0.015], ry(Math.PI / 2), R());
      } else {
        k.boxMM(sill, x0, yF + 1.0, D - 0.1, x1, yF + 1.05, D + 0.01);
        k.box(winA, [xc - 0.45, yF + 1.57, 0.025], [0.75, 0.725, 0.025], null, R());
        k.lines(railM, [[[x0 + 0.1, yF + 2.1, D - 0.4], [x1 - 0.1, yF + 2.1, D - 0.4]]]);
      }
      if (top) k.boxMM(slabM, x0 - 0.03, yF + 2.6, 0, x1 + 0.03, yF + 2.72, D + 0.04);
    };
    const children = [];
    for (let i = 0; i < nb; i++) {
      const xc = (i + 0.5) * bw;
      const en = (o.entr || []).indexOf(i);
      if (en >= 0) { children.push({ type: 'entrance', local: [xc, 0], idx: en, n: 11, frame: fr, door: o.door }); continue; }
      const balc = (o.balc || []).includes(i);
      for (let f = 0; f < F; f++) {
        const yF = BASE + f * FH;
        if (balc && f >= 1) loggia(xc, yF, f === F - 1, f);
        else window_(xc, yF, i % 2 === 0);
      }
    }
    return { kit: k, blocks, heights, spots, children, top: H + 1.4 };
  }

  // ---------- entrance: porch with a step, metal door, canopy, intercom, stairwell windows ----------
  function buildEntrance(o) {
    const k = new Kit(83 + (o.idx || 0)), R = k.R;
    const conc = mat('#b7b3a9', { pat: 48, p: [1, 0, 0, 0], noise: 0.07, grain: 40 });
    const slabM = mat('#c4c0b7', { noise: 0.05, grain: 40 });
    const sill = mat('#a9aeb1', { noise: 0.03, spec: 0.4, gloss: 16 });
    const doorM = mat(o.door || '#5a4434', { pat: 38, b: '#7b4b32', p: [7, 0.88, 0, 0], noise: 0.05, grain: 60, spec: 0.3, gloss: 12 });
    const darkM = mat('#3a3633', { noise: 0.04 });
    const lampM = mat('#d8d2b8', { noise: 0.02 });
    const winS = mat('#4b6680', { pat: 43, b: o.frame || '#eceae4', p: [2, 0.05, 0.5, 0.6], r: [0.022, 0, 0, 0], noise: 0 });
    k.boxMM(conc, -1.25, 0, 0, 1.25, 0.3, 1.45);
    k.boxMM(conc, -1.25, 0, 1.45, 1.25, 0.15, 1.8);
    k.boxMM(darkM, -0.63, 0.3, 0, 0.63, 2.43, 0.035);
    k.boxMM(doorM, -0.55, 0.3, 0, 0.55, 2.35, 0.07);
    k.boxMM(sill, 0.33, 1.22, 0.07, 0.42, 1.28, 0.11);
    decalOn(k, 'intercom', [0.85, 1.45, 0.006], 'z');
    decalOn(k, 'notice', [-0.18, 1.62, 0.074], 'z');
    decalOn(k, o.idx === 1 ? 'plate2' : 'plate1', [0, 2.6, 0.006], 'z');
    k.boxMM(slabM, -1.38, 2.78, 0, 1.38, 2.92, 1.6);
    k.boxMM(lampM, -0.12, 2.66, 0.45, 0.12, 2.78, 0.66);
    for (let f = 0; f < 4; f++) k.box(winS, [0, 0.75 + f * 2.8 + 2.95, 0.025], [0.5, 0.6, 0.025], null, R());
    return {
      kit: k, blocks: [],
      heights: [{ rect: [-1.25, 0, 1.25, 1.45], y: 0.3 }, { rect: [-1.25, 1.45, 1.25, 1.8], y: 0.15 }],
      spots: [{ kind: 'door', at: [0.5, 0.95], yaw: Math.PI, wall: [0.85, 1.45, 0] }]
    };
  }

  // ---------- transformer substation ----------
  function buildSubstation(o) {
    const k = new Kit(17);
    const pl = mat('#e8e6df', { pat: 33, b: '#d7d4cb', p: [2.9, 0.45, 5, 0], noise: 0.04, grain: 40 });
    const pl2 = mat('#e8e6df', { pat: 33, b: '#d7d4cb', p: [3.4, 0.45, 6, 0], noise: 0.04, grain: 40 });
    const plinth = mat('#a6a298', { pat: 33, b: '#8f8b82', p: [0.35, 0.14, 7, 0], noise: 0.08, grain: 45 });
    const roofM = mat('#6c6965', { pat: 34, noise: 0.06, grain: 30 });
    const trim = mat('#8f9396', { noise: 0.05, spec: 0.3, gloss: 14 });
    const steel = paint('#7c8186', { spec: 0.5 });
    k.boxMM(pl, -3, 0, -2, 1, 2.9, 2);
    k.boxMM(pl2, 1, 0, -2, 3, 3.4, 2);
    k.boxMM(plinth, -3.04, 0, -2.04, 3.04, 0.35, 2.04);
    k.boxMM(roofM, -3.12, 2.9, -2.12, 1.02, 3.04, 2.12);
    k.boxMM(roofM, 0.98, 3.4, -2.12, 3.12, 3.54, 2.12);
    k.boxMM(trim, -3.13, 2.86, 2.08, 1.02, 2.9, 2.13);
    k.boxMM(trim, 0.98, 3.36, 2.08, 3.13, 3.4, 2.13);
    const lv = mat('#666b6e', { pat: 32, b: '#8f9396', p: [13, 0.05, 0.36, 0.52], noise: 0.03 });
    for (const x of [1.5, 2.5]) for (const y of [1.25, 2.6]) k.box(lv, [x, y, 2.025], [0.36, 0.52, 0.025]);
    for (const z of [-0.9, 0.9]) k.box(lv, [3.025, 1.6, z], [0.36, 0.52, 0.025], ry(Math.PI / 2));
    const lvS = mat('#666b6e', { pat: 32, b: '#8f9396', p: [16, 0.04, 0.22, 0.16], noise: 0.03 });
    k.box(lvS, [-2.35, 2.45, 2.02], [0.22, 0.16, 0.02]);
    const door = mat('#6b7a85', { pat: 38, b: '#7d5236', p: [6, 0.9, 0, 0], noise: 0.05, grain: 50, spec: 0.3, gloss: 12 });
    k.boxMM(mat('#3d3f42', { noise: 0.03 }), -2.06, 0.35, 1.99, -0.54, 2.5, 2.035);
    k.boxMM(door, -2.0, 0.35, 2.0, -0.6, 2.45, 2.06);
    k.boxMM(mat('#3d3f42', { noise: 0.03 }), -1.31, 0.35, 2.06, -1.29, 2.45, 2.064);
    for (const x of [-1.42, -1.18]) k.boxMM(trim, x - 0.025, 1.3, 2.06, x + 0.025, 1.45, 2.09);
    decalOn(k, 'hazard', [-0.95, 1.85, 2.064], 'z');
    decalOn(k, 'danger', [-1.66, 1.75, 2.064], 'z');
    decalOn(k, 'stencil', [-1.3, 2.66, 2.004], 'z');
    decalOn(k, 'tagSub', [-0.1, 0.85, 2.004], 'z');
    k.rod(steel, [0.72, 0.35, 2.06], [0.72, 2.86, 2.06], 0.035, 8);
    // roof bracket with insulators where the wires arrive
    k.rod(steel, [2.2, 3.54, 0], [2.2, 4.35, 0], 0.035, 8);
    k.rod(steel, [2.2, 4.35, -0.6], [2.2, 4.35, 0.6], 0.03, 6);
    const ins = mat('#e6e3da', { pat: 23, p: [40, 0, 0, 0], noise: 0.02, spec: 0.5, gloss: 10 });
    const att = [];
    for (const z of [-0.5, 0, 0.5]) { k.mesh('insul', () => cyl(0.035, 0.03, 0.14, 8), ins, tr(2.2, 4.37, z)); att.push([2.2, 4.5, z]); }
    return { kit: k, blocks: [{ rect: [-3.1, -2.1, 3.1, 2.1] }], spots: [{ kind: 'door', at: [-1.3, 2.75], yaw: Math.PI, wall: [-1.3, 1.4, 2.0] }], attach: att };
  }

  // ---------- concrete shed with graffiti ----------
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
    return { kit: k, blocks: [{ rect: [-2.55, -1.55, 2.55, 1.55] }], spots: [{ kind: 'front', at: [0, 2.35], yaw: Math.PI }], canSlots: slots };
  }

  // ---------- playground complex: two towers, a bridge, climbing bars ----------
  const TW = { A: { cx: -1.45, hs: 0.55, deck: 0.9, post: 2.7, roof: 2.62 }, B: { cx: 1.7, hs: 0.6, deck: 1.3, post: 3.72, roof: 3.7 } };
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
  const SW = { BAR: 2.3, CH: 1.72, HALF: 1.2, SPL: 0.78, PIV: 0.22 };
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
  const SL = { top: 1.25, z0: -0.55, z1: 1.55, run: 2.0, low: 0.3, lad0: -1.8, lad1: -1.02 };
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
    return { kit: k, blocks: [{ c: [0, 0], r: 0.22 }], attach: att };
  }

  // ---------- trees, bushes, tall grass ----------
  const TREE = {
    ash: { h: 8.6, trunk: 3.0, r0: 0.21, cr: 3.0, ch: 4.4, blobs: 34, br: 1.0, nb: 5, leaf: '#3f6b2d', aut: '#b9a83b', af: 0.12, bark: '#6c625a' },
    maple: { h: 6.6, trunk: 2.3, r0: 0.17, cr: 2.4, ch: 3.6, blobs: 26, br: 0.82, nb: 4, leaf: '#4b7f30', aut: '#d38a2c', af: 0.2, bark: '#6a5f55' },
    birch: { h: 8.2, trunk: 2.8, r0: 0.14, cr: 1.9, ch: 4.6, blobs: 26, br: 0.72, nb: 4, leaf: '#5d8c36', aut: '#d2b443', af: 0.22, bark: '#e3e0d8', birch: true },
    poplar: { h: 10, trunk: 2.6, r0: 0.23, cr: 2.1, ch: 6.6, blobs: 36, br: 0.85, nb: 5, leaf: '#47722f', aut: '#c8b23e', af: 0.22, bark: '#6f675e' },
    young: { h: 4.2, trunk: 1.6, r0: 0.08, cr: 1.4, ch: 2.2, blobs: 14, br: 0.58, nb: 3, leaf: '#5a9136', aut: '#cfa23a', af: 0.12, bark: '#6d6259' },
    bare: { h: 6.4, trunk: 2.1, r0: 0.15, bark: '#7a6e64' }
  };
  function buildTree(o) {
    const P = TREE[o.kind || 'ash'], k = new Kit(o.seed || 53), R = k.R;
    const s = (o.h || P.h) / P.h;
    const barkM = P.birch ? mat(P.bark, { pat: 42, b: '#3b3836', noise: 0.05, grain: 40 }) : mat(P.bark, { noise: 0.14, grain: 30 });
    const trunkH = P.trunk * s, r0 = P.r0 * s, r1 = r0 * 0.6;
    const lean = [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5];
    const rings = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5, r = lerp(r0 * (i === 0 ? 1.45 : 1.1), r1, Math.pow(t, 0.7));
      rings.push({ a: t * trunkH, hu: r, hv: r, cu: lean[0] * t * t * 0.4, cv: lean[1] * t * t * 0.4 });
    }
    k.mesh('trunk' + (o.seed || 53) + ',' + s.toFixed(2) + (o.kind || 'ash'), () => loft(rings, { seg: 8, capAAt: 0, capBAt: trunkH }), barkM);
    const top = [lean[0] * 0.4, trunkH, lean[1] * 0.4];
    if (o.kind === 'bare') {
      const branch = (p, dir, L, r, depth) => {
        const q = add(p, scl(dir, L));
        k.rod(barkM, p, q, Math.max(r, 0.024), 5);
        if (depth === 0) return;
        const n = depth > 1 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const nd = nrm(add(dir, [(R() - 0.5) * 1.3, 0.25 + R() * 0.45, (R() - 0.5) * 1.3]));
          branch(q, nd, L * (0.6 + R() * 0.16), r * 0.62, depth - 1);
        }
      };
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + R();
        branch(add(top, [0, -0.3 * i, 0]), nrm([Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6]), 1.7 * s, r1 * 0.8, 3);
      }
      return { kit: k, blocks: [{ c: [0, 0], r: r0 + 0.08 }], top: P.h * s };
    }
    const CR = P.cr * s, CH = P.ch * s, cc = [top[0], trunkH + CH * 0.42, top[2]];
    for (let i = 0; i < P.nb; i++) {
      const a = (i / P.nb) * Math.PI * 2 + R() * 0.8;
      const from = [top[0] * 0.8, trunkH * (0.72 + R() * 0.25), top[2] * 0.8];
      const to = add(cc, [Math.cos(a) * CR * 0.62, (R() - 0.35) * CH * 0.45, Math.sin(a) * CR * 0.62]);
      k.rod(barkM, from, to, r1 * 0.55, 6);
    }
    const leaf = leafMat(P.leaf, P.af, P.aut);
    for (let i = 0; i < P.blobs; i++) {
      let d; do { d = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]; } while (dot(d, d) > 1);
      const pos = add(cc, [d[0] * CR * 0.6, d[1] * CH * 0.36, d[2] * CR * 0.6]);
      const br = Math.round(P.br * s * (0.65 + R() * 0.7) * 20) / 20;
      k.mesh('blob' + br, () => ellipsoid(br, br * 0.8, br, { seg: 11, rings: 7 }), leaf, M(tr(pos[0], pos[1], pos[2]), ry(R() * 3)), R());
    }
    return { kit: k, blocks: [{ c: [0, 0], r: r0 + 0.08 }], top: cc[1] + CH * 0.6 };
  }
  function buildBush(o) {
    const k = new Kit(o.seed || 59), R = k.R, sz = o.size || 1;
    const leaf = leafMat(o.leaf || '#44732f', o.af ?? 0, o.aut || '#b9a83b', { cell: 16 });
    const n = Math.round(4 + sz * 3);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, r = R() * 0.55 * sz;
      const br = Math.round((0.42 + R() * 0.3) * sz * 20) / 20;
      k.mesh('blob' + br, () => ellipsoid(br, br * 0.84, br, { seg: 11, rings: 7 }), leaf, tr(Math.cos(a) * r, br * 0.8 + R() * 0.2 * sz, Math.sin(a) * r), R());
    }
    return { kit: k, blocks: [{ c: [0, 0], r: 0.7 * sz }] };
  }
  function buildGrass(o) {
    const k = new Kit(o.seed || 61), R = k.R;
    const H = o.h || 1.0;
    const gm = grassMat(o.col || '#6a9532', o.dryCol || '#c3aa5b', H, o.dry ?? 0.35);
    const n = Math.round(Math.PI * o.rx * o.rz * 8);
    for (let i = 0; i < n; i++) {
      let x, z; do { x = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + z * z > 1);
      const e = Math.sqrt(x * x + z * z);
      const h = Math.round(H * (0.5 + 0.5 * R()) * (1 - 0.4 * e) * 20) / 20, rb = Math.round((0.16 + R() * 0.14) * 50) / 50;
      k.mesh('tuft' + h + ',' + rb, () => loft([{ a: 0, hu: rb, hv: rb }, { a: h * 0.5, hu: rb * 0.8, hv: rb * 0.8 }, { a: h, hu: 0.03, hv: 0.03 }], { seg: 7, capAAt: 0, capBAt: h }), gm, M(tr(x * o.rx, 0, z * o.rz), rz((R() - 0.5) * 0.25)), R());
    }
    const stalk = Object.assign(mat('#6f7a3c', { noise: 0.04 }), { noShadow: true, fl: 1 }), head = Object.assign(mat(o.headCol || '#a8996c', { noise: 0.12, grain: 60 }), { noShadow: true, fl: 1 });
    for (let i = 0; i < Math.round(n / 16); i++) {
      let x, z; do { x = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + z * z > 0.7);
      const hh = H * (1.15 + R() * 0.45), lx = (R() - 0.5) * 0.15, lz = (R() - 0.5) * 0.15;
      k.rod(stalk, [x * o.rx, 0, z * o.rz], [x * o.rx + lx, hh, z * o.rz + lz], 0.013, 4);
      k.mesh('umbel', () => ellipsoid(0.05, 0.022, 0.05, { seg: 8, rings: 4 }), head, tr(x * o.rx + lx, hh + 0.02, z * o.rz + lz), R());
    }
    return { kit: k, blocks: [], spots: [{ kind: 'grass', at: [0, 0], yaw: 0 }] };
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

  // what each catalog type is, for the map, the page and the scheme
  const CATALOG = {
    block5: { build: buildBlock5, name: 'Пятиэтажка', size: '20 × 12 м, 15 м', note: 'Кирпич, окна, лоджии, водостоки, антенны. Цвет кирпича и балконов — параметры.' },
    substation: { build: buildSubstation, name: 'Подстанция', size: '6 × 4 м', note: 'Жалюзи, железная дверь с табличками, изоляторы для проводов.' },
    garage: { build: buildGarage, name: 'Сарай с граффити', size: '5 × 3 м', note: 'Рисунки — отдельные наклейки поверх стены. На крыше банки.' },
    towers: { build: buildTowers, name: 'Игровой комплекс', size: '6 × 1,4 м, 4 м', note: 'Две башни, мостик, дуга-лестница и шведская стенка.' },
    swing: { build: buildSwing, name: 'Качели', size: '2,6 × 1,6 м', note: 'Каркас, перекладина и сиденье на цепях. Без сиденья — турник.' },
    pullbar: { build: buildPullbar, name: 'Турник', size: '2,6 м', note: 'Жёлтая рама и красный столб, как у сарая на фото.' },
    slide: { build: buildSlide, name: 'Горка', size: '0,7 × 3,8 м', note: 'Лестница, площадка и желоб под углом.' },
    platform: { build: buildPlatform, name: 'Помост', size: '3 × 0,7 м', note: 'Длинная низкая доска на ножках, на ней сидят.' },
    hoop: { build: buildHoop, name: 'Баскетбольный щит', size: '3,8 м', note: 'Щит, кольцо и сетка на столбе.' },
    pole: { build: buildPole, name: 'Столб с фонарём', size: '8,6 м', note: 'Траверса с изоляторами, провода считаются по провису.' },
    tree: { build: buildTree, name: 'Деревья', size: '4–10 м', note: 'Ствол, ветки и крона из комков листвы. Ясень, клён, берёза, тополь, сухое.' },
    bush: { build: buildBush, name: 'Куст', size: '1–2 м', note: 'Несколько комков листвы.' },
    grass: { build: buildGrass, name: 'Бурьян', size: 'пятно 2–5 м', note: 'Пучки травы со своими травинками и зонтики сорняков.' },
    bench: { build: buildBench, name: 'Лавочка', size: '1,5 м', note: 'Та самая лавочка из первого двора.' },
    urn: { build: buildUrn, name: 'Урна', size: '0,4 м', note: 'Тоже из первого двора.' },
    entrance: { build: buildEntrance, name: 'Подъезд', size: '2,8 × 1,8 м', note: 'Крыльцо со ступенькой, железная дверь, домофон, козырёк с лампой.' },
    curb: { build: buildCurb, name: 'Бордюр', size: 'по длине', note: '' },
    wires: { build: buildWires, name: 'Провода', size: '', note: '' }
  };

