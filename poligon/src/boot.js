  // ================= the range's page: quick actions, gear, the checklist of engine features, boot =================
  const aShoot = $('aShoot'), aSmoke = $('aSmoke'), aDrink = $('aDrink'), aPunch = $('aPunch'), aThrow = $('aThrow');
  aShoot.addEventListener('click', doShoot);
  aSmoke.addEventListener('click', () => { if (hero.smoke.on) hero.smoke.on = false; else startSmoke(); });
  aDrink.addEventListener('click', () => { if (hero.drink.on) hero.drink.on = false; else startDrink(); });
  aPunch.addEventListener('click', doPunch);
  aThrow.addEventListener('click', doThrow);
  const gearEl = $('gear');
  for (const g of GEAR) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.textContent = g.label; b.dataset.id = g.id;
    b.addEventListener('click', () => toggleGear(g));
    gearEl.append(b);
  }
  let pageKey = '';
  hook(GAME.frame, () => {
    const key = '' + hero.smoke.on + hero.drink.on + equip.body + equip.head + equip.hands;
    if (key === pageKey) return;
    pageKey = key;
    aSmoke.textContent = hero.smoke.on ? 'Потушить' : 'Закурить'; aSmoke.setAttribute('aria-pressed', String(hero.smoke.on));
    aDrink.textContent = hero.drink.on ? 'Убрать воду' : 'Попить'; aDrink.setAttribute('aria-pressed', String(hero.drink.on));
    aShoot.disabled = equip.hands !== 'rifle';
    for (const b of gearEl.children) b.setAttribute('aria-pressed', String(equip.body === b.dataset.id || equip.head === b.dataset.id || equip.hands === b.dataset.id));
  });

  // ---------- the checklist: every feature of the engine and a button that shows it ----------
  // the hero is taken there (or the clock is moved) the way a player would do it
  function inRange(f) { return () => { if (MAP.id !== 'range') { toast('Это на полигоне — вернись через ворота.'); goToLocation('range'); return; } f(); }; }
  function inEdge(f) { return () => { if (MAP.id !== 'edge') { goToLocation('edge'); toast('Иду на опушку — это за воротами.'); return; } f(); }; }
  const firstOf = (t) => byType(t)[0];
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
    { t: 'Снаряжение', d: 'Куртка, броня, шлем, винтовка — модель героя собирается заново. В броне медленнее.', go: () => toggleGear(GEAR[1]) },
    { t: 'Вся локация сверху', d: 'Обзор целиком: видно, как собраны земля, дома и деревья.', go: () => setView('all') },
    { t: '3D без пикселей', d: 'Та же сцена до перевода в пиксель-арт: плавный свет и настоящая геометрия.', go: () => { const c = $('rawChk'); c.checked = !c.checked; raw = c.checked; lastKey = ''; } }
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
  // what survives a page update for someone who has the range open: where the hero stood, his gear, the hour, the view
  function hotData() {
    return { loc: MAP.id, x: hero.x, z: hero.z, y: hero.y, yaw: hero.yaw, equip: Object.assign({}, equip), hour: DAY.goal ?? DAY.t, clock: DAY.run, view: viewMode };
  }
  function applyHot(d) {
    if (!d || typeof d !== 'object' || !Number.isFinite(d.x)) return false;
    if (d.equip) for (const k of ['body', 'head', 'hands']) if (k in d.equip && (d.equip[k] === null || GEAR.some((g) => g.id === d.equip[k] && g.slot === k))) equip[k] = d.equip[k];
    if (Number.isFinite(d.z) && !(d.y > 0.05) && d.x > 0 && d.x < GW && d.z > 0 && d.z < GH && !blockedAt(d.x, d.z)) { hero.x = d.x; hero.z = d.z; hero.arrived = !!exitAt(hero.x, hero.z); }
    if (Number.isFinite(d.yaw)) hero.yaw = hero.tyaw = d.yaw;
    if (Number.isFinite(d.hour)) daySet(d.hour);
    if (d.clock) { DAY.run = true; $('clockChk').checked = true; }
    return true;
  }
  function boot(hot) {
    const t0 = performance.now();
    buildDecals();
    enterLocation(hot && LOCATIONS[hot.loc] ? hot.loc : 'range', 'start');
    const resumed = applyHot(hot);
    HERO = buildHero(equip);
    prepareStage();
    $('loading').hidden = true;
    Object.assign(GAME_API, { doShoot, doThrow, startSmoke, startDrink, toggleGear, raiseTargets });
    GAME_API.bootMs = Math.round(performance.now() - t0);
    if (resumed && hot.view && vBtns[hot.view] && hot.view !== viewMode) setView(hot.view);
    try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(hotData); } catch (e) { /* no live updates here */ }
    runFrames();
  }
  let booted = false;
  const start = (data) => { if (booted) return; booted = true; try { boot(data || {}); } catch (e) { console.error(e); $('loading').textContent = 'Не получилось собрать полигон: ' + e.message; } };
  setTimeout(() => {
    const h = window.claude && window.claude.hot;
    if (h && h.ready) h.ready(start); else start((h && h.data) || {});
  }, 30);
