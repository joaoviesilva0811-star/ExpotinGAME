"""Read source alpha silhouettes and save frame coordinates; source art is unchanged.
Optional developer helper: Pillow, numpy and scipy. Runtime uses the saved JSON.
"""
from PIL import Image
import numpy as np
from scipy import ndimage
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent/'public/assets'
heroes=['knight','archer','rogue'];bosses=['varkhul','tharazul','azrakiel'];minions=['revenant','thornling','acolyte']
specs=[(n,6,'animation') for n in heroes+bosses]+[('minions',3,'animation')]+[(n,4,'emote') for n in heroes]
specs += [(n,8,'direction') for n in heroes+bosses+minions if (root/f'direction-{n}.png').exists()]
result={}
for name,rows,kind in specs:
 if name=='acolyte':rows=7
 image=Image.open(root/f'{kind}-{name}.png');rgba=np.array(image);alpha=rgba[:,:,3];height,width=alpha.shape;cw=width/6;ch=height/rows
 mask=alpha>65
 if name in heroes and kind!='direction':mask=ndimage.binary_dilation(mask,iterations=2)
 labels,count=ndimage.label(mask);objects=ndimage.find_objects(labels)
 selected=[]
 for row in range(rows):
  line=[]
  for col in range(6):
   xc=(col+.5)*cw;yc=(row+.5)*ch
   neighborhood=labels[max(0,int(yc-ch*.3)):min(height,int(yc+ch*.3)),max(0,int(xc-cw*.3)):min(width,int(xc+cw*.3))]
   counts=np.bincount(neighborhood.ravel(),minlength=count+1);counts[0]=0;label=int(np.argmax(counts));line.append(label)
  selected.append(line)
 ordered=[]
 for row in range(rows):
  line=[]
  for col in range(6):
   label=selected[row][col];y,x=objects[label-1];x0,x1,y0,y1=x.start,x.stop,y.start,y.stop
   # Rare touching effects can join two adjacent sprites. Clip that component
   # to its own grid cell rather than importing a neighboring body.
   if sum(line.count(label) for line in selected)>1 or x1-x0>cw*1.4 or y1-y0>ch*1.45:
    x0=max(x0,int(col*cw));x1=min(x1,int((col+1)*cw));y0=max(y0,int(row*ch));y1=min(y1,int((row+1)*ch))
   line.append([x0,y0,x1-x0,y1-y0])
  ordered.append(line)
 scale=(165 if name in bosses else 68)/np.median([ordered[0][i][3] for i in [0,5]])
 key=name if kind=='animation' else kind+'-'+name
 heads=[]
 if name in heroes:
  rr,gg,bb=[rgba[:,:,i].astype(float) for i in range(3)]
  if name=='knight':material=(abs(rr-gg)<35)&(abs(gg-bb)<35)&(rr>48)&(gg>48)&(bb>48)
  elif name=='archer':material=(gg>rr*1.12)&(gg>bb*1.12)&(gg>30)
  else:material=(bb>gg*1.18)&(rr>gg*1.05)&(bb>35)
  material&=alpha>100
  for line in ordered:
   head_line=[]
   for x,y,w,h in line:
    cut=material[y:y+int(h*.52),x:x+w].astype(float)
    wh=max(8,int(ch*.16));ww=max(10,int(cw*.2));heat=ndimage.uniform_filter(cut,size=(wh,ww))
    iy,ix=np.unravel_index(np.argmax(heat),heat.shape);head_line.append([float(x+ix),float(y+iy-wh*.38)])
   heads.append(head_line)
 result[key]={'frames':ordered,'heads':heads,'scale':float(scale),'count':rows*6}
 print(key,rows*6,'frames')
result['minions']['frames'][1][3]=[887,315,292,249]
result['minions']['frames'][2][3]=[897,562,273,322]
(root/'animation-frames.json').write_text(json.dumps(result,separators=(',',':')))
