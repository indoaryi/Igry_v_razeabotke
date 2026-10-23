  // ================= static scenery: kits of parts baked into a few merged meshes =================
  // A kit collects parts in object space; bake() moves them to the world and merges them by material,
  // so a whole building costs only a handful of draw calls.
  class Kit {
    constructor(seed) { this.parts = []; this.R = rng(seed || 1); }
    put(raw, model, m, seed) { this.parts.push({ raw, model: model || ID4, mat: m, seed: seed ?? this.R() }); return this; }
    box(m, c, h, rot, seed) {
      const raw = rawMesh('b' + h[0].toFixed(3) + ',' + h[1].toFixed(3) + ',' + h[2].toFixed(3), () => box(h[0], h[1], h[2]));
      return this.put(raw, rot ? M(tr(c[0], c[1], c[2]), rot) : tr(c[0], c[1], c[2]), m, seed);
    }
    boxMM(m, x0, y0, z0, x1, y1, z1, seed) { return this.box(m, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2], null, seed); }
    rod(m, a, b, r, seg = 8, seed) {
      const L = len(sub(b, a));
      const raw = rawMesh('c' + r.toFixed(3) + ',' + L.toFixed(3) + ',' + seg, () => cyl(r, r, L, seg));
      return this.put(raw, M(tr(a[0], a[1], a[2]), alongPlusY(sub(b, a))), m, seed);
    }
    mesh(key, fn, m, model, seed) { return this.put(rawMesh(key, fn), model, m, seed); }
    lines(m, segs) { return this.put(lineMesh(segs), ID4, m, 0); }
  }
  function bake(kit, M0) {
    const groups = new Map();
    for (const p of kit.parts) {
      const key = p.mat.key * 2 + (p.raw.lines ? 1 : 0);
      let g = groups.get(key);
      if (!g) { g = { mat: p.mat, lines: !!p.raw.lines, parts: [], nv: 0, ni: 0 }; groups.set(key, g); }
      g.parts.push(p); g.nv += p.raw.pos.length / 3; g.ni += p.raw.idx.length;
    }
    const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    const chunks = [];
    for (const g of groups.values()) {
      const pos = new Float32Array(g.nv * 3), nr = new Float32Array(g.nv * 3), loc = new Float32Array(g.nv * 3), seed = new Float32Array(g.nv);
      const idx = new Uint32Array(g.ni);
      let vo = 0, io = 0;
      for (const p of g.parts) {
        const Mw = mul(M0, p.model), r = p.raw, n = r.pos.length / 3;
        for (let i = 0; i < n; i++) {
          const x = r.pos[i * 3], y = r.pos[i * 3 + 1], z = r.pos[i * 3 + 2];
          const wx = Mw[0] * x + Mw[4] * y + Mw[8] * z + Mw[12], wy = Mw[1] * x + Mw[5] * y + Mw[9] * z + Mw[13], wz = Mw[2] * x + Mw[6] * y + Mw[10] * z + Mw[14];
          const j = (vo + i) * 3;
          pos[j] = wx; pos[j + 1] = wy; pos[j + 2] = wz;
          loc[j] = x; loc[j + 1] = y; loc[j + 2] = z;
          const nx = r.nrm[i * 3], ny = r.nrm[i * 3 + 1], nz = r.nrm[i * 3 + 2];
          nr[j] = Mw[0] * nx + Mw[4] * ny + Mw[8] * nz; nr[j + 1] = Mw[1] * nx + Mw[5] * ny + Mw[9] * nz; nr[j + 2] = Mw[2] * nx + Mw[6] * ny + Mw[10] * nz;
          seed[vo + i] = p.seed;
          if (wx < bb[0]) bb[0] = wx; if (wy < bb[1]) bb[1] = wy; if (wz < bb[2]) bb[2] = wz;
          if (wx > bb[3]) bb[3] = wx; if (wy > bb[4]) bb[4] = wy; if (wz > bb[5]) bb[5] = wz;
        }
        for (let i = 0; i < r.idx.length; i++) idx[io + i] = r.idx[i] + vo;
        vo += n; io += r.idx.length;
      }
      chunks.push({ mesh: upload({ pos, nrm: nr, loc, seed, idx, lines: g.lines }), mat: g.mat, lines: g.lines });
    }
    return { chunks, bb };
  }
  // screen rectangle (world art px) of an axis-aligned world box, and of its shadow on the ground
  function screenRect(bb) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const X of [bb[0], bb[3]]) for (const Y of [bb[1], bb[4]]) for (const Z of [bb[2], bb[5]]) {
      const [sx, sy] = wpx([X, Y, Z]);
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return [x0 - 2, y0 - 2, x1 + 2, y1 + 2];
  }
  function shadowRect(bb) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const X of [bb[0], bb[3]]) for (const Y of [bb[1], bb[4]]) for (const Z of [bb[2], bb[5]]) {
      const P = [X - SUN[0] * Y / SUN[1], 0, Z - SUN[2] * Y / SUN[1]];
      const [sx, sy] = wpx(P);
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return [x0 - 2, y0 - 2, x1 + 2, y1 + 2];
  }
  const rectsHit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
