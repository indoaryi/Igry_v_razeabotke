  // ================= «32»: the second walking suit, from the player's own sketch =================
  // A boxy hull on short thick legs, no head: a block with a flat roof, flat sides and back, and on its front a big
  // bulging pod — the cockpit. The pod swings up on a hinge under the roof's front edge like a visor; the pilot curls up
  // inside. A big shoulder plate with «32» on the right, a vent grille behind it, a twin lamp in the pinch of the pod,
  // a lattice sensor mast with a four-prong claw on the roof and a whip antenna, canisters, a pump and hoses on the back.
  // Grey hammered steel, rust in the chips. It parks low on both feet, knees forward, leaning back, so the pod faces up.
  // Sizes in metres; +x is the suit's left, +z its front.
  {
    const STEEL = '#7b8186', RUSTY = '#7a5946';
    const steel = (o = {}) => mat(o.c || STEEL, { pat: 50, b: o.b || RUSTY, p: [o.hs ?? 0, o.vs ?? 0, o.rv ?? 0, o.wear ?? 0.28], r: [0, o.mud ?? 0.015, 0, 0], noise: o.noise ?? 0.07, grain: 30, spec: o.spec ?? 0.3, gloss: 10 });
    const MM = {
      hull: steel({ c: '#6f757a', b: '#55595d', wear: 0.2, noise: 0.055 }),
      plate: steel({ c: '#696f74', b: '#5e5650', wear: 0.26, noise: 0.055 }),
      leg: steel({ c: '#676d72', hs: 2.4, rv: 9, wear: 0.38, mud: 0.08 }),
      foot: steel({ c: '#606569', wear: 0.5, mud: 0.17 }),
      can: steel({ c: '#7b7569', b: '#7c4b33', wear: 0.55 }),
      inner: mat('#8b9094', { pat: 23, p: [7, 0, 0, 0], noise: 0.04, spec: 0.2, gloss: 8 }),
      pad: Object.assign(mat('#3a3d3c', { pat: 23, p: [16, 0, 0, 0], noise: 0.05, grain: 40 }), { noShadow: true }),
      seat: mat('#2f2b27', { pat: 23, p: [22, 0, 0, 0], noise: 0.05, grain: 40 }),
      jamb: mat('#4a4e50', { noise: 0.04, spec: 0.3, gloss: 10 }),
      dark: mat('#3a3c3d', { noise: 0.06, grain: 50, spec: 0.45, gloss: 14 }),
      ribs: mat('#363837', { pat: 23, p: [34, 0, 0, 0], noise: 0.05, spec: 0.3, gloss: 12 }),
      hose: mat('#2f3130', { pat: 23, p: [38, 0, 0, 0], noise: 0.05, spec: 0.35, gloss: 12 }),
      rod: mat('#b9bdbb', { noise: 0.02, spec: 1, gloss: 26 }),
      barrel: mat('#474a4b', { noise: 0.04, spec: 0.55, gloss: 16 }),
      rubber: mat('#262725', { noise: 0.04 }),
      grille: mat('#2e302f', { pat: 12, p: [0.012, 22, 0, 0], noise: 0.03 }),
      lens: mat('#cdc6a4', { noise: 0.02, spec: 1, gloss: 20 }),
      lensOn: flat('#fff3c4', 4),
      eye: mat('#24352d', { noise: 0.02, spec: 1, gloss: 20 }),
      eyeOn: flat('#7ef0a8', 4),
      wire: Object.assign(flat('#202221', 0), { fl: 1, noShadow: true })
    };
    const lampOn = (s) => s.lamps > 0.5, seeing = (s) => s.glow > 0.5 && s.shutter > 0.5;
    const BX = (h) => () => box(h[0], h[1], h[2]);
    const ALONG = (v) => alongPlusY(v);
    // the block: its profile up from the waist — y, half-width, depth behind and in front of the centre line; square behind,
    // a little rounder in front, the roof's edge rounded over the last few; the mesh takes rings at the heights in HULL
    const BLOCK = [[0.0, 0.33, 0.3, 0.2], [0.05, 0.44, 0.38, 0.25], [0.12, 0.52, 0.44, 0.29], [0.22, 0.57, 0.48, 0.32], [0.34, 0.6, 0.5, 0.34], [0.46, 0.61, 0.51, 0.35],
      [0.58, 0.62, 0.51, 0.36], [1.1, 0.62, 0.51, 0.36], [1.2, 0.615, 0.505, 0.355], [1.3, 0.605, 0.5, 0.35], [1.38, 0.59, 0.49, 0.34], [1.43, 0.565, 0.47, 0.32], [1.465, 0.52, 0.43, 0.28], [1.485, 0.45, 0.37, 0.22]];
    const ringAt = (y) => { let k = 0; while (k < BLOCK.length - 2 && BLOCK[k + 1][0] < y) k++; const a = BLOCK[k], b = BLOCK[k + 1], t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1); return { y, hu: lerp(a[1], b[1], t), hb: lerp(a[2], b[2], t), hf: lerp(a[3], b[3], t), cz: 0, exB: 4, exF: 3 }; };
    const HULL = [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.4, 0.49, 0.58, 0.67, 0.76, 0.84, 0.92, 1.0, 1.08, 1.16, 1.23, 1.29, 1.34, 1.38, 1.42, 1.45, 1.47, 1.485].map(ringAt);
    // the pod on its front is the hatch: a bean swelling out of the block, the full width of the front under the roof's edge,
    // pinched at the middle where the lamp sits, wider again lower down and narrowing to a rounded end over the crotch.
    // OPEN.half is the pod's outline (half-angle round the front at each height), POD its swell: B at most, at height yp
    const POD = { y0: 0.05, y1: 1.42, yp: 0.98, B: 0.52, out: 0.035, in: 0.04 };
    const OPEN = { k0: 1, k1: 20, m: 16, half: curve1([[0.05, 0.32], [0.12, 0.55], [0.22, 0.7], [0.34, 0.78], [0.46, 0.79], [0.58, 0.72], [0.7, 0.62], [0.82, 0.56], [0.92, 0.6], [1.02, 0.72], [1.12, 0.88], [1.22, 1.02], [1.3, 1.1], [1.36, 1.1], [1.4, 1.04], [1.42, 0.92]]) };
    const bulge = (y, u, n) => {
      const up = y >= POD.yp, s = clamp(up ? (y - POD.yp) / (POD.y1 - POD.yp) : (POD.yp - y) / (POD.yp - POD.y0), 0, 1);
      const v = Math.pow(1 - s * s, up ? 0.5 : 0.6), w = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.2)), 0.6);
      return scl(nrm(add(scl(n, 0.35), [0, 0, 1])), POD.B * v * w);
    };
    // points on the block: y up, a round it (π/2 straight ahead, 0 its left side, π its right), pushed out along the surface by `out`;
    // and on the pod's outer skin (onPod) and inner skin (inPod, `inn` further in). The fittings are placed with these,
    // so they stay on the skin when the hull is reshaped
    const surf = (y, a) => hullPoint(ringAt(y), a);
    const normalOf = (f, y, a) => { const d = 0.01, p = f(y, a), n = nrm(cross(sub(f(y + d, a), f(y - d, a)), sub(f(y, a + d), f(y, a - d)))); return dot(n, [p[0], 0, p[2]]) < 0 ? scl(n, -1) : n; };
    const surfN = (y, a) => normalOf(surf, y, a);
    const onHull = (y, a, out = 0) => add(surf(y, a), scl(surfN(y, a), out));
    const podSkin = (y, a, d) => { const n = surfN(y, a); return add(add(surf(y, a), scl(n, d)), bulge(y, (a - Math.PI / 2) / OPEN.half(y), n)); };
    const podOut = (y, a) => podSkin(y, a, POD.out), podN = (y, a) => normalOf(podOut, y, a);
    const onPod = (y, a, out = 0) => add(podOut(y, a), scl(podN(y, a), out));
    const inPod = (y, a, inn = 0) => add(podSkin(y, a, -POD.in), scl(podN(y, a), -inn));
    // the angle of the opening's edge at height y on the left (side 1) or the right (−1); by > 0 moves out of the opening
    const edgeA = (y, side = 1, by = 0) => Math.PI / 2 - side * (OPEN.half(y) + by);
    const HINGE = [0, 1.43, surf(1.43, Math.PI / 2)[2] - 0.01];
    const inDoor = (p) => sub(p, HINGE);
    const LEVER = inDoor(onPod(0.45, Math.PI / 2, 0.007)), LEVER_N = podN(0.45, Math.PI / 2);
    const LAMP = onHull(0.9, edgeA(0.9, -1, 0.36), 0.06);
    const STRUT_A = onHull(1.24, edgeA(1.24, 1, -0.06), -0.05), STRUT_B = inDoor(inPod(0.78, edgeA(0.78, 1, -0.12), 0.02));
    // grab handles either side of the pod, clear of its widest point over their length
    const GRAB_Y = [0.55, 0.8], GRAB_A = Math.max(...[0.55, 0.62, 0.7, 0.8].map((y) => OPEN.half(y))) + 0.12;
    const grabAt = (sg) => onHull(0.675, Math.PI / 2 - sg * GRAB_A, 0.035);
    let shape = null;
    const hullShape = () => shape || (shape = splitHull(HULL, { seg: 48, open: OPEN, wall: 0.05, out: POD.out, shellIn: POD.in, capTop: 0.005, bulge }));
    // a flat plate cut to a convex outline (x, y pairs), thick along z
    const slab = (pts, th) => { const f = pts.map(([x, y]) => [x, y, th / 2]), b = pts.map(([x, y]) => [x, y, -th / 2]).reverse(), side = []; for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; side.push([[pts[i][0], pts[i][1], -th / 2], [pts[j][0], pts[j][1], -th / 2], [pts[j][0], pts[j][1], th / 2], [pts[i][0], pts[i][1], th / 2]]); } return polyMesh([f, b, ...side]); };
    const facing = (n) => frameY([0, 1, 0], nrm(n));     // a frame whose +z looks out of the hull along n

    MACHINE_KINDS.b32 = {
      name: 'Бронекостюм «32»',
      D: {
        hipX: 0.31, thigh: 0.46, shin: 0.46, ankleY: 0.17, footX: 0.32, footZ: 0.03, toeAt: [0, -0.11, 0.21], sole: [0.185, 0.35, -0.27], kneeOut: 0.3,
        hipStand: 1.0, hipPark: 0.56, waistY: 0.12, waistZ: 0.0, leanPark: -0.16, leanStand: 0.0, leanWalk: 0.04, height: 3.25, reach: 1.05, blockR: 0.8,
        // parked: low on both feet, a little apart and forward, knees out, leaning back so the opening looks up
        parkStyle: 'squat',
        park: [{ x: 0.37, z: 0.14, y: 0, pitch: 0, toe: 0 }, { x: -0.37, z: 0.14, y: 0, pitch: 0, toe: 0 }],
        cupolaAt: [-0.17, 1.49, -0.17], mastH: 0.55, hinge: HINGE, doorMax: -1.95, wheelAt: LEVER, wheelTilt: Math.atan2(-LEVER_N[1], LEVER_N[2]),
        exhausts: [{ hinge: [0.09, 1.105, -0.545], tip: [0.09, 1.14, -0.52] }, { hinge: [-0.09, 1.105, -0.545], tip: [-0.09, 1.14, -0.52] }],
        antenna: [0.2, 1.495, -0.12],
        shX: 0.68, shY: 0.7, shZ: 0.0, upper: 0.38, fore: 0.4,
        armRest: { pitch: 0.08, roll: 0.07, elbow: 0.3, wrist: 0.1, grip: 0.45 },
        armRestR: { pitch: 0.24, roll: 0.0, elbow: 0.62, wrist: 0.2, grip: 0.62 },
        armPark: { pitch: 0.62, roll: 0.14, elbow: 0.45, wrist: 0.35, grip: 0.3 },
        fingers: [{ name: 'F1', at: [0.058, -0.12, 0.045], curl: [0.15, 1.2] }, { name: 'F2', at: [0.02, -0.125, 0.045], curl: [0.15, 1.2] }, { name: 'F3', at: [-0.018, -0.125, 0.045], curl: [0.15, 1.2] },
          { name: 'F4', at: [-0.054, -0.12, 0.045], curl: [0.15, 1.2] }, { name: 'Th', at: [-0.04, -0.07, -0.05], curl: [-0.2, -0.9], splay: 0.3 }],
        speed: 0.8, turn: 1.0, walkErr: 0.55, stepT: 0.64, settle: 0.2, lift: 0.18, lead: 0.28, maxLag: 0.4, sway: 0.065, rise: 0.03, comp: 0.07, compT: 0.36, twist: 0.05, armSwing: 0.14,
        lamps: [['torso', add(LAMP, [0, 0, 0.09]), [0, -0.12, 1], 0.86]],
        glows: [['cupola', [0, 0.57, 0.05], [0, 0, 1]]],
        hiss: [['lShin', [0.18, -0.05, -0.08]], ['rShin', [-0.18, -0.05, -0.08]]],
        board: { style: 'front', pose: 'pod', x: 0, zWheel: 1.3, zDoor: 1.6, step: ['rShin', [0, 0.05, 0.15]], step2: ['lShin', [0, 0.05, 0.15]], sill: onHull(0.07, Math.PI / 2, -0.02), seat: [0, 0.36, -0.14],
          grip: inDoor(onPod(0.12, Math.PI / 2 - 0.3, 0.01)), handle: grabAt(1), sillGrip: onHull(0.1, edgeA(0.1, 1, -0.06), 0), inner: inDoor(inPod(0.75, Math.PI / 2 - 0.07, 0.045)),
          edge: inDoor(onPod(0.06, Math.PI / 2, 0)), knock: onPod(0.85, Math.PI / 2, 0.01) }
      },
      // the kind's own bones: the front shell on its top hinge with a lever and two latch bolts, the sensor mast that turns
      // and opens its claw, two louvres over the exhaust vents, the whip antenna
      bones(B, s, D) {
        B.door = M(B.torso, tr(...D.hinge), rx(s.door * D.doorMax));
        B.wheel = M(B.door, tr(...D.wheelAt), rx(D.wheelTilt), rz(s.wheel));
        B.dogL = M(B.door, tr(0.03 * (1 - s.dogs), 0, 0));
        B.dogR = M(B.door, tr(-0.03 * (1 - s.dogs), 0, 0));
        B.cupola = M(B.torso, tr(...D.cupolaAt), ry(s.cupola));
        const open = 0.12 + 0.62 * s.shutter;
        for (let k = 0; k < 4; k++) B['claw' + k] = M(B.cupola, tr(0, D.mastH + 0.04, 0), ry(Math.PI / 4 + k * Math.PI / 2), tr(0, 0, 0.03), rx(open));
        for (let i = 0; i < 2; i++) B['flap' + i] = M(B.torso, tr(...D.exhausts[i].hinge), rx(-s.flaps[i]));
        B.antenna = M(B.torso, tr(...D.antenna), rx(s.ant[0]), rz(s.ant[1]));
      },
      pistons: [
        ...['l', 'r'].map((s) => ({ a: [s + 'Thigh', [0, -0.1, -0.15]], b: [s + 'Shin', [0, -0.13, -0.155]], rb: 0.035, lb: 0.27, rr: 0.02, lr: 0.27, mb: MM.barrel, mr: MM.rod })),
        ...[1, -1].map((sg) => ({ a: ['torso', [sg * STRUT_A[0], STRUT_A[1], STRUT_A[2]]], b: ['door', [sg * STRUT_B[0], STRUT_B[1], STRUT_B[2]]], rb: 0.02, lb: 0.52, rr: 0.01, lr: 0.46, mb: MM.barrel, mr: MM.rod }))
      ],
      texts: {
        board: 'Забраться внутрь', knockLabel: 'Постучать по броне', exit: 'Выйти', lampsOn: 'Включить фару', lampsOff: 'Выключить фару', look: 'Осмотреться',
        note: 'Сидит на корточках, капсула спереди закрыта. Внутри тесно, место только для одного.',
        knock: 'Звенит, как пустой котёл. Изнутри никто не отвечает.',
        armour: 'В силовой броне в капсулу не влезть. Сними броню в снаряжении.',
        ready: '«32» поднялся. Нажми на землю — пойдёт туда.',
        wakeNote: 'Двигатель прогревается, мачта раскрывает датчики, костюм встаёт.',
        pilotNote: 'Нажми на землю — костюм пойдёт туда. Пока он стоит, мачта сама осматривается.',
        out: 'Капсула закрыта. «32» остался сидеть на корточках.',
        noRoom: 'Спереди нет места, чтобы откинуть капсулу. Отойди от стены.'
      },
      build(put0) {
        const put = (bone, key, fn, off, m, extra) => put0(bone, 'b32:' + key, fn, off, m, extra);
        const H = hullShape(), toHinge = tr(-HINGE[0], -HINGE[1], -HINGE[2]);
        // ---------- the block, its insides and the rubber seal round the opening ----------
        put('torso', 'hull', () => H.hull, null, MM.hull);
        put('torso', 'cavity', () => { const c = H.cavity; return { pos: c.pos, nrm: c.nrm.map((v) => -v), idx: c.idx }; }, null, MM.pad);
        put('torso', 'jamb', () => H.jamb, null, MM.jamb);
        put('torso', 'seal', () => tubeAlong(H.loop.map((p, i) => add(p, scl(H.loopN[i], 0.004))), 0.014, 5, true), null, MM.rubber);
        // inside: a padded seat low at the back, two control grips by the knees, a little panel overhead
        put('torso', 'seatC', () => facets([{ a: -0.06, x0: -0.2, x1: 0.2, b0: -0.3, b1: 0.04, c: 0.04 }, { a: 0.0, x0: -0.21, x1: 0.21, b0: -0.31, b1: 0.05, c: 0.045 }]), tr(0, 0.32, 0), MM.seat);
        put('torso', 'seatB', BX([0.2, 0.26, 0.04]), M(tr(0, 0.62, -0.36), rx(-0.25)), MM.seat);
        for (const sg of [1, -1]) {
          put('torso', 'gripS', () => cyl(0.018, 0.018, 0.18, 6), tr(sg * 0.27, 0.3, 0.12), MM.dark);
          put('torso', 'gripH', () => cyl(0.026, 0.022, 0.08, 6), tr(sg * 0.27, 0.48, 0.12), MM.rubber);
        }
        put('torso', 'panel', BX([0.2, 0.05, 0.08]), M(tr(0, 1.14, -0.05), rx(0.5)), MM.dark);
        put('torso', 'panelL', BX([0.025, 0.012, 0.004]), M(tr(0.08, 1.13, 0.034), rx(0.5)), MM.eye, { alt: MM.eyeOn, when: (s) => s.glow > 0.5 });
        // ---------- the pod: outer skin, inner skin with ribs, rim; lever, latches, a lift handle outside, a pull grip inside ----------
        put('door', 'shell', () => H.shell, toHinge, MM.hull);
        put('door', 'shellIn', () => H.shellIn, toHinge, MM.inner);
        put('door', 'shellEdge', () => H.shellEdge, toHinge, MM.plate);
        put('door', 'hingeBar', () => cyl(0.024, 0.024, 0.62, 8), M(tr(-0.31, 0, -0.01), ALONG([1, 0, 0])), MM.dark);
        const lift = inDoor(onPod(0.2, Math.PI / 2, 0.035)), liftN = podN(0.2, Math.PI / 2);
        put('door', 'lift', () => cyl(0.013, 0.013, 0.22, 6), M(tr(lift[0] - 0.11, lift[1], lift[2]), ALONG([1, 0, 0])), MM.dark);
        for (const sg of [1, -1]) put('door', 'liftS', () => cyl(0.01, 0.01, 0.035, 6), M(tr(...sub(add(lift, [sg * 0.1, 0, 0]), scl(liftN, 0.035))), ALONG(liftN)), MM.dark);
        const pull = inDoor(inPod(0.75, Math.PI / 2, 0.045)), pullN = podN(0.75, Math.PI / 2);
        put('door', 'pull', () => cyl(0.014, 0.014, 0.24, 6), M(tr(pull[0] - 0.12, pull[1], pull[2]), ALONG([1, 0, 0])), MM.dark);
        for (const sg of [1, -1]) put('door', 'pullS', () => cyl(0.01, 0.01, 0.045, 6), M(tr(...add(pull, [sg * 0.11, 0, 0])), ALONG(pullN)), MM.dark);
        // ribs across the inside of the pod, following its curve
        for (const y of [1.15, 0.95, 0.6, 0.3]) put('door', 'rib' + y, () => tubeAlong([-0.86, -0.6, -0.3, 0, 0.3, 0.6, 0.86].map((u) => inDoor(inPod(y, Math.PI / 2 + u * OPEN.half(y), 0.012))), 0.014, 5), null, MM.plate);
        put('wheel', 'lvPlate', () => cyl(0.07, 0.07, 0.012, 12), M(rx(Math.PI / 2)), MM.dark);
        put('wheel', 'lvHub', () => cyl(0.022, 0.022, 0.04, 8), M(rx(Math.PI / 2), tr(0, 0, 0)), MM.dark);
        put('wheel', 'lvBar', BX([0.09, 0.014, 0.014]), tr(0, 0, 0.04), MM.dark);
        for (const [y, by] of [[0.5, -0.1], [0.24, -0.1]]) { const p = inDoor(onPod(y, edgeA(y, 1, by), 0.008)); put('dogL', 'dog', BX([0.03, 0.02, 0.014]), tr(...p), MM.dark); put('dogR', 'dog', BX([0.03, 0.02, 0.014]), tr(-p[0], p[1], p[2]), MM.dark); }
        // ---------- the right shoulder plate with «32», a smaller cap on the left ----------
        put('torso', 'paulR', () => facets([{ a: -0.3, x0: -0.71, x1: -0.6, b0: 0.68, b1: 1.06, c: 0.06 }, { a: -0.26, x0: -0.755, x1: -0.6, b0: 0.64, b1: 1.11, c: 0.09 }, { a: 0.1, x0: -0.77, x1: -0.6, b0: 0.64, b1: 1.12, c: 0.1 }, { a: 0.15, x0: -0.725, x1: -0.6, b0: 0.68, b1: 1.07, c: 0.07 }], { axis: 'z' }), null, MM.plate);
        put('torso', 's32', BX([DECALS.s32.w / 2, DECALS.s32.h / 2, 0.003]), M(tr(-0.773, 0.88, -0.08), ry(-Math.PI / 2), sc3(0.9, 0.9, 1)), decal('s32'));
        put('torso', 'paulL', () => facets([{ a: -0.2, x0: 0.6, x1: 0.69, b0: 0.7, b1: 0.98, c: 0.05 }, { a: -0.16, x0: 0.6, x1: 0.72, b0: 0.67, b1: 1.02, c: 0.07 }, { a: 0.1, x0: 0.6, x1: 0.72, b0: 0.67, b1: 1.02, c: 0.07 }, { a: 0.14, x0: 0.6, x1: 0.69, b0: 0.7, b1: 0.98, c: 0.05 }], { axis: 'z' }), null, MM.plate);
        // the vent grille: a tall slatted panel on the right side, behind the shoulder plate
        const gn = [-1, 0, 0], gc = [-0.62, 0.96, -0.39];
        put('torso', 'grilleF', BX([0.075, 0.17, 0.03]), M(tr(...gc), facing(gn)), MM.dark);
        put('torso', 'grille', BX([0.058, 0.15, 0.045]), M(tr(...gc), facing(gn)), MM.grille);
        // the twin lamp in the pinch of the pod on the right: a housing on the corner, two lenses looking ahead, a little hood
        put('torso', 'lampBox', () => facets([{ a: -0.08, x0: -0.06, x1: 0.05, b0: -0.1, b1: 0.09, c: 0.025 }, { a: 0.08, x0: -0.05, x1: 0.05, b0: -0.09, b1: 0.09, c: 0.025 }], { axis: 'z' }), tr(...LAMP), MM.plate);
        put('torso', 'lampHood', BX([0.06, 0.012, 0.04]), tr(...add(LAMP, [0, 0.1, 0.05])), MM.plate);
        for (const dy of [0.045, -0.045]) put('torso', 'lens', () => ellipsoid(0.033, 0.033, 0.009, { seg: 10, rings: 4 }), tr(...add(LAMP, [0, dy, 0.082])), MM.lens, { alt: MM.lensOn, when: lampOn });
        // grab handles either side of the pod
        for (const sg of [1, -1]) {
          const g = grabAt(sg), gn = surfN(0.675, Math.PI / 2 - sg * GRAB_A);
          put('torso', 'grab', () => cyl(0.014, 0.014, GRAB_Y[1] - GRAB_Y[0], 6), tr(g[0], GRAB_Y[0], g[2]), MM.dark);
          for (const y of [GRAB_Y[0] + 0.04, GRAB_Y[1] - 0.04]) put('torso', 'grabS', () => cyl(0.01, 0.01, 0.04, 6), M(tr(g[0] - gn[0] * 0.035, y, g[2] - gn[2] * 0.035), ALONG([gn[0], 0, gn[2]])), MM.dark);
        }
        // ---------- on the roof: the mast base, two knobs, the whip antenna ----------
        put('torso', 'mastRing', () => cyl(0.09, 0.09, 0.04, 10), tr(-0.17, 1.475, -0.17), MM.dark);
        for (const [x, z, r] of [[0.08, 0.05, 0.04], [-0.02, -0.07, 0.03]]) put('torso', 'knob' + r, () => cyl(r, r * 0.8, 0.035, 8), tr(x, 1.485, z), MM.dark);
        put('torso', 'antBase', () => cyl(0.03, 0.034, 0.05, 8), tr(0.2, 1.475, -0.12), MM.dark);
        put('antenna', 'whip', () => { const pts = [[0, 0, 0], [0, 0.16, -0.004], [0, 0.32, -0.012], [0, 0.46, -0.026]]; return tubeAlong(pts, 0.008, 4); }, null, MM.dark);
        put('antenna', 'whipT', () => ellipsoid(0.016, 0.02, 0.016, { seg: 6, rings: 4 }), tr(0, 0.46, -0.026), MM.dark);
        // the sensor mast: a lattice of four posts with zigzag braces, a hub with a green eye, four claw prongs
        put('cupola', 'mastBase', BX([0.07, 0.035, 0.07]), tr(0, 0.04, 0), MM.plate);
        for (const [x, z] of [[0.045, 0.045], [-0.045, 0.045], [0.045, -0.045], [-0.045, -0.045]]) put('cupola', 'post', BX([0.009, 0.255, 0.009]), tr(x, 0.32, z), MM.dark);
        const zig = [];
        for (let k = 0; k < 5; k++) {
          const y0 = 0.08 + k * 0.094, y1 = y0 + 0.094;
          for (const [a, b] of [[[0.045, 0.045], [-0.045, 0.045]], [[-0.045, 0.045], [-0.045, -0.045]], [[-0.045, -0.045], [0.045, -0.045]], [[0.045, -0.045], [0.045, 0.045]]]) {
            const p = k & 1 ? [a, b] : [b, a];
            zig.push([[p[0][0], y0, p[0][1]], [p[1][0], y1, p[1][1]]]);
          }
        }
        put('cupola', 'braces', () => lineMesh(zig), null, MM.wire);
        put('cupola', 'hub', () => cyl(0.06, 0.045, 0.06, 10), tr(0, 0.545, 0), MM.dark);
        put('cupola', 'eye', BX([0.024, 0.012, 0.006]), tr(0, 0.57, 0.052), MM.eye, { alt: MM.eyeOn, when: seeing });
        for (let k = 0; k < 4; k++) {
          put('claw' + k, 'prong', BX([0.011, 0.06, 0.011]), tr(0, 0.06, 0), MM.dark);
          put('claw' + k, 'prongT', BX([0.009, 0.045, 0.009]), M(tr(0, 0.115, 0.004), rx(-0.6), tr(0, 0.042, 0)), MM.dark);
          put('claw' + k, 'prongK', BX([0.016, 0.016, 0.016]), tr(0, 0.115, 0), MM.dark);
        }
        // ---------- the back: a frame, a vent box with louvres, two canisters, a tank, the pump, hoses, a slot handle ----------
        put('torso', 'frame', BX([0.27, 0.36, 0.02]), M(tr(0, 0.68, -0.52), rx(-0.03)), MM.dark);
        put('torso', 'ventBox', BX([0.17, 0.06, 0.06]), tr(0, 1.04, -0.53), MM.plate);
        put('torso', 'ventG', BX([0.15, 0.045, 0.07]), M(tr(0, 1.04, -0.53), ry(Math.PI)), MM.grille);
        for (let i = 0; i < 2; i++) put('flap' + i, 'flap', BX([0.055, 0.007, 0.045]), tr(0, 0.008, 0.035), MM.dark);
        put('torso', 'canA', () => facets([{ a: -0.21, x0: -0.085, x1: 0.085, b0: -0.065, b1: 0.065, c: 0.03 }, { a: 0.19, x0: -0.085, x1: 0.085, b0: -0.065, b1: 0.065, c: 0.03 }, { a: 0.22, x0: -0.06, x1: 0.06, b0: -0.045, b1: 0.045, c: 0.02 }]), tr(0.11, 0.64, -0.625), MM.can);
        put('torso', 'canB', () => facets([{ a: -0.23, x0: -0.1, x1: 0.1, b0: -0.075, b1: 0.075, c: 0.035 }, { a: 0.21, x0: -0.1, x1: 0.1, b0: -0.075, b1: 0.075, c: 0.035 }, { a: 0.24, x0: -0.07, x1: 0.07, b0: -0.05, b1: 0.05, c: 0.022 }]), tr(-0.15, 0.66, -0.63), MM.can);
        for (const [x, y, z] of [[0.11, 0.875, -0.625], [-0.15, 0.91, -0.63]]) put('torso', 'canCap', () => cyl(0.022, 0.022, 0.03, 8), tr(x, y - 0.02, z), MM.dark);
        put('torso', 'tag', BX([DECALS.sTag32.w / 2, DECALS.sTag32.h / 2, 0.003]), M(tr(0.11, 0.7, -0.692), ry(Math.PI)), decal('sTag32'));
        for (const y of [0.52, 0.78]) { put('torso', 'strapA', BX([0.09, 0.012, 0.07]), tr(0.11, y, -0.625), MM.rubber); put('torso', 'strapB', BX([0.105, 0.012, 0.08]), tr(-0.15, y, -0.63), MM.rubber); }
        put('torso', 'tank', () => cyl(0.075, 0.075, 0.2, 10), tr(0.12, 0.22, -0.565), MM.barrel);
        put('torso', 'tankC', () => ellipsoid(0.075, 0.03, 0.075, { seg: 10, rings: 4, half: true }), tr(0.12, 0.42, -0.565), MM.barrel);
        put('torso', 'pump', BX([0.12, 0.085, 0.075]), tr(-0.05, 0.13, -0.52), MM.ribs);
        put('torso', 'pumpLid', BX([0.125, 0.012, 0.08]), tr(-0.05, 0.225, -0.52), MM.plate);
        const hose = (key, pts, r) => put('torso', key, () => tubeAlong(smoothPath(pts, 5), r, 6), null, MM.hose);
        hose('hoseR', [[-0.12, 0.1, -0.62], [-0.3, 0.04, -0.6], [-0.44, 0.0, -0.42], [-0.46, -0.04, -0.2], [-0.38, -0.08, -0.08]], 0.022);
        hose('hoseL', [[0.18, 0.2, -0.66], [0.36, 0.12, -0.58], [0.46, 0.0, -0.38], [0.44, -0.06, -0.18], [0.36, -0.08, -0.06]], 0.022);
        hose('hoseB', [[-0.2, 0.43, -0.7], [-0.17, 0.3, -0.72], [-0.1, 0.22, -0.64]], 0.018);
        hose('hoseT', [[0.12, 0.42, -0.62], [0.03, 0.36, -0.7], [-0.02, 0.24, -0.62]], 0.016);
        put('torso', 'slot', BX([0.06, 0.016, 0.02]), tr(0.36, 0.98, -0.52), MM.dark);
        // ---------- pelvis ----------
        put('pelvis', 'core', () => facets([{ a: -0.17, x0: -0.24, x1: 0.24, b0: -0.22, b1: 0.22, c: 0.06 }, { a: -0.04, x0: -0.32, x1: 0.32, b0: -0.27, b1: 0.27, c: 0.08 }, { a: 0.08, x0: -0.3, x1: 0.3, b0: -0.25, b1: 0.25, c: 0.07 }]), null, MM.plate);
        put('pelvis', 'waist', () => cyl(0.31, 0.31, 0.07, 14), tr(0, 0.07, 0.01), MM.ribs);
        put('pelvis', 'belt', BX([0.09, 0.07, 0.04]), tr(0, -0.03, 0.27), MM.dark);
        put('pelvis', 'buckle', BX([0.05, 0.04, 0.01]), tr(0, -0.03, 0.315), MM.plate);
        put('pelvis', 'shield', () => slab([[-0.25, 0.06], [-0.25, -0.1], [0, -0.3], [0.25, -0.1], [0.25, 0.06]], 0.03), M(tr(0, -0.05, -0.31), rx(0.15)), MM.plate);
        for (const sg of [1, -1]) {
          put('pelvis', 'hipDrum', () => cyl(0.135, 0.135, 0.18, 10), M(tr(sg * 0.24, 0, 0), ALONG([sg, 0, 0])), MM.dark);
          put('pelvis', 'skirt', BX([0.02, 0.1, 0.15]), M(tr(sg * 0.43, -0.06, 0), rz(sg * 0.1)), MM.plate);
        }
        // ---------- legs ----------
        for (const [sd, sg] of [['l', 1], ['r', -1]]) {
          put(sd + 'Thigh', 'thigh', () => facets([{ a: 0.06, x0: -0.13, x1: 0.13, b0: -0.13, b1: 0.13, c: 0.045 }, { a: -0.05, x0: -0.17, x1: 0.17, b0: -0.17, b1: 0.17, c: 0.06 }, { a: -0.34, x0: -0.16, x1: 0.16, b0: -0.16, b1: 0.17, c: 0.06 }, { a: -0.44, x0: -0.12, x1: 0.12, b0: -0.12, b1: 0.12, c: 0.045 }]), null, MM.leg);
          put(sd + 'Thigh', 'thighPl', BX([0.14, 0.14, 0.016]), M(tr(0, -0.19, 0.176), rx(0.04)), MM.plate);
          put(sd + 'Shin', 'knee', () => cyl(0.1, 0.1, 0.24, 10), M(tr(-0.12, 0, 0), ALONG([1, 0, 0])), MM.dark);
          put(sd + 'Shin', 'kneeDisc', () => cyl(0.125, 0.125, 0.05, 12), M(tr(sg * 0.13, 0, -0.01), ALONG([sg, 0, 0])), MM.plate);
          put(sd + 'Shin', 'kneeHub', () => cyl(0.05, 0.05, 0.025, 8), M(tr(sg * 0.18, 0, -0.01), ALONG([sg, 0, 0])), MM.dark);
          put(sd + 'Shin', 'kneeCap', BX([0.12, 0.1, 0.03]), M(tr(0, 0.03, 0.18), rx(-0.3)), MM.plate);
          put(sd + 'Shin', 'shin', () => facets([{ a: 0.02, x0: -0.14, x1: 0.14, b0: -0.13, b1: 0.15, c: 0.045 }, { a: -0.1, x0: -0.18, x1: 0.18, b0: -0.17, b1: 0.2, c: 0.06 }, { a: -0.36, x0: -0.19, x1: 0.19, b0: -0.18, b1: 0.21, c: 0.065 }, { a: -0.44, x0: -0.16, x1: 0.16, b0: -0.15, b1: 0.17, c: 0.055 }]), null, MM.leg);
          put(sd + 'Shin', 'shinBox', BX([0.03, 0.09, 0.08]), tr(sg * 0.21, -0.24, -0.01), MM.plate);
          put(sd + 'Shin', 'ankle', () => cyl(0.07, 0.07, 0.2, 10), M(tr(-0.1, -0.46, 0), ALONG([1, 0, 0])), MM.dark);
          put(sd + 'Foot', 'foot', () => facets([{ a: -0.25, x0: -0.15, x1: 0.15, b0: -0.17, b1: -0.05, c: 0.035 }, { a: -0.19, x0: -0.175, x1: 0.175, b0: -0.17, b1: 0.03, c: 0.045 }, { a: 0.13, x0: -0.18, x1: 0.18, b0: -0.17, b1: 0.01, c: 0.05 }, { a: 0.21, x0: -0.17, x1: 0.17, b0: -0.17, b1: -0.06, c: 0.035 }], { axis: 'z' }), null, MM.foot);
          put(sd + 'Foot', 'sole', BX([0.188, 0.016, 0.25]), tr(0, -0.155, -0.01), MM.rubber);
          put(sd + 'Foot', 'heel', BX([0.08, 0.05, 0.04]), tr(0, -0.11, -0.26), MM.dark);
          put(sd + 'Toe', 'toe', () => facets([{ a: 0, x0: -0.17, x1: 0.17, b0: -0.06, b1: 0.055, c: 0.035 }, { a: 0.1, x0: -0.16, x1: 0.16, b0: -0.06, b1: 0.035, c: 0.035 }, { a: 0.14, x0: -0.12, x1: 0.12, b0: -0.06, b1: -0.01, c: 0.02 }], { axis: 'z' }), null, MM.foot);
          put(sd + 'Toe', 'toeSole', BX([0.17, 0.014, 0.075]), tr(0, -0.05, 0.07), MM.rubber);
          // ---------- arms ----------
          put(sd + 'Up', 'drum', () => cyl(0.12, 0.12, 0.14, 12), M(tr(-sg * 0.14, 0, 0), ALONG([sg, 0, 0])), MM.dark);
          put(sd + 'Up', 'upper', () => facets([{ a: 0, x0: -0.1, x1: 0.1, b0: -0.1, b1: 0.1, c: 0.04 }, { a: -0.3, x0: -0.105, x1: 0.105, b0: -0.105, b1: 0.11, c: 0.045 }, { a: -0.36, x0: -0.085, x1: 0.085, b0: -0.085, b1: 0.09, c: 0.035 }]), null, MM.plate);
          put(sd + 'Lo', 'elbow', () => cyl(0.08, 0.08, 0.17, 10), M(tr(-0.085, 0, 0), ALONG([1, 0, 0])), MM.dark);
          put(sd + 'Lo', 'fore', () => facets([{ a: 0.02, x0: -0.1, x1: 0.1, b0: -0.1, b1: 0.11, c: 0.04 }, { a: -0.08, x0: -0.125, x1: 0.125, b0: -0.12, b1: 0.14, c: 0.045 }, { a: -0.34, x0: -0.12, x1: 0.12, b0: -0.115, b1: 0.135, c: 0.045 }, { a: -0.4, x0: -0.095, x1: 0.095, b0: -0.09, b1: 0.1, c: 0.035 }]), null, MM.plate);
          for (const y of [-0.14, -0.26]) put(sd + 'Lo', 'band', BX([0.128, 0.013, 0.132]), tr(0, y, 0.01), MM.dark);
          put(sd + 'Hand', 'palm', () => facets([{ a: 0.0, x0: -0.07, x1: 0.07, b0: -0.06, b1: 0.07, c: 0.025 }, { a: -0.12, x0: -0.075, x1: 0.075, b0: -0.06, b1: 0.08, c: 0.03 }]), null, MM.dark);
          for (const fg of ['F1', 'F2', 'F3', 'F4', 'Th']) put(sd + fg, 'finger', () => facets([{ a: 0.01, x0: -0.019, x1: 0.019, b0: -0.019, b1: 0.019, c: 0.008 }, { a: -0.105, x0: -0.015, x1: 0.015, b0: -0.015, b1: 0.017, c: 0.006 }]), null, MM.plate);
        }
      }
    };
    CATALOG.b32 = { name: 'Бронекостюм «32»', size: '3,1 м', note: 'Короб брони с выпуклой капсулой спереди, на коротких ногах, по эскизу игрока: капсула откидывается вверх, внутри место для одного.' };
  }
