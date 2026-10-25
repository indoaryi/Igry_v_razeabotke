  // ================= a line for the player: one message under the stage that fades after a few seconds =================
  // Any module may say something to the player (the world when the hero arrives, the hero when his hands are busy, the game).
  // The page's element with id «toast» shows it; a page without one simply stays silent.
  const toastEl = $('toast');
  let toastT = 0;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.hidden = false; toastT = 3.2; }
  function updateToast(dt) { if (toastT > 0) { toastT -= dt; if (toastT <= 0 && toastEl) toastEl.hidden = true; } }
