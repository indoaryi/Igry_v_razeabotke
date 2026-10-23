  // ================= catalog: every yard object is built here once, in its own local frame =================
  // Local frame: origin on the ground at the object's anchor, +z is the object's front.
  const paint = (hex, o = {}) => mat(hex, { pat: 38, b: o.rustCol || '#7c4c33', p: [o.rf || 6, o.rt ?? 0.9, 0, 0], noise: 0.05, grain: 60, spec: o.spec ?? 0.35, gloss: 14 });
  const flat = (hex, idx) => mat(hex, { pat: 10, p: [idx, 0, 0, 0] });
  // leaf clumps: p = [share of turning leaves, leaves per metre, edge zone where leaves thin out, leaf radius in cells], r.x = how solid the inside is
  const leafMat = (hex, aut, autHex, o = {}) => Object.assign(mat(hex, { pat: 35, b: autHex, p: [aut, o.dens || 11, o.cut || 0.42, o.rr || 0.44], r: [o.solid ?? 0.7, 0, 0, 0], noise: 0.04, grain: 30, wind: o.wind || [0.05, 1 / 8, 1.25, 0.35] }), { fade: true, fl: 4 });
  // a clump whose normals lean towards the outside of the whole crown, so the crown reads as one lit mass rather than a pile of balls
  function clumpRaw(v, out, yaw, w) {
    const base = lumpMesh(v), c = Math.cos(yaw), sn = Math.sin(yaw);
    const d = [c * out[0] - sn * out[2], out[1], sn * out[0] + c * out[2]], N = base.nrm, nn = new Array(N.length);
    for (let i = 0; i < N.length; i += 3) {
      const b = nrm([N[i] + (d[0] - N[i]) * w, N[i + 1] + (d[1] - N[i + 1]) * w, N[i + 2] + (d[2] - N[i + 2]) * w]);
      nn[i] = b[0]; nn[i + 1] = b[1]; nn[i + 2] = b[2];
    }
    return { pos: base.pos, nrm: nn, idx: base.idx };
  }
  // grass on camera-facing cards: p.z = share of dry blades
  const grassMat = (hex, dryHex, h, dry) => Object.assign(mat(hex, { pat: 39, b: dryHex, p: [h, 1, dry, 0], noise: 0, thin: true, wind: [0.04, 1 / 0.6, 2.1, 0.45] }), { fl: 1, noShadow: true });
  const CARD = () => rawMesh('card', () => ({ pos: [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], nrm: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], idx: [0, 1, 2, 0, 2, 3] }));
  const CARD_BASIS = basis(RV, [0, 1, 0], [SQ2 / 2, 0, SQ2 / 2]);
  const card = (k, m, x, z, w, h) => k.put(CARD(), M(tr(x, 0, z), CARD_BASIS, sc3(w, h, 1)), m, k.R());
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
    const L = o.len, Dp = o.depth || 12, F = 5, FH = 2.8, BASE = 0.75, H = BASE + F * FH + 0.2, REC = 0.22;
    const nb = Math.round(L / 3.1), bw = L / nb;
    const brick = mat(o.brick, { pat: 30, b: o.brick2, p: [0.1512, 0.52, 0.1, 0.86], r: [BASE, 0, 0, 0], noise: 0.03, grain: 40 });
    const baseM = mat(o.base || '#9a948a', { pat: 33, b: '#8a847a', p: [BASE, 0.2, 3, 0], noise: 0.08, grain: 45 });
    const slabM = mat('#c4c0b7', { noise: 0.05, grain: 40 });
    const roofM = mat('#5d5a56', { pat: 34, noise: 0.06, grain: 30 });
    const parM = mat('#aca89f', { noise: 0.06, grain: 40 });
    const sill = mat('#a9aeb1', { noise: 0.03, spec: 0.4, gloss: 16 });
    const pipe = mat('#8f9599', { pat: 23, p: [1.2, 0, 0, 0], noise: 0.03, spec: 0.4, gloss: 16 });
    const lintM = mat(o.lintel || '#bdb8ad', { pat: 48, p: [10, 0, 0, 0], noise: 0.06, grain: 40 });
    const fr = o.frame || '#eceae4';
    const glazF = mat('#56718c', { pat: 43, b: fr, p: [4, 0.05, 1.27, 0.76], r: [0.012, 0, 0, 0], noise: 0 });
    const glazS = mat('#56718c', { pat: 43, b: fr, p: [2, 0.05, 0.56, 0.76], r: [0.012, 0, 0, 0], noise: 0 });
    const winA = mat('#4b6680', { pat: 43, b: fr, p: [2, 0.055, 0.75, 0.725], r: [0.022, 0, 0, 0], noise: 0 });
    const panel = mat(o.panel, { pat: 38, b: o.panel2 || '#7c4c33', p: [5, 0.93, 0, 0], noise: 0.05, grain: 50 });
    const acM = mat('#e4e3de', { pat: 12, p: [0.1, 34, 0, 0], noise: 0.03 });
    const dishM = mat('#d9d9d4', { noise: 0.02, spec: 0.4, gloss: 10 });
    const railM = flat('#3b3d40', 1);
    // window frames: new white plastic or old painted wood; glass with curtains in different colours
    const frames = [mat(fr, { noise: 0.02, spec: 0.2, gloss: 10 }), mat(o.frame2 || '#86684a', { pat: 38, b: '#5e4532', p: [9, 0.88, 0, 0], noise: 0.05, grain: 50 })];
    const glassM = ['#ebe6da', '#dccca6', '#b8644f', '#8ea37a', '#d1c18c', '#9fb4c8', '#c9a3a8'].map((c) => mat('#4b6680', { pat: 49, b: c, noise: 0 }));
    const barM = mat('#2f3134', { noise: 0.03, spec: 0.3, gloss: 12 });
    const UBOX = () => rawMesh('ubox', () => box(1, 1, 1));
    // body behind the facade shell, plinth, roof
    k.boxMM(brick, 0, 0, -Dp, L, H, -REC);
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
    for (const x of [0.32, L - 0.32]) {
      k.rod(pipe, [x, 0.3, 0.15], [x, H + 0.1, 0.15], 0.065, 8);
      k.boxMM(pipe, x - 0.08, 0.12, 0.08, x + 0.08, 0.3, 0.32);
    }
    decalOn(k, 'houseNo', [-0.006, 3.4, -1.2], '-x');
    decalOn(k, 'houseNo', [L + 0.006, 3.4, -1.2], 'x');
    const spots = [], heights = [], blocks = [{ rect: [0, -Dp, L, 0.05] }];
    // a window set REC deep into the wall: glass, frame with leaves and a transom, tin sill, concrete lintel; bars on some ground-floor ones
    const windowIn = (xc, ys, hw, f) => {
      const hh = 0.725, yc = ys + hh, zf = -0.11, fw = 0.045;
      k.put(UBOX(), M(tr(xc, yc, -0.155), sc3(hw, hh, 0.012)), glassM[(R() * glassM.length) | 0], R());
      const fm = R() < 0.62 ? frames[0] : frames[1];
      k.boxMM(fm, xc - hw, ys, zf - 0.03, xc + hw, ys + fw, zf + 0.03);
      k.boxMM(fm, xc - hw, yc + hh - fw, zf - 0.03, xc + hw, yc + hh, zf + 0.03);
      k.boxMM(fm, xc - hw, ys, zf - 0.03, xc - hw + fw, yc + hh, zf + 0.03);
      k.boxMM(fm, xc + hw - fw, ys, zf - 0.03, xc + hw, yc + hh, zf + 0.03);
      const leaves = hw > 1 ? 3 : 2, lw = 2 * hw / leaves;
      for (let j = 1; j < leaves; j++) { const xm = xc - hw + lw * j; k.boxMM(fm, xm - fw / 2, ys, zf - 0.03, xm + fw / 2, yc + hh, zf + 0.03); }
      const l0 = xc - hw + lw * ((R() * leaves) | 0);
      k.boxMM(fm, l0, yc + 0.3, zf - 0.025, l0 + lw, yc + 0.3 + fw, zf + 0.025);
      k.boxMM(sill, xc - hw - 0.05, ys - 0.05, -0.04, xc + hw + 0.05, ys, 0.12);
      k.boxMM(lintM, xc - hw - 0.2, yc + hh, -0.012, xc + hw + 0.2, yc + hh + 0.2, 0.012);
      if (f === 0 && R() < 0.55) {
        for (let x = xc - hw + 0.08; x < xc + hw - 0.04; x += 0.13) k.boxMM(barM, x - 0.012, ys - 0.02, 0.03, x + 0.012, yc + hh + 0.02, 0.055);
        for (const y of [ys + 0.3, yc + hh - 0.25]) k.boxMM(barM, xc - hw - 0.04, y - 0.015, 0.025, xc + hw + 0.04, y + 0.015, 0.06);
      }
      const r = R();
      if (r < 0.15) k.boxMM(acM, xc + hw + 0.18, yc - 0.05, 0, xc + hw + 0.9, yc + 0.45, 0.3);
      else if (r < 0.23) k.mesh('dish', () => ellipsoid(0.3, 0.3, 0.08, { seg: 12, rings: 5, half: true }), dishM, M(tr(xc - hw - 0.35, yc + 0.35, 0.12), rx(-1.1)), 0);
    };
    const CLOTHES = ['#e8e6e0', '#c94f45', '#4f6fa8', '#e2c34a', '#7aa36a', '#d98fb0', '#3d3f45'].map((c) => Object.assign(mat(c, { noise: 0.06, grain: 40, wind: [0.025, 1 / 14, 2.4, 0.6] }), { noShadow: false }));
    const loggia = (xc, yF, top, f) => {
      const x0 = xc - 1.3, x1 = xc + 1.3, D = 1.15;
      k.boxMM(slabM, x0 - 0.03, yF - 0.12, 0, x1 + 0.03, yF, D + 0.04);
      const pm = (R() < 0.55) ? panel : brick;
      k.boxMM(pm, x0, yF, D - 0.07, x1, yF + 1.0, D);
      k.boxMM(pm, x0, yF, 0, x0 + 0.07, yF + 1.0, D - 0.07);
      k.boxMM(pm, x1 - 0.07, yF, 0, x1, yF + 1.0, D - 0.07);
      if (R() < 0.75) {
        k.box(glazF, [xc, yF + 1.76, D - 0.035], [1.27, 0.76, 0.015], null, R());
        k.box(glazS, [x0 + 0.035, yF + 1.76, D / 2], [0.56, 0.76, 0.015], ry(-Math.PI / 2), R());
        k.box(glazS, [x1 - 0.035, yF + 1.76, D / 2], [0.56, 0.76, 0.015], ry(Math.PI / 2), R());
      } else {
        // open: a window and a balcony door in the wall, laundry on a line
        k.boxMM(sill, x0, yF + 1.0, D - 0.1, x1, yF + 1.05, D + 0.01);
        k.box(winA, [xc - 0.45, yF + 1.57, 0.025], [0.75, 0.725, 0.025], null, R());
        const ly = yF + 2.1, lz = D - 0.4;
        k.lines(railM, [[[x0 + 0.1, ly, lz], [x1 - 0.1, ly, lz]]]);
        let x = x0 + 0.25 + R() * 0.2;
        while (x < x1 - 0.5) {
          const w = 0.22 + R() * 0.35, h = 0.3 + R() * 0.45;
          k.boxMM(CLOTHES[(R() * CLOTHES.length) | 0], x, ly - h, lz - 0.01, x + w, ly, lz + 0.01);
          x += w + 0.06 + R() * 0.2;
        }
      }
      if (top) k.boxMM(slabM, x0 - 0.03, yF + 2.6, 0, x1 + 0.03, yF + 2.72, D + 0.04);
    };
    // the facade shell: bands under and over the windows, piers between them, solid where there are loggias and entrances
    const children = [];
    const kindOf = (i, f) => (o.entr || []).includes(i) ? 'entr' : ((o.balc || []).includes(i) && f >= 1 ? 'loggia' : 'win');
    for (let f = 0; f < F; f++) {
      const yF = BASE + f * FH, ys = yF + 0.85, yt = ys + 1.45;
      k.boxMM(brick, 0, yF, -REC, L, ys, 0);
      k.boxMM(brick, 0, yt, -REC, L, yF + FH, 0);
      let x = 0;
      for (let i = 0; i < nb; i++) {
        const xc = (i + 0.5) * bw, kind = kindOf(i, f);
        if (kind === 'loggia') loggia(xc, yF, f === F - 1, f);
        if (kind !== 'win') continue;
        const hw = i % 2 === 0 ? 1.05 : 0.75;
        k.boxMM(brick, x, ys, -REC, xc - hw, yt, 0);
        windowIn(xc, ys, hw, f);
        x = xc + hw;
      }
      k.boxMM(brick, x, ys, -REC, L, yt, 0);
    }
    k.boxMM(brick, 0, BASE + F * FH, -REC, L, H, 0);
    k.boxMM(brick, 0, 0, -REC, L, BASE, 0);
    for (let i = 0; i < nb; i++) {
      const en = (o.entr || []).indexOf(i);
      if (en >= 0) children.push({ type: 'entrance', local: [(i + 0.5) * bw, 0], idx: en, n: 11, frame: fr, door: o.door });
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
  // a lumpy clump of leaves: an ellipsoid pushed out by a few bulges, with a flatter underside (8 shapes)
  function lumpMesh(v) {
    return rawMesh('lump' + v, () => {
      const m = ellipsoid(1, 0.8, 1, { seg: 8, rings: 5 });
      const R = rng(700 + v * 13), P = m.pos, Nn = m.nrm, bumps = [];
      for (let i = 0; i < 6; i++) bumps.push([nrm([R() * 2 - 1, R() * 1.6 - 0.5, R() * 2 - 1]), 0.16 + R() * 0.22]);
      for (let i = 0; i < P.length; i += 3) {
        const d = nrm([P[i], P[i + 1], P[i + 2]]);
        let f = 0.9;
        for (const [bv, am] of bumps) f += am * Math.max(0, dot(d, bv) - 0.35) * 1.7;
        if (d[1] < 0) f *= 1 + d[1] * 0.28;
        P[i] *= f; P[i + 1] *= f; P[i + 2] *= f;
      }
      for (let i = 0; i < P.length; i += 3) { const d = nrm([P[i], P[i + 1] * 1.2, P[i + 2]]); Nn[i] = d[0]; Nn[i + 1] = d[1]; Nn[i + 2] = d[2]; }
      return m;
    });
  }
  // h height · bole clear trunk · r0 trunk radius · w crown half-width · up how steeply limbs climb (0 flat … 1 upright) · limbs first-order limbs ·
  // cl clump radius range · per clumps per twig · dens leaves per metre · droop how much twigs hang · stems trunks from one root
  const TREE = {
    ash: { h: 8.6, bole: 2.4, r0: 0.21, w: 3.0, up: 0.55, limbs: 5, cl: [0.38, 0.68], per: 2.6, dens: 11, leaf: '#3f6b2d', aut: '#a9a23f', af: 0.06, bark: '#6c625a', solid: 0.62 },
    maple: { h: 6.8, bole: 1.5, r0: 0.18, w: 3.1, up: 0.42, limbs: 5, cl: [0.38, 0.66], per: 2.6, dens: 9, leaf: '#4b7f30', aut: '#c99a35', af: 0.08, bark: '#5f564d', stems: 2, solid: 0.66 },
    birch: { h: 8.4, bole: 2.4, r0: 0.14, w: 2.0, up: 0.74, limbs: 5, cl: [0.28, 0.48], per: 2.6, dens: 15, leaf: '#5d8c36', aut: '#c9b545', af: 0.1, bark: '#e3e0d8', birch: true, droop: 0.55, solid: 0.5 },
    poplar: { h: 10.5, bole: 2.0, r0: 0.24, w: 2.0, up: 0.9, limbs: 7, cl: [0.38, 0.64], per: 2.6, dens: 12, leaf: '#47722f', aut: '#b8ad42', af: 0.06, bark: '#6f675e', solid: 0.66 },
    willow: { h: 7.4, bole: 1.6, r0: 0.25, w: 3.3, up: 0.5, limbs: 6, cl: [0.32, 0.56], per: 2.6, dens: 16, leaf: '#6f8a4a', aut: '#a8a050', af: 0.04, bark: '#5c5650', droop: 0.85, solid: 0.56 },
    young: { h: 4.2, bole: 1.2, r0: 0.08, w: 1.4, up: 0.62, limbs: 3, cl: [0.26, 0.42], per: 2.6, dens: 13, leaf: '#5a9136', aut: '#bfa23e', af: 0.06, bark: '#6d6259', solid: 0.6 },
    bare: { h: 6.4, trunk: 2.1, r0: 0.15, bark: '#7a6e64' }
  };
  function buildTree(o) {
    const P = TREE[o.kind || 'ash'], k = new Kit(o.seed || 53), R = k.R;
    const s = (o.h || P.h) / P.h;
    const barkM = P.birch ? mat(P.bark, { pat: 42, b: '#3b3836', noise: 0.05, grain: 40 }) : mat(P.bark, { noise: 0.14, grain: 30 });
    const r1 = P.r0 * s * 0.6, trunkH = (P.trunk || 2) * s, top = [0, trunkH, 0];
    if (o.kind === 'bare') {
      const r0 = P.r0 * s;
      k.mesh('trunkbare' + (o.seed || 53), () => loft([0, 1, 2, 3, 4, 5].map((i) => { const t = i / 5, r = lerp(r0 * (i === 0 ? 1.45 : 1.1), r1, Math.pow(t, 0.7)); return { a: t * trunkH, hu: r, hv: r }; }), { seg: 8, capAAt: 0, capBAt: trunkH }), barkM);
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
    const H = P.h * s, bole = P.bole * s, W = P.w * s, r0 = P.r0 * s, stems = P.stems || 1, droop = P.droop || 0;
    // 1. grow a branching skeleton in rough units; 2. stretch the crown to its size; 3. build limbs, twigs and clumps
    const segs = [], tips = [], tops = [];
    const grow = (a, d, L, r, order) => {
      let p = a;
      const n = order === 0 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const sag = droop * (order >= 2 ? 0.4 : 0.1) * (i + 1) / n;
        d = nrm(add(d, [(R() - 0.5) * 0.34, (P.up - d[1]) * 0.22 - sag, (R() - 0.5) * 0.34]));
        const q = add(p, scl(d, L / n));
        const ra = r * (1 - 0.3 * i / n), rb = r * (1 - 0.3 * (i + 1) / n);
        segs.push([p, q, ra, rb, order]);
        if (order < 2 && i >= 1 && R() < 0.45) grow(q, nrm(add(d, [(R() - 0.5) * 1.5, 0.1 + R() * 0.45, (R() - 0.5) * 1.5])), L * (0.42 + R() * 0.18), rb * 0.55, order + 1);
        if (order === 1 && R() < 0.2) tips.push([lerpV(p, q, 0.5), d, 1]);
        p = q;
      }
      if (order >= 2) tips.push([p, d, 2]);
      else for (let j = 0; j < 2; j++) grow(p, nrm(add(d, [(R() - 0.5) * 1.1, 0.25 + R() * 0.35, (R() - 0.5) * 1.1])), L * (0.5 + R() * 0.15), r * 0.55, order + 1);
    };
    const lean = [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5];
    for (let st = 0; st < stems; st++) {
      const off = stems > 1 ? [Math.cos(st * 2.4 + R()) * 0.13, Math.sin(st * 2.4 + R()) * 0.13] : [0, 0];
      const sl = [lean[0] + off[0] * 3, lean[1] + off[1] * 3];
      const tH = bole + (H - bole) * 0.3, rt = r0 / Math.sqrt(stems);
      const rings = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6, rr = lerp(rt * (i === 0 ? 1.5 : 1.08), rt * 0.62, Math.pow(t, 0.8));
        rings.push({ a: t * tH, hu: rr, hv: rr, cu: off[0] + sl[0] * t * t * 0.35, cv: off[1] + sl[1] * t * t * 0.35 });
      }
      k.mesh('trunk' + (o.seed || 53) + ',' + st + ',' + s.toFixed(2) + (o.kind || 'ash'), () => loft(rings, { seg: 8, capAAt: 0, capBAt: tH }), barkM);
      tops.push(tH);
      const axis = (y) => [off[0] + sl[0] * 0.35 * (y / tH) ** 2, y, off[1] + sl[1] * 0.35 * (y / tH) ** 2];
      const nl = Math.max(2, Math.round(P.limbs / stems));
      for (let i = 0; i < nl; i++) {
        const t = (i + R() * 0.5) / nl, a = i * 2.39996 + st * 1.3 + R() * 0.5;
        grow(axis(lerp(bole, tH, t)), nrm([Math.cos(a) * (1.05 - P.up), P.up + 0.1, Math.sin(a) * (1.05 - P.up)]), 1.0, rt * 0.5 * (1 - t * 0.25), 0);
      }
      grow(axis(tH), nrm([sl[0] * 0.3, 1, sl[1] * 0.3]), 1.0, rt * 0.55, 0);
    }
    // stretch the crown: up from the trunk tops to the full height, out to the crown's half-width
    const cb = Math.min(...tops);
    let maxR = 0.1, maxY = cb + 0.1;
    for (const sg of segs) for (const q of [sg[0], sg[1]]) { maxR = Math.max(maxR, Math.hypot(q[0], q[2])); maxY = Math.max(maxY, q[1]); }
    const sx = W * 0.82 / maxR, sy = (H - P.cl[1] * s - cb) / (maxY - cb);
    const fit = (q) => [q[0] * sx, q[1] <= cb ? q[1] : cb + (q[1] - cb) * sy, q[2] * sx];
    for (const sg of segs) {
      const a = fit(sg[0]), b = fit(sg[1]), ra = Math.max(sg[2] * s, 0.012), rb = Math.max(sg[3] * s, 0.01);
      k.taper(barkM, a, b, ra, rb, sg[4] === 0 ? 6 : sg[4] === 1 ? 4 : 3);
    }
    // leaf clumps on the twigs; weeping kinds also hang curtains of twigs with small clumps
    const leaf = leafMat(P.leaf, P.af, P.aut, { dens: P.dens, solid: P.solid });
    let cc = [0, 0, 0];
    for (const [p0] of tips) cc = add(cc, fit(p0));
    cc = scl(cc, 1 / Math.max(1, tips.length)); cc[1] -= (H - cb) * 0.12;
    const clump = (c, rc, fy, yaw) => k.put(clumpRaw((R() * 8) | 0, nrm(sub(c, cc)), yaw, 0.55), M(tr(c[0], c[1], c[2]), ry(yaw), sc3(rc, rc * fy, rc)), leaf, R());
    const twigM = Object.assign(flat(P.birch ? '#4a3f37' : '#4f443b', 1), { noShadow: true });
    const hang = [];
    for (const [p0, d, ord] of tips) {
      const p = fit(p0), n = ord === 2 ? (R() < P.per - 2 ? 2 : 1) + (R() < 0.35 ? 1 : 0) : 1;
      for (let j = 0; j < n; j++) {
        const rc = lerp(P.cl[0], P.cl[1], R()) * s * (ord === 1 ? 0.8 : 1);
        const c = add(p, [(R() - 0.5) * rc * 1.1 + d[0] * rc * 0.3, (R() - 0.35) * rc * 0.7, (R() - 0.5) * rc * 1.1 + d[2] * rc * 0.3]);
        const fy = droop > 0.5 ? 1.0 + R() * 0.25 : 0.72 + R() * 0.16;
        clump([c[0], c[1] - (droop > 0.5 ? rc * 0.3 : 0), c[2]], rc, fy, R() * 6.28);
      }
      if (droop > 0 && ord === 2 && R() < droop) {
        const L = (0.5 + R() * 0.9) * s * droop, q = add(p, [d[0] * 0.15, -L, d[2] * 0.15]);
        hang.push([p, lerpV(p, q, 0.5)], [lerpV(p, q, 0.5), q]);
        if (R() < 0.6) { const rc = P.cl[0] * s * 0.75; clump(lerpV(p, q, 0.7), rc * 0.7, 1.9, R() * 6.28); }
      }
    }
    if (hang.length) k.lines(twigM, hang);
    return { kit: k, blocks: [{ c: [0, 0], r: r0 + 0.08 }], top: H };
  }
  // stems fanning out of one root, clumps along their upper parts
  const BUSH = {
    lilac: { leaf: '#3f6b2e', aut: '#8f8a3a', af: 0.03, dens: 10, stems: 7, h: 1.9, w: 1.1, cl: [0.34, 0.58] },
    elder: { leaf: '#4a7a30', aut: '#b9a83b', af: 0.05, dens: 11, stems: 6, h: 1.7, w: 1.0, cl: [0.3, 0.52] },
    hazel: { leaf: '#507e2f', aut: '#c2a23c', af: 0.06, dens: 9, stems: 8, h: 2.3, w: 1.3, cl: [0.34, 0.58] },
    dogrose: { leaf: '#47702c', aut: '#8d7a3a', af: 0.06, dens: 15, stems: 9, h: 1.3, w: 0.9, cl: [0.22, 0.4], berries: '#c2342a' },
    shoots: { leaf: '#5a8e35', aut: '#cfa23a', af: 0.05, dens: 13, stems: 5, h: 1.3, w: 0.7, cl: [0.2, 0.38] }
  };
  function buildBush(o) {
    const B = BUSH[o.kind || 'lilac'], k = new Kit(o.seed || 59), R = k.R, sz = o.size || 1;
    const stemM = mat('#5a4a3c', { noise: 0.12, grain: 40 });
    const leaf = leafMat(o.leaf || B.leaf, o.af ?? B.af, o.aut || B.aut, { dens: B.dens, cut: 0.45, rr: 0.46, solid: 0.8, wind: [0.025, 1 / 1.6, 1.7, 0.45] });
    const H = B.h * sz, up = [];
    for (let i = 0; i < B.stems; i++) {
      const a = (i / B.stems) * Math.PI * 2 + R() * 0.7, rad = R() * 0.22 * sz, sp = 0.3 + R() * 0.35;
      let p = [Math.cos(a) * rad, 0, Math.sin(a) * rad], d = nrm([Math.cos(a) * sp, 1, Math.sin(a) * sp]);
      const L = H * (0.7 + R() * 0.35);
      for (let j = 0; j < 3; j++) {
        d = nrm(add(d, [(R() - 0.5) * 0.3, -0.1, (R() - 0.5) * 0.3]));
        const q = add(p, scl(d, L / 3));
        k.taper(stemM, p, q, 0.022 * sz * (1 - j * 0.25), 0.022 * sz * (1 - (j + 1) * 0.25), 4);
        if (j >= 1) up.push([q, d]);
        p = q;
      }
    }
    const leafAt = (c, rc, fy) => { const y = Math.max(c[1], rc * 0.55), yaw = R() * 6.28; k.put(clumpRaw((R() * 8) | 0, nrm([c[0], y - H * 0.35, c[2]]), yaw, 0.5), M(tr(c[0], y, c[2]), ry(yaw), sc3(rc, rc * fy, rc)), leaf, R()); };
    const n = Math.round(up.length * 1.4);
    for (let i = 0; i < n; i++) {
      const [q, d] = up[i % up.length], rc = lerp(B.cl[0], B.cl[1], R()) * sz;
      leafAt(add(q, [(R() - 0.5) * rc + d[0] * rc * 0.3, (R() - 0.4) * rc * 0.6, (R() - 0.5) * rc + d[2] * rc * 0.3]), rc, 0.8 + R() * 0.15);
    }
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + R(), rc = B.cl[1] * sz * 0.8; leafAt([Math.cos(a) * rc * 0.8, H * 0.32, Math.sin(a) * rc * 0.8], rc, 0.75); }
    if (B.berries) {
      const bm = Object.assign(mat(B.berries, { noise: 0.05, spec: 0.5, gloss: 10 }), { noShadow: true, fl: 1 });
      for (let i = 0; i < 12; i++) { const [q] = up[(R() * up.length) | 0]; k.mesh('berry', () => ellipsoid(0.028, 0.028, 0.028, { seg: 6, rings: 4 }), bm, tr(q[0] + (R() - 0.5) * 0.5 * sz, q[1] + (R() - 0.2) * 0.3 * sz, q[2] + (R() - 0.5) * 0.5 * sz)); }
    }
    return { kit: k, blocks: [{ c: [0, 0], r: 0.6 * sz }] };
  }
  // a patch of tall weeds: grass cards, dry stalks with umbels, a few big burdock leaves near the ground
  function buildGrass(o) {
    const k = new Kit(o.seed || 61), R = k.R;
    const H = o.h || 1.0;
    const gm = grassMat(o.col || '#5b7d31', o.dryCol || '#c3aa5b', H, o.dry ?? 0.35);
    const n = Math.round(Math.PI * o.rx * o.rz * 9);
    for (let i = 0; i < n; i++) {
      let x, z; do { x = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + z * z > 1);
      const e = Math.sqrt(x * x + z * z);
      card(k, gm, x * o.rx, z * o.rz, 0.45 + R() * 0.4, H * (0.55 + 0.5 * R()) * (1 - 0.45 * e));
    }
    const stalk = Object.assign(mat('#6f7a3c', { noise: 0.04 }), { noShadow: true, fl: 1, wind: [0.06, 1, 1.9, 0.4] }), head = Object.assign(mat(o.headCol || '#a8996c', { noise: 0.12, grain: 60, wind: [0.06, 1, 1.9, 0.4] }), { noShadow: true, fl: 1 });
    for (let i = 0; i < Math.round(n / 10); i++) {
      let x, z; do { x = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + z * z > 0.7);
      const hh = H * (1.15 + R() * 0.45), lx = (R() - 0.5) * 0.15, lz = (R() - 0.5) * 0.15;
      k.rod(stalk, [x * o.rx, 0, z * o.rz], [x * o.rx + lx, hh, z * o.rz + lz], 0.013, 4);
      k.mesh('umbel', () => ellipsoid(0.05, 0.022, 0.05, { seg: 8, rings: 4 }), head, tr(x * o.rx + lx, hh + 0.02, z * o.rz + lz), R());
    }
    const burdock = leafMat('#3f6a2b', 0.05, '#8a8a3a', { dens: 4.5, rr: 0.5, cut: 0.5, solid: 0.9, wind: [0.02, 1 / 0.6, 1.6, 0.4] });
    for (let i = 0; i < Math.round(o.rx * o.rz * 1.2); i++) {
      const a = R() * 6.28, r = R() * 0.8, rc = 0.22 + R() * 0.12;
      k.put(lumpMesh((R() * 8) | 0), M(tr(Math.cos(a) * r * o.rx, rc * 0.45, Math.sin(a) * r * o.rz), ry(R() * 6.28), sc3(rc, rc * 0.55, rc)), burdock, R());
    }
    return { kit: k, blocks: [], spots: [{ kind: 'grass', at: [0, 0], yaw: 0 }] };
  }
  // ---------- the meadow: grass tufts over every lawn and rough cell, a 6 × 6 m tile per instance ----------
  const tuftMat = (hex, dryHex, dry) => Object.assign(mat(hex, { pat: 39, b: dryHex, p: [0, 0, dry, 0], noise: 0, thin: true, wind: [0.04, 1 / 0.6, 2.1, 0.45] }), { fl: 1, noShadow: true });
  const MEADOW = {
    lawn: tuftMat('#5a8732', '#a8a45c', 0.04), lush: tuftMat('#4f7c2e', '#a8a45c', 0.07),
    rough: tuftMat('#52752e', '#b4a65c', 0.2), dry: tuftMat('#7c8440', '#c4b168', 0.55)
  };
  function buildMeadow(o) {
    const [tx, tz, TL] = o.tile, k = new Kit(9000 + tx * 31 + tz), R = k.R, step = 0.31;
    for (let z = tz + step / 2; z < tz + TL; z += step) for (let x = tx + step / 2; x < tx + TL; x += step) {
      const px = x + (R() - 0.5) * step * 1.1, pz = z + (R() - 0.5) * step * 1.1;
      const t = groundType(px, pz);
      if (t !== '.' && t !== ',') continue;
      const pd = o.pathD(px, pz);
      if (pd < 0.42 + (vnoise(px * 2.8, pz * 2.8, 7) - 0.5) * 0.3) continue;
      if (o.blocked(px, pz)) continue;
      // lush and thin zones a few metres across, clumps about a metre across
      const lush = fbm(px * 0.33, pz * 0.33, 21), clumpy = vnoise(px * 1.3, pz * 1.3, 23), shade = o.shadeOf(px, pz), rough = t === ',';
      if (!rough && R() < 0.1 + shade * 0.4 + (0.45 - clumpy) * 0.3) continue;
      let h = rough ? 0.34 + lush * 0.52 : 0.09 + lush * 0.2 + clumpy * 0.1;
      if (R() < 0.08) h *= 1.7;                                                    // a tussock sticking out
      h *= (0.7 + R() * 0.6) * (0.4 + 0.6 * smooth((pd - 0.35) / 0.9)) * (1 - shade * 0.35);
      const w = (rough ? 0.44 : 0.34) + R() * 0.36;
      const m = rough ? (lush > 0.6 && R() < 0.45 ? MEADOW.dry : MEADOW.rough) : (lush + clumpy * 0.3 > 0.72 ? MEADOW.lush : (R() < 0.04 ? MEADOW.dry : MEADOW.lawn));
      card(k, m, px, pz, w, h);
    }
    return { kit: k, blocks: [] };
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
    meadow: { build: buildMeadow, name: 'Трава', size: '', note: '' },
    grass: { build: buildGrass, name: 'Бурьян', size: 'пятно 2–5 м', note: 'Пучки травы со своими травинками и зонтики сорняков.' },
    bench: { build: buildBench, name: 'Лавочка', size: '1,5 м', note: 'Та самая лавочка из первого двора.' },
    urn: { build: buildUrn, name: 'Урна', size: '0,4 м', note: 'Тоже из первого двора.' },
    entrance: { build: buildEntrance, name: 'Подъезд', size: '2,8 × 1,8 м', note: 'Крыльцо со ступенькой, железная дверь, домофон, козырёк с лампой.' },
    curb: { build: buildCurb, name: 'Бордюр', size: 'по длине', note: '' },
    wires: { build: buildWires, name: 'Провода', size: '', note: '' }
  };

