  // ================= inventory =================
  import { equip } from '../../engine/src/hero/model.js';
  export const ITEMS = [
    { id: 'jacket', name: 'Кожаная куртка', note: 'Броня +1', slot: 'body' },
    { id: 'armor', name: 'Силовая броня', note: 'Броня +8, скорость −15%', slot: 'body' },
    { id: 'helmet', name: 'Шлем брони', note: 'Броня +3, в нём не покуришь', slot: 'head' },
    { id: 'rifle', name: 'Штурмовая винтовка', note: 'Урон 12, очередь по 3', slot: 'hands' },
    { id: 'cigs', name: 'Сигареты «Альде­бараан»', note: 'Спокойствие +2', use: true, count: 20 },
    { id: 'atom', name: 'Энергетик «ATOM»', note: 'Бодрость +5', use: true, count: 3 }
  ];
  Object.assign(equip, { body: 'jacket', head: null, hands: 'rifle' });     // what he starts in (equip, HERO, armored() are the engine's)
  export const itemById = (id) => ITEMS.find((i) => i.id === id);
  export const isOn = (id) => equip.body === id || equip.head === id || equip.hands === id;
  // the inventory panel listens: counts changed (a cigarette smoked, a find picked up) → redraw; a find → make it flash
  export const ITEM_HOOKS = { changed: [], found: [] };
  export function itemsChanged() { for (const f of ITEM_HOOKS.changed) f(); }
  export function itemFound(id) { for (const f of ITEM_HOOKS.found) f(id); }

