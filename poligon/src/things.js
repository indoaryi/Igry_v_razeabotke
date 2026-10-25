  // ================= the range's things: what the hero carries, what the warrant officer trades, their little models for icons =================
  // Item types are the engine's (engine/src/people/items.js); each has a price in roubles and a small 3D model the engine draws as an icon.
  const thingMat = (hex, o) => mat(hex, Object.assign({ noise: 0.06, grain: 50 }, o || {}));
  const THING_M = {
    note: thingMat('#a7b28c', { noise: 0.12, grain: 90 }), note2: thingMat('#c4b07c', { noise: 0.12, grain: 90 }),
    orange: thingMat('#d4692a', { spec: 0.4, gloss: 16 }), white: thingMat('#efe9df'),
    tin: thingMat('#b9bcbe', { pat: 6, b: '#5f6f3b', p: [0.014, 0.062, 0, 0], spec: 0.9, gloss: 10 }), lid: thingMat('#9a9da0', { spec: 0.9, gloss: 10 }),
    filter: thingMat('#5c5f52', { pat: 23, p: [70, 0, 0, 0], spec: 0.3, gloss: 14 }), dark: thingMat('#2b2c2e', { spec: 0.4, gloss: 16 }),
    cell: thingMat('#3a3b3d', { pat: 6, b: '#c08a3a', p: [0.038, 0.06, 0, 0], spec: 0.5, gloss: 14 }),
    torch: thingMat('#3c4a3a', { pat: 23, p: [40, 0, 0, 0], spec: 0.4, gloss: 14 }), lens: flat('#f6e7a6', 4),
    brass: thingMat('#c9a24a', { spec: 1, gloss: 8 }), brassDark: thingMat('#8f6f2e', { spec: 0.8, gloss: 8 }),
    olive: thingMat('#4e5a3a', { pat: 23, p: [60, 0, 0, 0], spec: 0.3, gloss: 14 }), steel: thingMat('#6a6d70', { spec: 0.8, gloss: 10 })
  };
  // a prop lying three-quarters to the camera: the yaw that turns its +z face to the viewer
  const FACE_CAM = Math.PI / 4;
  const ic = (key, fn, m, model) => ({ mesh: getMesh('thing:' + key, fn), model: model || ID4, mat: m });

  itemType(MONEY, { name: 'Деньги', note: 'Рубли.', price: 1, money: true,
    icon: () => propIcon([ic('note', () => box(0.066, 0.003, 0.032), THING_M.note, M(ry(FACE_CAM + 0.5), tr(0, 0.003, 0))), ic('note', () => box(0.066, 0.003, 0.032), THING_M.note2, M(tr(0.004, 0.009, 0.004), ry(FACE_CAM - 0.1))),
      ic('note', () => box(0.066, 0.003, 0.032), THING_M.note, M(tr(-0.004, 0.015, -0.003), ry(FACE_CAM - 0.45)))], 2.5, [0, 0.01, 0]) });
  // what can be worn: the same pieces the hero's model is built from, alone
  const gearFigure = (eq, groups, yaw, zoom, at) => () => figureIcon(buildHero(eq), groups, yaw, zoom, at);
  itemType('jacket', { name: 'Кожаная куртка', note: 'Тёплая, броня +1.', price: 180, stack: false, gear: { slot: 'body' },
    icon: gearFigure({ body: 'jacket', head: null }, ['jacket'], Math.PI / 4, 0.346, (B) => xf(B.chest, [0, 0.04, 0])) });
  itemType('armor', { name: 'Силовая броня', note: 'Броня +8, скорость −15%.', price: 1200, stack: false, gear: { slot: 'body' },
    icon: gearFigure({ body: 'armor', head: null }, ['armorTop'], Math.PI / 4, 0.336, (B) => xf(B.chest, [0, 0.1, 0])) });
  itemType('helmet', { name: 'Шлем', note: 'Броня +3. В нём не покуришь.', price: 450, stack: false, gear: { slot: 'head' },
    icon: gearFigure({ body: 'jacket', head: 'helmet' }, ['helmet'], 0, 0.71, (B) => xf(B.head, [0, HC[1] - 0.01, 0])) });
  itemType('rifle', { name: 'Винтовка', note: 'Урон 12, очередь по три.', price: 900, stack: false, gear: { slot: 'hands' },
    icon: () => { const R = frameY([0, 1, 0], RV); return propIcon(RIFLE.map((r) => ({ mesh: r.mesh, model: mul(R, r.off), mat: r.mat })), 0.437, xf(R, [0, 0.05, 0.17])); } });
  // what gets used up
  itemType('cigs', { name: 'Сигареты', note: '«Альдебаран», без фильтра. Одна — на один перекур.', price: 6, unit: 'шт.',
    icon: () => propIcon([{ mesh: PROPS.pack.mesh, model: frameY([0, 1, 0], nrm([TOCAM[0], 0, TOCAM[2]])), mat: PROPS.pack.mat }], 3.46) });
  itemType('drink', { name: 'Энергетик «ATOM»', note: 'Бодрость +5. Банка — на один раз.', price: 60,
    icon: () => propIcon([{ mesh: PROPS.can.mesh, model: ry(0.3), mat: PROPS.can.mat }], 2.0, [0, 0.083, 0]) });
  itemType('grenade', { name: 'Учебная граната', note: 'Без заряда: пыль и грохот.', price: 40,
    icon: () => propIcon([ic('gren', () => ellipsoid(0.04, 0.055, 0.04, { seg: 10, rings: 6 }), THING_M.olive), ic('grenFuse', () => cyl(0.012, 0.012, 0.03, 8), THING_M.steel, tr(0, 0.05, 0)),
      ic('grenLever', () => box(0.007, 0.032, 0.005), THING_M.steel, M(tr(0.02, 0.05, 0.03), rz(-0.25))), ic('grenRing', () => torus(0.012, 0.0025, 12, 4), THING_M.steel, M(tr(-0.02, 0.085, 0), rz(1.2)))], 3.0, [0, 0.015, 0]) });
  // what a warrant officer has in his pack
  itemType('medkit', { name: 'Аптечка', note: 'Оранжевая коробка, бинт и шприц-тюбик.', price: 150,
    icon: () => propIcon([ic('kit', () => box(0.045, 0.052, 0.013), THING_M.orange, ry(FACE_CAM)), ic('kitX1', () => box(0.024, 0.007, 0.002), THING_M.white, M(ry(FACE_CAM), tr(0, 0, 0.014))),
      ic('kitX2', () => box(0.007, 0.024, 0.002), THING_M.white, M(ry(FACE_CAM), tr(0, 0, 0.014)))], 3.4) });
  itemType('stew', { name: 'Тушёнка', note: 'Армейская, говяжья.', price: 90,
    icon: () => propIcon([ic('tin', () => cyl(0.05, 0.05, 0.075, 16), THING_M.tin), ic('tinLid', () => cyl(0.051, 0.051, 0.006, 16), THING_M.lid, tr(0, 0.075, 0))], 2.6, [0, 0.04, 0]) });
  itemType('filter', { name: 'Фильтр к противогазу', note: 'Хватает на шесть часов.', price: 70,
    icon: () => propIcon([ic('filt', () => cyl(0.045, 0.045, 0.055, 16), THING_M.filter), ic('filtNeck', () => cyl(0.02, 0.02, 0.02, 10), THING_M.dark, tr(0, 0.055, 0))], 2.8, [0, 0.035, 0]) });
  itemType('battery', { name: 'Батарейки', note: 'Пара круглых, для фонаря и рации.', price: 25,
    icon: () => propIcon([ic('cell', () => cyl(0.014, 0.014, 0.06, 10), THING_M.cell, tr(-0.017, 0, 0)), ic('cell', () => cyl(0.014, 0.014, 0.06, 10), THING_M.cell, M(tr(0.017, 0, 0.004), ry(1)))], 3.6, [0, 0.03, 0]) });
  itemType('torch', { name: 'Фонарик', note: 'Армейский, с зелёным корпусом.', price: 120,
    icon: () => { const R = M(ry(FACE_CAM + 0.9), rz(-1.3)); return propIcon([ic('torchBody', () => cyl(0.016, 0.016, 0.1, 10), THING_M.torch, R), ic('torchHead', () => cyl(0.019, 0.025, 0.03, 12), THING_M.dark, M(R, tr(0, 0.1, 0))), ic('torchLens', () => cyl(0.021, 0.021, 0.004, 12), THING_M.lens, M(R, tr(0, 0.13, 0)))], 2.5, xf(R, [0, 0.065, 0])); } });
  // what turns up in the weeds
  itemType('casing', { name: 'Стреляная гильза', note: 'Позеленела. Кому-то нужна латунь.', price: 3,
    icon: () => propIcon([ic('case', () => cyl(0.0058, 0.0058, 0.039, 10), THING_M.brass, M(tr(-0.006, 0.006, -0.012), ry(FACE_CAM + 0.5), rx(Math.PI / 2))),
      ic('case', () => cyl(0.0058, 0.0058, 0.039, 10), THING_M.brassDark, M(tr(0.008, 0.006, -0.016), ry(FACE_CAM - 0.6), rx(Math.PI / 2)))], 6.5, [0.012, 0.006, -0.002]) });
  itemType('mag', { name: 'Пустой магазин', note: 'Пружина ещё живая.', price: 30,
    icon: () => propIcon([ic('mag', () => box(0.012, 0.062, 0.034), THING_M.dark, M(ry(FACE_CAM + Math.PI / 2), rx(0.25)))], 3.2, [0, 0, 0]) });
  itemType('button', { name: 'Пуговица со звездой', note: 'Латунная, с шинели.', price: 15,
    icon: () => propIcon([ic('btn', () => cyl(0.011, 0.011, 0.003, 14), THING_M.brass, rx(Math.PI / 2 - 0.5)), ic('btnStar', () => cyl(0.005, 0.005, 0.0015, 5), THING_M.brassDark, M(rx(Math.PI / 2 - 0.5), tr(0, 0.003, 0)))], 12, [0, 0, 0]) });
  itemType('scrap', { name: 'Обрывок мишени', note: 'С дыркой в «десятке».', price: 2,
    icon: () => propIcon([ic('scrap', () => box(0.2, 0.25, 0.002), decal('tgtRings'), M(ry(FACE_CAM), rz(0.15)))], 0.95, [0, -0.02, 0]) });

  // the hero starts with this; everything else he finds, buys or swaps
  INV.hero = [{ t: MONEY, n: 150 }, { t: 'jacket', n: 1 }, { t: 'armor', n: 1 }, { t: 'helmet', n: 1 }, { t: 'rifle', n: 1 }, { t: 'cigs', n: 12 }, { t: 'drink', n: 2 }, { t: 'grenade', n: 3 }];
  const hasThing = (t) => invCount(INV.hero, t) > 0;
  // a deal took away something he was wearing: off it comes
  function gearCheck() {
    let changed = false;
    for (const slot of ['body', 'head', 'hands']) if (equip[slot] && !hasThing(equip[slot])) { equip[slot] = null; changed = true; }
    if (!equip.hands) hero.shoot.on = false;
    if (changed) { rebuildHero(); redraw(); }
    return changed;
  }
