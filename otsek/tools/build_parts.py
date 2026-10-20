"""Cut the generated sprite sheets into animation parts and pack them into one atlas.

Every part keeps its position in "view space": pixels of the original view crop.
The game places parts in that space and scales the whole rig to world size.
"""
import json
import numpy as np
import cv2
from PIL import Image

ROOT = '/home/claude/otsek'
OUT = ROOT + '/build'
views = json.load(open(ROOT + '/build/views.json'))


def load_view(name, vi, desat=1.0):
    im = np.array(Image.open(f'{ROOT}/src/{name}.png').convert('RGBA')).astype(np.float32)
    x, y, w, h = views[name][vi]
    v = im[y:y + h, x:x + w].copy()
    a = v[..., 3]
    a[a < 48] = 0                       # drop the faint halo left by background removal
    v[..., 3] = a
    if desat != 1.0:                    # pull saturation toward the muted room palette
        rgb = v[..., :3]
        lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2])[..., None]
        v[..., :3] = np.clip(lum + (rgb - lum) * desat, 0, 255)
    return v


def poly_mask(shape, pts):
    m = np.zeros(shape[:2], np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return m


def rect_mask(shape, x0, y0, x1, y1):
    m = np.zeros(shape[:2], np.uint8)
    m[max(0, y0):y1, max(0, x0):x1] = 255
    return m


def resize_rgba(arr, scale):
    """Premultiplied-alpha area resize, so edges don't pick up dark fringes."""
    h, w = arr.shape[:2]
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    a = arr[..., 3] / 255.0
    rgb = arr[..., :3] * a[..., None]
    interp = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
    rgb_r = cv2.resize(rgb, (nw, nh), interpolation=interp)
    a_r = np.clip(cv2.resize(a, (nw, nh), interpolation=interp), 0, 1)
    out = np.zeros((nh, nw, 4), np.float32)
    safe = np.maximum(a_r, 1e-4)[..., None]
    out[..., :3] = np.where(a_r[..., None] > 1e-3, rgb_r / safe, 0)
    out[..., 3] = a_r * 255
    return np.clip(out, 0, 255)


PARTS = []      # (name, rgba image at texture scale, meta)


def add_part(name, view, mask, ts, extra=None):
    """Cut `mask` out of `view`, crop to content, scale by ts, remember the view-space box."""
    v = view.copy()
    v[..., 3] = np.where(mask > 0, v[..., 3], 0)
    ys, xs = np.where(v[..., 3] > 0)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    crop = v[y0:y1, x0:x1]
    img = resize_rgba(crop, ts)
    meta = {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'ts': ts}
    if extra:
        meta.update(extra)
    PARTS.append((name, img, meta))
    return meta


def figure_metrics(view):
    a = view[..., 3] > 128
    rows = np.where(a.any(1))[0]
    top, bottom = int(rows.min()), int(rows.max())
    # feet anchor: centre of the opaque pixels in the lowest 30 rows
    band = a[bottom - 30:bottom + 1]
    xs = np.where(band.any(0))[0]
    return {'top': top, 'bottom': bottom, 'footX': float((xs.min() + xs.max()) / 2), 'w': int(view.shape[1]), 'h': int(view.shape[0])}


def find_glow(view, cond, box=None):
    """Centre of bright pixels matching cond (used for lenses, visors, indicator lights)."""
    rgb = view[..., :3]
    m = cond(rgb[..., 0], rgb[..., 1], rgb[..., 2]) & (view[..., 3] > 128)
    if box:
        x0, y0, x1, y1 = box
        mm = np.zeros_like(m); mm[y0:y1, x0:x1] = m[y0:y1, x0:x1]; m = mm
    ys, xs = np.where(m)
    if len(xs) == 0:
        return None
    return [float(xs.mean()), float(ys.mean()), int(len(xs))]


RIGS = {}

# ------------------------------------------------------------------ player (leather coat)
TS_P = 0.5
pv = [load_view('player', i, 0.72) for i in range(3)]
pm = [figure_metrics(v) for v in pv]
f, s, b = pv
add_part('p_front_upper', f, rect_mask(f.shape, 0, 0, 470, 778), TS_P)
add_part('p_front_legL', f, rect_mask(f.shape, 0, 770, 240, 1000), TS_P, {'pivot': [150, 775]})
add_part('p_front_legR', f, rect_mask(f.shape, 240, 770, 470, 1000), TS_P, {'pivot': [345, 775]})
add_part('p_back_upper', b, rect_mask(b.shape, 0, 0, 467, 760), TS_P)
add_part('p_back_legL', b, rect_mask(b.shape, 0, 752, 232, 1000), TS_P, {'pivot': [140, 757]})
add_part('p_back_legR', b, rect_mask(b.shape, 232, 752, 467, 1000), TS_P, {'pivot': [330, 757]})
add_part('p_side_upper', s, rect_mask(s.shape, 0, 0, 325, 770), TS_P)
legNear = [(148, 690), (290, 690), (290, 1010), (98, 1010), (98, 952), (124, 936), (170, 906), (172, 830), (148, 820)]
legFar = [(70, 690), (148, 690), (148, 820), (172, 830), (170, 906), (124, 936), (98, 952), (98, 1010), (0, 1010), (0, 880), (70, 870)]
add_part('p_side_legFar', s, poly_mask(s.shape, legFar), TS_P, {'pivot': [118, 738]})
add_part('p_side_legNear', s, poly_mask(s.shape, legNear), TS_P, {'pivot': [214, 732]})
RIGS['player'] = {'heightM': 1.82, 'views': {'front': pm[0], 'side': pm[1], 'back': pm[2]}}

# ------------------------------------------------------------------ clerk (seated at the console, can glance over a shoulder)
TS_C = 0.5
cf, cs, cb = [load_view('clerk', i, 0.92) for i in range(3)]
cmf = figure_metrics(cf)
body = cb[0:600].copy()
yy, xx = np.mgrid[0:body.shape[0], 0:body.shape[1]]
headzone = (yy < 152) & (xx > 100) & (xx < 340)
head_back = cb[0:600].copy()
head_back[..., 3] = np.where(headzone | ((yy < 162) & (xx > 150) & (xx < 250)), head_back[..., 3], 0)
body[..., 3] = np.where(headzone, 0, body[..., 3])
ell = ((xx - 218) / 205.0) ** 2 + ((yy - 470) / 132.0) ** 2
body[..., 3] = np.where((yy > 470) & (ell > 1), 0, body[..., 3])
add_part('c_body', body, np.full(body.shape[:2], 255, np.uint8), TS_C, {'seat': [218, 592], 'neck': [198, 150]})
add_part('c_head_back', head_back, np.full(head_back.shape[:2], 255, np.uint8), TS_C)
side = cs[0:172, 22:238].copy()
lens_side = find_glow(side, lambda r, g, b: (g > 150) & (g > r * 1.4) & (g > b * 1.2))
# place the profile head in body space: its neck (x=128 in the crop, y=170) sits on the body neck
hs = np.zeros((600, body.shape[1], 4), np.float32)
ox, oy = 196 - 131, 160 - 170
hs[oy if oy > 0 else 0:oy + side.shape[0], ox:ox + side.shape[1]] = side[(-oy if oy < 0 else 0):]
add_part('c_head_left', hs, np.full(hs.shape[:2], 255, np.uint8), TS_C, {'lens': [lens_side[0] + ox, lens_side[1] + oy]})
lens = find_glow(cf, lambda r, g, b: (g > 150) & (g > r * 1.4) & (g > b * 1.2))
portrait = cf[0:250, 95:345]
add_part('c_portrait', portrait, np.full(portrait.shape[:2], 255, np.uint8), 0.62)
RIGS['clerk'] = {'heightM': 1.78, 'standH': cmf['bottom'] - cmf['top'], 'neck': [198, 150], 'seat': [218, 592]}

# ------------------------------------------------------------------ guard
TS_G = 0.42
gv = load_view('guard', 0, 0.9)
gm = figure_metrics(gv)
visor = find_glow(gv, lambda r, g, b: (r > 150) & (g > 100) & (b < 110) & (r > b * 1.6), (150, 0, 340, 200))
add_part('g_front', gv, np.full(gv.shape[:2], 255, np.uint8), TS_G, {'visor': visor})
RIGS['guard'] = {'heightM': 1.92, 'view': gm}

# ------------------------------------------------------------------ mech
TS_M = 0.8
mv = load_view('mech', 0, 0.75)
mm = figure_metrics(mv)
legL = [(165, 300), (292, 300), (292, 432), (305, 432), (305, 712), (95, 712), (95, 432), (160, 432)]
legR = [(432, 300), (556, 300), (556, 505), (625, 505), (625, 712), (415, 712), (415, 505), (432, 505)]
mL = poly_mask(mv.shape, legL)
mR = poly_mask(mv.shape, legR)
body = np.full(mv.shape[:2], 255, np.uint8)
body[mL > 0] = 0
body[mR > 0] = 0
lights = find_glow(mv, lambda r, g, b: (g > 140) & (g > r * 1.5) & (g > b * 1.5))
add_part('m_body', mv, body, TS_M)
add_part('m_legL', mv, mL, TS_M, {'hip': [230, 330], 'foot': [205, 690]})
add_part('m_legR', mv, mR, TS_M, {'hip': [495, 330], 'foot': [512, 690]})
# individual green lights
g = (mv[..., 1] > 140) & (mv[..., 1] > mv[..., 0] * 1.5) & (mv[..., 1] > mv[..., 2] * 1.5) & (mv[..., 3] > 128)
n, lab, st, cen = cv2.connectedComponentsWithStats(g.astype(np.uint8))
mlights = [[float(cen[i][0]), float(cen[i][1]), int(st[i][4])] for i in range(1, n) if st[i][4] >= 6]
RIGS['mech'] = {'heightM': 2.7, 'view': mm, 'lights': mlights}

# ------------------------------------------------------------------ desk
TS_D = 0.75
dv = load_view('desk', 0, 0.82)
dm = figure_metrics(dv)
add_part('d_front', dv, np.full(dv.shape[:2], 255, np.uint8), TS_D)
red = (dv[..., 0] > 170) & (dv[..., 1] < 110) & (dv[..., 3] > 128)
grn = (dv[..., 1] > 150) & (dv[..., 1] > dv[..., 0] * 1.4) & (dv[..., 3] > 128)
amb = (dv[..., 0] > 200) & (dv[..., 1] > 120) & (dv[..., 1] < 200) & (dv[..., 2] < 90) & (dv[..., 3] > 128)
dl = []
for col, m in (('r', red), ('g', grn), ('a', amb)):
    n, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8))
    for i in range(1, n):
        if 4 <= st[i][4] <= 400:
            dl.append([float(cen[i][0]), float(cen[i][1]), int(st[i][4]), col])
yy2, xx2 = np.mgrid[0:dv.shape[0], 0:dv.shape[1]]
rim = ((((xx2 - 280) / 70.0) ** 2 + ((yy2 - 447) / 25.0) ** 2) <= 1) & (yy2 >= 446)
add_part('d_stool_rim', dv, (rim * 255).astype(np.uint8), TS_D)
RIGS['desk'] = {'view': dm, 'pxPerM': 290, 'floorY': 580, 'seat': [283, 446], 'stoolBase': [278, 606],
                'radar': [148, 205, 36], 'lamp': [300, 38], 'mug': [338, 316], 'lights': dl}

# ------------------------------------------------------------------ pack
PARTS.sort(key=lambda p: -p[1].shape[0])
AW, pad = 2048, 2
x = y = rowh = 0
placed = []
for name, img, meta in PARTS:
    h, w = img.shape[:2]
    if x + w + pad > AW:
        x = 0; y += rowh + pad; rowh = 0
    placed.append((name, img, meta, x, y))
    x += w + pad; rowh = max(rowh, h)
H = y + rowh + pad
AH = 1
while AH < H:
    AH *= 2
atlas = np.zeros((AH, AW, 4), np.float32)
frames, metas = {}, {}
for name, img, meta, ax, ay in placed:
    h, w = img.shape[:2]
    atlas[ay:ay + h, ax:ax + w] = img
    frames[name] = {'frame': {'x': ax, 'y': ay, 'w': w, 'h': h}, 'rotated': False, 'trimmed': False,
                    'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h}}
    metas[name] = meta
Image.fromarray(np.clip(atlas, 0, 255).astype(np.uint8), 'RGBA').save(OUT + '/atlas.png')
json.dump({'frames': frames, 'meta': {'image': 'atlas.webp', 'size': {'w': AW, 'h': AH}, 'scale': '1'}}, open(OUT + '/atlas.json', 'w'))
json.dump({'parts': metas, 'rigs': RIGS}, open(OUT + '/parts.json', 'w'))
print('atlas', AW, AH, 'used height', H, 'parts', len(PARTS))
for k, v in RIGS.items():
    print(k, {kk: vv for kk, vv in v.items() if kk not in ('lights',)})
print('mech lights', RIGS['mech']['lights'])
print('desk lights', len(dl))
