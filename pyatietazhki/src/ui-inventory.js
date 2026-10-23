  // ================= inventory UI =================
  const statsEl = $('stats'), itemsEl = $('items');
  const icons = {};
  function renderStats() {
    const armor = (equip.body === 'jacket' ? 1 : equip.body === 'armor' ? 8 : 0) + (equip.head === 'helmet' ? 3 : 0);
    const spd = equip.body === 'armor' ? 85 : 100, dmg = equip.hands === 'rifle' ? 12 : 3;
    const rows = [['Броня', armor, armor / 11 * 100], ['Скорость', spd + '%', spd], ['Урон', dmg, dmg / 12 * 100]];
    statsEl.innerHTML = rows.map(([n, v, w]) => `<div class="stat"><div class="stat-row"><span>${n}</span><b>${v}</b></div><div class="bar"><i style="width:${Math.round(w)}%"></i></div></div>`).join('');
  }
  function renderItems() {
    if (!itemsEl.children.length) {
      for (const it of ITEMS) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'item'; b.id = 'item-' + it.id;
        const cv = icons[it.id]; cv.setAttribute('aria-hidden', 'true');
        const nm = document.createElement('span'); nm.className = 'iname'; nm.textContent = it.name;
        const nt = document.createElement('span'); nt.className = 'inote'; nt.textContent = it.note;
        const stt = document.createElement('span'); stt.className = 'istate';
        b.append(cv, nm, nt, stt);
        b.addEventListener('click', () => onItem(it));
        itemsEl.appendChild(b);
      }
    }
    for (const it of ITEMS) {
      const b = $('item-' + it.id), stt = b.querySelector('.istate');
      if (it.use) {
        stt.textContent = it.count > 0 ? '×' + it.count : 'кончились';
        b.classList.toggle('empty', it.count <= 0);
        b.setAttribute('aria-pressed', String((it.id === 'cigs' && hero.smoke.on) || (it.id === 'atom' && hero.drink.on)));
      } else {
        const on = isOn(it.id);
        stt.textContent = on ? (it.id === 'rifle' ? 'в руках' : 'надето') : 'в рюкзаке';
        b.setAttribute('aria-pressed', String(on));
      }
    }
    renderStats();
  }
  function flashItem(id) {
    const b = $('item-' + id); if (!b) return;
    b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 1600);
  }
  function setGear() {
    HERO = buildHero(equip); gearVer++; lastKey = ''; portraitKey = '';
    renderItems(); sparkleAround();
  }
  function onItem(it) {
    if (it.id === 'cigs') { if (hero.smoke.on) hero.smoke.on = false; else startSmoke(); renderItems(); return; }
    if (it.id === 'atom') { if (hero.drink.on) hero.drink.on = false; else startDrink(); renderItems(); return; }
    if (hero.inside || (hero.act && hero.act.kind === 'board')) { toast('В костюме не переоденешься — места нет.'); return; }
    if (it.id === 'armor' && equip.body !== 'armor' && (busyAct() || onTower())) { toast('Броня сюда не влезет. Сначала слезь.'); return; }
    if (it.slot === 'body') equip.body = equip.body === it.id ? null : it.id;
    else if (it.slot === 'head') equip.head = equip.head === it.id ? null : it.id;
    else if (it.slot === 'hands') { equip.hands = equip.hands === it.id ? null : it.id; if (!equip.hands) hero.shoot.on = false; }
    if (equip.head === 'helmet' && (hero.smoke.on || hero.drink.on)) { hero.smoke.on = false; hero.drink.on = false; toast('Шлем надет, сигарета и банка убраны.'); }
    setGear();
  }

