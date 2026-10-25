  // ================= locations: several maps in one game, each built the first time the hero comes and kept =================
  // The maps themselves and the hooks are in map.js. A location's runtime — built objects, the ground picture, walk grids,
  // whatever the game keeps — is made the first time the hero comes and kept, so going back is instant and things stay
  // where they were left (a parked machine, cans on the ground, footprints).
  // Walking into an exit is the hero's business (hero/travel.js): this module only switches.
  const LOC_RT = {};
  function saveRuntime() {
    const rt = MAP && LOC_RT[MAP.id];
    if (!rt) return;
    Object.assign(rt, { INST, HEIGHTS, instById, PATH_SEGS, nextId, ground, navHero: NAV.hero.b, navBig: NAV.big.b });
    for (const f of LOC_HOOKS.save) f(rt);
  }
  function restoreRuntime(rt) {
    restoreThings(rt);
    setGround(rt.ground);
    navRestore(rt);
    for (const f of LOC_HOOKS.restore) f(rt);
  }
  function buildRuntime(def) {
    if (!def.ground) def.ground = def.makeGround(def);
    buildWorld();
    for (const f of LOC_HOOKS.build) f(def);
    navAlloc(); buildNav(NAV.hero);
    setGround(buildGround());
    LOC_RT[def.id] = {};
    saveRuntime();
    if (def.afterRuntime) def.afterRuntime();
  }
  // switch to a location; LOC_HOOKS.enter puts the hero (or the machine he drives) at one of its spawns and lets everyone settle in
  function enterLocation(id, spawnName) {
    const from = MAP && LOC_RT[MAP.id] ? MAP : null;
    if (from) { for (const f of LOC_HOOKS.leave) f(from); saveRuntime(); }
    const def = LOCATIONS[id];
    setMap(def);
    setGeometry(def.size);
    setSun(def.sun || [-0.15, 1, 0.72], def.light);
    if (LOC_RT[id]) restoreRuntime(LOC_RT[id]); else buildRuntime(def);
    uploadGround(ground);
    for (const f of LOC_HOOKS.enter) f(def, spawnName);
    saveRuntime();
  }
  const exitAt = (x, z) => (MAP.exits || []).find((e) => x >= e.rect[0] && x <= e.rect[2] && z >= e.rect[1] && z <= e.rect[3]);
