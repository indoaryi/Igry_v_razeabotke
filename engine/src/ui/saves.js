  // ================= the saves panel: the autosave, three slots, a file, a new game =================
  // It fills the page's element with id «saves»; a page without one has no panel (the game still saves by itself).
  // Loading a save or starting afresh reloads the page into it (world/state.js), so the panel never takes the world apart.
  import { $ } from '../core/prelude.js';
  import { toast } from '../core/toast.js';
  import { LOCATIONS } from '../world/map.js';
  import { SAVE_EVENTS, SAVE_SLOTS, gameId, loadSlot, loadText, newGame, saveData, saveTo, storeRead } from '../world/state.js';
  import { fmtHour } from '../world/daytime.js';
  import { button } from './hud.js';
  const savesEl = $('saves');
  const SLOT_NAMES = { auto: 'Автосохранение', 1: 'Слот 1', 2: 'Слот 2', 3: 'Слот 3' };
  // a save in one line: the day and hour in the game, the place, when it was saved
  function describeSave(d) {
    if (!d) return 'пусто';
    const c = d.parts && d.parts.clock, L = LOCATIONS[d.loc];
    const when = c && Number.isFinite(c.hour) ? `День ${c.day || 1}, ${fmtHour(c.hour)}` : '';
    let saved = '';
    try { saved = new Date(d.saved).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { /* no date */ }
    return [when, L ? (L.short || L.name) : ''].filter(Boolean).join(' · ') + (saved ? ' — сохранено ' + saved : '');
  }
  function exportSave() {
    const d = saveData(), c = d.parts.clock;
    const blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${gameId()}-den-${c ? c.day : 1}-${fmtHour(c ? c.hour : 0).replace(':', '-')}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.hidden = true;
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (f) f.text().then((t) => { if (!loadText(t)) toast('Этот файл — не сохранение этой игры.'); });
  });
  // «start afresh» asks twice: the autosave goes, the slots stay
  let newArmed = -1e9;
  const newBtn = button('Начать заново', () => {
    if (performance.now() - newArmed < 4000) { newGame(); return; }
    newArmed = performance.now(); newBtn.textContent = 'Точно заново? Нажми ещё раз';
    setTimeout(() => { newBtn.textContent = 'Начать заново'; }, 4000);
  });
  function renderSaves() {
    if (!savesEl) return;
    savesEl.textContent = '';
    const list = document.createElement('ul'); list.className = 'saves-list';
    for (const slot of SAVE_SLOTS) {
      const d = storeRead(slot);
      const li = document.createElement('li');
      const tx = document.createElement('div'); tx.className = 'saves-tx';
      const b = document.createElement('b'); b.textContent = SLOT_NAMES[slot];
      const sp = document.createElement('span'); sp.textContent = describeSave(d);
      tx.append(b, sp);
      const acts = document.createElement('div'); acts.className = 'saves-acts';
      if (slot !== 'auto') acts.append(button('Сохранить', () => { toast(saveTo(slot) ? SLOT_NAMES[slot] + ': сохранено.' : 'Не получилось сохранить: браузер не даёт места.'); }));
      acts.append(button('Загрузить', () => { if (!loadSlot(slot)) toast('Не получилось загрузить.'); }, '', !d));
      li.append(tx, acts);
      list.append(li);
    }
    const more = document.createElement('div'); more.className = 'saves-acts saves-more';
    more.append(button('Скачать в файл', exportSave), button('Открыть файл…', () => fileInput.click()), newBtn);
    savesEl.append(list, more, fileInput);
  }
  SAVE_EVENTS.started.push(renderSaves);
  SAVE_EVENTS.saved.push(renderSaves);
  if (savesEl && !document.getElementById('css-saves')) {
    const st = document.createElement('style'); st.id = 'css-saves';
    st.textContent = `
.saves-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line, #c6ccc9); }
.saves-list li { display: flex; gap: 8px 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 10px 0; border-bottom: 1px solid var(--line, #c6ccc9); }
.saves-tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.saves-tx span { color: var(--muted, #586067); font-size: 14px; overflow-wrap: anywhere; }
.saves-acts { display: flex; gap: 8px; flex-wrap: wrap; }
.saves-more { margin-top: 12px; }
`;
    document.head.append(st);
  }
