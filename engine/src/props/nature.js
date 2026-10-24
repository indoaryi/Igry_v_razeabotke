  // ================= library: nature — trees, bushes, weed patches, the meadow that grows over every lawn =================
  // leaf clumps: p = [share of turning leaves, leaves per metre, edge zone where leaves thin out, leaf radius in cells], r.x = how solid the inside is
  const leafMat = (hex, aut, autHex, o = {}) => Object.assign(mat(hex, { pat: 35, b: autHex, p: [aut, o.dens || 11, o.cut || 0.42, o.rr || 0.44], r: [o.solid ?? 0.7, 0, 0, 0], noise: 0.04, grain: 30, wind: o.wind || [0.05, 1 / 8, 1.25, 0.35] }), { fade: true, fl: 4 });
  // a clump whose normals lean towards the outside of the whole crown, so the crown reads as one lit mass rather than a pile of balls
  function clumpRaw(v, out, yaw, w, small) {
    const base = lumpMesh(v, small), c = Math.cos(yaw), sn = Math.sin(yaw);
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

  // ---------- trees, bushes, tall grass ----------
  // a lumpy clump of leaves: an ellipsoid pushed out by a few bulges, with a flatter underside (8 shapes)
  function lumpMesh(v, small) {
    return rawMesh((small ? 'lumpS' : 'lump') + v, () => {
      const m = small ? ellipsoid(1, 0.8, 1, { seg: 6, rings: 4 }) : ellipsoid(1, 0.8, 1, { seg: 8, rings: 5 });
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
    const clump = (c, rc, fy, yaw, small) => k.put(clumpRaw((R() * 8) | 0, nrm(sub(c, cc)), yaw, 0.55, small), M(tr(c[0], c[1], c[2]), ry(yaw), sc3(rc, rc * fy, rc)), leaf, R());
    const twigM = Object.assign(flat(P.weep ? '#6e5a40' : P.birch ? '#4a3f37' : '#4f443b', 1), { noShadow: true });
    const hang = [];
    for (const [p0, d, ord] of tips) {
      const p = fit(p0), n = ord === 2 ? (R() < P.per - 2 ? 2 : 1) + (R() < 0.35 ? 1 : 0) : 1;
      for (let j = 0; j < n; j++) {
        const rc = lerp(P.cl[0], P.cl[1], R()) * s * (ord === 1 ? 0.8 : 1);
        const c = add(p, [(R() - 0.5) * rc * 1.1 + d[0] * rc * 0.3, (R() - 0.35) * rc * 0.7, (R() - 0.5) * rc * 1.1 + d[2] * rc * 0.3]);
        const fy = droop > 0.5 ? 1.0 + R() * 0.25 : 0.72 + R() * 0.16;
        clump([c[0], c[1] - (droop > 0.5 ? rc * 0.3 : 0), c[2]], rc, fy, R() * 6.28);
      }
      if (P.weep && ord === 2) {
        // a weeping birch: long thin twigs hang from every outer twig, leaves strung along them in narrow streaks
        const out = nrm([p[0] - cc[0] + 1e-3, 0, p[2] - cc[2]]), ns = R() < P.weep ? 2 : 1;
        for (let j = 0; j < ns; j++) {
          const a = add(p, [out[0] * 0.12 + (R() - 0.5) * 0.3, -0.04, out[2] * 0.12 + (R() - 0.5) * 0.3]);
          const L = (0.9 + R() * 1.7) * s, b = add(a, [out[0] * 0.3 + (R() - 0.5) * 0.2, -L, out[2] * 0.3 + (R() - 0.5) * 0.2]);
          const nk = 2 + Math.round(L / (0.62 * s));
          for (let q = 0; q < nk; q++) clump(add(lerpV(a, b, (q + 0.6) / (nk + 0.1)), [(R() - 0.5) * 0.08, 0, (R() - 0.5) * 0.08]), (0.11 + R() * 0.05) * s, 2.2 + R() * 0.9, R() * 6.28, true);
        }
      } else if (droop > 0 && ord === 2 && R() < droop) {
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
  // o.look (per location): mats { lawn, lush, rough, dry }, lawnH / roughH height factors, thin (extra share of lawn tufts left out), leafHide (thick leaves hide grass)
  function buildMeadow(o) {
    const [tx, tz, TL] = o.tile, k = new Kit(9000 + tx * 31 + tz), R = k.R, step = 0.31;
    const L = o.look || {}, MM = Object.assign({}, MEADOW, L.mats || {});
    for (let z = tz + step / 2; z < tz + TL; z += step) for (let x = tx + step / 2; x < tx + TL; x += step) {
      const px = x + (R() - 0.5) * step * 1.1, pz = z + (R() - 0.5) * step * 1.1;
      const t = groundType(px, pz);
      if (t !== '.' && t !== ',') continue;
      const pd = o.pathD(px, pz);
      if (pd < 0.42 + (vnoise(px * 2.8, pz * 2.8, 7) - 0.5) * 0.3) continue;
      if (o.blocked(px, pz)) continue;
      // lush and thin zones a few metres across, clumps about a metre across
      const lush = fbm(px * 0.33, pz * 0.33, 21), clumpy = vnoise(px * 1.3, pz * 1.3, 23), shade = o.shadeOf(px, pz);
      const edge = o.edgeDist(px, pz) < 0.55, rough = t === ',' || edge;
      if (!rough && R() < 0.1 + shade * 0.4 + (0.45 - clumpy) * 0.3 + (L.thin || 0)) continue;
      const lf = o.leaves ? o.leaves(px, pz) : 0;
      if (lf > 0 && R() < lf * (L.leafHide ?? 0.6)) continue;                      // thick fallen leaves hide the grass
      let h = rough ? (0.34 + lush * 0.52) * (L.roughH || 1) : (0.09 + lush * 0.2 + clumpy * 0.1) * (L.lawnH || 1);
      if (R() < 0.08) h *= 1.7;                                                    // a tussock sticking out
      if (edge) h *= 1.25;                                                        // weeds along walls and kerbs, where nobody mows
      h *= (0.7 + R() * 0.6) * (0.4 + 0.6 * smooth((pd - 0.35) / 0.9)) * (1 - shade * 0.35);
      const w = (rough ? 0.44 : 0.34) + R() * 0.36;
      const m = rough ? (lush > 0.6 && R() < 0.45 ? MM.dry : MM.rough) : (lush + clumpy * 0.3 > 0.72 ? MM.lush : (R() < (L.dryShare ?? 0.04) ? MM.dry : MM.lawn));
      card(k, m, px, pz, w, h);
    }
    return { kit: k, blocks: [] };
  }
  // the meadow is laid over the whole location after its objects: 6 × 6 m tiles of tufts, thinner on paths, under trees and objects
  function buildMeadowTiles() {
    const pathD = pathDist;
    const solid = INST.filter((i) => i.blocks && i.blocks.length);
    const blocked = (x, z) => {
      for (const i of solid) for (const b of i.blocks) if (b.poly ? pointInPoly(x, z, b.poly) : Math.hypot(x - b.c[0], z - b.c[1]) < b.r + 0.05) return true;
      return false;
    };
    // how close a point is to something weeds like to hug: walls and big objects, the asphalt and concrete edges
    const hug = INST.filter((i) => i.T && i.T.hug);
    const segDist = (x, z, a, b) => { const ex = b[0] - a[0], ez = b[1] - a[1], u = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1), 0, 1); return Math.hypot(x - a[0] - ex * u, z - a[1] - ez * u); };
    const edgeDist = (x, z) => {
      let d = 9;
      for (const i of hug) for (const b of i.blocks) {
        if (b.poly) for (let j = 0; j < b.poly.length; j++) d = Math.min(d, segDist(x, z, b.poly[j], b.poly[(j + 1) % b.poly.length]));
        else d = Math.min(d, Math.hypot(x - b.c[0], z - b.c[1]) - b.r);
      }
      for (const [dx, dz] of [[-0.45, 0], [0, -0.45], [0.45, 0], [0, 0.45]]) { const t = groundType(x + dx, z + dz); if (t === '#' || t === '_') d = Math.min(d, 0.3); }
      return d;
    };
    const trees = INST.filter((i) => i.type === 'tree');
    const shadeOf = (x, z) => { let q = 0; for (const t of trees) q = Math.max(q, 1 - ((x - t.def.at[0]) ** 2 + (z - t.def.at[1]) ** 2) / 7.5); return q; };
    const leaves = (MAP.style && MAP.style.leaves) || (() => 0);
    for (let tz = 0; tz < MAP.size[1]; tz += 6) for (let tx = 0; tx < MAP.size[0]; tx += 6) instantiate({ type: 'meadow', at: [0, 0], rot: 0, tile: [tx, tz, 6], pathD, blocked, shadeOf, edgeDist, leaves, look: MAP.meadow || {} });
  }
  hook(LOC_HOOKS.objects, buildMeadowTiles, 20);

  Object.assign(CATALOG, {
    tree: { build: buildTree, name: 'Деревья', size: '4–10 м', note: 'Ствол, сучья и веточки, на них комки листвы с отдельными листьями. Ясень, клён, берёза, тополь, ива, сухое.', xray: true, leafy: (d) => d.kind !== 'bare' },
    bush: { build: buildBush, name: 'Куст', size: '1–2,3 м', note: 'Стебли из одного корня и листва на них. Сирень, бузина, лещина, шиповник, поросль.', xray: true, midges: true },
    meadow: { build: buildMeadow, name: 'Трава', size: '', note: '', bounds: false },
    grass: { build: buildGrass, name: 'Бурьян', size: 'пятно 2–5 м', note: 'Высокая трава с сухостоем, зонтики сорняков и лопухи у земли.',
      // how far a point is from the edge of the patch (an ellipse rx × rz)
      near: (i, x, z) => Math.max(0, (Math.hypot((x - i.def.at[0]) / i.def.rx, (z - i.def.at[1]) / i.def.rz) - 1) * Math.min(i.def.rx, i.def.rz)) }
  });
