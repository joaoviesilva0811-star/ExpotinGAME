"""Locate transparent gutters; save source coordinates without editing any image.
Optional developer helper: Pillow and numpy. The game uses only the saved JSON.
"""
from pathlib import Path
from PIL import Image
import numpy as np
import json
root=Path(__file__).resolve().parent.parent/'public/assets'
names=['redEruption','rootEruption','crystalEruption','steelSweep','stoneWave','poisonCloud','voidSweep','voidRift','ironChains']
def seam(occupied,index,count):
 size=len(occupied);target=size*index/count;radius=size/count*.23;lo=int(target-radius);hi=int(target+radius)
 groups=[];start=None
 for i in range(lo,hi+1):
  if not occupied[i] and start is None:start=i
  if (occupied[i] or i==hi) and start is not None:
   end=i if occupied[i] else i+1;groups.append((start,end));start=None
 if not groups:raise ValueError('No transparent gutter near '+str(target))
 a,b=max(groups,key=lambda p:p[1]-p[0]);return (a+b)//2
result={}
for name in names:
 image=Image.open(root/f'fx-{name}.png');mask=np.array(image)[:,:,3]>16
 xs=[0,seam(mask.any(axis=0),1,2),image.width];ys=[0,seam(mask.any(axis=1),1,3),seam(mask.any(axis=1),2,3),image.height]
 frames=[]
 for i in range(6):
  x0,x1=xs[i%2:i%2+2];y0,y1=ys[i//2:i//2+2];cut=mask[y0:y1,x0:x1]
  assert cut.any() and not (cut[:3].any() or cut[-3:].any() or cut[:,:3].any() or cut[:,-3:].any()),(name,i)
  frames.append([x0,y0,x1-x0,y1-y0])
 result[name]={'file':f'fx-{name}.png','frames':frames};print(name,'gutters',xs[1:-1],ys[1:-1])
(root/'effect-frames.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
