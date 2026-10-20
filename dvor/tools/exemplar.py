import numpy as np, cv2
from numpy.lib.stride_tricks import sliding_window_view as swv

def exemplar_inpaint(img, mask, patch=9, search=48, seed=0, src_mask=None):
    """Onion-peel exemplar inpainting. img uint8 HxWx3, mask uint8 (255 = fill)."""
    rng = np.random.default_rng(seed)
    r = patch // 2
    pad = r + search + 2
    I = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_REFLECT).astype(np.float32)
    M = cv2.copyMakeBorder((mask > 0).astype(np.uint8), pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=1).astype(bool)
    # forbid sampling from the padded border
    border = np.ones_like(M); border[pad:-pad, pad:-pad] = False
    known = ~M
    src_ok_global = known & ~border
    if src_mask is not None:
        S_ = cv2.copyMakeBorder((src_mask > 0).astype(np.uint8), pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0).astype(bool)
        src_ok_global = src_ok_global & S_
    k = np.ones((patch, patch), np.uint8)
    valid_centers = cv2.erode(src_ok_global.astype(np.uint8), k).astype(bool)
    it = 0
    while M[pad:-pad, pad:-pad].any():
        it += 1
        known = ~M
        kn = cv2.boxFilter(known.astype(np.float32), -1, (patch, patch), normalize=False)
        bnd = M & (cv2.dilate(known.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
        bnd[:pad] = bnd[-pad:] = False; bnd[:, :pad] = bnd[:, -pad:] = False
        if not bnd.any():
            break
        score = np.where(bnd, kn + rng.random(kn.shape) * 0.01, -1)
        y, x = np.unravel_index(np.argmax(score), score.shape)
        T = I[y - r:y + r + 1, x - r:x + r + 1]
        K = known[y - r:y + r + 1, x - r:x + r + 1].astype(np.float32)[..., None]
        y0, y1 = y - search, y + search + 1
        x0, x1 = x - search, x + search + 1
        region = I[y0 - r:y1 + r, x0 - r:x1 + r]
        win = swv(region, (patch, patch), axis=(0, 1))       # (h, w, 3, p, p)
        win = np.moveaxis(win, 2, -1)                         # (h, w, p, p, 3)
        d = ((win - T[None, None]) ** 2 * K[None, None]).sum(axis=(2, 3, 4))
        vc = valid_centers[y0:y1, x0:x1]
        d = np.where(vc, d, np.inf)
        # mild preference for nearby sources
        yy, xx = np.mgrid[-search:search + 1, -search:search + 1]
        d = d * (1 + 0.0015 * np.sqrt(yy ** 2 + xx ** 2))
        if not np.isfinite(d).any():
            M[y - r:y + r + 1, x - r:x + r + 1] = False
            continue
        by, bx = np.unravel_index(np.argmin(d), d.shape)
        sy, sx = y0 + by, x0 + bx
        S = I[sy - r:sy + r + 1, sx - r:sx + r + 1]
        fill = ~known[y - r:y + r + 1, x - r:x + r + 1]
        T[fill] = S[fill]
        M[y - r:y + r + 1, x - r:x + r + 1] = False
    return np.clip(I[pad:-pad, pad:-pad], 0, 255).astype(np.uint8)
