  // ================= the test range's own things: targets, a watchtower, a container, barrels, concrete blocks, a sign, a guard booth =================
  // Everything else on the range (houses, trees, grass, cars, the lamp post, benches) comes from the engine's library (engine/src/props),
  // the walking suits from engine/src/machine. Local frame: origin on the ground at the anchor, +z is the front.

  // ---------- pictures ----------
  addDecal('tgtRings', 0.5, 0.62, (g, w, h) => {
    g.fillStyle = '#efece3'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.46;
    for (const [r, c] of [[12, '#1d1d1f'], [10, '#efece3'], [8, '#1d1d1f'], [6, '#efece3'], [4, '#1d1d1f'], [2, '#c8352c']]) { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#1d1d1f'; g.fillRect(2, h - 7, w - 4, 1);
    outlinedText(g, '7', w - 7, h - 6, 'bold 5px ' + SANS, '#1d1d1f', null, 0);
  });
  addDecal('tgtMan', 0.5, 0.62, (g, w, h) => {
    g.fillStyle = '#efece3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f3d2a';
    g.beginPath(); g.arc(w / 2, 9, 6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 6, 15); g.lineTo(w / 2 + 6, 15); g.lineTo(w / 2 + 11, h - 3); g.lineTo(w / 2 - 11, h - 3); g.closePath(); g.fill();
    g.fillStyle = '#efece3'; g.fillRect(w / 2 - 2, 24, 4, 1); g.fillRect(w / 2 - 1, 23, 2, 3);
  });
  addDecal('signRange', 3.0, 1.2, (g, w, h) => {
    g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8352c'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 6, w, 6);
    outlinedText(g, 'ИСПЫТАТЕЛЬНЫЙ', 8, 17, 'bold 18px ' + SANS, '#1d1d1f', null, 0);
    outlinedText(g, 'ПОЛИГОН № 7', 8, 38, 'bold 22px ' + SANS, '#1d1d1f', null, 0);
    outlinedText(g, 'ПРОХОД ПО ПРОПУСКАМ', 9, 64, 'bold 8px ' + SANS, '#4a4a46', null, 0);
    g.fillStyle = '#1d1d1f'; g.beginPath(); g.moveTo(w - 34, 18); g.lineTo(w - 10, 18); g.lineTo(w - 22, 40); g.closePath(); g.fill();
    g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(w - 31, 20); g.lineTo(w - 13, 20); g.lineTo(w - 22, 36); g.closePath(); g.fill();
  });
  addDecal('contCode', 0.9, 0.36, (g, w, h) => {
    outlinedText(g, 'ПЛГУ', 1, 1, 'bold 9px ' + SANS, '#e9e6dc', null, 0);
    outlinedText(g, '207119 4', 1, 11, 'bold 9px ' + SANS, '#e9e6dc', null, 0);
    outlinedText(g, '22G1', 1, 21, 'bold 6px ' + SANS, '#e9e6dc', null, 0);
  });
  addDecal('kpp', 0.62, 0.22, (g, w, h) => { g.fillStyle = '#2f5d9e'; g.fillRect(0, 0, w, h); outlinedText(g, 'КПП', 6, 2, 'bold 10px ' + SANS, '#f2f2ee', null, 0); });
  addDecal('towerNo', 0.36, 0.3, (g, w, h) => { outlinedText(g, 'В-2', 0, 0, 'bold 13px ' + SANS, '#e9e6dc', null, 0); });
  addDecal('danger2', 0.5, 0.34, (g, w, h) => {
    g.fillStyle = '#f1efe8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8352c'; g.fillRect(0, 0, w, 5);
    outlinedText(g, 'СТОЙ!', 2, 7, 'bold 7px ' + SANS, '#c8352c', null, 0);
    outlinedText(g, 'ИДУТ', 2, 15, 'bold 5px ' + SANS, '#1d1d1f', null, 0);
    outlinedText(g, 'СТРЕЛЬБЫ', 2, 21, 'bold 5px ' + SANS, '#1d1d1f', null, 0);
  });

  // ---------- a pop-up target: a plywood plate on a hinge at its foot; a hit knocks it backwards ----------
  // The plate is drawn every frame from inst.dyn (see play.js), so it can fall; the stand is baked.
  const TGT = { hinge: 0.36, w: 0.27, h: 0.36 };      // hinge height, plate half width and half height
  function buildTarget(o) {
    const k = new Kit(o.seed || 701);
    const wood = mat('#8a6a46', { pat: 37, b: '#6f5235', p: [0.09, 1, 0, 0], noise: 0.1, grain: 50 });
    const steel = paint('#5c6156', { rf: 5, rt: 0.93 });
    const sand = mat('#a08a62', { noise: 0.12, grain: 40 });
    k.boxMM(wood, -0.42, 0, -0.08, 0.42, 0.1, 0.08);
    for (const x of [-0.3, 0.3]) k.boxMM(steel, x - 0.025, 0.08, -0.03, x + 0.025, TGT.hinge + 0.02, 0.03);
    k.rod(steel, [-0.32, TGT.hinge, 0], [0.32, TGT.hinge, 0], 0.016, 6);
    // sandbags in front of the stand, so stray shots land in sand
    for (let i = 0; i < 3; i++) k.mesh('bag', () => ellipsoid(0.16, 0.07, 0.11, { seg: 10, rings: 5 }), sand, M(tr(-0.3 + i * 0.3, 0.07, 0.24), ry((i - 1) * 0.2)));
    return { kit: k, blocks: [{ rect: [-0.45, -0.12, 0.45, 0.36] }], spots: [{ kind: 'front', at: [0, 0.95], yaw: Math.PI }] };
  }

  // ---------- a watchtower: a steel deck 1.5 m up on four legs, railings, stairs at the front, a lamp over the deck ----------
  // The deck and the steps are walkable heights; the railings block the sides, so the way up is the stairs.
  function buildWatchtower(o) {
    const k = new Kit(o.seed || 711);
    const H = 1.5, hw = 1.5, legs = paint('#5f6b55', { rf: 4, rt: 0.93 }), rail = paint('#c9a33a', { rf: 6, rt: 0.93, rustCol: '#6b4a2c' });
    const deckM = mat('#6d7064', { pat: 26, p: [14, 0, 0, 0], noise: 0.06, grain: 50, spec: 0.3, gloss: 14 });
    const roofM = paint('#646b5b', { rf: 7, rt: 0.95 });
    for (const x of [-hw + 0.08, hw - 0.08]) for (const z of [-hw + 0.08, hw - 0.08]) k.boxMM(legs, x - 0.07, 0, z - 0.07, x + 0.07, H, z + 0.07);
    // cross braces under the deck
    for (const z of [-hw + 0.08, hw - 0.08]) { k.rod(legs, [-hw + 0.1, 0.15, z], [hw - 0.1, H - 0.15, z], 0.025, 5); k.rod(legs, [hw - 0.1, 0.15, z], [-hw + 0.1, H - 0.15, z], 0.025, 5); }
    k.rod(legs, [-hw + 0.08, 0.15, -hw + 0.1], [-hw + 0.08, H - 0.15, hw - 0.1], 0.025, 5);
    k.rod(legs, [hw - 0.08, 0.15, -hw + 0.1], [hw - 0.08, H - 0.15, hw - 0.1], 0.025, 5);
    k.boxMM(deckM, -hw, H - 0.08, -hw, hw, H, hw);
    // railings on three sides, the front open over the stairs
    const posts = [[-hw, -hw], [0, -hw], [hw, -hw], [-hw, 0], [hw, 0], [-hw, hw], [-0.62, hw], [0.62, hw], [hw, hw]];
    for (const [x, z] of posts) k.boxMM(rail, x - 0.025, H, z - 0.025, x + 0.025, H + 1.0, z + 0.025);
    for (const y of [H + 0.5, H + 0.98]) {
      k.boxMM(rail, -hw, y - 0.02, -hw - 0.02, hw, y + 0.02, -hw + 0.02);
      for (const x of [-hw, hw]) k.boxMM(rail, x - 0.02, y - 0.02, -hw, x + 0.02, y + 0.02, hw);
      for (const sx of [-1, 1]) k.boxMM(rail, sx * 0.62 - 0.02 * sx, y - 0.02, hw - 0.02, sx * hw, y + 0.02, hw + 0.02);
    }
    // stairs: five steps down the front
    const steps = 5, rise = H / steps, run = 0.26;
    for (let i = 0; i < steps - 1; i++) { const y = H - rise * (i + 1), z = hw + run * i; k.boxMM(deckM, -0.55, y - 0.05, z, 0.55, y, z + run); }
    for (const sx of [-1, 1]) {
      k.rod(legs, [sx * 0.58, H, hw], [sx * 0.58, 0, hw + run * steps], 0.03, 5);
      k.rod(rail, [sx * 0.6, H + 0.98, hw], [sx * 0.6, 0.9, hw + run * steps], 0.02, 5);
      k.boxMM(rail, sx * 0.6 - 0.02, 0, hw + run * steps - 0.02, sx * 0.6 + 0.02, 0.9, hw + run * steps + 0.02);
    }
    // a roof on two poles at the back and a lamp under it
    for (const x of [-hw, hw]) k.boxMM(legs, x - 0.03, H + 1.0, -hw - 0.03, x + 0.03, H + 2.2, -hw + 0.03);
    k.boxMM(roofM, -hw - 0.15, H + 2.2, -hw - 0.2, hw + 0.15, H + 2.26, 0.2);
    k.box(mat('#d8d2b8', { noise: 0.02 }), [0, H + 2.12, -0.2], [0.12, 0.05, 0.08]);
    k.boxMM(paint('#3d4a35', { rf: 4, rt: 0.93 }), -1.3, H + 0.56, hw + 0.025, -0.82, H + 0.92, hw + 0.045);
    decalOn(k, 'towerNo', [-1.06, H + 0.74, hw + 0.05], 'z');
    const heights = [{ rect: [-hw + 0.02, -hw + 0.02, hw - 0.02, hw], y: H }];
    for (let i = 0; i < steps - 1; i++) heights.push({ rect: [-0.55, hw + run * i, 0.55, hw + run * (i + 1)], y: H - rise * (i + 1) });
    return {
      kit: k, heights,
      blocks: [
        { rect: [-hw - 0.05, -hw - 0.05, hw + 0.05, -hw + 0.12] }, { rect: [-hw - 0.05, -hw, -hw + 0.12, hw + 0.05] }, { rect: [hw - 0.12, -hw, hw + 0.05, hw + 0.05] },
        { rect: [-hw, hw - 0.06, -0.66, hw + 0.05] }, { rect: [0.66, hw - 0.06, hw, hw + 0.05] },
        { rect: [-0.7, hw, -0.62, hw + run * steps + 0.05] }, { rect: [0.62, hw, 0.7, hw + run * steps + 0.05] }
      ],
      top: [0, H, 0],
      spots: [{ kind: 'stairs', at: [0, hw + run * steps + 0.5], yaw: Math.PI }],
      lamp: { at: [0, H + 2.05, -0.2], r: 9, col: [0.92, 0.95, 1.0], k: 2.0, cone: 0.25, dir: [0, -1, 0.35], kind: 'street' }
    };
  }

  // ---------- a 20-foot shipping container: corrugated walls, doors with locking bars at the front ----------
  function buildContainer(o) {
    const k = new Kit(o.seed || 721);
    const L = 3.03, W = 1.22, Hc = 2.59, col = o.color || '#3d6f8e';
    const ribs = mat(col, { pat: 26, p: [7, 0, 0, 0], noise: 0.06, grain: 50, spec: 0.3, gloss: 14 });
    const flatM = paint(col, { rf: 5, rt: 0.93, rustCol: '#7a4e33' });
    const frameM = paint('#2f3439', { rf: 4, rt: 0.93 });
    // long walls (their local z runs along the container, so the ribs stand upright), the back, the roof
    for (const sx of [-1, 1]) k.box(ribs, [sx * (W - 0.02), Hc / 2, 0], [0.02, Hc / 2 - 0.06, L - 0.06]);
    k.box(ribs, [0, Hc / 2, -L + 0.02], [0.02, Hc / 2 - 0.06, W - 0.06], ry(Math.PI / 2));
    k.boxMM(flatM, -W, Hc - 0.06, -L, W, Hc, L);
    k.boxMM(frameM, -W, 0, -L, W, 0.12, L);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(frameM, [sx * (W - 0.05), Hc / 2, sz * (L - 0.05)], [0.05, Hc / 2, 0.05]);
    // the doors and their locking bars
    k.boxMM(flatM, -W + 0.08, 0.12, L - 0.04, -0.01, Hc - 0.06, L);
    k.boxMM(flatM, 0.01, 0.12, L - 0.04, W - 0.08, Hc - 0.06, L);
    for (const x of [-0.85, -0.3, 0.3, 0.85]) {
      k.rod(frameM, [x, 0.2, L + 0.04], [x, Hc - 0.12, L + 0.04], 0.018, 6);
      k.boxMM(frameM, x - 0.02, 1.1, L, x + 0.12, 1.15, L + 0.08);
    }
    decalOn(k, 'contCode', [-0.6, Hc - 0.45, L + 0.006], 'z');
    return { kit: k, blocks: [{ rect: [-W - 0.04, -L - 0.04, W + 0.04, L + 0.1] }], spots: [{ kind: 'door', at: [0.3, L + 0.75], yaw: Math.PI }] };
  }

  // ---------- rusty barrels: o.n of them in a cluster, maybe one on its side ----------
  function buildBarrels(o) {
    const k = new Kit(o.seed || 731), R = k.R, n = o.n || 3, out = [];
    const cols = o.cols || ['#5d6a4a', '#7a3d2c', '#4f5d6a', '#8a7a3c'];
    for (let i = 0; i < n; i++) {
      const a = i * 2.39 + R(), r = i === 0 ? 0 : 0.62, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const m = mat(cols[i % cols.length], { pat: 47, b: '#3a3734', p: [0.27, 0.31, 0.58, 0.62], noise: 0.08, grain: 50, spec: 0.25, gloss: 12 });
      const lying = o.lying && i === n - 1;
      if (lying) k.mesh('barrel', () => cyl(0.29, 0.29, 0.88, 14), m, M(tr(x, 0.29, z), ry(a), rz(Math.PI / 2), tr(0, -0.44, 0)));
      else k.mesh('barrel', () => cyl(0.29, 0.29, 0.88, 14), m, M(tr(x, 0, z), ry(R() * 3)));
      out.push({ c: [x, z], r: lying ? 0.48 : 0.31 });
    }
    return { kit: k, blocks: out };
  }

  // ---------- concrete foundation blocks stacked into a wall: o.len metres, o.rows high ----------
  function buildConcreteBlocks(o) {
    const k = new Kit(o.seed || 741), R = k.R, len = o.len || 4.8, rows = o.rows || 2;
    const conc = mat('#b3afa5', { pat: 48, p: [0.6, 0, 0, 0], noise: 0.08, grain: 40 }), old = mat('#a39f94', { pat: 48, p: [0.6, 0, 0, 0], noise: 0.1, grain: 40 });
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? 1.2 : 0;     // every other row shifted by half a block
      for (let x = off; x + 2.4 <= len + 0.01; x += 2.4) k.box(R() < 0.35 ? old : conc, [x + 1.2 - len / 2, 0.3 + r * 0.6, (R() - 0.5) * 0.04], [1.18, 0.29, 0.29], ry((R() - 0.5) * 0.02));
    }
    return { kit: k, blocks: [{ rect: [-len / 2, -0.32, len / 2, 0.32] }] };
  }

  // ---------- a sign board on two posts ----------
  function buildSign(o) {
    const k = new Kit(o.seed || 751);
    const post = paint('#6b6f72', { rf: 5, rt: 0.93 }), back = paint('#8a8f93', { rf: 4, rt: 0.93 });
    for (const x of [-1.2, 1.2]) k.boxMM(post, x - 0.05, 0, -0.05, x + 0.05, 2.6, 0.05);
    k.boxMM(back, -1.55, 1.25, -0.04, 1.55, 2.55, 0.0);
    decalOn(k, o.decal || 'signRange', [0, 1.9, 0.006], 'z');
    return { kit: k, blocks: [{ c: [-1.2, 0], r: 0.12 }, { c: [1.2, 0], r: 0.12 }], spots: [{ kind: 'front', at: [0, 1.6], yaw: Math.PI }] };
  }

  // ---------- a guard booth: a metal hut with windows on three sides, a door, a lamp over it ----------
  function buildBooth(o) {
    const k = new Kit(o.seed || 761), R = k.R;
    const wall = paint('#c9c4b4', { rf: 9, rt: 0.95, rustCol: '#8a6a4e' }), base = mat('#8e8a80', { pat: 48, p: [1, 0, 0, 0], noise: 0.08, grain: 40 });
    const roof = mat('#5d5a56', { pat: 34, noise: 0.06, grain: 30 }), door = paint('#5a6b55', { rf: 6, rt: 0.93 });
    const win = mat('#4b6680', { pat: 43, b: '#e8e4da', p: [2, 0.05, 0.5, 0.42], r: [0.022, 0, 0, 0], noise: 0 });
    const hw = 1.0, hd = 1.0, Hb = 2.5;
    k.boxMM(base, -hw - 0.05, 0, -hd - 0.05, hw + 0.05, 0.25, hd + 0.05);
    k.boxMM(wall, -hw, 0.25, -hd, hw, Hb, hd);
    k.boxMM(roof, -hw - 0.25, Hb, -hd - 0.25, hw + 0.25, Hb + 0.12, hd + 0.25);
    // windows: the front left of the door, both sides
    k.box(win, [-0.42, 1.55, hd + 0.022], [0.5, 0.42, 0.025], null, R());
    k.box(win, [hw + 0.022, 1.55, 0], [0.5, 0.42, 0.025], ry(Math.PI / 2), R());
    k.box(win, [-hw - 0.022, 1.55, 0], [0.5, 0.42, 0.025], ry(-Math.PI / 2), R());
    k.boxMM(door, 0.22, 0.25, hd, 0.86, 2.15, hd + 0.04);
    k.boxMM(mat('#a9aeb1', { noise: 0.03, spec: 0.4, gloss: 16 }), 0.3, 1.15, hd + 0.04, 0.38, 1.2, hd + 0.08);
    k.boxMM(mat('#d8d2b8', { noise: 0.02 }), 0.42, 2.25, hd + 0.02, 0.66, 2.33, hd + 0.18);
    decalOn(k, 'kpp', [-0.42, 2.18, hd + 0.006], 'z');
    return {
      kit: k, blocks: [{ rect: [-hw - 0.08, -hd - 0.08, hw + 0.08, hd + 0.08] }],
      spots: [{ kind: 'window', at: [-0.42, hd + 0.6], yaw: Math.PI }, { kind: 'door', at: [0.54, hd + 0.6], yaw: Math.PI }],
      lamp: { at: [0.54, 2.22, hd + 0.12], r: 6, col: [1.0, 0.86, 0.6], k: 1.8, kind: 'porch' }
    };
  }

  Object.assign(CATALOG, {
    target: { build: buildTarget, name: 'Мишень', size: '0,8 м', note: 'Фанерный щит на шарнире: от попадания падает назад.' },
    watchtower: { build: buildWatchtower, name: 'Вышка', size: '3 × 4,3 м, 3,8 м', note: 'Стальной помост на ногах, перила, лестница, лампа под навесом.', xray: true, hug: true },
    container: { build: buildContainer, name: 'Контейнер', size: '6 × 2,4 м', note: 'Двадцатифутовый, рифлёные стенки, двери с запорами.', xray: true, hug: true },
    barrels: { build: buildBarrels, name: 'Бочки', size: '0,9 м', note: 'Ржавые, с обручами, одна может лежать.', hug: true },
    concrete: { build: buildConcreteBlocks, name: 'Блоки ФБС', size: 'по длине', note: 'Бетонные блоки в два ряда со сдвигом.', hug: true },
    sign: { build: buildSign, name: 'Щит', size: '3,1 м', note: 'Щит с надписью на двух столбах.' },
    booth: { build: buildBooth, name: 'Будка КПП', size: '2 × 2 м', note: 'Окна на три стороны, лампа над дверью.', xray: true, hug: true, litter: 18 }
  });
