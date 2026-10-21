#!/usr/bin/env python3
"""Read the original RGBA atlas and write frame registration; never edits PNGs."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent.parent
image=Image.open(root/'public/assets/arena-covers.png').convert('RGBA')
alpha=image.getchannel('A');frames=[]
for row,(top,height) in enumerate([(0,600),(600,424)]):
 for col in range(3):
  left=col*512;cell=alpha.crop((left,top,left+512,top+height));bbox=cell.point(lambda v:255 if v>=160 else 0).getbbox()
  assert bbox and bbox[0]>0 and bbox[1]>0 and bbox[2]<512 and bbox[3]<height
  x1,y1,x2,y2=bbox
  # Preserve all fringe detail with transparent padding inside its source cell.
  x1=max(0,x1-8);y1=max(0,y1-8);x2=min(512,x2+8);y2=min(height,y2+8)
  frames.append({'round':col,'broken':bool(row),'rect':[left+x1,top+y1,x2-x1,y2-y1], 'size':([60,109],[90,106],[70,116])[col] if row==0 else ([87,64],[91,62],[85,70])[col]})
(root/'public/assets/cover-frames.json').write_text(json.dumps({'file':'arena-covers.png','frames':frames},indent=2)+'\n')
print('6 complete cover/rubble sprites registered; source PNG unchanged')
