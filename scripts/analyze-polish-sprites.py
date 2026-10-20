"""Read alpha silhouettes and write coordinates only; original PNGs are unchanged."""
from pathlib import Path
from PIL import Image
import numpy as np,json
from scipy.ndimage import label,find_objects,binary_dilation
root=Path(__file__).resolve().parent.parent/'public/assets'
bosses=['varkhul','tharazul','azrakiel'];actors=['knight','archer','rogue']+bosses+['revenant','thornling','acolyte']
def boundaries(mask,axis,count):
 occupied=mask.any(axis=axis);size=len(occupied);out=[0]
 for i in range(1,count):
  target=size*i/count;lo=max(0,int(target-size/count*.22));hi=min(size,int(target+size/count*.22));groups=[];start=None
  for at in range(lo,hi):
   if not occupied[at] and start is None:start=at
   if (occupied[at] or at==hi-1) and start is not None:
    end=at if occupied[at] else at+1;groups.append((start,end));start=None
  if groups:
   a,b=max(groups,key=lambda p:p[1]-p[0]);out.append((a+b)//2)
  else:
   # Reject actual overlapping bodies instead of silently cropping them.
   at=lo+int(np.argmin(occupied[lo:hi]));raise ValueError(f'No clear gutter at {i}/{count}, near {target}')
 return out+[size]
def analyze(kind,name,cols,rows,height):
 file=f'{kind}-{name}.png';image=Image.open(root/file);a=np.array(image)[:,:,3];mask=a>65
 if kind=='walk' and name=='varkhul-east':
  # A few capes overlap neighboring rectangular bounds. Store contour spans
  # for each complete connected silhouette instead of cutting either weapon.
  labels,count=label(mask);parts=[]
  for index,box in enumerate(find_objects(labels)):
   if (labels[box]==index+1).sum()>1500:parts.append((index+1,box))
  assert len(parts)==12
  parts.sort(key=lambda p:(p[1][0].start//300,p[1][1].start))
  frames=[];spans=[]
  for k,box in parts:
   silhouette=binary_dilation(labels==k,iterations=2);yy,xx=np.where(silhouette);x0,x1=int(xx.min()),int(xx.max())+1;y0,y1=int(yy.min()),int(yy.max())+1
   frames.append([x0,y0,x1-x0,y1-y0,(len(frames)%3+.5)*image.width/3]);lines=[]
   for y in range(y0,y1):
    hits=np.where(silhouette[y])[0]
    if len(hits):lines.append([y,int(hits.min()),int(hits.max())+1])
   spans.append(lines)
  print(kind,name,len(frames),'poses (complete contour extraction)')
  return {'file':file,'frames':frames,'spans':spans,'scale':height/float(np.median([f[3] for f in frames])),'nominal':[210,210]}
 if kind=='hurt' and name=='varkhul':
  occupied=mask.any(axis=1);gaps=[];start=None
  for at,value in enumerate(occupied):
   if not value and start is None:start=at
   if value and start is not None:
    if start>0:gaps.append((start+at)//2)
    start=None
  assert len(gaps)==rows-1
  ys=[0]+gaps+[image.height]
 else:ys=boundaries(mask,1,rows)
 frames=[]
 for row in range(rows):
  xs=boundaries(mask[ys[row]:ys[row+1]],0,cols)
  for col in range(cols):
   x0,x1=xs[col:col+2];y0,y1=ys[row:row+2];yy,xx=np.where(mask[y0:y1,x0:x1]);left=x0+int(xx.min());right=x0+int(xx.max())+1;top=y0+int(yy.min());bottom=y0+int(yy.max())+1
   # Include detached lower-alpha pixels, without importing the next pose.
   crop=a[y0:y1,x0:x1]>16;yy2,xx2=np.where(crop)
   left=min(left,x0+int(xx2.min()));right=max(right,x0+int(xx2.max())+1);top=min(top,y0+int(yy2.min()));bottom=max(bottom,y0+int(yy2.max())+1)
   frames.append([left,top,right-left,bottom-top,(left+right)/2 if kind=='hurt' and name=='varkhul' else (col+.5)*image.width/cols])
 scale=height/float(np.median([f[3] for f in frames]));print(kind,name,len(frames),'poses')
 return{'file':file,'frames':frames,'scale':scale,'nominal':[210,210] if height==165 else [100,92]}
walk={};hurt={}
for boss in bosses:
 for direction in ['south','north','east']:
  name=boss+'-'+direction
  try:walk[name]=analyze('walk',name,3,4,165)
  except Exception as e:print('ERROR',name,e)
for name in actors:
 try:hurt[name]=analyze('hurt',name,2 if name=='varkhul' else 4,8 if name=='varkhul' else 4,165 if name in bosses else 68)
 except Exception as e:print('ERROR',name,e)
assert len(walk)==9 and sum(len(x['frames']) for x in walk.values())==108
assert len(hurt)==9 and sum(len(x['frames']) for x in hurt.values())==144
hurt['knight']['flipRows']=[1]
hurt['archer']['flipRows']=[1]
(root/'boss-walk-frames.json').write_text(json.dumps(walk,separators=(',',':'))+'\n')
(root/'hurt-frames.json').write_text(json.dumps(hurt,separators=(',',':'))+'\n')
print('TOTAL',sum(len(x['frames']) for x in walk.values()),sum(len(x['frames']) for x in hurt.values()))
