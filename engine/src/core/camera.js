  // ================= world & camera =================
  // One map cell is one metre. The camera looks along FV: world +x runs down-right on screen, +z runs down-left,
  // so the map's north corner (0,0) is at the top and the south corner at the bottom.
  const S = 54 * Math.SQRT2;                 // px per metre (the hero is ~119 px tall)
  const HW = 54, HH = 27;                    // half a cell on screen
  const SQ2 = Math.SQRT2, SQ3 = Math.sqrt(3);
  const RV = [1 / SQ2, 0, -1 / SQ2];
  const UV = [-1 / (2 * SQ2), SQ3 / 2, -1 / (2 * SQ2)];
  const FV = [-SQ3 / (2 * SQ2), -0.5, -SQ3 / (2 * SQ2)];
  const TOCAM = [-FV[0], -FV[1], -FV[2]];
  const DZ = 64, FPS = 12;
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

