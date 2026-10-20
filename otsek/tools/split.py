import numpy as np, cv2, json, sys
from PIL import Image
S='/tmp/claude-0/-home-claude/d64d777e-aa5d-5242-83f5-0a77943c5a0e/scratchpad'
out={}
for name in ['clerk','guard','player','mech','desk']:
    im=np.array(Image.open(f'src/{name}.png').convert('RGBA'))
    a=im[...,3]
    hist=np.bincount(a.ravel(),minlength=256)
    m=(a>40).astype(np.uint8)
    m2=cv2.dilate(m,np.ones((15,15),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m2)
    comps=[(st[i][0],st[i][1],st[i][2],st[i][3],st[i][4]) for i in range(1,n) if st[i][4]>5000]
    comps.sort(key=lambda c:c[0])
    semi=((a>0)&(a<255)).sum()
    print(name, im.shape, 'comps', [(int(x),int(y),int(w),int(h)) for x,y,w,h,_ in comps], 'semi-alpha px', int(semi))
    out[name]=[[int(x),int(y),int(w),int(h)] for x,y,w,h,_ in comps]
json.dump(out,open('build/views.json','w'))
