  // ================= hero rig: pose context → bones → draw list =================
  const q = (t) => Math.floor(t * FPS) / FPS;
  const wq = (w) => Math.round(w * 8) / 8;
  function heroCtx(quant) {
    const Q = quant ? q : (t) => t, W = quant ? wq : (w) => w;
    let a = hero.act ? ACT[hero.act.kind].ctx(hero.act) : null;
    if (a) {
      a = Object.assign({}, a, { w: W(a.w) });
      if (quant && a.ph != null) a.ph = Math.floor(a.ph * 8) / 8;
      if (quant && a.pull != null) a.pull = Math.round(a.pull * 10) / 10;
      if (quant && a.u != null) a.u = Math.round(a.u * 6) / 6;
    }
    return {
      t: Q(hero.t), phase: quant ? Math.floor(hero.phase * 12) / 12 : hero.phase, walkW: W(hero.walkW), runW: W(hero.runW), sitW: W(smooth(hero.sit)), seat: hero.seat,
      smokeW: W(hero.smoke.w), smokeT: Q(hero.smoke.t), drinkW: W(hero.drink.w), drinkT: Q(hero.drink.t),
      punchW: W(hero.punch.w), punchT: Q(hero.punch.t), shootW: W(hero.shoot.w), shootT: Q(hero.shoot.t),
      throwW: W(hero.thr.w), throwT: Q(hero.thr.t), reachW: W(hero.reach.w), reachT: Q(hero.reach.t), reachTo: hero.reach.to, act: a
    };
  }
  const PXV = S * UV[1];   // screen px per metre of height
  function heroRig(quant) {
    const c = heroCtx(quant), D = HERO.D;
    const pose = buildPose(c, D, equip.hands === 'rifle');
    const base = hero.act ? ACT[hero.act.kind].base(hero.act, D) : null;
    const yaw = (hero.shoot.on || hero.shoot.w > 0) && hero.aimYaw != null ? hero.aimYaw : (hero.sit > 0 && hero.seat ? hero.seat.yaw : hero.yaw);
    let root = [hero.x, hero.y, hero.z];
    if (quant) {
      const s = wpx([hero.x, 0, hero.z]), g = groundAt(Math.round(s[0]), Math.round(s[1]));
      root = [g[0], Math.round(hero.y * PXV) / PXV, g[1]];
    }
    let B = evalBones(pose.p, root, yaw, D, base);
    const hw = hero.act && ACT[hero.act.kind].hands ? ACT[hero.act.kind].hands(hero.act) : null;
    if (hw && hw.w > 0) {
      const inv = invRigid(B.chest), p = pose.p;
      p.lHand = lerpV(p.lHand, xf(inv, hw.l), hw.w); p.rHand = lerpV(p.rHand, xf(inv, hw.r), hw.w);
      p.lPole = lerpV(p.lPole, [0.8, -0.5, -0.5], hw.w); p.rPole = lerpV(p.rPole, [-0.8, -0.5, -0.5], hw.w);
      B = evalBones(p, root, yaw, D, base);
    }
    return { c, pose, B, base, root, yaw };
  }
  function rifleWorld(rifle, B, D) {
    if (!rifle) return null;
    if (rifle.mode === 'hands') return M(B.chest, tr(...rifle.g), frameY(rifle.u, rifle.d));
    if (rifle.mode === 'back') {
      const bz = D.armor ? -0.355 : backZ(D, 0.1, 0.024) - 0.035;
      return M(B.chest, tr(0, 0.1, bz), frameY([0, 0, -1], nrm([0.55, 0.83, 0])), tr(0, 0, -0.16));
    }
    return hero.seat ? hero.seat.rifleM : null;
  }
  const BALL_MESH = () => getMesh('ball', () => ellipsoid(0.12, 0.12, 0.12, { seg: 12, rings: 8 }));
  const BALL_MAT = mat('#d9692b', { pat: 41, p: [0.007, 0.085, 0, 0], noise: 0.03, grain: 60 });
  function heroList(B, pose, opts = {}) {
    const out = [];
    const want = opts.groups;
    for (const pt of HERO.parts) {
      if (want && !want.includes(pt.group)) continue;
      out.push({ mesh: pt.mesh, model: mul(B[pt.bone], pt.off), mat: pt.mat, id: 1 });
    }
    if (opts.noProps) return out;
    const D = HERO.D;
    const RW = rifleWorld(pose.rifle, B, D);
    if (RW) for (const r of RIFLE) out.push({ mesh: r.mesh, model: mul(RW, r.off), mat: r.mat, id: 1 });
    const sm = pose.st.smoke, dr = pose.st.drink, th = pose.st.thr;
    const hand = xf(B.rHand, [0, 0, 0]);
    if (sm && sm.cig) {
      const mouth = xf(B.head, [0, HC[1] - 0.045, HC[2] + 0.1]);
      const toMouth = nrm(sub(mouth, hand)), rest = nrm(xfDir(B.chest, [-0.45, 0.35, 0.85]));
      const u = nrm(lerpV(rest, scl(toMouth, -1), smooth(sm.b)));
      const filter = add(hand, scl(u, -(0.03 + 0.015 * smooth(sm.b))));
      out.push({ mesh: PROPS.cig.mesh, model: M(tr(...filter), alongMinusY(u)), mat: PROPS.cig.mat, id: 1 });
      if (sm.lit) out.push({ mesh: PROPS.tip.mesh, model: tr(...add(filter, scl(u, CIG_LEN + 0.004))), mat: sm.hot ? TIP_HOT : TIP_DIM, tip: true, id: 1 });
    }
    if (sm && sm.pack) { const lh = xf(B.lHand, [0, 0, 0]); out.push({ mesh: PROPS.pack.mesh, model: M(tr(...lh), rotOnly(B.chest), tr(0, 0.035, 0.03)), mat: PROPS.pack.mat, id: 1 }); }
    if (dr && dr.can) {
      const up = xfDir(B.chest, [0, 1, 0.1]), sipAx = xfDir(B.chest, [0.05, -0.75, -0.65]);
      out.push({ mesh: PROPS.can.mesh, model: M(tr(...hand), alongPlusY(lerpV(up, sipAx, dr.tilt)), tr(0, -0.06, 0)), mat: PROPS.can.mat, can: true, id: 1 });
    }
    if (th && th.held) out.push({ mesh: BALL_MESH(), model: M(tr(...xf(B.chest, th.ball)), rx(hero.t * 2)), mat: BALL_MAT, id: 1 });
    return out;
  }

