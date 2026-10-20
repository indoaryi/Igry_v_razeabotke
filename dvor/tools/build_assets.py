"""Builds the layered assets for the living courtyard from the single painted image."""
import json, sys
import numpy as np, cv2
sys.path.insert(0, '/home/claude/dvor/tools')
import world_def as wd

OUT = '/home/claude/dvor/build'
SCR = '/tmp/claude-0/-home-claude/d64d777e-aa5d-5242-83f5-0a77943c5a0e/scratchpad'
src = cv2.imread('/home/claude/dvor/src/source.png')
H, W = src.shape[:2]

def poly_mask(pts, val=255, m=None):
    if m is None: m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], val)
    return m

# ---------------------------------------------------------------- 1. remove painted movers
REMOVE_POLYS = [
    [(266,494),(320,490),(362,526),(362,606),(354,656),(286,656),(268,612)],    # mum + pram + reflection
    [(758,148),(798,148),(800,226),(804,246),(758,246)],                          # man on north road
    [(778,213),(808,213),(808,242),(778,242)],                                     # small dog
    [(709,227),(748,227),(748,263),(709,263)],                                     # brown dog
    [(503,548),(542,548),(542,576),(503,576)],                                     # pigeons
    [(546,603),(582,603),(582,627),(546,627)],
    [(586,608),(612,608),(612,634),(586,634)],
    [(794,651),(819,651),(819,676),(794,676)],
    [(818,668),(846,668),(846,694),(818,694)],
    [(866,669),(894,669),(894,696),(866,696)],
]
rm = np.zeros((H, W), np.uint8)
for p in REMOVE_POLYS: poly_mask(p, 255, rm)
# swing chains and seats (redrawn live)
for (a, b) in [((942,493),(943,563)), ((958,497),(958,563)), ((977,505),(978,575)), ((994,510),(993,575))]:
    cv2.line(rm, a, b, 255, 3)
cv2.rectangle(rm, (945,560), (965,574), 255, -1)
cv2.rectangle(rm, (968,572), (1002,587), 255, -1)

def texture_fill(img, mask, offsets):
    """Telea inpaint + transfer of high-frequency texture from a nearby offset patch."""
    base = cv2.inpaint(img, mask, 7, cv2.INPAINT_TELEA).astype(np.float32)
    out = base.copy()
    m = (mask > 0)
    for (dx, dy, region) in offsets:
        rmask = np.zeros_like(mask); poly_mask(region, 255, rmask)
        sel = m & (rmask > 0)
        if not sel.any(): continue
        shifted = np.roll(np.roll(img, dy, 0), dx, 1).astype(np.float32)
        hf = shifted - cv2.GaussianBlur(shifted, (0, 0), 3)
        out[sel] = base[sel] + hf[sel] * 0.9
    out = np.clip(out, 0, 255).astype(np.uint8)
    feather = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 1.2)[..., None]
    return (img * (1 - feather) + out * feather).astype(np.uint8)

from exemplar import exemplar_inpaint
import time
t0=time.time()
clean = src.copy()
# constrained jobs: (fill polygon, allowed source polygon)
JOBS = [  # (fill polygon, allowed source polygon, search radius)
    ([(266,494),(320,490),(362,526),(362,546),(318,566),(266,576)], [[(180,506),(237,506),(237,580),(180,582)],[(251,506),(268,500),(268,577),(251,580)]], 110),
    ([(266,574),(318,564),(362,544),(362,606),(354,656),(286,656),(268,612)],
        [(362,604),(388,614),(452,646),(452,702),(338,702),(338,660),(362,660)], 110),
    ([(758,148),(798,148),(800,226),(804,246),(758,246)], [(704,130),(792,130),(792,300),(704,300)], 56),
    ([(778,213),(808,213),(808,242),(778,242)], [(704,130),(792,130),(792,300),(704,300)], 56),
    ([(709,227),(748,227),(748,263),(709,263)], [(690,200),(792,200),(792,300),(690,300)], 56),
]
done = np.zeros((H, W), np.uint8)
for j, (fp, sp, srch) in enumerate(JOBS):
    fm = poly_mask(fp) & rm
    sm = np.zeros((H, W), np.uint8)
    for spp in (sp if isinstance(sp[0], list) else [sp]): poly_mask(spp, 255, sm)
    sm = sm & (255 - rm)
    xs, ys = np.where(fm.T > 0)
    if len(xs) == 0: continue
    pad = srch + 14
    X0, Y0 = max(0, xs.min() - pad), max(0, ys.min() - pad); X1, Y1 = min(W, xs.max() + pad), min(H, ys.max() + pad)
    clean[Y0:Y1, X0:X1] = exemplar_inpaint(clean[Y0:Y1, X0:X1], fm[Y0:Y1, X0:X1], 9, srch, j, sm[Y0:Y1, X0:X1])
    done |= fm
rest = rm & (255 - done)
n, lab, st, _ = cv2.connectedComponentsWithStats(rest)
for i in range(1, n):
    x, y, w, h, a = st[i]
    comp = ((lab == i) * 255).astype(np.uint8)
    pad = 70
    X0, Y0 = max(0, x - pad), max(0, y - pad); X1, Y1 = min(W, x + w + pad), min(H, y + h + pad)
    clean[Y0:Y1, X0:X1] = exemplar_inpaint(clean[Y0:Y1, X0:X1], comp[Y0:Y1, X0:X1], 9, 48, 100 + i)
print('inpaint', round(time.time()-t0,1), 's')
cv2.imwrite(OUT + '/clean_eve.png', clean)

# ---------------------------------------------------------------- 2. emissive map
img = clean.astype(np.float32) / 255.0
b, g, r = img[..., 0], img[..., 1], img[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
warm = r - b
E_win = np.clip((lum - 0.24) / 0.28, 0, 1) * np.clip((warm - 0.06) / 0.18, 0, 1)
E_win = np.maximum(E_win, np.clip((lum - 0.68) / 0.15, 0, 1))
E_ground = np.clip((lum - 0.34) / 0.25, 0, 1) * np.clip((warm - 0.10) / 0.20, 0, 1)

LIT_WINDOWS = {  # windows lit in the painting: (x0,y0,x1,y1)
 'LA2': (258,0,292,26), 'LB4': (425,30,513,98), 'LD': (64,224,126,292),
 'R1b': (1052,74,1086,128), 'R2a': (1136,0,1186,46), 'R2b': (1131,96,1191,152),
 'R2c': (1134,199,1191,256), 'R3a': (1227,9,1263,61), 'R4a': (1296,24,1354,81),
 'R4b': (1299,129,1353,186), 'R6b': (1481,54,1589,126), 'R6c': (1479,164,1591,242),
}
DARK_WINDOWS = {  # windows dark in the painting that can light up at night
 'LA1': (173,1,214,39), 'LB1': (173,101,214,149), 'LB2': (259,83,291,139), 'LB3': (343,66,371,119),
 'LB5': (531,23,566,74), 'LC1': (173,211,214,261), 'LC2': (259,191,291,244), 'LC3': (434,146,477,204),
 'LC4': (531,126,566,179), 'R1a': (1053,0,1085,21), 'R1c': (1053,179,1085,231), 'R3b': (1228,116,1259,164),
 'R5a': (1406,46,1444,99), 'R5b': (1406,156,1444,209), 'R7a': (1636,0,1671,39),
 'R7b': (1636,96,1671,149), 'R7c': (1636,211,1671,264),
}
ZONES = {
 'entry_l': {'poly': [(322,196),(412,196),(414,256),(452,262),(474,350),(318,350)], 'lamp': (340,212), 'kind': 'entry'},
 'entry_r': {'poly': [(1188,256),(1292,256),(1294,404),(1160,404),(1160,330)], 'lamp': (1256,275), 'kind': 'entry'},
 'shop': {'poly': [(1362,286),(1425,300),(1600,338),(1602,446),(1560,448),(1478,428),(1362,384)], 'kind': 'shop'},
 'shop_refl': {'poly': [(1290,404),(1478,430),(1560,450),(1612,450),(1612,640),(1480,640),(1400,560),(1290,520)], 'kind': 'refl'},
}
SIGN_BOX = [(1362,247),(1597,299),(1597,337),(1362,284)]
LETTERS_X = (1424, 1541)

E = np.zeros((H, W), np.float32)
groups = []
def add_group(gid, kind, mask, Emap, extra=None):
    Eg = Emap * (mask > 0)
    E[:] = np.maximum(E, Eg)
    ys, xs = np.where(Eg > 0.02)
    if len(xs) == 0: return
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    d = {'id': gid, 'kind': kind, 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}
    if extra: d.update(extra)
    groups.append((d, Eg[y0:y1, x0:x1].copy()))

for k, (x0, y0, x1, y1) in LIT_WINDOWS.items():
    m = np.zeros((H, W), np.uint8); cv2.rectangle(m, (x0, y0), (x1 - 1, y1 - 1), 255, -1)
    Ew = np.clip(E_win * 1.25, 0, 1)
    add_group(k, 'window', m, cv2.GaussianBlur(Ew, (0, 0), 0.6), {'src': 'paint'})
for k, z in ZONES.items():
    m = poly_mask(z['poly'])
    if z['kind'] == 'refl':
        add_group(k, 'refl', m, E_ground)
    elif z['kind'] == 'shop':
        sb = poly_mask(SIGN_BOX)
        add_group(k, 'shop', m & (255 - sb), E_win)
    else:
        add_group(k, 'entry', m, np.maximum(E_win, E_ground), {'lamp': z['lamp']})

# sign: whole lightbox glows; letters split for flicker
sb = poly_mask(SIGN_BOX)
box_E = np.full((H, W), 1.0, np.float32)
letters_E = np.clip((lum - 0.45) / 0.2, 0, 1) * (sb > 0)
add_group('sign_box', 'sign', sb, box_E * (1 - letters_E))
lx0, lx1 = LETTERS_X
for i in range(8):
    a = int(lx0 + (lx1 - lx0) * i / 8); bb = int(lx0 + (lx1 - lx0) * (i + 1) / 8)
    m = np.zeros((H, W), np.uint8); m[:, a:bb] = 255
    add_group('letter%d' % i, 'letter', m & sb, letters_E, {'index': i})

# ---------------------------------------------------------------- 3. unlit evening base
gray = lum[..., None]
dark = np.concatenate([gray * 0.40 + 0.020, gray * 0.42 + 0.024, gray * 0.44 + 0.034], -1)  # b,g,r order fixed below
dark = np.stack([gray[..., 0] * 0.46 + 0.035, gray[..., 0] * 0.42 + 0.025, gray[..., 0] * 0.40 + 0.020], -1)
k = (np.clip(E, 0, 1) * 0.86)[..., None]
unlit = img * (1 - k) + dark * k
unlit8 = np.clip(unlit * 255, 0, 255).astype(np.uint8)
cv2.imwrite(OUT + '/bg_eve.png', unlit8)

# ---------------------------------------------------------------- 4. overcast day grade
u = unlit.copy()
u = np.power(np.clip(u, 0, 1), 0.78)
u = u * 1.22 + 0.035
grayd = (0.299 * u[..., 2] + 0.587 * u[..., 1] + 0.114 * u[..., 0])[..., None]
u = u * 0.86 + grayd * 0.14                       # calm the evening warmth
u[..., 0] *= 1.07; u[..., 1] *= 1.02; u[..., 2] *= 0.97   # B,G,R: cooler daylight
day8 = np.clip(u * 255, 0, 255).astype(np.uint8)
cv2.imwrite(OUT + '/bg_day.png', day8)

# ---------------------------------------------------------------- 5. light overlays atlas
tiles = []
for d, Eg in groups:
    x, y, w, h = d['x'], d['y'], d['w'], d['h']
    rgb = clean[y:y + h, x:x + w]
    a = np.clip(Eg, 0, 1)
    a = a * a * (3 - 2 * a)
    rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])
    tiles.append((d, rgba))

def lit_from_dark(rect):
    x0, y0, x1, y1 = rect
    patch = clean[y0:y1, x0:x1].astype(np.float32) / 255
    L = 0.299 * patch[..., 2] + 0.587 * patch[..., 1] + 0.114 * patch[..., 0]
    Ln = (L - L.min()) / max(1e-3, (L.max() - L.min()))
    lo = np.array([30, 60, 120], np.float32) / 255    # BGR deep amber
    mid = np.array([80, 150, 220], np.float32) / 255
    hi = np.array([160, 222, 255], np.float32) / 255
    t = Ln[..., None]
    col = np.where(t < 0.55, lo + (mid - lo) * (t / 0.55), mid + (hi - mid) * ((t - 0.55) / 0.45))
    hgt = y1 - y0
    vg = (1.0 - 0.18 * (np.arange(hgt) / max(1, hgt - 1)))[:, None, None]
    col = np.clip(col * vg, 0, 1)
    a = np.full(L.shape, 0.93, np.float32)
    a[0, :] *= 0.5; a[-1, :] *= 0.5; a[:, 0] *= 0.5; a[:, -1] *= 0.5
    return np.dstack([(col * 255).astype(np.uint8), (a * 255).astype(np.uint8)])

for k2, rect in DARK_WINDOWS.items():
    x0, y0, x1, y1 = rect
    d = {'id': k2, 'kind': 'window', 'src': 'synth', 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}
    tiles.append((d, lit_from_dark(rect)))

# simple shelf packer
tiles.sort(key=lambda t: -t[1].shape[0])
AW = 1024; cx = cy = 0; rowh = 0; meta = []
placed = []
for d, im in tiles:
    h, w = im.shape[:2]
    if cx + w + 2 > AW: cx = 0; cy += rowh + 2; rowh = 0
    placed.append((cx, cy, d, im)); cx += w + 2; rowh = max(rowh, h)
AH = cy + rowh + 2
atlas = np.zeros((AH, AW, 4), np.uint8)
for (ax, ay, d, im) in placed:
    h, w = im.shape[:2]
    atlas[ay:ay + h, ax:ax + w] = im
    d = dict(d); d['ax'] = ax; d['ay'] = ay; meta.append(d)
cv2.imwrite(OUT + '/lights.png', atlas)
json.dump(meta, open(OUT + '/lights.json', 'w'))
print('groups', len(meta), 'atlas', AW, AH)

# preview: night composite
night = (unlit * np.array([0.62, 0.42, 0.34])).astype(np.float32)
prev = (np.clip(night, 0, 1) * 255).astype(np.uint8).copy()
for (ax, ay, d, im) in placed:
    if d.get('src') == 'synth' and hash(d['id']) % 3 == 0: continue
    h, w = im.shape[:2]; x, y = d['x'], d['y']
    al = im[..., 3:4].astype(np.float32) / 255
    prev[y:y + h, x:x + w] = (prev[y:y + h, x:x + w] * (1 - al) + im[..., :3] * al).astype(np.uint8)
cv2.imwrite(SCR + '/prev_night.png', prev)
side = np.concatenate([day8, unlit8], 1)
cv2.imwrite(SCR + '/prev_daydusk.png', cv2.resize(side, (side.shape[1] // 2, side.shape[0] // 2)))
