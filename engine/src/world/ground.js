  // ================= ground: the cell strings painted pixel by pixel into one big canvas =================
  const GW = MAP.size[0], GH = MAP.size[1];
  const G = { x0: -HW * GH, y0: 0, w: HW * (GW + GH), h: HH * (GW + GH) + 14 };
  const PAL = {
    '.': ['#3d5c23', '#476a28', '#52762e', '#5e8234', '#6c8e3b'],
    ',': ['#3c5525', '#465f29', '#516a2e', '#5f7535', '#72803f'],
    ':': ['#6c5841', '#7c674b', '#8a7455', '#988260', '#a99470'],
    '#': ['#4e5153', '#56595b', '#5e6163', '#676a6c', '#717476'],
    '_': ['#97958e', '#a2a099', '#acaaa3', '#b6b4ad', '#c0beb7']
  };
  const PALRGB = {}; for (const k in PAL) PALRGB[k] = PAL[k].map(hexRGB);
  const LEAVES = ['#c9a43a', '#d6862c', '#b85f27', '#e0bd4f'].map(hexRGB);
  const FLOWERS = ['#ece9de', '#e9cf3c', '#f0eee6', '#c9b6d8'].map(hexRGB);
  const PEBBLE = hexRGB('#bdb6a5'), PIT = hexRGB('#58483a'), CRACK = hexRGB('#3d3f41'), SOIL_L = hexRGB('#3a2f26'), SOIL_R = hexRGB('#4b3d31');
  function buildGround() {
    const c = document.createElement('canvas'); c.width = G.w; c.height = G.h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(G.w, G.h), d = img.data;
    // everything low-frequency is worked out once per 8 cm sample; pixels then only look it up and dither
    const FR = 8, FN = GW * FR + 1;
    const TYPES = ['.', ',', ':', '#', '_', 'p'], TI = { '.': 0, ',': 1, ':': 2, '#': 3, '_': 4, p: 5 };
    const fType = new Uint8Array(FN * FN), fTone = new Float32Array(FN * FN), fLeaf = new Float32Array(FN * FN), fPath = new Float32Array(FN * FN);
    const trees = INST.filter((i) => i.type === 'tree' && i.def.kind !== 'bare');
    const segs = [];
    for (const pl of MAP.paths) for (let i = 0; i < pl.length - 1; i++) segs.push([pl[i], pl[i + 1]]);
    const natural = (t) => t === '.' || t === ',' || t === ':';
    for (let j = 0; j < FN; j++) for (let i = 0; i < FN; i++) {
      const x = Math.min(i / FR, GW - 0.001), z = Math.min(j / FR, GH - 0.001), k = j * FN + i;
      let t = groundType(x, z);
      if (natural(t)) {
        const wx = clamp(x + (vnoise(x * 1.4, z * 1.4, 5) - 0.5) * 1.1, 0, GW - 0.01), wz = clamp(z + (vnoise(x * 1.4 + 40, z * 1.4, 6) - 0.5) * 1.1, 0, GH - 0.01);
        const t1 = groundType(wx, wz);
        if (natural(t1)) t = t1;
        let best = 9;
        for (const [a, b] of segs) {
          const ex = b[0] - a[0], ez = b[1] - a[1], u = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez), 0, 1);
          const dx = x - a[0] - ex * u, dz = z - a[1] - ez * u, dd = dx * dx + dz * dz;
          if (dd < best) best = dd;
        }
        const pd = Math.sqrt(best);
        fPath[k] = pd;
        if (pd < 0.34 + (vnoise(x * 2.8, z * 2.8, 7) - 0.5) * 0.3 && t !== ':') t = 'p';
      }
      fType[k] = TI[t];
      fTone[k] = fbm(x * 0.55, z * 0.55, 3);
      let lf = 0;
      for (const tr_ of trees) { const dx = x - tr_.def.at[0], dz = z - tr_.def.at[1], q = 1 - (dx * dx + dz * dz) / 10.24; if (q > lf) lf = q; }
      fLeaf[k] = lf;
    }
    const cL = wpx([0, 0, GH]), cB = wpx([GW, 0, GH]), cR = wpx([GW, 0, 0]);
    const lowEdge = (sx) => sx <= cB[0] ? cL[1] + (sx - cL[0]) * (cB[1] - cL[1]) / (cB[0] - cL[0]) : cB[1] + (sx - cB[0]) * (cR[1] - cB[1]) / (cR[0] - cB[0]);
    const flat = (arr) => Uint8Array.from(arr.flat());
    const PL = flat(PALRGB['.']), PR = flat(PALRGB[',']), PD = flat(PALRGB[':']), PA = flat(PALRGB['#']), PC = flat(PALRGB['_']);
    const LV = flat(LEAVES), FL = flat(FLOWERS);
    const set3 = (i, P, q) => { d[i] = P[q * 3]; d[i + 1] = P[q * 3 + 1]; d[i + 2] = P[q * 3 + 2]; d[i + 3] = 255; };
    // one 32-bit hash per pixel, sliced into several random numbers
    const hi = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + s) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
    const half = HH * GH, FNm = FN - 1;
    for (let py = 0; py < G.h; py++) {
      const sy = py + G.y0 + 0.5;
      const wRow = 2 * Math.min(sy, 2 * half - sy) + 28;
      const p0 = Math.max(0, Math.floor(-wRow - G.x0)), p1 = Math.min(G.w, Math.ceil(wRow - G.x0));
      for (let px = p0; px < p1; px++) {
        const sx = px + G.x0 + 0.5, i = (py * G.w + px) * 4;
        const x = (sx / HW + sy / HH) / 2, z = (sy / HH - sx / HW) / 2;
        if (x < 0 || z < 0 || x >= GW || z >= GH) {
          const s = sy - lowEdge(sx);
          if (s > 0 && s <= 12 && sx > cL[0] && sx < cR[0]) {
            const S_ = sx < cB[0] ? SOIL_L : SOIL_R, lit = s < 1.5 || (hi(px, py, 77) & 255) < 15 ? 1 : 0;
            d[i] = S_[0] + lit * 18; d[i + 1] = S_[1] + lit * 14; d[i + 2] = S_[2] + lit * 10; d[i + 3] = 255;
          }
          continue;
        }
        const H0 = hi(px, py, 1), h = (H0 & 1023) / 1024, ja = ((H0 >>> 10) & 255) / 256 - 0.5, jb = ((H0 >>> 18) & 255) / 256 - 0.5;
        let xi = Math.round((x + ja * 0.13) * FR), zi = Math.round((z + jb * 0.13) * FR);
        xi = xi < 0 ? 0 : xi > FNm ? FNm : xi; zi = zi < 0 ? 0 : zi > FNm ? FNm : zi;
        const k = zi * FN + xi, t = fType[k], tone = fTone[k];
        if (t <= 1) {
          // short vertical strokes: each column is cut into 2–4 px dashes of one tone
          const cH = hi(px, 0, 5), seg = Math.floor((py + (cH & 7)) / (2 + (cH >>> 3 & 1) + (cH >>> 4 & 1))), hs = (hi(px, seg, 6) & 1023) / 1024;
          let q = 2 + Math.floor((tone - 0.5) * 2.8 + (hs - 0.5) * 1.8 + 0.5);
          if (h < 0.06) q -= 1; else if (h > 0.97) q += 1;
          set3(i, t === 0 ? PL : PR, q < 0 ? 0 : q > 4 ? 4 : q);
          const lf = fLeaf[k];
          if (lf > 0) { const hl = hi(px >> 1, py, 9); if ((hl & 1023) < lf * 31) set3(i, LV, (hl >>> 12) & 3); }
          if (t === 0 && tone > 0.45) { const hf = hi(px >> 1, py >> 1, 11); if ((hf & 4095) < 16) set3(i, FL, (hf >>> 14) & 3); }
        } else if (t === 2 || t === 5) {
          let q = tone < 0.45 ? 2 : 3;
          if (h < 0.2) q -= 1; else if (h > 0.88) q += 1;
          set3(i, PD, q < 0 ? 0 : q > 4 ? 4 : q);
          const h2 = hi(px, py, 13), r2 = (h2 & 1023) / 1024;
          if (r2 < 0.025) { d[i] = PEBBLE[0]; d[i + 1] = PEBBLE[1]; d[i + 2] = PEBBLE[2]; }
          else if (r2 > 0.98) { d[i] = PIT[0]; d[i + 1] = PIT[1]; d[i + 2] = PIT[2]; }
          const r3 = ((h2 >>> 10) & 1023) / 1024;
          if (t === 5 && fPath[k] > 0.22 && r3 < 0.35) set3(i, PL, 1 + ((h2 >>> 20) % 3));
          else if (t === 2 && r3 < 0.05) set3(i, PR, 2);
        } else if (t === 3) {
          let q = 2 + (h < 0.25 ? -1 : h > 0.85 ? 1 : 0) + (tone > 0.62 ? 1 : 0);
          if (((H0 >>> 26) & 63) === 0) q = 4;
          set3(i, PA, q > 4 ? 4 : q);
        } else {
          const q = 2 + (h < 0.25 ? -1 : h > 0.88 ? 1 : 0);
          set3(i, PC, (Math.abs(x - Math.round(x)) < 0.02 || Math.abs(z - Math.round(z)) < 0.02) ? 0 : q);
        }
      }
    }
    // asphalt cracks: short random walks
    const R = rng(91);
    for (let n = 0; n < 70; n++) {
      const x = 2 + R() * 2, z = 7 + R() * 23;
      let [sx, sy] = wpx([x, 0, z]);
      let dx = R() < 0.5 ? 1 : -1;
      for (let s = 0; s < 6 + R() * 14; s++) {
        const px = Math.round(sx - G.x0), py = Math.round(sy - G.y0);
        const [gx, gz] = groundAt(sx, sy);
        if (groundType(gx, gz) !== '#') break;
        const ci = (py * G.w + px) * 4; d[ci] = CRACK[0]; d[ci + 1] = CRACK[1]; d[ci + 2] = CRACK[2]; d[ci + 3] = 255;
        sx += dx; sy += R() < 0.5 ? 1 : 0; if (R() < 0.2) dx = -dx;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

