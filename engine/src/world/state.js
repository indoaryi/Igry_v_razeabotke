  // ================= what the world remembers, and the saves: everything a game keeps between visits, as plain data =================
  // WORLD keeps what has no other owner: what happened to each thing of each location (searched, looked at…) and the story's flags.
  // Everything else stays with its owner, which adds its part to the save with savePart(): the clock (daytime.js), the hero
  // (hero/state.js), his things (people/items.js), people (people.js), what was said (talk.js), machines (machine.js), the camera
  // (ui/hud.js) and whatever the game keeps itself.
  // A save is one JSON object: { v, game, saved, loc, parts: { part id: its data } }. It is applied only while a game boots:
  // loading another save reloads the page into it (ui/saves.js), so nothing built has to be taken apart.
  // Where saves live: the browser's storage of this site, one autosave and three slots per game; a save can also go to a file.
  import { LOC_HOOKS, MAP } from './map.js';
  import { hook } from '../core/game.js';
  export const WORLD = { things: {}, flags: {} };
  export const SAVE_V = 1;
  let GAME_ID = 'game';
  export const gameId = () => GAME_ID;

  // ---------- a thing's memory: what happened to it stays when the hero leaves, saves the game and comes back ----------
  // a thing is known by its key: type and place on the map (instances.js gives every built thing its key);
  // its memory is copied into inst.dyn when the location is built, and remember() writes to both
  export const memoryOf = (locId, key) => (WORLD.things[locId] && WORLD.things[locId][key]) || null;
  export function remember(inst, patch) {
    Object.assign(inst.dyn, patch);
    const L = WORLD.things[MAP.id] || (WORLD.things[MAP.id] = {});
    L[inst.key] = Object.assign(L[inst.key] || {}, patch);
  }
  // the story's flags and counters: met someone, a door is open, a quest step is done
  export const flag = (name) => WORLD.flags[name];
  export function setFlag(name, value = true) { if (value === undefined || value === null) delete WORLD.flags[name]; else WORLD.flags[name] = value; }

  // ---------- parts of a save ----------
  // savePart(id, { phase, save() → plain data, load(data, whole save) }):
  //   phase 'before' — applied before the first location is built (who stands where, what people and machines carry),
  //   phase 'after' — after it, before the hero's model is made (the hero's place and gear, the clock, the camera)
  const SAVE_PARTS = [];
  export function savePart(id, part) { SAVE_PARTS.push(Object.assign({ id, phase: 'after' }, part)); }
  savePart('world', {
    phase: 'before',
    save: () => ({ things: WORLD.things, flags: WORLD.flags }),
    load: (d) => {
      if (d.things && typeof d.things === 'object') WORLD.things = d.things;
      if (d.flags && typeof d.flags === 'object') WORLD.flags = d.flags;
    }
  });
  export function saveData() {
    const parts = {};
    for (const P of SAVE_PARTS) {
      try { parts[P.id] = JSON.parse(JSON.stringify(P.save())); } catch (e) { console.error('save: part ' + P.id, e); }
    }
    return { v: SAVE_V, game: GAME_ID, saved: new Date().toISOString(), loc: MAP ? MAP.id : null, parts };
  }
  // a save fits this game and this version of the format
  export const saveFits = (d) => !!d && typeof d === 'object' && d.game === GAME_ID && Number.isFinite(d.v) && d.v <= SAVE_V && !!d.parts && typeof d.parts === 'object';
  // apply one phase of a save; a part that does not fit is skipped (and said so in the console), the rest still loads
  export function loadSaved(data, phase) {
    if (!saveFits(data)) return false;
    for (const P of SAVE_PARTS) {
      if (P.phase !== phase || data.parts[P.id] === undefined || data.parts[P.id] === null) continue;
      try { P.load(data.parts[P.id], data); } catch (e) { console.error('load: part ' + P.id, e); }
    }
    return true;
  }

  // ---------- where saves are kept: the browser's storage of this site, per game ----------
  const KEY = (slot) => 'igry:' + GAME_ID + ':' + slot;
  export const SAVE_SLOTS = ['auto', '1', '2', '3'];
  export function storeRead(slot) {
    try { const s = localStorage.getItem(KEY(slot)); const d = s ? JSON.parse(s) : null; return saveFits(d) ? d : null; } catch (e) { return null; }
  }
  export function storeWrite(slot, data) { try { localStorage.setItem(KEY(slot), JSON.stringify(data)); return true; } catch (e) { return false; } }
  export function storeDrop(slot) { try { localStorage.removeItem(KEY(slot)); } catch (e) { /* nothing kept here anyway */ } }
  // a load asked for before the page reloads: a slot, 'file' (the save waits in the session) or 'new' (start afresh)
  // (saving by itself stops here: the page is about to go, and closing it must not write the old game over the autosave)
  function askLoad(what, text) {
    try { if (text) sessionStorage.setItem(KEY('file'), text); sessionStorage.setItem(KEY('load'), what); } catch (e) { return false; }
    saving = false;
    location.reload();
    return true;
  }
  export const loadSlot = (slot) => askLoad(slot);
  export function newGame() { storeDrop('auto'); return askLoad('new'); }
  // a save from a file: checked first; true when it fits and the page is reloading into it
  export function loadText(text) {
    let d = null;
    try { d = JSON.parse(text); } catch (e) { return false; }
    return saveFits(d) ? askLoad('file', text) : false;
  }
  function asked() {
    let what = null, text = null;
    try { what = sessionStorage.getItem(KEY('load')); text = sessionStorage.getItem(KEY('file')); sessionStorage.removeItem(KEY('load')); sessionStorage.removeItem(KEY('file')); } catch (e) { return undefined; }
    if (what === 'new') return null;
    if (what === 'file') { try { const d = JSON.parse(text); return saveFits(d) ? d : undefined; } catch (e) { return undefined; } }
    if (what) return storeRead(what) || undefined;
    return undefined;
  }

  // ---------- booting into a save, and saving by itself ----------
  // whenReady(game id, start): start(save or null) is called once the page is ready. Which save: the one asked for before a reload
  // (a slot, a file, or none for a new game), else the page's own snapshot when Claude updates it live, else the autosave.
  export function whenReady(id, start) {
    GAME_ID = id;
    let started = false;
    const go = (d) => { if (started) return; started = true; start(saveFits(d) ? d : null); };
    setTimeout(() => {
      const ask = asked();
      if (ask !== undefined) { go(ask); return; }
      const h = window.claude && window.claude.hot;
      if (h && h.ready) h.ready((d) => go(saveFits(d) ? d : storeRead('auto')));
      else go(h && saveFits(h.data) ? h.data : storeRead('auto'));
    }, 30);
  }
  export const SAVE_EVENTS = { saved: [], started: [] };       // saved(slot): a save was written; started(): the game booted (the panel shows them)
  let saving = false;
  export function saveTo(slot) {
    const ok = storeWrite(slot, saveData());
    if (ok) for (const f of SAVE_EVENTS.saved) f(slot);
    return ok;
  }
  export function autosave() { if (saving) saveTo('auto'); }
  // the game calls it once it has booted: from then on it saves by itself — on arriving in a location, once a minute,
  // when the page is hidden or closed; and Claude's live update of the page keeps the same state
  export function startSaving() {
    if (saving) return;
    saving = true;
    for (const f of SAVE_EVENTS.started) f();
    try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(saveData); } catch (e) { /* no live updates here */ }
    hook(LOC_HOOKS.enter, () => autosave(), 95);
    setInterval(autosave, 60000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
    window.addEventListener('pagehide', () => autosave());
  }
