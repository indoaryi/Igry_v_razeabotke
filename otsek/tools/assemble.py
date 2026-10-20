"""Assemble the artifact page (dist/index.html) and a standalone copy for the repository (dist/repo/index.html)."""
import os, shutil, json
D = '/home/claude/otsek'
from PIL import Image
Image.open(f'{D}/build/atlas.png').save(f'{D}/build/atlas.webp', 'WEBP', quality=92, alpha_quality=100, method=6)
Image.open(f'{D}/src/room.png').convert('RGB').save(f'{D}/build/room.webp', 'WEBP', quality=93, method=6)
page = open(f'{D}/src/page.html').read()
parts = json.load(open(f'{D}/build/parts.json'))
atlas = json.load(open(f'{D}/build/atlas.json'))
world = json.load(open(f'{D}/build/world.json'))
fx = json.load(open(f'{D}/build/roomfx_raw.json'))
page = page.replace('/*PARTS*/', json.dumps(parts, separators=(',', ':')))
page = page.replace('/*ATLAS*/', json.dumps(atlas, separators=(',', ':')))
page = page.replace('/*WORLD*/', json.dumps(world, separators=(',', ':')))
page = page.replace('/*ROOMFX*/', json.dumps(fx, separators=(',', ':')))
page = page.replace('/*GAME*/', open(f'{D}/src/game.js').read())
os.makedirs(f'{D}/dist/repo', exist_ok=True)
open(f'{D}/dist/index.html', 'w').write(page)
for f in ['room.webp', 'atlas.webp']:
    shutil.copy(f'{D}/build/{f}', f'{D}/dist/{f}')
    shutil.copy(f'{D}/build/{f}', f'{D}/dist/repo/{f}')
head = '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
end = page.index('</style>') + len('</style>')
open(f'{D}/dist/repo/index.html', 'w').write(head + page[:end] + '\n</head>\n<body>\n' + page[end:] + '\n</body>\n</html>\n')
print('page bytes', len(page))
