  // ================= time of day: one clock, the sun's path, the colour of the light, lamps, lit windows, mist =================
  // The clock runs in hours (0…24) and is the same in every location. A location says where its sun stands at one hour
  // (def.sun at def.sunAt, 14:00 if not given); from there the sun walks the sky — low in the east in the morning, high at noon,
  // low in the west in the evening — and at night a weaker moon takes over. Everything else that changes with the hour is in
  // DAY_KEYS: the tint of sunlit and shaded parts, how strong the shadows are, how many lamps and windows are lit, morning mist,
  // the colour of the air around the map, how cold it is (breath shows). The game reads DAYP each frame.
  const DAY = { t: 14, run: false, rate: 1 / 25, goal: null, span: 0, rise: 6.6, set: 18.9, elMax: 0.95, sunOn: 5.9, sunOff: 19.5 };
  const DAY_PRESETS = [{ id: 'morning', name: 'Утро', h: 8 }, { id: 'day', name: 'День', h: 14 }, { id: 'evening', name: 'Вечер', h: 17.75 }, { id: 'night', name: 'Ночь', h: 23.5 }];
  //   hour   sunlit tint          shade tint           shadows lamps windows mist  air (around the map)  cold  saturation
  const DAY_KEYS = [
    [0.0, [0.38, 0.45, 0.68], [0.26, 0.31, 0.5], 0.45, 1, 0.22, 0.05, '#1a2232', 1, 0.5],
    [4.6, [0.38, 0.44, 0.66], [0.26, 0.3, 0.48], 0.45, 1, 0.06, 0.35, '#1b2334', 1, 0.5],
    [5.9, [0.56, 0.57, 0.74], [0.4, 0.43, 0.6], 0.0, 1, 0.14, 0.85, '#4d5872', 1, 0.6],
    [6.8, [1.0, 0.76, 0.64], [0.58, 0.61, 0.8], 0.55, 0.35, 0.16, 1.0, '#c6aca8', 1, 0.82],
    [8.0, [1.05, 0.95, 0.85], [0.77, 0.83, 0.98], 1, 0, 0.05, 0.65, '#d3d6d5', 0.8, 0.92],
    [10.0, [1.02, 1.0, 0.96], [0.93, 0.96, 1.0], 1, 0, 0, 0, '#cdd4d0', 0.2, 1],
    [14.0, [1, 1, 1], [1, 1, 1], 1, 0, 0, 0, null, 0, 1],
    [16.0, [1.05, 1.0, 0.92], [0.92, 0.93, 1.0], 1, 0, 0.02, 0, '#cfd1c8', 0.1, 1.02],
    [17.75, [1.18, 0.94, 0.7], [0.8, 0.75, 0.92], 1, 0, 0.1, 0, '#dcbf9c', 0.3, 1.06],
    [18.8, [1.08, 0.68, 0.5], [0.52, 0.52, 0.77], 0.65, 0.6, 0.25, 0.05, '#a68797', 0.6, 0.88],
    [19.5, [0.56, 0.58, 0.82], [0.43, 0.46, 0.69], 0.0, 1, 0.36, 0.08, '#454f6a', 0.8, 0.62],
    [21.0, [0.44, 0.5, 0.74], [0.3, 0.35, 0.56], 0.45, 1, 0.44, 0.04, '#222a3c', 1, 0.52],
    [23.5, [0.39, 0.46, 0.69], [0.27, 0.32, 0.51], 0.45, 1, 0.3, 0.03, '#1b2333', 1, 0.5]
  ];
  // what the hour looks like right now (filled by dayFrame)
  const DAYP = { h: 14, sunTint: [1, 1, 1], shadeTint: [1, 1, 1], shadowK: 1, lamps: 0, windows: 0, mist: 0, sky: null, cold: 0, night: 0, moon: false, dir: [0, 1, 0] };
  let dayStageRGB = null, dayDark = false;
  function dayReadStage() {
    const box = $('stageBox'); if (!box) return;
    box.style.backgroundColor = '';
    const m = getComputedStyle(box).backgroundColor.match(/\d+(\.\d+)?/g);
    if (m) dayStageRGB = m.slice(0, 3).map((v) => +v / 255);
    dayDark = !!dayStageRGB && (dayStageRGB[0] + dayStageRGB[1] + dayStageRGB[2]) / 3 < 0.4;
    DAYP.skyCss = null;
  }
  const fmtHour = (h) => { const m = Math.floor(((h % 24) + 24) % 24 * 60 + 1e-6); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  function dayPeriod(h = DAY.t) { return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 16.5 ? 'day' : h >= 16.5 && h < 21 ? 'evening' : 'night'; }
  // the clock: running by itself, or hurrying forward to an hour that was picked
  function dayGoto(h) { const span = ((h - DAY.t) % 24 + 24) % 24; if (span < 0.01) return; DAY.goal = h; DAY.span = span; }
  function daySet(h) { DAY.t = ((h % 24) + 24) % 24; DAY.goal = null; }
  function dayUpdate(dt) {
    if (DAY.goal != null) {
      const left = ((DAY.goal - DAY.t) % 24 + 24) % 24, step = Math.max(2.4, DAY.span / 2.2) * dt;
      if (left <= step || left > 23.999) { DAY.t = DAY.goal; DAY.goal = null; } else DAY.t = (DAY.t + step) % 24;
    } else if (DAY.run) DAY.t = (DAY.t + dt * DAY.rate) % 24;
  }
  // the keys around an hour, blended smoothly (the list wraps round midnight)
  function dayLook(h) {
    const K = DAY_KEYS, n = K.length;
    let i = n - 1;
    for (let k = 0; k < n; k++) if (K[k][0] <= h) i = k;
    const a = K[i], b = K[(i + 1) % n], h1 = b[0] <= a[0] ? b[0] + 24 : b[0], hh = h < a[0] ? h + 24 : h;
    const t = smooth((hh - a[0]) / (h1 - a[0]));
    const stage = dayStageRGB || [0.796, 0.827, 0.812];
    const air = (x) => !x ? stage : dayDark ? lerpV(scl(hex2rgb(x), 0.42), stage, 0.3) : hex2rgb(x);
    const ca = air(a[7]), cb = air(b[7]);
    return {
      sunTint: lerpV(a[1], b[1], t), shadeTint: lerpV(a[2], b[2], t), shadowK: lerp(a[3], b[3], t), lamps: lerp(a[4], b[4], t), windows: lerp(a[5], b[5], t),
      mist: lerp(a[6], b[6], t), sky: lerpV(ca, cb, t), cold: lerp(a[8], b[8], t), sat: lerp(a[9], b[9], t)
    };
  }
  // where the light comes from: the sun between sunOn and sunOff, the moon the rest of the night (the switch happens when shadows are gone)
  function dayLightDir(h, def) {
    const ref = nrm(def.sun || [-0.15, 1, 0.72]), az0 = Math.atan2(ref[2], ref[0]), h0 = def.sunAt ?? 14;
    if (h >= DAY.sunOn && h < DAY.sunOff) {
      const el = Math.max(0.2, DAY.elMax * Math.sin(Math.PI * (h - DAY.rise) / (DAY.set - DAY.rise)));
      const az = az0 + (h - h0) * Math.PI / 12;
      return { dir: [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], moon: false };
    }
    const el = 0.85, az = az0 + 0.7;
    return { dir: [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], moon: true };
  }
  // the light that picks each face's tone follows the sun's side of the screen, so faces turned to the sun are the light ones
  function dayToneLight(dir) {
    const hz = nrm([dir[0], 0, dir[2]]), side = clamp(dot(hz, RV) * 2.2, -1, 1);
    return nrm(add(add(scl(RV, 0.9 * side), [0, 0.9, 0]), scl(FV, -0.25)));
  }
  // street lamps and porch lamps come on one by one at dusk and go out one by one in the morning; one in a yard flickers
  function lampState(i) {
    const P = i.M0, hsh = hash2(Math.round(P[12] * 10), Math.round(P[14] * 10), 77);
    const th = 0.15 + 0.7 * hsh;
    let k = smooth((DAYP.lamps - th) / 0.05 + 0.5);
    if (k > 0 && i.built.lamp.flicker) {
      const s = Math.floor(performance.now() / 90), f = hash2(s, Math.round(P[12]), 5);
      if (Math.floor(performance.now() / 2600 + hsh * 7) % 3 === 0) k *= f < 0.45 ? 0.1 : 1;
    }
    return k;
  }
  const dayLamps = [];      // lamps lit this frame: world point of the bulb, its glow — for the halos and moths in the 2D layer
  function dayLightsFor(rect) {
    const L = [];
    dayLamps.length = 0;
    if (DAYP.lamps > 0) for (const i of INST) {
      const lp = i.built && i.built.lamp; if (!lp) continue;
      const k = lampState(i); if (k <= 0.01) continue;
      const bulb = xf(i.M0, lp.at);
      dayLamps.push({ p: bulb, k, kind: lp.kind });
      L.push({ p: add(bulb, [0, -0.08, 0]), r: lp.r, col: lp.col, k: k * lp.k, d: lp.dir || [0, -1, 0], cone: lp.cone ?? -2 });
    }
    for (const f of GAME.lights) f(L);     // lights that move: a machine's headlamps
    // keep the ones that reach into the view, nearest to its centre first
    const cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2, pad = 60;
    const near = L.map((l) => { const s = wpx(l.p), g = wpx([l.p[0], 0, l.p[2]]), rp = l.r * S; return { l, d: Math.hypot(g[0] - cx, g[1] - cy), vis: g[0] + rp > rect[0] - pad && g[0] - rp < rect[2] + pad && Math.min(s[1], g[1]) - rp < rect[3] + pad && g[1] + rp > rect[1] - pad }; })
      .filter((q) => q.vis).sort((a, b) => a.d - b.d).slice(0, 12);
    const T = { nl: near.length, LP: new Float32Array(48), LC: new Float32Array(48), LD: new Float32Array(48) };
    near.forEach(({ l }, j) => {
      T.LP.set([l.p[0], l.p[1], l.p[2], l.r], j * 4);
      T.LC.set([l.col[0], l.col[1], l.col[2], l.k], j * 4);
      const d = nrm(l.d); T.LD.set([d[0], d[1], d[2], l.cone], j * 4);
    });
    return T;
  }
  // once a frame before the scene is drawn: the light of this hour in this location → the renderer
  let daySunKey = '';
  function dayFrame(rect, timeSec) {
    const h = DAY.t, look = dayLook(h), src = dayLightDir(h, MAP);
    Object.assign(DAYP, look, { h, dir: src.dir, moon: src.moon });
    DAYP.night = clamp((0.8 - (look.sunTint[0] + look.sunTint[1] + look.sunTint[2]) / 3) / 0.3, 0, 1);
    const key = src.dir.map((v) => v.toFixed(4)).join(',') + MAP.id;
    if (key !== daySunKey) {
      daySunKey = key;
      setSun(src.dir, dayToneLight(src.dir));
      for (const i of INST) if (i.bb) i.shr = shadowRect(i.bb);     // shadows now fall elsewhere: redo what each object may shade
    }
    const sky = 'rgb(' + look.sky.map((v) => Math.round(v * 255)).join(',') + ')';
    if (sky !== DAYP.skyCss) { DAYP.skyCss = sky; const box = $('stageBox'); if (box) box.style.backgroundColor = sky; }
    const T = dayLightsFor(rect);
    return Object.assign(T, {
      sunTint: look.sunTint, shadeTint: look.shadeTint, shadowK: look.shadowK, sat: look.sat,
      win: [look.windows, timeSec, DAYP.night, 0], mist: look.mist, mistCol: lerpV([0.84, 0.86, 0.88], [0.72, 0.76, 0.86], DAYP.night), time: timeSec
    });
  }
  function dayKey() { return DAY.t.toFixed(3) + (DAYP.lamps > 0 ? '|' + dayLamps.map((l) => l.k.toFixed(2)).join(',') : ''); }
