"""Analyze silhouettes only. PNG originals are never modified.
Split touching glow/trails at their narrow saddle, retain complete silhouettes,
register body/feet (not a raised sword), and record contours for runtime crops.
"""
from pathlib import Path
from PIL import Image
import numpy as np,json,sys
from collections import Counter
from scipy.ndimage import label,find_objects,distance_transform_edt,watershed_ift,binary_dilation
root=Path(__file__).resolve().parent.parent/'public/assets'
layouts=json.loads((root/'strike-layouts.json').read_text());result=json.loads((root/'strike-frames.json').read_text()) if '--walk-only' in sys.argv else {}; bosses=['varkhul','tharazul','azrakiel']
for file in sorted(root.glob('strike-*.png')):
 if '--walk-only' in sys.argv and not file.stem.endswith('-walk'):continue
 rgba=np.array(Image.open(file).convert('RGBA'));alpha=rgba[:,:,3];mask=alpha>100;h,w=alpha.shape;rh=h/8
 labels,n=label(mask);counts=[0]*8
 for k,box in enumerate(find_objects(labels)):
  area=(labels[box]==k+1).sum()
  if area>1000 and box[0].stop-box[0].start>rh*.4:
   row=min(7,int((box[0].start+box[0].stop)/2/rh));counts[row]+=1
 cols=Counter(c for c in counts if 5<=c<=8).most_common(1)[0][0]
 # Use the clearest direction rather than a row where effects connect bodies.
 if max(counts)<=8:cols=max(counts)
 cols=layouts[file.stem.removeprefix('strike-')]
 cw=w/cols;dist=distance_transform_edt(mask);markers=np.zeros(mask.shape,np.int32);seeds=[]
 for row in range(8):
  for col in range(cols):
   y0,y1=int((row+.2)*rh),min(h,int((row+.86)*rh));x0,x1=int((col+.15)*cw),min(w,int((col+.85)*cw))
   local=dist[y0:y1,x0:x1];iy,ix=np.unravel_index(local.argmax(),local.shape);y,x=y0+iy,x0+ix;index=len(seeds)+1;markers[y,x]=index;seeds.append((x,y))
 topo=np.asarray(254-np.minimum(dist/32,1)*254,np.uint8);markers[~mask]=-1;owners=watershed_ift(topo,markers)
 frames=[];heights=[];warnings=[];value=rgba[:,:,:3].max(axis=2)
 for i,(seedx,seedy) in enumerate(seeds):
  row,col=divmod(i,cols);body=owners==i+1
  if body.sum()<500:raise ValueError(f'{file.name} empty cell {row}/{col}')
  body=binary_dilation(body,iterations=2)&(alpha>12)
  yy,xx=np.where(body);left,right=int(xx.min()),int(xx.max())+1;top,bottom=int(yy.min()),int(yy.max())+1
  # Body pivot from dense scanlines, avoiding sword tips and detached projectiles.
  core=body&(value<225);roi=core[:,max(0,int(col*cw)):min(w,int((col+1)*cw))];dense=roi.sum(axis=1)>cw*.14;ys=np.where(dense)[0];ys=ys[(ys>=row*rh)&(ys<(row+1)*rh)]
  yfoot=int(ys.max()) if len(ys) else bottom-1;ytop=int(ys.min()) if len(ys) else top
  low=core[max(top,yfoot-int(rh*.16)):yfoot+1];ly,lx=np.where(low);xfoot=float(np.median(lx)) if len(lx) else (left+right)/2
  spans=[]
  for y in range(top,bottom):
   xs=np.where(body[y])[0]
   if len(xs):spans.append([y,int(xs.min()),int(xs.max())+1])
  edge=left<2 or top<2 or right>w-2 or bottom>h-2
  if edge:warnings.append([row,col])
  frames.append({'rect':[left,top,right-left,bottom-top],'pivot':[round(xfoot,2),yfoot],'spans':spans,'sourceEdge':edge});heights.append(yfoot-ytop)
 actor=file.stem.split('-')[1];target=150 if actor in bosses else 67
 # A few drawn archer reload poses have a smaller entire body, rather than
 # merely bent knees. Normalize those outliers at runtime around the same feet.
 median=float(np.median(heights))
 if actor=='archer':
  for frame,height in zip(frames,heights):
   if height<median*.7:frame['scale']=min(1.7,median*.85/max(1,height))
 result[file.stem.removeprefix('strike-')]={'file':file.name,'cols':cols,'rows':8,'frames':frames,'scale':target/float(np.median(heights)),'nominal':[210,210] if actor in bosses else [100,92],'valid':[[i for i in range(row*cols,(row+1)*cols) if not frames[i]['sourceEdge']] for row in range(8)],'mirrorEast':actor in ['knight','archer']}
 print(file.stem,cols*8,'poses','edge:',warnings)
(root/'strike-frames.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print('TOTAL',sum(len(s['frames']) for s in result.values()),'DRAWN POSES IN',len(result),'ATLASES')
