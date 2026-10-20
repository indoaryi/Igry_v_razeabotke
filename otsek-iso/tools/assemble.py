"""Assemble dist/index.html (artifact) and dist/repo/index.html (standalone)."""
import os, shutil, json
from PIL import Image
D = '/home/claude/iso'
Image.open(f'{D}/build/atlas_iso.png').save(f'{D}/build/atlas_iso.webp', 'WEBP', lossless=True, method=6)
page = open(f'{D}/src/page.html').read()
page = page.replace('/*META*/', json.dumps(json.load(open(f'{D}/build/iso_meta.json')), separators=(',', ':')))
page = page.replace('/*ATLAS*/', json.dumps(json.load(open(f'{D}/build/atlas_iso.json')), separators=(',', ':')))
page = page.replace('/*PORTRAIT*/', open(f'{D}/build/portrait.b64').read())
page = page.replace('/*GAME*/', open(f'{D}/src/game.js').read())
os.makedirs(f'{D}/dist/repo', exist_ok=True)
open(f'{D}/dist/index.html', 'w').write(page)
for f in ['room_iso.webp', 'atlas_iso.webp']:
    shutil.copy(f'{D}/build/{f}', f'{D}/dist/{f}'); shutil.copy(f'{D}/build/{f}', f'{D}/dist/repo/{f}')
head = '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
end = page.index('</style>') + len('</style>')
open(f'{D}/dist/repo/index.html', 'w').write(head + page[:end] + '\n</head>\n<body>\n' + page[end:] + '\n</body>\n</html>\n')
print('page bytes', len(page))
