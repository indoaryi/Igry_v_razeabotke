  // ================= hero model =================
  import { I4, M, alongMinusY, alongPlusY, len, rx, ry, rz, sub, tr } from '../core/math.js';
  import { COL, mat } from '../render/materials.js';
  import { box, capsule, cyl, ellipsoid, loft, tube } from '../render/meshes.js';
  import { getMesh } from '../render/webgl.js';
  export const HC = [0, 0.085, 0.012];   // head centre, head-bone space
  export function dims(armor) {
    const D = { w: 1.06, d: 1.05, l: 1.08, belly: 0.008, sx: 0.2, shY: 0.245, hipX: 0.095, spineY: 0.06, chestY: 0.18, neckY: 0.315, headY: 0.076,
      upper: 0.28, fore: 0.295, thigh: 0.42, shin: 0.39, sole: -0.088, armor: !!armor };
    if (armor) Object.assign(D, { sx: 0.25, shY: 0.27, hipX: 0.11, chestY: 0.19, neckY: 0.335, upper: 0.29, fore: 0.31, thigh: 0.44, shin: 0.41, sole: -0.13 });
    return D;
  }
  const HEAD_R = [   // head-centre space: y, half width, half depth, z offset
    [-0.125, 0.026, 0.022, 0.07], [-0.108, 0.05, 0.048, 0.048], [-0.085, 0.066, 0.072, 0.028], [-0.055, 0.076, 0.086, 0.014],
    [-0.025, 0.083, 0.094, 0.006], [0.008, 0.088, 0.1, 0.0], [0.042, 0.09, 0.104, -0.006], [0.072, 0.086, 0.1, -0.012],
    [0.096, 0.077, 0.09, -0.018], [0.112, 0.062, 0.073, -0.02]
  ];
  const headMesh = (inf, from) => loft(HEAD_R.filter((r) => r[0] >= from).map((r) => ({ a: r[0], hu: r[1] + inf, hv: r[2] + inf, cv: r[3] })),
    { seg: 16, exp: from < -0.2 ? 2.4 : 2.7, capA: from < -0.2, capAAt: -0.132, capBAt: 0.12 + inf });
  export const mouthC = (D) => [0, D.neckY + D.headY + HC[1] - 0.045, HC[2] + 0.1];
  // torso profile in chest space: y, half width, half depth, z offset, belly factor
  const TORSO = [
    [-0.34, 0.168, 0.105, 0.0, 0.3], [-0.27, 0.162, 0.108, 0.006, 0.6], [-0.17, 0.152, 0.11, 0.012, 1],
    [-0.05, 0.165, 0.118, 0.012, 0.6], [0.06, 0.185, 0.126, 0.012, 0], [0.15, 0.196, 0.122, 0.006, 0],
    [0.215, 0.192, 0.108, -0.006, 0], [0.255, 0.155, 0.09, -0.014, 0], [0.285, 0.1, 0.072, -0.016, 0], [0.305, 0.062, 0.056, -0.012, 0]
  ];
  function torsoAt(y) {
    for (let i = 0; i < TORSO.length - 1; i++) {
      const a = TORSO[i], b = TORSO[i + 1];
      if (y >= a[0] && y <= b[0]) { const t = (y - a[0]) / (b[0] - a[0]); return a.map((v, j) => v + (b[j] - v) * t); }
    }
    return y < TORSO[0][0] ? TORSO[0] : TORSO[TORSO.length - 1];
  }
  export function torsoMesh(D, inf, hem) {
    const ringOf = (r) => ({ a: r[0], hu: r[1] * D.w + inf, hv: r[2] * D.d + inf, cv: r[3] + r[4] * D.belly });
    const rings = [ringOf(torsoAt(hem))];
    for (const r of TORSO) if (r[0] > hem + 1e-4) rings.push(ringOf(r));
    return loft(rings, { seg: 16, exp: 2.5, capAAt: hem - 0.012, capBAt: 0.312 });
  }
  const frontZ = (D, y, inf) => { const r = torsoAt(y); return r[2] * D.d + inf + r[3] + r[4] * D.belly; };
  export const backZ = (D, y, inf) => { const r = torsoAt(y); return r[3] + r[4] * D.belly - (r[2] * D.d + inf); };
  const ARMOR_T = [[-0.13, 0.205, 0.152, 0.0], [-0.03, 0.25, 0.18, 0.02], [0.08, 0.29, 0.2, 0.03], [0.18, 0.305, 0.19, 0.02], [0.26, 0.28, 0.17, 0.0], [0.32, 0.2, 0.13, -0.01], [0.35, 0.12, 0.1, -0.01]];

  // rifle geometry in rifle space: grip at origin, +Z to the muzzle, +Y up (scope side)
  export const RIFLE_MUZZLE = [0, 0.065, 0.64], RIFLE_PORT = [-0.04, 0.06, 0.09];
  function rifleParts() {
    const out = [];
    const put = (key, fn, off, m) => out.push({ mesh: getMesh('rf' + key, fn), off, mat: m });
    const gun = mat(COL.gun, { noise: 0.12, grain: 70, spec: 0.45, gloss: 20 }), khaki = mat(COL.khaki, { noise: 0.14, grain: 70, spec: 0.3, gloss: 20 });
    const blk = mat(COL.black, { noise: 0.05, spec: 0.5, gloss: 22 }), olive = mat(COL.olive, { noise: 0.12, grain: 70, spec: 0.3, gloss: 20 });
    const fwd = alongPlusY([0, 0, 1]);
    put('recv', () => box(0.034, 0.05, 0.16), tr(0, 0.055, 0.06), gun);
    put('hg', () => box(0.036, 0.042, 0.15), tr(0, 0.06, 0.29), mat(COL.khaki, { pat: 25, p: [0.03, 22, 0.022, 0], noise: 0.14, grain: 70, spec: 0.3, gloss: 20 }));
    put('rail', () => box(0.02, 0.008, 0.2), tr(0, 0.107, 0.27), mat(COL.black, { pat: 26, p: [70, 0, 0, 0], noise: 0.05, spec: 0.5, gloss: 22 }));
    put('barrel', () => cyl(0.012, 0.012, 0.16, 8), M(tr(0, 0.065, 0.43), fwd), blk);
    put('muzzle', () => cyl(0.02, 0.02, 0.055, 8), M(tr(0, 0.065, 0.585), fwd), mat(COL.black, { pat: 23, p: [70, 0, 0, 0], noise: 0.04 }));
    put('gl', () => cyl(0.028, 0.028, 0.25, 10), M(tr(0, 0.006, 0.17), fwd), mat(COL.black, { pat: 23, p: [55, 0, 0, 0], noise: 0.04 }));
    put('glcap', () => cyl(0.031, 0.031, 0.035, 10), M(tr(0, 0.006, 0.42), fwd), khaki);
    put('stock', () => box(0.028, 0.055, 0.11), tr(0, 0.045, -0.16), olive);
    put('butt', () => box(0.033, 0.068, 0.018), tr(0, 0.04, -0.28), blk);
    put('grip', () => box(0.018, 0.05, 0.024), M(tr(0, -0.035, -0.012), rx(0.3)), blk);
    put('mag', () => box(0.02, 0.066, 0.035), M(tr(0, -0.036, 0.1), rx(0.15)), mat(COL.black, { noise: 0.08 }));
    put('scope', () => cyl(0.026, 0.026, 0.17, 10), M(tr(0, 0.14, -0.02), fwd), mat('#2f2e2a', { noise: 0.08 }));
    put('eyep', () => cyl(0.03, 0.03, 0.03, 10), M(tr(0, 0.14, -0.05), fwd), blk);
    put('lens', () => ellipsoid(0.02, 0.006, 0.02, { seg: 10, rings: 4 }), M(tr(0, 0.14, 0.152), fwd), mat(COL.red, { pat: 10, p: [3, 0, 0, 0] }));
    put('mount', () => box(0.012, 0.02, 0.03), tr(0, 0.115, 0.06), blk);
    put('sight', () => box(0.006, 0.025, 0.012), tr(0, 0.12, 0.38), blk);
    return out;
  }
  export function buildHero(eq) {
    const armor = eq.body === 'armor', helmet = eq.head === 'helmet', jacket = eq.body === 'jacket';
    const D = dims(armor);
    const parts = [];
    const put = (key, fn, bone, off, m, group) => parts.push({ mesh: getMesh(key, fn), bone, off: off || I4(), mat: m, group: group || 'body' });
    const seg = (key, bone, a, b, r, m, group) => { const L = len(sub(b, a)); put('seg' + key + L.toFixed(3), () => capsule(L, r, r, { seg: 6 }), bone, M(tr(...a), alongMinusY(sub(b, a))), m, group); };
    const skin = mat(COL.skin, { noise: 0.05, grain: 70 });
    const H = (x, y, z) => [HC[0] + x, HC[1] + y, HC[2] + z];

    // head, face, cyber eye
    if (!helmet) {
      put('head', () => headMesh(0, -1), 'head', tr(...HC), mat(COL.skin, { pat: 1, p: [1, 0, 0, 0], b: COL.beard, noise: 0.05, grain: 70 }));
      put('nose', () => ellipsoid(0.015, 0.03, 0.022, { seg: 8, rings: 5 }), 'head', M(tr(...H(0, -0.014, 0.1)), rx(-0.3)), skin);
      const brow = mat('#5f5b56', { noise: 0.2, grain: 120 });
      for (const sg of [1, -1]) put('brow', () => ellipsoid(0.028, 0.009, 0.014, { seg: 8, rings: 4 }), 'head', M(tr(...H(sg * 0.034, 0.036, 0.095)), rz(sg * 0.14)), brow);
      for (const sg of [1, -1]) put('ear', () => ellipsoid(0.014, 0.028, 0.02, { seg: 8, rings: 4 }), 'head', tr(...H(sg * 0.093, 0, -0.006)), skin);
      put('hair', () => headMesh(0.009, -0.09), 'head', tr(...H(0, 0.004, -0.002)), mat(COL.hair, { pat: 7, p: [0.032, 0.058, 0.0, -0.035], nape: -0.072, noise: 0.34, grain: 110 }));
      const dark = mat('#2b2e32', { noise: 0.08, spec: 0.7, gloss: 18 }), cab = mat(COL.cable, { noise: 0.02, spec: 0.5, gloss: 20 });
      put('eyeHouse', () => cyl(0.03, 0.027, 0.04, 12), 'head', M(tr(...H(-0.036, 0.012, 0.085)), alongPlusY([0, 0, 1])), dark);
      put('eyeLens', () => ellipsoid(0.018, 0.006, 0.018, { seg: 10, rings: 4 }), 'head', M(tr(...H(-0.036, 0.012, 0.127)), alongPlusY([0, 0, 1])), mat(COL.green, { pat: 10, p: [4, 0, 0, 0] }));
      put('eyeArm', () => box(0.03, 0.01, 0.012), 'head', tr(...H(-0.075, 0.022, 0.075)), dark);
      put('eyeMod', () => box(0.014, 0.028, 0.034), 'head', tr(...H(-0.1, 0.03, 0.02)), dark);
      for (const o of [0, 0.012]) {
        seg('ch1', 'head', H(-0.104, 0.02 - o, 0.0), H(-0.108, -0.01 - o, -0.06), 0.0085, cab);
        seg('ch2', 'head', H(-0.108, -0.01 - o, -0.06), H(-0.06 - o, -0.085, -0.09), 0.0085, cab);
      }
    }
    put('neck', () => capsule(0.13, 0.044 * D.l, 0.05 * D.l), 'neck', tr(0, 0.088, -0.01), skin);

    if (!armor) {
      // torso
      if (jacket) {
        put('jacket', () => torsoMesh(D, 0.024, -0.215), 'chest', null, mat(COL.leather, { pat: 14, b: COL.tank, p: [0.034, 0.075, -0.18, 0], r: [-0.215, 0.17, 0, 0], noise: 0.15, grain: 70, spec: 0.7, gloss: 14 }), 'jacket');
        put('collar', () => tube([{ a: 0.24, hu: 0.17 * D.w, hv: 0.105 * D.d, cv: -0.01 }, { a: 0.285, hu: 0.122, hv: 0.088, cv: -0.014 }, { a: 0.33, hu: 0.086, hv: 0.072, cv: -0.016 }]), 'chest', null, mat(COL.leather, { noise: 0.2, grain: 70, spec: 0.55, gloss: 14 }), 'jacket');
        const lap = mat('#2c201b', { noise: 0.12, grain: 70, spec: 0.6, gloss: 14 });
        for (const sg of [1, -1]) put('lapel', () => ellipsoid(0.05, 0.085, 0.014, { seg: 10, rings: 6 }), 'chest', M(tr(sg * 0.074, 0.2, frontZ(D, 0.19, 0.024) - 0.006), rz(sg * 0.42), rx(-0.2)), lap, 'jacket');
        const sl = mat(COL.leather, { pat: 8, p: [-0.2, 0, 0, 0], noise: 0.17, grain: 70, spec: 0.7, gloss: 14 });
        for (const s of ['l', 'r']) {
          put('slDelt', () => ellipsoid(0.07 * D.l, 0.075, 0.068 * D.l, { seg: 12, rings: 7 }), s + 'Up', tr(0, -0.035, 0), sl, 'jacket');
          put('slUp', () => capsule(D.upper, 0.064 * D.l, 0.052 * D.l), s + 'Up', null, sl, 'jacket');
          put('slLo', () => capsule(0.235, 0.054 * D.l, 0.045 * D.l), s + 'Lo', null, sl, 'jacket');
        }
      } else {
        put('tank', () => torsoMesh(D, 0.006, -0.32), 'chest', null, mat(COL.tank, { pat: 13, b: COL.skin, p: [0.19, 0.115, 0.215, 0.085], noise: 0.08, grain: 60 }), 'tank');
        for (const s of ['l', 'r']) {
          put('armDelt', () => ellipsoid(0.058 * D.l, 0.066, 0.056 * D.l, { seg: 12, rings: 7 }), s + 'Up', tr(0, -0.035, 0), skin);
          put('armUp', () => capsule(D.upper, 0.052 * D.l, 0.042 * D.l), s + 'Up', null, skin);
          put('armLo', () => capsule(0.235, 0.046 * D.l, 0.033 * D.l), s + 'Lo', null, skin);
        }
      }
      // dog tag
      const steel = mat(COL.metal, { noise: 0.04, spec: 1, gloss: 6 });
      const tz = frontZ(D, 0.12, 0.006) + 0.012;
      put('tag', () => box(0.013, 0.02, 0.003), 'chest', tr(0, 0.12, tz), steel);
      for (const sg of [1, -1]) seg('chain', 'chest', [sg * 0.05, 0.31, 0.06], [sg * 0.008, 0.142, tz - 0.002], 0.006, steel);
      // back cables down the jacket
      if (!helmet) {
        const cab = mat(COL.cable, { noise: 0.02 }), bz = backZ(D, 0.1, jacket ? 0.024 : 0.006) - 0.008;
        for (const o of [0, 0.014]) {
          seg('cb1', 'chest', [-0.055 - o, D.neckY + 0.02, -0.095], [-0.07 - o, 0.25, bz + 0.012], 0.0085, cab);
          seg('cb2', 'chest', [-0.07 - o, 0.25, bz + 0.012], [-0.085 - o, 0.06, bz], 0.0085, cab);
          seg('cb3', 'chest', [-0.085 - o, 0.06, bz], [-0.07 - o, -0.13, bz + 0.006], 0.0085, cab);
        }
      }
      for (const s of ['l', 'r']) {
        put('palm', () => ellipsoid(0.026, 0.052, 0.044, { seg: 10, rings: 6, exp: 2.4 }), s + 'Hand', tr(0, -0.008, 0.004), skin);
        put('thumb', () => capsule(0.035, 0.013, 0.011, { seg: 6 }), s + 'Hand', M(tr(0, 0.018, 0.034), rx(-0.9)), skin);
      }
      // trousers, belt, holster
      const cargo = mat(COL.cargo, { noise: 0.12, grain: 70 });
      put('pelvis', () => loft([
        { a: -0.13, hu: 0.11 * D.w, hv: 0.075 * D.d }, { a: -0.09, hu: 0.155 * D.w + 0.014, hv: 0.105 * D.d + 0.014 },
        { a: -0.02, hu: 0.168 * D.w + 0.014, hv: 0.115 * D.d + 0.014, cv: 0.004 }, { a: 0.06, hu: 0.165 * D.w + 0.014, hv: 0.118 * D.d + 0.014, cv: 0.008 },
        { a: 0.12, hu: 0.16 * D.w + 0.014, hv: 0.115 * D.d + 0.014, cv: 0.008 }], { seg: 14, exp: 2.4, capAAt: -0.15, capBAt: 0.13 }), 'hips', null, cargo);
      put('belt', () => tube([{ a: 0.055, hu: 0.175 * D.w + 0.02, hv: 0.122 * D.d + 0.02, cv: 0.008 }, { a: 0.1, hu: 0.172 * D.w + 0.02, hv: 0.12 * D.d + 0.02, cv: 0.008 }]), 'hips', null, mat(COL.belt, { noise: 0.05 }));
      put('buckle', () => box(0.03, 0.022, 0.008), 'hips', tr(0, 0.078, 0.122 * D.d + 0.032), mat(COL.metal, { noise: 0.04, spec: 1, gloss: 6 }));
      for (const [s, sg] of [['l', 1], ['r', -1]]) {
        put('thigh', () => capsule(D.thigh, 0.092 * D.l, 0.07 * D.l), s + 'Thigh', null, cargo);
        put('shin', () => capsule(0.24, 0.07 * D.l, 0.074 * D.l), s + 'Shin', null, mat(COL.cargo, { pat: 24, p: [-0.02, 0, 0, 0], noise: 0.12, grain: 70 }));
        put('pocket', () => box(0.022, 0.06, 0.052), s + 'Thigh', tr(sg * 0.1 * D.l, -0.2, 0.004), mat(COL.cargo, { pat: 24, p: [0.035, 0, 0, 0], noise: 0.12, grain: 70 }));
        // boots: foot + shaft
        put('boot', () => loft([
          { a: -0.08, hu: 0.046, hv: 0.04, cv: -0.048 }, { a: -0.066, hu: 0.058, hv: 0.062, cv: -0.026 },
          { a: -0.01, hu: 0.062, hv: 0.08, cv: -0.008 }, { a: 0.07, hu: 0.062, hv: 0.058, cv: -0.03 },
          { a: 0.15, hu: 0.059, hv: 0.045, cv: -0.043 }, { a: 0.205, hu: 0.048, hv: 0.035, cv: -0.053 }], { axis: 'z', seg: 12, exp: 2.6, capAAt: -0.087, capBAt: 0.218 }),
          s + 'Foot', null, mat(COL.boot, { pat: 19, b: COL.lace, p: [0.02, 0.022, -0.035, 55], noise: 0.08, spec: 0.6, gloss: 16 }));
        put('soleBand', () => loft([{ a: -0.085, hu: 0.05, hv: 0.016, cv: -0.074 }, { a: -0.06, hu: 0.064, hv: 0.016, cv: -0.074 }, { a: 0.15, hu: 0.064, hv: 0.016, cv: -0.074 }, { a: 0.215, hu: 0.05, hv: 0.014, cv: -0.074 }], { axis: 'z', seg: 10, exp: 3, capAAt: -0.092, capBAt: 0.222 }),
          s + 'Foot', null, mat('#151516', { pat: 23, p: [90, 0, 0, 0], noise: 0.05 }));
        put('shaft', () => capsule(0.2, 0.066 * D.l, 0.064 * D.l), s + 'Shin', tr(0, -D.shin + 0.2, 0), mat(COL.boot, { pat: 19, b: COL.lace, p: [0.03, 0.02, -0.19, 50], noise: 0.08, spec: 0.6, gloss: 16 }));
      }
      // drop-leg holster on the right thigh
      const hb = mat('#161618', { noise: 0.05 });
      put('holster', () => box(0.024, 0.085, 0.045), 'rThigh', tr(-0.112 * D.l, -0.12, 0.005), hb);
      put('pistol', () => box(0.016, 0.04, 0.022), 'rThigh', M(tr(-0.116 * D.l, -0.015, -0.012), rx(-0.35)), mat('#2c2c2f', { noise: 0.05, spec: 0.6, gloss: 18 }));
      for (const y of [-0.08, -0.17]) put('strap' + y, () => tube([{ a: -0.012, hu: 0.098 * D.l, hv: 0.084 * D.l }, { a: 0.012, hu: 0.096 * D.l, hv: 0.082 * D.l }]), 'rThigh', tr(0, y, 0), hb);
    } else {
      // ---------- power armour ----------
      const plate = mat(COL.steel, { pat: 20, b: COL.rust, p: [0, 0, 0, 0], noise: 0.1, grain: 28, spec: 0.85, gloss: 12 });
      const plateSeam = mat(COL.steel, { pat: 20, b: COL.rust, p: [12, 0, 0, 0], noise: 0.1, grain: 28, spec: 0.85, gloss: 12 });
      const dark = mat('#3a3d40', { pat: 20, b: COL.rust, noise: 0.12, grain: 45, spec: 0.5, gloss: 14 });
      const rubber = mat(COL.rubber, { pat: 23, p: [32, 0, 0, 0], noise: 0.05 });
      put('aTorso', () => loft(ARMOR_T.map((r) => ({ a: r[0], hu: r[1], hv: r[2], cv: r[3] })), { seg: 16, exp: 2.8, capAAt: -0.14, capBAt: 0.36 }), 'chest', null,
        mat(COL.steel, { pat: 11, b: COL.yellow, p: [0.072, 0.1, 0.06, 0], noise: 0.1, grain: 28, spec: 0.85, gloss: 12 }), 'armorTop');
      put('aBelly', () => tube([{ a: -0.29, hu: 0.19, hv: 0.14, cv: 0.01 }, { a: -0.11, hu: 0.2, hv: 0.15, cv: 0.01 }]), 'chest', null, rubber, 'armorTop');
      put('aCollar', () => tube([{ a: 0.32, hu: 0.14, hv: 0.12 }, { a: 0.39, hu: 0.12, hv: 0.105 }]), 'chest', null, dark, 'armorTop');
      put('aPack', () => box(0.17, 0.2, 0.085), 'chest', tr(0, 0.11, -0.255), mat(COL.steel, { pat: 16, p: [-0.06, 0.02, 0.085, 0], noise: 0.16, grain: 45, spec: 0.7, gloss: 12 }), 'armorTop');
      for (const sg of [1, -1]) put('aPipe', () => capsule(0.24, 0.02, 0.02), 'chest', tr(sg * 0.13, 0.33, -0.3), mat('#2e3033', { pat: 23, p: [60, 0, 0, 0], noise: 0.05 }), 'armorTop');
      put('aPelvis', () => loft([{ a: -0.15, hu: 0.13, hv: 0.09 }, { a: -0.08, hu: 0.2, hv: 0.15 }, { a: 0.05, hu: 0.21, hv: 0.16, cv: 0.01 }, { a: 0.13, hu: 0.2, hv: 0.155, cv: 0.01 }], { seg: 14, exp: 2.6, capAAt: -0.17, capBAt: 0.14 }), 'hips', null, plate);
      put('aBelt', () => tube([{ a: 0.045, hu: 0.222, hv: 0.17, cv: 0.01 }, { a: 0.095, hu: 0.22, hv: 0.168, cv: 0.01 }]), 'hips', null, mat(COL.olive, { noise: 0.08 }));
      for (const th of [0.75, -0.75, 1.65, -1.65]) put('aPouch', () => box(0.035, 0.04, 0.03), 'hips', M(tr(Math.sin(th) * 0.24, 0.06, Math.cos(th) * 0.185 + 0.01), ry(th)), mat(COL.olive, { pat: 24, p: [0.02, 0, 0, 0], noise: 0.1 }));
      for (const [s, sg] of [['l', 1], ['r', -1]]) {
        put('aPaul', () => ellipsoid(0.15, 0.09, 0.15, { half: true, seg: 14, rings: 5 }), s + 'Up', tr(sg * 0.028, 0.0, 0), plateSeam, 'armorTop');
        put('aUp', () => capsule(D.upper, 0.078, 0.07), s + 'Up', null, plate, 'armorTop');
        put('aElbow', () => ellipsoid(0.062, 0.062, 0.062, { seg: 10, rings: 6 }), s + 'Lo', null, dark);
        put('aFore', () => loft([{ a: -0.27, hu: 0.066, hv: 0.066 }, { a: -0.05, hu: 0.074, hv: 0.074 }, { a: -0.015, hu: 0.07, hv: 0.07 }], { seg: 12, exp: 3, capAAt: -0.275, capBAt: -0.008 }), s + 'Lo', null,
          s === 'l' ? mat(COL.steel, { pat: 15, b: COL.green, p: [0.045, -0.2, -0.1, 0.035], side: 1, noise: 0.1, grain: 28, spec: 0.85, gloss: 12 }) : plate);
        put('aFist', () => ellipsoid(0.058, 0.064, 0.06, { seg: 10, rings: 6 }), s + 'Hand', null, mat('#33363a', { noise: 0.08 }));
        put('aThigh', () => capsule(D.thigh, 0.11, 0.09), s + 'Thigh', null, plateSeam);
        put('aKnee', () => ellipsoid(0.072, 0.078, 0.05, { seg: 10, rings: 6 }), s + 'Shin', tr(0, -0.01, 0.078), mat('#5a5e62', { noise: 0.12, grain: 45, spec: 0.85, gloss: 12 }));
        put('aShin', () => loft([{ a: -D.shin + 0.03, hu: 0.084, hv: 0.084 }, { a: -0.2, hu: 0.09, hv: 0.092 }, { a: -0.03, hu: 0.086, hv: 0.088 }], { seg: 12, exp: 3, capAAt: -D.shin + 0.02, capBAt: -0.02 }), s + 'Shin', null, plateSeam);
        put('aBoot', () => loft([
          { a: -0.1, hu: 0.06, hv: 0.05, cv: -0.08 }, { a: -0.08, hu: 0.08, hv: 0.08, cv: -0.05 }, { a: 0.0, hu: 0.085, hv: 0.1, cv: -0.03 },
          { a: 0.12, hu: 0.083, hv: 0.07, cv: -0.06 }, { a: 0.23, hu: 0.07, hv: 0.05, cv: -0.08 }], { axis: 'z', seg: 12, exp: 3, capAAt: -0.11, capBAt: 0.245 }),
          s + 'Foot', null, mat('#45484c', { pat: 5, b: '#1c1c1e', p: [-0.1, 0, 0, 0], noise: 0.12, grain: 45, spec: 0.6, gloss: 14 }));
      }
    }

    // helmet
    if (helmet) {
      const hm = mat(COL.steel, { pat: 17, b: COL.yellow, p: [0.022, -0.03, 0.115, 0], r: [-0.018, 0.026, 0.1, 0], noise: 0.1, grain: 28, spec: 0.9, gloss: 14 });
      const hd = mat('#34373b', { noise: 0.08 });
      put('hDome', () => ellipsoid(0.148, 0.152, 0.158, { exp: 2.3, seg: 18, rings: 10 }), 'head', tr(...H(0, 0.015, -0.005)), hm, 'helmet');
      put('hResp', () => ellipsoid(0.075, 0.056, 0.05, { seg: 12, rings: 6 }), 'head', tr(...H(0, -0.078, 0.128)), mat('#3a3d41', { pat: 12, p: [0.01, 55, 0, 0], noise: 0.08 }), 'helmet');
      for (const sg of [1, -1]) {
        put('hFilter', () => cyl(0.03, 0.03, 0.06, 10), 'head', M(tr(...H(sg * 0.085, -0.095, 0.105)), alongPlusY([sg * 0.5, -0.35, 0.8])), mat('#2b2d30', { pat: 23, p: [80, 0, 0, 0], noise: 0.06 }), 'helmet');
        put('hLamp', () => cyl(0.022, 0.022, 0.04, 10), 'head', M(tr(...H(sg * 0.14, 0.03, 0.04)), alongPlusY([sg * 0.6, 0, 0.8])), hd, 'helmet');
        put('hLens', () => ellipsoid(0.018, 0.006, 0.018, { seg: 10, rings: 4 }), 'head', M(tr(...H(sg * 0.165, 0.03, 0.073)), alongPlusY([sg * 0.6, 0, 0.8])), mat(COL.green, { pat: 10, p: [4, 0, 0, 0] }), 'helmet');
        put('hAnt', () => capsule(0.15, 0.0075, 0.006, { seg: 6 }), 'head', M(tr(...H(sg * 0.07, 0.11, -0.09)), alongMinusY([0, 1, -0.25])), mat('#202224', { noise: 0 }), 'helmet');
      }
      put('hSeal', () => tube([{ a: -0.13, hu: 0.115, hv: 0.12 }, { a: -0.09, hu: 0.13, hv: 0.135 }]), 'head', tr(...HC), hd, 'helmet');
    }
    return { parts, D, armor, helmet, jacket };
  }
  // props
  export const RIFLE = rifleParts();
  export const CIG_LEN = 0.085;
  export const PROPS = {
    cig: { mesh: getMesh('cig', () => capsule(CIG_LEN, 0.011, 0.011, { seg: 6 })), mat: mat('#ece8df', { noise: 0 }) },
    tip: { mesh: getMesh('tip', () => ellipsoid(0.012, 0.012, 0.012, { seg: 6, rings: 4 })) },
    pack: { mesh: getMesh('pack', () => box(0.028, 0.044, 0.011)), mat: mat(COL.purple, { pat: 22, b: COL.gold, p: [0.024, 0.04, 0.022, 0], noise: 0.02 }) },
    can: { mesh: getMesh('can', () => cyl(0.033, 0.033, 0.165, 14)), mat: mat(COL.can, { pat: 21, b: '#1b1b1d', p: [0.108, 0.134, 0.07, 0.022], r: [0.158, 0, 0, 0], noise: 0.04, spec: 1, gloss: 8 }) }
  };
  export const TIP_DIM = mat('#c4471f', { pat: 10, p: [1, 0, 0, 0] });
  export const TIP_HOT = mat('#e8742c', { pat: 10, p: [4, 0, 0, 0] });

  // what the hero wears and holds: body 'tank' (default) | 'jacket' | 'armor', head null | 'helmet', hands null | 'rifle'.
  // The game sets it and calls rebuildHero() when it changes (gearVer++ makes the stage redraw); setHero(model) puts a model in place
  // as it is (at boot, or for a moment to draw the portrait in other gear).
  export const equip = { body: null, head: null, hands: null };
  export let HERO = null, gearVer = 0;
  export const armored = () => equip.body === 'armor';
  export function setHero(model) { HERO = model; }
  export function rebuildHero() { HERO = buildHero(equip); gearVer++; }
