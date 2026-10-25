  // ================= what the hero does in the yards: the playground, the shed, the cars, the weeds =================
  // The engine has the hero himself (engine/src/hero/state.js): walking, orders, sitting, kneeling, looking, the overlays.
  // Here are the yards' own activities and what each kind of thing offers (USE).
  import { M, add, approach, clamp, lerp, lerpV, rng, rx, ry, smooth, tr } from '../../engine/src/core/math.js';
  import { TEXTS } from '../../engine/src/core/game.js';
  import { toast } from '../../engine/src/core/toast.js';
  import { MAP } from '../../engine/src/world/map.js';
  import { remember } from '../../engine/src/world/state.js';
  import { CATALOG, USE, byType, localPt } from '../../engine/src/world/instances.js';
  import { armored, equip } from '../../engine/src/hero/model.js';
  import { hangHandY } from '../../engine/src/hero/skeleton.js';
  import { ACT, hero, lerpM, standHips, yawTo } from '../../engine/src/hero/hero.js';
  import { beginDrink, beginSmoke, busyAct, goSit, goSpot, inMachine, noArmor, plan, spotOf, startShoot } from '../../engine/src/hero/state.js';
  import { SL, SW, TW } from './catalog.js';
  import { itemById, itemFound, itemsChanged } from './inventory.js';
  import { ballThrow, resetCans } from './dyn.js';
  import { PIGEONS } from './pigeons.js';
  TEXTS.nothingNear = 'Подойди к чему-нибудь или нажми на предмет во дворе. Нажатие на землю — просто идти.';
  const leaveBtn = (label) => (a) => a.stage === 'dismount' || a.stage === 'drop' || a.stage === 'down' ? null : label;

  // ---------- activities ----------
  const seatFrame = (inst) => M(inst.M0, tr(0, SW.BAR, 0), rx(inst.dyn.theta || 0), tr(0, -SW.CH, 0));
  Object.assign(ACT, {
    swing: {
      first: 'mount', leave: leaveBtn('Слезть'),
      update(a, dt) {
        const dy = a.inst.dyn; a.st += dt;
        if (a.stage === 'mount') { a.w = smooth(a.st / 0.6); if (a.st >= 0.6) { a.stage = 'swing'; a.st = 0; } }
        else if (a.stage === 'swing') { dy.amp = approach(dy.amp || 0, 0.6, dt * 0.13); if (a.leave) { a.stage = 'stop'; a.st = 0; } }
        else if (a.stage === 'stop') { dy.amp = approach(dy.amp, 0, dt * 0.34); if (dy.amp < 0.025) { a.stage = 'dismount'; a.st = 0; } }
        else if (a.stage === 'dismount') { a.w = 1 - smooth(a.st / 0.6); if (a.st >= 0.6) a.done = true; }
        dy.occupied = !a.done;
        hero.yaw = hero.tyaw = a.spot.wyaw;
      },
      ctx(a) { const dy = a.inst.dyn; const v = dy.amp > 0.01 ? -Math.cos(dy.ph || 0) : 0; return { kind: 'swing', w: a.w, u: v }; },
      base(a, D) {
        const sf = M(seatFrame(a.inst), tr(0, 0.165, -0.055));
        const st = M(tr(a.spot.w[0], standHips(D), a.spot.w[1]), ry(a.spot.wyaw));
        return lerpM(st, sf, smooth(a.w));
      },
      state: (a) => a.stage === 'mount' ? 'садится на качели' : a.stage === 'dismount' ? 'слезает' : 'качается'
    },
    hang: {
      first: 'jump', leave: leaveBtn('Спрыгнуть'),
      update(a, dt) {
        a.st += dt;
        if (a.stage === 'jump') { a.w = smooth(a.st / 0.45); if (a.st >= 0.45) { a.stage = 'reps'; a.st = 0; } }
        else if (a.stage === 'reps') {
          const T = armored() ? 1.05 : 1.3, u = a.st % T, n = Math.floor(a.st / T);
          a.pull = u < 0.5 * T / 1.3 ? smooth(u / (0.5 * T / 1.3)) : u < 0.7 * T / 1.3 ? 1 : 1 - smooth((u - 0.7 * T / 1.3) / (0.55 * T / 1.3));
          if (n > a.count) { a.count = n; }
          if ((a.leave && a.pull < 0.05) || n >= a.reps) { a.stage = 'drop'; a.st = 0; a.pull = 0; }
        } else if (a.stage === 'drop') { a.w = 1 - smooth(a.st / 0.4); if (a.st >= 0.4) a.done = true; }
      },
      ctx: (a) => ({ kind: 'hang', w: a.w, pull: a.pull || 0 }),
      base(a, D) {
        const hang = a.bar + 0.012 - (D.spineY + D.chestY + hangHandY(D, a.pull || 0));
        const hop = a.stage === 'jump' ? Math.sin(Math.PI * clamp(a.st / 0.45, 0, 1)) * 0.08 : 0;
        return M(tr(hero.x, lerp(standHips(D), hang, a.w) + hop, hero.z), ry(hero.yaw));
      },
      state: (a) => a.stage === 'reps' ? 'подтягивается · ' + Math.min(a.reps, a.count + (a.pull > 0.9 ? 1 : 0)) : 'на турнике'
    },
    slide: {
      first: 'climb',
      update(a, dt) {
        a.st += dt;
        const g = (p) => localPt(a.inst, p);
        if (a.stage === 'climb') {
          const u = smooth(clamp(a.st / 1.6, 0, 1));
          const p = g(lerpV([0, 0, SL.lad0 - 0.38], [0, SL.top, SL.lad1 + 0.14], u));
          hero.x = p[0]; hero.z = p[2]; hero.y = p[1];
          a.w = Math.min(smooth(a.st / 0.25), 1 - smooth((a.st - 1.35) / 0.25)); a.ph = a.st / 1.6 * 2.5;
          if (a.st >= 1.6) { a.stage = 'sit'; a.st = 0; a.w = 0; }
        } else if (a.stage === 'sit') {
          a.w = smooth(a.st / 0.5);
          const p = g(lerpV([0, SL.top, SL.lad1 + 0.14], [0, SL.top, SL.z0 - 0.1], smooth(a.st / 0.5)));
          hero.x = p[0]; hero.z = p[2];
          if (a.st >= 0.5) { a.stage = 'down'; a.st = 0; }
        } else if (a.stage === 'down') {
          const T = 0.9, s = clamp(a.st / T, 0, 1), u = s * s;
          const p = g([0, lerp(SL.top, SL.low, u), lerp(SL.z0 - 0.1, SL.z1 + 0.25, u)]);
          hero.x = p[0]; hero.z = p[2]; hero.y = p[1];
          if (a.st >= T) { a.stage = 'land'; a.st = 0; }
        } else if (a.stage === 'land') {
          const p = g([0, 0, lerp(SL.z1 + 0.25, SL.run + 0.55, smooth(a.st / 0.55))]);
          hero.x = p[0]; hero.z = p[2]; hero.y = 0;
          a.w = 1 - smooth(a.st / 0.55);
          if (a.st >= 0.55) a.done = true;
        }
      },
      ctx: (a) => a.stage === 'climb' ? { kind: 'climb', w: a.w, ph: a.ph } : { kind: 'slide', w: a.w },
      base(a, D) {
        const yaw = a.inst.yaw0, g = (p) => localPt(a.inst, p);
        if (a.stage === 'climb') return null;
        if (a.stage === 'sit') {
          const st = M(tr(...add(g([0, SL.top, SL.lad1 + 0.14]), [0, standHips(D), 0])), ry(yaw));
          const se = M(tr(...add(g([0, SL.top, SL.z0 - 0.1]), [0, 0.15, 0])), ry(yaw), rx(a.inst.built.ang * 0.4));
          return lerpM(st, se, smooth(a.w));
        }
        if (a.stage === 'down') { const s = clamp(a.st / 0.9, 0, 1); return M(tr(hero.x, hero.y + 0.15, hero.z), ry(yaw), rx(a.inst.built.ang * (s < 0.85 ? lerp(0.4, 1, s / 0.3 > 1 ? 1 : s / 0.3) : 1 - (s - 0.85) / 0.15))); }
        const st = M(tr(hero.x, standHips(D), hero.z), ry(yaw));
        const se = M(tr(...add(g([0, SL.low, SL.z1 + 0.25]), [0, 0.15, 0])), ry(yaw));
        return lerpM(st, se, smooth(a.w));
      },
      state: (a) => a.stage === 'climb' ? 'лезет на горку' : a.stage === 'down' ? 'катится' : 'на горке'
    },
    tower: {
      first: 'climb', leave: leaveBtn('Спуститься'),
      handsFree: (a) => a.stage === 'top',      // on top of the tower he may shoot and smoke
      update(a, dt) {
        a.st += dt;
        const B = TW.B, path = (u) => localPt(a.inst, [B.cx, B.deck * u, lerp(B.hs + 0.75, -0.02, smooth(u))]);
        if (a.stage === 'climb' || a.stage === 'down') {
          const T = 1.5, raw = clamp(a.st / T, 0, 1), u = a.stage === 'climb' ? raw : 1 - raw;
          const p = path(u); hero.x = p[0]; hero.z = p[2]; hero.y = p[1];
          a.w = Math.min(smooth(a.st / 0.25), 1 - smooth((a.st - (T - 0.25)) / 0.25)); a.ph = a.st / T * 2.2;
          hero.yaw = hero.tyaw = a.inst.yaw0 + Math.PI;
          if (a.st >= T) {
            if (a.stage === 'climb') { a.stage = 'top'; a.st = 0; a.w = 0; hero.tyaw = a.inst.yaw0; }
            else a.done = true;
          }
        } else if (a.stage === 'top') { a.w = 0; if (a.leave && !hero.shoot.on && hero.shoot.w <= 0) { a.stage = 'down'; a.st = 0; } }
      },
      ctx: (a) => a.stage === 'top' ? null : { kind: 'climb', w: a.w, ph: a.ph },
      base: () => null,
      state: (a) => a.stage === 'top' ? 'на башне' : a.stage === 'climb' ? 'лезет на башню' : 'спускается'
    }
  });
  export const onTower = () => hero.act && hero.act.kind === 'tower' && hero.act.stage === 'top';

  // ---------- what he may do with his hands: the game's rules over the engine's overlays ----------
  export function startSmoke() {
    const it = itemById('cigs');
    if (inMachine()) return false;
    if (equip.head === 'helmet') { toast('В шлеме не покуришь. Сними шлем в снаряжении.'); return false; }
    if (busyAct()) { toast(TEXTS.handsBusy); return false; }
    if (it.count <= 0) { toast('Сигареты кончились. Поищи в бурьяне.'); return false; }
    if (hero.smoke.on) return false;
    it.count--; itemsChanged();
    beginSmoke();
    return true;
  }
  export function startDrink() {
    const it = itemById('atom');
    if (inMachine()) return false;
    if (equip.head === 'helmet') { toast('Через шлем не попьёшь. Сними шлем в снаряжении.'); return false; }
    if (busyAct()) { toast(TEXTS.handsBusy); return false; }
    if (it.count <= 0) { toast('Энергетик кончился. Поищи в бурьяне.'); return false; }
    if (hero.drink.on) return false;
    it.count--; itemsChanged();
    beginDrink();
    return true;
  }

  // ---------- what the hero can do with each object ----------
  export function goSwing(inst) {
    if (noArmor('Детские качели силовую броню не выдержат.')) return;
    const sp = spotOf(inst, 'swing');
    plan(...goSpot(sp), { type: 'act', kind: 'swing', inst, opts: { spot: sp } });
  }
  export function goBar(inst) {
    const sp = spotOf(inst, 'bar');
    if (!inst.def.seat && inst.type === 'swing') toast('Сиденья давно нет. Зато можно подтянуться.');
    plan(...goSpot(sp), { type: 'act', kind: 'hang', inst, opts: { bar: inst.built.bar, reps: 5, count: 0, pull: 0, after: () => toast(armored() ? 'Пять раз в броне. Сервоприводы помогают.' : 'Пять раз. Неплохо для курильщика.') } });
  }
  export function goSlide(inst) {
    if (noArmor('Горка под силовой бронёй сложится.')) return;
    const sp = spotOf(inst, 'ladder');
    plan(...goSpot(sp), { type: 'act', kind: 'slide', inst });
  }
  export function goTower(inst) {
    if (noArmor('В силовой броне в детскую башню не пролезть.')) return;
    const sp = spotOf(inst, 'ladder');
    plan(...goSpot(sp), { type: 'act', kind: 'tower', inst });
  }
  export function goThrow(inst) {
    const sp = spotOf(inst, 'throw');
    const rim = localPt(inst, inst.built.rim);
    plan(...goSpot(sp), { type: 'call', fn: () => { hero.tyaw = yawTo(rim[0], rim[2]); } }, { type: 'turned' }, ballThrow(inst), { type: 'waitThrow' });
  }
  const FINDS = [
    { p: 0.3, item: 'cigs', n: 4, msg: 'Нашёл початую пачку «Альдебараана». Четыре штуки!' },
    { p: 0.22, item: 'atom', n: 1, msg: 'Нашёл банку «ATOM» — целая, даже не вскрытая.' },
    { p: 0.12, msg: 'Пробка от «Жигулёвского». Сувенир.' },
    { p: 0.1, msg: 'Кассета без коробки. «Кино», судя по надписи.' },
    { p: 0.1, msg: 'Ржавый ключ. От чего — непонятно.' },
    { p: 0.16, msg: 'Только репейник на штанах.' }
  ];
  let findRng = rng(2026);
  export function goSearch(inst) {
    if (inst.dyn.searched) { toast(TEXTS.searched); return; }
    // walk to the nearest edge of the patch
    const cx = inst.def.at[0], cz = inst.def.at[1], dx = hero.x - cx, dz = hero.z - cz, dl = Math.hypot(dx, dz) || 1;
    const ex = cx + dx / dl * (inst.def.rx * 0.85), ez = cz + dz / dl * (inst.def.rz * 0.85);
    plan({ type: 'path', to: [ex, ez] }, { type: 'call', fn: () => { hero.tyaw = yawTo(cx, cz); } }, { type: 'turned' },
      { type: 'act', kind: 'kneel', inst, opts: { cb: () => {
        remember(inst, { searched: true });
        let r = findRng(), f = FINDS[FINDS.length - 1];
        for (const x of FINDS) { if (r < x.p) { f = x; break; } r -= x.p; }
        if (f.item) { const it = itemById(f.item); it.count += f.n; itemsChanged(); itemFound(f.item); }
        toast(f.msg);
      } } });
  }
  const GRAFFITI = [
    '«Цой жив». Кто бы сомневался.',
    '«Здесь был Вася». Вася, судя по всему, был здесь часто.',
    '«В+К» в сердечке. Интересно, что с ними стало.'
  ];
  export function goGraffiti(inst) {
    const sp = spotOf(inst, 'front');
    plan(...goSpot(sp), { type: 'act', kind: 'look', inst, opts: { dur: 1.6, cb: () => { remember(inst, { gi: ((inst.dyn.gi ?? -1) + 1) % GRAFFITI.length }); toast(GRAFFITI[inst.dyn.gi]); } } });
  }
  export function goCans(inst) {
    const sp = spotOf(inst, 'front');
    if (inst.dyn.cans.every((c) => c.state === 'up')) { toast('Банки и так стоят. Можно стрелять.'); return; }
    plan(...goSpot(sp), { type: 'reach', to: [-0.08, 0.62, 0.42], cb: () => { resetCans(inst); toast('Банки снова на крыше.'); } }, { type: 'waitReach' });
  }
  export function goSubstation(inst) {
    const sp = spotOf(inst, 'door');
    plan(...goSpot(sp), { type: 'reach', to: [-0.12, 0.05, 0.5], cb: () => toast('Заперто. «Не влезай — убьёт». Логично.') }, { type: 'waitReach' });
  }
  export function goDoor(inst) {
    const sp = spotOf(inst, 'door');
    plan(...goSpot(sp), { type: 'reach', to: [-0.2, 0.1, 0.46], cb: () => toast(MAP.intercom || 'Домофон пищит, но никто не открывает.') }, { type: 'waitReach' });
  }
  const POSTERS = [
    '«Куплю гараж. Дорого. Звоните». Телефон оторвали.',
    '«Вскрытие замков, круглосуточно». Удобно повесить прямо на гараж.',
    'Под объявлениями старые, в три слоя. Самое нижнее — про видеокассеты.'
  ];
  function goPosters(inst) {
    const sp = spotOf(inst, 'side');
    plan(...goSpot(sp), { type: 'act', kind: 'look', inst, opts: { dur: 1.6, cb: () => { remember(inst, { pi: ((inst.dyn.pi ?? -1) + 1) % POSTERS.length }); toast(POSTERS[inst.dyn.pi]); } } });
  }
  function goLock(inst) {
    const sp = spotOf(inst, 'door');
    plan(...goSpot(sp), { type: 'reach', to: [-0.1, -0.05, 0.45], cb: () => toast('Замок висит намертво. Петли рыжие, но держат.') }, { type: 'waitReach' });
  }
  function goCarLook(inst) {
    const sp = spotOf(inst, 'side');
    plan(...goSpot(sp), { type: 'act', kind: 'look', inst, opts: { dur: 1.4, cb: () => toast(inst.def.look || 'Чья-то машина.') } });
  }
  export function carAlarm(inst, why) {
    if (inst.dyn.alarm > 0) return;
    inst.dyn.alarm = 9;
    for (const b of PIGEONS) b.scare = true;
    toast(why || 'Сработала сигнализация. Лучше отойти.');
  }
  function goCarKnock(inst) {
    const sp = spotOf(inst, 'wheel');
    plan(...goSpot(sp), { type: 'reach', to: [-0.16, -0.62, 0.42], cb: () => carAlarm(inst) }, { type: 'waitReach' });
  }
  function yardName(inst) {
    const t = inst.type;
    if (t === 'swing') return inst.def.seat ? 'Качели' : 'Качели без сиденья';
    if (t === 'entrance') return 'Подъезд ' + (inst.def.idx + 1);
    if (t === 'bench') return 'Лавочка у подъезда';
    if (t === 'garage') return 'Сарай с граффити';
    if (t === 'grass') return 'Бурьян';
    if (t === 'car') return { sedan: 'Седан', hatch: 'Хэтчбек', boxy: 'Внедорожник', suv: 'Кроссовер' }[inst.def.kind] || 'Машина';
    return CATALOG[t] ? CATALOG[t].name : t;
  }
  function yardActs(inst) {
    const t = inst.type;
    if (t === 'swing') return inst.def.seat ? [{ label: 'Покачаться', run: () => goSwing(inst) }] : [{ label: 'Подтянуться', run: () => goBar(inst) }];
    if (t === 'pullbar') return [{ label: 'Подтянуться', run: () => goBar(inst) }];
    if (t === 'slide') return [{ label: 'Скатиться', run: () => goSlide(inst) }];
    if (t === 'platform' || t === 'bench') return [{ label: 'Сесть', run: () => goSit(inst) }];
    if (t === 'hoop') return [{ label: 'Бросить мяч', run: () => goThrow(inst) }];
    if (t === 'towers') return [{ label: 'Залезть на башню', run: () => goTower(inst) }];
    if (t === 'garage') return [{ label: 'Читать граффити', run: () => goGraffiti(inst) }, { label: 'Расставить банки', run: () => goCans(inst) }];
    if (t === 'substation') return [{ label: 'Подёргать дверь', run: () => goSubstation(inst) }];
    if (t === 'grass') return [{ label: inst.dyn.searched ? 'Тут уже пусто' : 'Обыскать', run: () => goSearch(inst), off: !!inst.dyn.searched }];
    if (t === 'entrance') return [{ label: 'Позвонить в домофон', run: () => goDoor(inst) }];
    if (t === 'metalgarage') return [{ label: 'Читать объявления', run: () => goPosters(inst) }, { label: 'Подёргать замок', run: () => goLock(inst) }];
    if (t === 'car') return [{ label: 'Заглянуть в окно', run: () => goCarLook(inst) }, { label: 'Постучать по колесу', run: () => goCarKnock(inst) }];
    return [];
  }
  const NOTES = {
    swing: 'Цепи скрипят, но держат. Раскачивается сам, ногами.',
    swing0: 'Сиденье кто-то унёс, осталась перекладина.',
    pullbar: 'Перекладина на высоте двух с четвертью метров.',
    slide: 'Железный желоб, нагретый солнцем.',
    platform: 'Тут сидят по вечерам. Винтовку можно положить рядом.',
    bench: 'Лавочка у первого подъезда, урна рядом.',
    hoop: 'Кольцо на высоте 3,05 м. Мяч валяется у столба.',
    towers: 'Детская башня, взрослому там тесно, но влезть можно.',
    garage: 'На крыше стоят банки — по ним можно стрелять.',
    substation: 'Гудит. На двери предупреждение.',
    grass: 'В бурьяне иногда что-то валяется.',
    entrance: 'Железная дверь с домофоном.',
    metalgarage: 'Ржавый, с объявлениями. Двери на навесном замке.',
    car: 'Стоит носом к дому. От пинка заорёт.'
  };
  const yardNote = (inst) => inst.type === 'swing' && !inst.def.seat ? NOTES.swing0 : NOTES[inst.type] || '';
  // everything in the yards that answers a tap; the frame without a seat (plain) is only scenery
  for (const t of ['swing', 'pullbar', 'slide', 'platform', 'hoop', 'towers', 'garage', 'substation', 'grass', 'bench', 'entrance', 'metalgarage', 'car'])
    USE[t] = { name: yardName, note: yardNote, acts: yardActs };
  USE.swing.active = (def) => !def.plain;
  export function doShoot() {
    if (inMachine()) return;
    if (equip.hands !== 'rifle') { toast('Сначала возьми винтовку в снаряжении.'); return; }
    if (hero.shoot.on) return;
    const g = byType('garage')[0];
    if (!g || !g.dyn.cans) { toast('Стрелять здесь не по чему. Банки остались на сарае в первом дворе.'); return; }
    const up = g.dyn.cans.filter((c) => c.state === 'up');
    if (!up.length) { toast('Банок не осталось. Подойди к сараю и расставь их.'); hero.focus = g; return; }
    up.sort((a, b) => Math.hypot(a.pos[0] - hero.x, a.pos[2] - hero.z) - Math.hypot(b.pos[0] - hero.x, b.pos[2] - hero.z));
    hero.aimAt = up[0];
    if (onTower()) { startShoot(); return; }
    plan({ type: 'call', fn: () => { hero.tyaw = yawTo(up[0].pos[0], up[0].pos[2]); } }, { type: 'turned' }, { type: 'shoot' });
  }
