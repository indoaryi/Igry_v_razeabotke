  // ================= catalog, part two: what the yard with birches needs =================
  // golden weeping birches, a young rowan, autumn grass
  TREE.birchGold = { h: 13, bole: 3.0, r0: 0.21, w: 2.9, up: 0.8, limbs: 6, cl: [0.2, 0.36], per: 2.3, dens: 17, leaf: '#c9a13a', aut: '#7b8a3c', af: 0.14, bark: '#e3e0d8', birch: true, droop: 0.95, weep: 0.75, solid: 0.34 };
  TREE.rowan = { h: 4.8, bole: 1.3, r0: 0.09, w: 1.7, up: 0.6, limbs: 4, cl: [0.2, 0.34], per: 1.8, dens: 12, leaf: '#a29c3f', aut: '#c4532a', af: 0.32, bark: '#6d6259', solid: 0.36 };
  const MEADOW_AUTUMN = {
    lawn: tuftMat('#5e6c34', '#ab9c59', 0.16), lush: tuftMat('#56682f', '#ab9c59', 0.1),
    rough: tuftMat('#6a6935', '#bba962', 0.42), dry: tuftMat('#8a8248', '#c9b66d', 0.7)
  };

  // ---------- rusty metal garage with a gable roof ----------
  // local frame: 3.2 m wide (x), 5.6 m long (z), doors at +z
  function buildMetalGarage(o) {
    const k = new Kit(o.seed || 95);
    const W = 3.2, Lg = 5.6, Hw = 2.1, Hr = 2.52, ov = 0.14;
    const steel = mat(o.color || '#7a3a2b', { pat: 38, b: '#52301f', p: [3.5, 0.82, 0, 0], noise: 0.06, grain: 50, spec: 0.2, gloss: 10 });
    const dirty = mat('#5e3024', { pat: 38, b: '#3f281c', p: [6, 0.7, 0, 0], noise: 0.08, grain: 50 });
    const seam = mat('#4a2218', { noise: 0.03 });
    const roofM = mat('#6d4f45', { pat: 34, noise: 0.06, grain: 30 });
    const trim = mat('#5a463e', { noise: 0.05 });
    const iron = mat('#2f2c2a', { noise: 0.04, spec: 0.4, gloss: 12 });
    k.boxMM(steel, -W / 2, 0, -Lg / 2, W / 2, Hw, Lg / 2);
    // splash of dirt along the bottom and the sheet joints
    k.boxMM(dirty, -W / 2 - 0.004, 0, -Lg / 2 - 0.004, W / 2 + 0.004, 0.24, Lg / 2 + 0.004);
    for (let z = -Lg / 2 + 1.12; z < Lg / 2 - 0.3; z += 1.12) for (const sg of [-1, 1]) k.boxMM(seam, sg * W / 2 - 0.012, 0.03, z - 0.012, sg * W / 2 + 0.012, Hw - 0.02, z + 0.012);
    for (const sg of [-1, 1]) k.boxMM(seam, sg * W / 2 - 0.01, 0.53, -Lg / 2, sg * W / 2 + 0.01, 0.55, Lg / 2);
    k.boxMM(seam, -W / 2 - 0.01, 0.53, -Lg / 2 - 0.01, W / 2 + 0.01, 0.55, -Lg / 2 + 0.01);
    // gable roof: two sloping sheets overhanging all round, a ridge cap and triangular gable ends
    const th = Math.atan2(Hr - Hw, W / 2), e = W / 2 + ov, hl = e / Math.cos(th) / 2;
    for (const sg of [-1, 1]) k.box(roofM, [sg * e / 2, Hr - (e / 2) * Math.tan(th) + 0.02, 0], [hl, 0.025, Lg / 2 + ov], rz(-sg * th));
    k.boxMM(trim, -0.06, Hr - 0.01, -Lg / 2 - ov, 0.06, Hr + 0.05, Lg / 2 + ov);
    for (const sg of [-1, 1]) k.box(trim, [sg * (e - 0.01), Hw - ov * Math.tan(th) - 0.01, 0], [0.02, 0.04, Lg / 2 + ov]);
    k.mesh('gableF', () => polyMesh([[[-W / 2, Hw, 0], [W / 2, Hw, 0], [0, Hr, 0]]]), steel, tr(0, 0, Lg / 2));
    k.mesh('gableB', () => polyMesh([[[W / 2, Hw, 0], [-W / 2, Hw, 0], [0, Hr, 0]]]), steel, tr(0, 0, -Lg / 2));
    // double doors at the front: frame, the gap between the leaves, hinges, a hasp with a padlock
    const z1 = Lg / 2 + 0.006;
    for (const x of [-1.42, 1.42]) k.boxMM(seam, x - 0.03, 0.06, z1 - 0.01, x + 0.03, 1.98, z1 + 0.012);
    k.boxMM(seam, -1.45, 1.96, z1 - 0.01, 1.45, 2.02, z1 + 0.012);
    k.boxMM(iron, -0.012, 0.08, z1, 0.012, 1.96, z1 + 0.016);
    for (const x of [-1.4, 1.4]) for (const y of [0.4, 1.0, 1.6]) k.mesh('hinge', () => cyl(0.025, 0.025, 0.14, 6), iron, tr(x, y - 0.07, z1 + 0.02));
    k.boxMM(iron, -0.14, 0.98, z1, 0.14, 1.04, z1 + 0.03);
    k.boxMM(mat('#8d8f8c', { noise: 0.04, spec: 0.6, gloss: 14 }), -0.05, 0.88, z1 + 0.02, 0.05, 0.97, z1 + 0.05);
    k.mesh('shackle', () => torus(0.03, 0.007, 10, 4), mat('#a9abaa', { noise: 0, spec: 0.8, gloss: 14 }), M(tr(0, 0.98, z1 + 0.035), rx(Math.PI / 2)));
    // notices and tags on the long side that faces the lawn (local −x) and on the doors
    decalOn(k, 'garPoster1', [-W / 2 - 0.004, 1.62, -1.75], '-x');
    decalOn(k, 'garPoster2', [-W / 2 - 0.004, 1.58, -1.2], '-x');
    decalOn(k, 'garTorn', [-W / 2 - 0.004, 1.15, -1.62], '-x');
    decalOn(k, 'garTag', [-W / 2 - 0.004, 1.18, 0.35], '-x');
    decalOn(k, 'garTag2', [-W / 2 - 0.004, 0.78, 1.6], '-x');
    decalOn(k, 'garTag2', [0.65, 1.15, z1 + 0.004], 'z');
    // half a brick under each corner, the way these garages are levelled
    const brickM = mat('#9a4c39', { noise: 0.1, grain: 40 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.boxMM(brickM, sx * W / 2 - 0.13, -0.02, sz * Lg / 2 - 0.07, sx * W / 2 + 0.05, 0.05, sz * Lg / 2 + 0.07);
    return {
      kit: k, blocks: [{ rect: [-W / 2 - 0.08, -Lg / 2 - 0.08, W / 2 + 0.08, Lg / 2 + 0.08] }],
      spots: [{ kind: 'door', at: [0.35, Lg / 2 + 0.72], yaw: Math.PI }, { kind: 'side', at: [-W / 2 - 0.75, -1.4], yaw: Math.PI / 2 }]
    };
  }

  // ---------- cars: one builder, a few body shapes ----------
  // half wheelbase ax, wheel radius wr; heights: sill, bumper, belt (window line), hood at the back and the front, rear deck, roof;
  // the glasshouse runs from gR0 (rear window foot) through gR1, gF1 (roof ends) to gF0 (windscreen foot); doors: shut lines along z
  const CARS = {
    sedan: { L: 4.42, W: 1.74, wr: 0.31, ax: 1.34, sill: 0.3, bumper: 0.36, belt: 0.92, hoodB: 0.9, hoodF: 0.8, rear: 0.9, roof: 1.44, gR0: -1.6, gR1: -0.95, gF1: 0.32, gF0: 0.98, exp: 5.5, bp: 0.0, cp: -9.5, doors: [0.98, 0.0, -1.0], plastic: false, rails: false },
    hatch: { L: 4.12, W: 1.76, wr: 0.33, ax: 1.3, sill: 0.37, bumper: 0.42, belt: 0.97, hoodB: 0.96, hoodF: 0.86, rear: 0.98, roof: 1.55, gR0: -1.96, gR1: -1.72, gF1: 0.28, gF0: 0.96, exp: 5, bp: -0.05, cp: -1.22, doors: [0.95, -0.05, -1.08], plastic: true, rails: true },
    boxy: { L: 3.8, W: 1.68, wr: 0.34, ax: 1.11, sill: 0.43, bumper: 0.5, belt: 1.06, hoodB: 1.03, hoodF: 0.99, rear: 1.06, roof: 1.64, gR0: -1.87, gR1: -1.8, gF1: 0.4, gF0: 0.63, exp: 9, bp: -0.38, cp: -9.5, doors: [0.6, -0.42, -9.5], plastic: true, rails: false },
    suv: { L: 4.5, W: 1.84, wr: 0.36, ax: 1.36, sill: 0.41, bumper: 0.45, belt: 1.03, hoodB: 1.01, hoodF: 0.93, rear: 1.05, roof: 1.67, gR0: -2.06, gR1: -1.86, gF1: 0.3, gF0: 1.0, exp: 5.5, bp: 0.0, cp: -1.16, doors: [1.0, 0.0, -1.1], plastic: true, rails: true }
  };
  function carBodyMesh(c) {
    const h = c.L / 2, w = c.W / 2, ax = c.ax, wr = c.wr, arch = wr * 2 + 0.04, rings = [];
    const ring = (z, hu, yb, yt) => rings.push({ a: z, hu, hv: (yt - yb) / 2, cv: (yt + yb) / 2 });
    ring(-h, w - 0.1, c.bumper, c.rear - 0.14);
    ring(-h + 0.13, w - 0.015, c.sill, c.rear);
    ring(-ax - wr - 0.13, w, c.sill, c.belt);
    ring(-ax - wr + 0.04, w, arch, c.belt);
    ring(-ax + wr - 0.04, w, arch, c.belt);
    ring(-ax + wr + 0.13, w, c.sill, c.belt);
    ring(ax - wr - 0.13, w, c.sill, c.hoodB);
    ring(ax - wr + 0.04, w, arch, c.hoodB - (c.hoodB - c.hoodF) * 0.3);
    ring(ax + wr - 0.04, w, arch, c.hoodF + 0.02);
    ring(ax + wr + 0.13, w - 0.01, c.sill, c.hoodF);
    ring(h - 0.13, w - 0.03, c.sill + 0.03, c.hoodF - 0.05);
    ring(h, w - 0.12, c.bumper, c.hoodF - 0.2);
    return loft(rings, { axis: 'z', seg: 16, exp: c.exp, capAAt: -h - 0.012, capBAt: h + 0.012 });
  }
  function carGlassMesh(c) {
    const w = c.W / 2, rings = [];
    const ring = (z, hu, yb, yt) => rings.push({ a: z, hu, hv: (yt - yb) / 2, cv: (yt + yb) / 2 });
    ring(c.gR0, w - 0.07, c.belt - 0.03, c.belt);
    ring(c.gR1, w - 0.15, c.belt - 0.03, c.roof);
    ring(c.gF1, w - 0.15, c.belt - 0.03, c.roof);
    ring(c.gF0, w - 0.07, c.hoodB - 0.03, c.hoodB);
    return loft(rings, { axis: 'z', seg: 16, exp: c.exp, capA: false, capB: false });
  }
  function buildCar(o) {
    const c = CARS[o.kind || 'sedan'], k = new Kit(o.seed || 99), R = k.R;
    const h = c.L / 2, w = c.W / 2, col = o.color || '#9a9da0';
    const paint = mat(col, { pat: 52, p: [...c.doors, 0], r: [c.sill + 0.12, c.sill + 0.06, 0, 0], noise: 0.03, grain: 50, spec: 0.85, gloss: 22 });
    const glass = mat('#2c3944', { pat: 51, b: col, p: [c.bp, 0.05, c.cp, c.belt], noise: 0, spec: 0.6, gloss: 20 });
    const black = mat('#232325', { noise: 0.06, grain: 40 });
    const tyre = mat('#1d1d1f', { pat: 23, p: [60, 0, 0, 0], noise: 0.04 });
    const rim = mat(o.rim || '#a7abae', { noise: 0.03, spec: 0.7, gloss: 14 });
    const chrome = mat('#c9ccce', { noise: 0, spec: 1, gloss: 10 });
    k.mesh('carBody' + (o.kind || 'sedan'), () => carBodyMesh(c), paint, null, R());
    k.mesh('carGlass' + (o.kind || 'sedan'), () => carGlassMesh(c), glass, null, R());
    // wheels with discs, black plastic arches and sills on the crossovers
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = [sx * (w - 0.12), c.wr, sz * c.ax];
      k.mesh('tyre' + c.wr, () => cyl(c.wr, c.wr, 0.21, 14), tyre, M(tr(...p), rz(Math.PI / 2), tr(0, -0.105, 0)));
      k.mesh('rim' + c.wr, () => cyl(c.wr * 0.62, c.wr * 0.62, 0.02, 12), rim, M(tr(p[0] + sx * 0.098, p[1], p[2]), rz(Math.PI / 2), tr(0, -0.01, 0)));
      if (c.plastic) k.box(black, [sx * (w + 0.005), c.wr * 2 + 0.06, sz * c.ax], [0.025, 0.05, c.wr + 0.12]);
    }
    if (c.plastic) for (const sx of [-1, 1]) k.boxMM(black, sx * w - 0.03, c.sill - 0.02, -c.ax + c.wr + 0.13, sx * w + 0.03, c.sill + 0.07, c.ax - c.wr - 0.13);
    // bumpers, grille, lights, plates, mirrors, handles
    const bm = c.plastic ? black : paint;
    k.boxMM(bm, -w + 0.06, c.bumper - 0.06, h - 0.06, w - 0.06, c.bumper + 0.16, h + 0.05);
    k.boxMM(bm, -w + 0.06, c.bumper - 0.06, -h - 0.05, w - 0.06, c.bumper + 0.16, -h + 0.06);
    k.boxMM(mat('#18191b', { pat: 23, p: [70, 0, 0, 0], noise: 0.04 }), -0.36, c.hoodF - 0.24, h - 0.02, 0.36, c.hoodF - 0.1, h + 0.012);
    const head = mat('#e6e3d6', { noise: 0.02, spec: 0.9, gloss: 10 }), tail = mat('#a8241f', { noise: 0.03, spec: 0.7, gloss: 12 }), amber = mat('#d9822b', { noise: 0.02 });
    for (const sx of [-1, 1]) {
      k.boxMM(head, sx * (w - 0.3) - 0.15, c.hoodF - 0.17, h - 0.1, sx * (w - 0.3) + 0.15, c.hoodF - 0.06, h - 0.03);
      k.boxMM(tail, sx * (w - 0.18) - 0.12, c.rear - 0.2, -h + 0.02, sx * (w - 0.18) + 0.12, c.rear - 0.06, -h + 0.09);
      k.boxMM(amber, sx * (w - 0.08) - 0.04, c.hoodF - 0.17, h - 0.16, sx * (w - 0.08) + 0.03, c.hoodF - 0.1, h - 0.08);
      k.box(paint, [sx * (w + 0.07), c.belt + 0.06, c.gF0 - 0.18], [0.07, 0.05, 0.04]);
      for (const z of [c.doors[0] - 0.25, c.doors[1] - 0.25]) if (z > -h) k.box(chrome, [sx * (w + 0.004), c.belt - 0.12, z], [0.006, 0.014, 0.06]);
      if (c.rails) k.boxMM(mat('#2b2c2e', { noise: 0.04, spec: 0.5, gloss: 14 }), sx * (w - 0.22) - 0.025, c.roof - 0.01, c.gR1 + 0.05, sx * (w - 0.22) + 0.025, c.roof + 0.05, c.gF1 - 0.03);
    }
    decalOn(k, 'plate', [0, c.bumper + 0.06, h + 0.058], 'z');
    decalOn(k, 'plate', [0, c.bumper + 0.06, -h - 0.058], '-z');
    // where the alarm blinks: the four indicator corners (local)
    const lights = [[w - 0.08, c.hoodF - 0.13, h - 0.07], [-w + 0.08, c.hoodF - 0.13, h - 0.07], [w - 0.15, c.rear - 0.13, -h + 0.05], [-w + 0.15, c.rear - 0.13, -h + 0.05]];
    return {
      kit: k, blocks: [{ rect: [-w - 0.08, -h - 0.06, w + 0.08, h + 0.06] }], lights, roof: c.roof,
      spots: [{ kind: 'side', at: [w + 0.62, c.doors[0] - 0.55], yaw: -Math.PI / 2 }, { kind: 'wheel', at: [w + 0.55, c.ax + 0.55], yaw: -Math.PI / 2 - 0.5 }]
    };
  }
  // blinking indicators while a car alarm screams
  const ALARM_MAT = Object.assign(flat('#ffb23d', 4), { fl: 1, noShadow: true });
  function carLightItems() {
    const out = [];
    for (const c of byType('car')) {
      if (!(c.dyn.alarm > 0) || (Math.floor(c.dyn.alarm * 3) & 1)) continue;
      for (const p of c.built.lights) out.push({ mesh: getMesh('alarmLamp', () => box(0.06, 0.045, 0.045)), model: M(c.M0, tr(...p)), mat: ALARM_MAT, id: c.id, flags: 3 });
    }
    return out;
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
    metalgarage: { build: buildMetalGarage, name: 'Железный гараж', size: '3,2 × 5,6 м', note: 'Ржавый лист на каркасе, двускатная крыша, двери с замком. Объявления и надписи — наклейки.' },
    car: { build: buildCar, name: 'Машина', size: '3,8–4,5 м', note: 'Один построитель: седан, хэтчбек, внедорожник, кроссовер. Цвет и колёса — параметры. Мигает при сигнализации.' },
    curbstones: { build: buildCurbStones, name: 'Бордюр', size: 'по длине', note: 'Отдельные камни по метру, каждый чуть сдвинут и наклонён.' }
  });
