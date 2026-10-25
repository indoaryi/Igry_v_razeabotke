  // ================= the hero's orders and his step: walking, the queue of orders, the overlays of his hands =================
  // Who he is (the record, the activities) is in hero.js; the world's step that calls heroStep is in core/run.js.
  // events of the hero other modules listen to: shot() — a round leaves the muzzle (fx2d.js draws it and lands the hit)
  import { M, approach, approachAngle, frameY, tr, wrapA } from '../core/math.js';
  import { GAME, TEXTS, hook } from '../core/game.js';
  import { toast } from '../core/toast.js';
  import { LOC_HOOKS } from '../world/map.js';
  import { savePart } from '../world/state.js';
  import { actionsOf, groundY, toWorld2 } from '../world/instances.js';
  import { GH, GW } from '../world/ground.js';
  import { NAV, blockedAt, findPath } from '../world/nav.js';
  import { exitAt } from '../world/locations.js';
  import { equip } from './wardrobe.js';
  import { blendOverlays, cycleOf, endOverlays, settle, speedOf, walkAlong } from './body.js';
  import { ACT, armored, driving, hero, yawTo } from './hero.js';
  import { heroRig } from './rig.js';
  export const HERO_EVENTS = { shot: [] };
  export function startAct(kind, inst, opts = {}) {
    hero.act = Object.assign({ kind, inst, st: 0, w: 0, stage: opts.stage || ACT[kind].first || 'go', leave: false, done: false }, opts);
    hero.path.length = 0;
  }
  const handsFree = () => !!(hero.act && ACT[hero.act.kind].handsFree && ACT[hero.act.kind].handsFree(hero.act));
  export const busyAct = () => hero.act && !handsFree();

  // ---------- commands ----------
  // a new order replaces the old one at once: the hero drops the rest of his way, even mid-step, and heads off from where he stands
  function clearPlans() {
    hero.path.length = 0; hero.queue = []; hero.target = null;
    const th = hero.thr;
    if (th.on && !th.released && th.drop) { th.drop(); th.released = true; }     // a throw cut short: the thing drops at his feet
  }
  function leaveCmds() {
    const out = [];
    if (hero.act) out.push({ type: 'leave' });
    if (hero.sitTarget === 1 || hero.sit > 0) out.push({ type: 'stand' }, { type: 'goto', x: hero.seat ? hero.seat.front[0] : hero.x, z: hero.seat ? hero.seat.front[1] : hero.z });
    return out;
  }
  export function plan(...cmds) {
    hero.punch.on = false; hero.thr.on = false; hero.reach.on = false;
    if (!handsFree()) hero.shoot.on = false;
    const lv = leaveCmds(); clearPlans();
    if (hero.act) hero.act.leave = true;
    hero.queue.push(...lv, ...cmds);
  }
  // the queue: path (walk round obstacles to `to`), goto (straight), face, turned (wait until he has turned), sit, stand,
  // act (start an activity), call (run fn), shoot / waitShoot, punch, throw / waitThrow, reach / waitReach
  function runQueue() {
    while (hero.queue.length) {
      const c = hero.queue[0];
      if (c.type === 'path') {
        hero.queue.shift();
        const pts = findPath([hero.x, hero.z], c.to, hero.vehicle ? NAV.big : NAV.hero);
        if (!pts) { if (c.fail) c.fail(); continue; }
        let L = 0, p = [hero.x, hero.z];
        for (const q of pts) { L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; }
        hero.run = c.run ?? L > 6.5;
        for (const q of pts) if (Math.hypot(q[0] - hero.x, q[1] - hero.z) > 0.02 || pts.length > 1) hero.path.push({ x: q[0], z: q[1] });
        if (hero.path.length) return;
        continue;
      }
      if (c.type === 'goto') { hero.queue.shift(); if (Math.hypot(c.x - hero.x, c.z - hero.z) > 0.01) { hero.path.push({ x: c.x, z: c.z, back: !!c.back }); hero.run = false; return; } continue; }
      if (c.type === 'face') { hero.queue.shift(); hero.tyaw = c.yaw; continue; }
      if (c.type === 'turned') { if (Math.abs(wrapA(hero.yaw - hero.tyaw)) > 0.06) return; hero.queue.shift(); continue; }
      if (c.type === 'sit') { hero.seat = c.seat; hero.sitTarget = 1; if (hero.sit < 1) return; hero.queue.shift(); continue; }
      if (c.type === 'stand') { hero.sitTarget = 0; if (hero.sit > 0) return; hero.seat = null; hero.queue.shift(); continue; }
      if (c.type === 'act') { hero.queue.shift(); startAct(c.kind, c.inst, c.opts); return; }
      if (c.type === 'leave') { hero.queue.shift(); continue; }
      if (c.type === 'call') { hero.queue.shift(); c.fn(); continue; }
      if (c.type === 'shoot') { hero.queue.shift(); startShoot(); continue; }
      if (c.type === 'waitShoot') { if (hero.shoot.on || hero.shoot.w > 0) return; hero.queue.shift(); continue; }
      if (c.type === 'punch') { hero.queue.shift(); hero.smoke.on = false; hero.drink.on = false; hero.punch.on = true; hero.punch.t = 0; continue; }
      if (c.type === 'throw') { hero.queue.shift(); beginThrow(c); continue; }
      if (c.type === 'waitThrow') { if (hero.thr.on || hero.thr.w > 0) return; hero.queue.shift(); continue; }
      if (c.type === 'reach') { hero.queue.shift(); Object.assign(hero.reach, { on: true, t: 0, to: c.to, cb: c.cb, fired: false }); continue; }
      if (c.type === 'waitReach') { if (hero.reach.on || hero.reach.w > 0) return; hero.queue.shift(); continue; }
      hero.queue.shift();
    }
  }

  // ---------- overlays: the engine starts them; the game decides when they are allowed (items, gear) ----------
  // shooting aims at hero.aimAt: a target { pos: world point, state: 'up' while it can be hit, onHit(away, hx, hy) } (see fireShot)
  export function startShoot() {
    const t = hero.aimAt;
    if (!t) return;
    hero.aimYaw = yawTo(t.pos[0], t.pos[2]);
    hero.tyaw = hero.aimYaw;
    hero.smoke.on = false; hero.drink.on = false; hero.punch.on = false;
    hero.shoot.on = true; hero.shoot.t = 0;
  }
  // in a machine (or climbing into one) his hands are on the levers
  export const inMachine = () => { if (!hero.inside && !(hero.act && ACT[hero.act.kind].vehicle)) return false; toast(TEXTS.inVehicle); return true; };
  export function beginSmoke() {
    hero.drink.on = false; hero.punch.on = false; hero.shoot.on = false;
    hero.smoke.on = true; hero.smoke.t = 0; hero.smoke.w = 0;
  }
  export function beginDrink() {
    hero.smoke.on = false; hero.punch.on = false; hero.shoot.on = false;
    hero.drink.on = true; hero.drink.t = 0; hero.drink.w = 0;
  }
  // a throw: c = { inst, grab(), release(rig) when it leaves his hands, drop() if the throw is cut short, prop: { mesh(), mat } in his hands }
  function beginThrow(c) {
    hero.smoke.on = false; hero.drink.on = false;
    Object.assign(hero.thr, { on: true, t: 0, inst: c.inst, released: false, release: c.release || null, drop: c.drop || null, prop: c.prop || null });
    if (c.grab) c.grab();
  }

  // ---------- walking up to things ----------
  export const spotOf = (inst, kind) => inst.spots.find((s) => !kind || s.kind === kind) || inst.spots[0];
  export const goSpot = (sp, run) => [{ type: 'path', to: sp.w, run }, { type: 'goto', x: sp.w[0], z: sp.w[1] }, { type: 'face', yaw: sp.wyaw }, { type: 'turned' }];
  export function noArmor(msg) { if (!armored()) return false; toast(msg + ' Сними броню в снаряжении.'); return true; }
  // the seats of a thing (built.seats: { x, z, yaw, rifle }) in the world: where he sits, where he stands to sit down
  export function seatsOf(inst) {
    return (inst.built.seats || []).map((s) => {
      const w = toWorld2(inst.M0, [s.x, s.z]), f = toWorld2(inst.M0, [s.x, s.z + 0.58]);
      return { inst, s, at: w, front: f, yaw: wrapA(inst.yaw0 + s.yaw), rifleM: M(inst.M0, tr(...s.rifle), frameY([0, 0, 1], [Math.sign(s.rifle[0] - s.x) || 1, 0, 0]), tr(0, 0, -0.16)) };
    });
  }
  export function goSit(inst) {
    const seats = seatsOf(inst).filter((s) => !(hero.seat && hero.seat.s === s.s));
    seats.sort((a, b) => Math.hypot(a.at[0] - hero.x, a.at[1] - hero.z) - Math.hypot(b.at[0] - hero.x, b.at[1] - hero.z));
    const st = seats[0];
    plan({ type: 'path', to: st.front }, { type: 'goto', x: st.front[0], z: st.front[1] }, { type: 'face', yaw: st.yaw }, { type: 'turned' },
      { type: 'goto', x: st.at[0], z: st.at[1], back: true }, { type: 'sit', seat: st });
  }
  export function doDefault(inst) {
    // from inside a machine, tapping a thing walks the machine up to it
    if (driving()) { if (inst !== hero.vehicle) { const c = inst.center || inst.def.at; walkTo(c[0], c[1]); } return; }
    const a = actionsOf(inst)[0]; if (a && !a.off) a.run(); else if (a && a.off) toast(TEXTS.searched);
  }
  export function walkTo(x, z) {
    hero.thr.on = false;
    plan({ type: 'path', to: [x, z] });
    hero.target = [x, z];
  }
  export function standUp() { plan(); }
  export function doPunch() { if (inMachine()) return; plan({ type: 'punch' }); }
  export function turn(d) {
    if (driving()) return;
    if (hero.path.length || hero.sit > 0 || hero.sitTarget || hero.shoot.on || busyAct()) return;
    hero.tyaw = wrapA(hero.tyaw + d * Math.PI / 4);
  }

  // ================= the hero's step (core/run.js calls it first in the world's step) =================
  // what ends his overlays needs from the rest of him: an activity that keeps his hands, the shot event, his pose for a throw
  const HERO_ENDS = { busy: () => busyAct(), shot: () => { for (const f of HERO_EVENTS.shot) f(); for (const f of GAME.noise) f(hero.x, hero.z, 'shot', hero); }, rig: () => heroRig(false) };
  export function heroStep(dt) {
    hero.t += dt;
    if (!hero.path.length && !hero.act) runQueue();     // a fresh order starts this very frame
    if (hero.act) {
      if (hero.queue.length && hero.queue[0].type === 'leave') hero.act.leave = true;
      ACT[hero.act.kind].update(hero.act, dt);
      if (hero.act.done) { const a = hero.act; hero.act = null; hero.y = groundY(hero.x, hero.z); if (a.after) a.after(); }
    } else if (hero.path.length && !driving()) walkAlong(hero, speedOf(hero) * dt, cycleOf(hero));
    hero.yaw = approachAngle(hero.yaw, hero.tyaw, dt * (hero.path.length ? 15 : hero.turn));
    hero.head = approach(hero.head, hero.headTo, dt * 3);       // a head turned aside (a person control has just passed to) comes back to the front
    if (!hero.path.length && !hero.act) runQueue();
    if (!hero.path.length && hero.target && Math.hypot(hero.target[0] - hero.x, hero.target[1] - hero.z) < 0.35) hero.target = null;
    const moving = hero.path.length > 0 && !hero.act && !driving();
    settle(hero, dt, moving, moving && hero.run);
    const shotT = hero.shoot.t;
    blendOverlays(hero, dt);
    endOverlays(hero, shotT, HERO_ENDS);
  }

  // ================= arriving in a location: the hero takes his place at the spawn (before anyone else settles in) =================
  // or, driving a machine, the machine module moves it there after him (see machine.js); a spawn with `walk` sends him a few steps in
  hook(LOC_HOOKS.enter, (def, spawnName) => {
    const sp = def.spawns[spawnName] || def.spawns.start;
    hero.x = sp.at[0]; hero.z = sp.at[1]; hero.y = groundY(hero.x, hero.z); hero.yaw = hero.tyaw = sp.yaw;
    hero.path.length = 0; hero.queue.length = 0; hero.target = null; hero.focus = null; hero.aimAt = null;
    if (!hero.vehicle) { hero.act = null; hero.sit = hero.sitTarget = 0; hero.seat = null; }
    hero.arrived = true;
    if (sp.walk) hero.queue.push({ type: 'path', to: sp.walk, run: false });
  }, 0);

  // ================= the hero in a save: where he stood, which way he looked, what he wore =================
  // he is put back only where he can stand (not on a height he climbed, not inside something that has moved there since);
  // the game checks the gear against his things itself (he may have sold the armour)
  savePart('hero', {
    save: () => ({ x: hero.x, z: hero.z, y: hero.y, yaw: hero.yaw, equip: Object.assign({}, equip) }),
    load: (d) => {
      if (d.equip) for (const k of ['body', 'head', 'hands']) if (k in d.equip && (d.equip[k] === null || typeof d.equip[k] === 'string')) equip[k] = d.equip[k];
      if (Number.isFinite(d.x) && Number.isFinite(d.z) && !(d.y > 0.05) && d.x > 0 && d.x < GW && d.z > 0 && d.z < GH && !blockedAt(d.x, d.z)) {
        hero.x = d.x; hero.z = d.z; hero.arrived = !!exitAt(hero.x, hero.z);
      }
      if (Number.isFinite(d.yaw)) hero.yaw = hero.tyaw = d.yaw;
    }
  });
