  // ================= stage: camera, culling, rendering, compositing =================
  const stageEl = $('stage');
  const sctx = stageEl.getContext('2d');
  const scene = document.createElement('canvas');
  const scx = scene.getContext('2d');
  const layer = document.createElement('canvas');
  const lcx = layer.getContext('2d');
  let ground = null;
  let VW = 400, VH = 240, kDev = 1, viewMode = 'far', raw = false, showGrid = false;
  let camX = null, camY = null, lastKey = '', lastView = null, hoverId = 0;
  const CAM_B = { x0: -HW * GH - 40, x1: HW * GW + 40, y0: -380, y1: HH * (GW + GH) + 30 };
  const WORLD_B = { x0: -2130, x1: 2130, y0: -1140, y1: HH * (GW + GH) + 20 };
  function fitStage() {
    const cssW = stageEl.clientWidth || 600, dpr = window.devicePixelRatio || 1;
    const desk = cssW >= 700;
    const want = viewMode === 'near' ? (desk ? 2 : 1.45) : (desk ? 1.25 : 0.8);
    const n = Math.max(1, Math.round(dpr * want));
    const per = n / dpr;
    const aspect = desk ? 16 / 9 : 5 / 4;
    const nVW = Math.max(160, Math.round(cssW / per)), nVH = Math.round(nVW / aspect);
    if (n !== kDev || nVW !== VW || nVH !== VH || stageEl.width !== nVW * n) {
      kDev = n; VW = nVW; VH = nVH;
      stageEl.width = VW * kDev; stageEl.height = VH * kDev;
      stageEl.style.aspectRatio = VW + ' / ' + VH;
      scene.width = VW; scene.height = VH;
      lastKey = '';
    }
  }
  function heroScreen(rig) { return wpx(xf(rig.B.chest, [0, 0, 0])); }
  function itemsFor(inst) {
    if (!inst.items) {
      const big = XRAY_TYPES.has(inst.type);
      inst.items = inst.chunks.map((c) => ({ mesh: c.mesh, model: ID4, mat: c.mat, id: inst.id, flags: c.flags, fade: c.fade, shadow: c.shadow, xr: big || !!c.mat.xr }));
    }
    return inst.items;
  }
  const XRAY_TYPES = new Set(['block5', 'entrance', 'substation', 'garage', 'tree', 'bush']);
  function buildLists(rect, rig) {
    const main = [], shadow = [], occ = [];
    for (const inst of INST) {
      const vis = rectsHit(inst.sr, rect), shv = rectsHit(inst.shr, rect);
      if (!vis && !shv) continue;
      for (const it of itemsFor(inst)) { if (vis) (it.xr ? occ : main).push(it); if (shv && it.shadow) shadow.push(it); }
    }
    for (const it of dynItems()) { main.push(it); if (it.shadow) shadow.push(it); }
    const hl = heroList(rig.B, rig.pose);
    for (const it of hl) shadow.push(it);
    return { main, shadow, occ, hero: hl };
  }
  let tickNow = -1;
  function snapshotTick(t) {
    const tk = Math.floor(t * FPS);
    if (tk === tickNow) return false;
    tickNow = tk;
    for (const s of byType('swing')) if (s.def.seat) s.dyn.thetaD = s.dyn.theta;
    return true;
  }
  function drawStage(dt, clock) {
    snapshotTick(clock);
    const rig = heroRig(true);
    const hs = heroScreen(rig);
    // the camera leans towards what the hero is busy with: the hoop while throwing, the cans while shooting
    let fs = hs;
    const hp = byType('hoop')[0], ball = hp.dyn.ball;
    if (hero.thr.on || ball.state === 'fly') fs = lerpV([...hs, 0], [...wpx(localPt(hp, hp.built.rim)), 0], 0.5);
    else if ((hero.shoot.on || hero.shoot.w > 0) && hero.aimAt) fs = lerpV([...hs, 0], [...wpx(hero.aimAt.pos), 0], 0.45);
    const over = viewMode === 'all';
    let v, rect, ox, oy, sc;
    if (!over) {
      const tx = clamp(fs[0] - VW / 2, CAM_B.x0, CAM_B.x1 - VW), ty = clamp(fs[1] - VH / 2 + 10, CAM_B.y0, CAM_B.y1 - VH);
      if (camX === null) { camX = tx; camY = ty; }
      camX += (tx - camX) * Math.min(1, dt * 5); camY += (ty - camY) * Math.min(1, dt * 5);
      ox = Math.round(camX); oy = Math.round(camY); sc = 1;
      rect = [ox - 8, oy - 8, ox + VW + 8, oy + VH + 8];
      v = raw ? { w: VW * kDev, h: VH * kDev, ax: -ox * kDev, ay: -oy * kDev, s: S * kDev } : { w: VW, h: VH, ax: -ox, ay: -oy, s: S };
    } else {
      const W = VW * kDev, H = VH * kDev;
      sc = Math.min(W / (WORLD_B.x1 - WORLD_B.x0), H / (WORLD_B.y1 - WORLD_B.y0));
      ox = (WORLD_B.x0 + WORLD_B.x1) / 2 - W / sc / 2; oy = (WORLD_B.y0 + WORLD_B.y1) / 2 - H / sc / 2;
      rect = [ox, oy, ox + W / sc, oy + H / sc];
      v = { w: W, h: H, ax: -ox * sc, ay: -oy * sc, s: S * sc };
    }
    const c = rig.c;
    const ckey = [c.t, c.phase, c.walkW, c.runW, c.sitW, c.smokeW, c.smokeT, c.drinkW, c.drinkT, c.punchW, c.punchT, c.shootW, c.shootT, c.throwW, c.throwT, c.reachW, c.reachT, c.act ? JSON.stringify(c.act) : '', hero.seat ? 1 : 0].join(',');
    const key = [ox, oy, rig.root.join(','), rig.yaw.toFixed(3), ckey, tickNow, gearVer, raw, over, VW, VH, kDev, hoverId, dynKey(), hero.target ? hero.target.join(',') : '', showGrid].join('|');
    if (key !== lastKey) {
      lastKey = key;
      const L = buildLists(rect, rig);
      if (layer.width !== v.w || layer.height !== v.h) { layer.width = v.w; layer.height = v.h; }
      lcx.clearRect(0, 0, v.w, v.h);
      const chest = xf(rig.B.chest, [0, 0.05, 0]);
      const cs = [hs[0] * v.s / S + v.ax, hs[1] * v.s / S + v.ay];
      const r = 64 * v.s / S;
      const fade = [cs[0], v.h - cs[1], r * r, depthOf(v, chest)];
      drawCalls = 0;
      render3D(TGT_STAGE, v, L, raw, lcx, 0, 0, {
        xray: true, hover: hoverId, fade, time: tickNow / FPS, sun: { rect, hmax: 18 },
        ground: { x0: G.x0, y0: G.y0, w: G.w, h: G.h, mode: over ? 2 : 1 }, target: hero.target, grid: showGrid
      });
      lastView = { v, ox, oy, sc, over, raw };
      rememberPoints(rig);
    }
    compose(lastView);
  }
  function dynKey() {
    const g = byType('garage')[0], h = byType('hoop')[0];
    return g.dyn.cans.map((c) => c.state[0] + c.pos.map((x) => x.toFixed(2)).join(',') + c.rot.toFixed(1)).join(';') + '|' + h.dyn.ball.state + h.dyn.ball.pos.map((x) => x.toFixed(2)).join(',');
  }
  function rememberPoints(rig) {
    const { B, pose } = rig;
    const tipM = (() => { const sm = pose.st.smoke; if (!sm || !sm.lit) return null; const hand = xf(B.rHand, [0, 0, 0]), mouth = xf(B.head, [0, HC[1] - 0.045, HC[2] + 0.1]); const toMouth = nrm(sub(mouth, hand)), rest = nrm(xfDir(B.chest, [-0.45, 0.35, 0.85])); const u = nrm(lerpV(rest, scl(toMouth, -1), smooth(sm.b))); const filter = add(hand, scl(u, -(0.03 + 0.015 * smooth(sm.b)))); return add(filter, scl(u, CIG_LEN + 0.004)); })();
    last.tip = tipM ? wpx(tipM) : null;
    last.flame = !!(pose.st.smoke && pose.st.smoke.flame);
    if (last.flame && !last.tip) last.tip = wpx(add(xf(B.head, [0, HC[1] - 0.045, HC[2] + 0.1]), [0, -0.02, 0]));
    if (pose.st.drink) { const hand = xf(B.rHand, [0, 0, 0]), up = xfDir(B.chest, [0, 1, 0.1]), sipAx = xfDir(B.chest, [0.05, -0.75, -0.65]); const m = M(tr(...hand), alongPlusY(lerpV(up, sipAx, pose.st.drink.tilt)), tr(0, -0.06, 0)); last.canTop = wpx(xf(m, [0, 0.17, 0])); } else last.canTop = null;
    last.mouth = wpx(xf(B.head, [0, HC[1] - 0.045, HC[2] + 0.1]));
    last.fistL = wpx(xf(B.lHand, [0, 0, 0])); last.fistR = wpx(xf(B.rHand, [0, 0, 0]));
    last.chest = wpx(xf(B.chest, [0, 0.1, 0]));
    const fd = wpx([Math.sin(rig.yaw), 0, Math.cos(rig.yaw)]), fl = Math.hypot(fd[0], fd[1]) || 1;
    last.face = [fd[0] / fl, fd[1] / fl];
    const RW = rifleWorld(pose.rifle, B, HERO.D);
    if (RW && pose.rifle.mode === 'hands') {
      last.muzzle = wpx(xf(RW, RIFLE_MUZZLE)); last.port = wpx(xf(RW, RIFLE_PORT));
      const m2 = wpx(xf(RW, add(RIFLE_MUZZLE, [0, 0, 0.1]))); const ad = [m2[0] - last.muzzle[0], m2[1] - last.muzzle[1]]; const al = Math.hypot(...ad) || 1; last.aim2d = [ad[0] / al, ad[1] / al];
      const p2 = wpx(xf(RW, add(RIFLE_PORT, [-0.1, 0, 0]))); const pd = [p2[0] - last.port[0], p2[1] - last.port[1]]; const pl = Math.hypot(...pd) || 1; last.portDir = [pd[0] / pl, pd[1] / pl];
    } else { last.muzzle = null; last.port = null; }
    last.glows = [];
    const glow = (bone, pt, nLocal) => { const n = nrm(xfDir(bone, nLocal)); if (dot(n, TOCAM) > 0.25) last.glows.push(wpx(xf(bone, pt))); };
    if (!HERO.helmet) glow(B.head, [HC[0] - 0.036, HC[1] + 0.012, HC[2] + 0.13], [0, 0, 1]);
    else for (const sg of [1, -1]) glow(B.head, [HC[0] + sg * 0.168, HC[1] + 0.03, HC[2] + 0.076], [sg * 0.6, 0, 0.8]);
    last.hit = pose.st.punch ? (pose.st.punch.hitL ? last.fistL : pose.st.punch.hitR ? last.fistR : null) : null;
    last.root = wpx(rig.root);
  }
  function compose(lv) {
    if (!lv) return;
    const { v, ox, oy, sc, over } = lv;
    sctx.imageSmoothingEnabled = false;
    sctx.clearRect(0, 0, stageEl.width, stageEl.height);
    if (over) {
      sctx.drawImage(layer, 0, 0);
      drawFx(sctx, sc, ox, oy);
      return;
    }
    if (!raw) {
      scx.clearRect(0, 0, VW, VH);
      scx.drawImage(layer, 0, 0);
      drawFx(scx, 1, ox, oy);
      if (last.hit) {
        const x = Math.round(last.hit[0] + last.face[0] * 4 - ox), y = Math.round(last.hit[1] + last.face[1] * 3 - oy);
        scx.fillStyle = '#ffcf5a'; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) scx.fillRect(x + dx, y + dy, 1, 1);
        scx.fillStyle = '#fff6dc'; for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) scx.fillRect(x + dx, y + dy, 1, 1);
      }
      sctx.drawImage(scene, 0, 0, VW, VH, 0, 0, VW * kDev, VH * kDev);
    } else {
      sctx.drawImage(layer, 0, 0);
      drawFx(sctx, kDev, ox, oy);
    }
  }
  // stage pixel (fractions of the canvas) → world art px
  function viewToWorld(fx, fy) {
    const lv = lastView; if (!lv) return [0, 0];
    if (lv.over) return [lv.ox + fx * lv.v.w / lv.sc, lv.oy + fy * lv.v.h / lv.sc];
    return [lv.ox + fx * VW, lv.oy + fy * VH];
  }
  function pickFrac(fx, fy) {
    const lv = lastView; if (!lv) return null;
    const pk = pickAt(TGT_STAGE, lv.v, fx * lv.v.w, fy * lv.v.h);
    return instById.get(pk.id) || null;
  }

