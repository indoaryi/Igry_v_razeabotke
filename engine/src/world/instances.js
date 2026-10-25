  // ================= the things in a location: each map entry built from the catalog, baked into world space, given an id =================
  // CATALOG says what can stand on a map: CATALOG[type] = { build(def) → { kit, blocks, spots, seats, heights, lamp, … }, name, size, note,
  //   and flags the engine reads: xray (big enough to hide the hero: he shows through it as a silhouette), hug (weeds grow thick along it),
  //   litter (how many butts and caps lie around it), bounds: false (left out of the overview's frame), leafy(def) (drops leaves),
  //   midges (midges swarm over it at dusk), near(inst, x, z) (distance to its edge, when that is not its blocks) }.
  // The engine's library (engine/src/props) and the game fill it.
  // USE says what the player can do with a type: USE[type] = { name(inst), note(inst), acts(inst) → [{ label, run, off }], active(def) }.
  // Only types with a USE answer taps; an instance may carry its own .use (the walking machines do).
  import { M, clamp, ry, tr, wrapA, xf } from '../core/math.js';
  import { bake, screenRect, shadowRect } from '../render/kit.js';
  import { LOC_HOOKS, MAP } from './map.js';
  import { memoryOf } from './state.js';
  export const CATALOG = {};
  export const USE = {};
  // all of these belong to the current location; locations.js swaps them when the hero walks to another one
  export let INST = [];
  export let HEIGHTS = [];      // walkable raised areas (porches, steps)
  export let nextId = 2;        // object ids are written into an 8-bit picking buffer, so each location numbers its own from 2
  // an id for something that joins the current location later (a person walking in, a machine)
  export const newId = () => nextId++;
  // the current location's things come back from its kept runtime (locations.js)
  export function restoreThings(rt) { ({ INST, HEIGHTS, instById, PATH_SEGS, nextId } = rt); }
  export function toWorld2(M0, p) { const w = xf(M0, [p[0], 0, p[1]]); return [w[0], w[2]]; }
  // a thing's key: its type and place on the map (a part of something — by the key of its whole and its place in it);
  // the same thing gets the same key every time the location is built, so what it remembers comes back to it (state.js)
  // (things in the same place — tiles of the meadow — are told apart by their order)
  const keyOf = (def) => def.parent ? def.parent.key + '/' + def.type + '@' + def.local.join(',') : def.type + '@' + def.at.join(',');
  let keysUsed = new Map();
  export function instantiate(def, parentM) {
    const T = CATALOG[def.type];
    if (!T) throw new Error('no such type in the catalog: ' + def.type);
    const built = T.build(def);
    const rot = (def.rot || 0) * Math.PI / 180;
    const M0 = parentM ? M(parentM, tr(def.local[0], 0, def.local[1])) : M(tr(def.at[0], 0, def.at[1]), ry(rot));
    const yaw0 = Math.atan2(M0[8], M0[10]);
    const { chunks, bb } = bake(built.kit, M0);
    const U = USE[def.type], active = !!U && (!U.active || U.active(def));
    let key = keyOf(def);
    const seen = keysUsed.get(key) || 0;
    keysUsed.set(key, seen + 1);
    if (seen) key += '#' + seen;
    const inst = {
      id: def.type === 'meadow' ? 0 : nextId++, key, def, type: def.type, T, M0, yaw0, built, chunks, bb, active,
      sr: screenRect(bb), shr: shadowRect(bb), n: def.n || 0, dyn: Object.assign({}, memoryOf(MAP.id, key)),
      center: [(bb[0] + bb[3]) / 2, (bb[2] + bb[5]) / 2], leafy: !!(T.leafy && T.leafy(def))
    };
    inst.blocks = (built.blocks || []).map((b) => b.rect ? { poly: [[b.rect[0], b.rect[1]], [b.rect[2], b.rect[1]], [b.rect[2], b.rect[3]], [b.rect[0], b.rect[3]]].map((p) => toWorld2(M0, p)) } : { c: toWorld2(M0, b.c), r: b.r });
    inst.spots = (built.spots || []).map((s) => Object.assign({}, s, { w: toWorld2(M0, s.at), wyaw: wrapA(yaw0 + s.yaw) }));
    for (const h of built.heights || []) {
      const ps = [[h.rect[0], h.rect[1]], [h.rect[2], h.rect[3]]].map((p) => toWorld2(M0, p));
      HEIGHTS.push({ x0: Math.min(ps[0][0], ps[1][0]), x1: Math.max(ps[0][0], ps[1][0]), z0: Math.min(ps[0][1], ps[1][1]), z1: Math.max(ps[0][1], ps[1][1]), y: h.y });
    }
    for (const c of chunks) {
      const m = c.mat;
      c.flags = (m.fl || 0) | (active ? 2 : 0) | (m.fade ? 8 : 0);
      c.fade = !!m.fade; c.shadow = !m.noShadow && !c.lines;
    }
    INST.push(inst);
    for (const ch of built.children || []) instantiate(Object.assign({}, ch, { parent: inst }), M0);
    return inst;
  }
  export const byType = (t) => INST.filter((i) => i.type === t);
  export let instById = new Map();
  // builds every object of the current location (MAP) from scratch; then the engine's modules add theirs (LOC_HOOKS.objects:
  // the walking machines that stand here, the meadow over the lawns)
  export function buildWorld() {
    INST = []; HEIGHTS = []; nextId = 2; instById = new Map(); keysUsed = new Map();
    PATH_SEGS = [];
    for (const pl of MAP.paths || []) for (let i = 0; i < pl.length - 1; i++) PATH_SEGS.push([pl[i], pl[i + 1]]);
    for (const d of MAP.objects || []) instantiate(d);
    if (MAP.afterBuild) MAP.afterBuild();
    for (const f of LOC_HOOKS.objects) f(MAP);
    for (const i of INST) if (i.id) instById.set(i.id, i);
  }
  // distance from a point to the nearest trodden path of the map
  export let PATH_SEGS = [];
  export function pathDist(x, z) {
    let best = 99;
    for (const [a, b] of PATH_SEGS) {
      const ex = b[0] - a[0], ez = b[1] - a[1], u = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez), 0, 1);
      best = Math.min(best, (x - a[0] - ex * u) ** 2 + (z - a[1] - ez * u) ** 2);
    }
    return Math.sqrt(best);
  }
  export const groundY = (x, z) => { let y = 0; for (const h of HEIGHTS) if (x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1) y = Math.max(y, h.y); return y; };
  // a point in an instance's own frame → world
  export const localPt = (inst, p) => xf(inst.M0, p);
  // what the player sees and can do with a thing
  const useOf = (inst) => inst.use || USE[inst.type] || null;
  export function nameOf(inst) {
    const U = useOf(inst);
    if (U && U.name) return typeof U.name === 'function' ? U.name(inst) : U.name;
    return CATALOG[inst.type] ? CATALOG[inst.type].name : inst.type;
  }
  export function noteOf(inst) { const U = useOf(inst); return U && U.note ? (typeof U.note === 'function' ? U.note(inst) : U.note) : ''; }
  // the name in the chip over the stage («рядом: …»): lower case, unless the thing gives its own (a person keeps his surname capitalised)
  export function chipOf(inst) { const U = useOf(inst); return U && U.short ? (typeof U.short === 'function' ? U.short(inst) : U.short) : nameOf(inst).toLowerCase(); }
  export function actionsOf(inst) { const U = useOf(inst); return U && U.acts ? U.acts(inst) : []; }
