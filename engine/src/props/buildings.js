  // ================= library: buildings — a five-storey block, an entrance, a substation, a metal garage =================
  // Shared by the games: each is built once in its own local frame (origin on the ground, +z its front) and baked into the world.
  // signs and plates they wear
  import { M, len, lerpV, rng, rx, ry, rz, sc3, sub, tr } from '../core/math.js';
  import { flat, mat, paint } from '../render/materials.js';
  import { box, cyl, ellipsoid, polyMesh, torus } from '../render/meshes.js';
  import { rawMesh } from '../render/webgl.js';
  import { Kit } from '../render/kit.js';
  import { SANS, addDecal, decalOn, outlinedText, scribble } from '../render/decals.js';
  import { CATALOG } from '../world/instances.js';
  addDecal('tagSub', 1.3, 0.55, (g, w, h) => { scribble(g, 4, 6, w - 10, h - 16, '#1a1a1c', 53, 2); });
  addDecal('hazard', 0.42, 0.36, (g, w, h) => {
    g.fillStyle = '#1b1b1d'; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
    g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(w / 2, 3); g.lineTo(w - 3, h - 2); g.lineTo(3, h - 2); g.closePath(); g.fill();
    g.fillStyle = '#1b1b1d'; g.beginPath(); g.moveTo(w / 2 + 1, 6); g.lineTo(w / 2 - 3, h * 0.6); g.lineTo(w / 2 + 1, h * 0.6); g.lineTo(w / 2 - 2, h - 4); g.lineTo(w / 2 + 4, h * 0.5); g.lineTo(w / 2, h * 0.5); g.lineTo(w / 2 + 3, 6); g.closePath(); g.fill();
  });
  addDecal('danger', 0.62, 0.4, (g, w, h) => {
    g.fillStyle = '#f1efe8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8352c'; g.fillRect(0, 0, w, 6);
    g.fillStyle = '#1b1b1d'; g.beginPath(); g.moveTo(w * 0.42, 8); g.lineTo(w * 0.3, h * 0.62); g.lineTo(w * 0.5, h * 0.55); g.lineTo(w * 0.4, h - 3); g.lineTo(w * 0.66, h * 0.42); g.lineTo(w * 0.47, h * 0.48); g.lineTo(w * 0.58, 8); g.closePath(); g.fill();
  });
  addDecal('stencil', 1.05, 0.26, (g, w, h) => { outlinedText(g, 'ТП-117', 1, 1, 'bold 14px ' + SANS, '#2a2a2c', null, 0); });
  addDecal('plate1', 0.32, 0.22, (g, w, h) => { g.fillStyle = '#2f5d9e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f2ee'; g.fillRect(1, 1, w - 2, 1); outlinedText(g, '1', 6, 2, 'bold 11px ' + SANS, '#f2f2ee', null, 0); g.fillRect(12, 6, 4, 1); g.fillRect(12, 9, 4, 1); });
  addDecal('plate2', 0.32, 0.22, (g, w, h) => { g.fillStyle = '#2f5d9e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f2ee'; g.fillRect(1, 1, w - 2, 1); outlinedText(g, '2', 5, 2, 'bold 11px ' + SANS, '#f2f2ee', null, 0); g.fillRect(12, 6, 4, 1); g.fillRect(12, 9, 4, 1); });
  addDecal('houseNo', 0.62, 0.36, (g, w, h) => { g.fillStyle = '#2f5d9e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2ee'; g.strokeRect(1.5, 1.5, w - 3, h - 3); outlinedText(g, '12', 8, 5, 'bold 15px ' + SANS, '#f2f2ee', null, 0); });
  addDecal('intercom', 0.18, 0.28, (g, w, h) => {
    g.fillStyle = '#9ea3a6'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2d30'; g.fillRect(2, 2, w - 4, 4);
    g.fillStyle = '#3c3f43'; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.fillRect(2 + c * 2, 8 + r * 2, 1, 1);
  });
  addDecal('notice', 0.3, 0.4, (g, w, h) => {
    g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8352c'; g.fillRect(2, 2, w - 4, 2);
    g.fillStyle = '#8a8a86'; for (let y = 7; y < h - 3; y += 3) g.fillRect(2, y, w - 4 - ((y * 7) % 5), 1);
  });
  // ---------- the yard with birches: notices and tags on the metal garage, number plates ----------
  addDecal('garPoster1', 0.46, 0.58, (g, w, h) => {
    g.fillStyle = '#f1efe6'; g.fillRect(0, 0, w, h - 3);
    outlinedText(g, 'КУПЛЮ', 2, 2, 'bold 8px ' + SANS, '#1d1d1f', null, 0);
    outlinedText(g, 'ГАРАЖ', 2, 11, 'bold 8px ' + SANS, '#c8352c', null, 0);
    g.fillStyle = '#4b4b48'; for (let y = 22; y < h - 10; y += 3) g.fillRect(2, y, w - 4 - ((y * 7) % 6), 1);
    g.fillStyle = '#f1efe6'; for (let x = 0; x < w; x += 3) g.fillRect(x, h - 8, 2, 8 - ((x * 5) % 4));
    g.fillStyle = '#2f2f2c'; for (let x = 1; x < w; x += 3) g.fillRect(x, h - 6, 1, 3);
  });
  addDecal('garPoster2', 0.36, 0.44, (g, w, h) => {
    g.fillStyle = '#e9d873'; g.fillRect(0, 0, w, h);
    outlinedText(g, 'ВСКРЫТИЕ', 1, 2, 'bold 6px ' + SANS, '#1d1d1f', null, 0);
    outlinedText(g, 'ЗАМКОВ', 1, 9, 'bold 6px ' + SANS, '#1d1d1f', null, 0);
    g.fillStyle = '#5a5228'; for (let y = 18; y < h - 3; y += 3) g.fillRect(1, y, w - 3 - ((y * 3) % 5), 1);
  });
  addDecal('garTorn', 0.34, 0.24, (g, w, h) => {
    g.fillStyle = '#ece9df'; const R = rng(77);
    for (let i = 0; i < 26; i++) { const x = R() * w, y = R() * h, a = 1 + R() * 4, b = 1 + R() * 3; g.fillRect(x, y, a, b); }
  });
  addDecal('garTag', 1.6, 0.62, (g, w, h) => { scribble(g, 4, 8, w - 14, h - 22, '#1a1a1c', 61, 2.2); scribble(g, w * 0.25, h * 0.45, w * 0.5, h * 0.3, '#1a1a1c', 63, 1.5); });
  addDecal('garTag2', 0.9, 0.5, (g, w, h) => { scribble(g, 3, 5, w - 8, h - 14, '#e8e6df', 67, 2); });

  // ---------- five-storey brick block ----------
  function buildBlock5(o) {
    const k = new Kit(o.seed || 7), R = k.R;
    const L = o.len, Dp = o.depth || 12, F = 5, FH = 2.8, BASE = 0.75, H = BASE + F * FH + 0.2, REC = 0.22;
    const nb = Math.round(L / 3.1), bw = L / nb;
    const brick = mat(o.brick, { pat: 30, b: o.brick2, p: [0.1512, 0.52, 0.1, 0.86], r: [BASE, 0, 0, 0], noise: 0.03, grain: 40 });
    const baseM = mat(o.base || '#9a948a', { pat: 33, b: '#8a847a', p: [BASE, 0.2, 3, 0], noise: 0.08, grain: 45 });
    const slabM = mat('#c4c0b7', { noise: 0.05, grain: 40 });
    const roofM = mat('#5d5a56', { pat: 34, noise: 0.06, grain: 30 });
    const parM = mat('#aca89f', { noise: 0.06, grain: 40 });
    const sill = mat('#a9aeb1', { noise: 0.03, spec: 0.4, gloss: 16 });
    const pipe = mat('#8f9599', { pat: 23, p: [1.2, 0, 0, 0], noise: 0.03, spec: 0.4, gloss: 16 });
    const lintM = mat(o.lintel || '#bdb8ad', { pat: 48, p: [10, 0, 0, 0], noise: 0.06, grain: 40 });
    const fr = o.frame || '#eceae4';
    const glazF = mat('#56718c', { pat: 43, b: fr, p: [4, 0.05, 1.27, 0.76], r: [0.012, 0, 0, 0], noise: 0 });
    const glazS = mat('#56718c', { pat: 43, b: fr, p: [2, 0.05, 0.56, 0.76], r: [0.012, 0, 0, 0], noise: 0 });
    const winA = mat('#4b6680', { pat: 43, b: fr, p: [2, 0.055, 0.75, 0.725], r: [0.022, 0, 0, 0], noise: 0 });
    const panel = mat(o.panel || (o.panels && o.panels[0]) || '#9b4a3a', { pat: 38, b: o.panel2 || '#7c4c33', p: [5, 0.93, 0, 0], noise: 0.05, grain: 50 });
    const acM = mat('#e4e3de', { pat: 12, p: [0.1, 34, 0, 0], noise: 0.03 });
    const dishM = mat('#d9d9d4', { noise: 0.02, spec: 0.4, gloss: 10 });
    const railM = flat('#3b3d40', 1);
    // window frames: new white plastic or old painted wood; glass with curtains in different colours
    const frames = [mat(fr, { noise: 0.02, spec: 0.2, gloss: 10 }), mat(o.frame2 || '#86684a', { pat: 38, b: '#5e4532', p: [9, 0.88, 0, 0], noise: 0.05, grain: 50 })];
    const glassM = ['#ebe6da', '#dccca6', '#b8644f', '#8ea37a', '#d1c18c', '#9fb4c8', '#c9a3a8'].map((c) => mat('#4b6680', { pat: 49, b: c, noise: 0 }));
    const barM = mat('#2f3134', { noise: 0.03, spec: 0.3, gloss: 12 });
    const UBOX = () => rawMesh('ubox', () => box(1, 1, 1));
    // body behind the facade shell, plinth, roof
    k.boxMM(brick, 0, 0, -Dp, L, H, -REC);
    k.boxMM(baseM, -0.05, 0, -Dp - 0.05, L + 0.05, BASE, 0.06);
    k.boxMM(roofM, 0.2, H, -Dp + 0.2, L - 0.2, H + 0.22, -0.2);
    k.boxMM(parM, -0.04, H, -0.26, L + 0.04, H + 0.6, 0.04);
    k.boxMM(parM, -0.04, H, -Dp - 0.04, L + 0.04, H + 0.6, -Dp + 0.22);
    k.boxMM(parM, -0.04, H, -Dp, 0.24, H + 0.6, 0);
    k.boxMM(parM, L - 0.24, H, -Dp, L + 0.04, H + 0.6, 0);
    const rail = [];
    for (let x = 0.2; x <= L - 0.1; x += 1.6) rail.push([[x, H + 0.6, -0.1], [x, H + 1.35, -0.1]]);
    rail.push([[0.2, H + 1.35, -0.1], [L - 0.2, H + 1.35, -0.1]], [[0.2, H + 1.0, -0.1], [L - 0.2, H + 1.0, -0.1]]);
    k.lines(railM, rail);
    for (let i = 1; i < nb; i += 2) k.boxMM(brick, i * bw - 0.45, H, -Dp * 0.55, i * bw + 0.45, H + 1.15, -Dp * 0.55 + 0.7);
    const ant = [];
    for (const x of [bw * 1.5, L - bw * 2]) { ant.push([[x, H + 0.2, -Dp * 0.4], [x, H + 3.0, -Dp * 0.4]], [[x - 0.6, H + 2.6, -Dp * 0.4], [x + 0.6, H + 2.6, -Dp * 0.4]], [[x - 0.4, H + 2.2, -Dp * 0.4], [x + 0.4, H + 2.2, -Dp * 0.4]]); }
    k.lines(railM, ant);
    for (const x of [0.32, L - 0.32]) {
      k.rod(pipe, [x, 0.3, 0.15], [x, H + 0.1, 0.15], 0.065, 8);
      k.boxMM(pipe, x - 0.08, 0.12, 0.08, x + 0.08, 0.3, 0.32);
    }
    decalOn(k, 'houseNo', [-0.006, 3.4, -1.2], '-x');
    decalOn(k, 'houseNo', [L + 0.006, 3.4, -1.2], 'x');
    const spots = [], heights = [], blocks = [{ rect: [0, -Dp, L, 0.05] }];
    // a window set REC deep into the wall: glass, frame with leaves and a transom, tin sill, concrete lintel; bars on some ground-floor ones
    const windowIn = (xc, ys, hw, f) => {
      const hh = 0.725, yc = ys + hh, zf = -0.11, fw = 0.045;
      k.put(UBOX(), M(tr(xc, yc, -0.155), sc3(hw, hh, 0.012)), glassM[(R() * glassM.length) | 0], R());
      const fm = R() < 0.62 ? frames[0] : frames[1];
      k.boxMM(fm, xc - hw, ys, zf - 0.03, xc + hw, ys + fw, zf + 0.03);
      k.boxMM(fm, xc - hw, yc + hh - fw, zf - 0.03, xc + hw, yc + hh, zf + 0.03);
      k.boxMM(fm, xc - hw, ys, zf - 0.03, xc - hw + fw, yc + hh, zf + 0.03);
      k.boxMM(fm, xc + hw - fw, ys, zf - 0.03, xc + hw, yc + hh, zf + 0.03);
      const leaves = hw > 1 ? 3 : 2, lw = 2 * hw / leaves;
      for (let j = 1; j < leaves; j++) { const xm = xc - hw + lw * j; k.boxMM(fm, xm - fw / 2, ys, zf - 0.03, xm + fw / 2, yc + hh, zf + 0.03); }
      const l0 = xc - hw + lw * ((R() * leaves) | 0);
      k.boxMM(fm, l0, yc + 0.3, zf - 0.025, l0 + lw, yc + 0.3 + fw, zf + 0.025);
      k.boxMM(sill, xc - hw - 0.05, ys - 0.05, -0.04, xc + hw + 0.05, ys, 0.12);
      k.boxMM(lintM, xc - hw - 0.2, yc + hh, -0.012, xc + hw + 0.2, yc + hh + 0.2, 0.012);
      if (f === 0 && R() < 0.55) {
        for (let x = xc - hw + 0.08; x < xc + hw - 0.04; x += 0.13) k.boxMM(barM, x - 0.012, ys - 0.02, 0.03, x + 0.012, yc + hh + 0.02, 0.055);
        for (const y of [ys + 0.3, yc + hh - 0.25]) k.boxMM(barM, xc - hw - 0.04, y - 0.015, 0.025, xc + hw + 0.04, y + 0.015, 0.06);
      }
      const r = R();
      if (r < 0.15) k.boxMM(acM, xc + hw + 0.18, yc - 0.05, 0, xc + hw + 0.9, yc + 0.45, 0.3);
      else if (r < 0.23) k.mesh('dish', () => ellipsoid(0.3, 0.3, 0.08, { seg: 12, rings: 5, half: true }), dishM, M(tr(xc - hw - 0.35, yc + 0.35, 0.12), rx(-1.1)), 0);
    };
    const CLOTHES = ['#e8e6e0', '#c94f45', '#4f6fa8', '#e2c34a', '#7aa36a', '#d98fb0', '#3d3f45'].map((c) => Object.assign(mat(c, { noise: 0.06, grain: 40, wind: [0.025, 1 / 14, 2.4, 0.6] }), { noShadow: false }));
    // loggia panels: one colour, or a mix of the colours in o.panels (the far house has yellow and green ones)
    const panels = o.panels ? o.panels.map((c) => mat(c, { pat: 38, b: o.panel2 || '#7c4c33', p: [5, 0.94, 0, 0], noise: 0.05, grain: 50 })) : null;
    const loggia = (xc, yF, top, f) => {
      const x0 = xc - 1.3, x1 = xc + 1.3, D = 1.15;
      k.boxMM(slabM, x0 - 0.03, yF - 0.12, 0, x1 + 0.03, yF, D + 0.04);
      const pm = panels ? panels[(R() * panels.length) | 0] : (R() < 0.55) ? panel : brick;
      k.boxMM(pm, x0, yF, D - 0.07, x1, yF + 1.0, D);
      k.boxMM(pm, x0, yF, 0, x0 + 0.07, yF + 1.0, D - 0.07);
      k.boxMM(pm, x1 - 0.07, yF, 0, x1, yF + 1.0, D - 0.07);
      if (R() < (o.glazed ?? 0.75)) {
        k.box(glazF, [xc, yF + 1.76, D - 0.035], [1.27, 0.76, 0.015], null, R());
        k.box(glazS, [x0 + 0.035, yF + 1.76, D / 2], [0.56, 0.76, 0.015], ry(-Math.PI / 2), R());
        k.box(glazS, [x1 - 0.035, yF + 1.76, D / 2], [0.56, 0.76, 0.015], ry(Math.PI / 2), R());
      } else {
        // open: a window and a balcony door in the wall, laundry on a line
        k.boxMM(sill, x0, yF + 1.0, D - 0.1, x1, yF + 1.05, D + 0.01);
        k.box(winA, [xc - 0.45, yF + 1.57, 0.025], [0.75, 0.725, 0.025], null, R());
        const ly = yF + 2.1, lz = D - 0.4;
        k.lines(railM, [[[x0 + 0.1, ly, lz], [x1 - 0.1, ly, lz]]]);
        let x = x0 + 0.25 + R() * 0.2;
        while (x < x1 - 0.5) {
          const w = 0.22 + R() * 0.35, h = 0.3 + R() * 0.45;
          k.boxMM(CLOTHES[(R() * CLOTHES.length) | 0], x, ly - h, lz - 0.01, x + w, ly, lz + 0.01);
          x += w + 0.06 + R() * 0.2;
        }
      }
      if (top) k.boxMM(slabM, x0 - 0.03, yF + 2.6, 0, x1 + 0.03, yF + 2.72, D + 0.04);
    };
    // the facade shell: bands under and over the windows, piers between them, solid where there are loggias and entrances
    const children = [];
    const kindOf = (i, f) => (o.entr || []).includes(i) ? 'entr' : ((o.balc || []).includes(i) && f >= 1 ? 'loggia' : 'win');
    for (let f = 0; f < F; f++) {
      const yF = BASE + f * FH, ys = yF + 0.85, yt = ys + 1.45;
      k.boxMM(brick, 0, yF, -REC, L, ys, 0);
      k.boxMM(brick, 0, yt, -REC, L, yF + FH, 0);
      let x = 0;
      for (let i = 0; i < nb; i++) {
        const xc = (i + 0.5) * bw, kind = kindOf(i, f);
        if (kind === 'loggia') loggia(xc, yF, f === F - 1, f);
        if (kind !== 'win') continue;
        const hw = i % 2 === 0 ? 1.05 : 0.75;
        k.boxMM(brick, x, ys, -REC, xc - hw, yt, 0);
        windowIn(xc, ys, hw, f);
        x = xc + hw;
      }
      k.boxMM(brick, x, ys, -REC, L, yt, 0);
    }
    k.boxMM(brick, 0, BASE + F * FH, -REC, L, H, 0);
    k.boxMM(brick, 0, 0, -REC, L, BASE, 0);
    // brick ornament: a tall "house" drawn in raised brick around a window column — two pilasters joined by a gable
    for (const b of o.ornament || []) {
      const xc = (b + 0.5) * bw, hw = (b % 2 === 0 ? 1.05 : 0.75) + 0.34, y0 = BASE + FH + 0.2, y1 = BASE + 4 * FH + 2.0, apex = y1 + 0.75;
      for (const sg of [-1, 1]) {
        k.boxMM(brick, xc + sg * hw - 0.11, y0, -0.01, xc + sg * hw + 0.11, y1, 0.065);
        const a = [xc + sg * hw, y1, 0.03], q = [xc, apex, 0.03], mid = lerpV(a, q, 0.5), L2 = len(sub(q, a));
        k.box(brick, mid, [L2 / 2 + 0.08, 0.11, 0.035], rz(Math.atan2(q[1] - a[1], q[0] - a[0])));
        k.boxMM(brick, xc + sg * hw - 0.16, y0 - 0.12, -0.01, xc + sg * hw + 0.16, y0, 0.085);
      }
    }
    // brick vent stacks on the roof
    const capM = mat('#b1ada4', { noise: 0.05, grain: 40 });
    for (let c = 0; c < (o.chimneys || 0); c++) {
      const x = L * (c + 1) / ((o.chimneys || 0) + 1) + (R() - 0.5) * 1.5, z = -Dp * (0.35 + R() * 0.3);
      k.boxMM(brick, x - 0.28, H, z - 0.28, x + 0.28, H + 1.05, z + 0.28);
      k.boxMM(capM, x - 0.36, H + 1.05, z - 0.36, x + 0.36, H + 1.12, z + 0.36);
      k.boxMM(mat('#2e2b29', { noise: 0.02 }), x - 0.12, H + 0.7, z + 0.27, x + 0.12, H + 0.95, z + 0.29);
    }
    for (let i = 0; i < nb; i++) {
      const en = (o.entr || []).indexOf(i);
      if (en >= 0) children.push({ type: 'entrance', local: [(i + 0.5) * bw, 0], idx: en, n: o.entrN ?? 11, frame: fr, door: o.door, plates: o.plates });
    }
    return { kit: k, blocks, heights, spots, children, top: H + 1.4 };
  }

  // ---------- entrance: porch with a step, metal door, canopy, intercom, stairwell windows ----------
  function buildEntrance(o) {
    const k = new Kit(83 + (o.idx || 0)), R = k.R;
    const conc = mat('#b7b3a9', { pat: 48, p: [1, 0, 0, 0], noise: 0.07, grain: 40 });
    const slabM = mat('#c4c0b7', { noise: 0.05, grain: 40 });
    const sill = mat('#a9aeb1', { noise: 0.03, spec: 0.4, gloss: 16 });
    const doorM = mat(o.door || '#5a4434', { pat: 38, b: '#7b4b32', p: [7, 0.88, 0, 0], noise: 0.05, grain: 60, spec: 0.3, gloss: 12 });
    const darkM = mat('#3a3633', { noise: 0.04 });
    const lampM = mat('#d8d2b8', { noise: 0.02 });
    const winS = mat('#4b6680', { pat: 43, b: o.frame || '#eceae4', p: [2, 0.05, 0.5, 0.6], r: [0.022, 0, 0, 0], noise: 0 });
    k.boxMM(conc, -1.25, 0, 0, 1.25, 0.3, 1.45);
    k.boxMM(conc, -1.25, 0, 1.45, 1.25, 0.15, 1.8);
    k.boxMM(darkM, -0.63, 0.3, 0, 0.63, 2.43, 0.035);
    k.boxMM(doorM, -0.55, 0.3, 0, 0.55, 2.35, 0.07);
    k.boxMM(sill, 0.33, 1.22, 0.07, 0.42, 1.28, 0.11);
    decalOn(k, 'intercom', [0.85, 1.45, 0.006], 'z');
    decalOn(k, 'notice', [-0.18, 1.62, 0.074], 'z');
    decalOn(k, o.idx === 1 ? 'plate2' : 'plate1', [0, 2.6, 0.006], 'z');
    k.boxMM(slabM, -1.38, 2.78, 0, 1.38, 2.92, 1.6);
    k.boxMM(lampM, -0.12, 2.66, 0.45, 0.12, 2.78, 0.66);
    for (let f = 0; f < 4; f++) k.box(winS, [0, 0.75 + f * 2.8 + 2.95, 0.025], [0.5, 0.6, 0.025], null, R());
    return {
      kit: k, blocks: [],
      heights: [{ rect: [-1.25, 0, 1.25, 1.45], y: 0.3 }, { rect: [-1.25, 1.45, 1.25, 1.8], y: 0.15 }],
      spots: [{ kind: 'door', at: [0.5, 0.95], yaw: Math.PI, wall: [0.85, 1.45, 0] }],
      lamp: { at: [0, 2.62, 0.56], r: 6.5, col: [1.0, 0.86, 0.6], k: 1.8, kind: 'porch' }
    };
  }

  // ---------- transformer substation ----------
  function buildSubstation(o) {
    const k = new Kit(17);
    const pl = mat('#e8e6df', { pat: 33, b: '#d7d4cb', p: [2.9, 0.45, 5, 0], noise: 0.04, grain: 40 });
    const pl2 = mat('#e8e6df', { pat: 33, b: '#d7d4cb', p: [3.4, 0.45, 6, 0], noise: 0.04, grain: 40 });
    const plinth = mat('#a6a298', { pat: 33, b: '#8f8b82', p: [0.35, 0.14, 7, 0], noise: 0.08, grain: 45 });
    const roofM = mat('#6c6965', { pat: 34, noise: 0.06, grain: 30 });
    const trim = mat('#8f9396', { noise: 0.05, spec: 0.3, gloss: 14 });
    const steel = paint('#7c8186', { spec: 0.5 });
    k.boxMM(pl, -3, 0, -2, 1, 2.9, 2);
    k.boxMM(pl2, 1, 0, -2, 3, 3.4, 2);
    k.boxMM(plinth, -3.04, 0, -2.04, 3.04, 0.35, 2.04);
    k.boxMM(roofM, -3.12, 2.9, -2.12, 1.02, 3.04, 2.12);
    k.boxMM(roofM, 0.98, 3.4, -2.12, 3.12, 3.54, 2.12);
    k.boxMM(trim, -3.13, 2.86, 2.08, 1.02, 2.9, 2.13);
    k.boxMM(trim, 0.98, 3.36, 2.08, 3.13, 3.4, 2.13);
    const lv = mat('#666b6e', { pat: 32, b: '#8f9396', p: [13, 0.05, 0.36, 0.52], noise: 0.03 });
    for (const x of [1.5, 2.5]) for (const y of [1.25, 2.6]) k.box(lv, [x, y, 2.025], [0.36, 0.52, 0.025]);
    for (const z of [-0.9, 0.9]) k.box(lv, [3.025, 1.6, z], [0.36, 0.52, 0.025], ry(Math.PI / 2));
    const lvS = mat('#666b6e', { pat: 32, b: '#8f9396', p: [16, 0.04, 0.22, 0.16], noise: 0.03 });
    k.box(lvS, [-2.35, 2.45, 2.02], [0.22, 0.16, 0.02]);
    const door = mat('#6b7a85', { pat: 38, b: '#7d5236', p: [6, 0.9, 0, 0], noise: 0.05, grain: 50, spec: 0.3, gloss: 12 });
    k.boxMM(mat('#3d3f42', { noise: 0.03 }), -2.06, 0.35, 1.99, -0.54, 2.5, 2.035);
    k.boxMM(door, -2.0, 0.35, 2.0, -0.6, 2.45, 2.06);
    k.boxMM(mat('#3d3f42', { noise: 0.03 }), -1.31, 0.35, 2.06, -1.29, 2.45, 2.064);
    for (const x of [-1.42, -1.18]) k.boxMM(trim, x - 0.025, 1.3, 2.06, x + 0.025, 1.45, 2.09);
    decalOn(k, 'hazard', [-0.95, 1.85, 2.064], 'z');
    decalOn(k, 'danger', [-1.66, 1.75, 2.064], 'z');
    decalOn(k, 'stencil', [-1.3, 2.66, 2.004], 'z');
    decalOn(k, 'tagSub', [-0.1, 0.85, 2.004], 'z');
    k.rod(steel, [0.72, 0.35, 2.06], [0.72, 2.86, 2.06], 0.035, 8);
    // roof bracket with insulators where the wires arrive
    k.rod(steel, [2.2, 3.54, 0], [2.2, 4.35, 0], 0.035, 8);
    k.rod(steel, [2.2, 4.35, -0.6], [2.2, 4.35, 0.6], 0.03, 6);
    const ins = mat('#e6e3da', { pat: 23, p: [40, 0, 0, 0], noise: 0.02, spec: 0.5, gloss: 10 });
    const att = [];
    for (const z of [-0.5, 0, 0.5]) { k.mesh('insul', () => cyl(0.035, 0.03, 0.14, 8), ins, tr(2.2, 4.37, z)); att.push([2.2, 4.5, z]); }
    return { kit: k, blocks: [{ rect: [-3.1, -2.1, 3.1, 2.1] }], spots: [{ kind: 'door', at: [-1.3, 2.75], yaw: Math.PI, wall: [-1.3, 1.4, 2.0] }], attach: att };
  }


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

  Object.assign(CATALOG, {
    block5: { build: buildBlock5, name: 'Пятиэтажка', size: '20 × 12 м, 15 м', note: 'Кирпич, окна, лоджии, водостоки, антенны. Цвет кирпича и балконов — параметры.', xray: true, hug: true },
    substation: { build: buildSubstation, name: 'Подстанция', size: '6 × 4 м', note: 'Жалюзи, железная дверь с табличками, изоляторы для проводов.', xray: true, hug: true },
    entrance: { build: buildEntrance, name: 'Подъезд', size: '2,8 × 1,8 м', note: 'Крыльцо со ступенькой, железная дверь, домофон, козырёк с лампой.', xray: true, hug: true, litter: 16 },
    metalgarage: { build: buildMetalGarage, name: 'Железный гараж', size: '3,2 × 5,6 м', note: 'Ржавый лист на каркасе, двускатная крыша, двери с замком. Объявления и надписи — наклейки.' }
  });
