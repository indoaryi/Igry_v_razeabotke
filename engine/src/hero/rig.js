  // ================= posing a body: pose context → bones; the hero's draw list =================
  // Every body is posed the same way (bodyRig): the player's hero and the people alike. quant — in the steps of the 12 fps picture
  // (time, gait and overlay weights rounded, the feet on a whole pixel), as everything on the stage is drawn.
  import { FPS, S, UV } from '../core/camera.js';
  import { M, add, alongMinusY, alongPlusY, frameY, groundAt, invRigid, lerpV, mul, nrm, rotOnly, rx, scl, smooth, sub, tr, wpx, xf, xfDir } from '../core/math.js';
  import { mat } from '../render/materials.js';
  import { ellipsoid } from '../render/meshes.js';
  import { getMesh } from '../render/webgl.js';
  import { CIG_LEN, HC, PROPS, RIFLE, TIP_DIM, TIP_HOT, backZ } from './model.js';
  import { HERO, equip } from './wardrobe.js';
  import { buildPose, evalBones } from './skeleton.js';
  import { ACT, hero } from './hero.js';
  export const q = (t) => Math.floor(t * FPS) / FPS;
  export const wq = (w) => Math.round(w * 8) / 8;
  function bodyCtx(b, quant) {
    const Q = quant ? q : (t) => t, W = quant ? wq : (w) => w;
    let a = b.act ? ACT[b.act.kind].ctx(b.act) : null;
    if (a) {
      a = Object.assign({}, a, { w: W(a.w) });
      if (quant && a.ph != null) a.ph = Math.floor(a.ph * 8) / 8;
      if (quant && a.pull != null) a.pull = Math.round(a.pull * 10) / 10;
      if (quant && a.u != null) a.u = Math.round(a.u * 6) / 6;
    }
    return {
      t: Q(b.t), phase: quant ? Math.floor(b.phase * 12) / 12 : b.phase, walkW: W(b.walkW), runW: W(b.runW), sitW: W(smooth(b.sit)), seat: b.seat,
      smokeW: W(b.smoke.w), smokeT: Q(b.smoke.t), drinkW: W(b.drink.w), drinkT: Q(b.drink.t),
      punchW: W(b.punch.w), punchT: Q(b.punch.t), shootW: W(b.shoot.w), shootT: Q(b.shoot.t),
      throwW: W(b.thr.w), throwT: Q(b.thr.t), reachW: W(b.reach.w), reachT: Q(b.reach.t), reachTo: b.reach.to,
      talkW: W(b.talk.w), talkT: Q(b.talk.t), headYaw: quant ? Math.round(b.head * 8) / 8 : b.head, act: a
    };
  }
  export const PXV = S * UV[1];   // screen px per metre of height
  // a body's bones: D — his proportions, rifle — a rifle in his hands (it changes how the arms hang)
  export function bodyRig(b, D, rifle, quant) {
    const c = bodyCtx(b, quant);
    const pose = buildPose(c, D, rifle);
    const base = b.act ? ACT[b.act.kind].base(b.act, D) : null;
    const yaw = (b.shoot.on || b.shoot.w > 0) && b.aimYaw != null ? b.aimYaw : (b.sit > 0 && b.seat ? b.seat.yaw : b.yaw);
    let root = [b.x, b.y, b.z];
    if (quant) {
      const s = wpx([b.x, 0, b.z]), g = groundAt(Math.round(s[0]), Math.round(s[1]));
      root = [g[0], Math.round(b.y * PXV) / PXV, g[1]];
    }
    let B = evalBones(pose.p, root, yaw, D, base);
    const hw = b.act && ACT[b.act.kind].hands ? ACT[b.act.kind].hands(b.act) : null;
    if (hw && hw.w > 0) {
      const inv = invRigid(B.chest), p = pose.p;
      p.lHand = lerpV(p.lHand, xf(inv, hw.l), hw.w); p.rHand = lerpV(p.rHand, xf(inv, hw.r), hw.w);
      p.lPole = lerpV(p.lPole, [0.8, -0.5, -0.5], hw.w); p.rPole = lerpV(p.rPole, [-0.8, -0.5, -0.5], hw.w);
      B = evalBones(p, root, yaw, D, base);
    }
    return { c, pose, B, base, root, yaw };
  }
  export const heroRig = (quant) => bodyRig(hero, HERO.D, equip.hands === 'rifle', quant);
  // what a pose context comes to, as text: the stage and the people redraw when it changes
  export const poseKey = (c) => [c.t, c.phase, c.walkW, c.runW, c.sitW, c.smokeW, c.smokeT, c.drinkW, c.drinkT, c.punchW, c.punchT, c.shootW, c.shootT, c.throwW, c.throwT,
    c.reachW, c.reachT, c.talkW, c.talkT, c.headYaw, c.act ? JSON.stringify(c.act) : ''].join(',');
  // where the rifle is (its grip, the muzzle along +z): in the hands, slung on the back, or leaning by the seat he sits on
  export function rifleWorld(rifle, B, D, seat) {
    if (!rifle) return null;
    if (rifle.mode === 'hands') return M(B.chest, tr(...rifle.g), frameY(rifle.u, rifle.d));
    if (rifle.mode === 'back') {
      const bz = D.armor ? -0.355 : backZ(D, 0.1, 0.024) - 0.035;
      return M(B.chest, tr(0, 0.1, bz), frameY([0, 0, -1], nrm([0.55, 0.83, 0])), tr(0, 0, -0.16));
    }
    return seat ? seat.rifleM : null;
  }
  export const BALL_MESH = () => getMesh('ball', () => ellipsoid(0.12, 0.12, 0.12, { seg: 12, rings: 8 }));
  export const BALL_MAT = mat('#d9692b', { pat: 41, p: [0.007, 0.085, 0, 0], noise: 0.03, grain: 60 });
  export function heroList(B, pose, opts = {}) {
    const out = [];
    const want = opts.groups;
    for (const pt of HERO.parts) {
      if (want && !want.includes(pt.group)) continue;
      out.push({ mesh: pt.mesh, model: mul(B[pt.bone], pt.off), mat: pt.mat, id: 1 });
    }
    if (opts.noProps) return out;
    const D = HERO.D;
    const RW = rifleWorld(pose.rifle, B, D, hero.seat);
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
    // what he throws: the game's own prop (hero.thr.prop = { mesh(), mat }) or the basketball
    if (th && th.held) { const pr = hero.thr.prop; out.push({ mesh: pr ? pr.mesh() : BALL_MESH(), model: M(tr(...xf(B.chest, th.ball)), rx(hero.t * 2)), mat: pr ? pr.mat : BALL_MAT, id: 1 }); }
    return out;
  }

