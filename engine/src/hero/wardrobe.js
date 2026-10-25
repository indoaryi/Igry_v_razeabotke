  // ================= the hero's look and the things of the engine's wardrobe, as pieces =================
  // The hero is a look like anyone's (look.js): his own parts — a bearded head, grey hair, the cyber eye with its cables, bare arms
  // and hands — and his everyday clothes: a tank top, cargo trousers with a belt, boots, a dog tag, a holster on the right thigh.
  // Each piece names the region of the body it belongs to, so a worn thing can hide it: the leather jacket covers the torso and the
  // arms, the power armour almost everything below the neck, the helmet the head, the hair and the implant with its cables.
  // Regions so far: head, hair, implant, cables, torso, arms, hands, chest, back, legs, feet, thigh, pads, belt.
  // The wardrobe (WEAR): jacket and armour for the body, the helmet for the head, the rifle carried in the hands.
  import { ID4, M, alongMinusY, alongPlusY, len, rx, ry, rz, sub, tr } from '../core/math.js';
  import { COL, mat } from '../render/materials.js';
  import { box, capsule, cyl, ellipsoid, loft, tube } from '../render/meshes.js';
  import { ARMOR_T, HC, backZ, frontZ, headMesh, torsoMesh } from './model.js';
  import { PERSON_PIECES, PIECE_REGION, WEAR, buildPerson, dress } from './look.js';

  // the hero's parts put as he was always built: put(key, mesh, bone, offset, material, group); the key carries the body's sizes,
  // so a thing worn by someone of other proportions gets its own meshes
  function heroPut(put, D) {
    const dk = [D.w, D.d, D.l, D.belly, D.upper, D.fore, D.thigh, D.shin, D.neckY].map((v) => v.toFixed(3)).join(',');
    const P = (key, fn, bone, off, m, group) => put(bone, 'hero:' + key + '|' + dk, fn, off || ID4, m, group);
    const S = (key, bone, a, b, r, m, group) => { const L = len(sub(b, a)); P('seg' + key + L.toFixed(3), () => capsule(L, r, r, { seg: 6 }), bone, M(tr(...a), alongMinusY(sub(b, a))), m, group); };
    return { P, S };
  }
  const H = (x, y, z) => [HC[0] + x, HC[1] + y, HC[2] + z];
  const skinMat = () => mat(COL.skin, { noise: 0.05, grain: 70 });
  const SIDES2 = [['l', 1], ['r', -1]];

  // ---------- his own parts ----------
  PERSON_PIECES.heroHead = (put, D) => {
    const { P } = heroPut(put, D), skin = skinMat();
    P('head', () => headMesh(0, -1), 'head', tr(...HC), mat(COL.skin, { pat: 1, p: [1, 0, 0, 0], b: COL.beard, noise: 0.05, grain: 70 }));
    P('nose', () => ellipsoid(0.015, 0.03, 0.022, { seg: 8, rings: 5 }), 'head', M(tr(...H(0, -0.014, 0.1)), rx(-0.3)), skin);
    const brow = mat('#5f5b56', { noise: 0.2, grain: 120 });
    for (const sg of [1, -1]) P('brow', () => ellipsoid(0.028, 0.009, 0.014, { seg: 8, rings: 4 }), 'head', M(tr(...H(sg * 0.034, 0.036, 0.095)), rz(sg * 0.14)), brow);
    for (const sg of [1, -1]) P('ear', () => ellipsoid(0.014, 0.028, 0.02, { seg: 8, rings: 4 }), 'head', tr(...H(sg * 0.093, 0, -0.006)), skin);
  };
  PIECE_REGION.heroHead = 'head';
  PERSON_PIECES.heroHair = (put, D) => {
    const { P } = heroPut(put, D);
    P('hair', () => headMesh(0.009, -0.09), 'head', tr(...H(0, 0.004, -0.002)), mat(COL.hair, { pat: 7, p: [0.032, 0.058, 0.0, -0.035], nape: -0.072, noise: 0.34, grain: 110 }));
  };
  PIECE_REGION.heroHair = 'hair';
  // the cyber eye: housing, a glowing green lens, the arm and the module, two cables going back
  PERSON_PIECES.heroImplant = (put, D) => {
    const { P, S } = heroPut(put, D);
    const dark = mat('#2b2e32', { noise: 0.08, spec: 0.7, gloss: 18 }), cab = mat(COL.cable, { noise: 0.02, spec: 0.5, gloss: 20 });
    P('eyeHouse', () => cyl(0.03, 0.027, 0.04, 12), 'head', M(tr(...H(-0.036, 0.012, 0.085)), alongPlusY([0, 0, 1])), dark);
    P('eyeLens', () => ellipsoid(0.018, 0.006, 0.018, { seg: 10, rings: 4 }), 'head', M(tr(...H(-0.036, 0.012, 0.127)), alongPlusY([0, 0, 1])), mat(COL.green, { pat: 10, p: [4, 0, 0, 0] }));
    P('eyeArm', () => box(0.03, 0.01, 0.012), 'head', tr(...H(-0.075, 0.022, 0.075)), dark);
    P('eyeMod', () => box(0.014, 0.028, 0.034), 'head', tr(...H(-0.1, 0.03, 0.02)), dark);
    for (const o of [0, 0.012]) {
      S('ch1', 'head', H(-0.104, 0.02 - o, 0.0), H(-0.108, -0.01 - o, -0.06), 0.0085, cab);
      S('ch2', 'head', H(-0.108, -0.01 - o, -0.06), H(-0.06 - o, -0.085, -0.09), 0.0085, cab);
    }
    put.glow('head', H(-0.036, 0.012, 0.13), [0, 0, 1]);
  };
  PIECE_REGION.heroImplant = 'implant';
  PERSON_PIECES.heroNeck = (put, D) => {
    const { P } = heroPut(put, D);
    P('neck', () => capsule(0.13, 0.044 * D.l, 0.05 * D.l), 'neck', tr(0, 0.088, -0.01), skinMat());
  };
  PERSON_PIECES.heroArms = (put, D) => {
    const { P } = heroPut(put, D), skin = skinMat();
    for (const s of ['l', 'r']) {
      P('armDelt', () => ellipsoid(0.058 * D.l, 0.066, 0.056 * D.l, { seg: 12, rings: 7 }), s + 'Up', tr(0, -0.035, 0), skin);
      P('armUp', () => capsule(D.upper, 0.052 * D.l, 0.042 * D.l), s + 'Up', null, skin);
      P('armLo', () => capsule(0.235, 0.046 * D.l, 0.033 * D.l), s + 'Lo', null, skin);
    }
  };
  PIECE_REGION.heroArms = 'arms';
  PERSON_PIECES.heroHands = (put, D) => {
    const { P } = heroPut(put, D), skin = skinMat();
    for (const s of ['l', 'r']) {
      P('palm', () => ellipsoid(0.026, 0.052, 0.044, { seg: 10, rings: 6, exp: 2.4 }), s + 'Hand', tr(0, -0.008, 0.004), skin);
      P('thumb', () => capsule(0.035, 0.013, 0.011, { seg: 6 }), s + 'Hand', M(tr(0, 0.018, 0.034), rx(-0.9)), skin);
    }
  };
  PIECE_REGION.heroHands = 'hands';
  // the implant's cables down his back, over the jacket when he wears one
  PERSON_PIECES.heroBackCables = (put, D, C, look) => {
    const { S } = heroPut(put, D), jacket = !!(look.worn && look.worn.includes('jacket'));
    const cab = mat(COL.cable, { noise: 0.02 }), bz = backZ(D, 0.1, jacket ? 0.024 : 0.006) - 0.008;
    for (const o of [0, 0.014]) {
      S('cb1', 'chest', [-0.055 - o, D.neckY + 0.02, -0.095], [-0.07 - o, 0.25, bz + 0.012], 0.0085, cab);
      S('cb2', 'chest', [-0.07 - o, 0.25, bz + 0.012], [-0.085 - o, 0.06, bz], 0.0085, cab);
      S('cb3', 'chest', [-0.085 - o, 0.06, bz], [-0.07 - o, -0.13, bz + 0.006], 0.0085, cab);
    }
  };
  PIECE_REGION.heroBackCables = 'cables';

  // ---------- his everyday clothes ----------
  PERSON_PIECES.tankTop = (put, D) => {
    const { P } = heroPut(put, D);
    P('tank', () => torsoMesh(D, 0.006, -0.32), 'chest', null, mat(COL.tank, { pat: 13, b: COL.skin, p: [0.19, 0.115, 0.215, 0.085], noise: 0.08, grain: 60 }), 'tank');
  };
  PIECE_REGION.tankTop = 'torso';
  PERSON_PIECES.dogTag = (put, D) => {
    const { P, S } = heroPut(put, D);
    const steel = mat(COL.metal, { noise: 0.04, spec: 1, gloss: 6 });
    const tz = frontZ(D, 0.12, 0.006) + 0.012;
    P('tag', () => box(0.013, 0.02, 0.003), 'chest', tr(0, 0.12, tz), steel);
    for (const sg of [1, -1]) S('chain', 'chest', [sg * 0.05, 0.31, 0.06], [sg * 0.008, 0.142, tz - 0.002], 0.006, steel);
  };
  PIECE_REGION.dogTag = 'chest';
  PERSON_PIECES.cargoTrousers = (put, D) => {
    const { P } = heroPut(put, D);
    const cargo = mat(COL.cargo, { noise: 0.12, grain: 70 });
    P('pelvis', () => loft([
      { a: -0.13, hu: 0.11 * D.w, hv: 0.075 * D.d }, { a: -0.09, hu: 0.155 * D.w + 0.014, hv: 0.105 * D.d + 0.014 },
      { a: -0.02, hu: 0.168 * D.w + 0.014, hv: 0.115 * D.d + 0.014, cv: 0.004 }, { a: 0.06, hu: 0.165 * D.w + 0.014, hv: 0.118 * D.d + 0.014, cv: 0.008 },
      { a: 0.12, hu: 0.16 * D.w + 0.014, hv: 0.115 * D.d + 0.014, cv: 0.008 }], { seg: 14, exp: 2.4, capAAt: -0.15, capBAt: 0.13 }), 'hips', null, cargo);
    P('belt', () => tube([{ a: 0.055, hu: 0.175 * D.w + 0.02, hv: 0.122 * D.d + 0.02, cv: 0.008 }, { a: 0.1, hu: 0.172 * D.w + 0.02, hv: 0.12 * D.d + 0.02, cv: 0.008 }]), 'hips', null, mat(COL.belt, { noise: 0.05 }));
    P('buckle', () => box(0.03, 0.022, 0.008), 'hips', tr(0, 0.078, 0.122 * D.d + 0.032), mat(COL.metal, { noise: 0.04, spec: 1, gloss: 6 }));
    for (const [s, sg] of SIDES2) {
      P('thigh', () => capsule(D.thigh, 0.092 * D.l, 0.07 * D.l), s + 'Thigh', null, cargo);
      P('shin', () => capsule(0.24, 0.07 * D.l, 0.074 * D.l), s + 'Shin', null, mat(COL.cargo, { pat: 24, p: [-0.02, 0, 0, 0], noise: 0.12, grain: 70 }));
      P('pocket', () => box(0.022, 0.06, 0.052), s + 'Thigh', tr(sg * 0.1 * D.l, -0.2, 0.004), mat(COL.cargo, { pat: 24, p: [0.035, 0, 0, 0], noise: 0.12, grain: 70 }));
    }
  };
  PIECE_REGION.cargoTrousers = 'legs';
  PERSON_PIECES.boots = (put, D) => {
    const { P } = heroPut(put, D);
    for (const s of ['l', 'r']) {
      P('boot', () => loft([
        { a: -0.08, hu: 0.046, hv: 0.04, cv: -0.048 }, { a: -0.066, hu: 0.058, hv: 0.062, cv: -0.026 },
        { a: -0.01, hu: 0.062, hv: 0.08, cv: -0.008 }, { a: 0.07, hu: 0.062, hv: 0.058, cv: -0.03 },
        { a: 0.15, hu: 0.059, hv: 0.045, cv: -0.043 }, { a: 0.205, hu: 0.048, hv: 0.035, cv: -0.053 }], { axis: 'z', seg: 12, exp: 2.6, capAAt: -0.087, capBAt: 0.218 }),
        s + 'Foot', null, mat(COL.boot, { pat: 19, b: COL.lace, p: [0.02, 0.022, -0.035, 55], noise: 0.08, spec: 0.6, gloss: 16 }));
      P('soleBand', () => loft([{ a: -0.085, hu: 0.05, hv: 0.016, cv: -0.074 }, { a: -0.06, hu: 0.064, hv: 0.016, cv: -0.074 }, { a: 0.15, hu: 0.064, hv: 0.016, cv: -0.074 }, { a: 0.215, hu: 0.05, hv: 0.014, cv: -0.074 }], { axis: 'z', seg: 10, exp: 3, capAAt: -0.092, capBAt: 0.222 }),
        s + 'Foot', null, mat('#151516', { pat: 23, p: [90, 0, 0, 0], noise: 0.05 }));
      P('shaft', () => capsule(0.2, 0.066 * D.l, 0.064 * D.l), s + 'Shin', tr(0, -D.shin + 0.2, 0), mat(COL.boot, { pat: 19, b: COL.lace, p: [0.03, 0.02, -0.19, 50], noise: 0.08, spec: 0.6, gloss: 16 }));
    }
  };
  PIECE_REGION.boots = 'feet';
  // a drop-leg holster with a pistol on the right thigh
  PERSON_PIECES.holster = (put, D) => {
    const { P } = heroPut(put, D);
    const hb = mat('#161618', { noise: 0.05 });
    P('holster', () => box(0.024, 0.085, 0.045), 'rThigh', tr(-0.112 * D.l, -0.12, 0.005), hb);
    P('pistol', () => box(0.016, 0.04, 0.022), 'rThigh', M(tr(-0.116 * D.l, -0.015, -0.012), rx(-0.35)), mat('#2c2c2f', { noise: 0.05, spec: 0.6, gloss: 18 }));
    for (const y of [-0.08, -0.17]) P('strap' + y, () => tube([{ a: -0.012, hu: 0.098 * D.l, hv: 0.084 * D.l }, { a: 0.012, hu: 0.096 * D.l, hv: 0.082 * D.l }]), 'rThigh', tr(0, y, 0), hb);
  };
  PIECE_REGION.holster = 'thigh';

  // ---------- the wardrobe ----------
  // the leather jacket: open at the front over the tank top, a collar, lapels, sleeves
  PERSON_PIECES.leatherJacket = (put, D) => {
    const { P } = heroPut(put, D);
    P('jacket', () => torsoMesh(D, 0.024, -0.215), 'chest', null, mat(COL.leather, { pat: 14, b: COL.tank, p: [0.034, 0.075, -0.18, 0], r: [-0.215, 0.17, 0, 0], noise: 0.15, grain: 70, spec: 0.7, gloss: 14 }), 'jacket');
    P('collar', () => tube([{ a: 0.24, hu: 0.17 * D.w, hv: 0.105 * D.d, cv: -0.01 }, { a: 0.285, hu: 0.122, hv: 0.088, cv: -0.014 }, { a: 0.33, hu: 0.086, hv: 0.072, cv: -0.016 }]), 'chest', null, mat(COL.leather, { noise: 0.2, grain: 70, spec: 0.55, gloss: 14 }), 'jacket');
    const lap = mat('#2c201b', { noise: 0.12, grain: 70, spec: 0.6, gloss: 14 });
    for (const sg of [1, -1]) P('lapel', () => ellipsoid(0.05, 0.085, 0.014, { seg: 10, rings: 6 }), 'chest', M(tr(sg * 0.074, 0.2, frontZ(D, 0.19, 0.024) - 0.006), rz(sg * 0.42), rx(-0.2)), lap, 'jacket');
    const sl = mat(COL.leather, { pat: 8, p: [-0.2, 0, 0, 0], noise: 0.17, grain: 70, spec: 0.7, gloss: 14 });
    for (const s of ['l', 'r']) {
      P('slDelt', () => ellipsoid(0.07 * D.l, 0.075, 0.068 * D.l, { seg: 12, rings: 7 }), s + 'Up', tr(0, -0.035, 0), sl, 'jacket');
      P('slUp', () => capsule(D.upper, 0.064 * D.l, 0.052 * D.l), s + 'Up', null, sl, 'jacket');
      P('slLo', () => capsule(0.235, 0.054 * D.l, 0.045 * D.l), s + 'Lo', null, sl, 'jacket');
    }
  };
  // power armour: plates with the radiation trefoil on the chest, a pack, pauldrons, armoured arms and legs, a screen on the left forearm
  PERSON_PIECES.powerArmor = (put, D) => {
    const { P } = heroPut(put, D);
    const plate = mat(COL.steel, { pat: 20, b: COL.rust, p: [0, 0, 0, 0], noise: 0.1, grain: 28, spec: 0.85, gloss: 12 });
    const plateSeam = mat(COL.steel, { pat: 20, b: COL.rust, p: [12, 0, 0, 0], noise: 0.1, grain: 28, spec: 0.85, gloss: 12 });
    const dark = mat('#3a3d40', { pat: 20, b: COL.rust, noise: 0.12, grain: 45, spec: 0.5, gloss: 14 });
    const rubber = mat(COL.rubber, { pat: 23, p: [32, 0, 0, 0], noise: 0.05 });
    P('aTorso', () => loft(ARMOR_T.map((r) => ({ a: r[0], hu: r[1], hv: r[2], cv: r[3] })), { seg: 16, exp: 2.8, capAAt: -0.14, capBAt: 0.36 }), 'chest', null,
      mat(COL.steel, { pat: 11, b: COL.yellow, p: [0.072, 0.1, 0.06, 0], noise: 0.1, grain: 28, spec: 0.85, gloss: 12 }), 'armorTop');
    P('aBelly', () => tube([{ a: -0.29, hu: 0.19, hv: 0.14, cv: 0.01 }, { a: -0.11, hu: 0.2, hv: 0.15, cv: 0.01 }]), 'chest', null, rubber, 'armorTop');
    P('aCollar', () => tube([{ a: 0.32, hu: 0.14, hv: 0.12 }, { a: 0.39, hu: 0.12, hv: 0.105 }]), 'chest', null, dark, 'armorTop');
    P('aPack', () => box(0.17, 0.2, 0.085), 'chest', tr(0, 0.11, -0.255), mat(COL.steel, { pat: 16, p: [-0.06, 0.02, 0.085, 0], noise: 0.16, grain: 45, spec: 0.7, gloss: 12 }), 'armorTop');
    for (const sg of [1, -1]) P('aPipe', () => capsule(0.24, 0.02, 0.02), 'chest', tr(sg * 0.13, 0.33, -0.3), mat('#2e3033', { pat: 23, p: [60, 0, 0, 0], noise: 0.05 }), 'armorTop');
    P('aPelvis', () => loft([{ a: -0.15, hu: 0.13, hv: 0.09 }, { a: -0.08, hu: 0.2, hv: 0.15 }, { a: 0.05, hu: 0.21, hv: 0.16, cv: 0.01 }, { a: 0.13, hu: 0.2, hv: 0.155, cv: 0.01 }], { seg: 14, exp: 2.6, capAAt: -0.17, capBAt: 0.14 }), 'hips', null, plate);
    P('aBelt', () => tube([{ a: 0.045, hu: 0.222, hv: 0.17, cv: 0.01 }, { a: 0.095, hu: 0.22, hv: 0.168, cv: 0.01 }]), 'hips', null, mat(COL.olive, { noise: 0.08 }));
    for (const th of [0.75, -0.75, 1.65, -1.65]) P('aPouch', () => box(0.035, 0.04, 0.03), 'hips', M(tr(Math.sin(th) * 0.24, 0.06, Math.cos(th) * 0.185 + 0.01), ry(th)), mat(COL.olive, { pat: 24, p: [0.02, 0, 0, 0], noise: 0.1 }));
    for (const [s, sg] of SIDES2) {
      P('aPaul', () => ellipsoid(0.15, 0.09, 0.15, { half: true, seg: 14, rings: 5 }), s + 'Up', tr(sg * 0.028, 0.0, 0), plateSeam, 'armorTop');
      P('aUp', () => capsule(D.upper, 0.078, 0.07), s + 'Up', null, plate, 'armorTop');
      P('aElbow', () => ellipsoid(0.062, 0.062, 0.062, { seg: 10, rings: 6 }), s + 'Lo', null, dark);
      P('aFore', () => loft([{ a: -0.27, hu: 0.066, hv: 0.066 }, { a: -0.05, hu: 0.074, hv: 0.074 }, { a: -0.015, hu: 0.07, hv: 0.07 }], { seg: 12, exp: 3, capAAt: -0.275, capBAt: -0.008 }), s + 'Lo', null,
        s === 'l' ? mat(COL.steel, { pat: 15, b: COL.green, p: [0.045, -0.2, -0.1, 0.035], side: 1, noise: 0.1, grain: 28, spec: 0.85, gloss: 12 }) : plate);
      P('aFist', () => ellipsoid(0.058, 0.064, 0.06, { seg: 10, rings: 6 }), s + 'Hand', null, mat('#33363a', { noise: 0.08 }));
      P('aThigh', () => capsule(D.thigh, 0.11, 0.09), s + 'Thigh', null, plateSeam);
      P('aKnee', () => ellipsoid(0.072, 0.078, 0.05, { seg: 10, rings: 6 }), s + 'Shin', tr(0, -0.01, 0.078), mat('#5a5e62', { noise: 0.12, grain: 45, spec: 0.85, gloss: 12 }));
      P('aShin', () => loft([{ a: -D.shin + 0.03, hu: 0.084, hv: 0.084 }, { a: -0.2, hu: 0.09, hv: 0.092 }, { a: -0.03, hu: 0.086, hv: 0.088 }], { seg: 12, exp: 3, capAAt: -D.shin + 0.02, capBAt: -0.02 }), s + 'Shin', null, plateSeam);
      P('aBoot', () => loft([
        { a: -0.1, hu: 0.06, hv: 0.05, cv: -0.08 }, { a: -0.08, hu: 0.08, hv: 0.08, cv: -0.05 }, { a: 0.0, hu: 0.085, hv: 0.1, cv: -0.03 },
        { a: 0.12, hu: 0.083, hv: 0.07, cv: -0.06 }, { a: 0.23, hu: 0.07, hv: 0.05, cv: -0.08 }], { axis: 'z', seg: 12, exp: 3, capAAt: -0.11, capBAt: 0.245 }),
        s + 'Foot', null, mat('#45484c', { pat: 5, b: '#1c1c1e', p: [-0.1, 0, 0, 0], noise: 0.12, grain: 45, spec: 0.6, gloss: 14 }));
    }
  };
  // the armour's helmet: a dome with a stripe and a visor, a respirator with two filters, lamps with green lenses, two antennas
  PERSON_PIECES.armorHelmet = (put, D) => {
    const { P } = heroPut(put, D);
    const hm = mat(COL.steel, { pat: 17, b: COL.yellow, p: [0.022, -0.03, 0.115, 0], r: [-0.018, 0.026, 0.1, 0], noise: 0.1, grain: 28, spec: 0.9, gloss: 14 });
    const hd = mat('#34373b', { noise: 0.08 });
    P('hDome', () => ellipsoid(0.148, 0.152, 0.158, { exp: 2.3, seg: 18, rings: 10 }), 'head', tr(...H(0, 0.015, -0.005)), hm, 'helmet');
    P('hResp', () => ellipsoid(0.075, 0.056, 0.05, { seg: 12, rings: 6 }), 'head', tr(...H(0, -0.078, 0.128)), mat('#3a3d41', { pat: 12, p: [0.01, 55, 0, 0], noise: 0.08 }), 'helmet');
    for (const sg of [1, -1]) {
      P('hFilter', () => cyl(0.03, 0.03, 0.06, 10), 'head', M(tr(...H(sg * 0.085, -0.095, 0.105)), alongPlusY([sg * 0.5, -0.35, 0.8])), mat('#2b2d30', { pat: 23, p: [80, 0, 0, 0], noise: 0.06 }), 'helmet');
      P('hLamp', () => cyl(0.022, 0.022, 0.04, 10), 'head', M(tr(...H(sg * 0.14, 0.03, 0.04)), alongPlusY([sg * 0.6, 0, 0.8])), hd, 'helmet');
      P('hLens', () => ellipsoid(0.018, 0.006, 0.018, { seg: 10, rings: 4 }), 'head', M(tr(...H(sg * 0.165, 0.03, 0.073)), alongPlusY([sg * 0.6, 0, 0.8])), mat(COL.green, { pat: 10, p: [4, 0, 0, 0] }), 'helmet');
      P('hAnt', () => capsule(0.15, 0.0075, 0.006, { seg: 6 }), 'head', M(tr(...H(sg * 0.07, 0.11, -0.09)), alongMinusY([0, 1, -0.25])), mat('#202224', { noise: 0 }), 'helmet');
    }
    P('hSeal', () => tube([{ a: -0.13, hu: 0.115, hv: 0.12 }, { a: -0.09, hu: 0.13, hv: 0.135 }]), 'head', tr(...HC), hd, 'helmet');
    for (const sg of [1, -1]) put.glow('head', H(sg * 0.168, 0.03, 0.076), [sg * 0.6, 0, 0.8]);
  };
  Object.assign(WEAR, {
    jacket: { slot: 'body', pieces: ['leatherJacket'], covers: ['torso', 'arms'] },
    armor: { slot: 'body', pieces: ['powerArmor'], covers: ['torso', 'arms', 'hands', 'chest', 'back', 'cables', 'legs', 'feet', 'thigh', 'pads', 'belt'], armor: true },
    helmet: { slot: 'head', pieces: ['armorHelmet'], covers: ['head', 'hair', 'implant', 'cables'] },
    rifle: { slot: 'hands', held: 'rifle' }
  });

  // ---------- the hero, and whoever the player steers ----------
  export const HERO_LOOK = { id: 'hero', seed: 1, pieces: ['heroHead', 'heroHair', 'heroImplant', 'heroNeck', 'tankTop', 'heroArms', 'dogTag', 'heroBackCables', 'heroHands', 'cargoTrousers', 'boots', 'holster'] };
  // the player's look: the hero's, until control passes to another person (steerLook)
  let playerLook = HERO_LOOK;
  // the player's model in this gear (eq: { body, head, hands }): the portrait and the icons ask for other gear than he wears
  export const buildHero = (eq) => buildPerson(dress(playerLook, [eq.body, eq.head, eq.hands]));
  // what the player wears and holds: body 'tank' (default) | 'jacket' | 'armor', head null | 'helmet', hands null | 'rifle'.
  // The game sets it and calls rebuildHero() when it changes (gearVer++ makes the stage redraw); setHero(model) puts a model in place
  // as it is (at boot, or for a moment to draw the portrait in other gear). It is the gear of the body he steers (hero.gear).
  export let equip = { body: null, head: null, hands: null };
  export let HERO = null, gearVer = 0;
  export function setHero(model) { HERO = model; }
  export function rebuildHero() { HERO = buildHero(equip); gearVer++; }
  // control passes to another body: his look and what he wears become the player's (people.js: takeControl)
  export function steerLook(look, gear) { playerLook = look; equip = gear; rebuildHero(); }
