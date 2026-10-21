"""Register irregular Varkhul sheets by actual body rows; PNG bytes stay intact.
Use metal/body markers (not bright weapon trails), then exact scanline runs so
separate trail fragments cannot fill the intervening neighbouring character.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt,binary_dilation
from skimage.segmentation import watershed
root=Path(__file__).resolve().parent.parent/'public/assets'
path=root/'strike-frames.json';data=json.loads(path.read_text());report=[]
for name,counts in [('varkhul-riposte',[7,7,6,6,6,6,6,6]),('varkhul-chains',[8]*8)]:
 spec=data[name];rgba=np.asarray(Image.open(root/spec['file']).convert('RGBA'));h,w=rgba.shape[:2];rh=h/8;alpha=rgba[:,:,3];rgb=rgba[:,:,:3].astype(float)
 mask=alpha>100;dist=distance_transform_edt(mask);markers=np.zeros(mask.shape,np.int32);seeds=[];source_rows=[]
 for row,cols in enumerate(counts):
  indices=[];cw=w/cols
  for col in range(cols):
   # Armoured torso near the body centre. Excludes saturated red cape/trails.
   x0,x1=round((col+.28)*cw),round((col+.72)*cw);y0,y1=round((row+.25)*rh),round((row+.78)*rh)
   metal=(rgb[y0:y1,x0:x1].max(2)-rgb[y0:y1,x0:x1].min(2)<85)&(alpha[y0:y1,x0:x1]>180)
   if metal.sum()<20:metal=alpha[y0:y1,x0:x1]>180
   yy,xx=np.mgrid[y0:y1,x0:x1];score=dist[y0:y1,x0:x1]*metal-abs(xx-(col+.5)*cw)*.14-abs(yy-(row+.52)*rh)*.04
   iy,ix=np.unravel_index(score.argmax(),score.shape);y,x=y0+iy,x0+ix;idx=len(seeds)+1;markers[y,x]=idx;seeds.append((int(x),int(y)));indices.append(idx)
  source_rows.append(indices)
 owners=watershed(-dist,markers,mask=mask)
 frames=[];heights=[]
 for row,indices in enumerate(source_rows):
  selected=indices if len(indices)==spec['cols'] else [indices[i] for i in [0,1,2,3,4,6]]
  for index in selected:
   body=binary_dilation(owners==index,iterations=2)&(alpha>12)
   yy,xx=np.where(body);left,right=int(xx.min()),int(xx.max())+1;top,bottom=int(yy.min()),int(yy.max())+1
   spans=[]
   for y in range(top,bottom):
    xs=np.flatnonzero(body[y]);runs=np.split(xs,np.flatnonzero(np.diff(xs)>1)+1)
    spans.extend([y,int(run[0]),int(run[-1])+1] for run in runs if len(run))
   seedx,seedy=seeds[index-1];col=indices.index(index);cw=w/counts[row]
   core=body&(rgb.max(2)-rgb.min(2)<100)&(rgb.max(2)<220)
   ys=np.flatnonzero(core[:,max(0,round((col+.15)*cw)):min(w,round((col+.85)*cw))].sum(1)>cw*.10)
   ys=ys[(ys>=row*rh)&(ys<(row+1)*rh)]
   if not len(ys):ys=np.flatnonzero(body.sum(1)>3)
   foot=int(ys.max());head=int(ys.min());low=core[max(head,foot-int(rh*.16)):foot+1];ly,lx=np.where(low);pivot=float(np.median(lx)) if len(lx) else seedx
   frames.append({'rect':[left,top,right-left,bottom-top],'pivot':[round(pivot,2),foot],'spans':spans,'sourceEdge':left<2 or top<2 or right>w-2 or bottom>h-2,'sourceRow':row,'sourceColumn':col,'bodySeed':[seedx,seedy]});heights.append(foot-head)
 spec['frames']=frames;spec['scale']=150/float(np.median(heights));spec['valid']=[list(range(r*spec['cols'],(r+1)*spec['cols'])) for r in range(8)];spec['registration']='body-marker-exact-runs';spec['sourceColumns']=counts;spec['bodyMarkers']=[list(p) for p in seeds]
 failures=[]
 for i,f in enumerate(frames):
  for j,(x,y) in enumerate(seeds):
   if [x,y]==f['bodySeed']:continue
   if any(yy==y and a<=x<b for yy,a,b in f['spans']):failures.append([i,j])
 assert not failures,failures
 report.append({'clip':name,'frames':len(frames),'sourceRows':counts,'foreignBodyMarkers':failures,'maxWidth':max(f['rect'][2] for f in frames)})
path.write_text(json.dumps(data,separators=(',',':'))+'\n');print(json.dumps(report))
