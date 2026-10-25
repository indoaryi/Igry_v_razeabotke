  // ================= moving object parts as draw items =================
  const SEAT_MAT = mat('#8b5c38', { pat: 37, b: '#6f4a2e', p: [0.1, 0, 0, 0], noise: 0.08, grain: 50 });
  const CHAIN_MAT = Object.assign(flat('#45474b', 1), { fl: 1 });
  const CAN_MATS = ['#c8352c', '#2f7d3c', '#d1b04a', '#8a96a2'].map((h) => mat(h, { pat: 47, b: '#e7e4dc', p: [0.02, 0.035, 0.085, 0.1], noise: 0.03, spec: 0.8, gloss: 10 }));
  // the yard's moving parts in the frame: swing seats, cans, the ball, pigeons, blinking indicators (GAME.items);
  // the walking machines add themselves after these (see machine.js)
  hook(GAME.items, (items) => {
    for (const s of byType('swing')) if (s.def.seat) {
      const th = s.dyn.thetaD ?? s.dyn.theta;
      const F = M(s.M0, tr(0, SW.BAR, 0), rx(th));
      items.push({ mesh: getMesh('seat', () => box(0.25, 0.028, 0.11)), model: M(F, tr(0, -SW.CH, 0)), mat: SEAT_MAT, id: s.id, flags: 2, shadow: true });
      for (const x of [-SW.PIV, SW.PIV]) items.push({ mesh: UNIT_LINE(), model: M(s.M0, tr(x, SW.BAR, 0), rx(th), sc3(1, SW.CH - 0.02, 1)), mat: CHAIN_MAT, id: s.id, flags: 3 });
    }
    const g = byType('garage')[0];
    if (g && g.dyn.cans) for (const c of g.dyn.cans) {
      const R = c.state === 'up' ? ID4 : M(tr(0, 0, 0), rotAxis(c.axis, c.rot));
      items.push({ mesh: getMesh('beer', () => cyl(0.033, 0.033, 0.12, 10)), model: M(tr(...c.pos), R, tr(0, -0.06, 0)), mat: CAN_MATS[c.col], id: g.id, flags: 2, shadow: true });
    }
    const h = byType('hoop')[0], b = h && h.dyn.ball;
    if (b && b.state !== 'held') items.push({ mesh: BALL_MESH(), model: M(tr(...b.pos), rx(b.rot)), mat: BALL_MAT, id: h.id, flags: 2, shadow: true });
    for (const it of pigeonItems()) items.push(it);
    for (const it of carLightItems()) items.push(it);
  });
  // the stage is redrawn when any of them moves (GAME.key) …
  hook(GAME.key, () => {
    const g = byType('garage')[0], h = byType('hoop')[0];
    let k = '';
    if (g && g.dyn.cans) k += g.dyn.cans.map((c) => c.state[0] + c.pos.map((x) => x.toFixed(2)).join(',') + c.rot.toFixed(1)).join(';');
    if (h && h.dyn.ball) k += '|' + h.dyn.ball.state + h.dyn.ball.pos.map((x) => x.toFixed(2)).join(',');
    for (const c of byType('car')) if (c.dyn.alarm > 0) k += '|a' + c.id + (Math.floor(c.dyn.alarm * 3) & 1);
    return k;
  });
  // … the swings are frozen twelve times a second like everything else (GAME.tick) …
  hook(GAME.tick, () => { for (const s of byType('swing')) if (s.def.seat) s.dyn.thetaD = s.dyn.theta; });
  // … and while the ball is in the hero's hands or in the air, the camera leans towards the hoop (GAME.focus)
  hook(GAME.focus, (hs) => {
    const hp = byType('hoop')[0], ball = hp && hp.dyn.ball;
    return ball && (hero.thr.on || ball.state === 'fly') ? lerpV([...hs, 0], [...wpx(localPt(hp, hp.built.rim)), 0], 0.5) : null;
  }, 10);
  function rotAxis(a, t) {
    const [x, y, z] = nrm(a), c = Math.cos(t), s = Math.sin(t), C = 1 - c, m = I4();
    m[0] = c + x * x * C; m[1] = y * x * C + z * s; m[2] = z * x * C - y * s;
    m[4] = x * y * C - z * s; m[5] = c + y * y * C; m[6] = z * y * C + x * s;
    m[8] = x * z * C + y * s; m[9] = y * z * C - x * s; m[10] = c + z * z * C;
    return m;
  }

