  // ================= the human body's shapes: head, torso, proportions; the props he holds =================
  // The shapes every person's pieces are cut from (the hero's in wardrobe.js, other people's in people/look.js): the head and the torso
  // profiles, the body's proportions (dims), where the mouth is; and the props carried in the hands — the rifle, a cigarette, a can.
  import { M, alongPlusY, rx, tr } from '../core/math.js';
  import { COL, mat } from '../render/materials.js';
  import { box, capsule, cyl, ellipsoid, loft } from '../render/meshes.js';
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
  export const headMesh = (inf, from) => loft(HEAD_R.filter((r) => r[0] >= from).map((r) => ({ a: r[0], hu: r[1] + inf, hv: r[2] + inf, cv: r[3] })),
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
  export const frontZ = (D, y, inf) => { const r = torsoAt(y); return r[2] * D.d + inf + r[3] + r[4] * D.belly; };
  export const backZ = (D, y, inf) => { const r = torsoAt(y); return r[3] + r[4] * D.belly - (r[2] * D.d + inf); };
  export const ARMOR_T = [[-0.13, 0.205, 0.152, 0.0], [-0.03, 0.25, 0.18, 0.02], [0.08, 0.29, 0.2, 0.03], [0.18, 0.305, 0.19, 0.02], [0.26, 0.28, 0.17, 0.0], [0.32, 0.2, 0.13, -0.01], [0.35, 0.12, 0.1, -0.01]];

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
