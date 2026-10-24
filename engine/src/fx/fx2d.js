  // ================= 2D effects (in world art pixels) =================
  const smokeP = [], fx = [], hits = [], leavesP = [];
  // screen shake in art pixels: heavy footfalls, engines starting
  let shakeT = 0, shakeA = 0;
  function shake(a, t) { shakeA = Math.max(shakeA, a); shakeT = Math.max(shakeT, t); }
  function shakeNow(axis = 0) { if (shakeT <= 0 || reduceMotion) return 0; return (hash2(Math.floor(performance.now() / 45), axis, 7) - 0.5) * 2 * shakeA; }
  let wispT = 0, puffT = 0, leafT = 0, stepPh = 0, breathT = 2;
  // smoke and dust are pixel puffs that grow, drift with the wind and thin out by dithering
  const PUFF = {
    blue: ['#cdd5de', '#aab5c1', '#8c97a4'],      // from the cigarette tip
    white: ['#f3f1ed', '#d9d7d2', '#b8b6b1'],     // breathed out
    gun: ['#e2dfd8', '#bebbb4', '#98958e'],
    dust: ['#cdb894', '#ae9873', '#8b7757'],
    soot: ['#6a6762', '#4a4844', '#2f2e2c'],     // an engine coughing
    exhaust: ['#b9b6b0', '#9a9791', '#7e7b76'],
    steam: ['#ffffff', '#eeece8', '#d6d4cf']      // hydraulics letting off
  };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const puffCache = new Map();
  function puffSprite(tone, r, lv) {
    const key = tone + r + '|' + lv;
    let c = puffCache.get(key);
    if (c) return c;
    const n = 2 * r + 1, cols = PUFF[tone];
    c = document.createElement('canvas'); c.width = n; c.height = n;
    const g = c.getContext('2d');
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j) + (hash2(i + 9, j + 9, r) - 0.5) * 0.9;
      if (d > r + 0.35) continue;
      if (BAYER[((j + 8) & 3) * 4 + ((i + 8) & 3)] >= lv * 4) continue;
      const sh = (-i - j) / (r * 1.5 + 0.5);
      g.fillStyle = cols[sh > 0.3 ? 0 : sh < -0.35 ? 2 : 1];
      g.fillRect(i + r, j + r, 1, 1);
    }
    puffCache.set(key, c);
    return c;
  }
  const puff = (o) => smokeP.push(Object.assign({ age: 0, seed: Math.random() * 6.28, a: 0.9, r0: 0.6, r1: 3, drag: 0.6, rise: 0, tone: 'white' }, o));
  const last = { tip: null, mouth: null, fistL: null, fistR: null, face: [0, 1], muzzle: null, port: null, portDir: [1, 0], canTop: null, glows: [], root: null, chest: null, flame: false, aim2d: [1, 0] };
  // a shot at hero.aimAt: a target { pos, state: 'up' while it can be hit, onHit(away, hx, hy) } — the game says what a hit does
  function fireShot() {
    if (!last.muzzle) return;
    const [mx, my] = last.muzzle;
    const c = hero.aimAt;
    const tp = c ? wpx(add(c.pos, [0, 0.06, 0])) : [mx + last.face[0] * 200, my + last.face[1] * 100];
    const hit = c && c.state === 'up' && Math.random() < 0.62;
    const hx = tp[0] + (hit ? 0 : Math.round((Math.random() - 0.5) * 14)), hy = tp[1] + (hit ? 0 : Math.round((Math.random() - 0.5) * 10) - 3);
    fx.push({ k: 'flash', x: mx, y: my, life: 0.07 });
    fx.push({ k: 'tracer', x: mx, y: my, x1: hx, y1: hy, life: 0.06 });
    if (last.port) fx.push({ k: 'casing', x: last.port[0], y: last.port[1], vx: last.portDir[0] * 40 + (Math.random() - 0.5) * 10, vy: -38 - Math.random() * 12, g: 190, life: 0.55, floor: (last.root ? last.root[1] : my) + 2 });
    for (let i = 0; i < 5; i++) fx.push({ k: 'spark', x: hx, y: hy, vx: (Math.random() - 0.3) * 50, vy: -Math.random() * 45, g: 150, life: 0.25 + Math.random() * 0.1 });
    const [ax, ay] = last.aim2d || [1, 0];
    for (let i = 0; i < 6; i++) puff({ x: mx + ax * 2, y: my + ay * 2 - 1, vx: ax * (10 + Math.random() * 14) + (Math.random() - 0.5) * 6, vy: ay * 8 - 4 - Math.random() * 5, life: 0.9 + Math.random() * 0.5, r0: 1, r1: 4 + Math.random() * 2.5, a: 0.8, drag: 0.25, rise: -6, tone: 'gun' });
    if (hit) {
      const away = nrm([c.pos[0] - hero.x, 0, c.pos[2] - hero.z]);
      if (c.onHit) c.onHit(away, hx, hy);
    } else if (c) { hits.push([hx, hy]); if (hits.length > 24) hits.shift(); }
  }
  function sparkleAround() {
    if (!last.chest) return;
    for (let i = 0; i < 14; i++) fx.push({ k: 'spark', x: last.chest[0] + (Math.random() - 0.5) * 40, y: last.chest[1] + (Math.random() - 0.5) * 60, vx: 0, vy: -10 - Math.random() * 20, g: 0, life: 0.35 + Math.random() * 0.3, white: true });
  }
  function updateFx(dt, view) {
    const sm = hero.smoke;
    if (sm.on && sm.w > 0.95 && sm.t > SMOKE_INTRO && last.tip) {
      const st = smokeLoop(sm.t - SMOKE_INTRO + 0.5);
      wispT -= dt;
      if (wispT <= 0 && !st.inhale) { wispT = 0.06; puff({ x: last.tip[0], y: last.tip[1] - 1, vx: (Math.random() - 0.5) * 2, vy: -11 - Math.random() * 4, life: 1.6 + Math.random() * 0.8, r0: 0.5, r1: 2 + Math.random() * 1.4, a: 0.95, drag: 0.9, rise: -2, tone: 'blue' }); }
      if (st.exhale && last.mouth) {
        puffT -= dt;
        if (puffT <= 0) {
          puffT = 0.04;
          for (let i = 0; i < 3; i++) puff({ x: last.mouth[0] + last.face[0] * 2, y: last.mouth[1], vx: last.face[0] * (18 + Math.random() * 10) + (Math.random() - 0.5) * 6, vy: last.face[1] * 9 - 6 - Math.random() * 5, life: 2.0 + Math.random() * 0.8, r0: 1, r1: 5 + Math.random() * 3, a: 1, drag: 0.3, rise: -5, tone: 'white' });
        }
      }
      last.ember = st.inhale ? 2 : 1;
    } else last.ember = 0;
    // dust from the feet on bare earth and paths, one puff per step
    if (hero.walkW > 0.5 && !hero.act && last.root) {
      const ph = hero.phase * 2;
      if (Math.floor(ph) !== Math.floor(stepPh)) {
        const t = groundType(hero.x, hero.z);
        if (t === ':' || pathDist(hero.x, hero.z) < 0.45) for (let i = 0; i < (hero.run ? 4 : 2); i++) puff({ x: last.root[0] + (Math.random() - 0.5) * 6, y: last.root[1] - 1, vx: (Math.random() - 0.5) * 10, vy: -3 - Math.random() * 4, life: 0.5 + Math.random() * 0.3, r0: 0.8, r1: 2.2 + Math.random(), a: 0.55, drag: 0.2, rise: 2, tone: 'dust' });
      }
      stepPh = ph;
    }
    if (DAYP.cold < 0.3 && DAYP.night < 0.1 && MAP.butterflies !== false) updateButterflies(dt);
    // a cold morning or night: the breath shows, a little cloud every few seconds
    breathT -= dt;
    if (breathT <= 0) {
      breathT = 2.9 + Math.random() * 1.2;
      if (DAYP.cold > 0.5 && last.mouth && !heroHidden() && !(sm.on && sm.w > 0.2) && !reduceMotion)
        for (let i = 0; i < 2; i++) puff({ x: last.mouth[0] + last.face[0] * 2, y: last.mouth[1] + 1, vx: last.face[0] * (9 + Math.random() * 5), vy: last.face[1] * 4 - 3 - Math.random() * 2, life: 0.8 + Math.random() * 0.4, r0: 0.6, r1: 2 + Math.random(), a: 0.5 * DAYP.cold, drag: 0.35, rise: -3, tone: 'white' });
    }
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeA = 0; }
    const dr = hero.drink;
    if (dr.on && dr.t > 0.42 && dr.t - dt <= 0.42 && last.canTop) for (let i = 0; i < 6; i++) fx.push({ k: 'drop', x: last.canTop[0], y: last.canTop[1], vx: (Math.random() - 0.5) * 30, vy: -25 - Math.random() * 20, g: 140, life: 0.35 });
    // a few autumn leaves drifting down from crowns in view
    leafT -= dt;
    if (view && leafT <= 0 && !reduceMotion) {
      leafT = (0.35 + Math.random() * 0.6) / (MAP.leafRate || 1);
      const trees = INST.filter((i) => i.leafy && rectsHit(i.sr, view));
      if (trees.length && leavesP.length < 14 * (MAP.leafRate || 1)) {
        const t = trees[(Math.random() * trees.length) | 0], bb = t.bb;
        const P = [lerp(bb[0], bb[3], 0.2 + Math.random() * 0.6), bb[4] * (0.55 + Math.random() * 0.3), lerp(bb[2], bb[5], 0.2 + Math.random() * 0.6)];
        const s = wpx(P), g = wpx([P[0], 0, P[2]]);
        leavesP.push({ x: s[0], y: s[1], floor: g[1], ph: Math.random() * 6, col: ['#d6a63a', '#c9752c', '#e2c255', '#b9a33c'][(Math.random() * 4) | 0], life: 12 });
      }
    }
    for (const l of leavesP) { l.ph += dt * 3; l.y += dt * 16; l.x += Math.sin(l.ph) * dt * 14; l.life -= dt; if (l.y >= l.floor) { l.y = l.floor; l.life = Math.min(l.life, 1.5); } }
    for (let i = leavesP.length - 1; i >= 0; i--) if (leavesP[i].life <= 0) leavesP.splice(i, 1);
    for (const p of smokeP) {
      const dg = Math.pow(p.drag, dt);
      p.vx = p.vx * dg + 4 * dt; p.vy = p.vy * dg + p.rise * dt;          // slows down, drifts with the breeze to the right
      p.x += p.vx * dt + Math.sin(p.age * 4 + p.seed) * dt * 5; p.y += p.vy * dt;
      p.age += dt;
    }
    for (let i = smokeP.length - 1; i >= 0; i--) if (smokeP[i].age >= smokeP[i].life) smokeP.splice(i, 1);
    if (smokeP.length > 160) smokeP.splice(0, smokeP.length - 160);
    for (const f of fx) {
      f.life -= dt;
      if (f.vx !== undefined) { f.vy += (f.g || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.floor && f.y > f.floor) { f.y = f.floor; f.vy *= -0.3; f.vx *= 0.5; } }
    }
    for (let i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
  }
  // a few cabbage whites over the grass in the middle of the map: they wander, flap, and keep away from the hero (MAP.butterflies: false — none)
  const BUTTERFLIES = [];
  function updateButterflies(dt) {
    if (!BUTTERFLIES.length) {
      const R = rng(808);
      for (let i = 0; i < 4; i++) BUTTERFLIES.push({ x: GW * 3 / 10 + R() * (GW * 7 / 15), z: GH * 3 / 10 + R() * (GH * 7 / 15), y: 0.6, tx: 0, tz: 0, ph: R() * 6, bob: R() * 6, col: i === 3 ? '#efd95c' : '#f6f4ec', wait: 0 });
      for (const b of BUTTERFLIES) { b.tx = b.x; b.tz = b.z; }
    }
    for (const b of BUTTERFLIES) {
      const dh = Math.hypot(b.x - hero.x, b.z - hero.z);
      if (dh < 1.6) { const a = Math.atan2(b.z - hero.z, b.x - hero.x) + (Math.random() - 0.5); b.tx = clamp(b.x + Math.cos(a) * 3, 1, GW - 1); b.tz = clamp(b.z + Math.sin(a) * 3, 1, GH - 1); b.wait = 0; }
      const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { b.wait -= dt; if (b.wait <= 0) { b.tx = clamp(b.x + (Math.random() - 0.5) * 5, 2, GW - 2); b.tz = clamp(b.z + (Math.random() - 0.5) * 5, 2, GH - 2); b.wait = 0.5 + Math.random() * 2; } }
      else { const v = (dh < 2.5 ? 1.6 : 0.7) * dt; b.x += dx / d * v + Math.sin(b.ph * 0.37) * dt * 0.4; b.z += dz / d * v + Math.cos(b.ph * 0.29) * dt * 0.4; }
      b.ph += dt * 15; b.bob += dt * 2.3;
      b.y = 0.45 + Math.sin(b.bob) * 0.22 + (d < 0.2 ? -0.2 : 0.25);
    }
  }
  function drawButterflies(ctx, k, X, Y) {
    for (const b of BUTTERFLIES) {
      const [sx, sy] = wpx([b.x, b.y, b.z]), x = X(sx), y = Y(sy);
      if (Math.sin(b.ph) > 0) { px(ctx, x - 1, y, k, b.col); px(ctx, x + 1, y, k, b.col); px(ctx, x, y, k, '#5b564c'); }
      else { px(ctx, x, y - 1, k, b.col); px(ctx, x, y, k, '#5b564c'); }
      const [gx, gy] = wpx([b.x, 0, b.z]);
      px(ctx, X(gx), Y(gy), k, 'rgba(20,30,10,0.35)');
    }
  }
  // a lit lamp seen from the yard: a dithered halo round the bulb, moths circling the street lamps
  function drawLampGlow(ctx, k, X, Y) {
    const t = performance.now() / 1000;
    for (const L of dayLamps) {
      const q = wpx(L.p), x = Math.round(X(q[0])), y = Math.round(Y(q[1]) + 1), big = L.kind === 'street', r = big ? 6 : 4;
      if (L.k < 0.05) continue;
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const d = Math.hypot(i, j * 1.25); if (d > r) continue;
        if (BAYER[((j + 8) & 3) * 4 + ((i + 8) & 3)] >= (1 - d / r) * 9 * L.k) continue;
        px(ctx, x + i, y + j, k, d < r * 0.4 ? 'rgba(255,236,190,0.75)' : 'rgba(255,196,120,0.38)');
      }
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0]]) px(ctx, x + dx, y + dy, k, 'rgba(255,250,230,0.95)');
      if (big && DAYP.night > 0.5 && !reduceMotion) for (let m = 0; m < 3; m++) {
        const a = t * (2.1 + m * 0.7) + m * 2.1, rr = 6 + m * 2.5 + Math.sin(t * 3.3 + m) * 2;
        px(ctx, x + Math.cos(a) * rr, y + 3 + Math.sin(a * 1.3) * rr * 0.6, k, (Math.floor(t * 9 + m) & 1) ? '#efe9d8' : '#c9c2ae');
      }
    }
  }
  // evening midges in clouds over the bushes, bats over the yard at dusk and before dawn
  function drawCritters(ctx, k, X, Y) {
    if (reduceMotion) return;
    const h = DAYP.h, t = performance.now() / 1000;
    if (h > 16.4 && h < 19.7 && INST.length) {
      if (!drawCritters.swarms || drawCritters.map !== MAP.id) {
        drawCritters.map = MAP.id;
        const R = rng(616), bushes = INST.filter((i) => i.T && i.T.midges);
        drawCritters.swarms = bushes.filter(() => R() < 0.5).slice(0, 5).map((b) => ({ x: b.center[0] + (R() - 0.5), z: b.center[1] + (R() - 0.5), y: 1.6 + R() * 0.8, s: R() * 50 }));
      }
      const fade = Math.min(1, (h - 16.4) / 0.4, (19.7 - h) / 0.4);
      for (const w of drawCritters.swarms) {
        const c = wpx([w.x, w.y, w.z]);
        for (let i = 0; i < 9; i++) {
          if (hash2(i, Math.floor(w.s), 3) > fade) continue;
          const a = t * (1.7 + i * 0.37) + i * 2.4 + w.s, r = 2 + (i % 4) * 1.6;
          px(ctx, X(c[0] + Math.cos(a) * r + Math.sin(t * 5.1 + i) * 1.2), Y(c[1] + Math.sin(a * 1.3) * r * 0.7), k, (i & 1) ? 'rgba(40,36,30,0.8)' : 'rgba(236,214,150,0.85)');
        }
      }
    }
    const bats = (h > 19.3 && h < 22.5) || (h > 3.8 && h < 5.7);
    if (bats) for (let b = 0; b < 2; b++) {
      const u = t * (0.21 + b * 0.05) + b * 3.1, P = [GW * (0.5 + 0.38 * Math.sin(u * 1.7 + b)), 6.5 + 1.5 * Math.sin(u * 2.3), GH * (0.5 + 0.38 * Math.sin(u * 1.1 + 2 * b))];
      const q = wpx(P), x = X(q[0] + Math.sin(t * 7 + b) * 3), y = Y(q[1] + Math.cos(t * 9.3 + b) * 2), up = (Math.floor(t * 12 + b * 5) & 1) === 0;
      const col = 'rgba(24,22,30,0.95)';
      px(ctx, x, y, k, col);
      px(ctx, x - 1, y + (up ? -1 : 0), k, col); px(ctx, x + 1, y + (up ? -1 : 0), k, col);
      px(ctx, x - 2, y + (up ? -2 : 1), k, col); px(ctx, x + 2, y + (up ? -2 : 1), k, col);
    }
  }
  // stars over the dark air round the map (they stay put in the world and twinkle)
  let STARS = null;
  function drawStars(ctx, ox, oy, w, h) {
    if (DAYP.night < 0.35) return;
    if (!STARS) { const R = rng(1977); STARS = []; for (let i = 0; i < 160; i++) STARS.push([R() * 4400 - 2200, R() * 1500 - 900, R(), R()]); }
    const t = performance.now() / 1000, a = clamp((DAYP.night - 0.35) / 0.4, 0, 1);
    for (const [sx, sy, b, ph] of STARS) {
      const x = Math.round(sx - ox), y = Math.round(sy - oy);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const tw = Math.sin(t * (0.7 + ph * 1.6) + ph * 40) > 0.6 - b * 0.5 ? 1 : 0.45;
      ctx.fillStyle = `rgba(${b > 0.85 ? '255,236,200' : '214,226,255'},${(0.35 + 0.6 * b) * tw * a})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  function px(ctx, x, y, k, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(k)), Math.max(1, Math.round(k))); }
  // draw effects; X/Y map world art px to the target canvas, k is the size of one art pixel there
  function drawFx(ctx, k, ox, oy) {
    const X = (x) => x - ox, Y = (y) => y - oy;
    for (const [x, y] of hits) px(ctx, X(x), Y(y), k, 'rgba(40,28,22,0.85)');
    for (const l of leavesP) { px(ctx, X(l.x), Y(l.y), k, l.col); if (Math.sin(l.ph) > 0) px(ctx, X(l.x + 1), Y(l.y), k, l.col); }
    if (DAYP.cold < 0.3 && DAYP.night < 0.1 && MAP.butterflies !== false) drawButterflies(ctx, k, X, Y);
    drawCritters(ctx, k, X, Y);
    drawLampGlow(ctx, k, X, Y);
    for (const p of smokeP) {
      const t = p.age / p.life, r = Math.round(p.r0 + (p.r1 - p.r0) * (1 - (1 - t) * (1 - t)));
      const lv = Math.round(p.a * Math.pow(1 - t, 1.2) * 4);
      if (lv <= 0) continue;
      const sp = puffSprite(p.tone, r, lv);
      ctx.drawImage(sp, Math.round((X(p.x) - r) * k), Math.round((Y(p.y) - r) * k), sp.width * Math.max(k, 1e-3), sp.height * Math.max(k, 1e-3));
    }
    if (last.ember && last.tip) {
      px(ctx, X(last.tip[0]), Y(last.tip[1]), k, last.ember > 1 ? '#ffd27a' : '#e2562c');
      if (last.ember > 1) px(ctx, X(last.tip[0]) + 1, Y(last.tip[1]), k, '#ff8a3a');
    }
    for (const f of fx) {
      if (f.k === 'tracer') {
        const n = Math.max(1, Math.round(Math.hypot(f.x1 - f.x, f.y1 - f.y)));
        for (let i = 4; i < n; i += 1) if (i % 6 < 4) px(ctx, X(f.x + (f.x1 - f.x) * i / n), Y(f.y + (f.y1 - f.y) * i / n), k, 'rgba(255,231,150,0.9)');
      } else if (f.k === 'flash') {
        const [dx, dy] = last.aim2d || [1, 0];
        for (let i = 1; i <= 4; i++) px(ctx, X(f.x + dx * i), Y(f.y + dy * i), k, i < 3 ? '#fff6d0' : '#ffb347');
        for (const [ax, ay] of [[-dy, dx], [dy, -dx]]) { px(ctx, X(f.x + ax * 2 + dx), Y(f.y + ay * 2 + dy), k, '#ffcf5a'); px(ctx, X(f.x + ax), Y(f.y + ay), k, '#fff6d0'); }
        px(ctx, X(f.x), Y(f.y), k, '#ffffff');
      } else if (f.k === 'casing') {
        px(ctx, X(f.x), Y(f.y), k, '#d9ad4b'); px(ctx, X(f.x + 1), Y(f.y), k, '#a8792c');
      } else if (f.k === 'spark') {
        px(ctx, X(f.x), Y(f.y), k, f.white ? 'rgba(255,250,225,0.95)' : (f.life > 0.15 ? '#fff2b0' : '#ffb347'));
      } else if (f.k === 'drop') {
        px(ctx, X(f.x), Y(f.y), k, 'rgba(235,240,245,0.9)');
      } else if (f.k === 'bit') {
        px(ctx, X(f.x), Y(f.y), k, f.col);
      } else if (f.k === 'clank') {
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [1, -1], [-1, 1]]) px(ctx, X(f.x + dx), Y(f.y + dy), k, '#fff6dc');
      }
    }
    for (const f of GAME.drawFx) f(ctx, k, X, Y);
    for (const g of last.glows) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(ctx, X(g[0] + dx), Y(g[1] + dy), k, 'rgba(110,255,150,0.38)');
    if (last.flame && last.tip) {
      px(ctx, X(last.tip[0]), Y(last.tip[1] - 1), k, '#ffe08a'); px(ctx, X(last.tip[0]), Y(last.tip[1] - 2), k, '#ff9f3a');
      if ((performance.now() / 70 | 0) % 2) px(ctx, X(last.tip[0] + 1), Y(last.tip[1] - 2), k, '#ffcf5a');
    }
  }

