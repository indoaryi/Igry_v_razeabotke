  // ================= people: how they look =================
  // A person stands on the hero's skeleton (hero/skeleton.js): the same bones, poses, walk and gestures. What a person wears is a look:
  //   { id, dims: { … } (changes to the hero's proportions, see dims() in hero/model.js), armor: true (bulky kit: the arms hang off the body),
  //     pieces: [names from PERSON_PIECES], colors: { … } (the pieces read what they need), seed }
  // A piece is a function (put, D, C) that puts parts on bones: put(bone, key, () => mesh, offset in bone space, material, group).
  // The key names the mesh (it is cached by it), so it has to change whenever the shape does. Parts that share a bone, a material and
  // a group are merged into one mesh: the fully kitted soldier is ~7500 triangles in about fifty draws. Groups let an icon show one piece alone.
  const PERSON_PIECES = {};
  const PERSON_MODELS = new Map();
  function buildPerson(look) {
    let model = PERSON_MODELS.get(look.id);
    if (model) return model;
    const D = Object.assign(dims(!!look.armor), look.dims || {}, { armor: !!look.armor });
    const C = look.colors || {};
    const raw = [];
    const put = (bone, key, fn, off, m, group) => raw.push({ bone, mesh: rawMesh('person:' + key, fn), off: off || ID4, mat: m, group: group || 'body' });
    for (const name of look.pieces) PERSON_PIECES[name](put, D, C, look);
    const groups = new Map();
    for (const p of raw) {
      const key = p.bone + '|' + p.mat.key + '|' + p.group + '|' + (p.mesh.lines ? 1 : 0);
      let g = groups.get(key);
      if (!g) { g = { bone: p.bone, mat: p.mat, group: p.group, parts: [] }; groups.set(key, g); }
      g.parts.push(p);
    }
    const R = rng(look.seed || 4711);
    model = {
      look, D,
      parts: [...groups.values()].map((g) => ({ bone: g.bone, mat: g.mat, group: g.group, off: ID4, noShadow: !!g.mat.noShadow || !!g.parts[0].mesh.lines, mesh: upload(mergeRaw(g.parts, R)) }))
    };
    PERSON_MODELS.set(look.id, model);
    return model;
  }
  // a rod (capsule) from a to b in a bone's space, and a plain cylinder
  function personRod(put, bone, key, a, b, r, m, group) {
    const L = len(sub(b, a));
    put(bone, key + ':' + L.toFixed(3) + ',' + r, () => capsule(L, r, r, { seg: 6 }), M(tr(...a), alongMinusY(sub(b, a))), m, group);
  }
  function personCyl(put, bone, key, a, b, r, m, group, seg = 10) {
    const L = len(sub(b, a));
    put(bone, key + ':' + L.toFixed(3) + ',' + r, () => cyl(r, r, L, seg), M(tr(...a), alongPlusY(sub(b, a))), m, group);
  }

  // ---------- КЗУ: a sealed protective kit — camouflage suit, plate carrier, pads, a helmet with a smoked visor and a respirator,
  // a hose to the life-support box on the back, a radio with a whip antenna. After the player's reference (front and back views). ----------
  const KZU_COLORS = {
    camo: '#8b8267', camo2: '#5a6046', web: '#5b5946', pad: '#40433a', glove: '#2c2d29', boot: '#5f5647', sole: '#1e1d1b',
    glass: '#14171b', rubber: '#34362f', hose: '#1b1b1c', box: '#646a50', dark: '#2a2b27'
  };
  function kzuMats(C) {
    const c = Object.assign({}, KZU_COLORS, C);
    // camouflage: blotches of the second colour and of dark brown over the base, light flecks; hard parts are a little glossy
    const camo = (o = {}) => mat(c.camo, Object.assign({ pat: 53, b: c.camo2, p: [9, 0.6, 0.64, 0.94], noise: 0.06, grain: 70 }, o));
    return {
      c,
      cloth: camo(),
      vest: camo({ r: [15, 0, 0, 0] }),                                      // webbing rows across the carrier
      hard: camo({ noise: 0.05, grain: 40, spec: 0.25, gloss: 14 }),
      web: mat(c.web, { noise: 0.1, grain: 80 }),
      pad: mat(c.pad, { noise: 0.06, grain: 40, spec: 0.35, gloss: 16 }),
      glove: mat(c.glove, { noise: 0.08, grain: 70 }),
      boot: mat(c.boot, { pat: 19, b: '#3b352c', p: [0.02, 0.024, -0.035, 55], noise: 0.1, grain: 60, spec: 0.25, gloss: 14 }),
      shaft: mat(c.boot, { pat: 19, b: '#3b352c', p: [0.03, 0.022, -0.19, 50], noise: 0.1, grain: 60, spec: 0.25, gloss: 14 }),
      sole: mat(c.sole, { pat: 23, p: [90, 0, 0, 0], noise: 0.05 }),
      glass: mat(c.glass, { pat: 54, p: [0.6, 0.8, 0.045, 0.011], noise: 0.02, spec: 1.1, gloss: 34 }),
      rubber: mat(c.rubber, { noise: 0.06, grain: 60, spec: 0.3, gloss: 12 }),
      hose: mat(c.hose, { pat: 23, p: [110, 0, 0, 0], noise: 0.04, spec: 0.4, gloss: 16 }),
      box: mat(c.box, { pat: 55, p: [0.06, 0.085, -0.08, -0.01], r: [60, 0, 0, 0], noise: 0.08, grain: 45, spec: 0.35, gloss: 14 }),
      boxPlain: mat(c.box, { noise: 0.08, grain: 45, spec: 0.35, gloss: 14 }),
      dark: mat(c.dark, { noise: 0.05, spec: 0.4, gloss: 16 }),
      cable: mat(COL.cable, { noise: 0.02, spec: 0.4, gloss: 18 }),
      metal: mat('#7c7e77', { noise: 0.04, spec: 0.9, gloss: 10 })
    };
  }
  const KZU_MATS = new Map();
  const kzu = (C) => { const k = JSON.stringify(C || {}); if (!KZU_MATS.has(k)) KZU_MATS.set(k, kzuMats(C)); return KZU_MATS.get(k); };
  const SIDES = [['l', 1], ['r', -1]];

  // the suit: jacket, sleeves, trousers
  PERSON_PIECES.kzuSuit = (put, D, C) => {
    const K = kzu(C), dk = D.w.toFixed(3) + D.d.toFixed(3);
    put('chest', 'kzu:torso' + dk, () => torsoMesh(D, 0.02, -0.33), null, K.cloth);
    put('chest', 'kzu:seal', () => tube([{ a: 0.27, hu: 0.13, hv: 0.105, cv: -0.012 }, { a: 0.31, hu: 0.105, hv: 0.095, cv: -0.012 }, { a: 0.35, hu: 0.085, hv: 0.08, cv: -0.012 }]), null, K.rubber);
    for (const [s, sg] of SIDES) {
      put(s + 'Up', 'kzu:delt', () => ellipsoid(0.074, 0.078, 0.072, { seg: 12, rings: 7 }), tr(0, -0.035, 0), K.cloth);
      put(s + 'Up', 'kzu:sleeve' + D.upper, () => capsule(D.upper, 0.065, 0.057), null, K.cloth);
      put(s + 'Lo', 'kzu:fore', () => capsule(0.24, 0.057, 0.048), null, K.cloth);
      put(s + 'Thigh', 'kzu:thigh' + D.thigh, () => capsule(D.thigh, 0.1, 0.077), null, K.cloth);
      put(s + 'Shin', 'kzu:shin', () => capsule(0.27, 0.075, 0.072), null, K.cloth);
    }
    // a cargo pocket on the outside of the left thigh (the right one carries the holster)
    put('lThigh', 'kzu:pocket', () => box(0.022, 0.06, 0.055), tr(0.1, -0.2, 0.004), K.cloth);
    put('hips', 'kzu:pelvis' + dk, () => loft([
      { a: -0.13, hu: 0.11 * D.w + 0.01, hv: 0.075 * D.d + 0.01 }, { a: -0.09, hu: 0.155 * D.w + 0.026, hv: 0.105 * D.d + 0.026 },
      { a: -0.02, hu: 0.168 * D.w + 0.028, hv: 0.115 * D.d + 0.028, cv: 0.004 }, { a: 0.06, hu: 0.165 * D.w + 0.028, hv: 0.118 * D.d + 0.028, cv: 0.008 },
      { a: 0.12, hu: 0.16 * D.w + 0.028, hv: 0.115 * D.d + 0.028, cv: 0.008 }], { seg: 14, exp: 2.4, capAAt: -0.15, capBAt: 0.13 }), null, K.cloth);
  };
  // the plate carrier: a chamfered shell round the chest, magazine pouches and an admin pouch in front, shoulder straps
  PERSON_PIECES.kzuVest = (put, D, C) => {
    const K = kzu(C);
    put('chest', 'kzu:vest', () => facets([
      { a: -0.2, x0: -0.208, x1: 0.208, b0: -0.142, b1: 0.18, c: 0.05 },
      { a: 0.04, x0: -0.24, x1: 0.24, b0: -0.166, b1: 0.192, c: 0.06 },
      { a: 0.17, x0: -0.242, x1: 0.242, b0: -0.166, b1: 0.182, c: 0.06 },
      { a: 0.238, x0: -0.2, x1: 0.2, b0: -0.156, b1: 0.16, c: 0.05 }]), null, K.vest);
    for (const x of [-0.105, 0, 0.105]) {
      put('chest', 'kzu:mag', () => box(0.044, 0.054, 0.022), tr(x, -0.03, 0.212), K.cloth);
      put('chest', 'kzu:magFlap', () => box(0.046, 0.012, 0.024), tr(x, 0.026, 0.212), K.web);
    }
    put('chest', 'kzu:admin', () => box(0.088, 0.034, 0.016), tr(0, 0.105, 0.2), K.cloth);
    for (const [, sg] of SIDES) {
      put('chest', 'kzu:strap', () => box(0.034, 0.012, 0.145), M(tr(sg * 0.125, 0.29, -0.005), rz(sg * 0.32)), K.web);
      put('chest', 'kzu:sidePouch', () => box(0.026, 0.05, 0.045), tr(sg * 0.255, -0.02, 0.03), K.web);
    }
  };
  // pads: two-piece shoulder pads, elbow and knee pads, forearm and shin guards, a groin plate hanging from the carrier
  PERSON_PIECES.kzuPads = (put, D, C) => {
    const K = kzu(C);
    for (const [s, sg] of SIDES) {
      put(s + 'Up', 'kzu:paul', () => ellipsoid(0.11, 0.092, 0.114, { half: true, seg: 14, rings: 5 }), tr(sg * 0.026, -0.045, 0), K.hard);
      put(s + 'Up', 'kzu:paul2', () => ellipsoid(0.088, 0.07, 0.094, { half: true, seg: 14, rings: 4 }), M(tr(sg * 0.036, -0.112, 0), rz(sg * 0.12)), K.hard);
      put(s + 'Lo', 'kzu:elbow', () => ellipsoid(0.056, 0.062, 0.05, { seg: 10, rings: 6 }), tr(0, -0.004, -0.026), K.pad);
      put(s + 'Lo', 'kzu:guard', () => loft([{ a: -0.215, hu: 0.06, hv: 0.058 }, { a: -0.12, hu: 0.066, hv: 0.064 }, { a: -0.06, hu: 0.064, hv: 0.062 }], { seg: 12, exp: 2.6, capAAt: -0.22, capBAt: -0.055 }), null, K.hard);
      put(s + 'Shin', 'kzu:knee', () => ellipsoid(0.074, 0.084, 0.052, { seg: 12, rings: 6 }), tr(0, -0.025, 0.07), K.pad);
      put(s + 'Shin', 'kzu:kneeStrap', () => tube([{ a: -0.07, hu: 0.081, hv: 0.079 }, { a: -0.052, hu: 0.081, hv: 0.079 }], 12), null, K.dark);
      put(s + 'Shin', 'kzu:shinGuard' + D.shin, () => loft([{ a: -D.shin + 0.12, hu: 0.08, hv: 0.08, cv: 0.008 }, { a: -0.2, hu: 0.084, hv: 0.086, cv: 0.01 }, { a: -0.11, hu: 0.08, hv: 0.082, cv: 0.008 }], { seg: 12, exp: 2.6, capAAt: -D.shin + 0.11, capBAt: -0.1 }), null, K.hard);
      for (const y of [-0.17, -0.27]) put(s + 'Shin', 'kzu:shinStrap' + y, () => tube([{ a: y - 0.009, hu: 0.087, hv: 0.089, cv: 0.009 }, { a: y + 0.009, hu: 0.087, hv: 0.089, cv: 0.009 }], 12), null, K.dark);
    }
    put('hips', 'kzu:groin', () => facets([
      { a: -0.21, x0: -0.07, x1: 0.07, b0: 0.13, b1: 0.152, c: 0.012 },
      { a: 0.0, x0: -0.11, x1: 0.11, b0: 0.156, b1: 0.18, c: 0.012 },
      { a: 0.04, x0: -0.11, x1: 0.11, b0: 0.158, b1: 0.182, c: 0.012 }]), null, K.hard);
  };
  // the belt with pouches round it, a holster on the right thigh
  PERSON_PIECES.kzuBelt = (put, D, C) => {
    const K = kzu(C);
    const bu = 0.175 * D.w + 0.04, bv = 0.122 * D.d + 0.04;
    put('hips', 'kzu:belt' + D.w, () => tube([{ a: 0.045, hu: bu, hv: bv, cv: 0.008 }, { a: 0.105, hu: bu - 0.002, hv: bv - 0.002, cv: 0.008 }]), null, K.web);
    for (const th of [1.0, -1.0, 1.75, -1.75, 2.5, -2.5]) put('hips', 'kzu:beltPouch' + th, () => box(0.034, 0.04, 0.026), M(tr(Math.sin(th) * (bu + 0.018), 0.05, Math.cos(th) * (bv + 0.018) + 0.008), ry(th)), Math.abs(th) > 2 ? K.cloth : K.web);
    put('rThigh', 'kzu:holster', () => box(0.026, 0.08, 0.046), tr(-0.118, -0.11, 0.008), K.dark);
    put('rThigh', 'kzu:pistol', () => box(0.016, 0.04, 0.022), M(tr(-0.122, 0.0, -0.01), rx(-0.35)), K.dark);
    for (const y of [-0.06, -0.16]) put('rThigh', 'kzu:legStrap' + y, () => tube([{ a: y - 0.01, hu: 0.104, hv: 0.084 }, { a: y + 0.01, hu: 0.102, hv: 0.082 }], 12), null, K.web);
  };
  PERSON_PIECES.kzuGloves = (put, D, C) => {
    const K = kzu(C);
    for (const [s] of SIDES) {
      put(s + 'Hand', 'kzu:cuff', () => capsule(0.07, 0.052, 0.046, { seg: 10 }), tr(0, 0.05, 0), K.glove);
      put(s + 'Hand', 'kzu:palm', () => ellipsoid(0.03, 0.056, 0.047, { seg: 10, rings: 6, exp: 2.4 }), tr(0, -0.01, 0.004), K.glove);
      put(s + 'Hand', 'kzu:thumb', () => capsule(0.036, 0.014, 0.012, { seg: 6 }), M(tr(0, 0.016, 0.036), rx(-0.9)), K.glove);
    }
  };
  PERSON_PIECES.kzuBoots = (put, D, C) => {
    const K = kzu(C);
    for (const [s] of SIDES) {
      put(s + 'Foot', 'kzu:boot', () => loft([
        { a: -0.085, hu: 0.05, hv: 0.044, cv: -0.056 }, { a: -0.07, hu: 0.062, hv: 0.066, cv: -0.032 },
        { a: -0.01, hu: 0.066, hv: 0.084, cv: -0.012 }, { a: 0.075, hu: 0.066, hv: 0.062, cv: -0.036 },
        { a: 0.155, hu: 0.062, hv: 0.048, cv: -0.05 }, { a: 0.215, hu: 0.05, hv: 0.037, cv: -0.06 }], { axis: 'z', seg: 12, exp: 2.6, capAAt: -0.093, capBAt: 0.228 }),
        null, K.boot);
      put(s + 'Foot', 'kzu:sole', () => loft([{ a: -0.09, hu: 0.054, hv: 0.018, cv: -0.086 }, { a: -0.065, hu: 0.068, hv: 0.018, cv: -0.086 }, { a: 0.155, hu: 0.068, hv: 0.018, cv: -0.086 }, { a: 0.225, hu: 0.054, hv: 0.016, cv: -0.086 }], { axis: 'z', seg: 10, exp: 3, capAAt: -0.097, capBAt: 0.232 }),
        null, K.sole);
      put(s + 'Shin', 'kzu:shaft' + D.shin, () => capsule(0.17, 0.072, 0.07), tr(0, -D.shin + 0.17, 0), K.shaft);
    }
  };
  // the helmet: a round shell under a camouflage cover, a big smoked visor in a dark rim, the respirator below it,
  // rails and comm cups on the sides, a mount on the brow, a battery on the back
  PERSON_PIECES.kzuHelmet = (put, D, C) => {
    const K = kzu(C), H = (x, y, z) => tr(HC[0] + x, HC[1] + y, HC[2] + z), g = 'helmet';
    put('head', 'kzu:shell', () => ellipsoid(0.152, 0.168, 0.162, { exp: 2.2, seg: 18, rings: 10 }), H(0, 0.012, -0.014), K.hard, g);
    // the visor takes the whole face, brow to chin; the respirator shows through its lower part and juts out under it
    put('head', 'kzu:visor', () => ellipsoid(0.13, 0.114, 0.09, { seg: 18, rings: 9 }), H(0, 0.006, 0.088), K.glass, g);
    put('head', 'kzu:rim', () => tube([{ a: -0.007, hu: 0.133, hv: 0.116 }, { a: 0.007, hu: 0.131, hv: 0.114 }], 18, 2), M(H(0, 0.006, 0.112), rx(Math.PI / 2)), K.dark, g);
    put('head', 'kzu:mask', () => ellipsoid(0.066, 0.05, 0.05, { seg: 12, rings: 6 }), H(0, -0.088, 0.136), K.rubber, g);
    put('head', 'kzu:port', () => cyl(0.026, 0.026, 0.03, 10), M(H(0, -0.098, 0.17), alongPlusY([0, -0.2, 1])), K.dark, g);
    put('head', 'kzu:valve', () => cyl(0.017, 0.017, 0.026, 8), M(H(-0.05, -0.1, 0.155), alongPlusY([-0.65, -0.1, 0.75])), K.dark, g);
    for (const [, sg] of SIDES) {
      put('head', 'kzu:rail', () => box(0.012, 0.022, 0.085), H(sg * 0.152, 0.045, -0.012), K.dark, g);
      put('head', 'kzu:cup', () => cyl(0.046, 0.046, 0.024, 12), M(H(sg * 0.14, -0.01, -0.01), alongPlusY([sg, 0, 0])), K.pad, g);
    }
    put('head', 'kzu:mount', () => box(0.034, 0.026, 0.018), M(H(0, 0.152, 0.11), rx(0.55)), K.dark, g);
    put('head', 'kzu:battery', () => box(0.05, 0.034, 0.022), H(0, 0.07, -0.172), K.web, g);
  };
  // the life-support box on a frame on the back, canisters on both sides, a pouch under it, a radio with a whip antenna,
  // cables, and the ribbed hose from the respirator over the left shoulder into the box
  PERSON_PIECES.kzuPack = (put, D, C) => {
    const K = kzu(C), g = 'pack';
    put('chest', 'kzu:frame', () => box(0.15, 0.19, 0.012), tr(0, 0.1, -0.182), K.dark, g);
    put('chest', 'kzu:box', () => box(0.13, 0.115, 0.065), M(tr(0, 0.165, -0.258), ry(Math.PI)), K.box, g);
    put('chest', 'kzu:lid', () => box(0.136, 0.012, 0.07), tr(0, 0.286, -0.258), K.dark, g);
    for (const [, sg] of SIDES) {
      personCyl(put, 'chest', 'kzu:can', [sg * 0.168, -0.06, -0.24], [sg * 0.168, 0.2, -0.24], 0.032, K.dark, g);
      personCyl(put, 'chest', 'kzu:canCap', [sg * 0.168, 0.2, -0.24], [sg * 0.168, 0.23, -0.24], 0.026, K.metal, g);
    }
    put('chest', 'kzu:lowPouch', () => box(0.115, 0.062, 0.052), tr(0, -0.035, -0.248), K.cloth, g);
    put('chest', 'kzu:lowFlap', () => box(0.118, 0.014, 0.055), tr(0, 0.022, -0.249), K.web, g);
    put('chest', 'kzu:radio', () => box(0.03, 0.085, 0.028), tr(-0.205, 0.2, -0.215), K.boxPlain, g);
    personRod(put, 'chest', 'kzu:antenna', [-0.205, 0.78, -0.215], [-0.205, 0.28, -0.215], 0.0065, K.cable, g);
    const cable = (key, pts) => put('chest', 'kzu:' + key, () => tubeAlong(smoothPath(pts, 5), 0.0085, 5), null, K.cable, g);
    cable('cab1', [[0.1, 0.25, -0.325], [0.15, 0.22, -0.31], [0.17, 0.17, -0.27]]);
    cable('cab2', [[-0.1, 0.24, -0.325], [-0.17, 0.25, -0.28], [-0.2, 0.2, -0.24]]);
    cable('cab3', [[-0.06, 0.06, -0.325], [-0.12, 0.02, -0.3], [-0.168, -0.02, -0.272]]);
    // the hose: from the left side of the mask, down in front of the collarbone, over the left shoulder, down into the box
    put('chest', 'kzu:hose', () => tubeAlong(smoothPath([[0.045, 0.385, 0.15], [0.125, 0.345, 0.172], [0.205, 0.345, 0.08], [0.21, 0.366, -0.06], [0.152, 0.336, -0.19], [0.075, 0.298, -0.25]], 6), 0.023, 7), null, K.hose, g);
  };
  PERSON_PIECES.kzuNeck = (put, D, C) => {
    const K = kzu(C);
    put('neck', 'kzu:neck', () => capsule(0.12, 0.07, 0.074), tr(0, 0.07, -0.006), K.rubber);
  };
  // the whole kit, ready to wear
  const KZU_LOOK = {
    id: 'kzu', armor: true, seed: 4711,
    dims: { sx: 0.226, shY: 0.256, hipX: 0.1, chestY: 0.185, neckY: 0.325, upper: 0.285, fore: 0.3, thigh: 0.425, shin: 0.395, sole: -0.1 },
    pieces: ['kzuSuit', 'kzuNeck', 'kzuVest', 'kzuPads', 'kzuBelt', 'kzuGloves', 'kzuBoots', 'kzuHelmet', 'kzuPack']
  };
