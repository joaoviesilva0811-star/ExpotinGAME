import {KEYS} from './keys.js';
import {clamp} from './shared.js';
import {sceneImage} from './scenes.js';
import {light} from './art.js';
const atlas=new Image();let rects=null;atlas.src=new URL('./assets/boss-keys.png',import.meta.url).href;fetch(new URL('./assets/key-frames.json',import.meta.url)).then(r=>r.json()).then(r=>rects=r);
export function drawMagicalKey(c,round,x,y,height=65,time=0){
 const color=KEYS[round].color;c.save();c.translate(x,y);if(rects&&atlas.complete&&atlas.naturalWidth){const[sx,sy,sw,sh]=rects[round],w=height*sw/sh;c.drawImage(atlas,sx,sy,sw,sh,-w/2,-height/2,w,height);}else{c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(0,-height*.25,height*.12,0,Math.PI*2);c.moveTo(0,-height*.13);c.lineTo(0,height*.35);c.lineTo(height*.12,height*.35);c.moveTo(0,height*.2);c.lineTo(height*.12,height*.2);c.stroke();}c.restore();
}
export function drawKeyReward(c,room,now){
 const k=room.keyDrop;if(!k)return;const t=now-k.spawned;if(now>room.keySceneUntil)return;
 if(!k.collectedAt){light(c,k.x,k.y-30,210,k.color,.34);c.save();c.strokeStyle=k.color;c.globalAlpha=.6;c.lineWidth=1.2;c.beginPath();c.ellipse(k.x,k.y+8,30+Math.sin(t*3)*3,12,0,0,Math.PI*2);c.stroke();c.restore();drawMagicalKey(c,k.round,k.x,k.y-46+Math.sin(t*4)*4,102,now);
  for(let i=0;i<16;i++){const a=i*2.4+now*.8,r=20+(i%4)*8;c.fillStyle=k.color;c.globalAlpha=.3+Math.sin(now*5+i)*.2;c.fillRect(k.x+Math.cos(a)*r,k.y-30+Math.sin(a)*r*.6-(t*20+i*11)%60,2,3);}c.globalAlpha=1;
 }else{const p=room.players.find(p=>p.id===k.carrier);if(p){const age=now-k.collectedAt;c.save();c.globalAlpha=Math.min(1,Math.max(0,(room.keySceneUntil-now)/.9));drawMagicalKey(c,k.round,p.x,p.y-110+Math.sin(now*3)*4,96,now);c.restore();}}
}
export function drawKeyRing(canvas,keys){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);for(let i=0;i<3;i++){c.save();c.globalAlpha=keys.some(k=>k.round===i)?1:.16;drawMagicalKey(c,i,24+i*40,24,40);c.restore();}}
export function drawKeyPassage(c,room,now){
 if(room.round>1||!room.keyDrop)return;
 const opened=room.gateUnlocked,t=opened?clamp((now-room.keyDrop.collectedAt)/1.2,0,1):0,color=KEYS[room.round].color;
 c.save();c.translate(1112,370);c.fillStyle='#080d17';c.fillRect(-34,-91,68,116);
 for(let side=-1;side<=1;side+=2)for(let row=0;row<7;row++){c.fillStyle=row%2?'#4e4b55':'#66616a';c.fillRect(side<0?-48:32,-90+row*18,16,16);c.fillStyle='#b2987044';c.fillRect(side<0?-48:32,-90+row*18,16,2);}
 c.fillStyle='#827064';c.fillRect(-38,-105,76,13);c.fillStyle='#b69a72';c.fillRect(-27,-109,54,5);
 c.save();c.beginPath();c.rect(-33,-91,66,116);c.clip();
 for(let side=-1;side<=1;side+=2){c.save();c.translate(side*t*36,0);c.fillStyle='#222632';c.fillRect(side<0?-32:0,-90,32,115);for(let y=-86;y<24;y+=19){c.fillStyle='#66717b';c.fillRect(side<0?-29:3,y,26,2);}c.fillStyle='#9b8157';c.fillRect(side<0?-9:5,-42,4,16);c.restore();}c.restore();
 c.strokeStyle=color;c.globalAlpha=opened?1:.4;c.lineWidth=2;for(let i=0;i<3;i++){c.strokeRect(-19+i*16,-101,6,6);}c.restore();
 if(t>0)light(c,1112,335,140,color,t*.35);
 if(opened&&now-room.keyDrop.collectedAt<1.2){const f=clamp((now-room.keyDrop.collectedAt)/1.2,0,1);drawMagicalKey(c,room.round,room.keyDrop.x+(1112-room.keyDrop.x)*f,room.keyDrop.y-40+(335-room.keyDrop.y)*f,58*(1-f*.5),now);}
}
export function epilogueCast(room){return ['knight','archer','rogue'].map((classId,i)=>({...room.players.find(p=>p.classId===classId),id:'epilogue-'+classId,classId,name:['Aldric','Lyra','Nyx'][i],hp:100,connected:true,emoteUntil:0,attackAt:-10,lastHurt:-10,isBot:false}));}
export function drawSecretEnding(c,room,now){
 const t=Math.max(0,now-room.endingAt),opened=!!room.vaultOpenedAt,open=opened?clamp((now-room.vaultOpenedAt)/2.8,0,1):0,keys=room.keys||[];
 const image=sceneImage('secret-chamber'),gx=460,gy=88,gw=280,gh=204;
 if(open>0&&image){c.save();c.beginPath();c.rect(gx,gy,gw,gh);c.clip();const inside=sceneImage('secret-chamber-open');if(inside)c.drawImage(inside,0,0,1200,760);else{c.fillStyle='#14121c';c.fillRect(gx,gy,gw,gh);}
  const sx=gx/1200*image.width,sy=gy/760*image.height,sw=gw/1200*image.width,sh=gh/760*image.height;
  c.drawImage(image,sx,sy,sw/2,sh,gx-open*gw*.55,gy,gw/2,gh);c.drawImage(image,sx+sw/2,sy,sw/2,sh,gx+gw/2+open*gw*.55,gy,gw/2,gh);c.restore();light(c,600,285,420,'#f6d295',open*.36);
 }
 for(let i=0;i<3;i++){const start={x:510+i*90,y:410},end={x:508+i*94,y:52},fly=clamp((t-1.2-i*.2)/3,0,1),x=start.x+(end.x-start.x)*fly,y=start.y+(end.y-start.y)*fly;
  if(keys.some(k=>k.round===i)){light(c,x,y,65,KEYS[i].color,.22);drawMagicalKey(c,i,x,y,50*(1-fly*.4),now);}
 }
 if(t>8){const age=clamp((t-8)/3,0,1);light(c,600,197,160,'#ffe0a2',.35*age);c.save();c.translate(600,197-Math.sin(now*2)*3);c.scale(age*1.1,age*1.1);c.fillStyle='#e0b769';c.strokeStyle='#fff0bd';c.lineWidth=2;c.beginPath();c.moveTo(-30,9);c.lineTo(-35,-22);c.lineTo(-17,-9);c.lineTo(0,-34);c.lineTo(17,-9);c.lineTo(35,-22);c.lineTo(30,9);c.closePath();c.fill();c.stroke();c.fillRect(-30,10,60,9);for(let i=0;i<3;i++){c.fillStyle=KEYS[i].color;c.fillRect(-21+i*18,-1,6,7);}c.restore();}
 if(opened)for(let i=0;i<32;i++){const a=i*2.4,r=20+(i%7)*30;c.globalAlpha=.3+Math.sin(now*2+i)*.2;c.fillStyle='#f4dca0';c.fillRect(600+Math.cos(a)*r,270+Math.sin(a)*r*.65-((now*15+i*13)%110),2,3);}c.globalAlpha=1;
}
