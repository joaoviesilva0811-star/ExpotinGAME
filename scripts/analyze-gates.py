"""Register the six original gate parts, without editing the PNG."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects,binary_dilation
import numpy as np,json
root=Path(__file__).resolve().parent.parent/'public/assets';im=np.array(Image.open(root/'dungeon-gates.png').convert('RGBA'));a=im[:,:,3];labels,n=label(a>160);parts=[]
for i,box in enumerate(find_objects(labels)):
 if np.count_nonzero(labels[box]==i+1)<5000:continue
 body=binary_dilation(labels==i+1,iterations=1)&(a>20);yy,xx=np.where(body);l,t,r,b=int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1
 parts.append({'rect':[l,t,r-l,b-t],'kind':'frame' if l<500 else 'panel','round':min(2,int((t+b)/2/512)),'spans':[[int(y),int(np.where(body[y])[0].min()),int(np.where(body[y])[0].max())+1] for y in range(t,b) if body[y].any()]})
assert len(parts)==6 and len({(p['round'],p['kind']) for p in parts})==6
(root/'gate-frames.json').write_text(json.dumps(parts,separators=(',',':'))+'\n');print('6 complete gate parts registered')
