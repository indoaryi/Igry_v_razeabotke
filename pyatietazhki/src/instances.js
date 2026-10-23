  // ================= instances: each map entry built, baked into world space and given an id =================
  const INST = [];
  const HEIGHTS = [];    // walkable raised areas (porches, steps)
  let nextId = 2;
  const ACTIVE = new Set(['swing', 'pullbar', 'slide', 'platform', 'hoop', 'towers', 'garage', 'substation', 'grass', 'bench', 'entrance']);
  function toWorld2(M0, p) { const w = xf(M0, [p[0], 0, p[1]]); return [w[0], w[2]]; }
  function instantiate(def, parentM) {
    const T = CATALOG[def.type];
    const built = T.build(def);
    const rot = (def.rot || 0) * Math.PI / 180;
    const M0 = parentM ? M(parentM, tr(def.local[0], 0, def.local[1])) : M(tr(def.at[0], 0, def.at[1]), ry(rot));
    const yaw0 = Math.atan2(M0[8], M0[10]);
    const { chunks, bb } = bake(built.kit, M0);
    const active = ACTIVE.has(def.type) && !(def.type === 'swing' && def.plain);
    const inst = {
      id: def.type === 'meadow' ? 0 : nextId++, def, type: def.type, T, M0, yaw0, built, chunks, bb, active,
      sr: screenRect(bb), shr: shadowRect(bb), n: def.n || 0, dyn: {},
      center: [(bb[0] + bb[3]) / 2, (bb[2] + bb[5]) / 2]
    };
    inst.blocks = (built.blocks || []).map((b) => b.rect ? { poly: [[b.rect[0], b.rect[1]], [b.rect[2], b.rect[1]], [b.rect[2], b.rect[3]], [b.rect[0], b.rect[3]]].map((p) => toWorld2(M0, p)) } : { c: toWorld2(M0, b.c), r: b.r });
    inst.spots = (built.spots || []).map((s) => Object.assign({}, s, { w: toWorld2(M0, s.at), wyaw: wrapA(yaw0 + s.yaw) }));
    for (const h of built.heights || []) {
      const ps = [[h.rect[0], h.rect[1]], [h.rect[2], h.rect[3]]].map((p) => toWorld2(M0, p));
      HEIGHTS.push({ x0: Math.min(ps[0][0], ps[1][0]), x1: Math.max(ps[0][0], ps[1][0]), z0: Math.min(ps[0][1], ps[1][1]), z1: Math.max(ps[0][1], ps[1][1]), y: h.y });
    }
    for (const c of chunks) {
      const m = c.mat;
      c.flags = (m.fl || 0) | (active ? 2 : 0) | (m.fade ? 8 : 0);
      c.fade = !!m.fade; c.shadow = !m.noShadow && !c.lines;
    }
    INST.push(inst);
    for (const ch of built.children || []) instantiate(Object.assign({}, ch, { parent: inst }), M0);
    return inst;
  }
  const byType = (t) => INST.filter((i) => i.type === t);
  const instById = new Map();
  function buildWorld() {
    for (const d of MAP.objects) instantiate(d);
    // power lines: pole → substation, pole → the far block's wall, pole → the near block's corner
    const pole = byType('pole')[0], sub = byType('substation')[0];
    const pa = pole.built.attach.map((p) => xf(pole.M0, p)), sa = sub.built.attach.map((p) => xf(sub.M0, p));
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push([pa[i], sa[i], 0.35]);
    runs.push([pa[0], [15.6, 6.4, 1.08], 0.45], [pa[2], [16.2, 6.4, 1.08], 0.45]);
    runs.push([pa[1], [2.12, 7.4, 9.6], 0.7]);
    instantiate({ type: 'wires', at: [0, 0], rot: 0, runs });
    buildMeadowTiles();
    for (const i of INST) if (i.id) instById.set(i.id, i);
  }
  // grass everywhere it can grow: off the paths, out of the objects' footprints, thinner under trees
  // distance from a point to the nearest trodden path of the map
  const PATH_SEGS = [];
  for (const pl of MAP.paths) for (let i = 0; i < pl.length - 1; i++) PATH_SEGS.push([pl[i], pl[i + 1]]);
  function pathDist(x, z) {
    let best = 99;
    for (const [a, b] of PATH_SEGS) {
      const ex = b[0] - a[0], ez = b[1] - a[1], u = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez), 0, 1);
      best = Math.min(best, (x - a[0] - ex * u) ** 2 + (z - a[1] - ez * u) ** 2);
    }
    return Math.sqrt(best);
  }
  function buildMeadowTiles() {
    const pathD = pathDist;
    const solid = INST.filter((i) => i.blocks && i.blocks.length);
    const blocked = (x, z) => {
      for (const i of solid) for (const b of i.blocks) if (b.poly ? pointInPoly(x, z, b.poly) : Math.hypot(x - b.c[0], z - b.c[1]) < b.r + 0.05) return true;
      return false;
    };
    // how close a point is to something weeds like to hug: walls and big objects, the asphalt and concrete edges
    const hug = INST.filter((i) => ['block5', 'substation', 'garage', 'towers', 'entrance', 'pole', 'tires'].includes(i.type));
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
    for (let tz = 0; tz < MAP.size[1]; tz += 6) for (let tx = 0; tx < MAP.size[0]; tx += 6) instantiate({ type: 'meadow', at: [0, 0], rot: 0, tile: [tx, tz, 6], pathD, blocked, shadeOf, edgeDist });
  }
  const groundY = (x, z) => { let y = 0; for (const h of HEIGHTS) if (x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1) y = Math.max(y, h.y); return y; };

