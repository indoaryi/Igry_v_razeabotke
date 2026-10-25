  // ================= things people carry: item types, inventories, icons drawn from 3D models =================
  // A game describes its things with itemType(id, { … }):
  //   name, note, price (in money; what it is worth before any trader's cut), stack (default true: counted, one row per type),
  //   money: true (the money itself: one unit is worth 1), gear: { slot: 'body' | 'head' | 'hands' } (the hero can wear it: equip[slot] = id),
  //   icon: () => ({ list: [draw items], at: [x, y, z] the point that lands in the middle, zoom }) — a small 3D model, drawn once into a canvas.
  // An inventory is an array of { t: type id, n: count }. The hero's is INV.hero; each person keeps his own in p.inv.
  import { S } from '../core/camera.js';
  import { mul } from '../core/math.js';
  import { TGT_SMALL, render3D } from '../render/webgl.js';
  import { savePart } from '../world/state.js';
  import { buildPose, evalBones } from '../hero/skeleton.js';
  export const ITEM_TYPES = {};
  export const MONEY = 'rub';
  export const INV = { hero: [] };
  export let invVer = 0;                 // changes whenever any inventory does: panels redraw on it
  export function itemType(id, def) { ITEM_TYPES[id] = Object.assign({ id, stack: true, price: 0 }, def); return ITEM_TYPES[id]; }
  const invFind = (inv, t) => inv.find((s) => s.t === t);
  export const invCount = (inv, t) => { const s = invFind(inv, t); return s ? s.n : 0; };
  export function invAdd(inv, t, n = 1) { if (!(n > 0)) return; const s = invFind(inv, t); if (s) s.n += n; else inv.push({ t, n }); invVer++; }
  export function invTake(inv, t, n = 1) {
    const s = invFind(inv, t);
    if (!s || s.n < n) return false;
    s.n -= n;
    if (s.n <= 0) inv.splice(inv.indexOf(s), 1);
    invVer++;
    return true;
  }
  // a saved inventory back in: only known types, whole positive counts
  export const invClean = (list) => Array.isArray(list) ? list.filter((s) => s && ITEM_TYPES[s.t] && s.n > 0).map((s) => ({ t: s.t, n: Math.floor(s.n) })) : [];
  // the hero's things in a save (people keep theirs in their own part, people.js)
  savePart('inventory', { phase: 'before', save: () => INV.hero.map((s) => ({ t: s.t, n: s.n })), load: (d) => { INV.hero = invClean(d); invVer++; } });
  export const fmtMoney = (n) => n + ' ₽';
  // the order things are listed in: money first, then what can be worn, then the rest by price
  export const invSorted = (inv) => inv.slice().sort((a, b) => {
    const A = ITEM_TYPES[a.t], B = ITEM_TYPES[b.t];
    return (B.money ? 2 : B.gear ? 1 : 0) - (A.money ? 2 : A.gear ? 1 : 0) || B.price - A.price || A.name.localeCompare(B.name);
  });

  // ---------- icons: each type's little model, drawn once by the engine's own renderer (so the icons are pixel art too) ----------
  const ICONS = new Map();
  export function itemIcon(t, size = 32) {
    const key = t + '|' + size;
    let master = ICONS.get(key);
    if (!master) {
      master = document.createElement('canvas'); master.width = master.height = size;
      const T = ITEM_TYPES[t];
      const ic = T && T.icon ? T.icon() : null;
      if (ic) render3D(TGT_SMALL, { w: size, h: size, ax: size / 2, ay: size / 2, s: S * (ic.zoom || 1) * size / 32, A: ic.at || [0, 0, 0] }, { main: ic.list }, false, master.getContext('2d'), 0, 0);
      ICONS.set(key, master);
    }
    // a canvas can stand in one place of the page only: every use gets a copy
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    cv.getContext('2d').drawImage(master, 0, 0);
    cv.className = 'icon'; cv.setAttribute('aria-hidden', 'true');
    return cv;
  }
  // an icon of some parts of a figure (a jacket, a helmet): the figure stands with its arms out, only those groups are drawn
  export function figureIcon(model, groups, yaw, zoom, anchor) {
    const c = { t: 0, phase: 0, walkW: 0, runW: 0, sitW: 0, smokeW: 0, drinkW: 0, punchW: 0, shootW: 0, throwW: 0, reachW: 0, talkW: 0 };
    const pose = buildPose(c, model.D, false), D = model.D;
    pose.p.lHand = [D.sx + 0.34, D.shY - 0.4, 0.05]; pose.p.rHand = [-D.sx - 0.34, D.shY - 0.4, 0.05];
    const B = evalBones(pose.p, [0, 0, 0], yaw, D);
    const list = model.parts.filter((pt) => !groups || groups.includes(pt.group)).map((pt) => ({ mesh: pt.mesh, model: mul(B[pt.bone], pt.off), mat: pt.mat }));
    return { list, at: anchor(B), zoom };
  }
  // a single prop: parts = [{ mesh, model, mat }] already placed; the camera looks at `at`
  export const propIcon = (parts, zoom, at = [0, 0, 0]) => ({ list: parts, at, zoom });

  // ---------- a grid of things for a page: a button per type with its icon, name and a state line; rebuilt when invVer changes ----------
  // opts: { inv: () => the inventory, state(t, n) → text, pressed(t) → bool, tap(t), hide(t) → bool (money is usually shown apart), icon: size in px (40) }
  export function invGrid(el, opts) {
    let ver = -1;
    const rows = new Map();
    function refresh(force) {
      if (!el || (!force && ver === invVer)) return;
      ver = invVer;
      const inv = invSorted(opts.inv()).filter((s) => !(opts.hide && opts.hide(s.t)));
      const want = new Set(inv.map((s) => s.t));
      for (const [t, b] of rows) if (!want.has(t)) { b.remove(); rows.delete(t); }
      inv.forEach((s, i) => {
        let b = rows.get(s.t);
        if (!b) {
          const T = ITEM_TYPES[s.t];
          b = document.createElement('button'); b.type = 'button'; b.className = 'item'; b.dataset.t = s.t;
          const nm = document.createElement('span'); nm.className = 'iname'; nm.textContent = T.name;
          const st = document.createElement('span'); st.className = 'istate';
          b.append(itemIcon(s.t, opts.icon || 40), nm, st);
          b.addEventListener('click', () => opts.tap && opts.tap(s.t));
          rows.set(s.t, b);
        }
        if (el.children[i] !== b) el.insertBefore(b, el.children[i] || null);
        b.querySelector('.istate').textContent = opts.state ? opts.state(s.t, s.n) : (s.n > 1 ? '×' + s.n : '');
        if (opts.pressed) b.setAttribute('aria-pressed', String(!!opts.pressed(s.t)));
      });
    }
    return { refresh };
  }
