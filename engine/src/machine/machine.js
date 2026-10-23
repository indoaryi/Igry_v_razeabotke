  // ================= walking machines: boarding, waking up, a heavy walk =================
  // A machine kind (see ibk3.js) gives sizes, parts on bones, anchor points and texts. The runtime is the same for every kind:
  //   parked → the hero opens the hatch and climbs in → waking → ready (walks where the player taps) → parking → the hero climbs out → parked
  // Every machine of the game is in MACHINES. The one in the current location also has an INST entry, so it can be picked,
  // blocks the way and is drawn every frame from its bones (dynItems → machineItemsAll).
  const MACHINE_KINDS = {};
  const MACHINES = [];
  const MACHINE_HOOKS = { stomp: [] };      // f(world point, machine): something nearby reacts to a footfall
  let machinesMade = false;
  const machineHere = (m) => !!m.inst && m.loc === MAP.id;      // drawn, updated and pickable only in its own location

  // ---------- small helpers ----------
  const span = (t, t0, t1) => clamp((t - t0) / (t1 - t0), 0, 1);
  const bump = (t, t0, t1) => Math.sin(Math.PI * span(t, t0, t1));
  function frameXY(o, X, Y) {
    Y = nrm(Y); X = nrm(sub(X, scl(Y, dot(X, Y))));
    return M(tr(o[0], o[1], o[2]), basis(X, Y, cross(X, Y)));
  }
  // machine-local ground point (x to its left, z forward) → world [x, z]
  function mLocal(m, lx, lz, yaw = m.yaw, x = m.x, z = m.z) { const c = Math.cos(yaw), s = Math.sin(yaw); return [x + lx * c + lz * s, z - lx * s + lz * c]; }
  const footHome = (m, i, yaw = m.yaw, x = m.x, z = m.z, lead = 0) => mLocal(m, (i === 0 ? 1 : -1) * m.K.D.footX, m.K.D.footZ + lead, yaw, x, z);
  // where a foot is: k = 0 under the body, 1 parked (one foot forward, the other knee down); a lift in between
  function footPose(m, i, k) {
    const pk = m.K.D.park[i], h = footHome(m, i), pp = mLocal(m, pk.x, pk.z);
    return { p: [lerp(h[0], pp[0], k), lerp(h[1], pp[1], k)], y: lerp(0, pk.y, k) + (k > 0 && k < 1 ? 0.15 * Math.sin(Math.PI * k) : 0), yaw: m.yaw, pitch: lerp(0, pk.pitch, k), toe: lerp(0, pk.toe, k) };
  }

  function newMachine(d, loc) {
    const K = MACHINE_KINDS[d.kind], D = K.D;
    const m = {
      kind: d.kind, K, n: d.n || 0, loc, x: d.at[0], z: d.at[1], yaw: d.yaw || 0, inst: null,
      mode: 'parked', mt: 0, ev: {},
      crouch: 1, bodyX: 0, bodyY: 0, bodyZ: 0, roll: 0, pitch: 0, twist: 0, lean: D.leanPark, cupola: 0,
      door: 0, wheel: 0, dogs: 0, shutter: 0, lamps: 0, glow: 0, engine: 0, flaps: [0, 0], ant: [0, 0], antV: [0, 0],
      arms: [0, 1].map(() => Object.assign({}, D.armRest)),
      feet: [], sw: null, settle: 0, next: 0, compT: 9, compA: 0, shud: 0, puffT: 0, pipe: 0, lampsOn: true, lookT: 4, want: null, walking: false,
      snap: null, snapKey: ''
    };
    m.feet = [0, 1].map((i) => footPose(m, i, 1));
    return m;
  }
  function makeMachines() {
    if (machinesMade) return;
    machinesMade = true;
    for (const def of Object.values(LOCATIONS)) for (const d of def.machines || []) MACHINES.push(newMachine(d, def.id));
  }

  // ---------- bones ----------
  function machineBones(m, s) {
    const D = m.K.D, B = {};
    B.root = M(tr(s.x, 0, s.z), ry(s.yaw));
    const hipY = lerp(D.hipStand, D.hipPark, s.crouch) + s.bodyY;
    B.pelvis = M(B.root, tr(s.bodyX, hipY, s.bodyZ), rz(s.roll), rx(s.pitch));
    B.torso = M(B.pelvis, tr(0, D.waistY, D.waistZ), ry(s.twist), rx(s.lean));
    B.cupola = M(B.torso, tr(...D.cupolaAt), ry(s.cupola));
    B.door = M(B.torso, tr(...D.hinge), rx(s.door * D.doorMax));
    B.wheel = M(B.door, tr(...D.wheelAt), rz(s.wheel));
    B.dogL = M(B.door, tr(0.03 * (1 - s.dogs), 0, 0));
    B.dogR = M(B.door, tr(-0.03 * (1 - s.dogs), 0, 0));
    B.slit = M(B.torso, tr(...D.slit.at), rx(D.slit.tilt));
    B.shutter = M(B.slit, tr(0, -D.slit.travel * s.shutter, 0));
    for (let i = 0; i < 2; i++) B['flap' + i] = M(B.torso, tr(...D.exhausts[i].hinge), rx(-s.flaps[i]));
    B.antenna = M(B.torso, tr(...D.antenna), rx(s.ant[0]), rz(s.ant[1]));
    const X = xfDir(B.pelvis, [1, 0, 0]), fwd = xfDir(B.pelvis, [0, 0, 1]);
    for (let i = 0; i < 2; i++) {
      const sd = i === 0 ? 'l' : 'r', sg = i === 0 ? 1 : -1, f = s.feet[i];
      const hip = xf(B.pelvis, [sg * D.hipX, 0, 0]);
      const k = ik(hip, [f.p[0], f.y + D.ankleY, f.p[1]], D.thigh, D.shin, add(fwd, scl(X, sg * 0.1)));
      B[sd + 'Thigh'] = frameXY(hip, X, sub(hip, k.E));
      B[sd + 'Shin'] = frameXY(k.E, X, sub(k.E, k.H));
      B[sd + 'Foot'] = M(tr(k.H[0], k.H[1], k.H[2]), ry(f.yaw), rx(f.pitch));
      B[sd + 'Toe'] = M(B[sd + 'Foot'], tr(...D.toeAt), rx(f.toe));
      const a = s.arms[i];
      B[sd + 'Up'] = M(B.torso, tr(sg * D.shX, D.shY, D.shZ), rx(-a.pitch), rz(sg * a.roll));
      B[sd + 'Lo'] = M(B[sd + 'Up'], tr(0, -D.upper, 0), rx(-a.elbow));
      B[sd + 'Hand'] = M(B[sd + 'Lo'], tr(0, -D.fore, 0), rx(-a.wrist));
      for (const fg of D.fingers) B[sd + fg.name] = M(B[sd + 'Hand'], tr(sg * fg.at[0], fg.at[1], fg.at[2]), rz(sg * (fg.splay || 0)), rx(fg.curl[0] + fg.curl[1] * a.grip));
    }
    return B;
  }

  // ---------- parts: built once per kind, merged per bone and material ----------
  function machineParts(K) {
    if (K.parts) return K.parts;
    const raw = [];
    const put = (bone, key, fn, off, m, extra) => raw.push(Object.assign({ bone, mesh: rawMesh('mk:' + key, fn), off: off || ID4, mat: m }, extra));
    K.build(put);
    const groups = new Map();
    for (const p of raw) {
      const lines = !!p.mesh.lines;
      const key = p.bone + '|' + p.mat.key + '|' + (p.alt ? p.alt.key : '') + '|' + (lines ? 1 : 0);
      let g = groups.get(key);
      if (!g) { g = { bone: p.bone, mat: p.mat, alt: p.alt, when: p.when, lines, parts: [] }; groups.set(key, g); }
      g.parts.push(p);
    }
    const R = rng(4242);
    K.parts = [...groups.values()].map((g) => ({ bone: g.bone, mat: g.mat, alt: g.alt, when: g.when, noShadow: g.lines || !!g.mat.noShadow, mesh: upload(mergeRaw(g.parts, R)) }));
    return K.parts;
  }
  // like bake(), but into the bone's space; every part keeps its own coordinates for the shader patterns
  function mergeRaw(parts, R) {
    let nv = 0, ni = 0;
    for (const p of parts) { nv += p.mesh.pos.length / 3; ni += p.mesh.idx.length; }
    const pos = new Float32Array(nv * 3), nr = new Float32Array(nv * 3), loc = new Float32Array(nv * 3), seed = new Float32Array(nv), idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const p of parts) {
      const r = p.mesh, n = r.pos.length / 3, W = p.off, sd = R();
      for (let i = 0; i < n; i++) {
        const x = r.pos[i * 3], y = r.pos[i * 3 + 1], z = r.pos[i * 3 + 2], j = (vo + i) * 3;
        pos[j] = W[0] * x + W[4] * y + W[8] * z + W[12]; pos[j + 1] = W[1] * x + W[5] * y + W[9] * z + W[13]; pos[j + 2] = W[2] * x + W[6] * y + W[10] * z + W[14];
        loc[j] = x; loc[j + 1] = y; loc[j + 2] = z;
        const nx = r.nrm[i * 3], ny = r.nrm[i * 3 + 1], nz = r.nrm[i * 3 + 2];
        const q = nrm([W[0] * nx + W[4] * ny + W[8] * nz, W[1] * nx + W[5] * ny + W[9] * nz, W[2] * nx + W[6] * ny + W[10] * nz]);
        nr[j] = q[0]; nr[j + 1] = q[1]; nr[j + 2] = q[2];
        seed[vo + i] = sd;
      }
      for (let i = 0; i < r.idx.length; i++) idx[io + i] = r.idx[i] + vo;
      vo += n; io += r.idx.length;
    }
    return { pos, nrm: nr, loc, seed, idx, lines: !!parts[0].mesh.lines };
  }

  // ---------- what gets drawn: a snapshot taken twelve times a second, so the machine moves in the same steps as the hero ----------
  function machineSnapshot(m) {
    const q = (v, k = 100) => Math.round(v * k) / k;
    const snapG = (x, z) => { const s = wpx([x, 0, z]); return groundAt(Math.round(s[0]), Math.round(s[1])); };
    const g = snapG(m.x, m.z), tick = Math.floor(hero.t * FPS);
    const vib = m.engine > 0.5 ? ((tick & 1) ? 0.007 : 0) * (m.walking ? 0.5 : 1) : 0;
    const sh = m.shud > 0 ? (hash2(tick, 3, 9) - 0.5) * 0.03 * m.shud : 0;
    return {
      x: g[0], z: g[1], yaw: q(m.yaw, 300), crouch: q(m.crouch), bodyX: q(m.bodyX + sh * 0.6, 200), bodyY: q(m.bodyY + vib + sh, 300), bodyZ: q(m.bodyZ, 200),
      roll: q(m.roll + sh * 0.4, 300), pitch: q(m.pitch, 300), twist: q(m.twist, 300), lean: q(m.lean, 300), cupola: q(m.cupola, 50),
      door: q(m.door), wheel: q(m.wheel, 20), dogs: q(m.dogs, 20), shutter: q(m.shutter, 20), lamps: m.lamps > 0.5 ? 1 : 0, glow: q(m.glow, 10), engine: m.engine > 0.5 ? 1 : 0,
      flaps: m.flaps.map((v) => q(v, 10)), ant: m.ant.map((v) => q(v, 60)),
      arms: m.arms.map((a) => ({ pitch: q(a.pitch, 60), roll: q(a.roll, 60), elbow: q(a.elbow, 60), wrist: q(a.wrist, 60), grip: q(a.grip, 12) })),
      feet: m.feet.map((f) => { const p = f.y > 0.01 ? [f.p[0], f.p[1]] : snapG(f.p[0], f.p[1]); return { p, y: q(f.y, 200), yaw: q(f.yaw, 300), pitch: q(f.pitch, 60), toe: q(f.toe, 60) }; })
    };
  }
  function machinesSnap() {
    for (const m of MACHINES) if (machineHere(m)) { m.snap = machineSnapshot(m); m.snapKey = JSON.stringify(m.snap); m.bones = machineBones(m, m.snap); machineBounds(m); }
  }
  function machineKey() { let k = ''; for (const m of MACHINES) if (machineHere(m)) k += m.snapKey; return k; }
  const PISTON_MESH = (r, L) => getMesh('pst' + r + ',' + L, () => cyl(r, r, L, 8));
  function machineItems(m) {
    if (!m.snap) { m.snap = machineSnapshot(m); m.bones = machineBones(m, m.snap); }
    const s = m.snap, B = m.bones, id = m.inst ? m.inst.id : 0, out = [];
    for (const g of machineParts(m.K)) out.push({ mesh: g.mesh, model: B[g.bone], mat: g.alt && g.when(s) ? g.alt : g.mat, id, flags: 2, shadow: !g.noShadow });
    for (const pz of m.K.pistons) {
      const A = xf(B[pz.a[0]], pz.a[1]), Bp = xf(B[pz.b[0]], pz.b[1]);
      out.push({ mesh: PISTON_MESH(pz.rb, pz.lb), model: M(tr(...A), alongPlusY(sub(Bp, A))), mat: pz.mb, id, flags: 2, shadow: true });
      out.push({ mesh: PISTON_MESH(pz.rr, pz.lr), model: M(tr(...Bp), alongPlusY(sub(A, Bp))), mat: pz.mr, id, flags: 2, shadow: true });
    }
    return out;
  }
  function machineItemsAll() {
    const out = [];
    for (const m of MACHINES) if (machineHere(m)) for (const it of machineItems(m)) out.push(it);
    return out;
  }
  function machineBounds(m) {
    const i = m.inst; if (!i) return;
    const r = m.K.D.reach;
    i.bb = [m.x - r, 0, m.z - r, m.x + r, m.K.D.height + 1.4, m.z + r];
    i.sr = screenRect(i.bb); i.shr = shadowRect(i.bb); i.center = [m.x, m.z];
    i.def.at = [m.x, m.z];
  }

  // ---------- the machine in the current location ----------
  function machineInst(m) {
    const inst = { id: nextId++, def: { n: m.n, type: m.kind, kind: m.kind, at: [m.x, m.z] }, type: m.kind, T: null, M0: ID4, yaw0: m.yaw, built: {}, chunks: [], items: [],
      bb: null, active: true, sr: null, shr: null, n: m.n, dyn: {}, center: [m.x, m.z], machine: m, blocks: [{ c: [m.x, m.z], r: m.K.D.blockR }], spots: [] };
    m.inst = inst;
    INST.push(inst);
    if (instById) instById.set(inst.id, inst);
    machineBounds(m);
    return inst;
  }
  function spawnMachines() {
    makeMachines();
    for (const m of MACHINES) if (m.loc === MAP.id) machineInst(m);
  }
  function dropMachineInst(m) {
    const i = m.inst; if (!i) return;
    const k = INST.indexOf(i); if (k >= 0) INST.splice(k, 1);
    instById.delete(i.id);
    m.inst = null;
  }
  // the hero drives away: the machine leaves this location with him and appears at the spawn of the next one
  LOC_HOOKS.leave.push(() => {
    const v = hero.vehicle; if (!v || !v.machine) return;
    const m = v.machine;
    dropMachineInst(m); m.loc = null;
    NAV.big.skip = null; buildNav(NAV.hero);
  });
  LOC_HOOKS.enter.push((def) => {
    const v = hero.vehicle; if (!v || !v.machine) return;
    const m = v.machine;
    m.loc = def.id; m.x = hero.x; m.z = hero.z; m.yaw = hero.yaw; m.sw = null; m.want = null;
    m.feet = [0, 1].map((i) => footPose(m, i, 0));
    hero.vehicle = machineInst(m);
    NAV.big.skip = hero.vehicle; buildNav(NAV.big);
    m.snap = null;
  });

  // ---------- effects ----------
  function exhaustPuff(m, B, i, kind) {
    const e = m.K.D.exhausts[i], s = wpx(xf(B.torso, e.tip));
    const black = kind === 'cough', n = black ? 6 : 1;
    for (let k = 0; k < n; k++) puff({ x: s[0] + (Math.random() - 0.5) * 4, y: s[1] - 1 - k * 2, vx: (Math.random() - 0.5) * 10 + 2, vy: -18 - Math.random() * 14, life: black ? 2 + Math.random() * 1.2 : 0.9 + Math.random() * 0.5, r0: black ? 2 : 0.8, r1: black ? 7 + Math.random() * 5 : 2.8 + Math.random() * 1.8, a: black ? 1 : 0.7, drag: 0.45, rise: -10, tone: black ? 'soot' : 'exhaust' });
    m.flaps[i] = black ? 1.1 : 0.7;
  }
  function hissPuff(m, B, strong) {
    for (const [b, p] of m.K.D.hiss) {
      const s = wpx(xf(B[b], p)), side = xfDir(B[b], [p[0] >= 0 ? 1 : -1, 0, 0]), sd = wpx(add([0, 0, 0], side));
      const dl = Math.hypot(sd[0], sd[1]) || 1;
      for (let k = 0; k < (strong ? 3 : 2); k++) puff({ x: s[0], y: s[1], vx: sd[0] / dl * (14 + Math.random() * 10), vy: sd[1] / dl * 8 - 3 - Math.random() * 4, life: 0.7 + Math.random() * 0.4, r0: 0.8, r1: 2.5 + Math.random() * 1.5, a: 0.9, drag: 0.15, rise: -4, tone: 'steam' });
    }
  }
  function clankAt(P) { const s = wpx(P); fx.push({ k: 'clank', x: s[0], y: s[1], life: 0.14 }); }
  // a footfall: the body sags, the screen shakes, dust or leaves fly, the foot leaves a print, things nearby react
  function stomp(m, i, hard = 1) {
    const f = m.feet[i], D = m.K.D, P = [f.p[0], 0, f.p[1]];
    m.compT = 0; m.compA = D.comp * hard;
    if (m.inst && m.loc === MAP.id) {
      shake(1.6 * hard, 0.16);
      const t = groundType(f.p[0], f.p[1]), s = wpx(P), soft = t === ':' || pathDist(f.p[0], f.p[1]) < 0.5;
      const tone = t === '#' || t === '_' ? 'gun' : 'dust';
      for (let k = 0; k < (soft ? 7 : 4); k++) {
        const a = Math.random() * Math.PI * 2;
        puff({ x: s[0] + Math.cos(a) * 10, y: s[1] + Math.sin(a) * 4, vx: Math.cos(a) * (14 + Math.random() * 12), vy: Math.sin(a) * 5 - 3, life: 0.6 + Math.random() * 0.5, r0: 1, r1: 3 + Math.random() * 2, a: soft ? 0.75 : 0.5, drag: 0.12, rise: -1, tone });
      }
      const lv = MAP.style && MAP.style.leaves ? MAP.style.leaves(f.p[0], f.p[1]) : 0, cols = (MAP.style && MAP.style.leafColors) || ['#c9a43a', '#b98a30'];
      if (lv > 0.35) for (let k = 0; k < Math.round(lv * 8); k++) fx.push({ k: 'bit', x: s[0] + (Math.random() - 0.5) * 22, y: s[1] + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 40, vy: -25 - Math.random() * 35, g: 90, life: 0.7 + Math.random() * 0.5, floor: s[1] + 6, col: cols[(Math.random() * cols.length) | 0] });
      if (t !== '#' && t !== '_') footprint(m, f);
      if (m.walking && Math.random() < 0.2) hissPuff(m, m.bones || machineBones(m, m), false);     // the hydraulics let off now and then
      for (const h of MACHINE_HOOKS.stomp) h(P, m);
    }
  }
  // press the sole into the painted ground: a darker print with tread bars, a few pixels of the texture updated
  function footprint(m, f) {
    if (!ground) return;
    const D = m.K.D, c = Math.cos(f.yaw), s = Math.sin(f.yaw);
    const W = (lx, lz) => [f.p[0] + lx * c + lz * s, f.p[1] - lx * s + lz * c];
    const corners = [W(-D.sole[0], D.sole[1]), W(D.sole[0], D.sole[1]), W(D.sole[0], D.sole[2]), W(-D.sole[0], D.sole[2])].map(([x, z]) => { const p = wpx([x, 0, z]); return [p[0] - G.x0, p[1] - G.y0]; });
    const x0 = Math.floor(Math.min(...corners.map((p) => p[0]))), x1 = Math.ceil(Math.max(...corners.map((p) => p[0])));
    const y0 = Math.floor(Math.min(...corners.map((p) => p[1]))), y1 = Math.ceil(Math.max(...corners.map((p) => p[1])));
    if (x0 < 0 || y0 < 0 || x1 >= ground.width || y1 >= ground.height) return;
    const g = ground.getContext('2d'), w = x1 - x0 + 1, h = y1 - y0 + 1, img = g.getImageData(x0, y0, w, h), d = img.data;
    const inQuad = (px, py) => { let sg = 0; for (let k = 0; k < 4; k++) { const a = corners[k], b = corners[(k + 1) % 4], cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]); if (cr !== 0) { if (sg === 0) sg = Math.sign(cr); else if (Math.sign(cr) !== sg) return false; } } return true; };
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const px = x0 + xx + 0.5, py = y0 + yy + 0.5;
      if (!inQuad(px, py)) continue;
      const gp = groundAt(px + G.x0, py + G.y0), lz = (gp[0] - f.p[0]) * s + (gp[1] - f.p[1]) * c;   // along the foot
      const bar = Math.abs(((lz * 9) % 1 + 1) % 1 - 0.5) < 0.17;
      const k = (yy * w + xx) * 4, mul = bar ? 0.9 : 0.74;
      d[k] = d[k] * mul; d[k + 1] = d[k + 1] * mul; d[k + 2] = d[k + 2] * (mul + 0.02);
    }
    g.putImageData(img, x0, y0);
    groundPatch(img, x0, y0);
  }
  // halos of lit lamps and the green glow of the vision slit, over the 3D picture
  function drawMachineFx(ctx, k, X, Y) {
    for (const m of MACHINES) {
      if (!machineHere(m) || !m.bones || !m.snap) continue;
      const s = m.snap, B = m.bones, D = m.K.D;
      if (s.lamps) for (const [b, p, dir] of D.lamps) {
        const n = xfDir(B[b], dir);
        if (dot(n, TOCAM) < -0.15) continue;
        const q = wpx(xf(B[b], p)), x = X(q[0]), y = Y(q[1]);
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) px(ctx, x + dx, y + dy, k, 'rgba(255,236,170,0.42)');
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(ctx, x + dx, y + dy, k, 'rgba(255,248,215,0.8)');
      }
      if (s.glow > 0.5 && s.shutter > 0.5) for (const [b, p, dir] of D.glows) {
        const n = xfDir(B[b], dir);
        if (dot(n, TOCAM) < 0.05) continue;
        const q = wpx(xf(B[b], p));
        for (const dx of [-3, -1, 1, 3]) px(ctx, X(q[0] + dx), Y(q[1]) - 1, k, 'rgba(120,255,160,0.35)');
      }
    }
  }

  // ---------- walking: the body surges while a foot is in the air, feet step to keep under it ----------
  function stepTarget(m, i, T) {
    const D = m.K.D;
    let x = m.x, z = m.z, yaw = m.yaw, lead = 0;
    if (m.want) {
      const dx = m.want.x - m.x, dz = m.want.z - m.z, d = Math.hypot(dx, dz);
      const err = d > 0.05 ? wrapA(Math.atan2(dx, dz) - m.yaw) : 0;
      yaw = m.yaw + clamp(err, -D.turn * T, D.turn * T);
      if (Math.abs(err) < D.walkErr && d > 0.05) {
        const adv = Math.min(d, D.speed * 0.72 * T);
        x += dx / d * adv; z += dz / d * adv;
        lead = Math.min(D.lead, Math.max(0, d - adv));
      }
    }
    return { p: footHome(m, i, yaw, x, z, lead), yaw };
  }
  function startSwing(m, i) {
    const D = m.K.D, f = m.feet[i], t = stepTarget(m, i, D.stepT);
    m.sw = { i, t: 0, T: D.stepT, from: f.p.slice(), to: t.p, yaw0: f.yaw, yaw1: t.yaw };
  }
  function updateFeet(m, dt) {
    const D = m.K.D;
    if (m.sw) {
      const sw = m.sw, f = m.feet[sw.i];
      sw.t += dt;
      const u = clamp(sw.t / sw.T, 0, 1);
      if (u < 0.6) { const t = stepTarget(m, sw.i, sw.T - sw.t); sw.to = [lerp(sw.to[0], t.p[0], 0.25), lerp(sw.to[1], t.p[1], 0.25)]; sw.yaw1 = t.yaw; }
      const e = smooth(u);
      f.p = [lerp(sw.from[0], sw.to[0], e), lerp(sw.from[1], sw.to[1], e)];
      f.yaw = sw.yaw0 + wrapA(sw.yaw1 - sw.yaw0) * e;
      f.y = D.lift * Math.pow(Math.sin(Math.PI * u), 0.7);
      f.pitch = u < 0.2 ? 0.28 * Math.sin(Math.PI * u / 0.2) : -0.2 * Math.sin(Math.PI * (u - 0.2) / 0.8);
      f.toe = u < 0.2 ? -f.pitch * 0.9 : 0;
      if (u >= 1) { f.y = 0; f.pitch = 0; f.toe = 0; m.sw = null; m.settle = D.settle; m.next = 1 - sw.i; stomp(m, sw.i, m.walking ? 1 : 0.7); }
      return;
    }
    m.settle -= dt;
    if (m.settle > 0) return;
    if (m.walking) { startSwing(m, m.next); return; }
    // standing still: square the feet up under the body, the worse one first
    let worst = -1, wd = 0.08;
    for (const i of [m.next, 1 - m.next]) {
      const h = footHome(m, i), f = m.feet[i], d = Math.hypot(h[0] - f.p[0], h[1] - f.p[1]) + Math.abs(wrapA(m.yaw - f.yaw)) * 0.3;
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst >= 0) startSwing(m, worst);
  }
  // how far behind the body the rearmost planted foot is
  function footLag(m) {
    const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
    let lag = 0;
    for (let i = 0; i < 2; i++) { if (m.sw && m.sw.i === i) continue; const f = m.feet[i]; lag = Math.max(lag, -((f.p[0] - m.x) * fx + (f.p[1] - m.z) * fz)); }
    return lag;
  }
  function updateWalk(m, dt) {
    const D = m.K.D, driven = hero.vehicle === m.inst && hero.inside, path = driven ? hero.path : [];
    while (path.length && Math.hypot(path[0].x - m.x, path[0].z - m.z) < 0.06) path.shift();
    m.want = path.length ? path[0] : null;
    m.walking = !!m.want;
    const sw = m.sw, u = sw ? clamp(sw.t / sw.T, 0, 1) : 0;
    const pulse = sw ? 0.3 + 0.95 * Math.sin(Math.PI * u) : 0.1;
    if (m.want) {
      const dx = m.want.x - m.x, dz = m.want.z - m.z, d = Math.hypot(dx, dz);
      const err = wrapA(Math.atan2(dx, dz) - m.yaw), rate = D.turn * (0.35 + pulse) * dt;
      m.yaw = wrapA(m.yaw + clamp(err, -rate, rate));
      if (Math.abs(err) < D.walkErr) {
        let v = D.speed * pulse * (1 - Math.abs(err) / D.walkErr * 0.6);
        const lag = footLag(m);
        if (lag > D.maxLag) v *= clamp(1 - (lag - D.maxLag) / 0.2, 0, 1);
        const st = Math.min(d, v * dt);
        if (d > 1e-4) { m.x += dx / d * st; m.z += dz / d * st; }
      }
    }
    updateFeet(m, dt);
    // the body: weight over the standing foot, a rise mid-step, a sag after each footfall, a lean into the walk
    const tx = sw ? (sw.i === 0 ? -1 : 1) * D.sway * Math.sin(Math.PI * u) : 0;
    m.bodyX += (tx - m.bodyX) * Math.min(1, dt * 6);
    m.roll = -m.bodyX * 0.5;
    m.compT += dt;
    const comp = m.compT < D.compT ? Math.sin(Math.PI * m.compT / D.compT) * m.compA : 0;
    m.bodyY = (sw ? D.rise * Math.sin(Math.PI * u) : 0) - comp;
    m.pitch += ((m.walking ? D.leanWalk : 0) + comp * 0.6 - m.pitch) * Math.min(1, dt * 5);
    const tw = sw ? (sw.i === 0 ? 1 : -1) * D.twist * Math.sin(Math.PI * u) : 0;
    m.twist += (tw - m.twist) * Math.min(1, dt * 4);
    for (let k = 0; k < 2; k++) {
      const a = m.arms[k], r = D.armRest, sgn = sw ? ((sw.i === 0) === (k === 1) ? 1 : -1) : 0;
      a.pitch += (r.pitch + sgn * D.armSwing * Math.sin(Math.PI * u) - a.pitch) * Math.min(1, dt * 3);
      a.elbow += (r.elbow + comp * 3 - a.elbow) * Math.min(1, dt * 6);
      a.roll += (r.roll - a.roll) * Math.min(1, dt * 3); a.wrist += (r.wrist - a.wrist) * Math.min(1, dt * 3); a.grip += (r.grip - a.grip) * Math.min(1, dt * 3);
    }
    m.lean += (D.leanStand - m.lean) * Math.min(1, dt * 3);
    // now and then the cupola looks around while standing
    m.lookT -= dt;
    if (m.walking) m.cupola += (0 - m.cupola) * Math.min(1, dt * 2);
    else if (m.lookT < 0) { m.lookT = 3 + Math.random() * 4; m.lookTo = (Math.random() - 0.5) * 1.6; }
    else if (m.lookTo != null) m.cupola += (m.lookTo - m.cupola) * Math.min(1, dt * 1.5);
  }

  // ---------- waking up and parking: scripted ----------
  const once = (m, name, t, at) => { if (t >= at && !m.ev[name]) { m.ev[name] = true; return true; } return false; };
  function setMode(m, mode) { m.mode = mode; m.mt = 0; m.ev = {}; }
  const WAKE_T = 6.1, PARK_T = 2.2;
  function updateWaking(m, dt, B) {
    const t = m.mt, D = m.K.D;
    m.glow = 0.6 * span(t, 0, 0.3) + 0.4 * smooth(span(t, 2.6, 3.0));
    if (once(m, 'c1', t, 0.45)) { exhaustPuff(m, B, 0, 'cough'); m.shud = 0.6; }
    if (once(m, 'c2', t, 1.05)) { exhaustPuff(m, B, 1, 'cough'); exhaustPuff(m, B, 0, 'cough'); m.shud = 1; shake(1, 0.2); }
    if (once(m, 'go', t, 1.55)) { m.engine = 1; exhaustPuff(m, B, 0, 'cough'); exhaustPuff(m, B, 1, 'cough'); m.shud = 0.8; }
    m.lamps = !m.lampsOn ? 0 : t < 1.9 ? 0 : t < 2.6 ? [1, 0, 1, 1, 0, 0, 1][Math.floor((t - 1.9) / 0.1)] : 1;
    m.shutter = smooth(span(t, 2.6, 3.0));
    m.cupola = t < 3.5 ? -0.8 * smooth(span(t, 3.0, 3.5)) : t < 4.1 ? lerp(-0.8, 0.8, smooth(span(t, 3.5, 4.1))) : 0.8 * (1 - smooth(span(t, 4.1, 4.5)));
    // servo check: each arm bends, the fingers clench and open
    for (let k = 0; k < 2; k++) {
      const a = m.arms[k], r = D.armRest, t0 = 3.2 + k * 0.35;
      a.elbow = r.elbow + 0.75 * bump(t, t0, t0 + 0.8);
      a.pitch = r.pitch + 0.25 * bump(t, t0, t0 + 0.8);
      a.grip = t < t0 + 0.25 ? lerp(r.grip, 1, span(t, t0, t0 + 0.25)) : t < t0 + 0.55 ? lerp(1, 0, span(t, t0 + 0.25, t0 + 0.55)) : lerp(0, r.grip, span(t, t0 + 0.55, t0 + 0.85));
    }
    // stand up: the knee foot comes under the body first, then the body rises and the other foot steps back
    const kR = 1 - smooth(span(t, 4.5, 5.0)), kL = 1 - smooth(span(t, 5.35, 5.8));
    m.feet[1] = footPose(m, 1, kR); m.feet[0] = footPose(m, 0, kL);
    m.crouch = t < 5.0 ? 1 - 0.12 * smooth(span(t, 4.5, 5.0)) : 0.88 * (1 - smooth(span(t, 5.0, 5.95)));
    m.lean = lerp(D.leanPark, D.leanStand, smooth(span(t, 4.6, 5.9)));
    if (once(m, 'h1', t, 4.55)) hissPuff(m, B, true);
    if (once(m, 's1', t, 5.0)) stomp(m, 1, 0.8);
    if (once(m, 'h2', t, 5.2)) hissPuff(m, B, false);
    if (once(m, 's2', t, 5.8)) stomp(m, 0, 0.9);
    m.compT += dt;
    m.bodyY = m.compT < D.compT ? -Math.sin(Math.PI * m.compT / D.compT) * m.compA : 0;
    if (t >= WAKE_T) { setMode(m, 'ready'); m.next = 1; if (hero.vehicle === m.inst) toast(m.K.texts.ready); }
  }
  function updateParking(m, dt, B) {
    const t = m.mt, D = m.K.D;
    m.crouch = 0.88 * smooth(span(t, 0.45, 1.2)) + 0.12 * smooth(span(t, 1.2, 1.45));
    m.feet[0] = footPose(m, 0, smooth(span(t, 0.05, 0.5)));
    m.feet[1] = footPose(m, 1, smooth(span(t, 0.8, 1.4)));
    m.lean = lerp(D.leanStand, D.leanPark, smooth(span(t, 0.4, 1.4)));
    if (once(m, 's1', t, 0.5)) stomp(m, 0, 0.7);
    if (once(m, 'h1', t, 0.55)) hissPuff(m, B, true);
    if (once(m, 'k', t, 1.42)) { stomp(m, 1, 1.1); }
    m.shutter = 1 - smooth(span(t, 0.6, 0.95));
    m.lamps = m.lamps && t < 1.0 ? 1 : (t < 1.15 && m.lampsOn ? (Math.floor(t * 20) & 1) : 0);
    m.cupola *= Math.max(0, 1 - dt * 4);
    if (once(m, 'off', t, 1.55)) { exhaustPuff(m, B, 0, 'cough'); m.engine = 0; m.shud = 0.6; }
    m.glow = t < 1.55 ? 1 : lerp(1, 0.3, span(t, 1.55, 1.9));
    m.compT += dt;
    m.bodyY = m.compT < D.compT ? -Math.sin(Math.PI * m.compT / D.compT) * m.compA : 0;
    m.bodyX *= Math.max(0, 1 - dt * 5); m.roll *= Math.max(0, 1 - dt * 5); m.pitch *= Math.max(0, 1 - dt * 5); m.twist *= Math.max(0, 1 - dt * 5);
    for (const a of m.arms) for (const k of ['pitch', 'roll', 'elbow', 'wrist', 'grip']) a[k] += (D.armRest[k] - a[k]) * Math.min(1, dt * 4);
    if (t >= PARK_T) { setMode(m, 'unboarding'); startAct('board', m.inst, { dir: -1 }); }
  }

  function updateMachine(m, dt) {
    m.mt += dt;
    const B = machineBones(m, m);
    if (m.mode === 'waking') updateWaking(m, dt, B);
    else if (m.mode === 'ready') {
      const square = [0, 1].every((i) => { const h = footHome(m, i), f = m.feet[i]; return Math.hypot(h[0] - f.p[0], h[1] - f.p[1]) + Math.abs(wrapA(m.yaw - f.yaw)) * 0.3 < 0.1; });
      if (m.leave && !m.sw && !m.walking && square) { m.leave = false; hero.path.length = 0; setMode(m, 'parking'); }
      else updateWalk(m, dt);
      if (m.leave && m.walking) { hero.path.length = 0; }
      m.lamps = m.lampsOn ? 1 : 0;
    } else if (m.mode === 'parking') updateParking(m, dt, B);
    // engine: idle puffs from alternating pipes, more often under load; flaps and antenna settle
    if (m.engine > 0.5) {
      m.puffT -= dt;
      if (m.puffT <= 0) { m.puffT = (m.walking ? 0.2 : 0.34) + Math.random() * 0.14; m.pipe = 1 - m.pipe; exhaustPuff(m, B, m.pipe, 'idle'); }
    }
    for (let i = 0; i < 2; i++) m.flaps[i] = Math.max(0, m.flaps[i] - dt * 5);
    m.shud = Math.max(0, m.shud - dt * 2.5);
    // the whip antenna lags behind the body and springs back
    const acc = [-(m.pitch - (m.pitchPrev ?? m.pitch)) / Math.max(dt, 1e-3) * 0.4 - m.bodyY * 2, -(m.roll - (m.rollPrev ?? m.roll)) / Math.max(dt, 1e-3) * 0.4];
    m.pitchPrev = m.pitch; m.rollPrev = m.roll;
    for (let k = 0; k < 2; k++) { m.antV[k] += (acc[k] * 0.3 - m.ant[k] * 60) * dt; m.antV[k] *= Math.pow(0.04, dt); m.ant[k] = clamp(m.ant[k] + m.antV[k] * dt, -0.25, 0.25); }
    if (m.inst) { m.inst.blocks[0].c = [m.x, m.z]; }
    if (hero.vehicle === m.inst && hero.inside) { hero.x = m.x; hero.z = m.z; hero.y = 0; hero.yaw = hero.tyaw = m.yaw; }
  }
  function updateMachines(dt) { for (const m of MACHINES) if (machineHere(m)) updateMachine(m, dt); }

  // ---------- getting in and out: one timeline, played forward to get in and backward to get out ----------
  const BT = { a1: 0.35, a2: 1.15, a3: 1.35, a4: 1.55, b0: 1.95, b1: 2.55, b2: 3.05, c1: 3.75, c2: 4.35, c3: 5.05, c4: 5.85, d1: 6.0, d2: 6.6, d3: 7.0 };
  function boardAnchors(m) {
    const D = m.K.D, B = machineBones(m, m);
    const P = (b, p) => xf(B[b], p), loc = (lx, lz) => { const w = mLocal(m, lx, lz); return [w[0], 0, w[1]]; };
    const fwd = [Math.sin(m.yaw), 0, Math.cos(m.yaw)], hh = standHips(HERO.D);
    const step = P(D.board.step[0], D.board.step[1]), sill = P('torso', D.board.sill), seat = P('torso', D.board.seat);
    const wheelSpot = loc(D.board.x, D.board.zWheel), doorSpot = loc(D.board.x, D.board.zDoor);
    const H1 = lerpV(step, doorSpot, 0.36); H1[1] = step[1] * 0.55 + hh - 0.03;
    return { wheelSpot, doorSpot, step, sill, seat, H0: add(doorSpot, [0, hh, 0]), H1, H2: add(add(sill, scl(fwd, -0.24)), [0, 0.47, 0]), H3: add(add(sill, scl(fwd, -0.05)), [0, 0.1, 0]), H4: seat };
  }
  // the hero's hips, pose and hands at time t of the timeline; the machine's hatch parts too
  function boardAt(a, m, t) {
    const D = m.K.D, A = a.P, out = { hips: null, xz: null, pose: { kind: 'board', w: 1, from: 'stand', to: null, k: 0 }, hands: null };
    // the hatch
    out.mach = {
      wheel: -2.6 * smooth(span(t, BT.a1, BT.a2)) + 2.6 * smooth(span(t, BT.d2, BT.d3)),
      dogs: smooth(span(t, BT.a2, BT.a3)) * (1 - smooth(span(t, BT.d2 + 0.1, BT.d3))),
      door: t < BT.a4 ? 0.05 * smooth(span(t, BT.a3, BT.a4)) : t < BT.b0 ? lerp(0.05, 0.27, smooth(span(t, BT.a4, BT.b0))) : t < BT.b1 ? lerp(0.27, 0.6, smooth(span(t, BT.b0, BT.b1)))
        : t < BT.d1 ? lerp(0.6, 1, 1 - Math.pow(1 - span(t, BT.b1, BT.b2), 2)) : 1 - Math.pow(span(t, BT.d1, BT.d2), 2)
    };
    // where the hero stands, and the little step back while the hatch comes up
    const zs = lerpV(A.wheelSpot, A.doorSpot, smooth(span(t, BT.a4, BT.b0)));
    out.xz = [zs[0], zs[2]];
    const back = bump(t, BT.a4, BT.b0);
    if (back > 0) { out.pose.back = back * 0.8; out.pose.bph = 0.5 - span(t, BT.a4, BT.b0) * 0.5; }
    // the hands
    const wg = (s) => (B) => xf(B.wheel, [s * 0.105, 0, -0.02]);
    const dg = (s) => (B) => xf(B.door, [s * 0.14, D.board.grip, -0.13]);
    const hd = (s) => (B) => xf(B.torso, [s * D.board.handle[0], D.board.handle[1], D.board.handle[2]]);
    const tp = (s) => (B) => xf(B.torso, [s * D.board.top[0], D.board.top[1], D.board.top[2]]);
    if (t < BT.a3) out.hands = { l: wg(1), r: wg(-1), w: smooth(span(t, 0, BT.a1)) };
    else if (t < BT.b1) out.hands = { l: dg(1), r: dg(-1), w: 1, mixFrom: t < BT.a4 ? { l: wg(1), r: wg(-1), k: 1 - smooth(span(t, BT.a3, BT.a4)) } : null };
    else if (t < BT.b2) out.hands = { l: dg(1), r: dg(-1), w: 1 - smooth(span(t, BT.b1, BT.b2)) };
    else if (t < BT.c1) out.hands = { l: hd(1), r: hd(-1), w: smooth(span(t, BT.b2 + 0.2, BT.c1)) };
    else if (t < BT.c3) { const k = smooth(span(t, BT.c1, BT.c2)); out.hands = { l: k > 0.5 ? tp(1) : hd(1), r: k > 0.25 ? tp(-1) : hd(-1), w: 1 }; }
    else if (t < BT.c4) out.hands = { l: tp(1), r: tp(-1), w: 1 - smooth(span(t, BT.c3, BT.c3 + 0.45)) };
    // climbing
    if (t >= BT.b2) {
      out.xz = null;
      let H, P = out.pose;
      if (t < BT.c1) { const u = span(t, BT.b2, BT.c1); H = lerpV(A.H0, A.H1, smooth(u)); Object.assign(P, { from: 'stand', to: 'climb', k: smooth(span(u, 0, 0.35)), ph: u * 0.5 }); }
      else if (t < BT.c2) { const u = span(t, BT.c1, BT.c2); H = lerpV(A.H1, A.H2, smooth(u)); Object.assign(P, { from: 'climb', ph: 0.5 + u * 0.5 }); }
      else if (t < BT.c3) { const u = span(t, BT.c2, BT.c3); H = lerpV(A.H2, A.H3, smooth(u)); H[1] += 0.06 * Math.sin(Math.PI * u); Object.assign(P, { from: 'climb', to: 'sill', k: smooth(u), ph: 1, lean: 0.25 }); }
      else if (t < BT.c4) { const u = span(t, BT.c3, BT.c4); H = lerpV(A.H3, A.H4, smooth(u)); Object.assign(P, { from: 'sill', to: 'seat', k: smooth(u), lean: 0.25 + 0.45 * Math.sin(Math.PI * u) - 0.2 * u }); }
      else { H = A.H4; Object.assign(P, { from: 'seat', lean: 0.05 }); }
      out.hips = H;
    }
    return out;
  }
  ACT.board = {
    update(a, dt) {
      const m = a.inst.machine;
      if (!a.P) { a.P = boardAnchors(m); a.dir = a.dir || 1; }
      a.st += dt;
      const t = a.dir > 0 ? Math.min(BT.d3, a.st) : Math.max(0, BT.d3 - a.st), tq = Math.floor(t * FPS) / FPS;
      const prevDoor = m.door;
      const S = boardAt(a, m, t);
      Object.assign(m, S.mach);
      const Q = boardAt(a, m, tq);      // the hero is drawn in twelve steps a second, like everything else
      Object.assign(a, { hips: Q.hips, pose: Q.pose, hands: S.hands, stage: t < BT.b1 ? 'hatch' : t < BT.c4 ? 'climb' : 'close' });
      if (Q.hips) { hero.x = Q.hips[0]; hero.z = Q.hips[2]; hero.y = Math.max(0, Q.hips[1] - standHips(HERO.D)); }
      else if (Q.xz) { hero.x = Q.xz[0]; hero.z = Q.xz[1]; hero.y = 0; }
      hero.yaw = hero.tyaw = m.yaw;
      const B = machineBones(m, m);
      // sounds you can see: the dogs clunk, the hatch slams
      if (a.dir > 0 && !a.slam && t >= BT.d2) { a.slam = true; clankAt(xf(B.door, [0, -0.74, -0.06])); shake(1.4, 0.14); m.shud = 0.5; }
      if (a.dir < 0 && !a.slam && t <= BT.a3 + 0.02) { a.slam = true; clankAt(xf(B.door, [0, -0.74, -0.06])); shake(1.0, 0.12); }
      if (!a.clunk && ((a.dir > 0 && t >= BT.a3) || (a.dir < 0 && t <= BT.d2))) { a.clunk = true; clankAt(xf(B.wheel, [0, 0, -0.04])); }
      if (a.dir < 0 && !a.pop && m.door > 0.02 && prevDoor <= 0.02) { a.pop = true; hissPuff(m, B, false); }
      // who is where
      if (a.dir > 0 && t >= BT.c4) hero.inside = true;
      if (a.dir < 0 && t < BT.c3) hero.inside = false;
      if (a.dir > 0 && t >= BT.d3) {
        a.done = true; hero.vehicle = a.inst; hero.inside = true;
        NAV.big.skip = a.inst; buildNav(NAV.big);
        setMode(m, 'waking'); m.compT = 9;
      }
      if (a.dir < 0 && t <= 0) {
        a.done = true; hero.vehicle = null; hero.inside = false; hero.y = 0;
        setMode(m, 'parked'); m.glow = 0; NAV.big.skip = null; buildNav(NAV.hero);
        a.after = () => toast(m.K.texts.out);
      }
    },
    ctx: (a) => a.pose || null,
    base: (a) => a.hips ? M(tr(a.hips[0], a.hips[1], a.hips[2]), ry(hero.yaw)) : null,
    hands(a) {
      const h = a.hands; if (!h || h.w <= 0) return null;
      const m = a.inst.machine, B = m.bones || machineBones(m, m);
      let l = h.l(B), r = h.r(B);
      if (h.mixFrom) { l = lerpV(l, h.mixFrom.l(B), h.mixFrom.k); r = lerpV(r, h.mixFrom.r(B), h.mixFrom.k); }
      return { l, r, w: h.w };
    },
    state: (a) => a.dir < 0 ? (a.stage === 'climb' ? 'вылезает' : 'закрывает люк') : (a.stage === 'hatch' ? 'открывает люк' : a.stage === 'climb' ? 'забирается внутрь' : 'задраивает люк')
  };

  // ---------- what the game asks ----------
  function machineFocus(inst) { const m = inst.machine, B = m.bones || machineBones(m, m); return xf(B.torso, [0, 0.5, 0]); }
  const heroHidden = () => !!(hero.inside && hero.vehicle && hero.vehicle.machine && hero.vehicle.machine.door < 0.03);
  const driving = () => !!(hero.inside && hero.vehicle);
  function machineCanTravel(inst) { return inst.machine.mode === 'ready'; }
  function machineWalkTo(inst, x, z) { walkTo(x, z); }
  function goBoard(inst) {
    const m = inst.machine, T = m.K.texts;
    if (armored()) { toast(T.armour); return; }
    if (m.mode !== 'parked') return;
    hero.smoke.on = false; hero.drink.on = false;
    const A = boardAnchors(m);
    plan({ type: 'path', to: [A.wheelSpot[0], A.wheelSpot[2]] }, { type: 'goto', x: A.wheelSpot[0], z: A.wheelSpot[2] }, { type: 'face', yaw: m.yaw }, { type: 'turned' },
      { type: 'call', fn: () => { setMode(m, 'boarding'); } }, { type: 'act', kind: 'board', inst, opts: { dir: 1 } });
  }
  function machineExit(inst) {
    const m = inst.machine;
    if (m.mode !== 'ready') return;
    // the hatch is at the back: there has to be room behind to climb down (the walk grid is redone without the machine itself)
    NAV.hero.skip = inst; buildNav(NAV.hero); NAV.hero.skip = null;
    for (const lz of [-0.75, -1.05, -1.4]) { const p = mLocal(m, 0.02, lz); if (p[0] < 0.4 || p[1] < 0.4 || p[0] > GW - 0.4 || p[1] > GH - 0.4 || blockedAt(p[0], p[1], NAV.hero)) { toast(m.K.texts.noRoom); return; } }
    m.leave = true; hero.path.length = 0; hero.queue.length = 0; hero.target = null;
  }
  function machineActions(inst) {
    const m = inst.machine, T = m.K.texts;
    if (driving() && hero.vehicle === inst) return machinePilotActions(inst);
    if (m.mode !== 'parked') return [];
    return [{ label: T.board, run: () => goBoard(inst) }, { label: T.knockLabel, run: () => goKnock(inst) }];
  }
  function goKnock(inst) {
    const m = inst.machine, A = boardAnchors(m);
    plan({ type: 'path', to: [A.doorSpot[0], A.doorSpot[2]] }, { type: 'face', yaw: m.yaw }, { type: 'turned' },
      { type: 'reach', to: [-0.12, 0.2, 0.5], cb: () => { toast(m.K.texts.knock); clankAt(xf((m.bones || machineBones(m, m)).torso, [0, 0.4, -0.5])); } }, { type: 'waitReach' });
  }
  function machinePilotActions(inst) {
    const m = inst.machine, T = m.K.texts;
    if (m.mode !== 'ready') return [];
    return [
      { label: T.exit, run: () => machineExit(inst) },
      { label: m.lampsOn ? T.lampsOff : T.lampsOn, run: () => { m.lampsOn = !m.lampsOn; } },
      { label: T.look, run: () => { m.lookTo = m.cupola > 0 ? -1.1 : 1.1; m.lookT = 2.5; } }
    ];
  }
  function machineNote(inst) {
    const m = inst.machine, T = m.K.texts;
    if (driving() && hero.vehicle === inst) return m.mode === 'ready' ? T.pilotNote : T.wakeNote;
    return m.mode === 'parked' ? T.note : '';
  }
  function machineState(inst) {
    const m = inst.machine;
    return m.mode === 'waking' ? 'в костюме · заводит' : m.mode === 'parking' ? 'в костюме · глушит' : m.walking ? 'в костюме · шагает' : 'в костюме';
  }
  // what survives a page update: where each machine stands (the hero is put back outside)
  function machinesHot() { return MACHINES.map((m) => ({ kind: m.kind, n: m.n, loc: m.loc || MAP.id, x: m.x, z: m.z, yaw: m.yaw })); }
  function machinesFromHot(list) {
    makeMachines();
    if (!Array.isArray(list)) return;
    for (const d of list) {
      const m = MACHINES.find((q) => q.kind === d.kind && q.n === d.n);
      if (!m || !LOCATIONS[d.loc] || !Number.isFinite(d.x) || !Number.isFinite(d.z)) continue;
      Object.assign(m, { loc: d.loc, x: d.x, z: d.z, yaw: d.yaw || 0 });
      m.feet = [0, 1].map((i) => footPose(m, i, 1));
    }
  }
