  // ================= moving parts of objects: swing seats, cans on the shed, the basketball =================
  function initDyn() {
    for (const s of byType('swing')) if (s.def.seat) Object.assign(s.dyn, { theta: 0, amp: 0.04, ph: 0, occupied: false });
    const g = byType('garage')[0];
    g.dyn.cans = g.built.canSlots.map((p, i) => ({ slot: p, pos: localPt(g, p), state: 'up', v: [0, 0, 0], rot: 0, spin: 0, axis: [1, 0, 0], col: i }));
    const h = byType('hoop')[0];
    const rest = localPt(h, [0.34, 0.12, 0.3]);
    h.dyn.ball = { state: 'rest', pos: rest, home: rest, v: [0, 0, 0], rot: 0, score: 0, tries: 0 };
  }
  function resetCans(g) { for (const c of g.dyn.cans) { c.state = 'up'; c.pos = localPt(g, c.slot); c.rot = 0; c.v = [0, 0, 0]; } }
  function updateDyn(dt) {
    for (const s of byType('swing')) if (s.def.seat) {
      const d = s.dyn;
      if (!d.occupied) d.amp = approach(d.amp, 0.04, dt * 0.09);
      d.ph += dt * SWING_W;
      d.theta = -d.amp * Math.sin(d.ph);
    }
    const g = byType('garage')[0];
    for (const c of g.dyn.cans) if (c.state === 'fly') {
      c.v[1] -= 9.8 * dt; c.pos = add(c.pos, scl(c.v, dt)); c.rot += c.spin * dt;
      if (c.pos[1] <= 0.035) {
        c.pos[1] = 0.035;
        if (c.v[1] < -1.6) { c.v = [c.v[0] * 0.45, -c.v[1] * 0.3, c.v[2] * 0.45]; c.spin *= 0.5; }
        else { c.state = 'down'; c.rot = Math.PI / 2; }
      }
    }
    const h = byType('hoop')[0], b = h.dyn.ball;
    if (b.state === 'fly' || b.state === 'roll') {
      if (b.state === 'fly') b.v[1] -= 9.8 * dt;
      b.pos = add(b.pos, scl(b.v, dt)); b.t += dt; b.rot += dt * (b.state === 'fly' ? 9 : len(b.v) / 0.12);
      if (b.state === 'fly' && !b.evt && b.t >= b.T) {
        b.evt = true; b.tries++;
        const rim = localPt(h, h.built.rim);
        if (b.make) { b.v = [b.v[0] * 0.12, -1.0, b.v[2] * 0.12]; b.score++; toast(`Попал! ${b.score} из ${b.tries}.`); }
        else {
          const away = nrm([b.pos[0] - rim[0] + (Math.random() - 0.5) * 0.2, 0, b.pos[2] - rim[2] + (Math.random() - 0.5) * 0.2]);
          b.v = [away[0] * 1.7, 1.4 + Math.random() * 0.8, away[2] * 1.7];
          fx.push({ k: 'clank', x: wpx(b.pos)[0], y: wpx(b.pos)[1], life: 0.18 });
          toast(`Мимо. ${b.score} из ${b.tries}.`);
        }
      }
      if (b.pos[1] <= 0.12) {
        b.pos[1] = 0.12;
        if (b.state === 'fly' && b.v[1] < -0.9) { b.v = [b.v[0] * 0.8, -b.v[1] * 0.55, b.v[2] * 0.8]; }
        else { b.state = 'roll'; b.v[1] = 0; }
      }
      if (b.state === 'roll') { b.v = scl(b.v, Math.pow(0.3, dt)); if (len(b.v) < 0.06) { b.state = 'rest'; b.v = [0, 0, 0]; } }
    }
  }
  function releaseBall(rig) {
    const h = hero.thr.inst, b = h.dyn.ball;
    const P0 = xf(rig.B.chest, rig.pose.st.thr ? rig.pose.st.thr.ball : [0, 0.6, 0.3]);
    const rim = localPt(h, h.built.rim);
    b.make = Math.random() < (armored() ? 0.4 : 0.56);
    let tgt = add(rim, [0, 0.03, 0]);
    if (!b.make) { const a = Math.random() * Math.PI * 2; tgt = add(tgt, [Math.cos(a) * 0.24, 0.02, Math.sin(a) * 0.24]); }
    const T = 0.95;
    b.pos = P0; b.T = T; b.t = 0; b.evt = false; b.state = 'fly';
    b.v = add(scl(sub(tgt, P0), 1 / T), [0, 4.9 * T, 0]);
  }

