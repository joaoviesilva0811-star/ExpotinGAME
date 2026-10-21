import {COVER_LAYOUTS} from './arena-state.js';
import {clamp} from './shared.js';
import {lightingDensity} from './lighting.js';
import {exposedWindow,atmosphereCount} from './arena-presentation.js';
const sheets=new Map(),TAU=Math.PI*2;
let coverAtlas=null,coverFrames=[];
export const arenaArtReady=fetch(new URL('./assets/cover-frames.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Cover registration missing');return r.json();}).then(spec=>new Promise(resolve=>{
 const atlas=new Image();atlas.onerror=()=>resolve(false);atlas.onload=()=>{coverAtlas=atlas;coverFrames=spec.frames;resolve(true);};atlas.src=new URL('./assets/'+spec.file,import.meta.url).href;
})).catch(()=>false);
const canvas=(w,h)=>{const a=document.createElement('canvas');a.width=w;a.height=h;return a;};
const colors=[['#cfad7b','#615a54','#292d36'],['#aad475','#576344','#293d37'],['#c2a5ed','#6c637e','#2b2b40']];
function polygon(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function prop(round,broken=false,cracked=false){
 const key=[round,broken,cracked].join(':');if(sheets.has(key))return sheets.get(key);
 const a=canvas(116,130),c=a.getContext('2d'),[gold,mid,dark]=colors[round];c.imageSmoothingEnabled=false;c.translate(58,111);
 c.fillStyle='#03081088';c.beginPath();c.ellipse(1,6,40,15,0,0,TAU);c.fill();
 const registered=coverFrames.find(f=>f.round===round&&f.broken===broken);
 if(coverAtlas&&registered){const [sx,sy,sw,sh]=registered.rect,[w,h]=registered.size;c.drawImage(coverAtlas,sx,sy,sw,sh,-w/2,-h+9,w,h);}
 else if(broken){for(let i=0;i<14;i++){const x=Math.sin(i*7.3)*30,y=Math.cos(i*3.1)*9;polygon(c,[[x-6,y],[x-3,y-7-i%7],[x+7,y-4],[x+6,y+3]],i%3?mid:gold,dark);}}
 else if(round===0){
  polygon(c,[[-28,-2],[0,10],[29,-2],[29,-13],[0,-2],[-28,-13]],'#5a514d','#242833');
  polygon(c,[[-20,-13],[-20,-78],[0,-67],[0,-2]],'#45424a','#262a32');polygon(c,[[0,-2],[0,-67],[21,-78],[21,-13]],'#67606a','#292d36');
  for(let i=0;i<4;i++){c.strokeStyle='#201f2e';c.beginPath();c.moveTo(-19,-23-i*14);c.lineTo(0,-15-i*14);c.lineTo(20,-25-i*14);c.stroke();}
  polygon(c,[[-27,-78],[0,-93],[28,-79],[0,-65]],'#8b7b73','#b6a18b');polygon(c,[[-27,-78],[0,-65],[0,-58],[-27,-71]],'#51464b');polygon(c,[[0,-65],[28,-79],[28,-72],[0,-58]],'#7b6a66');
  c.fillStyle='#d9af6d';c.fillRect(-5,-49,9,2);c.fillRect(-1,-54,2,12);
 }else if(round===1){
  for(let i=0;i<5;i++){const x=(i-2)*9;polygon(c,[[x-9,1],[x-4,-47-i%2*14],[x+5,-60+i%3*10],[x+8,-15],[x+16,5]],i%2?'#605242':'#3f4535','#1d312b');c.strokeStyle='#a28b58';c.beginPath();c.moveTo(x,-3);c.lineTo(x+2,-38);c.stroke();}
  for(let i=0;i<15;i++){const x=Math.sin(i*8)*20,y=-15-(i*17)%51;polygon(c,[[x,y],[x+10,y-5],[x+5,y+4]],i%3?'#6b8b4b':'#a1bc64');}
 }else{
  polygon(c,[[-26,0],[0,11],[27,-1],[0,-12]],'#544e6d','#a98ac9');
  polygon(c,[[-15,-15],[-10,-79],[2,-98],[5,-24]],'#8874ab','#bca2da');polygon(c,[[2,-98],[19,-66],[15,-14],[5,-24]],'#4f436c','#9f86bd');polygon(c,[[-15,-15],[5,-24],[15,-14],[1,2]],'#66537f','#be9adb');
  c.strokeStyle='#edcaff';c.lineWidth=2;c.beginPath();c.moveTo(1,-79);c.lineTo(0,-50);c.lineTo(8,-36);c.stroke();
 }
 if(cracked&&!broken){c.strokeStyle='#100e1a';c.lineWidth=3;c.beginPath();c.moveTo(9,-68);c.lineTo(-3,-51);c.lineTo(6,-39);c.lineTo(-8,-17);c.stroke();c.strokeStyle=gold;c.lineWidth=1;c.stroke();}
 sheets.set(key,a);return a;
}
function floor(round){
 const key='floor-'+round;if(sheets.has(key))return sheets.get(key);const a=canvas(1200,760),c=a.getContext('2d'),[color]=colors[round];
 // Recess the wall courses before light/actors/telegraphs are drawn. The
 // centre remains clear; this is one cached floor pass, not a screen filter.
 for(const [x,y,w,h,vertical,reverse]of [[0,0,1200,145,true,false],[0,625,1200,135,true,true],[0,0,95,760,false,false],[1105,0,95,760,false,true]]){
  const g=c.createLinearGradient(x,y,vertical?x:x+w,vertical?y+h:y);g.addColorStop(reverse?1:0,'#03071188');g.addColorStop(reverse?0:1,'#03071100');c.fillStyle=g;c.fillRect(x,y,w,h);
 }
 for(const p of COVER_LAYOUTS[round]){c.save();c.translate(p.x,p.y);c.strokeStyle=color;c.lineWidth=1;c.globalAlpha=.24;
  if(round===0){for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(-32,i*7);c.lineTo(32,i*7);c.stroke();}c.strokeRect(-36,-28,72,56);}
  else{for(let i=0;i<(round===1?6:8);i++){const t=i/(round===1?6:8)*TAU;c.rotate(t);polygon(c,[[12,0],[31,-8],[43,0],[31,8]],'transparent',color);c.rotate(-t);}}
  c.restore();
 }
 // Arena-specific light shapes share the same cached floor surface. Feathered
 // edges and low opacity cannot be confused with an announced damage zone.
 c.globalCompositeOperation='screen';
 for(let i=0;i<3;i++){
  const x=150+i*370,g=c.createLinearGradient(x,30,x+130,650);g.addColorStop(0,round===0?'#efb96824':round===1?'#cad5a624':'#bca5e52b');g.addColorStop(1,'transparent');
  polygon(c,[[x-20,30],[x+30,30],[x+270,650],[x+105,650]],g);
  if(round===0){c.globalAlpha=.2;polygon(c,[[x+8,35],[x+15,35],[x+214,591],[x+194,591]],g);c.globalAlpha=1;}
  if(round===1){
   // Broken canopy light, drawn into the cache rather than moving big fog
   // textures over the player's feet during a fight.
   for(let j=0;j<13;j++){const px=x+30+Math.sin(j*4.7)*70+j*7,py=190+(j*71)%380;c.save();c.translate(px,py);c.rotate(-.45);c.fillStyle=j%3?'#d0d1a010':'#e6d9ab14';c.fillRect(-5,-2,10+j%4*3,4);c.restore();}
  }
  if(round===2){
   const tones=['#ac9ee61a','#82a9d715','#d0b3df18'];
   for(let j=0;j<5;j++){const px=x+60+j*13,py=210+j*59;polygon(c,[[px,py],[px+28,py+14],[px+70,py+102],[px+31,py+79]],tones[j%3]);}
  }
 }
 sheets.set(key,a);return a;
}
function coverHalo(round){
 const key='halo-'+round;if(sheets.has(key))return sheets.get(key);const a=canvas(128,56),c=a.getContext('2d');
 c.translate(64,28);c.scale(1,.4);const g=c.createRadialGradient(0,0,8,0,0,59);g.addColorStop(0,colors[round][0]+'45');g.addColorStop(.5,colors[round][0]+'18');g.addColorStop(1,colors[round][0]+'00');c.fillStyle=g;c.fillRect(-64,-70,128,140);sheets.set(key,a);return a;
}
function atmosphereToken(round){
 const key='air-'+round;if(sheets.has(key))return sheets.get(key);const a=canvas(18,18),c=a.getContext('2d');c.imageSmoothingEnabled=false;
 if(round===1){polygon(c,[[3,10],[7,5],[15,4],[12,11],[7,13]],'#b3bd80');c.strokeStyle='#60724c';c.lineWidth=1;c.beginPath();c.moveTo(4,11);c.lineTo(13,6);c.stroke();}
 else if(round===2){polygon(c,[[8,3],[12,8],[9,14],[6,9]],'#bda7e7');c.fillStyle='#f1ddff';c.fillRect(8,5,1,3);}
 else{c.fillStyle='#f3ba79';c.fillRect(7,5,2,6);c.fillStyle='#ffe0a3';c.fillRect(7,5,1,2);c.fillStyle='#ba765955';c.fillRect(7,11,2,3);}
 sheets.set(key,a);return a;
}
function mist(round){
 const key='mist-'+round;if(sheets.has(key))return sheets.get(key);const a=canvas(512,128),c=a.getContext('2d'),tone=['#c7bbae','#b3d5bf','#c2b5df'][round];
 for(let i=0;i<12;i++){const x=20+i*43,y=46+Math.sin(i*8.7)*13,r=40+i%3*8,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,tone+'80');g.addColorStop(.45,tone+'26');g.addColorStop(1,tone+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}sheets.set(key,a);return a;
}
export function drawArenaGround(c,room,time,quality='high'){
 const round=room.round;c.drawImage(floor(round),0,0);
 for(const p of room.covers||[]){if(p.hp<=0)c.drawImage(prop(round,true),p.x-58,p.y-111);else if(quality!=='low'){c.save();c.globalAlpha=.55+Math.sin(time*1.5+p.x)*.08;c.drawImage(coverHalo(round),p.x-64,p.y-20);c.restore();}}
 // Low mist stays near the room's edges, below actors and telegraphs.
 c.save();c.globalAlpha=.13;const count=quality==='low'?1:3;
 for(let i=0;i<count;i++){c.drawImage(mist(round),-80+i*405+Math.sin(time*.13+i)*70,635+Math.sin(time*.21+i)*15,460,70);}c.restore();
}
export function drawCover(c,p,round,now){
 if(p.hp<=0)return;const hit=Math.max(0,1-(now-p.hitAt)/.18),a=prop(round,false,p.hp<p.maxHp*.5);c.save();c.translate(p.x+Math.sin((now-p.hitAt)*55)*hit*2,p.y);c.drawImage(a,-58,-111);
 // Full-health cover does not need a permanent HUD bar on the floor.
 if(p.hp<p.maxHp||hit>.01){c.fillStyle='#080c15';c.fillRect(-21,13,42,4);c.fillStyle=colors[round][0];c.fillRect(-20,14,40*clamp(p.hp/p.maxHp,0,1),2);}c.restore();
}
export function drawArenaForeground(c,round,time,quality='high'){
 c.save();const count=atmosphereCount(quality,lightingDensity()),token=atmosphereToken(round);
 for(let i=0;i<count;i++){const x=(i*197+time*(3+i%3))%1200,y=(i*109+Math.sin(time*.4+i)*17)%760;c.globalAlpha=.16+Math.sin(time+i)*.07;
  c.save();c.translate(x,y);c.rotate(time*(round===1?.3:.6)+i);const size=round===1?8+Math.sin(time+i)*2:round===2?7:6;c.drawImage(token,-size/2,-size/2,size,size);c.restore();
 }
 c.globalAlpha=.35;c.strokeStyle=round===1?'#233c31':'#242331';c.lineWidth=round===1?5:3;
 for(const x of [14,1186]){c.beginPath();c.moveTo(x,0);c.quadraticCurveTo(x+Math.sin(time*.7)*7,68,x+12,125);c.stroke();}
 c.restore();
}
export function drawBossPresence(c,b,round,time,now){
 if(!b||b.hp<=0)return;const phase=b.phase||1,opening=exposedWindow(b,now),cold=opening>0;c.save();c.translate(b.x,b.y+10);c.strokeStyle=cold?'#a9e5d6':colors[round][0];c.lineWidth=cold?2:1;c.globalAlpha=cold?.65:.12+(phase-1)*.1;
 const r=(b.radius||65)+9;for(let i=0;i<6;i++){const t=i/6*TAU+time*.22;c.beginPath();c.ellipse(0,0,r+i%2*5,(r+i%2*5)*.4,0,t,t+.24);c.stroke();}
 if(phase>1){c.globalAlpha=.35;for(const side of [-1,1]){c.strokeStyle=colors[round][0];c.lineWidth=round===1?3:1.5;for(let j=0;j<3;j++){const sway=Math.sin(time*(2+j*.2)+j)*8;c.beginPath();c.moveTo(side*45,-35-j*12);c.quadraticCurveTo(side*(75+j*9),-38-j*17,side*(85+j*10)+sway,-12-j*22);c.stroke();}}for(let i=0;i<phase*4;i++){const t=i/(phase*4)*TAU+time*.6;c.fillStyle=colors[round][0];c.fillRect(Math.cos(t)*r,Math.sin(t)*r*.4-8-(time*22+i*11)%35,2,3);}}
 if(cold){
  c.globalAlpha=.65;c.strokeStyle='#a9e5d6';c.lineWidth=2;c.beginPath();c.ellipse(0,0,r+10,(r+10)*.4,0,-Math.PI/2,-Math.PI/2+TAU*opening);c.stroke();
  for(const side of [-1,1]){c.beginPath();c.moveTo(side*(r+16),-5);c.lineTo(side*(r+10),0);c.lineTo(side*(r+16),5);c.stroke();}
  c.globalAlpha=.9;c.font='bold 9px Pixelify';c.textAlign='center';c.fillStyle='#b4efdd';c.fillText('EXPOSTO · +12%',0,-195);
 }
 c.restore();
}

export function prewarmArenaArt(){for(let round=0;round<3;round++){floor(round);mist(round);coverHalo(round);atmosphereToken(round);prop(round,false,false);prop(round,false,true);prop(round,true,false);}return true;}
export function arenaDepthStats(){return{cachedSurfaces:sheets.size,groundPasses:1,sourcePNGsModified:false};}
