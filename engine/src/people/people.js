  // ================= people: other characters in the world — where they are, what they do, how they are drawn =================
  // A game adds people with addPerson(def):
  //   { id, name, short (the chip «рядом: …»), note(p) (a line for the context panel), look (hero/look.js), loc, at: [x, z], yaw,
  //     gear: { body, head, hands } (things he wears: hero/look.js WEAR; personWear() changes them), pace (hero/body.js PACE), speed: 1,
  //     mode: 'post' (default), inv: [{ t, n }] (items.js), trade: { … } (trade.js), dialog: id (talk.js),
  //     barks: { hello, follow, wait, home, sit, arrive(location), idle, … } (a line, a list to pick from or (p, …) → line) }
  // A person is a body like the hero's (hero/body.js) with a mind of his own; control can pass to him (takeControl): then the player
  // steers him, and the hero becomes a person himself.
  // What a person has in mind is his mode:
  //   post — stands at his place, turns his head to the hero, looks round now and then, goes back to his place if he had to step aside;
  //   follow — keeps a step or two from the hero, runs when left behind, sits beside him on a bench, goes through exits with him;
  //   wait — stays where he was asked to; home — walks back to his place (through an exit, if it is in another location);
  //   talk — faces the hero while they talk (talk.js).
  // Every person in the current location has an INST entry: it can be tapped, it shows in the panel «рядом», and the person is drawn
  // from his bones twelve times a second with everything else (GAME.tick → snapshot, GAME.items, GAME.key).
  import { ID4, approach, approachAngle, clamp, mul, wpx, wrapA, xf } from '../core/math.js';
  import { GAME, hook } from '../core/game.js';
  import { LOCATIONS, LOC_HOOKS, MAP } from '../world/map.js';
  import { savePart } from '../world/state.js';
  import { INST, groundY, instById, newId } from '../world/instances.js';
  import { GH, GW } from '../world/ground.js';
  import { NAV, blockedAt, findPath, nearestFree } from '../world/nav.js';
  import { exitAt } from '../world/locations.js';
  import { RIFLE } from '../hero/model.js';
  import { rebuildHero, steerLook } from '../hero/wardrobe.js';
  import { OVERLAYS, PACE, blendOverlays, cycleOf, dressedModel, endOverlays, newBody, settle, speedOf, walkAlong } from '../hero/body.js';
  import { driving, hero, heroHidden, setHeroBody } from '../hero/hero.js';
  import { bodyRig, poseKey, rifleWorld } from '../hero/rig.js';
  import { seatsOf } from '../hero/state.js';
  import { travelState } from '../hero/travel.js';
  import { VH, VW, lastView, redraw, stageEl } from '../render/stage.js';
  import { INV, invChanged, invClean } from './items.js';
  export const PEOPLE = [];
  // acts: f(p, list) — more actions for a person's panel, { label, run, order } (talk and trade add theirs);
  // busy: f() → true while control must not pass to another person (a deal is on the table)
  export const PEOPLE_HOOKS = { acts: [], busy: [] };
  export const personHere = (p) => !!p.inst && p.loc === MAP.id;
  export const personById = (id) => PEOPLE.find((p) => p.id === id);
  // a person is a body (hero/body.js) with a mind: what he has in mind (mode), his place, his words, his things
  export function addPerson(def) {
    const p = Object.assign(newBody({
      x: def.at[0], z: def.at[1], yaw: def.yaw || 0, tyaw: def.yaw || 0, t: 3 + Math.random() * 10,
      look: def.look, gear: Object.assign({ body: null, head: null, hands: null }, def.gear), pace: def.pace || PACE, speedK: def.speed || 1
    }), mindOf(def));
    PEOPLE.push(p);
    return p;
  }
  function mindOf(def) {
    return {
      def, id: def.id, name: def.name, loc: def.loc, home: { loc: def.loc, at: def.at.slice(), yaw: def.yaw || 0 }, mode: def.mode || 'post', prevMode: null,
      attend: 0, idleT: 3 + Math.random() * 4, replanT: 0, homeT: 0, delay: 0, metT: -1e9, chatT: 30 + Math.random() * 30, bark: null, barkEl: null, arriveT: 0,
      travel: false, inst: null, bones: null, items: [], snapKey: '',
      inv: (def.inv || []).map((s) => ({ t: s.t, n: s.n }))
    };
  }
  // a mode change that waits for a conversation to end, if one is going on
  function setPersonMode(p, m) { if (p.mode === 'talk') p.prevMode = m; else p.mode = m; }

  // ---------- the person in the current location: an entry in INST ----------
  const PERSON_USE = { name: (i) => i.person.name, short: (i) => i.person.def.short || i.person.name, note: (i) => personNote(i.person), acts: (i) => personActs(i.person) };
  function personInst(p) {
    // ids are per location and only 8 bits: a person keeps the one he got the first time he came to a location
    const ids = p.ids || (p.ids = {});
    if (!ids[MAP.id]) ids[MAP.id] = newId();
    const inst = {
      id: ids[MAP.id], def: { type: 'person', at: [p.x, p.z] }, type: 'person', person: p, use: PERSON_USE,
      T: { near: (i, x, z) => Math.max(0, Math.hypot(x - p.x, z - p.z) - 0.35) },
      M0: ID4, yaw0: p.yaw, built: {}, chunks: [], items: [], bb: [p.x - 0.4, 0, p.z - 0.4, p.x + 0.4, 2, p.z + 0.4], active: true,
      sr: [0, 0, 0, 0], shr: [0, 0, 0, 0], n: 0, dyn: {}, center: [p.x, p.z], blocks: [], spots: []
    };
    p.inst = inst;
    INST.push(inst);
    if (instById) instById.set(inst.id, inst);
    p.items = [];
    return inst;
  }
  function dropPersonInst(p) {
    const i = p.inst; if (!i) return;
    const k = INST.indexOf(i); if (k >= 0) INST.splice(k, 1);
    instById.delete(i.id);
    p.inst = null; p.items = [];
  }
  hook(LOC_HOOKS.objects, () => { for (const p of PEOPLE) if (p.loc === MAP.id && !p.travel && p !== hero) personInst(p); }, 12);
  function personNote(p) {
    const own = typeof p.def.note === 'function' ? p.def.note(p) : (p.def.note || '');
    const m = { follow: 'Идёт за тобой.', wait: 'Ждёт здесь, как ты просил.', home: 'Возвращается на своё место.' }[p.mode === 'talk' ? p.prevMode : p.mode] || '';
    return [m, own].filter(Boolean).join(' ');
  }
  export const atHome = (p) => p.loc === p.home.loc && Math.hypot(p.x - p.home.at[0], p.z - p.home.at[1]) < 0.6;
  function personActs(p) {
    const out = [];
    for (const f of PEOPLE_HOOKS.acts) f(p, out);
    if (p.def.follows !== false) {
      const m = p.mode === 'talk' ? p.prevMode : p.mode;
      if (m === 'follow') out.push({ label: 'Жди здесь', run: () => personWait(p), order: 40 });
      else out.push({ label: 'Идём со мной', run: () => personFollow(p), order: 40 });
      if (!atHome(p) && m !== 'home') out.push({ label: 'Ступай на место', run: () => personHome(p), order: 50 });
    }
    return out.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  }

  // ---------- orders ----------
  export function personFollow(p) { setPersonMode(p, 'follow'); p.replanT = 0; personBark(p, 'follow'); }
  export function personWait(p) { setPersonMode(p, 'wait'); p.path.length = 0; personBark(p, 'wait'); }
  export function personHome(p) { setPersonMode(p, 'home'); p.path.length = 0; personBark(p, 'home'); }
  // walk to a point round the obstacles
  function personGo(p, to, run = false) {
    const pts = findPath([p.x, p.z], to, NAV.hero);
    p.path = pts ? pts.map((q) => ({ x: q[0], z: q[1] })) : [];
    p.run = run;
    return !!pts;
  }
  // a short list of steps, like the hero's queue: path, goto (straight; back: walking backwards), face, turned, sit, stand
  function personQueue(p) {
    while (p.queue.length && !p.path.length) {
      const c = p.queue[0];
      if (c.type === 'path') { p.queue.shift(); if (personGo(p, c.to) && p.path.length) return; continue; }
      if (c.type === 'goto') { p.queue.shift(); if (Math.hypot(c.x - p.x, c.z - p.z) > 0.01) { p.path.push({ x: c.x, z: c.z, back: !!c.back }); p.run = false; return; } continue; }
      if (c.type === 'face') { p.queue.shift(); p.tyaw = c.yaw; continue; }
      if (c.type === 'turned') { if (Math.abs(wrapA(p.yaw - p.tyaw)) > 0.06) return; p.queue.shift(); continue; }
      if (c.type === 'sit') { p.seat = c.seat; p.sitTarget = 1; if (p.sit < 1) return; p.queue.shift(); continue; }
      if (c.type === 'stand') { p.sitTarget = 0; if (p.sit > 0) return; p.seat = null; p.queue.shift(); continue; }
      p.queue.shift();
    }
  }
  // the hero sat down: take the free seat nearest to him, on his bench or the next one
  const seatTaken = (st, me) => (hero.seat && hero.seat.inst === st.inst && hero.seat.s === st.s) || PEOPLE.some((q) => q !== me && q.seat && q.seat.inst === st.inst && q.seat.s === st.s);
  function personSitNear(p) {
    let best = null, bd = 4.5;
    for (const inst of INST) {
      if (!inst.built || !inst.built.seats || !inst.built.seats.length) continue;
      for (const st of seatsOf(inst)) {
        if (seatTaken(st, p)) continue;
        const d = Math.hypot(st.at[0] - hero.x, st.at[1] - hero.z);
        if (d < bd) { bd = d; best = st; }
      }
    }
    if (!best) return false;
    p.path.length = 0;
    p.queue = [{ type: 'path', to: best.front }, { type: 'goto', x: best.front[0], z: best.front[1] }, { type: 'face', yaw: best.yaw }, { type: 'turned' },
      { type: 'goto', x: best.at[0], z: best.at[1], back: true }, { type: 'sit', seat: best }];
    return true;
  }
  function personStand(p) {
    if (!p.seat) { p.sitTarget = 0; p.queue = []; return; }
    p.queue = [{ type: 'stand' }, { type: 'goto', x: p.seat.front[0], z: p.seat.front[1] }];
  }

  // ---------- what he has in mind ----------
  const FOLLOW_NEAR = 1.6;
  function followGoal(p, near) {
    // a point on a circle round the hero, on our side of him: behind him when he walks away
    let dx = p.x - hero.x, dz = p.z - hero.z, d = Math.hypot(dx, dz);
    if (d < 1e-3) { dx = -Math.sin(hero.yaw); dz = -Math.cos(hero.yaw); d = 1; }
    return nearestFree(clamp(hero.x + dx / d * near, 0.5, GW - 0.5), clamp(hero.z + dz / d * near, 0.5, GH - 0.5), 2, NAV.hero);
  }
  function thinkFollow(p, dt, dh) {
    if (hero.sitTarget === 1 && hero.seat && hero.sit > 0.4) {      // he sits down: so do we, beside him
      if (!p.seat && !p.queue.length && !p.sitTarget && personSitNear(p)) personBark(p, 'sit');
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
  }
  function thinkHome(p) {
    if (p.path.length) return;
    if (p.loc !== p.home.loc) {
      // home is in another location: walk out through the exit that leads there; once in it, he is home
      const e = (MAP.exits || []).find((x) => x.to === p.home.loc) || (MAP.exits || [])[0];
      if (!e) { p.mode = 'wait'; return; }
      if (Math.hypot(p.x - e.go[0], p.z - e.go[1]) > 0.6) { personGo(p, e.go); return; }
      dropPersonInst(p);
      Object.assign(p, { loc: p.home.loc, x: p.home.at[0], z: p.home.at[1], yaw: p.home.yaw, tyaw: p.home.yaw, mode: 'post' });
      return;
    }
    if (Math.hypot(p.x - p.home.at[0], p.z - p.home.at[1]) > 0.3) { if (!personGo(p, p.home.at)) p.mode = 'post'; return; }
    p.mode = 'post'; p.tyaw = p.home.yaw;
  }
  // standing about: notices the hero, looks round, goes back to his place after stepping aside
  function thinkIdle(p, dt, dh) {
    const toHero = Math.atan2(hero.x - p.x, hero.z - p.z), rel = wrapA(toHero - p.yaw);
    const sees = dh < 4.5 && !heroHidden() && !travelState;
    if (p.attend > 0 || (sees && dh < 2.4 && !hero.path.length && !p.path.length && !p.sitTarget && Math.abs(rel) > 1.05)) p.tyaw = toHero;
    if (sees) {
      p.headTo = Math.abs(rel) < 1.9 ? clamp(rel, -1.05, 1.05) : 0;
      if (dh < 3 && p.t - p.metT > 90) { p.metT = p.t; personBark(p, 'hello'); }
    } else {
      p.idleT -= dt;
      if (p.idleT <= 0) {
        p.idleT = 3.5 + Math.random() * 5;
        p.headTo = Math.random() < 0.35 ? 0 : (Math.random() - 0.5) * 1.7;
        // now and then a hand goes to the kit on his chest (a radio, a pouch)
        if (Math.random() < 0.25 && !p.path.length && !p.sitTarget) Object.assign(p.reach, { on: true, t: 0, to: [-0.07, 0.08, 0.25], cb: null, fired: false });
      }
    }
    // stepped aside or pushed off his post: back to it when nobody is around
    if (p.mode === 'post' && !p.path.length && !atHome(p) && p.loc === p.home.loc) {
      p.homeT += dt;
      if (p.homeT > 6 && dh > 2.5) { p.homeT = 0; personGo(p, p.home.at); p.queue = [{ type: 'face', yaw: p.home.yaw }]; }
    } else p.homeT = 0;
  }
  // the hero walks right into him: one step aside
  function stepAside(p, dh) {
    if (p.path.length || p.queue.length || p.sit > 0 || p.sitTarget || !hero.path.length || dh > 0.62 || driving()) return;
    for (const sg of [1, -1]) {
      const a = hero.yaw + sg * Math.PI / 2, g = [p.x + Math.sin(a) * 0.95, p.z + Math.cos(a) * 0.95];
      if (g[0] > 0.5 && g[1] > 0.5 && g[0] < GW - 0.5 && g[1] < GH - 0.5 && !blockedAt(g[0], g[1], NAV.hero)) { p.path = [{ x: g[0], z: g[1] }]; p.run = false; return; }
    }
  }

  // ---------- the step: his mind first, then the body's step in the same pieces as the hero's (body.js) ----------
  const PERSON_ENDS = {};
  function updatePerson(p, dt) {
    p.t += dt;
    if (p.delay > 0) p.delay -= dt;
    p.attend = Math.max(0, p.attend - dt);
    const dh = Math.hypot(hero.x - p.x, hero.z - p.z);
    if (p.mode === 'follow') thinkFollow(p, dt, dh);
    else if (p.mode === 'home') thinkHome(p);
    else if (p.mode === 'talk') {
      // face the hero; sitting on a bench, only the head turns to him
      const toHero = Math.atan2(hero.x - p.x, hero.z - p.z);
      p.path.length = 0; p.tyaw = toHero;
      p.headTo = p.sit > 0 && p.seat ? clamp(wrapA(toHero - p.seat.yaw), -1.05, 1.05) : 0;
    }
    if (p.mode === 'post' || p.mode === 'wait') thinkIdle(p, dt, dh);
    if (!p.inst || p.loc !== MAP.id) return;        // walked out of the location (home through an exit)
    if (p.mode !== 'talk') stepAside(p, dh);
    personQueue(p);
    // walking along the path
    const moving = p.path.length > 0 && p.delay <= 0;
    if (moving) walkAlong(p, speedOf(p) * dt * (p.mode === 'follow' && dh < 1.1 && hero.path.length ? 0.6 : 1), cycleOf(p));
    if (p.mode === 'follow' && !p.path.length && !p.sitTarget && !p.queue.length && dh < 4) p.tyaw = approachAngle(p.tyaw, Math.atan2(hero.x - p.x, hero.z - p.z), dt * 2);
    p.yaw = approachAngle(p.yaw, p.tyaw, dt * (p.path.length ? 15 : p.turn));
    if (p.path.length) p.headTo = 0;
    p.head = approach(p.head, p.headTo, dt * 3);
    settle(p, dt, p.path.length && p.delay <= 0, p.path.length && p.run);
    const shotT = p.shoot.t;
    blendOverlays(p, dt);
    endOverlays(p, shotT, PERSON_ENDS);
    p.inst.center = [p.x, p.z]; p.inst.def.at = [p.x, p.z];
    // a word now and then: about the new place, or just like that while walking about together
    if (p.bark) { p.bark.t -= dt; if (p.bark.t <= 0) p.bark = null; }
    if (p.arriveT > 0) { p.arriveT -= dt; if (p.arriveT <= 0) personBark(p, 'arrive', MAP); }
    if (p.mode === 'follow') { p.chatT -= dt; if (p.chatT <= 0) { p.chatT = 45 + Math.random() * 40; if (!p.bark && !travelState) personBark(p, 'idle'); } }
  }
  function updatePeople(dt) { for (const p of PEOPLE) if (personHere(p)) updatePerson(p, dt); }

  // ---------- going through exits with the hero ----------
  LOC_HOOKS.leave.push((from) => {
    for (const p of PEOPLE) {
      if (p === hero) continue;           // whoever the player steers goes by himself (state.js)
      if (p.loc !== from.id || !p.inst || (p.mode !== 'follow' && !(p.mode === 'talk' && p.prevMode === 'follow'))) continue;
      if (Math.hypot(p.x - hero.x, p.z - hero.z) > 16) continue;        // left far behind: he stays where he is
      dropPersonInst(p);
      Object.assign(p, { loc: null, travel: true, seat: null, sit: 0, sitTarget: 0, bark: null, mode: 'follow', prevMode: null });
      p.path.length = 0; p.queue.length = 0;
    }
  });
  LOC_HOOKS.enter.push((def, spawnName) => {
    for (const p of PEOPLE) {
      if (p === hero) { p.loc = def.id; continue; }
      // someone who came here on his own while the hero was away (went home through an exit) gets his entry now
      if (!p.travel && p.loc === def.id && !p.inst) { personInst(p); continue; }
      if (!p.travel) continue;
      const sp = def.spawns[spawnName] || def.spawns.start;
      let bx = sp.at[0], bz = sp.at[1];
      if (sp.walk) { const dx = sp.walk[0] - bx, dz = sp.walk[1] - bz, d = Math.hypot(dx, dz) || 1; bx -= dx / d * 0.7; bz -= dz / d * 0.7; }
      Object.assign(p, { travel: false, loc: def.id, x: clamp(bx, 0.3, GW - 0.3), z: clamp(bz, 0.3, GH - 0.3), yaw: hero.yaw, tyaw: hero.yaw, delay: 0.55, replanT: 0, arriveT: 1.6 });
      p.y = groundY(p.x, p.z);
      personInst(p);
    }
  });

  // ---------- drawing: a snapshot twelve times a second, so people move in the same steps as the hero ----------
  // posed like the hero (rig.js: bodyRig), dressed in what he wears (his model is built again when that changes)
  function personSnapshot(p) {
    if (!p.model) p.model = dressedModel(p);
    const { c, pose, B, root, yaw } = bodyRig(p, p.model.D, p.gear.hands === 'rifle', true);
    const id = p.inst ? p.inst.id : 0;
    p.bones = B;
    p.items = p.model.parts.map((pt) => ({ mesh: pt.mesh, model: B[pt.bone], mat: pt.mat, id, flags: 2 | 16, shadow: !pt.noShadow }));
    // what he carries in his hands is drawn as the hero's is (the rifle: in the hands, on the back, by the seat)
    const RW = rifleWorld(pose.rifle, B, p.model.D, p.seat);
    if (RW) for (const r of RIFLE) p.items.push({ mesh: r.mesh, model: mul(RW, r.off), mat: r.mat, id, flags: 2 | 16, shadow: true });
    p.snapKey = [id, p.model.look.id, root.map((v) => v.toFixed(3)).join(','), yaw.toFixed(3), poseKey(c)].join(',') + ';';
  }
  hook(GAME.update, (dt) => updatePeople(dt), 30);
  hook(GAME.tick, () => { for (const p of PEOPLE) if (personHere(p)) personSnapshot(p); });
  hook(GAME.key, () => { let k = ''; for (const p of PEOPLE) if (personHere(p)) k += p.snapKey; return k; }, 60);
  hook(GAME.items, (out) => { for (const p of PEOPLE) if (personHere(p)) { if (!p.items.length) personSnapshot(p); for (const it of p.items) out.push(it); } }, 60);

  // ---------- a word over the head ----------
  function personBark(p, key, ...args) {
    const B = p.def.barks || {}, v = B[key];
    let text = typeof v === 'function' ? v(p, ...args) : Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
    if (!text) return;
    p.bark = { text, t: clamp(1.4 + text.length * 0.055, 2.4, 6) };
  }
  // the bubble follows the head as the camera moves; hidden while the screen fades or the person is out of view
  function stageFrac(P) {
    const lv = lastView, s = wpx(P);
    if (!lv) return null;
    return lv.over ? [(s[0] - lv.ox) * lv.sc / lv.v.w, (s[1] - lv.oy) * lv.sc / lv.v.h] : [(s[0] - lv.ox) / VW, (s[1] - lv.oy) / VH];
  }
  function drawBarks() {
    const box = stageEl.parentElement;
    for (const p of PEOPLE) {
      let el = p.barkEl;
      const f = p.bark && personHere(p) && p.bones && !travelState && !(TALK_NOW() === p) ? stageFrac(xf(p.bones.head, [0, 0.32, 0])) : null;
      if (!f || f[0] < -0.05 || f[0] > 1.05 || f[1] < 0 || f[1] > 1.05) { if (el) el.hidden = true; continue; }
      if (!el) { el = p.barkEl = document.createElement('p'); el.className = 'bark'; el.setAttribute('role', 'status'); box.append(el); }
      if (el.textContent !== p.bark.text) el.textContent = p.bark.text;
      el.style.left = (clamp(f[0], 0.14, 0.86) * stageEl.clientWidth) + 'px';
      el.style.top = (clamp(f[1], 0.1, 1) * stageEl.clientHeight) + 'px';
      el.hidden = false;
    }
  }
  hook(GAME.frame, drawBarks);
  // who the hero is talking to (talk.js answers; without it nobody)
  export const TALK_HOOKS = { who: [] };
  const TALK_NOW = () => { for (const f of TALK_HOOKS.who) { const p = f(); if (p) return p; } return null; };

  // ---------- what he wears ----------
  // a person puts a thing on or takes it off (slot 'body' | 'head' | 'hands', id — a WEAR entry of hero/look.js, or null):
  // the pieces it covers go, its own come, and his model is built again
  export function personWear(p, slot, id) {
    p.gear[slot] = id || null;
    if (p === hero) { rebuildHero(); return; }
    p.model = null; p.items = [];
  }

  // ---------- control passes to another person ----------
  // takeControl(p): the player steers p from now on (p must be here). The body steered so far stays where he stood, a person
  // waiting there: «Идём со мной» — and he follows. Everything that says hero means p now: the orders, the camera, the panels,
  // his things (INV.hero), what he wears (equip). Not while the hero is busy: in a machine, at an activity, in a talk, on the road.
  // The hero as a person is HERO_PERSON; a game gives him a name and words with heroAsPerson({ name, short, note, barks, … }).
  const HERO_PERSON = { id: 'hero', name: 'Герой', short: 'герой' };
  export function heroAsPerson(def) { Object.assign(HERO_PERSON, def); }
  export function takeControl(p) {
    const h = hero;
    if (!p || p === h || !personHere(p) || h.act || h.vehicle || travelState || TALK_NOW() || PEOPLE_HOOKS.busy.some((f) => f())) return false;
    becomePerson(h, MAP.id, [h.x, h.z], h.yaw);
    h.mode = 'wait'; h.prevMode = null;
    h.path.length = 0; h.queue.length = 0; h.target = null; h.focus = null; h.aimAt = null;
    for (const k of OVERLAYS) h[k].on = false;
    personInst(h);
    dropPersonInst(p);
    steer(p);
    p.arrived = !!exitAt(p.x, p.z);
    redraw();
    return true;
  }
  // the body the player leaves becomes a person: the hero the first time gets a mind of his own (HERO_PERSON); his things go with him
  function becomePerson(h, loc, at, yaw) {
    if (!h.def) Object.assign(h, mindOf(Object.assign({}, HERO_PERSON, { loc, at, yaw })));
    Object.assign(h, { loc, travel: false, inv: INV.hero, model: null, items: [] });
    if (!PEOPLE.includes(h)) PEOPLE.push(h);
  }
  // the player takes p: his body, his look and gear, his things
  function steer(p) {
    p.path.length = 0; p.queue.length = 0; p.headTo = 0; p.bark = null; p.target = null; p.focus = null;
    if (p.mode === 'talk') { p.mode = p.prevMode || 'post'; p.prevMode = null; }
    INV.hero = p.inv;
    invChanged();
    setHeroBody(p);
    steerLook(p.look, p.gear);
  }

  // ---------- what survives a page update, and what goes into a save: where each person is, his mode, his things, his gear ----------
  // and who the player steers: the 'control' part comes after the people, and before the hero's part puts the player where he stood
  // (whoever the player steers is not among them: his place, gear and things are the hero's part and the inventory)
  export function peopleHot() {
    return PEOPLE.filter((p) => p !== hero).map((p) => ({
      id: p.id, loc: p.loc || MAP.id, x: p.x, z: p.z, yaw: p.yaw, mode: p.mode === 'talk' ? (p.prevMode || 'post') : p.mode,
      inv: p.inv.map((s) => ({ t: s.t, n: s.n })), gear: Object.assign({}, p.gear)
    }));
  }
  function personFromHot(p, d) {
    if (!LOCATIONS[d.loc] || !Number.isFinite(d.x) || !Number.isFinite(d.z)) return;
    Object.assign(p, { loc: d.loc, x: d.x, z: d.z, yaw: d.yaw || 0, tyaw: d.yaw || 0, mode: ['post', 'follow', 'wait', 'home'].includes(d.mode) ? d.mode : 'post' });
    if (Array.isArray(d.inv)) p.inv = invClean(d.inv);
    if (d.gear) for (const k of ['body', 'head', 'hands']) if (k in d.gear && (d.gear[k] === null || typeof d.gear[k] === 'string')) p.gear[k] = d.gear[k];
    p.model = null;
  }
  export function peopleFromHot(list) {
    if (!Array.isArray(list)) return;
    for (const d of list) { const p = d && personById(d.id); if (p) personFromHot(p, d); }
  }
  savePart('people', { phase: 'before', save: peopleHot, load: peopleFromHot });
  savePart('control', {
    phase: 'before',
    save: () => ({ player: hero.id }),
    load: (d, all) => {
      const p = d && typeof d.player === 'string' && d.player !== hero.id ? personById(d.player) : null;
      const list = all.parts.people, e = p && Array.isArray(list) ? list.find((x) => x && x.id === hero.id) : null;
      if (!e || !LOCATIONS[e.loc]) return;
      const h = hero;
      becomePerson(h, e.loc, [e.x, e.z], e.yaw || 0);
      personFromHot(h, e);
      p.inv = INV.hero;                   // the player's things were loaded as the inventory (items.js)
      dropPersonInst(p);
      steer(p);
    }
  });

  // ---------- the bits of page the people module adds by itself (speech bubbles, the talk panel, the trade window) ----------
  export function peopleCss(id, css) {
    if (document.getElementById(id)) return;
    const st = document.createElement('style'); st.id = id; st.textContent = css;
    document.head.append(st);
  }
  peopleCss('css-people', `
.bark { position: absolute; transform: translate(-50%, calc(-100% - 8px)); width: max-content; max-width: min(62%, 270px); margin: 0;
  font: 500 13px/1.3 var(--body, system-ui, sans-serif); padding: 6px 10px; border-radius: 10px; text-align: center; pointer-events: none; z-index: 3;
  background: var(--surface, #fff); color: var(--ink, #1b1f22); border: 1px solid var(--line, #c6ccc9); box-shadow: 0 2px 0 rgba(0, 0, 0, .08); }
.bark::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 10px; height: 10px; background: inherit; border-right: inherit; border-bottom: inherit;
  transform: translateX(-50%) rotate(45deg); }
`);
