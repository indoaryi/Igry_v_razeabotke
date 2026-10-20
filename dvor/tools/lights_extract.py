import numpy as np, cv2, json
S='/tmp/claude-0/-home-claude/d64d777e-aa5d-5242-83f5-0a77943c5a0e/scratchpad'
img=cv2.imread('src/source.png').astype(np.float32)/255.0
H,W=img.shape[:2]
b,g,r=img[...,0],img[...,1],img[...,2]
lum=0.299*r+0.587*g+0.114*b
warm=(r-b)
E=np.clip((lum-0.26)/0.30,0,1)*np.clip((warm-0.08)/0.20,0,1)
E=np.maximum(E, np.clip((lum-0.70)/0.15,0,1))
def polymask(pts):
    m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],255); return m
facade=polymask([(0,0),(600,0),(600,262),(430,262),(330,288),(100,330),(0,350)])|\
       polymask([(1020,0),(1672,0),(1672,452),(1605,445),(1600,240),(1360,240),(1360,300),(1290,382),(1170,330),(1020,290)])
m=((E>0.14)&(facade>0)).astype(np.uint8)
grp=cv2.dilate(m,np.ones((5,5),np.uint8))
n,lab,st,cen=cv2.connectedComponentsWithStats(grp)
keep=[]
for i in range(1,n):
    x,y,w,h,a=st[i]
    core=(lab==i)&(m>0)
    ca=core.sum()
    if ca<22: continue
    meanE=E[core].mean()
    fill=ca/(w*h)
    if meanE<0.22 or fill<0.12 or w>70 or h>80: continue
    keep.append([int(x),int(y),int(w),int(h),int(ca),float(meanE)])
print('groups',n-1,'kept',len(keep))
vis=(img*255*0.3).astype(np.uint8)
rng=np.random.default_rng(2)
for (x,y,w,h,a,e) in keep:
    c=rng.integers(80,255,3).tolist()
    sub=(lab[y:y+h,x:x+w]>0)&(m[y:y+h,x:x+w]>0)
    vis[y:y+h,x:x+w][sub]=c
    cv2.rectangle(vis,(x,y),(x+w-1,y+h-1),(255,255,255),1)
cv2.imwrite(S+'/win_comp2.png',vis)
json.dump(keep,open(S+'/windows.json','w'))
