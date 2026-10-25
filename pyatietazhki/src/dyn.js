  // ================= moving parts of objects: swing seats, cans on the shed, the basketball =================
  import { add, approach, len, nrm, scl, sub, wpx, xf } from '../../engine/src/core/math.js';
  import { GAME, hook } from '../../engine/src/core/game.js';
  import { toast } from '../../engine/src/core/toast.js';
  import { LOC_HOOKS } from '../../engine/src/world/map.js';
  import { byType, localPt } from '../../engine/src/world/instances.js';
  import { armored } from '../../engine/src/hero/model.js';
  import { hero } from '../../engine/src/hero/hero.js';
  import { fx } from '../../engine/src/fx/fx2d.js';
  import { SWING_W } from './catalog.js';
  function initDyn() {
    for (const s of byType('swing')) if (s.def.seat) Object.assign(s.dyn, { theta: 0, amp: 0.04, ph: 0, occupied: false });
    const g = byType('garage')[0];
    // the cans are targets for the rifle (see fireShot): they stand 'up' until a hit knocks them off the roof
    if (g && g.built.canSlots) g.dyn.cans = g.built.canSlots.map((p, i) => { const c = { slot: p, pos: localPt(g, p), state: 'up', v: [0, 0, 0], rot: 0, spin: 0, axis: [1, 0, 0], col: i }; c.onHit = (away, hx, hy) => canHit(g, c, away, hx, hy); return c; });
    const h = byType('hoop')[0];
    if (h) { const rest = localPt(h, [0.34, 0.12, 0.3]); h.dyn.ball = { state: 'rest', pos: rest, home: rest, v: [0, 0, 0], rot: 0, score: 0, tries: 0 }; }
    for (const c of byType('car')) c.dyn.alarm = 0;
  }
  LOC_HOOKS.build.push(initDyn);
  hook(GAME.update, (dt) => updateDyn(dt), 20);
  // a hit can flies off the roof; the hero turns to the next one standing
  function canHit(g, c, away, hx, hy) {
    c.state = 'fly'; c.v = [away[0] * (1.6 + Math.random()) + (Math.random() - 0.5), 2.2 + Math.random() * 1.4, away[2] * (1.6 + Math.random()) + (Math.random() - 0.5)];
    c.spin = 10 + Math.random() * 8; c.axis = nrm([away[2], 0.2, -away[0]]);
    fx.push({ k: 'clank', x: hx, y: hy, life: 0.12 });
    const up = g.dyn.cans.filter((q) => q.state === 'up');
    if (up.length) { up.sort((a, b) => Math.hypot(a.pos[0] - hero.x, a.pos[2] - hero.z) - Math.hypot(b.pos[0] - hero.x, b.pos[2] - hero.z)); hero.aimAt = up[0]; }
    else { hero.aimAt = null; setTimeout(() => toast('Все банки сбиты! Расставить их можно у сарая.'), 500); }
  }
  // throwing the basketball: the order for the hero's queue, with what happens to the ball when he grabs, lets go or is called away
  export function ballThrow(inst) {
    return {
      type: 'throw', inst,
      grab: () => { inst.dyn.ball.state = 'held'; },
      release: (rig) => releaseBall(rig),
      drop: () => {     // a throw cut short: the ball drops at his feet instead of vanishing
        const b = inst.dyn.ball;
        b.pos = [hero.x + Math.sin(hero.yaw) * 0.3, 0.12, hero.z + Math.cos(hero.yaw) * 0.3]; b.v = [Math.sin(hero.yaw) * 0.6, 0, Math.cos(hero.yaw) * 0.6]; b.state = 'roll';
      }
    };
  }
  export function resetCans(g) { for (const c of g.dyn.cans) { c.state = 'up'; c.pos = localPt(g, c.slot); c.rot = 0; c.v = [0, 0, 0]; } }
  function updateDyn(dt) {
    for (const s of byType('swing')) if (s.def.seat) {
      const d = s.dyn;
      if (!d.occupied) d.amp = approach(d.amp, 0.04, dt * 0.09);
      d.ph += dt * SWING_W;
      d.theta = -d.amp * Math.sin(d.ph);
    }
    const g = byType('garage')[0];
    if (g && g.dyn.cans) for (const c of g.dyn.cans) if (c.state === 'fly') {
      c.v[1] -= 9.8 * dt; c.pos = add(c.pos, scl(c.v, dt)); c.rot += c.spin * dt;
      if (c.pos[1] <= 0.035) {
        c.pos[1] = 0.035;
        if (c.v[1] < -1.6) { c.v = [c.v[0] * 0.45, -c.v[1] * 0.3, c.v[2] * 0.45]; c.spin *= 0.5; }
        else { c.state = 'down'; c.rot = Math.PI / 2; }
      }
    }
    for (const c of byType('car')) if (c.dyn.alarm > 0) c.dyn.alarm = Math.max(0, c.dyn.alarm - dt);
    const h = byType('hoop')[0], b = h && h.dyn.ball;
    if (b && (b.state === 'fly' || b.state === 'roll')) {
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

