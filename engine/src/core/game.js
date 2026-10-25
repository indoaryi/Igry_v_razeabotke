  // ================= the game's hooks: where a game plugs its own things into the engine =================
  // The engine never names a game's objects. What is the game's own — moving parts, critters, rules, texts —
  // comes in through these lists. Each list is kept in order of `at` (smaller first, 50 by default), so the game
  // can say whether its step runs before or after one of the engine's own modules (the walking machines use 10 and 90).
  export const GAME = {
    update: [],   // f(dt, view): the world's step, after the hero and the clock, before the effects
    tick: [],     // f(): twelve times a second, before a frame is built: freeze moving parts for the picture
    items: [],    // f(out): moving parts to draw this frame — push draw items into out
    key: [],      // f() → string: changes whenever those parts move (the stage is redrawn only when the key changes)
    focus: [],    // f(heroScreen) → [x, y] or null: a point the camera leans towards (the first one that answers wins)
    lights: [],   // f(out): lamps that are not catalog things, push { p, r, col, k, d, cone } (a machine's headlamps)
    drawFx: [],   // f(ctx, k, X, Y): 2D effects of the game's own, drawn over the scene with the engine's
    frame: [],    // f(dt, now): after the stage is drawn: panels and HUD of the game
    state: [],    // f() → text or null: what the hero is busy with, for the chip over the stage (the first that answers wins)
    context: []   // f() → { inst, mode } or null: what the panel «рядом» is about, before the engine looks for the nearest thing
  };
  export function hook(list, f, at = 50) {
    const h = (...a) => f(...a);
    h.hookAt = at;
    let i = list.length;
    while (i > 0 && (list[i - 1].hookAt ?? 50) > at) i--;
    list.splice(i, 0, h);
    return h;
  }
  // lines the engine says to the player by itself; a game may reword them
  export const TEXTS = {
    handsBusy: 'Сначала слезь — руки заняты.',
    inVehicle: 'Руки на рычагах — сначала выберись из костюма.',
    searched: 'Здесь уже всё перерыто.',
    nothingNear: 'Подойди к чему-нибудь или нажми на предмет. Нажатие на землю — просто идти.'
  };
