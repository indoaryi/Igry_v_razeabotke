  // ================= 2D effects (in world art pixels) =================
  const smokeP = [], fx = [], hits = [], leavesP = [];
  let wispT = 0, puffT = 0, leafT = 0;
  const last = { tip: null, mouth: null, fistL: null, fistR: null, face: [0, 1], muzzle: null, port: null, portDir: [1, 0], canTop: null, glows: [], root: null, chest: null, flame: false, aim2d: [1, 0] };
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
    for (let i = 0; i < 2; i++) smokeP.push({ x: mx, y: my - 1, vx: (Math.random() - 0.5) * 6, vy: -7 - Math.random() * 4, life: 0.8, max: 0.8, odd: true });
    if (hit) {
      const away = nrm([c.pos[0] - hero.x, 0, c.pos[2] - hero.z]);
      c.state = 'fly'; c.v = [away[0] * (1.6 + Math.random()) + (Math.random() - 0.5), 2.2 + Math.random() * 1.4, away[2] * (1.6 + Math.random()) + (Math.random() - 0.5)];
      c.spin = 10 + Math.random() * 8; c.axis = nrm([away[2], 0.2, -away[0]]);
      fx.push({ k: 'clank', x: hx, y: hy, life: 0.12 });
      const g = byType('garage')[0], up = g.dyn.cans.filter((q) => q.state === 'up');
      if (up.length) { up.sort((a, b) => Math.hypot(a.pos[0] - hero.x, a.pos[2] - hero.z) - Math.hypot(b.pos[0] - hero.x, b.pos[2] - hero.z)); hero.aimAt = up[0]; }
      else { hero.aimAt = null; setTimeout(() => toast('Все банки сбиты! Расставить их можно у сарая.'), 500); }
    } else if (c) { hits.push([hx, hy]); if (hits.length > 24) hits.shift(); }
  }
  function sparkleAround() {
    if (!last.chest) return;
    for (let i = 0; i < 14; i++) fx.push({ k: 'spark', x: last.chest[0] + (Math.random() - 0.5) * 40, y: last.chest[1] + (Math.random() - 0.5) * 60, vx: 0, vy: -10 - Math.random() * 20, g: 0, life: 0.35 + Math.random() * 0.3, white: true });
  }
  function updateFx(dt, view) {
    const sm = hero.smoke;
    if (sm.on && sm.w > 0.95 && sm.t > SMOKE_INTRO && last.tip) {
      const s = smokeLoop(sm.t - SMOKE_INTRO + 0.5);
      wispT -= dt;
      if (wispT <= 0 && !s.inhale) { wispT = 0.22; smokeP.push({ x: last.tip[0], y: last.tip[1] - 1, vx: (Math.random() - 0.5) * 3, vy: -10, life: 1.3, max: 1.3, odd: Math.random() < 0.5 }); }
      if (s.exhale && last.mouth) {
        puffT -= dt;
        if (puffT <= 0) {
          puffT = 0.05;
          for (let i = 0; i < 2; i++) smokeP.push({ x: last.mouth[0] + last.face[0] * 2, y: last.mouth[1], vx: last.face[0] * 14 + (Math.random() - 0.5) * 7, vy: last.face[1] * 7 - 5 - Math.random() * 4, life: 1.6, max: 1.6, big: Math.random() < 0.6 });
        }
      }
    }
    const dr = hero.drink;
    if (dr.on && dr.t > 0.42 && dr.t - dt <= 0.42 && last.canTop) for (let i = 0; i < 6; i++) fx.push({ k: 'drop', x: last.canTop[0], y: last.canTop[1], vx: (Math.random() - 0.5) * 30, vy: -25 - Math.random() * 20, g: 140, life: 0.35 });
    // a few autumn leaves drifting down from crowns in view
    leafT -= dt;
    if (view && leafT <= 0 && !reduceMotion) {
      leafT = 0.35 + Math.random() * 0.6;
      const trees = INST.filter((i) => i.type === 'tree' && i.def.kind !== 'bare' && rectsHit(i.sr, view));
      if (trees.length && leavesP.length < 14) {
        const t = trees[(Math.random() * trees.length) | 0], bb = t.bb;
        const P = [lerp(bb[0], bb[3], 0.2 + Math.random() * 0.6), bb[4] * (0.55 + Math.random() * 0.3), lerp(bb[2], bb[5], 0.2 + Math.random() * 0.6)];
        const s = wpx(P), g = wpx([P[0], 0, P[2]]);
        leavesP.push({ x: s[0], y: s[1], floor: g[1], ph: Math.random() * 6, col: ['#d6a63a', '#c9752c', '#e2c255', '#b9a33c'][(Math.random() * 4) | 0], life: 12 });
      }
    }
    for (const l of leavesP) { l.ph += dt * 3; l.y += dt * 16; l.x += Math.sin(l.ph) * dt * 14; l.life -= dt; if (l.y >= l.floor) { l.y = l.floor; l.life = Math.min(l.life, 1.5); } }
    for (let i = leavesP.length - 1; i >= 0; i--) if (leavesP[i].life <= 0) leavesP.splice(i, 1);
    for (const p of smokeP) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.life -= dt; }
    for (let i = smokeP.length - 1; i >= 0; i--) if (smokeP[i].life <= 0) smokeP.splice(i, 1);
    for (const f of fx) {
      f.life -= dt;
      if (f.vx !== undefined) { f.vy += (f.g || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.floor && f.y > f.floor) { f.y = f.floor; f.vy *= -0.3; f.vx *= 0.5; } }
    }
    for (let i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
  }
  function px(ctx, x, y, k, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(k)), Math.max(1, Math.round(k))); }
  // draw effects; X/Y map world art px to the target canvas, k is the size of one art pixel there
  function drawFx(ctx, k, ox, oy) {
    const X = (x) => x - ox, Y = (y) => y - oy;
    for (const [x, y] of hits) px(ctx, X(x), Y(y), k, 'rgba(40,28,22,0.85)');
    for (const l of leavesP) { px(ctx, X(l.x), Y(l.y), k, l.col); if (Math.sin(l.ph) > 0) px(ctx, X(l.x + 1), Y(l.y), k, l.col); }
    for (const p of smokeP) {
      const f = p.life / p.max, x = Math.round(X(p.x)), y = Math.round(Y(p.y));
      const coreA = f > 0.6 ? 0.95 : f > 0.3 ? 0.7 : 0.4, rimA = f > 0.6 ? 0.75 : f > 0.3 ? 0.45 : 0;
      if (p.big && rimA > 0) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(ctx, x + dx, y + dy, k, `rgba(150,147,142,${rimA})`);
      px(ctx, x, y, k, p.big ? `rgba(240,238,233,${coreA})` : (p.odd ? `rgba(172,169,164,${coreA})` : `rgba(236,234,229,${coreA})`));
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
      } else if (f.k === 'clank') {
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [1, -1], [-1, 1]]) px(ctx, X(f.x + dx), Y(f.y + dy), k, '#fff6dc');
      }
    }
    for (const g of last.glows) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(ctx, X(g[0] + dx), Y(g[1] + dy), k, 'rgba(110,255,150,0.38)');
    if (last.flame && last.tip) {
      px(ctx, X(last.tip[0]), Y(last.tip[1] - 1), k, '#ffe08a'); px(ctx, X(last.tip[0]), Y(last.tip[1] - 2), k, '#ff9f3a');
      if ((performance.now() / 70 | 0) % 2) px(ctx, X(last.tip[0] + 1), Y(last.tip[1] - 2), k, '#ffcf5a');
    }
  }

