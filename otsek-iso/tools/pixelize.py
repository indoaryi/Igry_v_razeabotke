"""Supersampled renders → pixel-art sprites: downscale, hard alpha, per-character palette, soft dark edge; pack atlas."""
import json, os
import numpy as np, cv2
from PIL import Image
from sklearn.cluster import MiniBatchKMeans

R = '/home/claude/iso/build/raw'
OUT = '/home/claude/iso/build'
meta = json.load(open(R + '/meta.json'))
SS = meta['info']['SS']


def load(name):
    return np.array(Image.open(f'{R}/{name}.png').convert('RGBA')).astype(np.float32)


def downscale(img, ss):
    a = img[..., 3:4] / 255.0
    pre = img[..., :3] * a
    h, w = img.shape[:2]
    nw, nh = w // ss, h // ss
    pre_s = cv2.resize(pre, (nw, nh), interpolation=cv2.INTER_AREA)
    a_s = cv2.resize(a, (nw, nh), interpolation=cv2.INTER_AREA)[..., None]
    rgb = np.where(a_s > 0.02, pre_s / np.maximum(a_s, 0.02), 0)
    return rgb, a_s[..., 0]


def quantize(rgbs, alphas, k):
    """One palette per character, fitted on all its frames."""
    pix = np.concatenate([r[a > 0.5] for r, a in zip(rgbs, alphas)])
    if len(pix) > 60000:
        pix = pix[np.random.default_rng(0).choice(len(pix), 60000, replace=False)]
    km = MiniBatchKMeans(n_clusters=k, random_state=0, n_init=3).fit(pix)
    pal = km.cluster_centers_
    out = []
    for r, a in zip(rgbs, alphas):
        m = a > 0.5
        q = np.zeros_like(r)
        if m.any():
            idx = km.predict(r[m])
            q[m] = pal[idx]
        out.append((q, m))
    return out


def finish(q, m):
    """Hard-edged RGBA with a darker rim where the sprite meets the background."""
    h, w = m.shape
    er = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    rim = m & ~er
    q = q.copy()
    q[rim] *= 0.72
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = np.clip(q, 0, 255).astype(np.uint8)
    out[..., 3] = m.astype(np.uint8) * 255
    return out


def crop(img, ox, oy):
    a = img[..., 3] > 0
    if not a.any():
        return img[:1, :1], ox, oy
    ys, xs = np.where(a)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    return img[y0:y1, x0:x1], ox - x0, oy - y0


# ---------------------------------------------------------------- characters
tiles = []  # (name, rgba, meta)
by_who = {}
for name, f in meta['frames'].items():
    by_who.setdefault(f['who'], []).append(name)
K = {'player': 40, 'clerk': 36, 'guard': 36, 'mech': 36}
for who, names in by_who.items():
    names.sort()
    rgbs, alphas = [], []
    for n in names:
        r, a = downscale(load(n), SS)
        rgbs.append(r); alphas.append(a)
    qs = quantize(rgbs, alphas, K[who])
    for n, (q, m) in zip(names, qs):
        f = meta['frames'][n]
        img = finish(q, m)
        img, ox, oy = crop(img, f['originX'] / SS, f['originY'] / SS)
        tiles.append((n, img, {'who': who, 'dir': f['dir'], 'anim': f['anim'], 'f': f['f'], 'ox': float(ox), 'oy': float(oy)}))
    print(who, len(names), 'frames')

# ---------------------------------------------------------------- room
room = load('room_static')
rr, ra = downscale(room, SS)
# the room keeps its own richer palette
rq = quantize([rr], [ra], 96)[0]
room_img = finish(*rq)
Image.fromarray(room_img).save(OUT + '/room_iso.png')
Image.fromarray(room_img).convert('RGB').save(OUT + '/room_iso.webp', 'WEBP', quality=92, method=6)
RM = meta['room']
room_meta = {'w': room_img.shape[1], 'h': room_img.shape[0], 'minX': RM['minX'] / SS, 'minY': RM['minY'] / SS}
prop_meta = {}
for pid, pm in meta['props'].items():
    r, a = downscale(load('prop_' + pid), SS)
    q = quantize([r], [a], 40)[0]
    img = finish(*q)
    a2 = img[..., 3] > 0
    ys, xs = np.where(a2)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    img = img[y0:y1, x0:x1]
    tiles.append(('prop_' + pid, img, {'who': 'prop'}))
    prop_meta[pid] = {'x': pm['x'], 'z': pm['z'], 'fw': pm['fw'], 'fd': pm['fd'], 'sx': int(x0), 'sy': int(y0)}  # position in room image pixels

# ---------------------------------------------------------------- pack
tiles.sort(key=lambda t: -t[1].shape[0])
AW = 2048
x = y = rowh = 0
placed = []
for name, img, m in tiles:
    h, w = img.shape[:2]
    if x + w + 2 > AW:
        x = 0; y += rowh + 2; rowh = 0
    placed.append((name, img, m, x, y))
    x += w + 2; rowh = max(rowh, h)
AH = 1
while AH < y + rowh + 2:
    AH *= 2
atlas = np.zeros((AH, AW, 4), np.uint8)
frames = {}
for name, img, m, ax, ay in placed:
    h, w = img.shape[:2]
    atlas[ay:ay + h, ax:ax + w] = img
    frames[name] = {'frame': {'x': ax, 'y': ay, 'w': w, 'h': h}, 'rotated': False, 'trimmed': False,
                    'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h}}
Image.fromarray(atlas).save(OUT + '/atlas_iso.png')
json.dump({'frames': frames, 'meta': {'image': 'atlas_iso.webp', 'size': {'w': AW, 'h': AH}, 'scale': '1'}}, open(OUT + '/atlas_iso.json', 'w'))
sprites = {n: m for n, img, m, ax, ay in placed}
json.dump({'sprites': sprites, 'room': room_meta, 'props': prop_meta, 'info': {'PPM': meta['info']['PPM'], 'ELEV': meta['info']['ELEV'], 'ROOM': meta['info']['ROOM']}}, open(OUT + '/iso_meta.json', 'w'))
print('atlas', AW, AH, 'tiles', len(tiles), 'room', room_meta)
