  // ================= locations: several maps in one game; walking into an exit zone leads to the next one =================
  // A location is a plain definition (see pyatietazhki/src/map.js): size, ground rows, paths, objects, spawns, exits, look…
  // Its runtime — built objects, the ground picture, walk grids, pigeons — is made the first time the hero comes and kept,
  // so going back is instant and things stay where they were left (a parked machine, cans on the ground, footprints).
  const LOCATIONS = {};
  const LOC_RT = {};
  // the game hooks in here: leave(def) before switching away, enter(def, spawnName) after arriving
  const LOC_HOOKS = { leave: [], enter: [] };
  let travelState = null;     // { exit, t, phase: 'out' | 'in' } while the screen fades
  let stageFade = 0;          // 0…1 darkness drawn over the stage
  function setGeometry(size) {
    GW = size[0]; GH = size[1];
    G = { x0: -HW * GH, y0: 0, w: HW * (GW + GH), h: HH * (GW + GH) + 14 };
    GROUND_BOUNDS.set([0, 0, GW, GH]);
  }
  function saveRuntime() {
    const rt = MAP && LOC_RT[MAP.id];
    if (!rt) return;
    Object.assign(rt, { INST, HEIGHTS, instById, PATH_SEGS, nextId, ground, navHero: NAV.hero.b, navBig: NAV.big.b, PIGEONS, PIG_HOME, PERCHES });
  }
  function restoreRuntime(rt) {
    ({ INST, HEIGHTS, instById, PATH_SEGS, nextId, ground, PIGEONS, PIG_HOME, PERCHES } = rt);
    NWX = GW * NR; NWZ = GH * NR;
    NAV.hero.b = rt.navHero; NAV.big.b = rt.navBig; navB = NAV.hero.b;
  }
  function buildRuntime(def) {
    if (!def.ground) def.ground = def.makeGround(def);
    buildWorld();
    initDyn();
    initPigeons();
    navAlloc(); buildNav(NAV.hero);
    ground = buildGround();
    LOC_RT[def.id] = {};
    saveRuntime();
    if (def.afterRuntime) def.afterRuntime();
  }
  // switch to a location and put the hero (or the machine he drives) at one of its spawns
  function enterLocation(id, spawnName) {
    const from = MAP && LOC_RT[MAP.id] ? MAP : null;
    if (from) { for (const f of LOC_HOOKS.leave) f(from); saveRuntime(); }
    const def = LOCATIONS[id];
    MAP = def;
    setGeometry(def.size);
    setSun(def.sun || [-0.15, 1, 0.72], def.light);
    if (LOC_RT[id]) restoreRuntime(LOC_RT[id]); else buildRuntime(def);
    uploadGround(ground);
    fitWorldBounds();
    smokeP.length = 0; fx.length = 0; hits.length = 0; leavesP.length = 0;
    const sp = def.spawns[spawnName] || def.spawns.start;
    hero.x = sp.at[0]; hero.z = sp.at[1]; hero.y = groundY(hero.x, hero.z); hero.yaw = hero.tyaw = sp.yaw;
    hero.path.length = 0; hero.queue.length = 0; hero.target = null; hero.focus = null; hero.aimAt = null;
    if (!hero.vehicle) { hero.act = null; hero.sit = hero.sitTarget = 0; hero.seat = null; }
    hero.arrived = true;
    camX = null; lastKey = '';
    for (const f of LOC_HOOKS.enter) f(def, spawnName);
    saveRuntime();
    if (sp.walk) hero.queue.push({ type: 'path', to: sp.walk, run: false });
  }
  const exitAt = (x, z) => (MAP.exits || []).find((e) => x >= e.rect[0] && x <= e.rect[2] && z >= e.rect[1] && z <= e.rect[3]);
  // walk to the exit that leads to another location (the yard buttons under the stage use this)
  function goToLocation(id) {
    if (id === MAP.id || travelState) return;
    const e = (MAP.exits || []).find((x) => x.to === id);
    if (!e) return;
    if (hero.vehicle) machineWalkTo(hero.vehicle, e.go[0], e.go[1]); else walkTo(e.go[0], e.go[1]);
  }
  function updateTravel(dt) {
    const T = travelState;
    if (T) {
      T.t += dt;
      if (T.phase === 'out') {
        stageFade = Math.min(1, T.t / 0.35);
        if (T.t >= 0.4) { enterLocation(T.exit.to, T.exit.arrive); T.phase = 'in'; T.t = 0; stageFade = 1; }
      } else {
        stageFade = Math.max(0, 1 - T.t / 0.55);
        if (T.t >= 0.55) { travelState = null; stageFade = 0; toast(MAP.name + (MAP.arrival ? '. ' + MAP.arrival : '')); }
      }
      return;
    }
    const e = exitAt(hero.x, hero.z);
    if (!e) { hero.arrived = false; return; }
    if (hero.arrived) return;
    if (hero.act && !hero.vehicle) return;
    if (hero.vehicle && !machineCanTravel(hero.vehicle)) return;
    travelState = { exit: e, t: 0, phase: 'out' };
    hero.path.length = 0; hero.queue.length = 0; hero.target = null;
  }
