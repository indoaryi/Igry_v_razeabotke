  // ================= people's minds: what a person does when nobody tells him — his day, his habits, what he notices =================
  // The behaviours of the engine, as entries of MIND (people.js); a game adds its own the same way.
  //   post   — stands at his place: turns his head to the hero, says hello, looks round, steps aside and comes back
  //   sit    — sits at a seat (a bench) near a point and follows the hero with his eyes
  //   patrol — walks round his points, pausing at each
  //   away   — is indoors, through the door of a thing: out of the world until his day brings him back
  //   follow, wait — the hero's orders: they outrank his day; home — on his way back to it; talk — faces the hero (talk.js)
  // His day — def.day: [{ h: hour, do: behaviour, at: [x, z], yaw, loc, near, door, points, note, say }, …] by the hour; the entry in
  // force is the last one begun by then (before the first, the night's last). Without a day he keeps his post where he was put.
  // When the hour's entry changes he goes (mode home) — through an exit if his day takes him to another location. Out of the hero's
  // sight he is simply where his day says, a little later; if his day brings him to where the hero is, he comes in through the exit
  // (or out of his door) and walks. A jump of the clock (daySet) puts everyone where that hour has them at once.
  // What he notices — GAME.noise: a shot, a machine's footfall. He turns to it and says a word (barks[kind]); the game decides more in
  // def.on[kind](p, source, distance). The engine's own noises: 'shot' (hero/state.js), 'stomp' (machine/machine.js).
  import { approachAngle, clamp, wrapA } from '../core/math.js';
  import { GAME, hook } from '../core/game.js';
  import { LOCATIONS, LOC_HOOKS, MAP } from '../world/map.js';
  import { INST, groundY } from '../world/instances.js';
  import { GH, GW } from '../world/ground.js';
  import { NAV, blockedAt, nearestFree } from '../world/nav.js';
  import { DAY } from '../world/daytime.js';
  import { driving, hero, heroHidden } from '../hero/hero.js';
  import { seatsOf, spotOf } from '../hero/state.js';
  import { travelState } from '../hero/travel.js';
  import { DICE, MIND, PEOPLE, PEOPLE_HOOKS, atHome, dropPersonInst, personBark, personGo, personHere, personInst, personSay, seatTaken } from './people.js';

  // ---------- his day: which entry is in force, and where it puts him ----------
  let lastHour = null;                 // the hour at the last step: a jump of the clock is told from its running
  const hourOf = (e) => e.h;
  function planOf(p) {
    const D = p.def.day;
    if (!D || !D.length) return { key: -1, e: { do: 'post', at: p.def.at, yaw: p.def.yaw || 0, loc: p.def.loc } };
    const h = DAY.t;
    let k = D.length - 1;
    for (let i = 0; i < D.length; i++) if (hourOf(D[i]) <= h) k = i;
    return { key: k, e: D[k] };
  }
  // the place of an entry: its location, the point he stands at (or near), which way he faces
  function placeOf(p) {
    const { key, e } = planOf(p);
    return { key, do: MIND[e.do] ? e.do : 'post', loc: e.loc || p.def.loc, at: e.at || e.near || p.home.at, yaw: e.yaw ?? p.home.yaw, e };
  }
  // his place for now (p.home) follows his day: the orders and the panel («Ступай на место», the entry's note) read it
  function setHome(p, pl) { p.home = { loc: pl.loc, at: pl.at.slice(), yaw: pl.yaw, note: pl.e.note || null }; }
  const pick = (v) => Array.isArray(v) ? v[Math.floor(DICE() * v.length)] : v;
  const isOrder = (m) => !!(MIND[m] && MIND[m].order);
  const free = (m) => !isOrder(m) && m !== 'talk' && m !== 'home';        // doing his day's thing: a new hour may send him elsewhere

  // he begins his day's behaviour where he stands
  function startPlan(p) {
    const pl = placeOf(p);
    p.mode = pl.do; p.prevMode = null; p.planKey = pl.key; p.homeT = 0;
    setHome(p, pl);
    const M = MIND[pl.do];
    if (M.enter) M.enter(p, pl);
    if (pl.e.say) personSay(p, pick(pl.e.say));
  }
  // he is put down where his day has him at this hour — no walking: out of sight, or when the clock jumped.
  // His entry in the world goes; one is made again when he is in sight (people.js: LOC_HOOKS.objects / enter), then restored to the behaviour
  function placeAt(p, pl) {
    dropPersonInst(p);
    p.loc = pl.loc; p.away = pl.do === 'away';
    p.x = pl.at[0]; p.z = pl.at[1]; p.yaw = p.tyaw = pl.yaw;
    p.path.length = 0; p.queue.length = 0; p.seat = null; p.sit = p.sitTarget = 0; p.bark = null; p.road = -1; p.delay = 0;
    p.mode = pl.do; p.prevMode = null; p.planKey = pl.key; p.restore = true;
    if (p.away) { p.awayE = pl.e; p.awayAt = pl.at; p.awayDoor = null; }     // which door he will come out of (found when the location is in sight)
    setHome(p, pl);
  }
  // in sight again (the hero is here): his entry and the behaviour as it should look by now
  function show(p) {
    if (p.away || p.loc !== MAP.id || p.travel || p === hero) return;
    if (!p.inst) { p.y = groundY(p.x, p.z); personInst(p); }
    if (p.restore) { p.restore = false; const M = MIND[p.mode]; if (M && M.restore) M.restore(p); }
  }
  // the first time a location is built, everyone not yet placed (a new game) stands where the hour has him; then their entries are made
  hook(LOC_HOOKS.objects, () => { lastHour = DAY.t; for (const p of PEOPLE) if (!p.placed && p !== hero) { p.placed = true; placeAt(p, placeOf(p)); } }, 11);
  hook(LOC_HOOKS.objects, () => { for (const p of PEOPLE) show(p); }, 13);
  LOC_HOOKS.enter.push(() => { for (const p of PEOPLE) show(p); });
  // a saved person: his place is his day's, his key the hour's — he goes on with what the save says he was doing
  PEOPLE_HOOKS.loaded.push((p) => { const pl = placeOf(p); p.planKey = pl.key; setHome(p, pl); });

  // ---------- the hours pass ----------
  // in sight: a new entry sends him on his way; out of sight: a while later he is where it says (through the exit, if the hero is there)
  function planCheck(p) {
    if (p.mode === 'talk' || p.mode === 'home') return;        // he picks his day up when it is over
    const pl = placeOf(p);
    if (pl.key === p.planKey) return;
    p.planKey = pl.key; setHome(p, pl);
    if (isOrder(p.mode)) return;                                // the hero's order holds; his place is known for «Ступай на место»
    p.mode = 'home'; p.path.length = 0; p.homeT = 0;
    if (!p.seat && !p.sitTarget) p.queue.length = 0;
  }
  // how long his way takes out of sight: to another location — a while; within his own — by the distance
  const roadTime = (p, pl) => pl.loc !== p.loc ? 8 : clamp(Math.hypot(pl.at[0] - p.x, pl.at[1] - p.z) / 1.3 + 0.5, 0.5, 12);
  function offStep(p, dt) {
    if (isOrder(p.mode) || p.mode === 'talk') return;        // where the hero left him he stays
    const pl = placeOf(p), changed = p.planKey !== pl.key;
    if (changed) { p.planKey = pl.key; setHome(p, pl); }
    if (p.mode !== 'home') { if (!changed) return; p.mode = 'home'; p.road = -1; }
    if (p.road < 0) { p.road = roadTime(p, pl); return; }      // he sets out (p.road < 0: not on his way yet)
    p.road -= dt;
    if (p.road > 0) return;
    p.road = -1;
    if (pl.loc === MAP.id) arrive(p, pl); else placeAt(p, pl);
  }
  // he comes into the hero's location: out of his door, or through the exit from where he was; then he walks to his place
  function arrive(p, pl) {
    const from = p.loc, wasAway = p.away && from === MAP.id;
    const door = wasAway ? p.awayDoor || (p.awayE && doorOf(p.awayE, p.awayAt)) : null;
    let at = null, yaw = 0;
    if (door) { at = [door[0], door[1]]; yaw = wrapA(door[2] + Math.PI); }
    else {
      const e = (LOCATIONS[from] && LOCATIONS[from].exits || []).find((x) => x.to === MAP.id);
      const sp = (e && MAP.spawns[e.arrive]) || MAP.spawns.start;
      let bx = sp.at[0], bz = sp.at[1];
      if (sp.walk) { const dx = sp.walk[0] - bx, dz = sp.walk[1] - bz, d = Math.hypot(dx, dz) || 1; bx -= dx / d * 0.7; bz -= dz / d * 0.7; }
      at = [clamp(bx, 0.3, GW - 0.3), clamp(bz, 0.3, GH - 0.3)]; yaw = sp.yaw;
    }
    const g = blockedAt(at[0], at[1], NAV.hero) ? nearestFree(at[0], at[1], 2, NAV.hero) || at : at;
    dropPersonInst(p);
    Object.assign(p, { loc: MAP.id, away: false, x: g[0], z: g[1], yaw, tyaw: yaw, delay: 0.5, road: -1, mode: 'home', prevMode: null, restore: false });
    p.path.length = 0; p.queue.length = 0; p.seat = null; p.sit = p.sitTarget = 0;
    p.y = groundY(p.x, p.z);
    personInst(p);
  }
  hook(GAME.update, (dt) => {
    const jump = lastHour !== null && Math.abs(((DAY.t - lastHour + 12) % 24 + 24) % 24 - 12) > 0.5;
    lastHour = DAY.t;
    for (const p of PEOPLE) {
      if (p === hero || p.travel) continue;
      if (jump) { if (free(p.mode) || p.mode === 'home') { placeAt(p, placeOf(p)); show(p); } continue; }
      if (personHere(p)) planCheck(p); else offStep(p, dt);
    }
  }, 29);

  // ---------- what he notices ----------
  // alert(x, z, kind, r, source): everyone here within r turns to it and says his word about it (barks[kind], not twice in 25 s);
  // a game decides the rest in def.on[kind](p, source, distance). The engine's noises come through GAME.noise.
  export function alert(x, z, kind, r = 10, source = null) {
    for (const p of PEOPLE) {
      if (!personHere(p) || p === hero || p.mode === 'talk') continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d > r) continue;
      p.attendTo = [x, z]; p.attend = Math.max(p.attend, 2.5);
      if ((p.heard[kind] ?? -1e9) < p.t - 25) { p.heard[kind] = p.t; personBark(p, kind, source); }
      if (p.def.on && p.def.on[kind]) p.def.on[kind](p, source, d);
    }
  }
  hook(GAME.noise, (x, z, kind, source) => alert(x, z, kind, kind === 'shot' ? 16 : 9, source));

  // ---------- the behaviours ----------
  // standing about: notices the hero (or what he heard), looks round, goes back to his place after stepping aside
  function thinkIdle(p, dt, dh) {
    const to = p.attend > 0 && p.attendTo ? p.attendTo : [hero.x, hero.z];
    const toA = Math.atan2(to[0] - p.x, to[1] - p.z), rel = wrapA(toA - p.yaw);
    const sees = dh < 4.5 && !heroHidden() && !travelState;
    if (p.attend > 0 || (sees && dh < 2.4 && !hero.path.length && !p.path.length && !p.sitTarget && Math.abs(rel) > 1.05)) p.tyaw = toA;
    if (sees || (p.attend > 0 && p.attendTo)) {
      p.headTo = Math.abs(rel) < 1.9 ? clamp(rel, -1.05, 1.05) : 0;
      if (sees && dh < 3 && p.t - p.metT > 90) { p.metT = p.t; personBark(p, 'hello'); }
    } else {
      p.idleT -= dt;
      if (p.idleT <= 0) {
        p.idleT = 3.5 + DICE() * 5;
        p.headTo = DICE() < 0.35 ? 0 : (DICE() - 0.5) * 1.7;
        // now and then a hand goes to the kit on his chest (a radio, a pouch)
        if (DICE() < 0.25 && !p.path.length && !p.sitTarget) Object.assign(p.reach, { on: true, t: 0, to: [-0.07, 0.08, 0.25], cb: null, fired: false });
      }
    }
    // stepped aside or pushed off his post: back to it when nobody is around
    if (p.mode === 'post' && !p.path.length && !atHome(p) && p.loc === p.home.loc) {
      p.homeT += dt;
      if (p.homeT > 6 && dh > 2.5) { p.homeT = 0; personGo(p, p.home.at); p.queue = [{ type: 'face', yaw: p.home.yaw }]; }
    } else p.homeT = 0;
  }
  // sitting: only the head turns — to the hero, or to what he heard
  function thinkSeated(p, dt, dh) {
    if (!(p.sit > 0) || !p.seat) return;
    const to = p.attend > 0 && p.attendTo ? p.attendTo : [hero.x, hero.z];
    const sees = dh < 4.5 && !heroHidden() && !travelState;
    if (sees || (p.attend > 0 && p.attendTo)) {
      const rel = wrapA(Math.atan2(to[0] - p.x, to[1] - p.z) - p.seat.yaw);
      p.headTo = Math.abs(rel) < 1.9 ? clamp(rel, -1.05, 1.05) : 0;
      if (sees && dh < 3 && p.t - p.metT > 90) { p.metT = p.t; personBark(p, 'hello'); }
    } else {
      p.idleT -= dt;
      if (p.idleT <= 0) { p.idleT = 3.5 + DICE() * 5; p.headTo = DICE() < 0.4 ? 0 : (DICE() - 0.5) * 1.4; }
    }
  }
  // the free seat nearest to a point, within r
  function freeSeatNear(p, at, r) {
    let best = null, bd = r;
    for (const inst of INST) {
      if (!inst.built || !inst.built.seats || !inst.built.seats.length) continue;
      for (const st of seatsOf(inst)) {
        if (seatTaken(st, p)) continue;
        const d = Math.hypot(st.at[0] - at[0], st.at[1] - at[1]);
        if (d < bd) { bd = d; best = st; }
      }
    }
    return best;
  }
  // down onto a seat: up to its front, turn, step back, sit
  function sitDown(p, st) {
    p.path.length = 0;
    p.queue = [{ type: 'path', to: st.front }, { type: 'goto', x: st.front[0], z: st.front[1] }, { type: 'face', yaw: st.yaw }, { type: 'turned' },
      { type: 'goto', x: st.at[0], z: st.at[1], back: true }, { type: 'sit', seat: st }];
  }
  function personStand(p) {
    if (!p.seat) { p.sitTarget = 0; p.queue = []; return; }
    p.queue = [{ type: 'stand' }, { type: 'goto', x: p.seat.front[0], z: p.seat.front[1] }];
  }
  MIND.post = {
    think: thinkIdle,
    enter(p, pl) { p.tyaw = pl.yaw; }
  };
  MIND.sit = {
    think: thinkSeated,
    goal(p, pl) { const st = freeSeatNear(p, pl.at, 3); return st ? st.front : null; },
    enter(p, pl) { const st = freeSeatNear(p, pl.at, 3); if (st) sitDown(p, st); else p.mode = 'post'; },
    restore(p) {
      const st = freeSeatNear(p, [p.x, p.z], 2.5);
      if (!st) { p.mode = 'post'; return; }
      p.seat = st; p.sit = 1; p.sitTarget = 1; p.x = st.at[0]; p.z = st.at[1]; p.yaw = p.tyaw = st.yaw; p.y = groundY(p.x, p.z);
    },
    here: (p) => p.sit > 0 || p.sitTarget === 1 || p.queue.some((c) => c.type === 'sit'),
    note: () => 'Сидит.'
  };
  // round his points, a pause at each (pl.e.points: [[x, z], …], pl.e.pause: seconds, 3 by default)
  MIND.patrol = {
    think(p, dt, dh) {
      const pts = p.home.points || [];
      if (!pts.length) { thinkIdle(p, dt, dh); return; }
      if (p.path.length || p.queue.length) return;
      if (p.pauseT > 0) { p.pauseT -= dt; thinkIdle(p, dt, dh); return; }
      p.patrolI = ((p.patrolI ?? -1) + 1) % pts.length;
      if (!personGo(p, pts[p.patrolI])) p.pauseT = 2;
      else p.pauseT = (p.home.pause ?? 3) * (0.7 + DICE() * 0.6);
    },
    goal: (p, pl) => (pl.e.points || [])[0] || pl.at,
    enter(p, pl) { p.home.points = pl.e.points; p.home.pause = pl.e.pause; p.patrolI = 0; p.pauseT = 0; },
    restore(p) { MIND.patrol.enter(p, placeOf(p)); },
    here: () => true,
    note: () => 'Обходит.'
  };
  // indoors: he goes to the door of the nearest thing of the kind (pl.e.door: a type, e.g. 'entrance'; pl.e.near: about where),
  // turns to it and is gone; his day brings him out of the same door
  // the door spot ([x, z, which way it faces]) of the nearest thing of the entry's kind, in the location in sight
  function doorOf(e, at) {
    let best = null, bd = 8;
    for (const i of INST) {
      if (i.type !== e.door || !i.spots.length) continue;
      const c = i.center || [i.M0[12], i.M0[14]];          // a part of a building (an entrance) has no place of its own on the map
      const d = Math.hypot(c[0] - at[0], c[1] - at[1]);
      if (d < bd) { bd = d; best = i; }
    }
    const sp = best ? spotOf(best, 'door') : null;
    return sp ? [sp.w[0], sp.w[1], sp.wyaw] : null;
  }
  MIND.away = {
    think(p, dt) {
      if (p.path.length || p.queue.length) return;
      p.vanishT = (p.vanishT ?? 0.4) - dt;
      if (p.vanishT > 0) return;
      p.away = true; p.vanishT = null;
      dropPersonInst(p);
    },
    goal(p, pl) { const d = doorOf(pl.e, pl.at); return d ? [d[0], d[1]] : pl.at; },
    enter(p, pl) {
      const d = doorOf(pl.e, pl.at);
      p.awayDoor = d || [p.x, p.z, p.yaw];
      p.vanishT = 0.4;
      if (d) p.queue = [{ type: 'face', yaw: d[2] }, { type: 'turned' }];
    },
    here: (p) => p.away,
    note: () => 'Ушёл.'
  };
  // ---------- the hero's orders, and the way back to his day ----------
  const FOLLOW_NEAR = 1.6;
  function followGoal(p, near) {
    // a point on a circle round the hero, on our side of him: behind him when he walks away
    let dx = p.x - hero.x, dz = p.z - hero.z, d = Math.hypot(dx, dz);
    if (d < 1e-3) { dx = -Math.sin(hero.yaw); dz = -Math.cos(hero.yaw); d = 1; }
    return nearestFree(clamp(hero.x + dx / d * near, 0.5, GW - 0.5), clamp(hero.z + dz / d * near, 0.5, GH - 0.5), 2, NAV.hero);
  }
  MIND.follow = {
    order: true, chat: true,
    think(p, dt, dh) {
      if (hero.sitTarget === 1 && hero.seat && hero.sit > 0.4) {      // he sits down: so do we, beside him
        if (!p.seat && !p.queue.length && !p.sitTarget) { const st = freeSeatNear(p, [hero.x, hero.z], 4.5); if (st) { sitDown(p, st); personBark(p, 'sit'); } }
        return;
      }
      if (p.queue.some((c) => c.type === 'sit')) { p.queue.length = 0; p.path.length = 0; }       // he got up before we sat down
      if (p.seat || p.sitTarget) { if (!p.queue.length) personStand(p); return; }     // he got up: up we get too
      if (p.queue.length) return;
      const near = driving() ? 3.4 : FOLLOW_NEAR;
      p.replanT -= dt;
      if ((dh > near + 0.9 || (p.path.length && hero.path.length)) && p.replanT <= 0) {
        p.replanT = 0.45;
        const g = followGoal(p, near);
        if (g && Math.hypot(g[0] - p.x, g[1] - p.z) > 0.25) personGo(p, g, dh > 5 || (hero.run && hero.path.length > 0));
      }
      if (p.path.length && dh < near && !hero.path.length) p.path.length = 0;       // close enough, and he stopped: so do we
    },
    pace: (p, dh) => dh < 1.1 && hero.path.length ? 0.6 : 1,
    after(p, dt, dh) { if (!p.path.length && !p.sitTarget && !p.queue.length && dh < 4) p.tyaw = approachAngle(p.tyaw, Math.atan2(hero.x - p.x, hero.z - p.z), dt * 2); },
    note: () => 'Идёт за тобой.'
  };
  MIND.wait = { order: true, think: thinkIdle, note: () => 'Ждёт здесь, как ты просил.' };
  // on his way back to his day: off the seat, out through the exit if it is in another location, up to the place, and at it
  MIND.home = {
    think(p) {
      if (p.path.length) return;
      if (p.seat || p.sitTarget) { if (!p.queue.length) personStand(p); return; }
      if (p.queue.length) return;
      const pl = placeOf(p);
      if (p.loc !== pl.loc) {
        const e = (MAP.exits || []).find((x) => x.to === pl.loc) || (MAP.exits || [])[0];
        if (!e) { p.mode = 'wait'; return; }
        if (Math.hypot(p.x - e.go[0], p.z - e.go[1]) > 0.6) { personGo(p, e.go); return; }
        placeAt(p, pl);            // through the exit: out of sight he is simply where his day says
        return;
      }
      const M = MIND[pl.do], goal = M.goal ? M.goal(p, pl) : pl.at;
      if (goal && Math.hypot(p.x - goal[0], p.z - goal[1]) > 0.3) { if (!personGo(p, goal)) startPlan(p); return; }
      startPlan(p);
    },
    note: () => 'Идёт на своё место.'
  };
  // the talk: he faces the hero; sitting on a bench, only the head turns to him
  MIND.talk = {
    still: true,
    think(p) {
      const toHero = Math.atan2(hero.x - p.x, hero.z - p.z);
      p.path.length = 0; p.tyaw = toHero;
      p.headTo = p.sit > 0 && p.seat ? clamp(wrapA(toHero - p.seat.yaw), -1.05, 1.05) : 0;
    }
  };
