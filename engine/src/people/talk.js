  // ================= conversations =================
  // DIALOGS[id] = { start(p) → node id (default 'start'), nodes: { id: node } }; a person talks if his def has dialog: id.
  //   node:   { say: his line | [lines, one at random] | (p) → line, run(p) (when he says it), opts: [option] | (p) → [option] }
  //   option: { say: what the hero says (a line or (p) → line), to: the next node (an id or (p) → id), when(p) → false hides it,
  //             run(p): right after the hero's line (start following, wait, open the trade…) }
  //   An option without `to` ends the conversation after the hero's line.
  // talkTo(p) walks the hero up to the person, turns them to face each other and opens the panel in place of the panel «рядом».
  // Walking away, the location changing or «Уйти» ends it. talkSeen(p, node) tells how often a node was said (first meeting or not).
  import { $ } from '../core/prelude.js';
  import { S, reduceMotion } from '../core/camera.js';
  import { clamp, lerpV, mul, wpx, xf } from '../core/math.js';
  import { GAME, hook } from '../core/game.js';
  import { TGT_SMALL, render3D } from '../render/webgl.js';
  import { savePart } from '../world/state.js';
  import { NAV, nearestFree } from '../world/nav.js';
  import { buildPose, evalBones } from '../hero/skeleton.js';
  import { hero, yawTo } from '../hero/hero.js';
  import { inMachine, plan } from '../hero/state.js';
  import { travelState } from '../hero/travel.js';
  import { stageEl } from '../render/stage.js';
  import { buildPerson } from './look.js';
  import { PEOPLE_HOOKS, TALK_HOOKS, peopleCss, personById, personHere } from './people.js';
  export const DIALOGS = {};
  export let TALK = null;              // { p, D, id, node, line, heroLine, busy, wait, next, opts }
  let talkPending = null;       // the person the hero is walking up to
  export const TALK_SEEN = {};
  export const talkSeen = (p, id) => (TALK_SEEN[p.id] && TALK_SEEN[p.id][id]) || 0;
  // what was said to whom goes into a save: first meetings stay first meetings
  savePart('talks', {
    phase: 'before',
    save: () => TALK_SEEN,
    load: (d) => { for (const [id, seen] of Object.entries(d)) if (personById(id) && seen && typeof seen === 'object') TALK_SEEN[id] = Object.assign({}, seen); }
  });
  TALK_HOOKS.who.push(() => TALK ? TALK.p : null);
  export const lineOf = (v, p) => typeof v === 'function' ? v(p) : Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : (v || '');

  export function talkTo(p) {
    const D = DIALOGS[p.def.dialog];
    if (!D || !personHere(p) || (TALK && TALK.p === p)) return;
    if (inMachine()) return;
    if (TALK) endTalk();
    if (p.mode !== 'talk') { p.prevMode = p.mode; p.mode = 'talk'; }
    if (!p.sitTarget) { p.path.length = 0; p.queue.length = 0; }
    p.attend = 3;
    const d = Math.hypot(hero.x - p.x, hero.z - p.z);
    if ((hero.sit > 0 || hero.sitTarget) && d < 3) { openTalk(p); return; }        // from the bench beside him: no need to get up
    talkPending = p;
    const face = { type: 'call', fn: () => { hero.tyaw = yawTo(p.x, p.z); } }, open = { type: 'call', fn: () => openTalk(p), talkTo: p };
    if (d < 1.9) { plan(face, { type: 'turned' }, open); return; }
    const k = 1.2 / (d || 1), spot = nearestFree(p.x + (hero.x - p.x) * k, p.z + (hero.z - p.z) * k, 1.5, NAV.hero) || [hero.x, hero.z];
    plan({ type: 'path', to: spot }, { type: 'goto', x: spot[0], z: spot[1] }, face, { type: 'turned' }, open);
  }
  function openTalk(p) {
    talkPending = null;
    const D = DIALOGS[p.def.dialog];
    if (!D || !personHere(p)) return;
    if (p.mode !== 'talk') { p.prevMode = p.mode; p.mode = 'talk'; }
    TALK = { p, D, id: null, node: null, line: '', heroLine: '', busy: false, wait: 0, next: null, opts: [] };
    talkPanel(true);
    goNode(D.start ? D.start(p) : 'start');
    if (TALK) talkInView();
  }
  function goNode(id) {
    const T = TALK; if (!T) return;
    const node = T.D.nodes[id];
    if (!node) { endTalk(); return; }
    const seen = TALK_SEEN[T.p.id] || (TALK_SEEN[T.p.id] = {});
    T.id = id; T.node = node; T.busy = false;
    T.line = lineOf(node.say, T.p);
    seen[id] = (seen[id] || 0) + 1;
    if (T.line) personSays(T.p, T.line);
    if (node.run) node.run(T.p);
    if (TALK === T) renderTalk();
  }
  export function personSays(p, line) { Object.assign(p.talk, { on: true, t: 0, dur: clamp(0.8 + line.length * 0.035, 1.2, 4.5) }); }
  function chooseOpt(o) {
    const T = TALK; if (!T || T.busy) return;
    const said = lineOf(o.say, T.p);
    Object.assign(T, { busy: true, heroLine: said, line: '' });
    Object.assign(hero.talk, { on: true, t: 0, dur: clamp(0.6 + said.length * 0.03, 0.9, 3) });
    T.p.talk.on = false;
    renderTalk();
    T.wait = clamp(0.45 + said.length * 0.012, 0.6, 1.3);
    T.next = () => {
      if (o.run) o.run(T.p);
      if (TALK !== T) return;                  // the option's run may have ended it
      const to = typeof o.to === 'function' ? o.to(T.p) : o.to;
      if (to) goNode(to); else endTalk();
    };
  }
  export function endTalk() {
    const T = TALK; if (!T) return;
    TALK = null;
    const p = T.p;
    if (p.mode === 'talk') { p.mode = p.prevMode || 'post'; p.prevMode = null; }
    p.talk.on = false; hero.talk.on = false;
    talkPanel(false);
  }
  hook(GAME.update, (dt) => {
    const P = talkPending;
    if (P && !TALK && !hero.queue.some((c) => c.talkTo === P)) {         // the walk up was cut short by another order
      talkPending = null;
      if (P.mode === 'talk') { P.mode = P.prevMode || 'post'; P.prevMode = null; }
    }
    const T = TALK; if (!T) return;
    const p = T.p;
    if (!personHere(p) || travelState || hero.path.length || Math.hypot(hero.x - p.x, hero.z - p.z) > 3.4) { endTalk(); return; }
    if (!(hero.sit > 0)) hero.tyaw = yawTo(p.x, p.z);
    if (T.wait > 0) { T.wait -= dt; if (T.wait <= 0 && T.next) { const f = T.next; T.next = null; f(); } }
  }, 35);
  // the camera frames both of them; the chip over the stage says what he is doing
  hook(GAME.focus, (hs) => TALK ? lerpV([...hs, 0], [...wpx([TALK.p.x, 1.2, TALK.p.z]), 0], 0.5) : null, 25);
  hook(GAME.state, () => TALK ? 'разговаривает' : null);
  hook(GAME.context, () => TALK && TALK.p.inst ? { inst: TALK.p.inst, mode: 'near' } : null);
  PEOPLE_HOOKS.acts.push((p, out) => { if (p.def.dialog && DIALOGS[p.def.dialog]) out.push({ label: 'Поговорить', run: () => talkTo(p), order: 10 }); });

  // ---------- the panel: his face, his line, what the hero can answer ----------
  let talkEl = null;
  function talkDom() {
    if (talkEl) return talkEl;
    talkEl = $('talk');
    if (!talkEl) {
      talkEl = document.createElement('div'); talkEl.id = 'talk';
      const ctx = $('ctx');
      if (ctx) ctx.before(talkEl); else stageEl.parentElement.after(talkEl);
    }
    talkEl.className = 'talk'; talkEl.hidden = true;
    talkEl.innerHTML = '<div class="talk-head"><canvas class="talk-face" width="48" height="48" aria-hidden="true"></canvas>'
      + '<div class="talk-who"><span class="talk-k">Разговор</span><b class="talk-name"></b></div><button type="button" class="btn talk-x">Уйти</button></div>'
      + '<p class="talk-hero" hidden></p><p class="talk-line" aria-live="polite"></p><div class="talk-opts"></div>';
    talkEl.querySelector('.talk-x').addEventListener('click', () => endTalk());
    return talkEl;
  }
  function talkPanel(show) {
    const el = talkDom(), ctx = $('ctx');
    el.hidden = !show;
    if (ctx) ctx.hidden = show;
    if (show && TALK) { el.querySelector('.talk-name').textContent = TALK.p.name; drawPersonFace(el.querySelector('.talk-face'), TALK.p); }
  }
  // the panel in sight once it has its first line (on a phone the stage sticks to the top of the screen: then just below it)
  function talkInView() {
    const el = talkDom(), r = el.getBoundingClientRect(), s = stageEl.getBoundingClientRect();
    const top = s.top <= 2 && s.bottom > 0 ? s.bottom + 8 : 8, need = Math.min(r.height, 320);
    const dy = r.top < top ? r.top - top : r.top + need > window.innerHeight ? Math.min(r.top - top, r.top + need - window.innerHeight + 12) : 0;
    if (Math.abs(dy) > 4) window.scrollBy({ top: dy, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function renderTalk() {
    const T = TALK, el = talkDom(); if (!T) return;
    const h = el.querySelector('.talk-hero'), l = el.querySelector('.talk-line'), o = el.querySelector('.talk-opts');
    h.hidden = !T.heroLine; h.textContent = T.heroLine ? '— ' + T.heroLine : '';
    l.textContent = T.line || '…';
    l.classList.toggle('wait', !T.line);
    o.textContent = '';
    T.opts = [];
    if (T.busy) return;
    T.opts = (typeof T.node.opts === 'function' ? T.node.opts(T.p) : T.node.opts || []).filter((x) => !x.when || x.when(T.p));
    T.opts.forEach((x, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn talk-opt';
      b.textContent = (i + 1) + '. ' + (typeof x.say === 'function' ? x.say(T.p) : x.say);
      b.addEventListener('click', () => chooseOpt(x));
      o.append(b);
    });
  }
  // a head-and-shoulders portrait drawn by the engine, three-quarters to the viewer
  function drawPersonFace(cv, p) {
    if (!p.model) p.model = buildPerson(p.def.look);
    const D = p.model.D;
    const pose = buildPose({ t: 0, phase: 0, walkW: 0, runW: 0, sitW: 0, smokeW: 0, drinkW: 0, punchW: 0, shootW: 0, throwW: 0, reachW: 0, talkW: 0 }, D, false);
    const B = evalBones(pose.p, [0, 0, 0], Math.PI / 4 - 0.4, D);
    const list = p.model.parts.map((pt) => ({ mesh: pt.mesh, model: mul(B[pt.bone], pt.off), mat: pt.mat }));
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    render3D(TGT_SMALL, { w: cv.width, h: cv.height, ax: cv.width / 2, ay: cv.height / 2 + 3, s: S * 1.15, A: xf(B.neck, [0, 0.06, 0]) }, { main: list }, false, ctx, 0, 0);
  }
  document.addEventListener('keydown', (e) => {
    if (!TALK || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') { endTalk(); return; }
    const n = +e.key;
    if (!TALK.busy && n >= 1 && n <= TALK.opts.length) { e.preventDefault(); chooseOpt(TALK.opts[n - 1]); }
  });
  peopleCss('css-talk', `
.talk { background: var(--surface, #fff); border: 1px solid var(--accent, #b8691c); border-radius: 12px; padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 10px; }
.talk[hidden] { display: none; }
.talk-head { display: flex; align-items: center; gap: 12px; }
.talk-face { width: 72px; height: 72px; flex: none; image-rendering: pixelated; background: var(--stage, #cbd3cf); border-radius: 8px; }
.talk-who { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.talk-k { font: 500 11px/1.2 var(--mono, monospace); letter-spacing: .06em; text-transform: uppercase; color: var(--muted, #586067); }
.talk-name { font: 600 17px/1.25 var(--body, sans-serif); }
.talk-x { flex: none; }
.talk-hero { margin: 0; font-size: 14px; line-height: 1.4; color: var(--muted, #586067); }
.talk-line { margin: 0; font-size: 16px; line-height: 1.45; text-wrap: pretty; }
.talk-line.wait { color: var(--muted, #586067); }
.talk-opts { display: flex; flex-direction: column; gap: 6px; }
.talk-opt { text-align: left; line-height: 1.3; padding: 10px 12px; white-space: normal; }
`);
