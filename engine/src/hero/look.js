  // ================= how people look: a body on the common skeleton, dressed in pieces =================
  // Everyone stands on the same skeleton (skeleton.js): the same bones, poses, walk and gestures. How someone looks is a look:
  //   { id, dims: { … } (changes to the proportions, see dims() in model.js), armor: true (bulky kit: the arms hang off the body),
  //     pieces: [names from PERSON_PIECES], colors: { … } (the pieces read what they need), seed }
  // A piece is a function (put, D, C, look) that puts parts on bones: put(bone, key, () => mesh, offset in bone space, material, group).
  // The key names the mesh (it is cached by it), so it has to change whenever the shape does. Parts that share a bone, a material and
  // a group are merged into one mesh: the fully kitted soldier is ~7500 triangles in about fifty draws. Groups let an icon show one piece alone.
  // put.glow(bone, at, n) marks a point that shines in the dark (a lens, a lamp): at — in the bone's space, n — which way it faces;
  // the stage draws the glows of whoever the player steers.
  //
  // Things that are worn are WEAR entries: { slot: 'body' | 'head' | 'hands' | …, pieces: [what it puts on], covers: [regions of the
  // body it hides], armor: true (it makes the wearer bulky), held: 'rifle' (it is carried in the hands, not put on) }.
  // A piece of a look may name the region it belongs to (PIECE_REGION); dress(look, worn) leaves out the pieces the worn things cover
  // and adds the things' own. So any thing fits anyone whose look is made of pieces, and a new thing is one more WEAR entry.
  import { ID4, M, alongMinusY, alongPlusY, len, rng, sub, tr } from '../core/math.js';
  import { capsule, cyl } from '../render/meshes.js';
  import { rawMesh, upload } from '../render/webgl.js';
  import { mergeRaw } from '../render/kit.js';
  import { dims } from './model.js';
  export const PERSON_PIECES = {};
  export const PIECE_REGION = {};       // piece name → the region of the body it belongs to ('head', 'torso', 'arms', 'feet'…)
  export const WEAR = {};
  const PERSON_MODELS = new Map();
  export function buildPerson(look) {
    let model = PERSON_MODELS.get(look.id);
    if (model) return model;
    const D = Object.assign(dims(!!look.armor), look.dims || {}, { armor: !!look.armor });
    const C = look.colors || {};
    const raw = [], glows = [];
    const put = (bone, key, fn, off, m, group) => raw.push({ bone, mesh: rawMesh('person:' + key, fn), off: off || ID4, mat: m, group: group || 'body' });
    put.glow = (bone, at, n) => glows.push({ bone, at, n });
    for (const name of look.pieces) PERSON_PIECES[name](put, D, C, look);
    const groups = new Map();
    for (const p of raw) {
      const key = p.bone + '|' + p.mat.key + '|' + p.group + '|' + (p.mesh.lines ? 1 : 0);
      let g = groups.get(key);
      if (!g) { g = { bone: p.bone, mat: p.mat, group: p.group, parts: [] }; groups.set(key, g); }
      g.parts.push(p);
    }
    const R = rng(look.seed || 4711);
    model = {
      look, D, glows,
      parts: [...groups.values()].map((g) => ({ bone: g.bone, mat: g.mat, group: g.group, off: ID4, noShadow: !!g.mat.noShadow || !!g.parts[0].mesh.lines, mesh: upload(mergeRaw(g.parts, R)) }))
    };
    PERSON_MODELS.set(look.id, model);
    return model;
  }
  // a look with things put on: the pieces they cover are left out, their own pieces are added; worn — ids of WEAR entries
  // (things carried in the hands change no pieces). The id says what is worn, so each set of clothes is built once.
  export function dress(look, worn) {
    const things = worn.filter((id) => id && WEAR[id] && WEAR[id].pieces);
    const hidden = new Set(things.flatMap((id) => WEAR[id].covers || []));
    const pieces = look.pieces.filter((p) => !hidden.has(PIECE_REGION[p]));
    for (const id of things) pieces.push(...WEAR[id].pieces);
    return Object.assign({}, look, { id: look.id + (things.length ? '|' + things.join('+') : ''), pieces, armor: !!look.armor || things.some((id) => WEAR[id].armor), worn: things });
  }
  // a rod (capsule) from a to b in a bone's space, and a plain cylinder
  export function personRod(put, bone, key, a, b, r, m, group) {
    const L = len(sub(b, a));
    put(bone, key + ':' + L.toFixed(3) + ',' + r, () => capsule(L, r, r, { seg: 6 }), M(tr(...a), alongMinusY(sub(b, a))), m, group);
  }
  export function personCyl(put, bone, key, a, b, r, m, group, seg = 10) {
    const L = len(sub(b, a));
    put(bone, key + ':' + L.toFixed(3) + ',' + r, () => cyl(r, r, L, seg), M(tr(...a), alongPlusY(sub(b, a))), m, group);
  }
