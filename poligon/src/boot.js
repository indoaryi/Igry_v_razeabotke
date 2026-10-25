  // ================= the range's page: quick actions, gear, the checklist of engine features, boot =================
  import { $ } from '../../engine/src/core/prelude.js';
  import { clamp, xf } from '../../engine/src/core/math.js';
  import { GAME, hook } from '../../engine/src/core/game.js';
  import { toast } from '../../engine/src/core/toast.js';
  import { buildDecals } from '../../engine/src/render/decals.js';
  import { LOCATIONS, MAP } from '../../engine/src/world/map.js';
  import { loadSaved, startSaving, whenReady } from '../../engine/src/world/state.js';
  import { INST, byType } from '../../engine/src/world/instances.js';
  import { GH, GW } from '../../engine/src/world/ground.js';
  import { enterLocation } from '../../engine/src/world/locations.js';
  import { DAY, dayGoto, daySet } from '../../engine/src/world/daytime.js';
  import { buildHero, equip, setHero } from '../../engine/src/hero/wardrobe.js';
  import { hero, yawTo } from '../../engine/src/hero/hero.js';
  import { doDefault, doPunch, goSit, plan, walkTo } from '../../engine/src/hero/state.js';
  import { goToLocation } from '../../engine/src/hero/travel.js';
  import { redraw, setRaw } from '../../engine/src/render/stage.js';
  import { setView } from '../../engine/src/ui/hud.js';
  import { GAME_API, prepareStage, runFrames } from '../../engine/src/core/run.js';
  import { INV, ITEM_TYPES, MONEY, fmtMoney, invAdd, invCount, invGrid, invTake, invVer } from '../../engine/src/people/items.js';
  import { PEOPLE, PEOPLE_HOOKS, heroAsPerson, personById, personFollow, personWear, takeControl } from '../../engine/src/people/people.js';
  import { TALK, talkTo } from '../../engine/src/people/talk.js';
  import { goTrade, openTrade } from '../../engine/src/people/trade.js';
  import { hasThing } from './things.js';
  import { GEAR, doShoot, doThrow, raiseTargets, startDrink, startSmoke, toggleGear } from './play.js';
  import { SOMOV } from './somov.js';
  const aShoot = $('aShoot'), aSmoke = $('aSmoke'), aDrink = $('aDrink'), aPunch = $('aPunch'), aThrow = $('aThrow');
  aShoot.addEventListener('click', doShoot);
  aSmoke.addEventListener('click', () => { if (hero.smoke.on) hero.smoke.on = false; else startSmoke(); });
  aDrink.addEventListener('click', () => { if (hero.drink.on) hero.drink.on = false; else startDrink(); });
  aPunch.addEventListener('click', doPunch);
  aThrow.addEventListener('click', doThrow);
  // ---------- the hero's things: a tap puts on or takes off, lights a cigarette, opens a can, throws a grenade ----------
  const worn = (t) => equip.body === t || equip.head === t || equip.hands === t;
  const invEl = $('inv'), cashEl = $('cash');
  const invPanel = invGrid(invEl, {
    inv: () => INV.hero,
    hide: (t) => t === MONEY,
    state: (t, n) => {
      const T = ITEM_TYPES[t];
      if (T.gear) return worn(t) ? (t === 'rifle' ? 'в руках' : 'надето') : 'в рюкзаке';
      if (t === 'cigs') return hero.smoke.on ? 'куришь · ' + n + ' шт.' : n + ' шт.';
      if (t === 'drink') return hero.drink.on ? 'пьёшь · ×' + n : '×' + n;
      return (n > 1 ? '×' + n + ' · ' : '') + fmtMoney(T.price);
    },
    pressed: (t) => worn(t) || (t === 'cigs' && hero.smoke.on) || (t === 'drink' && hero.drink.on),
    tap: (t) => {
      const g = GEAR.find((x) => x.id === t);
      if (g) toggleGear(g);
      else if (t === 'cigs') { if (hero.smoke.on) hero.smoke.on = false; else startSmoke(); }
      else if (t === 'drink') { if (hero.drink.on) hero.drink.on = false; else startDrink(); }
      else if (t === 'grenade') doThrow();
      else toast(ITEM_TYPES[t].name + '. ' + ITEM_TYPES[t].note);
    }
  });
  let pageKey = '';
  hook(GAME.frame, () => {
    const key = '' + hero.smoke.on + hero.drink.on + equip.body + equip.head + equip.hands + '|' + invVer;
    if (key === pageKey) return;
    pageKey = key;
    aSmoke.textContent = hero.smoke.on ? 'Потушить' : 'Закурить'; aSmoke.setAttribute('aria-pressed', String(hero.smoke.on));
    aDrink.textContent = hero.drink.on ? 'Убрать банку' : 'Попить'; aDrink.setAttribute('aria-pressed', String(hero.drink.on));
    aShoot.disabled = equip.hands !== 'rifle';
    aThrow.textContent = 'Граната · ' + invCount(INV.hero, 'grenade');
    if (cashEl) cashEl.textContent = fmtMoney(invCount(INV.hero, MONEY));
    invPanel.refresh(true);
  });

  // ---------- the checklist: every feature of the engine and a button that shows it ----------
  // the hero is taken there (or the clock is moved) the way a player would do it
  function inRange(f) { return () => { if (MAP.id !== 'range') { toast('Это на полигоне — вернись через ворота.'); goToLocation('range'); return; } f(); }; }
  function inEdge(f) { return () => { if (MAP.id !== 'edge') { goToLocation('edge'); toast('Иду на опушку — это за воротами.'); return; } f(); }; }
  const firstOf = (t) => byType(t)[0];
  // the warrant officer may be in the other location: then the hero goes there first
  function somovGo(f) {
    if (hero === SOMOV) { toast('Сейчас ты сам — прапорщик Сомов. «Управлять другим» вернёт тебя в героя.'); return; }
    if (SOMOV.loc !== MAP.id) { toast('Прапорщик Сомов сейчас не здесь — иду к нему.'); goToLocation(SOMOV.loc); return; }
    f();
  }
  // up close to the warrant officer, facing him
  const nearSomov = () => { setView('near'); plan({ type: 'path', to: [clamp(SOMOV.x + 0.5, 1, GW - 1), clamp(SOMOV.z + 1.9, 1, GH - 1)] }, { type: 'call', fn: () => { hero.tyaw = yawTo(SOMOV.x, SOMOV.z); } }); };
  // control passes to a person and back; the hero, while somebody else is steered, waits as a person
  heroAsPerson({ note: 'Это ты. Пока управляешь другим, он ждёт здесь.', barks: { follow: ['Иду.', 'За тобой.'], wait: ['Жду.'], home: ['Вернусь, где стоял.'] } });
  function steerTo(p) { if (!takeControl(p)) toast('Сейчас не выйдет: сначала закончи, что начал, и подойди ближе.'); }
  // the hero's helmet goes to the warrant officer — off the hero's head, out of his things into Somov's — and back again
  function lendHelmet() {
    const p = SOMOV, helmet = GEAR.find((g) => g.id === 'helmet');
    if (hero === p) { toggleGear(helmet); return; }
    if (p.gear.head === 'helmet') { personWear(p, 'head', null); invTake(p.inv, 'helmet'); invAdd(INV.hero, 'helmet'); toast('Прапорщик вернул шлем.'); return; }
    if (!hasThing('helmet')) { toast('Шлема у тебя нет — продал или обменял.'); return; }
    if (equip.head === 'helmet') { toggleGear(helmet); if (equip.head === 'helmet') return; }      // could not take it off just now
    invTake(INV.hero, 'helmet'); invAdd(p.inv, 'helmet'); personWear(p, 'head', 'helmet');
    toast('Шлем героя — на прапорщике. Его собственный шлем спрятан: вещь закрывает голову.');
  }
  PEOPLE_HOOKS.acts.push((p, out) => out.push({ label: 'Управлять им', run: () => steerTo(p), order: 60 }));
  const machineOf = (kind) => INST.find((i) => i.machine && i.machine.kind === kind);
  const FEATURES = [
    { t: 'Свет и тени', d: 'Солнце рисует настоящие тени на земле, стенах и герое; листва пропускает свет пятнами.', go: () => { dayGoto(14); setView('far'); } },
    { t: 'Утро с туманом', d: 'Низкое солнце, туман лежит в низинах и тянется по ветру, изо рта идёт пар.', go: () => { dayGoto(8); setView('far'); } },
    { t: 'Золотой вечер', d: 'Длинные тени, тёплый свет; над кустами вьётся мошкара.', go: () => { dayGoto(17.75); setView('far'); } },
    { t: 'Ночь: фонари и окна', d: 'Фонарь у подстанции, лампа на вышке и над будкой, окна общежития с телевизорами, звёзды, летучие мыши.', go: inRange(() => { dayGoto(23.5); walkTo(15.6, 11.6); }) },
    { t: 'Шагающий костюм ИБК-3', d: 'Посадка через люк сзади, пробуждение, тяжёлый шаг с тряской, следы на земле, фары ночью.', go: inRange(() => { const m = machineOf('ibk3'); if (m) doDefault(m); }) },
    { t: 'Костюм «32»', d: 'Передняя створка откидывается вверх, пилот поджимает ноги в капсулу.', go: inRange(() => { const m = machineOf('b32'); if (m) doDefault(m); }) },
    { t: 'Стрельба по мишеням', d: 'Вспышка, трассер, гильзы, искры; мишень падает назад от попадания.', go: inRange(() => { setView('far'); walkTo(26.2, 15.3); hero.queue.push({ type: 'call', fn: doShoot }); }) },
    { t: 'Вышка: высота', d: 'Помост на полутора метрах: герой поднимается по ступеням, тень падает на помост.', go: inRange(() => { const t = firstOf('watchtower'); if (t) { const p = xf(t.M0, t.built.top); walkTo(p[0], p[2]); } }) },
    { t: 'Граната', d: 'Бросок: предмет в руке, полёт по дуге, пыль и комья земли при падении.', go: inRange(() => { walkTo(27.0, 15.2); hero.queue.push({ type: 'call', fn: doThrow }); }) },
    { t: 'Курилка', d: 'Сесть на лавочку и закурить: дымок от сигареты, огонёк, выдох.', go: inRange(() => { const b = firstOf('bench'); if (b) { goSit(b); hero.queue.push({ type: 'call', fn: startSmoke }); } }) },
    { t: 'Обыскать бурьян', d: 'Герой опускается на колено и шарит в траве.', go: () => { const g = byType('grass').find((i) => !i.dyn.searched); if (g) doDefault(g); else toast('Бурьян здесь уже обыскан.'); } },
    { t: 'Ветер, листва, трава', d: 'Кроны качаются волной, травинки гнутся, жёлтые листья падают и ложатся на землю.', go: inEdge(() => { setView('near'); walkTo(4.6, 10.2); }) },
    { t: 'Переход между локациями', d: 'Дорога за ворота ведёт на опушку и обратно; каждая локация помнит, что в ней оставили.', go: () => goToLocation(MAP.id === 'range' ? 'edge' : 'range') },
    { t: 'Второй человек', d: 'Прапорщик Сомов в защитном комплекте по эскизу игрока: замечает героя, поворачивает к нему голову, здоровается, оглядывается.', go: () => somovGo(nearSomov) },
    { t: 'Распорядок дня', d: 'У прапорщика свой день: утром у костюмов, в полдень обед на лавочке, потом обход КПП, к вечеру — в общежитие. Часы ставятся на без пяти двенадцать: смотри, как он идёт обедать.', go: () => { if (hero === SOMOV) { toast('Сейчас ты — прапорщик, день идёт по твоим приказам. «Управлять другим» вернёт его к своим делам.'); return; } daySet(11.93); DAY.run = true; setView('far'); walkTo(11.6, 20.4); } },
    { t: 'Слышит выстрелы и шаги', d: 'На выстрел он оборачивается и ворчит; на шаги костюма — провожает его взглядом. Что делать дальше, решает игра: стреляешь рядом — он отходит.', go: inRange(() => { if (hero === SOMOV) { toast('Прапорщик сейчас под твоим управлением — некому слушать.'); return; } if (SOMOV.away || SOMOV.loc !== MAP.id) { toast('Прапорщика нет на месте — поставь часы на день.'); return; } setView('near'); if (!equip.hands) toggleGear(GEAR[3]); plan({ type: 'path', to: [clamp(SOMOV.x + 1.2, 1, GW - 1), clamp(SOMOV.z + 1.6, 1, GH - 1)] }, { type: 'call', fn: doShoot }); }) },
    { t: 'Разговор', d: 'Герой подходит, оба встают лицом друг к другу; в панели — его реплики и твои ответы. Пока говорит, кивает и жестикулирует.', go: () => somovGo(() => talkTo(SOMOV)) },
    { t: 'Спутник', d: '«Идём со мной»: держится в паре шагов, отстав, догоняет бегом, садится рядом на лавочку, переходит с героем на опушку и обратно.', go: () => somovGo(() => { personFollow(SOMOV); const b = MAP.id === 'range' ? firstOf('bench') : null; if (b) goSit(b); }) },
    { t: 'Обмен и торговля', d: 'Свои вещи на его, разница — рублями. Сигареты, банки и гранаты тратятся, находки из бурьяна можно продать.', go: () => somovGo(() => goTrade(SOMOV)) },
    { t: 'Снаряжение', d: 'Куртка, броня, шлем, винтовка — модель героя собирается заново. В броне медленнее. Проданное снимается.', go: () => toggleGear(GEAR[1]) },
    { t: 'Вещи на любом', d: 'Герой отдаёт прапорщику свой шлем: вещь собрана из тех же деталей, что и люди, садится на любого и прячет то, что закрывает (его шлем). Ещё раз — шлем возвращается.', go: () => { if (hero === SOMOV) lendHelmet(); else somovGo(() => { lendHelmet(); nearSomov(); }); } },
    { t: 'Управлять другим', d: 'Управление переходит к прапорщику: он идёт, куда скажешь, при нём его вещи, а герой ждёт, где стоял. Ещё раз — обратно в героя. То же — «Управлять им» в панели человека.', go: () => { if (hero === SOMOV) { const h = personById('hero'); if (!h || h.loc !== MAP.id) toast('Герой остался в другом месте — дойди до него.'); else steerTo(h); return; } somovGo(() => steerTo(SOMOV)); } },
    { t: 'Вся локация сверху', d: 'Обзор целиком: видно, как собраны земля, дома и деревья.', go: () => setView('all') },
    { t: '3D без пикселей', d: 'Та же сцена до перевода в пиксель-арт: плавный свет и настоящая геометрия.', go: () => { const c = $('rawChk'); c.checked = !c.checked; setRaw(c.checked); redraw(); } }
  ];
  const featEl = $('features');
  for (const f of FEATURES) {
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = 'Показать';
    b.addEventListener('click', () => { f.go(); $('stageBox').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const tx = document.createElement('div'); tx.className = 'ft';
    const h = document.createElement('b'); h.textContent = f.t;
    const p = document.createElement('span'); p.textContent = f.d;
    tx.append(h, p); li.append(tx, b); featEl.append(li);
  }

  // ---------- boot ----------
  // a save (if there is one: world/state.js) comes in two steps: things, people and machines before the first location is built,
  // the hero, the clock and the camera after it; then what he wears is checked against what he still has (he may have sold it)
  function boot(data) {
    const t0 = performance.now();
    buildDecals();
    loadSaved(data, 'before');
    enterLocation(data && LOCATIONS[data.loc] ? data.loc : 'range', 'start');
    if (loadSaved(data, 'after'))
      for (const k of ['body', 'head', 'hands']) if (equip[k] !== null && !GEAR.some((g) => g.id === equip[k] && g.slot === k && hasThing(g.id))) equip[k] = null;
    setHero(buildHero(equip));
    prepareStage();
    $('loading').hidden = true;
    Object.assign(GAME_API, { doShoot, doThrow, startSmoke, startDrink, toggleGear, raiseTargets, SOMOV, PEOPLE, INV, talkTo, openTrade, personFollow, personWear, takeControl, personById, talk: () => TALK && { node: TALK.id, line: TALK.line, opts: TALK.opts.map((o) => typeof o.say === 'function' ? o.say(TALK.p) : o.say) } });
    GAME_API.bootMs = Math.round(performance.now() - t0);
    startSaving();
    runFrames();
  }
  whenReady('poligon', (data) => { try { boot(data); } catch (e) { console.error(e); $('loading').textContent = 'Не получилось собрать полигон: ' + e.message; } });
