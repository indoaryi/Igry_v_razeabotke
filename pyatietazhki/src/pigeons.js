  // ================= pigeons: they peck by the first entrance and fly off when the hero comes close =================
  const PIG_HOME = { x0: 3.5, x1: 5.7, z0: 18.9, z1: 23.6 };
  const PERCHES = [[3.0, 2.93, 23.3], [3.35, 2.93, 24.7], [6.4, 2.36, 21.6], [7.9, 2.36, 21.6], [5.2, 2.47, 11.3], [6.9, 2.47, 10.6]];
  const PIGEONS = [];
  const pigR = rng(4242);
  function pigTarget() { return [lerp(PIG_HOME.x0, PIG_HOME.x1, pigR()), lerp(PIG_HOME.z0, PIG_HOME.z1, pigR())]; }
  function initPigeons() {
    for (let i = 0; i < 4; i++) {
      const [x, z] = pigTarget();
      PIGEONS.push({ p: [x, 0, z], yaw: pigR() * 6.28, state: 'walk', t: 0, tgt: pigTarget(), timer: 1 + pigR() * 2, flap: 0, from: null, to: null, dur: 1, col: i % 2, perch: null });
    }
  }
  function takeOff(b, to, dur) { b.state = 'fly'; b.from = b.p.slice(); b.to = to; b.t = 0; b.dur = dur; b.yaw = Math.atan2(to[0] - b.p[0], to[2] - b.p[2]); }
  function updatePigeons(dt) {
    for (const b of PIGEONS) {
      b.t += dt;
      const dh = Math.hypot(hero.x - b.p[0], hero.z - b.p[2]);
      if ((b.state === 'walk' || b.state === 'peck') && (dh < 1.7 || (dh < 3.2 && hero.run) || hero.shoot.on)) {
        const free = PERCHES.filter((q) => !PIGEONS.some((o) => o !== b && o.perch === q));
        const q = free[(pigR() * free.length) | 0] || PERCHES[0];
        b.perch = q; takeOff(b, [q[0] + (pigR() - 0.5) * 0.3, q[1], q[2] + (pigR() - 0.5) * 0.3], 1.1 + pigR() * 0.6);
        continue;
      }
      if (b.state === 'walk') {
        const dx = b.tgt[0] - b.p[0], dz = b.tgt[1] - b.p[2], d = Math.hypot(dx, dz);
        if (d < 0.05) { b.state = 'peck'; b.timer = 0.8 + pigR() * 2.2; b.t = 0; }
        else { const s = Math.min(d, dt * 0.38); b.p[0] += dx / d * s; b.p[2] += dz / d * s; b.yaw = Math.atan2(dx, dz); }
      } else if (b.state === 'peck') {
        b.timer -= dt;
        if (b.timer <= 0) { b.state = 'walk'; b.tgt = pigTarget(); b.t = 0; }
      } else if (b.state === 'fly') {
        const u = clamp(b.t / b.dur, 0, 1), e = smooth(u);
        b.p = lerpV(b.from, b.to, e); b.p[1] += Math.sin(Math.PI * u) * 1.2;
        b.flap += dt * 26;
        if (u >= 1) {
          b.p = b.to.slice();
          if (b.perch) { b.state = 'perched'; b.timer = 7 + pigR() * 8; } else { b.state = 'walk'; b.tgt = pigTarget(); }
          b.t = 0;
        }
      } else if (b.state === 'perched') {
        b.timer -= dt;
        const home = [(PIG_HOME.x0 + PIG_HOME.x1) / 2, (PIG_HOME.z0 + PIG_HOME.z1) / 2];
        if (b.timer <= 0 && Math.hypot(hero.x - home[0], hero.z - home[1]) > 4.5) {
          const [x, z] = pigTarget(); b.perch = null; takeOff(b, [x, 0, z], 1.3 + pigR() * 0.5);
        } else if (b.timer <= 0) b.timer = 2 + pigR() * 3;
      }
    }
  }
  const PIG_MATS = [
    { body: mat('#8c939c', { pat: 6, b: '#6d747d', p: [-0.01, 0.025, 0, 0], noise: 0.06, grain: 90 }), wing: mat('#7c838c', { pat: 23, p: [40, 0, 0, 0], noise: 0.05 }) },
    { body: mat('#9a9389', { pat: 6, b: '#77706a', p: [-0.01, 0.025, 0, 0], noise: 0.06, grain: 90 }), wing: mat('#8a837a', { pat: 23, p: [40, 0, 0, 0], noise: 0.05 }) }
  ];
  const PIG_HEAD = mat('#5f666e', { pat: 6, b: '#4f8d6a', p: [-0.06, -0.015, 0, 0], noise: 0.04 });
  const PIG_TAIL = mat('#4f555c', { noise: 0.04 });
  const PIG_BEAK = mat('#d8c4a6', { noise: 0 });
  const PIG_LEG = Object.assign(flat('#c25f5f', 2), { fl: 1 });
  function pigeonItems() {
    const out = [];
    const body = getMesh('pigBody', () => ellipsoid(0.065, 0.06, 0.12, { seg: 10, rings: 6 }));
    const head = getMesh('pigHead', () => ellipsoid(0.034, 0.036, 0.038, { seg: 8, rings: 5 }));
    const tail = getMesh('pigTail', () => box(0.04, 0.008, 0.06));
    const beak = getMesh('pigBeak', () => box(0.006, 0.006, 0.014));
    const wing = getMesh('pigWing', () => box(0.11, 0.008, 0.06));
    const leg = UNIT_LINE();
    for (const b of PIGEONS) {
      const M0 = M(tr(b.p[0], b.p[1], b.p[2]), ry(b.yaw));
      const pm = PIG_MATS[b.col];
      const fly = b.state === 'fly', peck = b.state === 'peck';
      const bob = b.state === 'walk' ? Math.abs(Math.sin(b.t * 9)) * 0.02 : 0;
      const pk = peck ? Math.max(0, Math.sin(b.t * 7)) : 0;
      const by = fly ? 0.0 : 0.075;
      out.push({ mesh: body, model: M(M0, tr(0, by, 0), rx(fly ? 0.05 : -0.15)), mat: pm.body, shadow: true });
      out.push({ mesh: head, model: M(M0, tr(0, by + 0.07 - pk * 0.07, 0.1 + bob + pk * 0.04)), mat: PIG_HEAD, shadow: true });
      out.push({ mesh: beak, model: M(M0, tr(0, by + 0.065 - pk * 0.075, 0.14 + bob + pk * 0.045)), mat: PIG_BEAK });
      out.push({ mesh: tail, model: M(M0, tr(0, by + 0.02, -0.14), rx(fly ? 0 : -0.35)), mat: PIG_TAIL, shadow: true });
      if (fly) {
        const a = Math.sin(b.flap) * 0.9;
        for (const s of [1, -1]) out.push({ mesh: wing, model: M(M0, tr(s * 0.05, by + 0.03, 0), rz(s * a), tr(s * 0.1, 0, 0)), mat: pm.wing, shadow: true });
      } else for (const s of [1, -1]) out.push({ mesh: leg, model: M(M0, tr(s * 0.025, by - 0.03, 0.01), sc3(1, by - 0.03, 1)), mat: PIG_LEG, flags: 1 });
    }
    return out;
  }

