import {CLASSES,REVIVE} from './shared.js';
// Sparse healing motes stay legible over boss effects. No emitters, textures or
// canvases are allocated per frame; the authoritative channel supplies progress.
export function drawRescueLink(c,helper,fallen,now){
 if(!fallen||helper.revive<=0||helper.hp<=0||fallen.hp>0)return;
 const t=Math.min(1,helper.revive/REVIVE.duration),color=CLASSES[helper.classId].color,dx=fallen.x-helper.x,dy=fallen.y-helper.y;
 c.save();c.lineWidth=1.5;c.strokeStyle='#17272c';c.fillStyle='#111e23cc';c.beginPath();c.ellipse(fallen.x,fallen.y+5,33,15,0,0,Math.PI*2);c.fill();c.stroke();
 c.strokeStyle=color;c.lineWidth=2.5;c.beginPath();c.ellipse(fallen.x,fallen.y+5,33,15,0,-Math.PI/2,-Math.PI/2+t*Math.PI*2);c.stroke();
 for(let i=0;i<4;i++){const a=i*Math.PI/2;c.fillStyle=t>i/4?color:'#596565';c.fillRect(fallen.x+Math.cos(a)*37-2,fallen.y+5+Math.sin(a)*18-2,4,4);}
 c.globalCompositeOperation='screen';
 for(let i=0;i<14;i++){const f=(now*.65+i/14)%1,x=helper.x+dx*f,y=helper.y+dy*f-24-Math.sin(f*Math.PI)*15+Math.sin(now*4+i)*2;c.globalAlpha=Math.sin(f*Math.PI)*.8;c.fillStyle=i%3?'#dbffdc':color;const s=i%4===0?3:2;c.fillRect(x-s/2,y-s/2,s,s);}
 c.globalAlpha=.6+.2*Math.sin(now*7);c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.arc(fallen.x,fallen.y-24,11+Math.sin(now*5)*2,0,Math.PI*2);c.stroke();c.fillStyle='#efffe2';c.fillRect(fallen.x-2,fallen.y-32,4,16);c.fillRect(fallen.x-8,fallen.y-26,16,4);
 c.restore();
}
