"""Inspect new animation silhouettes. Preserve all source PNG bytes.
Rows/columns come from actual connected bodies, not the requested grid: some
original sheets contain more poses per row than requested.
"""
from pathlib import Path
from PIL import Image
import numpy as np,json
from scipy.ndimage import label,find_objects,binary_dilation
root=Path(__file__).resolve().parent.parent/'public/assets';result={}
for file in sorted([*root.glob('express-*.png'),*root.glob('cinema-*.png'),*root.glob('gait-*.png')]):
 rgba=np.array(Image.open(file).convert('RGBA'));alpha=rgba[:,:,3];h,w=alpha.shape;labels,n=label(alpha>90);components=[]
 for i,box in enumerate(find_objects(labels)):
  if (labels[box]==i+1).sum()>700 and box[0].stop-box[0].start>40:components.append((i+1,box))
 rows=[];limit=45 if file.stem.startswith(('express-','gait-')) else 85
 for item in sorted(components,key=lambda a:a[1][0].stop):
  y=item[1][0].stop
  if not rows or abs(y-float(np.median([b[1][0].stop for b in rows[-1]])))>limit:rows.append([])
  rows[-1].append(item)
 frames=[];indices=[];heights=[]
 for row in rows:
  row.sort(key=lambda a:a[1][1].start);ids=[]
  for number,box in row:
   body=binary_dilation(labels==number,iterations=2)&(alpha>12);yy,xx=np.where(body);l,r,t,b=int(xx.min()),int(xx.max())+1,int(yy.min()),int(yy.max())+1
   dense=body.sum(axis=1)>max(10,(r-l)*.14);ys=np.where(dense)[0];foot=int(ys.max()) if len(ys) else b-1
   _,lx=np.where(body[max(t,foot-12):foot+1]);px=float(np.median(lx)) if len(lx) else (l+r)/2
   spans=[]
   for y in range(t,b):
    xs=np.where(body[y])[0]
    if len(xs):spans.append([y,int(xs.min()),int(xs.max())+1])
   edge=l<2 or t<2 or r>w-2 or b>h-2
   ids.append(len(frames));frames.append({'rect':[l,t,r-l,b-t],'pivot':[round(px,2),foot],'spans':spans,'sourceEdge':edge});heights.append(foot-t)
  indices.append(ids)
 name=file.stem;hero=name.startswith('express-');groups={}
 if hero:
  if len(rows)==7:parts=[[0,1],[2,3],[4],[5,6]]
  elif len(rows)==8:parts=[[0,1],[2,3],[4,5],[6,7]]
  else:raise ValueError(f'Inspect emote rows: {name}: {len(rows)}')
  for action,part in zip(['step','cross','spin','victory'],parts):groups[action]=[i for rr in part for i in indices[rr] if not frames[i]['sourceEdge']]
 elif name.startswith('gait-'):
  assert len(rows)==8,(name,len(rows))
  for action,part in zip(['south','east','north','west'],[[0,1],[2,3],[4,5],[6,7]]):groups[action]=[i for rr in part for i in indices[rr] if not frames[i]['sourceEdge']]
 else:
  assert len(rows)==4,(name,len(rows));groups={'idle':indices[0],'wake':indices[1]+indices[2],'rage':indices[3]}
  groups={k:[i for i in v if not frames[i]['sourceEdge']] for k,v in groups.items()}
 assert all(len(v)>=6 for v in groups.values()),(name,{k:len(v) for k,v in groups.items()})
 base=[heights[i] for i in groups.get('idle',range(len(frames)))];median=float(np.median(base));scale=(67 if hero else 150)/median
 if hero:
  for v in groups.values():
   groupheight=float(np.median([heights[i] for i in v]));factor=median/groupheight
   if abs(factor-1)>.15:
    for i in v:frames[i]['scale']=factor
 result[name]={'file':file.name,'rows':len(rows),'cols':max(map(len,indices)),'frames':frames,'groups':groups,'nominal':[100,92] if hero else [210,210],'scale':scale}
 print(name,'row counts',list(map(len,indices)),'groups',{k:len(v) for k,v in groups.items()},'edge',[i for i,f in enumerate(frames) if f['sourceEdge']])
(root/'motion-frames.json').write_text(json.dumps(result,separators=(',',':'))+'\n');print('TOTAL',sum(len(s['frames']) for s in result.values()))
