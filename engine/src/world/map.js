  // ================= the maps of the game and the one being played =================
  // A location is a plain definition (see pyatietazhki/src/map.js or poligon/src/map.js):
  //   id, name, short, size: [w, h] in metres, ground: rows of characters, one per 1 m cell (or makeGround(def) → rows),
  //   paths: polylines of trodden earth, objects: [{ type, at: [x, z], rot, … }], spawns: { start: { at, yaw, walk } … },
  //   exits: [{ to, rect: [x0, z0, x1, z1], go: [x, z], arrive }], machines, sun / sunAt / light, style, meadow, leafRate, butterflies, afterBuild…
  // Ground characters: .  lawn   ,  rough grass and weeds   :  trodden earth   #  asphalt   _  concrete (see ground.js for the colours).
  // The game puts its locations into LOCATIONS; locations.js builds them and switches between them.
  const LOCATIONS = {};
  let MAP = null;            // the location being played
  function setMap(def) { MAP = def; }
  const groundType = (x, z) => { const r = MAP.ground[Math.floor(z)]; return r ? (r[Math.floor(x)] || '.') : '.'; };
  // the game and the engine's modules hook in here:
  //   objects(def): after the location's own objects are built — add more (machines, the meadow); a list kept in order with hook()
  //   build(def): the runtime is made for the first time — the game sets up its own (moving parts, birds)
  //   save(rt) / restore(rt): the hero leaves / comes back — keep the game's own runtime in rt and take it back
  //   leave(def) before switching away, enter(def, spawnName) after arriving (the hero is put at his spawn first: hero/state.js)
  const LOC_HOOKS = { objects: [], build: [], save: [], restore: [], leave: [], enter: [] };
