import sys, json
sys.path.insert(0,'/home/claude/dvor/tools')
from PIL import Image, ImageDraw
import numpy as np
import world_def as wd

def walk_mask(cell=1):
    m=Image.new('L',(wd.W,wd.H),0); d=ImageDraw.Draw(m)
    for k,p in wd.WALK.items(): d.polygon(p,fill=255)
    for k,p in wd.BLOCK.items(): d.polygon(p,fill=0)
    for k,f in wd.FENCES.items(): d.line(f["pts"],fill=0,width=7)
    return m

if __name__=='__main__':
    out=sys.argv[1]; x0,y0,x1,y1,sc=[int(v) for v in sys.argv[2:7]] if len(sys.argv)>6 else (0,0,wd.W,wd.H,1)
    src=Image.open('/home/claude/dvor/src/source.png').convert('RGBA')
    m=walk_mask()
    ov=Image.new('RGBA',src.size,(0,0,0,0)); d=ImageDraw.Draw(ov)
    green=Image.new('RGBA',src.size,(40,255,90,90)); ov.paste(green,(0,0),m)
    sand=Image.new('L',src.size,0); ImageDraw.Draw(sand).polygon(wd.WALK['sand'],fill=255)
    sm=Image.fromarray((np.array(sand)//255*np.array(m)).astype('uint8'))
    ov.paste(Image.new('RGBA',src.size,(255,200,40,90)),(0,0),sm)
    for k,p in wd.BLOCK.items(): d.polygon(p,outline=(255,40,40,255))
    for k,f in wd.FENCES.items(): d.line(f["pts"],fill=(255,255,0,255),width=2)
    for k,p in wd.WALK.items(): d.line(p+[p[0]],fill=(0,255,255,160),width=1)
    im=Image.alpha_composite(src,ov).crop((x0,y0,x1,y1))
    if sc!=1: im=im.resize(((x1-x0)*sc,(y1-y0)*sc),Image.NEAREST)
    im.convert('RGB').save(out)
