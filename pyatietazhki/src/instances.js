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
      id: nextId++, def, type: def.type, T, M0, yaw0, built, chunks, bb, active,
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
    for (const i of INST) instById.set(i.id, i);
  }
  const groundY = (x, z) => { let y = 0; for (const h of HEIGHTS) if (x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1) y = Math.max(y, h.y); return y; };

