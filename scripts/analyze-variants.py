"""Inspect complete source cells, rejecting clipped silhouettes. PNGs unchanged."""
from pathlib import Path
from PIL import Image
import numpy as np,json
from scipy.ndimage import label,find_objects
root=Path(__file__).resolve().parent.parent/'public/assets';out={};report={}
for pack,names in {'forge':['cleave','spikes','chains','lance'],'grove':['roots','spores','seed','leaf'],'eclipse':['crescents','rift','lance','nova']}.items():
 file='variants-'+pack+'.png';a=np.array(Image.open(root/file).convert('RGBA'))[:,:,3];h,w=a.shape;info=[]
 labels,n=label(a>80);boxes=[]
 for k,box in enumerate(find_objects(labels)):
  if (labels[box]==k+1).sum()>1500 and box[1].stop-box[1].start>30:boxes.append(box)
 rows=[]
 for box in sorted(boxes,key=lambda b:b[0].stop):
  if not rows or abs(box[0].stop-np.median([b[0].stop for b in rows[-1]]))>60:rows.append([])
  rows[-1].append(box)
 assert len(rows)==4,(pack,[(len(r),np.median([b[0].stop for b in r])) for r in rows])
 cuts=[0]+[round((max(b[0].stop for b in rows[i])+min(b[0].start for b in rows[i+1]))/2) for i in range(3)]+[h]
 for row,name in enumerate(names):
  frames=[];rejected=[]
  projection=(a[cuts[row]:cuts[row+1]]>80).sum(axis=0);xcuts=[0]
  for boundary in range(1,8):
   start=int((boundary-.43)*w/8);end=int((boundary+.43)*w/8);part=projection[start:end];low=np.where(part<=part.min()+1)[0];runs=np.split(low,np.where(np.diff(low)>1)[0]+1);chosen=min(runs,key=lambda r:abs((start+float(np.mean(r)))-boundary*w/8));xcuts.append(start+int(np.median(chosen)))
  xcuts.append(w)
  for col in range(8):
   x0,x1=xcuts[col],xcuts[col+1];y0,y1=cuts[row],cuts[row+1];cell=a[y0:y1,x0:x1];strong=cell>110
   edge=max(strong[:2].sum(),strong[-2:].sum(),strong[:,:2].sum(),strong[:,-2:].sum())
   if edge>4:rejected.append(col);continue
   frames.append([x0,y0,x1-x0,y1-y0])
  if len(frames)<3:raise ValueError((pack,name,'too many clipped source cells',rejected))
  key=pack+'-'+name;out[key]={'file':file,'frames':frames};info.append({'model':key,'usable':len(frames),'rejected':rejected})
 report[pack]=info
(root/'variant-frames.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(json.dumps(report));print('usable new effects',sum(len(v['frames']) for v in out.values()))
