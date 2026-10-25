  // ================= portrait and icons =================
  const portraitCtx = $('portrait').getContext('2d');
  let portraitKey = '', portraitVisible = true;
  const portraitStale = () => { portraitKey = ''; };     // gear changed: draw the portrait afresh
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { for (const e of es) portraitVisible = e.isIntersecting; }).observe($('portrait'));
  hook(GAME.frame, (dt, now) => { if (portraitVisible) drawPortrait(now / 1000); }, 10);
  function drawPortrait(time) {
    const yaw = Math.floor(time / 1.1) % 8 * (Math.PI / 4) + Math.PI / 4;
    const c = { t: q(time), phase: 0, walkW: 0, sitW: 0, smokeW: 0, drinkW: 0, punchW: 0, shootW: 0 };
    const key = yaw + '|' + c.t + '|' + gearVer;
    if (key === portraitKey) return;
    portraitKey = key;
    const pose = buildPose(c, HERO.D, equip.hands === 'rifle');
    const B = evalBones(pose.p, [0, 0, 0], yaw, HERO.D);
    portraitCtx.clearRect(0, 0, 116, 172);
    render3D(TGT_SMALL, { w: 116, h: 172, ax: 58, ay: 154, s: S }, { main: heroList(B, pose) }, false, portraitCtx, 0, 0);
  }
  function iconCanvas(id) {
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    const ctx = cv.getContext('2d');
    const saveHero = HERO;
    const one = (eq, groups, yaw, zoom, anchorFn) => {
      setHero(buildHero(eq));
      const c = { t: 0, phase: 0, walkW: 0, sitW: 0, smokeW: 0, drinkW: 0, punchW: 0, shootW: 0 };
      const pose = buildPose(c, HERO.D, false);
      const D = HERO.D;
      pose.p.lHand = [D.sx + 0.34, D.shY - 0.4, 0.05]; pose.p.rHand = [-D.sx - 0.34, D.shY - 0.4, 0.05];
      const B = evalBones(pose.p, [0, 0, 0], yaw, HERO.D);
      render3D(TGT_SMALL, { w: 32, h: 32, ax: 16, ay: 16, s: S * zoom, A: anchorFn(B) }, { main: heroList(B, pose, { groups, noProps: true }) }, false, ctx, 0, 0);
    };
    const single = (list, zoom, A) => render3D(TGT_SMALL, { w: 32, h: 32, ax: 16, ay: 16, s: S * zoom, A }, { main: list }, false, ctx, 0, 0);
    if (id === 'jacket') one({ body: 'jacket', head: null }, ['jacket'], Math.PI / 4, 0.346, (B) => xf(B.chest, [0, 0.04, 0]));
    else if (id === 'armor') one({ body: 'armor', head: null }, ['armorTop'], Math.PI / 4, 0.336, (B) => xf(B.chest, [0, 0.1, 0]));
    else if (id === 'helmet') one({ body: 'jacket', head: 'helmet' }, ['helmet'], 0, 0.71, (B) => xf(B.head, [0, HC[1] - 0.01, 0]));
    else if (id === 'rifle') { const R = frameY([0, 1, 0], RV); single(RIFLE.map((r) => ({ mesh: r.mesh, model: mul(R, r.off), mat: r.mat })), 0.437, xf(R, [0, 0.05, 0.17])); }
    else if (id === 'cigs') single([{ mesh: PROPS.pack.mesh, model: frameY([0, 1, 0], nrm([TOCAM[0], 0, TOCAM[2]])), mat: PROPS.pack.mat }], 3.46, [0, 0, 0]);
    else if (id === 'atom') single([{ mesh: PROPS.can.mesh, model: ry(0.3), mat: PROPS.can.mat }], 2.0, [0, 0.083, 0]);
    setHero(saveHero);
    return cv;
  }

