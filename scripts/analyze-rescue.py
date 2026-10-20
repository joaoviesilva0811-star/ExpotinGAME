"""Inspect original rescue atlases; save crop/anchor metadata without editing PNGs."""
from pathlib import Path
from PIL import Image
import numpy as np,json
from scipy.ndimage import distance_transform_edt,watershed_ift,binary_dilation
root=Path(__file__).resolve().parent.parent/'public/assets';result={}
for actor in ['knight','archer','rogue']:
 file=root/f'rescue-{actor}.png';rgba=np.array(Image.open(file).convert('RGBA'));alpha=rgba[:,:,3];mask=alpha>90;h,w=alpha.shape;cw,rh=w/8,h/8
 dist=distance_transform_edt(mask);markers=np.zeros(mask.shape,np.int32);markers[~mask]=-1
 for row in range(8):
  for col in range(8):
   x0,x1=int((col+.12)*cw),int((col+.88)*cw);y0,y1=int((row+.12)*rh),int((row+.94)*rh)
   iy,ix=np.unravel_index(dist[y0:y1,x0:x1].argmax(),(y1-y0,x1-x0));markers[y0+iy,x0+ix]=row*8+col+1
 owners=watershed_ift(np.asarray(254-np.minimum(dist/32,1)*254,np.uint8),markers);frames=[];heights=[]
 for i in range(64):
  body=binary_dilation(owners==i+1,iterations=2)&(alpha>12);yy,xx=np.where(body)
  if len(xx)<300:raise ValueError(f'{actor}: empty sprite {i}')
  left,right,top,bottom=int(xx.min()),int(xx.max())+1,int(yy.min()),int(yy.max())+1
  # Keep bent knees and lying bodies visibly lower. The shared atlas scale is
  # estimated from standing final frames, never normalized per crouching frame.
  row,col=divmod(i,8);ys=np.where(body.sum(axis=1)>cw*.12)[0];ys=ys[(ys>=row*rh)&(ys<(row+1)*rh)]
  foot=int(ys.max()) if len(ys) else bottom-1;ly,lx=np.where(body[max(top,foot-12):foot+1]);pivot=float(np.median(lx)) if len(lx) else (left+right)/2
  spans=[]
  for y in range(top,bottom):
   xs=np.where(body[y])[0]
   if len(xs):spans.append([y,int(xs.min()),int(xs.max())+1])
  frames.append({'rect':[left,top,right-left,bottom-top],'pivot':[round(pivot,2),foot],'spans':spans,'sourceEdge':left<2 or top<2 or right>w-2 or bottom>h-2})
  if col==7:heights.append(foot-top)
 result[actor]={'file':file.name,'cols':8,'rows':8,'nominal':[100,92],'scale':67/float(np.median(heights)),'frames':frames}
 print(actor,'64 drawn poses; edge contacts',[(i//8,i%8) for i,f in enumerate(frames) if f['sourceEdge']])
(root/'rescue-frames.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
