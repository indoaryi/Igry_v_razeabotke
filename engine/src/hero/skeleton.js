  // ================= skeleton & poses =================
  function ik(S0, Tg, a, b, pole) {
    const d = sub(Tg, S0); let dist = len(d);
    const dn = dist > 1e-6 ? scl(d, 1 / dist) : [0, -1, 0];
    dist = clamp(dist, Math.abs(a - b) + 1e-3, a + b - 1e-3);
    const x = (a * a - b * b + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, a * a - x * x));
    let pp = sub(pole, scl(dn, dot(pole, dn)));
    if (len(pp) < 1e-5) pp = sub([0, 0, -1], scl(dn, -dn[2]));
    if (len(pp) < 1e-5) pp = [1, 0, 0];
    pp = nrm(pp);
    const E = add(add(S0, scl(dn, x)), scl(pp, h)), Tc = add(S0, scl(dn, dist));
    const X = nrm(cross(dn, pp)), Y1 = nrm(sub(S0, E)), Y2 = nrm(sub(E, Tc));
    return { E, H: Tc, R1: basis(X, Y1, cross(X, Y1)), R2: basis(X, Y2, cross(X, Y2)) };
  }
  function plantY(p, D) {
    const Hm = eul(p.hips);
    const sole = [[0, D.sole, -0.07], [0, D.sole, 0.19], [0.05, D.sole, 0.06], [-0.05, D.sole, 0.06]];
    let mn = Infinity;
    for (const [s, sg] of [['l', 1], ['r', -1]]) {
      const th = M(Hm, tr(sg * D.hipX, -0.04, 0), eul(p[s + 'Thigh']));
      const sh = M(th, tr(0, -D.thigh, 0), eul(p[s + 'Shin']));
      const ft = M(sh, tr(0, -D.shin, 0), eul(p[s + 'Foot']));
      for (const pt of sole) mn = Math.min(mn, xf(ft, pt)[1]);
    }
    return -mn;
  }
  // root: [x, y, z] of the feet; base: optional full matrix for the hips (swings, bars, slides)
  function evalBones(p, root, yaw, D, base) {
    const B = {};
    if (base) B.hips = M(base, tr(0, p.lift, 0), eul(p.hips));
    else {
      const R0 = M(tr(root[0], root[1] || 0, root[2]), ry(yaw));
      B.hips = M(R0, tr(0, plantY(p, D) + p.lift, 0), eul(p.hips));
    }
    B.spine = M(B.hips, tr(0, D.spineY, 0), eul(p.spine));
    B.chest = M(B.spine, tr(0, D.chestY - p.drop, 0), eul(p.chest));
    B.neck = M(B.chest, tr(0, D.neckY, 0), eul(p.neck));
    B.head = M(B.neck, tr(0, D.headY, 0), eul(p.head));
    for (const [s, sg] of [['l', 1], ['r', -1]]) {
      B[s + 'Thigh'] = M(B.hips, tr(sg * D.hipX, -0.04, 0), eul(p[s + 'Thigh']));
      B[s + 'Shin'] = M(B[s + 'Thigh'], tr(0, -D.thigh, 0), eul(p[s + 'Shin']));
      B[s + 'Foot'] = M(B[s + 'Shin'], tr(0, -D.shin, 0), eul(p[s + 'Foot']));
      const S0 = [sg * D.sx, D.shY, 0];
      const k = ik(S0, p[s + 'Hand'], D.upper, D.fore, p[s + 'Pole']);
      B[s + 'Up'] = M(B.chest, tr(...S0), k.R1);
      B[s + 'Lo'] = M(B.chest, tr(...k.E), k.R2);
      B[s + 'Hand'] = M(B.chest, tr(...k.H), k.R2);
    }
    return B;
  }
  const handHang = (D, sg, a = 0, up = 0) => add([sg * D.sx, D.shY, 0], rotXv([sg * (D.armor ? 0.08 : 0.05), -(D.upper + D.fore) * 0.91 + up, 0.035], -a));
  function poseIdle(t, D) {
    const breath = Math.sin(t * Math.PI * 2 / 2.8) > 0.45 ? 1 : 0;
    const w = D.armor ? 0.06 : 0.035;
    return {
      hips: [0, 0, 0], spine: [0.02, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
      lThigh: [0, 0, w], lShin: [0, 0, 0], lFoot: [0, 0, -w], rThigh: [0, 0, -w], rShin: [0, 0, 0], rFoot: [0, 0, w],
      lHand: handHang(D, 1), lPole: [0.4, -0.1, -1], rHand: handHang(D, -1), rPole: [-0.4, -0.1, -1],
      drop: breath * 0.018, lift: 0
    };
  }
  function poseWalk(ph, D) {
    const a = ph * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), A = 0.42, arm = 0.34;
    const lf = A * s, rf = -A * s, w = D.armor ? 0.05 : 0.03;
    const lk = 0.1 + 0.55 * Math.pow(Math.max(0, c), 1.5), rk = 0.1 + 0.55 * Math.pow(Math.max(0, -c), 1.5);
    return {
      hips: [0, -0.07 * s, 0], spine: [0.06, 0, 0], chest: [0, 0.1 * s, 0], neck: [0, -0.05 * s, 0], head: [0, 0, 0],
      lThigh: [-lf, 0, w], lShin: [lk, 0, 0], lFoot: [lf - lk, 0, -w], rThigh: [-rf, 0, -w], rShin: [rk, 0, 0], rFoot: [rf - rk, 0, w],
      lHand: handHang(D, 1, -arm * s, 0.04 * Math.max(0, -s)), lPole: [0.3, -0.1, -1],
      rHand: handHang(D, -1, arm * s, 0.04 * Math.max(0, s)), rPole: [-0.3, -0.1, -1],
      drop: 0, lift: 0
    };
  }
  // running: longer stride, high knee on the swinging leg, bent arms, a short flight twice per cycle
  const runHand = (D, sg, a) => add([sg * D.sx, D.shY, 0], rotXv([sg * 0.035, -0.26, 0.17], -a));
  function poseRun(ph, D) {
    const a = ph * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), A = 0.6, arm = 0.62;
    const lf = A * s, rf = -A * s, w = D.armor ? 0.05 : 0.03;
    const lk = 0.3 + 1.25 * Math.pow(Math.max(0, c), 1.3), rk = 0.3 + 1.25 * Math.pow(Math.max(0, -c), 1.3);
    return {
      hips: [0.06, -0.1 * s, 0], spine: [0.16, 0, 0], chest: [0.03, 0.16 * s, 0], neck: [-0.14, -0.08 * s, 0], head: [-0.04, 0, 0],
      lThigh: [-lf - 0.1, 0, w], lShin: [lk, 0, 0], lFoot: [lf - lk * 0.62 + 0.1, 0, -w],
      rThigh: [-rf - 0.1, 0, -w], rShin: [rk, 0, 0], rFoot: [rf - rk * 0.62 + 0.1, 0, w],
      lHand: runHand(D, 1, -arm * s), lPole: [0.25, -0.35, -1],
      rHand: runHand(D, -1, arm * s), rPole: [-0.25, -0.35, -1],
      drop: 0, lift: 0.05 * Math.abs(Math.sin(a))
    };
  }
  function poseSit(t, D) {
    const breath = Math.sin(t * Math.PI * 2 / 3.2) > 0.45 ? 1 : 0;
    return {
      hips: [0, 0, 0], spine: [-0.08, 0, 0], chest: [0.03, 0, 0], neck: [0.04, 0, 0], head: [0.02, 0, 0],
      lThigh: [-1.48, 0, 0.13], lShin: [1.42, 0, 0], lFoot: [0.06, 0, -0.1], rThigh: [-1.48, 0, -0.13], rShin: [1.42, 0, 0], rFoot: [0.06, 0, 0.1],
      lHand: [0.16 * D.w + (D.armor ? 0.04 : 0), -0.2, 0.32], lPole: [0.7, -0.2, -0.6], rHand: [-0.16 * D.w - (D.armor ? 0.04 : 0), -0.2, 0.32], rPole: [-0.7, -0.2, -0.6],
      drop: breath * 0.018, lift: 0
    };
  }
  // on one knee, rummaging in the grass with both hands
  function poseKneel(t, D) {
    const r = Math.sin(t * 8.5) * 0.5 + 0.5, a = D.armor ? 0.05 : 0;
    return {
      hips: [0.2, 0, 0], spine: [0.5, 0, 0], chest: [0.32, 0, 0], neck: [-0.45, 0, 0], head: [0.2, 0.15, 0],
      lThigh: [-1.4, 0, 0.14], lShin: [1.5, 0, 0], lFoot: [0.0, 0, -0.08],
      rThigh: [-0.1, 0, -0.12], rShin: [1.62, 0, 0], rFoot: [0.55, 0, 0.06],
      lHand: [0.2 + a, 0.04 + 0.05 * r, 0.42], lPole: [0.7, 0.2, -0.3],
      rHand: [-0.2 - a, 0.04 + 0.05 * (1 - r), 0.44 + 0.04 * r], rPole: [-0.7, 0.2, -0.3],
      drop: 0, lift: 0
    };
  }
  // hanging from a bar; pull = 0 (arms straight) … 1 (chin over the bar). Hands are given in chest space.
  const hangHandY = (D, pull) => D.shY + 0.52 - pull * 0.38;
  function poseHang(t, pull, D) {
    const sw = Math.sin(t * 2.4) * 0.03, up = hangHandY(D, pull);
    return {
      hips: [sw, 0, 0], spine: [0.0, 0, 0], chest: [-0.05 * pull, 0, 0], neck: [-0.15 * pull, 0, 0], head: [-0.12 * pull, 0, 0],
      lThigh: [-0.1, 0, 0.05], lShin: [0.55, 0, 0], lFoot: [0.55, 0, -0.04],
      rThigh: [-0.24, 0, -0.03], rShin: [0.75, 0, 0], rFoot: [0.6, 0, 0.04],
      lHand: [D.sx + 0.05, up, 0.02 + 0.07 * pull], lPole: [1, -0.1, -0.5],
      rHand: [-D.sx - 0.05, up, 0.02 + 0.07 * pull], rPole: [-1, -0.1, -0.5],
      drop: 0, lift: 0
    };
  }
  // climbing a ladder that stands in front of the hero; ph runs 0..1 per two rungs
  function poseClimb(ph, D) {
    const k = 0.5 + 0.5 * Math.sin(ph * Math.PI * 2);
    return {
      hips: [0.06, 0, 0], spine: [0.12, 0, 0], chest: [0, 0, 0], neck: [-0.12, 0, 0], head: [-0.15, 0, 0],
      lThigh: [-0.25 - 0.95 * k, 0, 0.06], lShin: [0.35 + 1.15 * k, 0, 0], lFoot: [-0.1 - 0.15 * k, 0, -0.05],
      rThigh: [-0.25 - 0.95 * (1 - k), 0, -0.06], rShin: [0.35 + 1.15 * (1 - k), 0, 0], rFoot: [-0.1 - 0.15 * (1 - k), 0, 0.05],
      lHand: [D.sx * 0.8, D.shY + 0.08 + 0.28 * (1 - k), 0.27], lPole: [0.25, -1, -0.2],
      rHand: [-D.sx * 0.8, D.shY + 0.08 + 0.28 * k, 0.27], rPole: [-0.25, -1, -0.2],
      drop: 0, lift: 0
    };
  }
  // sitting on a slide: legs out along the chute, leaning back, hands on the rails
  function poseSlideSit(t, D) {
    return {
      hips: [0, 0, 0], spine: [-0.32, 0, 0], chest: [-0.06, 0, 0], neck: [0.32, 0, 0], head: [0.12, 0, 0],
      lThigh: [-1.42, 0, 0.1], lShin: [0.14, 0, 0], lFoot: [-0.25, 0, -0.06],
      rThigh: [-1.42, 0, -0.1], rShin: [0.14, 0, 0], rFoot: [-0.25, 0, 0.06],
      lHand: [0.29, -0.3, 0.02], lPole: [1, 0.1, -0.5], rHand: [-0.29, -0.3, 0.02], rPole: [-1, 0.1, -0.5],
      drop: 0, lift: 0
    };
  }
  // sitting on a swing; u = −1 (swinging back: legs tucked) … 1 (swinging forward: legs out, leaning back)
  function poseSwingSit(u, D) {
    const f = 0.5 + 0.5 * u, a = D.armor ? 0.04 : 0;
    return {
      hips: [0, 0, 0], spine: [-0.04 - 0.26 * f, 0, 0], chest: [0.02, 0, 0], neck: [0.12 * f, 0, 0], head: [0.04, 0, 0],
      lThigh: [-1.42 + 0.08 * f, 0, 0.1], lShin: [1.6 - 1.25 * f, 0, 0], lFoot: [0.1 - 0.2 * f, 0, -0.08],
      rThigh: [-1.42 + 0.08 * f, 0, -0.1], rShin: [1.6 - 1.25 * f, 0, 0], rFoot: [0.1 - 0.2 * f, 0, 0.08],
      lHand: [0.215 + a, 0.16 + 0.04 * f, -0.02 + 0.06 * f], lPole: [0.7, -1, -0.5],
      rHand: [-0.215 - a, 0.16 + 0.04 * f, -0.02 + 0.06 * f], rPole: [-0.7, -1, -0.5],
      drop: 0, lift: 0
    };
  }
  // getting into a machine: sitting on the hatch sill (legs inside, leaning forward), in the seat with hands on the levers
  function poseSill(lean, D) {
    return {
      hips: [0, 0, 0], spine: [lean, 0, 0], chest: [0.05, 0, 0], neck: [-lean * 0.6, 0, 0], head: [-0.05, 0, 0],
      lThigh: [-1.35, 0, 0.12], lShin: [1.2, 0, 0], lFoot: [0.15, 0, -0.08], rThigh: [-1.35, 0, -0.12], rShin: [1.2, 0, 0], rFoot: [0.15, 0, 0.08],
      lHand: handHang(D, 1), lPole: [0.4, -0.1, -1], rHand: handHang(D, -1), rPole: [-0.4, -0.1, -1], drop: 0, lift: 0
    };
  }
  function posePilot(t, D, lean) {
    const p = poseSit(t, D);
    p.spine = [lean - 0.06, 0, 0]; p.lHand = [0.19, -0.08, 0.36]; p.rHand = [-0.19, -0.08, 0.36];
    return p;
  }
  // curled up in a pod (a suit with a front hatch): a low seat, knees drawn up, hands on the grips beside the knees
  function posePod(t, D, lean) {
    const p = poseSit(t, D);
    p.hips = [0, 0, 0]; p.spine = [lean - 0.1, 0, 0]; p.chest = [0.06, 0, 0]; p.neck = [0.1, 0, 0];
    p.lThigh = [-1.95, 0, 0.17]; p.rThigh = [-1.95, 0, -0.17];
    p.lShin = [2.08, 0, 0]; p.rShin = [2.08, 0, 0];
    p.lFoot = [0.02, 0, -0.08]; p.rFoot = [0.02, 0, 0.08];
    p.lHand = [0.22 + (D.armor ? 0.04 : 0), -0.16, 0.3]; p.rHand = [-0.22 - (D.armor ? 0.04 : 0), -0.16, 0.3];
    p.lPole = [0.8, -0.3, -0.4]; p.rPole = [-0.8, -0.3, -0.4];
    return p;
  }
  // from → to by k: stand (at the hatch), climb, sill, seat or pod; back: a step backwards while lifting the hatch
  function poseBoard(a, D, t) {
    const get = (k) => k === 'climb' ? poseClimb(a.ph || 0, D) : k === 'sill' ? poseSill(a.lean || 0, D) : k === 'seat' ? posePilot(t, D, a.lean || 0) : k === 'pod' ? posePod(t, D, a.lean || 0) : poseIdle(t, D);
    let p = get(a.from);
    if (a.to && a.k > 0) p = lerpPose(p, get(a.to), a.k);
    if (a.back > 0) p = lerpPose(p, poseWalk(a.bph || 0, D), a.back);
    return p;
  }
  function lerpPose(a, b, t) {
    const o = {};
    for (const k in a) { const x = a[k], y = b[k]; o[k] = Array.isArray(x) ? x.map((v, i) => v + (y[i] - v) * t) : x + (y - x) * t; }
    return o;
  }
  // rifle holds in chest space
  const rifleLow = (D) => ({ g: [-0.1 - (D.sx - 0.212) * 0.6, 0.02, 0.24 + (D.armor ? 0.08 : 0)], d: nrm([0.45, -0.3, 0.84]), u: [0, 1, 0] });
  const rifleAim = (D) => ({ g: [-0.1 - (D.sx - 0.212) * 0.5, 0.29 + (D.armor ? 0.02 : 0), 0.2 + (D.armor ? 0.09 : 0)], d: nrm([0.04, 0, 1]), u: [0, 1, 0] });
  const SHOTS = [0.45, 0.57, 0.69, 1.12, 1.24, 1.36];
  const SHOOT_LEN = 2.05;
  function shootState(t) {
    const r = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
    const aim = smooth(r(0, 0.3, t)) * (1 - smooth(r(1.7, 2.0, t)));
    let kick = 0;
    for (const s of SHOTS) { const dt = t - s; if (dt >= 0 && dt < 0.16) kick = Math.max(kick, dt < 0.04 ? dt / 0.04 : 1 - (dt - 0.04) / 0.12); }
    return { aim, kick };
  }
  const SMOKE_INTRO = 1.7, SMOKE_PERIOD = 5.2, SMOKE_PUFFS = 3;
  function smokeLoop(u) {
    u = ((u % SMOKE_PERIOD) + SMOKE_PERIOD) % SMOKE_PERIOD;
    const b = u < 0.5 ? smooth(u / 0.5) : u < 1.3 ? 1 : u < 1.8 ? 1 - smooth((u - 1.3) / 0.5) : 0;
    return { b, inhale: u > 0.5 && u < 1.3, exhale: u > 1.8 && u < 2.7 };
  }
  function applySmoke(p, t, w, D) {
    const st = { cig: false, lit: false, hot: false, b: 0, pack: false, flame: false, exhale: false, inhale: false };
    const Mo = mouthC(D), atMouth = add(Mo, [-0.065, -0.012, 0.07]), hold = [-0.19 * D.w, -0.09, 0.22];
    if (t < SMOKE_INTRO) {
      const R = track(t, [[0, null], [0.35, [-0.03, 0.05, 0.3]], [0.5, [-0.03, 0.05, 0.3]], [0.72, [-0.11, 0.15, 0.3]], [1.0, atMouth], [1.7, atMouth]], p.rHand);
      const L = track(t, [[0, null], [0.35, [0.04, 0.03, 0.3]], [0.62, [0.04, 0.03, 0.3]], [0.95, null], [1.12, add(Mo, [0.035, -0.035, 0.09])], [1.38, add(Mo, [0.035, -0.035, 0.09])], [1.7, null]], p.lHand);
      p.rHand = lerpV(p.rHand, R, w); p.lHand = lerpV(p.lHand, L, w);
      p.rPole = lerpV(p.rPole, [-0.45, -1, 0.3], w); p.lPole = lerpV(p.lPole, [0.5, -1, 0.3], w);
      st.pack = t < 0.92; st.cig = t > 0.48; st.lit = t > 1.25; st.flame = t > 1.12 && t < 1.36; st.hot = st.flame;
      st.b = smooth((t - 0.72) / 0.28);
    } else {
      const s = smokeLoop(t - SMOKE_INTRO + 0.5);
      p.rHand = lerpV(p.rHand, lerpV(hold, atMouth, s.b), w);
      p.rPole = lerpV(p.rPole, [-0.45, -1, 0.3], w);
      if (s.exhale) p.neck[0] -= 0.1 * w;
      Object.assign(st, { cig: true, lit: true, hot: s.inhale, b: s.b, exhale: s.exhale, inhale: s.inhale });
    }
    return st;
  }
  const DRINK_INTRO = 0.9, DRINK_PERIOD = 3.4, DRINK_SIPS = 3;
  function drinkLoop(u) {
    u = ((u % DRINK_PERIOD) + DRINK_PERIOD) % DRINK_PERIOD;
    const b = u < 0.5 ? smooth(u / 0.5) : u < 1.4 ? 1 : u < 1.9 ? 1 - smooth((u - 1.4) / 0.5) : 0;
    return { b, sip: u > 0.55 && u < 1.35 ? 1 : 0 };
  }
  function applyDrink(p, t, w, D) {
    const st = { can: true, tilt: 0, spray: false };
    const Mo = mouthC(D), hold = [-0.2 * D.w, -0.08, 0.22], sip = add(Mo, [-0.03, 0.1, 0.12]);
    if (t < DRINK_INTRO) {
      const R = track(t, [[0, null], [0.35, [-0.05, 0.02, 0.28]], [0.6, [-0.05, 0.02, 0.28]], [0.9, hold]], p.rHand);
      const L = track(t, [[0, null], [0.32, [0.03, 0.08, 0.28]], [0.42, [-0.01, 0.13, 0.27]], [0.55, [0.03, 0.08, 0.28]], [0.9, null]], p.lHand);
      p.rHand = lerpV(p.rHand, R, w); p.lHand = lerpV(p.lHand, L, w);
      p.rPole = lerpV(p.rPole, [-0.8, -1, 0], w); p.lPole = lerpV(p.lPole, [0.5, -1, 0.2], w);
      st.spray = t > 0.42 && t < 0.62;
    } else {
      const s = drinkLoop(t - DRINK_INTRO);
      p.rHand = lerpV(p.rHand, lerpV(hold, sip, s.b), w);
      p.rPole = lerpV(p.rPole, [-0.8, -1, 0], w);
      p.neck[0] -= 0.14 * s.b * w; p.head[0] -= 0.2 * s.sip * w;
      st.tilt = s.b * w;
    }
    return st;
  }
  function punchState(t) {
    const r = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
    return { l: smooth(r(0.2, 0.32, t)) * (1 - smooth(r(0.4, 0.52, t))), r: smooth(r(0.56, 0.68, t)) * (1 - smooth(r(0.76, 0.9, t))), hitL: t > 0.3 && t < 0.42, hitR: t > 0.66 && t < 0.78 };
  }
  function applyPunch(p, t, w, D) {
    const st = punchState(t), a = D.armor ? 0.05 : 0;
    p.lHand = lerpV(p.lHand, lerpV([0.11 * D.w + a, 0.27, 0.27 + a], [0.05, 0.31, 0.56], st.l), w);
    p.rHand = lerpV(p.rHand, lerpV([-0.1 * D.w - a, 0.25, 0.23 + a], [-0.01, 0.31, 0.58], st.r), w);
    p.lPole = lerpV(p.lPole, [0.8, -1, -0.2], w); p.rPole = lerpV(p.rPole, [-0.8, -1, -0.2], w);
    p.chest[1] += (-0.18 * st.l + 0.34 * st.r) * w; p.hips[1] += (-0.1 + 0.12 * st.r) * w;
    p.lThigh = lerpV(p.lThigh, [-0.22, 0, 0.06], w); p.lShin = lerpV(p.lShin, [0.2, 0, 0], w); p.lFoot = lerpV(p.lFoot, [0.02, 0, -0.06], w);
    p.rThigh = lerpV(p.rThigh, [0.16, 0, -0.08], w); p.rShin = lerpV(p.rShin, [0.24, 0, 0], w); p.rFoot = lerpV(p.rFoot, [-0.4, 0, 0.08], w);
    p.spine[0] += 0.06 * w;
    return st;
  }
  // basketball shot: gather at the chest, dip, push up and release at THROW_REL
  const THROW_LEN = 1.35, THROW_REL = 0.7;
  function applyThrow(p, t, w, D) {
    const a = D.armor ? 0.05 : 0;
    const chest = [0, 0.1, 0.3 + a], over = [0, 0.47, 0.2 + a], rel = [0, 0.7, 0.36 + a];
    const H = track(t, [[0, null], [0.3, chest], [0.56, over], [0.7, rel], [0.95, rel], [1.3, null]], lerpV(p.lHand, p.rHand, 0.5));
    const hold = t < 0.3 ? smooth(t / 0.3) : t > 0.95 ? 1 - smooth((t - 0.95) / 0.35) : 1;
    const L = add(H, [0.1 + a, -0.02, -0.02]), R = add(H, [-0.1 - a, -0.02, -0.02]);
    p.lHand = lerpV(p.lHand, lerpV(p.lHand, L, hold), w); p.rHand = lerpV(p.rHand, lerpV(p.rHand, R, hold), w);
    p.lPole = lerpV(p.lPole, [0.9, -0.8, -0.2], w); p.rPole = lerpV(p.rPole, [-0.9, -0.8, -0.2], w);
    const dip = smooth((t - 0.3) / 0.22) * (1 - smooth((t - 0.56) / 0.12));
    for (const s of ['l', 'r']) { p[s + 'Thigh'][0] -= 0.35 * dip * w; p[s + 'Shin'][0] += 0.65 * dip * w; p[s + 'Foot'][0] -= 0.3 * dip * w; }
    p.lift += 0.07 * smooth((t - 0.6) / 0.1) * (1 - smooth((t - 0.8) / 0.15)) * w;
    p.head[0] -= 0.22 * w * hold; p.neck[0] -= 0.1 * w * hold;
    return { held: t < THROW_REL, ball: add(H, [0, 0.03, 0.09]) };
  }
  // right hand reaches a point given in chest space (intercom, roof edge), head looks at it
  function applyReach(p, t, w, D, target) {
    const k = smooth(t / 0.45) * (1 - smooth((t - 1.25) / 0.4));
    p.rHand = lerpV(p.rHand, target, k * w); p.rPole = lerpV(p.rPole, [-0.8, -0.6, -0.5], k * w);
    p.head[0] -= 0.18 * k * w * clamp(target[1] * 2, 0, 1);
  }
  // full pose from a context; used by the stage, the portrait, the catalog and tests
  function buildPose(c, D, hasRifle) {
    const tq = c.t;
    let p = poseIdle(tq, D);
    if (c.walkW > 0) {
      const g = c.runW > 0 ? lerpPose(poseWalk(c.phase, D), poseRun(c.phase, D), c.runW) : poseWalk(c.phase, D);
      p = lerpPose(p, g, c.walkW);
    }
    if (c.sitW > 0) p = lerpPose(p, poseSit(tq, D), c.sitW);
    const a = c.act;
    if (a && a.w > 0) {
      let q = null;
      if (a.kind === 'swing') q = poseSwingSit(a.u || 0, D);
      else if (a.kind === 'hang') q = poseHang(tq, a.pull || 0, D);
      else if (a.kind === 'climb') q = poseClimb(a.ph || 0, D);
      else if (a.kind === 'slide') q = poseSlideSit(tq, D);
      else if (a.kind === 'kneel') q = poseKneel(tq, D);
      else if (a.kind === 'board') q = poseBoard(a, D, tq);
      if (q) p = lerpPose(p, q, a.w);
    }
    const st = { smoke: null, drink: null, punch: null, shoot: null, thr: null };
    let mode = null;
    if (hasRifle) {
      if (c.shootW > 0) mode = 'hands';
      else if (c.sitW > 0.5 && c.seat) mode = 'seat';
      else if (c.smokeW > 0 || c.drinkW > 0 || c.punchW > 0 || c.throwW > 0 || c.reachW > 0 || (a && a.w > 0)) mode = 'back';
      else mode = 'hands';
    }
    const rifle = mode ? { mode } : null;
    if (mode === 'hands') {
      let h = rifleLow(D);
      if (c.shootW > 0) {
        const s = shootState(c.shootT), aim = rifleAim(D), k = s.kick * c.shootW, aw = s.aim * c.shootW;
        h = { g: lerpV(h.g, aim.g, aw), d: nrm(lerpV(h.d, aim.d, aw)), u: [0, 1, 0] };
        h.g = add(h.g, [0, 0, -0.035 * k]); h.d = nrm(add(h.d, [0, 0.15 * k, 0]));
        p.chest[0] -= 0.05 * k; p.head[0] += 0.08 * aw - 0.03 * k; p.head[2] += 0.1 * aw;
        if (c.sitW < 0.5) {
          p.lThigh = lerpV(p.lThigh, [-0.16, 0, 0.06], aw); p.lShin = lerpV(p.lShin, [0.12, 0, 0], aw); p.lFoot = lerpV(p.lFoot, [0.04, 0, -0.06], aw);
          p.rThigh = lerpV(p.rThigh, [0.12, 0, -0.08], aw); p.rShin = lerpV(p.rShin, [0.12, 0, 0], aw); p.rFoot = lerpV(p.rFoot, [-0.24, 0, 0.08], aw);
        }
        st.shoot = s;
      }
      p.rHand = h.g; p.lHand = add(add(h.g, scl(h.d, 0.2)), [0, -0.012, 0]);
      p.rPole = [-0.8, -1, -0.3]; p.lPole = [0.5, -1, 0.1];
      Object.assign(rifle, h);
    }
    if (c.smokeW > 0) st.smoke = applySmoke(p, c.smokeT, c.smokeW, D);
    if (c.drinkW > 0) st.drink = applyDrink(p, c.drinkT, c.drinkW, D);
    if (c.punchW > 0) st.punch = applyPunch(p, c.punchT, c.punchW, D);
    if (c.throwW > 0) st.thr = applyThrow(p, c.throwT, c.throwW, D);
    if (c.reachW > 0 && c.reachTo) applyReach(p, c.reachT, c.reachW, D, c.reachTo);
    return { p, rifle, st };
  }

