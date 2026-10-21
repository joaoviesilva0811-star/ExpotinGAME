"""Read complete source silhouettes and register additional walking inbetweens.
No PNG is modified. Comparison features only exist in memory, never as images.
"""
from pathlib import Path
from PIL import Image
import numpy as np,json
from scipy.ndimage import label,find_objects,binary_dilation
from scipy.optimize import linear_sum_assignment
root=Path(__file__).resolve().parent.parent/'public/assets';old=json.loads((root/'strike-frames.json').read_text());out={}
def feature(im,f,sc):
 # Compare premultiplied RGBA at fixed logical foot coordinates. This is only
 # metadata QA; the runtime always draws original pixels from the source PNG.
 rect=f['rect'];px,py=f['pivot'];scale=sc*f.get('scale',1);x=np.arange(-55,56,2);y=np.arange(-85,16,2);xx,yy=np.meshgrid(x,y);sx=np.rint(px+xx/scale).astype(int);sy=np.rint(py+yy/scale).astype(int);ok=(sx>=rect[0])&(sx<rect[0]+rect[2])&(sy>=rect[1])&(sy<rect[1]+rect[3]);v=np.zeros((*sx.shape,4),float);v[ok]=im[sy[ok],sx[ok]]/255;v[:,:,:3]*=v[:,:,3:4];return v.reshape(-1)
for name in ['knight','archer','rogue']:
 im=np.array(Image.open(root/f'stride-{name}.png').convert('RGBA'));alpha=im[:,:,3];labels,n=label(alpha>100);rows=[]
 for i,b in sorted(enumerate(find_objects(labels)),key=lambda v:v[1][0].stop):
  if np.count_nonzero(labels[b]==i+1)<700 or b[0].stop-b[0].start<45:continue
  foot=b[0].stop
  if not rows or abs(foot-float(np.median([x[1][0].stop for x in rows[-1]])))>45:rows.append([])
  rows[-1].append((i+1,b))
 assert len(rows)==8,(name,len(rows))
 frames=[];groups=[];heights=[]
 for row in rows:
  ids=[]
  for number,b in sorted(row,key=lambda a:a[1][1].start):
   body=binary_dilation(labels==number,iterations=1)&(alpha>20);yy,xx=np.where(body);l,t,r,b=int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1;ys=np.where(body.sum(axis=1)>(r-l)*.17)[0];foot=int(ys.max());_,lx=np.where(body[max(t,foot-10):foot+1]);px=float(np.median(lx));edge=l<2 or t<2 or r>im.shape[1]-2 or b>im.shape[0]-2
   ids.append(len(frames));frames.append({'rect':[l,t,r-l,b-t],'pivot':[round(px,2),foot],'spans':[[int(y),int(np.where(body[y])[0].min()),int(np.where(body[y])[0].max())+1]for y in range(t,b)if body[y].any()],'sourceEdge':edge});heights.append(foot-t)
  groups.append(ids)
 sc=67/float(np.median(heights));base=old[name+'-walk'];orig=np.array(Image.open(root/base['file']).convert('RGBA'));basefeatures=[feature(orig,f,base['scale'])for f in base['frames']];newfeatures=[feature(im,f,sc)for f in frames];cycles=[];accepted=0
 for row,ids in enumerate(groups):
  valid=base['valid'][row];seq=[];bridges={}
  costs=np.array([[max(np.mean(abs(basefeatures[a]-newfeatures[b])),np.mean(abs(newfeatures[b]-basefeatures[valid[(i+1)%len(valid)]]))) for b in ids]for i,a in enumerate(valid)])
  ri,ci=linear_sum_assignment(costs)
  for i,j in zip(ri,ci):
   a=valid[i];b=valid[(i+1)%len(valid)];k=ids[j];jump=np.mean(abs(basefeatures[a]-basefeatures[b]));ab=np.mean(abs(basefeatures[a]-newfeatures[k]));bc=np.mean(abs(newfeatures[k]-basefeatures[b]));
   if not frames[k]['sourceEdge'] and max(ab,bc)<jump*.98 and min(ab,bc)>.002:bridges[int(i)]=int(k);accepted+=1
  for i,a in enumerate(valid):
   seq.append({'source':'base','index':int(a),'phase':i/len(valid)})
   if i in bridges:seq.append({'source':'new','index':bridges[i],'phase':(i+.5)/len(valid)})
  cycles.append(seq)
 out[name]={'file':f'stride-{name}.png','frames':frames,'scale':sc,'cycles':cycles,'accepted':accepted,'nominal':[100,92],'mirrorEast':base.get('mirrorEast',False)}
 print(name,'source',len(frames),'accepted inbetweens',accepted,'cycles',[len(x)for x in cycles])
(root/'stride-frames.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
