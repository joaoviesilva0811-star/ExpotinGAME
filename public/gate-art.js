import {gateProgress} from './gate-timing.js';
const parts=new Map();
export const gatesReady=fetch(new URL('./assets/gate-frames.json',import.meta.url)).then(r=>r.json()).then(spec=>new Promise(resolve=>{
 const atlas=new Image();atlas.onerror=()=>resolve(false);atlas.onload=()=>{
  for(const f of spec){const [sx,sy,sw,sh]=f.rect,w=(f.kind==='frame'?116:60)*3,h=(f.kind==='frame'?178:118)*3,a=document.createElement('canvas');a.width=w;a.height=h;const c=a.getContext('2d');c.imageSmoothingEnabled=false;c.beginPath();for(const[y,l,r]of f.spans)c.rect((l-sx)/sw*w,(y-sy)/sh*h,(r-l)/sw*w,h/sh+.05);c.clip();c.drawImage(atlas,sx,sy,sw,sh,0,0,w,h);parts.set(f.round+':'+f.kind,a);}
  resolve(true);
 };atlas.src=new URL('./assets/dungeon-gates.png',import.meta.url).href;
})).catch(()=>false);
export function paintGate(c,room,now,exit=false){
 const round=room.round||0,frame=parts.get(round+':frame'),panel=parts.get(round+':panel');if(!frame||!panel)return;
 const closed=gateProgress(room,now,exit),x=exit?1112:65,y=exit?420:460;c.save();c.translate(x,y);
 c.fillStyle='#0008';c.beginPath();c.ellipse(0,1,52,13,0,0,Math.PI*2);c.fill();
 c.save();c.beginPath();c.rect(-29,-120,58,114);c.clip();c.fillStyle='#050a1277';c.fillRect(-29,-120,58,114);c.drawImage(panel,-30,-123-(1-closed)*121,60,118);c.restore();
 c.drawImage(frame,-58,-178,116,178);
 c.strokeStyle=['#ac8d54','#668f72','#927ab6'][round];c.lineWidth=1;
 for(const side of [-1,1])for(let i=0;i<8;i++){const yy=-132+i*13+(1-closed)*9;c.strokeRect(side*33-1,yy,2,7);}
 c.restore();
}
