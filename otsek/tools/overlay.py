import json, sys
from PIL import Image, ImageDraw
w=json.load(open('/home/claude/otsek/build/world.json'))
src=Image.open('/home/claude/otsek/src/room.png').convert('RGBA')
ov=Image.new('RGBA',src.size,(0,0,0,0)); d=ImageDraw.Draw(ov)
d.polygon([tuple(p) for p in w['floor']],fill=(40,255,90,70),outline=(0,255,120,255))
for k,o in w['obstacles'].items():
    if 'rect' in o: d.rectangle(o['rect'],fill=(255,40,40,110),outline=(255,0,0,255))
    else:
        cx,cy,rx,ry=o['ellipse']; d.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=(255,40,40,110),outline=(255,0,0,255))
for k,p in w['place'].items():
    d.ellipse([p[0]-4,p[1]-4,p[0]+4,p[1]+4],fill=(255,255,0,255)); d.text((p[0]+6,p[1]-6),k,fill=(255,255,0,255))
out=Image.alpha_composite(src,ov)
if len(sys.argv)>2:
    x0,y0,x1,y1,s=map(int,sys.argv[2:7]); out=out.crop((x0,y0,x1,y1)).resize(((x1-x0)*s,(y1-y0)*s),Image.NEAREST)
out.convert('RGB').save(sys.argv[1])
