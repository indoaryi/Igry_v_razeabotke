import numpy as np, cv2
img=cv2.imread('src/source.png').astype(np.float32)/255.0
b,g,r=img[...,0],img[...,1],img[...,2]
lum=0.299*r+0.587*g+0.114*b
warm=(r-b)
# emissive score: bright + warm, or very bright (white letters)
E=np.clip((lum-0.38)/0.30,0,1)*np.clip((warm-0.10)/0.20,0,1)
E=np.maximum(E, np.clip((lum-0.72)/0.15,0,1))
m=(E>0.15).astype(np.uint8)*255
vis=(img*255).astype(np.uint8).copy()
vis=(vis*0.35).astype(np.uint8)
vis[m>0]=(np.stack([b,g,r],-1)[m>0]*255).astype(np.uint8)
cv2.imwrite('/tmp/claude-0/-home-claude/d64d777e-aa5d-5242-83f5-0a77943c5a0e/scratchpad/lights.png',vis)
np.save('/tmp/claude-0/-home-claude/d64d777e-aa5d-5242-83f5-0a77943c5a0e/scratchpad/E.npy',E)
print(m.sum()/255)
