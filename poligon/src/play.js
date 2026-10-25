  // ================= what the hero does on the range: targets, the tower, a training grenade, gear, and what each thing offers =================
  import { M, add, clamp, lerpV, rx, scl, sub, tr, wpx, xf } from '../../engine/src/core/math.js';
  import { GAME, TEXTS, hook } from '../../engine/src/core/game.js';
  import { toast } from '../../engine/src/core/toast.js';
  import { mat } from '../../engine/src/render/materials.js';
  import { box, ellipsoid } from '../../engine/src/render/meshes.js';
  import { getMesh } from '../../engine/src/render/webgl.js';
  import { decal } from '../../engine/src/render/decals.js';
  import { LOC_HOOKS, MAP } from '../../engine/src/world/map.js';
  import { USE, byType, localPt } from '../../engine/src/world/instances.js';
  import { GH, GW } from '../../engine/src/world/ground.js';
  import { equip, rebuildHero } from '../../engine/src/hero/model.js';
  import { ACT, hero, yawTo } from '../../engine/src/hero/hero.js';
  import { beginDrink, beginSmoke, busyAct, goSit, goSpot, inMachine, plan, spotOf, walkTo } from '../../engine/src/hero/state.js';
  import { fx, puff, shake, sparkleAround } from '../../engine/src/fx/fx2d.js';
  import { redraw } from '../../engine/src/render/stage.js';
  import { INV, invAdd, invTake } from '../../engine/src/people/items.js';
  import { TGT } from './catalog.js';
  import { hasThing } from './things.js';
  TEXTS.nothingNear = 'Подойди к чему-нибудь или нажми на предмет. Нажатие на землю — просто идти.';

  // ---------- gear: what he has in his pack (things.js) he can put on; cigarettes, cans and grenades get used up ----------
  Object.assign(equip, { body: 'jacket', head: null, hands: 'rifle' });
  export const GEAR = [
    { id: 'jacket', slot: 'body', label: 'Куртка' }, { id: 'armor', slot: 'body', label: 'Броня' },
    { id: 'helmet', slot: 'head', label: 'Шлем' }, { id: 'rifle', slot: 'hands', label: 'Винтовка' }
  ];
  const OUT_OF = {
    cigs: 'Сигареты кончились. У прапорщика есть: в шлеме ему всё равно не покурить.',
    drink: 'Банок больше нет. Спроси у прапорщика Сомова.',
    grenade: 'Учебные гранаты кончились. Ещё есть у прапорщика Сомова.'
  };
  const useUp = (t) => { if (invTake(INV.hero, t, 1)) return true; toast(OUT_OF[t]); return false; };
  export function toggleGear(g) {
    if (!hasThing(g.id)) { toast('Этого у тебя нет — продал или обменял.'); return; }
    if (hero.inside || (hero.act && ACT[hero.act.kind].vehicle)) { toast('В костюме не переоденешься — места нет.'); return; }
    if (g.id === 'armor' && equip.body !== 'armor' && busyAct()) { toast('Броня сюда не влезет. Сначала слезь.'); return; }
    equip[g.slot] = equip[g.slot] === g.id ? null : g.id;
    if (g.slot === 'hands' && !equip.hands) hero.shoot.on = false;
    if (equip.head === 'helmet' && (hero.smoke.on || hero.drink.on)) { hero.smoke.on = false; hero.drink.on = false; toast('Шлем надет, сигарета и вода убраны.'); }
    rebuildHero(); redraw();
    sparkleAround();
  }
  export function startSmoke() {
    if (inMachine()) return;
    if (equip.head === 'helmet') { toast('В шлеме не покуришь. Сними шлем.'); return; }
    if (busyAct()) { toast(TEXTS.handsBusy); return; }
    if (!hero.smoke.on && useUp('cigs')) beginSmoke();
  }
  export function startDrink() {
    if (inMachine()) return;
    if (equip.head === 'helmet') { toast('Через шлем не попьёшь. Сними шлем.'); return; }
    if (busyAct()) { toast(TEXTS.handsBusy); return; }
    if (!hero.drink.on && useUp('drink')) beginDrink();
  }

  // ---------- targets: each plate falls back when hit and is raised again by hand ----------
  // inst.dyn: k — 0 standing … 1 lying back, v — how fast it falls; dyn.target is what the rifle aims at (see fireShot in the engine)
  const TGT_WOOD = mat('#b48e5c', { pat: 37, b: '#9a7648', p: [0.08, 1, 0, 0], noise: 0.08, grain: 50 });
  function initTargets() {
    for (const t of byType('target')) {
      const d = t.dyn; d.k = 0; d.v = 0;
      d.target = { pos: localPt(t, [0, TGT.hinge + TGT.h, 0.02]), state: 'up', onHit: (away, hx, hy) => hitTarget(t, hx, hy) };
    }
  }
  LOC_HOOKS.build.push(initTargets);
  const standingTargets = () => byType('target').filter((t) => t.dyn.target.state === 'up');
  const nearestTarget = (list) => list.slice().sort((a, b) => Math.hypot(a.dyn.target.pos[0] - hero.x, a.dyn.target.pos[2] - hero.z) - Math.hypot(b.dyn.target.pos[0] - hero.x, b.dyn.target.pos[2] - hero.z))[0];
  function hitTarget(t, hx, hy) {
    const d = t.dyn; d.target.state = 'down'; d.v = 4.5;
    fx.push({ k: 'clank', x: hx, y: hy, life: 0.12 });
    for (let i = 0; i < 6; i++) fx.push({ k: 'bit', x: hx, y: hy, vx: (Math.random() - 0.5) * 50, vy: -18 - Math.random() * 30, g: 140, life: 0.45, col: i & 1 ? '#d9c08a' : '#8a6a46' });
    const next = nearestTarget(standingTargets());
    if (next) hero.aimAt = next.dyn.target;
    else { hero.aimAt = null; setTimeout(() => toast('Все мишени лежат! Подойди к любой, чтобы поднять.'), 500); }
  }
  export function raiseTargets() {
    for (const t of byType('target')) { t.dyn.target.state = 'up'; t.dyn.v = -2.5; }
    toast('Мишени подняты. Огневой рубеж — бетонная полоса.');
  }
  function goRaise(inst) {
    const sp = spotOf(inst, 'front');
    if (standingTargets().length === byType('target').length) { toast('Мишени и так стоят. Можно стрелять.'); return; }
    plan(...goSpot(sp), { type: 'reach', to: [-0.06, 0.1, 0.5], cb: raiseTargets }, { type: 'waitReach' });
  }
  export function doShoot() {
    if (inMachine()) return;
    if (equip.hands !== 'rifle') { toast('Сначала возьми винтовку в снаряжении.'); return; }
    if (hero.shoot.on) return;
    if (!byType('target').length) { toast('Стрелять здесь не по чему. Мишени остались на полигоне.'); return; }
    const t = nearestTarget(standingTargets());
    if (!t) { toast('Мишени лежат. Подойди к любой и подними.'); return; }
    hero.aimAt = t.dyn.target;
    const p = t.dyn.target.pos;
    plan({ type: 'call', fn: () => { hero.tyaw = yawTo(p[0], p[2]); } }, { type: 'turned' }, { type: 'shoot' });
  }

  // ---------- a training grenade: the engine's throw with a prop of our own; it flies, lands, puffs dust ----------
  const GRENADE = { mesh: () => getMesh('grenade', () => ellipsoid(0.04, 0.055, 0.04, { seg: 10, rings: 6 })), mat: mat('#4e5a3a', { pat: 23, p: [60, 0, 0, 0], noise: 0.05, spec: 0.3, gloss: 14 }) };
  let grenade = null;        // { pos, v, state: 'fly' | 'rest', t }
  export function doThrow() {
    if (inMachine()) return;
    if (busyAct() || hero.sit > 0 || hero.sitTarget) { toast(TEXTS.handsBusy); return; }
    if (hero.thr.on || !useUp('grenade')) return;
    // at the nearest standing target if there is one in front, otherwise eight metres ahead
    const t = nearestTarget(standingTargets());
    const aim = t && Math.hypot(t.dyn.target.pos[0] - hero.x, t.dyn.target.pos[2] - hero.z) < 16 ? [t.dyn.target.pos[0], t.dyn.target.pos[2] + 1.2] : [hero.x + Math.sin(hero.yaw) * 8, hero.z + Math.cos(hero.yaw) * 8];
    plan({ type: 'call', fn: () => { hero.tyaw = yawTo(aim[0], aim[1]); } }, { type: 'turned' }, {
      type: 'throw', inst: null, prop: GRENADE,
      release: (rig) => {
        const P0 = xf(rig.B.chest, rig.pose.st.thr ? rig.pose.st.thr.ball : [0, 0.6, 0.3]), T = 1.1;
        const tgt = [clamp(aim[0], 0.5, GW - 0.5), 0.05, clamp(aim[1], 0.5, GH - 0.5)];
        grenade = { pos: P0, v: add(scl(sub(tgt, P0), 1 / T), [0, 4.9 * T, 0]), state: 'fly', t: 0 };
      },
      drop: () => { grenade = { pos: [hero.x + Math.sin(hero.yaw) * 0.3, 0.05, hero.z + Math.cos(hero.yaw) * 0.3], v: [0, 0, 0], state: 'rest', t: 0 }; }
    }, { type: 'waitThrow' });
  }
  LOC_HOOKS.leave.push(() => { grenade = null; });     // a grenade in the air does not follow the hero to another location
  function updateGrenade(dt) {
    const g = grenade; if (!g) return;
    g.t += dt;
    if (g.state === 'fly') {
      g.v[1] -= 9.8 * dt; g.pos = add(g.pos, scl(g.v, dt));
      if (g.pos[1] <= 0.05) {
        g.pos[1] = 0.05; g.state = 'rest'; g.t = 0;
        const s = wpx(g.pos);
        shake(1.2, 0.12);
        for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2; puff({ x: s[0] + Math.cos(a) * 4, y: s[1] + Math.sin(a) * 2, vx: Math.cos(a) * (12 + Math.random() * 14), vy: Math.sin(a) * 5 - 6, life: 0.9 + Math.random() * 0.6, r0: 1, r1: 3.5 + Math.random() * 2, a: 0.8, drag: 0.25, rise: -3, tone: 'dust' }); }
        for (let i = 0; i < 8; i++) fx.push({ k: 'bit', x: s[0], y: s[1], vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, g: 160, life: 0.5, col: '#7a6448' });
        // a target close to where it landed is knocked down too
        for (const t of standingTargets()) if (Math.hypot(t.dyn.target.pos[0] - g.pos[0], t.dyn.target.pos[2] - g.pos[2]) < 1.6) hitTarget(t, wpx(t.dyn.target.pos)[0], wpx(t.dyn.target.pos)[1]);
      }
    } else if (g.t > 1.6) grenade = null;
  }

  // ---------- the range's moving parts in the engine's hooks ----------
  hook(GAME.update, (dt) => {
    for (const t of byType('target')) { const d = t.dyn; if (d.v) { d.k = clamp(d.k + d.v * dt, 0, 1); if (d.k <= 0 || d.k >= 1) d.v = 0; } }
    updateGrenade(dt);
  }, 20);
  hook(GAME.items, (out) => {
    for (const t of byType('target')) {
      const F = M(t.M0, tr(0, TGT.hinge, 0), rx(-t.dyn.k * Math.PI * 0.47), tr(0, TGT.h, 0));
      out.push({ mesh: getMesh('tgtPlate', () => box(TGT.w, TGT.h, 0.012)), model: F, mat: TGT_WOOD, id: t.id, flags: 2, shadow: true });
      out.push({ mesh: getMesh('tgtFace', () => box(0.25, 0.31, 0.003)), model: M(F, tr(0, 0.02, 0.014)), mat: decal(t.def.face || 'tgtRings'), id: t.id, flags: 2, shadow: false });
    }
    if (grenade) out.push({ mesh: GRENADE.mesh(), model: M(tr(...grenade.pos), rx(grenade.t * 9)), mat: GRENADE.mat, id: 0, flags: 1, shadow: true });
  });
  hook(GAME.key, () => byType('target').map((t) => t.dyn.k.toFixed(2)).join(',') + (grenade ? '|g' + grenade.pos.map((x) => x.toFixed(2)).join(',') : ''));
  hook(GAME.focus, (hs) => grenade && grenade.state === 'fly' ? lerpV([...hs, 0], [...wpx(grenade.pos), 0], 0.4) : null, 10);

  // ---------- what each thing offers ----------
  const say = (sp, text, dur = 1.5) => [...goSpot(sp), { type: 'act', kind: 'look', inst: null, opts: { dur, cb: () => toast(typeof text === 'function' ? text() : text) } }];
  const knock = (sp, to, text) => [...goSpot(sp), { type: 'reach', to, cb: () => toast(typeof text === 'function' ? text() : text) }, { type: 'waitReach' }];
  const GUARD = ['Из окна: «Пропуск покажи… А, это ты. Проходи».', 'Охранник не отрывается от кроссворда: «Слово из пяти букв — броня?»', 'В будке гудит чайник. Охранник кивает на костюмы: «Только не урони».'];
  let guardI = -1;
  // what turns up in the weeds goes into the pack (things.js); the warrant officer buys some of it
  const FINDS_R = [['casing', 'Стреляная гильза, позеленевшая.'], ['mag', 'Пустой магазин. Пружина ещё живая.'], ['button', 'Пуговица со звездой.'], [null, 'Только репейник и сухая полынь.'], ['scrap', 'Обрывок мишени с дыркой в «десятке».']];
  let findI = 0;
  function goSearchR(inst) {
    if (inst.dyn.searched) { toast(TEXTS.searched); return; }
    const cx = inst.def.at[0], cz = inst.def.at[1], dx = hero.x - cx, dz = hero.z - cz, dl = Math.hypot(dx, dz) || 1;
    plan({ type: 'path', to: [cx + dx / dl * inst.def.rx * 0.85, cz + dz / dl * inst.def.rz * 0.85] }, { type: 'call', fn: () => { hero.tyaw = yawTo(cx, cz); } }, { type: 'turned' },
      { type: 'act', kind: 'kneel', inst, opts: { cb: () => {
        inst.dyn.searched = true;
        const [t, text] = FINDS_R[findI++ % FINDS_R.length];
        if (t) invAdd(INV.hero, t, 1);
        toast(t ? text + ' В рюкзак.' : text);
      } } });
  }
  const onTowerDeck = (t) => Math.abs(hero.y - t.built.top[1]) < 0.2 && Math.hypot(hero.x - xf(t.M0, t.built.top)[0], hero.z - xf(t.M0, t.built.top)[2]) < 1.6;
  Object.assign(USE, {
    target: {
      note: (i) => i.dyn.target && i.dyn.target.state === 'up' ? 'Стоит. Встань на бетонную полосу и стреляй.' : 'Лежит — её сбили.',
      acts: (i) => [{ label: 'Поднять мишени', run: () => goRaise(i) }, { label: 'Стрелять', run: doShoot, off: equip.hands !== 'rifle' }]
    },
    watchtower: {
      note: 'Помост на полутора метрах. С него виден весь полигон, стрелять можно и сверху.',
      acts: (i) => onTowerDeck(i)
        ? [{ label: 'Спуститься', run: () => { const sp = spotOf(i, 'stairs'); walkTo(sp.w[0], sp.w[1]); } }, { label: 'Стрелять', run: doShoot, off: equip.hands !== 'rifle' }]
        : [{ label: 'Подняться на вышку', run: () => { const p = xf(i.M0, i.built.top); walkTo(p[0], p[2]); } }]
    },
    container: { note: 'Двадцатифутовый, синий и рыжий. Внутри запчасти к костюмам.', acts: (i) => [{ label: 'Подёргать двери', run: () => plan(...knock(spotOf(i, 'door'), [-0.1, 0.05, 0.5], 'Заперто на оба запора, пломба цела.')) }] },
    booth: { name: 'Будка КПП', note: 'Охранник на месте. Ночью над дверью горит лампа.', acts: (i) => [{ label: 'Постучать в окно', run: () => plan(...knock(spotOf(i, 'window'), [-0.1, 0.25, 0.5], () => GUARD[guardI = (guardI + 1) % GUARD.length])) }] },
    sign: { name: 'Щит у ворот', note: 'Испытательный полигон № 7.', acts: (i) => [{ label: 'Прочитать', run: () => plan(...say(spotOf(i, 'front'), '«Испытательный полигон № 7. Проход по пропускам». Пропуск у тебя на шее.')) }] },
    barrels: { note: 'Ржавые бочки из-под масла.', acts: (i) => [{ label: 'Постучать', run: () => plan({ type: 'path', to: [i.def.at[0] + 0.9, i.def.at[1] + 0.9] }, { type: 'call', fn: () => { hero.tyaw = yawTo(i.def.at[0], i.def.at[1]); } }, { type: 'turned' }, { type: 'reach', to: [-0.1, -0.2, 0.5], cb: () => { toast('Пустые. Гудят, как колокол.'); const s = wpx([i.def.at[0], 0.6, i.def.at[1]]); fx.push({ k: 'clank', x: s[0], y: s[1], life: 0.14 }); } }, { type: 'waitReach' }) }] },
    bench: { name: 'Лавочка', note: 'Курилка испытателей.', acts: (i) => [{ label: 'Сесть', run: () => goSit(i) }] },
    car: {
      name: (i) => ({ sedan: 'Седан', hatch: 'Хэтчбек', boxy: 'Внедорожник', suv: 'Кроссовер' })[i.def.kind] || 'Машина', note: 'Стоит, не заперта только на вид.',
      acts: (i) => [{ label: 'Заглянуть в окно', run: () => plan(...say(spotOf(i, 'side'), i.def.look || 'Чья-то машина.', 1.4)) }]
    },
    metalgarage: { name: 'Гараж', note: 'Железный, на навесном замке.', acts: (i) => [{ label: 'Подёргать замок', run: () => plan(...knock(spotOf(i, 'door'), [-0.1, -0.05, 0.45], 'Замок висит намертво.')) }] },
    substation: { note: 'Гудит. Отсюда идут провода к фонарю.', acts: (i) => [{ label: 'Подёргать дверь', run: () => plan(...knock(spotOf(i, 'door'), [-0.12, 0.05, 0.5], 'Заперто. «Не влезай — убьёт».')) }] },
    entrance: { name: (i) => 'Подъезд ' + (i.def.idx + 1), note: 'Общежитие испытателей.', acts: (i) => [{ label: 'Позвонить в домофон', run: () => plan(...knock(spotOf(i, 'door'), [-0.2, 0.1, 0.46], () => MAP.intercom || 'Никто не открывает.')) }] },
    grass: { name: 'Бурьян', note: 'Тут иногда находят гильзы.', acts: (i) => [{ label: i.dyn.searched ? 'Тут уже пусто' : 'Обыскать', run: () => goSearchR(i), off: !!i.dyn.searched }] }
  });
