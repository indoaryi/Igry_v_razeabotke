  // ================= trading: the hero's things for a person's, with money to even it out =================
  // A person trades if his def has trade: { buy: share of the price he pays for the hero's things (0.6 by default),
  //   sell: share of the price he asks for his own (1 by default), wants(t) → true, or a line why he will not take it,
  //   says: { open, done, short, refuse } (lines; a list to pick from or (p) → line) }.
  // openTrade(p) opens the window: the hero's things and the person's, what the hero gives and what he takes, the balance in money.
  // A tap on a thing puts one of it in the deal, a tap on it in the deal takes it back. The deal goes through when what the hero gives
  // is worth at least what he takes; the person pays the difference back in money as far as he has it.
  // PEOPLE_HOOKS.traded: f(p, give, take) after a deal — the game takes off sold clothes, refreshes its panels.
  import { GAME, hook } from '../core/game.js';
  import { NAV, nearestFree } from '../world/nav.js';
  import { equip } from '../hero/wardrobe.js';
  import { hero, yawTo } from '../hero/hero.js';
  import { plan } from '../hero/state.js';
  import { INV, ITEM_TYPES, MONEY, fmtMoney, invAdd, invCount, invSorted, invTake, itemIcon } from './items.js';
  import { PEOPLE_HOOKS, peopleCss, personHere, personWear } from './people.js';
  import { TALK, endTalk, lineOf, personSays } from './talk.js';
  PEOPLE_HOOKS.traded = [];
  let DEAL = null;              // { p, give: Map(t → n), take: Map(t → n), note }
  PEOPLE_HOOKS.busy.push(() => !!DEAL);
  const tradeBuy = (p, t) => ITEM_TYPES[t].money ? 1 : Math.max(1, Math.round(ITEM_TYPES[t].price * (p.def.trade.buy ?? 0.6)));
  const tradeSell = (p, t) => ITEM_TYPES[t].money ? 1 : Math.max(1, Math.round(ITEM_TYPES[t].price * (p.def.trade.sell ?? 1)));
  const tradeLine = (p, key) => { const s = p.def.trade.says || {}; return lineOf(s[key], p); };
  function dealCalc() {
    const D = DEAL, p = D.p;
    let give = 0, take = 0;
    for (const [t, n] of D.give) give += tradeBuy(p, t) * n;
    for (const [t, n] of D.take) take += tradeSell(p, t) * n;
    const cashHero = invCount(INV.hero, MONEY) - (D.give.get(MONEY) || 0);
    const cashHim = invCount(p.inv, MONEY);
    const change = Math.max(0, give - take);
    return { give, take, short: Math.max(0, take - give), change, payBack: Math.min(change, cashHim), cashHero, cashHim };
  }
  export function openTrade(p) {
    if (!p.def.trade) return;
    if (TALK && TALK.p !== p) endTalk();
    DEAL = { p, give: new Map(), take: new Map(), note: tradeLine(p, 'open'), bad: false, back: document.activeElement };
    const el = tradeDom();
    el.querySelector('.trade-name').textContent = p.name;
    el.hidden = false;
    renderTrade();
    el.querySelector('.trade-x').focus();
  }
  function closeTrade() {
    if (!DEAL) return;
    const back = DEAL.back;
    DEAL = null;
    tradeDom().hidden = true;
    if (back && back.focus && document.contains(back)) back.focus();
  }
  // walk up to him first, like for a talk, then open the window
  export function goTrade(p) {
    if (p === hero || !personHere(p)) return;
    if (TALK && TALK.p === p) { openTrade(p); return; }
    const d = Math.hypot(hero.x - p.x, hero.z - p.z), k = 1.2 / (d || 1);
    if (d < 2.4 || (hero.sit > 0 && d < 3)) { if (!(hero.sit > 0)) hero.tyaw = yawTo(p.x, p.z); openTrade(p); return; }
    const spot = nearestFree(p.x + (hero.x - p.x) * k, p.z + (hero.z - p.z) * k, 1.5, NAV.hero) || [hero.x, hero.z];
    p.attend = 3;
    plan({ type: 'path', to: spot }, { type: 'call', fn: () => { hero.tyaw = yawTo(p.x, p.z); } }, { type: 'turned' }, { type: 'call', fn: () => { if (personHere(p)) openTrade(p); } });
  }
  PEOPLE_HOOKS.acts.push((p, out) => { if (p.def.trade) out.push({ label: 'Обмен', run: () => goTrade(p), order: 20 }); });

  // ---------- what a tap does ----------
  function dealPut(side, t) {
    const D = DEAL, p = D.p, pile = side === 'give' ? D.give : D.take, inv = side === 'give' ? INV.hero : p.inv;
    if ((pile.get(t) || 0) >= invCount(inv, t)) return;
    if (side === 'give') {
      const w = p.def.trade.wants ? p.def.trade.wants(t, p) : true;
      if (w !== true) { D.note = typeof w === 'string' ? w : tradeLine(p, 'refuse') || 'Это ему не нужно.'; D.bad = true; renderTrade(); return; }
    }
    pile.set(t, (pile.get(t) || 0) + 1);
    D.note = ''; D.bad = false;
    renderTrade();
  }
  function dealBack(side, t) {
    const pile = side === 'give' ? DEAL.give : DEAL.take, n = (pile.get(t) || 0) - (t === MONEY ? pile.get(t) : 1);
    if (n > 0) pile.set(t, n); else pile.delete(t);
    DEAL.note = ''; DEAL.bad = false;
    renderTrade();
  }
  // add the missing money from the hero's pocket
  function dealPay() {
    const c = dealCalc(), add = Math.min(c.short, c.cashHero);
    if (add <= 0) return;
    DEAL.give.set(MONEY, (DEAL.give.get(MONEY) || 0) + add);
    DEAL.note = ''; DEAL.bad = false;
    renderTrade();
  }
  function dealDo() {
    const D = DEAL, p = D.p, c = dealCalc();
    if (c.short > 0 || (!D.give.size && !D.take.size)) return;
    for (const [t, n] of D.give) { invTake(INV.hero, t, n); invAdd(p.inv, t, n); }
    for (const [t, n] of D.take) { invTake(p.inv, t, n); invAdd(INV.hero, t, n); }
    if (c.payBack > 0) { invTake(p.inv, MONEY, c.payBack); invAdd(INV.hero, MONEY, c.payBack); }
    // he sold a thing he was wearing: off it comes (the hero's own gear the game checks itself, PEOPLE_HOOKS.traded)
    for (const s of ['body', 'head', 'hands']) if (p.gear[s] && D.take.has(p.gear[s]) && !invCount(p.inv, p.gear[s])) personWear(p, s, null);
    const give = new Map(D.give), take = new Map(D.take);
    for (const f of PEOPLE_HOOKS.traded) f(p, give, take);
    D.give.clear(); D.take.clear();
    D.note = tradeLine(p, 'done') || 'По рукам.'; D.bad = false;
    personSays(p, D.note);
    renderTrade();
  }

  // ---------- the window ----------
  let tradeEl = null;
  function tradeDom() {
    if (tradeEl) return tradeEl;
    tradeEl = document.createElement('div');
    tradeEl.className = 'trade-back'; tradeEl.id = 'trade'; tradeEl.hidden = true;
    tradeEl.innerHTML = '<div class="trade" role="dialog" aria-modal="true" aria-labelledby="tradeTitle">'
      + '<div class="trade-top"><div class="trade-who"><span class="talk-k">Обмен</span><h3 class="trade-name" id="tradeTitle"></h3></div><button type="button" class="btn trade-x">Закрыть</button></div>'
      + '<div class="trade-cols"><section class="trade-col"><div class="trade-h"><span>У тебя</span><b data-cash="hero"></b></div><div class="trade-list" data-who="hero"></div></section>'
      + '<section class="trade-col"><div class="trade-h"><span>У него</span><b data-cash="him"></b></div><div class="trade-list" data-who="him"></div></section></div>'
      + '<div class="trade-cols"><section class="trade-col"><div class="trade-h"><span>Отдаёшь</span><b data-sum="give"></b></div><div class="trade-chips" data-pile="give"></div></section>'
      + '<section class="trade-col"><div class="trade-h"><span>Берёшь</span><b data-sum="take"></b></div><div class="trade-chips" data-pile="take"></div></section></div>'
      + '<p class="trade-say" aria-live="polite"></p>'
      + '<div class="trade-acts"><button type="button" class="btn trade-pay">Доплатить</button><button type="button" class="btn main trade-ok">Обменять</button></div></div>';
    document.body.append(tradeEl);
    tradeEl.querySelector('.trade-x').addEventListener('click', closeTrade);
    tradeEl.querySelector('.trade-pay').addEventListener('click', dealPay);
    tradeEl.querySelector('.trade-ok').addEventListener('click', dealDo);
    tradeEl.addEventListener('click', (e) => { if (e.target === tradeEl) closeTrade(); });
    // in the capture phase, so Escape closes the window and not the talk behind it
    document.addEventListener('keydown', (e) => { if (DEAL && e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeTrade(); } }, true);
    return tradeEl;
  }
  function tradeRow(t, n, price, meta, side, off) {
    const T = ITEM_TYPES[t], b = document.createElement('button');
    b.type = 'button'; b.className = 'trade-item';
    const nm = document.createElement('span'); nm.className = 'ti-name'; nm.textContent = T.name;
    const mt = document.createElement('span'); mt.className = 'ti-meta'; mt.textContent = fmtMoney(price) + (n > 1 ? ' · ×' + n : '') + (meta ? ' · ' + meta : '');
    b.append(itemIcon(t, 40), nm, mt);
    b.title = T.note || T.name;
    if (off) b.disabled = true; else b.addEventListener('click', () => dealPut(side, t));
    return b;
  }
  function tradeChip(t, n, side) {
    const T = ITEM_TYPES[t], b = document.createElement('button');
    b.type = 'button'; b.className = 'trade-chip';
    b.append(itemIcon(t, 24), document.createTextNode(T.money ? fmtMoney(n) : T.name + (n > 1 ? ' ×' + n : '')));
    b.setAttribute('aria-label', 'Убрать из сделки: ' + T.name);
    b.addEventListener('click', () => dealBack(side, t));
    return b;
  }
  function renderTrade() {
    const D = DEAL; if (!D) return;
    const el = tradeDom(), p = D.p, c = dealCalc(), q = (s) => el.querySelector(s);
    q('[data-cash="hero"]').textContent = fmtMoney(invCount(INV.hero, MONEY));
    q('[data-cash="him"]').textContent = fmtMoney(invCount(p.inv, MONEY));
    for (const side of ['give', 'take']) {
      const list = q(side === 'give' ? '[data-who="hero"]' : '[data-who="him"]'), inv = side === 'give' ? INV.hero : p.inv, pile = side === 'give' ? D.give : D.take;
      list.textContent = '';
      for (const s of invSorted(inv)) {
        if (ITEM_TYPES[s.t].money) continue;
        const left = s.n - (pile.get(s.t) || 0);
        if (left <= 0) continue;
        const worn = side === 'give' && ITEM_TYPES[s.t].gear && equip[ITEM_TYPES[s.t].gear.slot] === s.t;
        const w = side === 'give' && p.def.trade.wants ? p.def.trade.wants(s.t, p) : true;
        list.append(tradeRow(s.t, left, side === 'give' ? tradeBuy(p, s.t) : tradeSell(p, s.t), w !== true ? 'не возьмёт' : worn ? (ITEM_TYPES[s.t].gear.slot === 'hands' ? 'в руках' : 'надето') : '', side, false));
      }
      if (!list.children.length) { const e = document.createElement('p'); e.className = 'trade-empty'; e.textContent = side === 'give' ? 'Отдать больше нечего.' : 'Больше у него ничего нет.'; list.append(e); }
      const chips = q('[data-pile="' + side + '"]');
      chips.textContent = '';
      for (const [t, n] of pile) chips.append(tradeChip(t, n, side));
      if (!pile.size) { const e = document.createElement('span'); e.className = 'trade-empty'; e.textContent = 'пусто'; chips.append(e); }
    }
    q('[data-sum="give"]').textContent = fmtMoney(c.give);
    q('[data-sum="take"]').textContent = fmtMoney(c.take);
    let say = D.note, bad = D.bad;
    if (!say) {
      if (!D.give.size && !D.take.size) say = 'Нажми на вещь, чтобы положить её в сделку. Нажми в сделке — чтобы убрать.';
      else if (c.short > 0) { say = 'Не хватает ' + fmtMoney(c.short) + (c.cashHero < c.short ? ', а свободных денег у тебя ' + fmtMoney(c.cashHero) + '.' : '. Добавь вещей или доплати.'); bad = true; }
      else if (c.change > 0) say = c.payBack < c.change ? 'У него всего ' + fmtMoney(c.cashHim) + ': вернёт ' + fmtMoney(c.payBack) + ', остальное пропадёт.' : 'Он вернёт тебе ' + fmtMoney(c.change) + '.';
      else say = 'Ровно. Можно меняться.';
    }
    const sayEl = q('.trade-say'); sayEl.textContent = say; sayEl.classList.toggle('bad', !!bad);
    const pay = q('.trade-pay'); pay.disabled = !(c.short > 0 && c.cashHero > 0);
    pay.textContent = c.short > 0 && c.cashHero > 0 ? 'Доплатить ' + fmtMoney(Math.min(c.short, c.cashHero)) : 'Доплатить';
    q('.trade-ok').disabled = c.short > 0 || (!D.give.size && !D.take.size);
  }
  hook(GAME.update, () => { if (DEAL && !personHere(DEAL.p)) closeTrade(); }, 36);
  peopleCss('css-trade', `
.trade-back { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: rgba(10, 12, 14, .55);
  padding: max(10px, env(safe-area-inset-top, 0px)) max(10px, env(safe-area-inset-right, 0px)) max(10px, env(safe-area-inset-bottom, 0px)) max(10px, env(safe-area-inset-left, 0px)); }
.trade-back[hidden] { display: none; }
.trade { width: min(760px, 100%); max-height: 100%; overflow: auto; overscroll-behavior: contain; background: var(--bg, #eceeec); color: var(--ink, #1b1f22);
  border: 1px solid var(--line, #c6ccc9); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 12px; font-family: var(--body, sans-serif); }
.trade-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.trade-who { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.trade-name { margin: 0; font: 600 18px/1.25 var(--body, sans-serif); }
.trade-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
.trade-col { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.trade-h { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; font: 500 11px/1.2 var(--mono, monospace); letter-spacing: .05em; text-transform: uppercase; color: var(--muted, #586067); }
.trade-h b { font: 600 13px/1.2 var(--mono, monospace); letter-spacing: 0; text-transform: none; color: var(--ink, #1b1f22); }
.trade-list { display: flex; flex-direction: column; gap: 4px; max-height: min(300px, 38vh); overflow: auto; overscroll-behavior: contain; }
.trade-item { display: grid; grid-template-columns: 40px minmax(0, 1fr); column-gap: 8px; align-items: center; text-align: left; padding: 3px 8px 3px 3px;
  border: 1px solid var(--line, #c6ccc9); border-radius: 8px; background: var(--surface, #fff); color: var(--ink, #1b1f22); cursor: pointer; font: inherit; }
.trade-item .icon { grid-row: 1 / 3; width: 40px; height: 40px; image-rendering: pixelated; }
.ti-name { font-size: 13.5px; font-weight: 600; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ti-meta { font-size: 12px; line-height: 1.25; color: var(--muted, #586067); }
.trade-item:disabled { opacity: .45; cursor: default; }
.trade-item:focus-visible, .trade-chip:focus-visible { outline: 2px solid var(--accent, #b8691c); outline-offset: 2px; }
.trade-chips { display: flex; flex-wrap: wrap; gap: 4px; min-height: 40px; padding: 5px; border: 1px dashed var(--line, #c6ccc9); border-radius: 8px; align-content: flex-start; }
.trade-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 9px 1px 2px; border: 1px solid var(--line, #c6ccc9); border-radius: 999px;
  background: var(--surface, #fff); color: var(--ink, #1b1f22); font: 500 12.5px/1 var(--body, sans-serif); cursor: pointer; max-width: 100%; }
.trade-chip .icon { width: 24px; height: 24px; image-rendering: pixelated; flex: none; }
.trade-empty { margin: 0; align-self: center; font-size: 12.5px; color: var(--muted, #586067); }
.trade-say { margin: 0; font-size: 14.5px; line-height: 1.4; min-height: 1.4em; }
.trade-say.bad { color: var(--accent, #b8691c); }
.trade-acts { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
@media (max-width: 480px) {
  .trade { padding: 12px 10px; gap: 10px; }
  .trade-item { grid-template-columns: 32px minmax(0, 1fr); column-gap: 6px; padding-right: 6px; }
  .trade-item .icon { width: 32px; height: 32px; }
  .ti-name { white-space: normal; font-size: 13px; }
  .ti-meta { font-size: 11.5px; }
}
`);
