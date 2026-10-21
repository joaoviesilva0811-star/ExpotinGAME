import {drawItemSprite} from './item-art.js';
import {WORLD,clamp} from './shared.js';
const images=new Map(),loads=[];
for(const name of ['arena-throne','arena-forest','arena-cathedral','corridor','secret-chamber','secret-chamber-open']){const img=new Image();loads.push(new Promise((resolve,reject)=>{img.onload=()=>{images.set(name,img);resolve(true);};img.onerror=()=>reject(Error('Missing scene '+name));}));img.src=new URL(`./assets/${name}.png`,import.meta.url).href;}
export const sceneAssetsReady=Promise.all(loads);
export const sceneImage=round=>images.get(typeof round==='string'?round:['arena-throne','arena-forest','arena-cathedral'][round]);
export function cinematicPlayer(room,p,index,now){
 if(room.state==='countdown'&&room.intro){
  const t=clamp((now-room.intro.started-index*.16)/3.25,0,1);
  if(t<1)return{...p,x:-35+(p.x+35)*t,y:365+index*18+(p.y-365-index*18)*t,vx:98,vy:(p.y-365-index*18)/3.25,facing:0,emoteUntil:0,attackAt:-10};
 }
 if(room.state==='ending'&&now<room.endingAt)return p;
 if(room.state==='ending'&&room.secretUnlocked){const t=Math.max(0,now-room.endingAt),walk=clamp((t-8)/3,0,1);return{...p,x:510+index*90,y:495-walk*165,vx:0,vy:t>8&&t<11?-70:0,facing:-Math.PI/2,attackAt:-10,emoteUntil:0,hp:100};}
 if(room.state==='ending'&&p.hp>0){const t=clamp((now-room.endingAt)/3.8,0,1);return{...p,x:p.x+(490+index*66-p.x)*t,y:p.y+(485+index%2*30-p.y)*t,vx:t<1?95:0,vy:0,facing:-Math.PI/2,emoteUntil:0,attackAt:-10};}
 if(room.state==='round_end'&&now-room.outroStarted>=6){
  const t=clamp((now-room.outroStarted-6)/5,0,1);
  return{...p,x:95+t*1070-index*29,y:330+index*34,vx:180,vy:0,facing:0,hp:Math.max(1,p.hp),connected:true,emoteUntil:0,attackAt:-10};
 }
 return p;
}
export function drawGate(c,room,now){
 if(!room?.intro)return;const t=clamp((now-room.intro.gateAt)/.85,0,1),bounce=t===1?Math.sin((now-room.intro.gateAt)*27)*Math.exp(-(now-room.intro.gateAt)*5)*3:0;
 c.save();c.translate(48,380+bounce);
 c.fillStyle='#090f16';c.fillRect(-17,-74,34,148);
 for(const y of [-72,63]){c.fillStyle='#56636a';c.fillRect(-25,y,50,13);c.fillStyle='#b19d72';c.fillRect(-23,y,46,2);}
 c.save();c.beginPath();c.rect(-15,-61,30,122*t);c.clip();
 c.fillStyle='#202b35';c.fillRect(-14,-61,28,122);c.strokeStyle='#84918b';c.lineWidth=2;
 for(const x of [-10,0,10]){c.beginPath();c.moveTo(x,-61);c.lineTo(x,61);c.stroke();}
 for(let y=-55;y<61;y+=16){c.fillStyle='#45535b';c.fillRect(-14,y,28,3);c.fillStyle='#d0aa6a';c.fillRect(-11,y,2,2);c.fillRect(9,y,2,2);}
 c.restore();c.restore();
}
export function drawAwakening(c,b,round,now,intro){
 if(!intro||now<intro.awakeningAt||now>intro.awakeningAt+4.5)return;
 const t=clamp((now-intro.awakeningAt)/4.4,0,1),color=['#ef7d65','#9fdf86','#c89cff'][round];
 c.save();c.translate(b.x,b.y);c.globalAlpha=Math.sin(t*Math.PI)*.7;c.strokeStyle=color;c.lineWidth=1.5;
 for(let ring=0;ring<3;ring++){c.beginPath();c.ellipse(0,0,65+ring*32+t*80,25+ring*12+t*30,0,0,Math.PI*2);c.stroke();}
 for(let i=0;i<(round===2?12:18);i++){
  const a=i*2.399+now*(round===1?.18:.32),r=45+(i%4)*24,px=Math.cos(a)*r,py=Math.sin(a)*r*.4;
  if(round===0){c.strokeStyle=i%2?'#e3b375':'#a94146';c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.sin(now*7+i)*8,py-t*80);c.stroke();}
  else if(round===1){c.strokeStyle='#8da776';c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px*.5,py-15,px*.7,py-45*t);c.stroke();}
  else{c.save();c.translate(px,py-40-t*80);c.rotate(now+i);c.strokeRect(-4,-4,8,8);c.restore();}
 }
 c.restore();
}
export function drawCorridor(c,time){
 const image=sceneImage('corridor');if(image){c.drawImage(image,0,0,WORLD.w,WORLD.h);return;}
 c.fillStyle='#101923';c.fillRect(0,0,1200,760);for(let y=230;y<515;y+=23)for(let x=0;x<1200;x+=46){c.fillStyle=((x+y)%3)?'#38424a':'#303b42';c.fillRect(x,y,44,21);}c.fillStyle='#19242e';c.fillRect(0,175,1200,50);c.fillRect(0,520,1200,65);
}
export function drawEnding(c,room,now){
 const t=clamp((now-room.endingAt)/14,0,1),won=room.wins===3;
 c.save();c.globalCompositeOperation='screen';const g=c.createRadialGradient(600,290,5,600,360,540);g.addColorStop(0,won?'#f0c47244':'#af5cbe33');g.addColorStop(1,'transparent');c.fillStyle=g;c.globalAlpha=Math.min(1,t*3);c.fillRect(0,0,1200,760);c.restore();
 c.save();c.translate(600,340-Math.sin(t*Math.PI)*70);c.scale(1.4,1.4);c.globalAlpha=won?Math.max(0,1-Math.max(0,t-.55)*2.2):1;
 if(!drawItemSprite(c,won?'royal':'cursed',0,-4,90,now)){
 c.fillStyle='#141b27';c.fillRect(-29,7,58,10);c.fillStyle=won?'#d9b879':'#a97d85';c.fillRect(-26,4,52,7);
 c.beginPath();c.moveTo(-26,4);c.lineTo(-29,-19);c.lineTo(-13,-8);c.lineTo(0,-30);c.lineTo(13,-8);c.lineTo(29,-19);c.lineTo(26,4);c.closePath();c.fill();c.strokeStyle=won?'#ffe2a0':'#dd9acc';c.lineWidth=2;c.stroke();
 c.fillStyle=won?'#f9e5a9':'#d0a0db';for(const x of [-19,0,19])c.fillRect(x-2,-5,4,4);
 }
 if(won&&t>.35){c.strokeStyle='#fff4ce';c.lineWidth=3;c.beginPath();c.moveTo(-6,-19);c.lineTo(5,-8);c.lineTo(-2,1);c.lineTo(6,10);c.stroke();}c.restore();
 for(let i=0;i<45;i++){const a=i*2.399,spread=40+t*200,x=600+Math.cos(a)*spread,y=360-Math.sin(a)*spread*.45-t*(i%7)*30;c.globalAlpha=Math.sin(Math.min(1,t*1.5)*Math.PI)*.7;c.fillStyle=won?'#e8cd91':'#a47cb5';c.fillRect(x,y,2,3);}c.globalAlpha=1;
}
