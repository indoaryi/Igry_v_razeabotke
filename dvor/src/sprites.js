/* Procedural pixel sprites: people, dogs, pram, pigeons, umbrellas and small effects.
   Everything is painted into a tiny pixel buffer, then shaded and outlined like hand pixel art. */
const SPR = (() => {
  const hex = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mul = (c, k) => [Math.max(0, Math.min(255, c[0] * k)), Math.max(0, Math.min(255, c[1] * k)), Math.max(0, Math.min(255, c[2] * k))];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  let PARTSEQ = 1;
  const newPart = () => (PARTSEQ = (PARTSEQ % 30000) + 1);

  class Pix {
    constructor(w, h) { this.w = w; this.h = h; this.col = new Array(w * h).fill(null); this.part = new Int32Array(w * h); this.flat = new Uint8Array(w * h); }
    put(x, y, c, part, flat) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x; this.col[i] = c; this.part[i] = part; this.flat[i] = flat ? 1 : 0;
    }
    ellipse(cx, cy, rx, ry, c, part, flat, clip) {
      const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!clip || clip(x + 0.5, y + 0.5))) this.put(x, y, c, part, flat);
      }
    }
    capsule(ax, ay, bx, by, r, c, part, flat) {
      const x0 = Math.floor(Math.min(ax, bx) - r - 1), x1 = Math.ceil(Math.max(ax, bx) + r + 1);
      const y0 = Math.floor(Math.min(ay, by) - r - 1), y1 = Math.ceil(Math.max(ay, by) + r + 1);
      const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1e-6;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - ax, py = y + 0.5 - ay;
        let t = (px * vx + py * vy) / L2; t = Math.max(0, Math.min(1, t));
        const dx = px - vx * t, dy = py - vy * t;
        if (dx * dx + dy * dy <= r * r) this.put(x, y, c, part, flat);
      }
    }
    poly(pts, c, part, flat) {
      let y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2)
          for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.put(x, y, c, part, flat);
      }
    }
    rect(x, y, w, h, c, part, flat) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(Math.round(x) + i, Math.round(y) + j, c, part, flat); }
    dot(x, y, c, part, flat = 1) { this.put(Math.floor(x), Math.floor(y), c, part, flat); }
    line(ax, ay, bx, by, c, part, flat = 1) {
      let x0 = Math.round(ax), y0 = Math.round(ay); const x1 = Math.round(bx), y1 = Math.round(by);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) { this.put(x0, y0, c, part, flat); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    }
    /* light from upper left: highlight left/top edges of each part, shade right/bottom */
    shade(strength = 1) {
      const { w, h, col, part, flat } = this, out = col.slice();
      const same = (i, p) => col[i] && part[i] === p;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, c = col[i]; if (!c || flat[i]) continue;
        const p = part[i];
        const L = x > 0 && same(i - 1, p) ? 0 : 1, R = x < w - 1 && same(i + 1, p) ? 0 : 1;
        const U = y > 0 && same(i - w, p) ? 0 : 1, D = y < h - 1 && same(i + w, p) ? 0 : 1;
        const R2 = x < w - 2 && same(i + 2, p) ? 0 : 1;
        const k = 1 + strength * (0.15 * L + 0.09 * U - 0.2 * R - 0.07 * R2 * (1 - R) - 0.1 * D);
        out[i] = mul(c, k);
      }
      this.col = out;
    }
    outline(c = [16, 12, 15], a = 225) {
      const { w, h, col } = this; this.ol = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (col[i]) continue;
        if ((x > 0 && col[i - 1]) || (x < w - 1 && col[i + 1]) || (y > 0 && col[i - w]) || (y < h - 1 && col[i + w])) this.ol[i] = 1;
      }
      this.olc = c; this.ola = a;
    }
    blit(ctx, ox, oy) {
      const img = ctx.createImageData(this.w, this.h), d = img.data;
      for (let i = 0; i < this.w * this.h; i++) {
        const c = this.col[i];
        if (c) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
        else if (this.ol && this.ol[i]) { d[i * 4] = this.olc[0]; d[i * 4 + 1] = this.olc[1]; d[i * 4 + 2] = this.olc[2]; d[i * 4 + 3] = this.ola; }
      }
      ctx.putImageData(img, ox, oy);
    }
  }

  /* ------------------------------------------------------------------ people */
  const FW = 30, FH = 54, FOOT = 51; // frame size and ground line
  const WALK = 8, IDLE = 2, COLS = WALK + IDLE;

  function person(spec) {
    const S = Object.assign({ h: 46, w: 1, coatLen: 'mid', hairStyle: 'short', run: false }, spec);
    const C = {};
    for (const k of ['skin', 'hair', 'coat', 'coat2', 'pants', 'shoes', 'scarf', 'hat', 'beard', 'trim'])
      if (S[k]) C[k] = hex(S[k]);
    C.coat2 = C.coat2 || mul(C.coat, 0.78);
    C.sleeve = mul(C.coat, 0.9);
    const canvas = document.createElement('canvas'); canvas.width = FW * COLS; canvas.height = FH * 3;
    const ctx = canvas.getContext('2d');
    const anchors = {};
    ['front', 'side', 'back'].forEach((view, row) => {
      for (let f = 0; f < COLS; f++) {
        const walking = f < WALK;
        const ph = walking ? f / WALK : (f - WALK) / IDLE;
        const P = new Pix(FW, FH);
        const a = drawPerson(P, S, C, view, ph, walking);
        P.shade(); P.outline();
        P.blit(ctx, f * FW, row * FH);
        anchors[view + f] = a;
      }
    });
    return { canvas, fw: FW, fh: FH, foot: FOOT, cols: COLS, walk: WALK, idle: IDLE, anchors, h: S.h };
  }

  function drawPerson(P, S, C, view, ph, walking) {
    const cx = 15, u = S.h / 46, hu = Math.pow(u, 0.45), sw = S.w;
    const top = FOOT - S.h;
    const s = walking ? Math.sin(ph * Math.PI * 2) : 0;
    const run = S.run ? 1.5 : 1;
    const breathe = !walking && ph >= 0.5 ? 1 : 0;
    const anc = {};
    const far = c => mul(c, 0.74);
    const pid = {};
    const part = n => pid[n] || (pid[n] = newPart());

    if (view === 'side') {
      // legs from the hip, then lift the whole body so the lowest foot touches the ground
      const thigh = 9.4 * u, shin = 9.4 * u;
      const legAt = (phase) => {
        const sa = Math.sin(phase * Math.PI * 2), ca = Math.cos(phase * Math.PI * 2);
        const A = walking ? 0.5 * run * sa : 0;
        const bend = walking ? Math.max(0, ca) * 0.75 * run : 0;
        return { A, bend };
      };
      const hip0 = { x: cx - 0.4, y: top + 26 * u };
      const legs = [legAt(ph + 0.5), legAt(ph)].map(L => {
        const knee = { x: hip0.x + Math.sin(L.A) * thigh, y: hip0.y + Math.cos(L.A) * thigh };
        const ank = { x: knee.x + Math.sin(L.A - L.bend) * shin, y: knee.y + Math.cos(L.A - L.bend) * shin };
        return { knee, ank };
      });
      const lowest = Math.max(legs[0].ank.y, legs[1].ank.y);
      const dy = Math.round(FOOT - 2.2 - lowest) + (walking ? 0 : breathe * 0);
      const Y = v => v + dy;
      const shoulderY = Y(top + 11 * u) + breathe * 0.5;
      const waistY = Y(top + 22 * u), hemY = Y(top + (S.coatLen === 'long' ? 33 : S.coatLen === 'short' ? 27 : 29.5) * u);
      const lean = walking ? 0.6 * run : 0;
      const headCx = cx + 0.9 + lean, headCy = Y(top + 4.6 * hu) + breathe * 0.5, rx = 3.5 * hu, ry = 4.3 * hu;
      // far arm
      const arm = (sign, col, pn) => {
        const ang = walking ? -sign * 0.5 * run * s : 0.05;
        const sh = { x: cx + 0.3 + lean * 0.6, y: shoulderY + 1.6 };
        const el = { x: sh.x + Math.sin(ang) * 6 * u, y: sh.y + Math.cos(ang) * 6 * u };
        const fa = ang + 0.3 + (walking ? 0.15 : 0);
        const hd = { x: el.x + Math.sin(fa) * 5.6 * u, y: el.y + Math.cos(fa) * 5.6 * u };
        P.capsule(sh.x, sh.y, el.x, el.y, 1.6 * u * sw, col, part(pn));
        P.capsule(el.x, el.y, hd.x, hd.y, 1.45 * u * sw, col, part(pn));
        P.ellipse(hd.x, hd.y + 0.6, 1.25, 1.25, C.skin, part(pn + 'h'));
        return hd;
      };
      anc.hand2 = arm(-1, far(C.sleeve), 'armF');
      // legs: far then near
      [[legs[0], far(C.pants), far(C.shoes), 'legF'], [legs[1], C.pants, C.shoes, 'legN']].forEach(([L, pc, sc, pn]) => {
        const hip = { x: hip0.x, y: Y(hip0.y) }, kn = { x: L.knee.x, y: Y(L.knee.y) }, an = { x: L.ank.x, y: Y(L.ank.y) };
        P.capsule(hip.x, hip.y, kn.x, kn.y, 2.0 * u * sw, pc, part(pn));
        P.capsule(kn.x, kn.y, an.x, an.y, 1.75 * u * sw, pc, part(pn));
        P.ellipse(an.x + 1.3, an.y + 0.9, 2.5 * u, 1.25, sc, part(pn + 's'));
      });
      // coat
      const bw = 3.7 * u * sw;
      P.poly([[cx - bw + lean * 0.5, shoulderY], [cx + bw * 0.95 + lean, shoulderY], [cx + bw * 0.9 + lean * 0.5, waistY],
        [cx + bw * 1.08 + (S.coatLen === 'long' ? 0.8 : 0), hemY], [cx - bw * 1.05 - (S.coatLen === 'long' ? 0.8 : 0), hemY], [cx - bw * 0.95, waistY]], C.coat, part('coat'));
      P.ellipse(cx + lean * 0.5, shoulderY + 1, bw * 0.95, 2.2, C.coat, part('coat'));
      if (S.hood && !S.hoodUp) P.ellipse(cx - 2.6, shoulderY - 0.2, 2.6, 2.3, C.coat2, part('hood'));
      if (C.scarf) { P.rect(cx - 1 + lean, shoulderY - 1, 4, 2, C.scarf, part('scarf')); }
      // hem shading line
      P.line(cx - bw, hemY - 1, cx + bw, hemY - 1, mul(C.coat, 0.8), part('coat'), 1);
      // head
      P.rect(Math.round(headCx - 1.5), Math.round(headCy + ry - 1.5), 3, 2, mul(C.skin, 0.85), part('neck'));
      drawHeadSide(P, S, C, headCx, headCy, rx, ry, part);
      anc.headTop = { x: headCx, y: headCy - ry - (S.hairStyle === 'pompom' ? 2 : 0) };
      // near arm on top
      anc.hand = arm(1, C.sleeve, 'armN');
      anc.feet = { x: cx, y: FOOT };
      return anc;
    }

    // ---- front / back
    const bob = walking ? -Math.round(Math.abs(s) * (S.run ? 1.6 : 1)) : 0;
    const Y = v => v + bob;
    const shoulderY = Y(top + 11 * u) + breathe * 0.5;
    const waistY = Y(top + 22 * u), hipY = Y(top + 25.5 * u);
    const hemY = Y(top + (S.coatLen === 'long' ? 33 : S.coatLen === 'short' ? 27 : 29.5) * u);
    const headCx = cx - 0.3, headCy = Y(top + 4.6 * hu) + breathe * 0.5, rx = 3.6 * hu, ry = 4.3 * hu;
    const legX = 2.5 * u * sw;
    const liftL = walking ? Math.max(0, s) * 2.4 * run : 0, liftR = walking ? Math.max(0, -s) * 2.4 * run : 0;
    const back = view === 'back';
    // legs
    [[-1, liftL, 'legL'], [1, liftR, 'legR']].forEach(([sg, lift, pn]) => {
      const hx = cx + sg * legX - 0.3, fy = FOOT - 2.4 - lift;
      P.capsule(hx, hipY, hx + sg * 0.2, fy, 1.95 * u * sw, lift > 0.6 ? mul(C.pants, 0.9) : C.pants, part(pn));
      P.ellipse(hx + sg * 0.3, fy + 1.1, 2.2 * u, 1.3, C.shoes, part(pn + 's'));
    });
    // hood lump behind the neck (front view: visible as collar)
    if (S.hood && !S.hoodUp) P.ellipse(cx - 0.3, shoulderY - 0.4, 4.8 * u, 2.2, C.coat2, part('hood'));
    // coat
    const bw = 6.0 * u * sw, flare = S.coatLen === 'long' ? 0.9 : 0.4;
    P.poly([[cx - bw, shoulderY + 0.5], [cx + bw - 0.6, shoulderY + 0.5], [cx + bw - 1.2, waistY], [cx + bw - 0.6 + flare, hemY],
      [cx - bw + 0.2 - flare, hemY], [cx - bw + 0.8, waistY]], C.coat, part('coat'));
    P.ellipse(cx - 0.3, shoulderY + 1.2, bw - 0.4, 2.4, C.coat, part('coat'));
    if (!back) {
      P.line(cx - 0.3, shoulderY + 2, cx - 0.3, hemY - 1, mul(C.coat, 0.72), part('coat'), 1);       // zip / buttons
      if (S.coatLen !== 'short') { P.dot(cx - 3.2, waistY + 3, mul(C.coat, 0.7), part('coat')); P.dot(cx + 2.6, waistY + 3, mul(C.coat, 0.7), part('coat')); }
    } else {
      P.line(cx - 0.3, waistY + 1, cx - 0.3, hemY - 1, mul(C.coat, 0.82), part('coat'), 1);
    }
    P.line(cx - bw + 0.5, hemY - 1, cx + bw - 1, hemY - 1, mul(C.coat, 0.82), part('coat'), 1);
    if (C.scarf && !back) { P.rect(cx - 3.3, shoulderY - 0.6, 6, 2, C.scarf, part('scarf')); P.rect(cx + 0.7, shoulderY + 1, 2, 5, mul(C.scarf, 0.9), part('scarf2')); }
    // arms
    const armY = shoulderY + 1.5;
    [[-1, 'armL'], [1, 'armR']].forEach(([sg, pn]) => {
      const sx = cx - 0.3 + sg * (bw - 0.6);
      const swing = walking ? -sg * s * 1.6 * run : 0;
      const hx = sx + sg * 0.6, hy = Y(top + 23.5 * u) + swing + breathe * 0.4;
      P.capsule(sx, armY, hx, hy, 1.55 * u * sw, C.sleeve, part(pn));
      P.ellipse(hx, hy + 1.1, 1.3, 1.3, C.skin, part(pn + 'h'));
      anc[sg < 0 ? 'hand2' : 'hand'] = { x: hx, y: hy + 1.2 };
    });
    // head
    P.rect(Math.round(headCx - 1.5), Math.round(headCy + ry - 1.5), 3, 2, mul(C.skin, 0.85), part('neck'));
    drawHeadFront(P, S, C, headCx, headCy, rx, ry, back, part);
    anc.headTop = { x: headCx, y: headCy - ry - (S.hairStyle === 'pompom' ? 2 : 0) };
    anc.feet = { x: cx, y: FOOT };
    return anc;
  }

  function drawHeadFront(P, S, C, x, y, rx, ry, back, part) {
    const hs = S.hairStyle, H = C.hair, sk = C.skin;
    if (S.hoodUp) {
      P.ellipse(x, y - 0.2, rx + 1.4, ry + 1.2, C.coat, part('hoodup'));
      if (!back) {
        if (C.trim) P.ellipse(x, y + 0.8, rx - 0.2, ry - 0.6, C.trim, part('trim'));
        P.ellipse(x, y + 1.0, rx - 1.0, ry - 1.4, sk, part('face'));
        if (C.beard) P.ellipse(x, y + 2.6, rx - 1.1, 1.5, C.beard, part('beard'));
        P.dot(x - 1.6, y + 0.4, [26, 18, 18]); P.dot(x + 1.0, y + 0.4, [26, 18, 18]);
      }
      return;
    }
    if (hs === 'pony' || hs === 'longw') P.ellipse(x, y + 2.4, rx + 0.9, ry + 1.8, mul(H, 0.9), part('hairback'));
    if (hs === 'kerchief') {
      P.ellipse(x, y - 0.2, rx + 1.0, ry + 0.8, C.hat, part('kerchief'));
      if (!back) { P.ellipse(x, y + 0.9, rx - 0.9, ry - 1.3, sk, part('face')); P.rect(x - 1, y + ry + 0.4, 3, 2, mul(C.hat, 0.8), part('knot')); }
      if (!back) { P.dot(x - 1.6, y + 0.6, [30, 20, 20]); P.dot(x + 1.0, y + 0.6, [30, 20, 20]); }
      return;
    }
    P.ellipse(x, y, rx, ry, back ? mul(sk, 0.85) : sk, part('head'));
    if (back) {
      // back of the head is mostly hair or hat
      P.ellipse(x, y - 0.2, rx + 0.3, ry * (hs === 'bald' ? 0.4 : 0.98), H, part('hair'), 0, (px, py) => py < y + ry * (hs === 'long' || hs === 'pony' || hs === 'longw' ? 1.2 : 0.55));
      if (hs === 'long' || hs === 'longw') P.rect(x - rx + 0.5, y + 1, Math.round(rx * 2 - 1), 4, H, part('hair'));
      if (hs === 'pony') P.capsule(x, y + 1, x + 0.3, y + 6.5, 1.3, mul(H, 0.85), part('tail'));
    } else {
      const capY = hs === 'long' ? 0.9 : hs === 'short' ? 1.3 : 1.1;
      P.ellipse(x, y - 1.0, rx + 0.4, ry * 0.8, H, part('hair'), 0, (px, py) => py < y - capY);
      if (hs === 'long' || hs === 'longw' || hs === 'pony') {
        P.rect(Math.floor(x - rx - 0.2), Math.floor(y - 1.5), 2, hs === 'long' ? 5 : 7, H, part('hair'));
        P.rect(Math.ceil(x + rx - 1.8), Math.floor(y - 1.5), 2, hs === 'long' ? 5 : 7, H, part('hair'));
      }
      P.dot(x - 1.6, y + 0.3, [24, 16, 16]); P.dot(x + 1.0, y + 0.3, [24, 16, 16]);
      if (C.beard) { P.ellipse(x - 0.2, y + 2.7, rx - 0.6, 1.8, C.beard, part('beard')); P.line(x - 1.4, y + 1.6, x + 0.8, y + 1.6, mul(C.beard, 0.9), part('beard')); }
      else P.dot(x - 0.3, y + 2.4, mul(sk, 0.72));
    }
    if (hs === 'cap' || hs === 'pompom') {
      P.ellipse(x, y - 1.4, rx + 0.6, ry * 0.78, C.hat, part('cap'), 0, (px, py) => py < y - 0.7);
      P.line(x - rx, y - 1.0, x + rx - 0.4, y - 1.0, mul(C.hat, 0.78), part('cap'));
      if (hs === 'pompom') P.ellipse(x, y - ry - 1.2, 1.6, 1.5, mix(C.hat, [240, 235, 225], 0.6), part('pom'));
    }
  }

  function drawHeadSide(P, S, C, x, y, rx, ry, part) {
    const hs = S.hairStyle, H = C.hair, sk = C.skin;
    if (S.hoodUp) {
      P.ellipse(x - 0.4, y - 0.2, rx + 1.3, ry + 1.2, C.coat, part('hoodup'));
      if (C.trim) P.ellipse(x + 1.6, y + 0.8, 2.6, ry - 0.5, C.trim, part('trim'));
      P.ellipse(x + 2.0, y + 1.0, 2.0, ry - 1.4, sk, part('face'));
      P.dot(x + 3.8, y + 1.2, sk, part('face'));
      if (C.beard) P.ellipse(x + 2.2, y + 2.5, 1.8, 1.4, C.beard, part('beard'));
      P.dot(x + 2.4, y + 0.2, [26, 18, 18]);
      return;
    }
    if (hs === 'pony') P.capsule(x - rx + 0.4, y - 0.5, x - rx - 1.6, y + 4.5, 1.4, mul(H, 0.85), part('tail'));
    if (hs === 'longw') P.ellipse(x - 1.4, y + 2.4, rx, ry + 1.6, mul(H, 0.9), part('hairback'));
    if (hs === 'kerchief') {
      P.ellipse(x - 0.3, y - 0.2, rx + 1.0, ry + 0.8, C.hat, part('kerchief'));
      P.ellipse(x + 1.8, y + 0.9, 2.1, ry - 1.4, sk, part('face'));
      P.dot(x + 2.6, y + 0.4, [30, 20, 20]);
      return;
    }
    P.ellipse(x, y, rx, ry, sk, part('head'));
    P.dot(x + rx + 0.2, y + 1.0, sk, part('head'));                       // nose
    P.ellipse(x - 0.6, y - 0.6, rx + 0.3, ry * 0.9, H, part('hair'), 0,
      (px, py) => py < y - 1.2 || px < x - 0.2 - (py - y) * 0.15);
    if (hs === 'long') P.rect(Math.floor(x - rx - 0.3), Math.floor(y - 1), 3, 6, H, part('hair'));
    P.dot(x + 1.9, y + 0.2, [24, 16, 16]);
    if (C.beard) P.ellipse(x + 1.3, y + 2.6, 2.4, 1.7, C.beard, part('beard'), 0, (px) => px > x - 0.6);
    if (hs === 'cap' || hs === 'pompom') {
      P.ellipse(x - 0.4, y - 1.4, rx + 0.6, ry * 0.78, C.hat, part('cap'), 0, (px, py) => py < y - 0.6);
      if (hs === 'pompom') P.ellipse(x - 0.6, y - ry - 1.2, 1.6, 1.5, mix(C.hat, [240, 235, 225], 0.6), part('pom'));
    }
  }

  /* ------------------------------------------------------------------ dog */
  function dog(spec) {
    const S = Object.assign({ fur: '#6b4a2f', belly: '#9a7a5a', size: 1 }, spec);
    const fur = hex(S.fur), belly = hex(S.belly), dark = mul(fur, 0.6);
    const W = 22, Hh = 16, N = 6, cols = N + 2;
    const canvas = document.createElement('canvas'); canvas.width = W * cols; canvas.height = Hh * 3;
    const ctx = canvas.getContext('2d');
    ['front', 'side', 'back'].forEach((view, row) => {
      for (let f = 0; f < cols; f++) {
        const walking = f < N, ph = walking ? f / N : (f - N) / 2;
        const P = new Pix(W, Hh), s = Math.sin(ph * Math.PI * 2), z = S.size;
        const pp = newPart(), pl = newPart(), ph2 = newPart(), pt = newPart();
        if (view === 'side') {
          const legs = [[6, 0], [7.5, 0.5], [13, 0.5], [14.5, 0]];
          legs.forEach(([lx, o], k) => {
            const sw = walking ? Math.sin((ph + o) * Math.PI * 2) * 1.6 : 0;
            P.capsule(lx, 9.5, lx + sw, 13.4, 0.75, k % 2 ? mul(fur, 0.75) : mul(fur, 0.9), newPart());
          });
          P.ellipse(10.5, 8.2, 5.6 * z, 2.9 * z, fur, pp);
          P.ellipse(11.5, 9.6, 3.6 * z, 1.2, belly, newPart(), 1);
          const wag = walking ? 0 : (ph < 0.5 ? -1 : 1);
          P.capsule(5.3, 7.4, 2.6, 4.6 + wag, 0.8, fur, pt);
          P.ellipse(16.8, 5.8, 2.7 * z, 2.4 * z, fur, ph2);
          P.rect(18.6, 6.2, 2, 1.6, mul(fur, 0.85), ph2);
          P.dot(20.5, 6.4, [20, 14, 12]); P.dot(17.4, 4.9, [20, 14, 12]);
          P.rect(15.2, 3.8, 2, 2, dark, newPart());
        } else {
          const back = view === 'back';
          const sw = walking ? s * 1.2 : 0;
          P.capsule(9, 9.5, 9 + sw * 0.2, 13.4 - Math.max(0, s), 0.8, mul(fur, 0.85), pl);
          P.capsule(13, 9.5, 13 - sw * 0.2, 13.4 - Math.max(0, -s), 0.8, mul(fur, 0.85), newPart());
          P.ellipse(11, 8.5, 3.6 * z, 3.2 * z, fur, pp);
          if (back) { P.capsule(11, 7, 11 + (walking ? 0 : (ph < 0.5 ? -1.5 : 1.5)), 3.5, 0.8, fur, pt); }
          else {
            P.ellipse(11, 4.6, 2.8 * z, 2.5 * z, fur, ph2);
            P.ellipse(11, 6, 1.4, 1, mul(fur, 0.85), ph2);
            P.dot(11, 5.9, [20, 14, 12]); P.dot(9.8, 4.2, [20, 14, 12]); P.dot(12.2, 4.2, [20, 14, 12]);
            P.rect(8, 2.6, 1, 2, dark, newPart()); P.rect(13, 2.6, 1, 2, dark, newPart());
          }
        }
        P.shade(0.8); P.outline();
        P.blit(ctx, f * W, row * Hh);
      }
    });
    return { canvas, fw: W, fh: Hh, foot: 14, cols, walk: N, idle: 2 };
  }

  /* ------------------------------------------------------------------ pram */
  function pram() {
    const W = 24, Hh = 20, cols = 2;
    const body = hex('#3c475b'), hood = hex('#2b3241'), metal = hex('#1c1e23'), hub = hex('#7d8794');
    const canvas = document.createElement('canvas'); canvas.width = W * cols; canvas.height = Hh * 3;
    const ctx = canvas.getContext('2d');
    ['front', 'side', 'back'].forEach((view, row) => {
      for (let f = 0; f < cols; f++) {
        const P = new Pix(W, Hh);
        if (view === 'side') {
          P.line(6, 12, 5, 16, metal, newPart()); P.line(14, 12, 15, 16, metal, newPart());
          P.line(15, 8, 21, 2, metal, newPart()); P.line(20, 2, 22, 2, metal, newPart());
          P.poly([[3, 6.5], [16.5, 6.5], [16, 10], [13.5, 12.5], [6, 12.5], [3.5, 10.5]], body, newPart());
          P.ellipse(8.5, 7, 6, 5, hood, newPart(), 0, (px, py) => py < 7.2);
          P.line(5, 5, 8.5, 2.3, mul(hood, 0.75), newPart()); P.line(11, 2.6, 13.6, 5.5, mul(hood, 0.75), newPart());
          P.rect(14, 6, 2, 1, [18, 18, 22], newPart(), 1);
          P.line(4, 9.5, 15.5, 9.5, mul(body, 1.25), newPart());
          [[5, 16.5], [15, 16.5]].forEach(([wx, wy]) => {
            P.ellipse(wx, wy, 2.6, 2.6, metal, newPart());
            P.dot(wx - 0.5 + (f ? 1 : 0), wy - 0.5 + (f ? 0 : 1), hub);
          });
        } else {
          const back = view === 'back';
          [[7, 16.5], [16, 16.5]].forEach(([wx, wy]) => P.ellipse(wx, wy, 1.6, 2.4, metal, newPart()));
          P.ellipse(11.5, 10, 6, 4.4, body, newPart());
          P.ellipse(11.5, 7, 6, 4.5, hood, newPart(), 0, (px, py) => py < 8);
          if (!back) P.ellipse(11.5, 8.6, 3.2, 2, [20, 20, 25], newPart(), 1);
          else P.line(5, 3.5, 18, 3.5, metal, newPart());
          P.line(6, 11.5, 17, 11.5, mul(body, 1.25), newPart());
        }
        P.shade(0.8); P.outline();
        P.blit(ctx, f * W, row * Hh);
      }
    });
    return { canvas, fw: W, fh: Hh, foot: 19, cols };
  }

  /* ------------------------------------------------------------------ pigeon */
  function pigeon(variant = 0) {
    const W = 15, Hh = 11;
    const names = ['idle', 'peck', 'walk1', 'walk2', 'fly1', 'fly2', 'fly3', 'sleep'];
    const tones = [['#6f7687', '#5c6272'], ['#7d818c', '#646873'], ['#555966', '#444853'], ['#8a8078', '#6c635c']][variant % 4];
    const body = hex(tones[0]), wing = hex(tones[1]), bar = hex('#3e424c'), tail = hex('#4b505b'),
      head = mul(body, 0.92), neck1 = hex('#5e7d6d'), neck2 = hex('#7b6082'), beak = hex('#cbbfb4'), eye = hex('#d8582e'), feet = hex('#c27a7a');
    const canvas = document.createElement('canvas'); canvas.width = W * names.length; canvas.height = Hh;
    const ctx = canvas.getContext('2d');
    names.forEach((n, f) => {
      const P = new Pix(W, Hh), pb = newPart(), pw = newPart(), phd = newPart();
      const fly = n.startsWith('fly');
      const by = fly ? 5 : 6;
      if (!fly) {
        const st = n === 'walk1' ? 1 : 0;
        P.dot(6 + st, 9, feet); P.dot(7 - st, 9, feet); P.dot(6 + st, 8, mul(feet, 0.8)); P.dot(7 - st, 8, mul(feet, 0.8));
      }
      P.poly([[1, by - 0.6], [4, by - 1], [4, by + 1], [0.5, by + 0.8]], tail, newPart());
      P.ellipse(6.4, by, 4.0, n === 'sleep' ? 2.7 : 2.3, body, pb);
      if (!fly) {
        P.ellipse(5.8, by - 0.6, 2.8, 1.5, wing, pw);
        P.dot(5, by - 0.2, bar); P.dot(6.5, by - 0.2, bar);
      }
      let hx = 9.6, hy = by - 2.8;
      if (n === 'peck') { hx = 10.4; hy = by + 1.5; }
      if (n === 'walk1') hx += 0.8;
      if (n === 'sleep') { hx = 8.6; hy = by - 1.6; }
      if (fly) { hx = 10.6; hy = by - 1.2; }
      P.capsule(8.2, by - 1, hx - 0.6, hy + 0.6, 1.2, neck1, newPart());
      P.dot(hx - 1.2, hy + 1.2, neck2);
      P.ellipse(hx, hy, 1.7, 1.5, head, phd);
      if (n !== 'sleep') { P.dot(hx + 1.6, hy + 0.3, beak); P.dot(hx + 0.4, hy - 0.4, eye); }
      if (fly) {
        const w = n === 'fly1' ? [[4, by - 1], [2, by - 5.5], [8.5, by - 4.8], [8, by - 1]]
          : n === 'fly2' ? [[3.5, by - 0.5], [0.5, by - 1.5], [11, by - 1.6], [8.5, by - 0.5]]
            : [[4, by + 0.4], [2.5, by + 4.6], [8, by + 4.2], [8, by + 0.6]];
        P.poly(w, wing, pw);
        P.line(w[1][0], w[1][1], w[2][0], w[2][1], bar, newPart());
      }
      P.shade(0.7); P.outline([20, 18, 22], 200);
      P.blit(ctx, f * W, 0);
    });
    return { canvas, fw: W, fh: Hh, names };
  }

  /* ------------------------------------------------------------------ props & fx */
  function umbrella(color) {
    const W = 32, Hh = 16, c = hex(color), dark = mul(c, 0.62);
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = Hh;
    const P = new Pix(W, Hh), p = newPart();
    P.ellipse(16, 10, 14, 8, c, p, 0, (px, py) => py < 10.4);
    for (let x = 3; x < 30; x += 4) P.dot(x, 10, dark, p);
    [[16, 2.5, 5, 10], [16, 2.5, 11.5, 10.2], [16, 2.5, 20.5, 10.2], [16, 2.5, 27, 10]].forEach(l => P.line(l[0], l[1], l[2], l[3], dark, newPart()));
    P.dot(16, 1, [30, 28, 30]); P.line(16, 10, 16, 15, [30, 28, 30], newPart());
    P.shade(0.9); P.outline([16, 14, 16], 170);
    P.blit(canvas.getContext('2d'), 0, 0);
    return canvas;
  }

  function bag(kind) {
    const canvas = document.createElement('canvas'); canvas.width = 9; canvas.height = 10;
    const P = new Pix(9, 10);
    if (kind === 'avoska') {
      P.line(3, 0, 2, 3, [60, 50, 40], newPart()); P.line(5, 0, 6, 3, [60, 50, 40], newPart());
      const net = [150, 130, 90];
      P.ellipse(4.5, 6, 3.6, 3.4, net, newPart());
      P.dot(3, 5, [230, 130, 30]); P.dot(5, 6, [230, 130, 30]); P.dot(4, 7, [210, 110, 20]); P.dot(6, 5, [230, 140, 40]);
    } else {
      P.line(3, 0, 3, 2, [200, 200, 200], newPart()); P.line(5, 0, 5, 2, [200, 200, 200], newPart());
      P.poly([[1.5, 2], [7.5, 2], [8, 9], [1, 9]], kind === 'blue' ? [70, 90, 150] : [210, 208, 200], newPart());
      P.dot(3, 5, kind === 'blue' ? [40, 50, 90] : [170, 40, 40]);
    }
    P.shade(); P.outline([16, 14, 16], 170);
    P.blit(canvas.getContext('2d'), 0, 0);
    return canvas;
  }

  function softDot(size, inner = 0) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), r = size / 2;
    const grad = g.createRadialGradient(r, r, r * inner, r, r, r);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.12)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    return c;
  }
  function puff(size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.6, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, size, size); return c;
  }
  function shadow() {
    const c = document.createElement('canvas'); c.width = 32; c.height = 12;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(16, 6, 0, 16, 6, 16);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)'); grad.addColorStop(0.6, 'rgba(0,0,0,0.35)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(1, 0, 0, 0.375, 0, 0); g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
    return c;
  }
  function drop() {
    const c = document.createElement('canvas'); c.width = 2; c.height = 14;
    const g = c.getContext('2d'); const grad = g.createLinearGradient(0, 0, 0, 14);
    grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(255,255,255,0.95)');
    g.fillStyle = grad; g.fillRect(0, 0, 1, 14); return c;
  }
  function ripple() {
    const c = document.createElement('canvas'); c.width = 24; c.height = 10;
    const g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(12, 5, 10.5, 3.6, 0, 0, Math.PI * 2); g.stroke(); return c;
  }
  function leaves() {
    const cols = ['#c98a2b', '#b5651d', '#8f4c1c', '#d9a842', '#a8562a'];
    const c = document.createElement('canvas'); c.width = 5 * cols.length; c.height = 4;
    const g = c.getContext('2d');
    cols.forEach((col, i) => {
      g.fillStyle = col; g.fillRect(i * 5 + 1, 1, 3, 2); g.fillRect(i * 5 + 2, 0, 1, 1);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(i * 5 + 3, 2, 1, 1);
    });
    return { canvas: c, n: cols.length, fw: 5, fh: 4 };
  }

  return { person, dog, pram, pigeon, umbrella, bag, softDot, puff, shadow, drop, ripple, leaves, hex };
})();
