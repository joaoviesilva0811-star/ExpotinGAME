"""Read portrait silhouettes and store complete registered contours; no PNG edits."""
from pathlib import Path
import json, numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects, binary_dilation
root=Path(__file__).resolve().parent.parent/'public/assets'
a=np.array(Image.open(root/'cast-portraits.png').convert('RGBA'))[:,:,3]
ls,n=label(a>90);bodies=[]
for i,b in enumerate(find_objects(ls)):
 if (ls[b]==i+1).sum()>5000:bodies.append((i+1,b))
assert len(bodies)==6,len(bodies)
bodies=sorted(bodies,key=lambda p:p[1][0].start);ordered=[]
for row in [bodies[:3],bodies[3:]]:ordered+=sorted(row,key=lambda p:p[1][1].start)
result={}
for name,(number,box) in zip(['knight','archer','rogue','varkhul','tharazul','azrakiel'],ordered):
 mask=binary_dilation(ls==number,iterations=2)&(a>12);y,x=np.where(mask);l,r,t,b=int(x.min()),int(x.max())+1,int(y.min()),int(y.max())+1
 spans=[]
 for yy in range(t,b):
  xx=np.where(mask[yy])[0]
  if len(xx):spans.append([yy,int(xx.min()),int(xx.max())+1])
 assert l>1 and t>1 and r<a.shape[1]-1 and b<a.shape[0]-1
 result[name]={'rect':[l,t,r-l,b-t],'spans':spans}
(root/'portrait-frames.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print('Six complete portrait silhouettes, no source edge clipping.')
