"""Assemble the artifact page (dist/index.html) and a standalone copy for GitHub Pages (dist/repo/index.html)."""
import os, shutil
D = '/home/claude/dvor'
page = open(f'{D}/src/page.html').read()
page = page.replace('/*WORLD*/', open(f'{D}/build/world.json').read().strip())
page = page.replace('/*LIGHTS*/', open(f'{D}/build/lights.json').read().strip())
page = page.replace('/*SPRITES*/', open(f'{D}/src/sprites.js').read())
page = page.replace('/*GAME*/', open(f'{D}/src/game.js').read())
os.makedirs(f'{D}/dist/repo', exist_ok=True)
open(f'{D}/dist/index.html', 'w').write(page)
for f in ['bg_eve.webp', 'bg_day.webp', 'lights.webp']:
    shutil.copy(f'{D}/build/{f}', f'{D}/dist/{f}')
    shutil.copy(f'{D}/build/{f}', f'{D}/dist/repo/{f}')
head = '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
style_end = page.index('</style>') + len('</style>')
repo = head + page[:style_end] + '\n</head>\n<body>\n' + page[style_end:] + '\n</body>\n</html>\n'
open(f'{D}/dist/repo/index.html', 'w').write(repo)
print('page bytes', len(page))
