import {clamp} from './shared.js';
const TAU=Math.PI*2;
// Every fill and boundary uses the same circle/cone/rotated rectangle as damage.
function outline(c,h){
 c.beginPath();
 if(h.shape==='line'){c.save();c.rotate(h.angle);c.rect(-h.length/2,-h.width/2,h.length,h.width);c.restore();}
 else if(h.shape==='cone'){c.moveTo(0,0);c.arc(0,0,h.r,h.angle-h.spread,h.angle+h.spread);c.closePath();}
 else{c.arc(0,0,h.r,0,TAU);if(h.inner){c.moveTo(h.inner,0);c.arc(0,0,h.inner,TAU,0,true);}}
}
function rune(c,x,y,a,color,size=5){
 c.save();c.translate(x,y);c.rotate(a);c.strokeStyle=color;c.lineWidth=1;
 c.beginPath();c.moveTo(-size,0);c.lineTo(0,-size);c.lineTo(size,0);c.moveTo(0,-size);c.lineTo(0,size);c.moveTo(-size*.5,size*.3);c.lineTo(size*.5,size*.3);c.stroke();c.restore();
}
function ticks(c,h,color,progress){
 const line=h.shape==='line',cone=h.shape==='cone',count=line?Math.max(3,Math.ceil(h.length/48)):cone?Math.max(4,Math.ceil(h.r*h.spread/30)):Math.max(12,Math.ceil(TAU*h.r/38));
 c.strokeStyle=color;c.lineWidth=1;
 for(let i=0;i<count;i++){
  const t=i/count,lit=t<=progress;
  c.globalAlpha=lit?.85:.28;
  if(line){const x=-h.length/2+(i+.5)*h.length/count;c.save();c.rotate(h.angle);for(const side of [-1,1]){const y=side*h.width/2;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-side*(i%3===0?7:3));c.stroke();}c.restore();}
  else{const a=cone?h.angle-h.spread+(i+.5)/count*h.spread*2:i/count*TAU-Math.PI/2,r=h.r;c.beginPath();c.moveTo(Math.cos(a)*r,Math.sin(a)*r);c.lineTo(Math.cos(a)*(r-(i%3===0?7:3)),Math.sin(a)*(r-(i%3===0?7:3)));c.stroke();}
 }
 c.globalAlpha=1;
}
export function drawTelegraph(c,h,now,time,round){
 const active=now>=h.at,start=h.started??h.at-1.6,progress=clamp((now-start)/Math.max(.01,h.at-start),0,1);
 const color=h.warningOnly?'#c4a5e7':h.cloud?'#b2d38c':h.breaks?'#f1bb77':'#ee8b78',accent=['#c9ab72','#a6c87b','#c1a3ed'][round];
 c.save();c.translate(h.x,h.y);
 if(h.solid&&active){
  for(let i=0;i<6;i++){const a=i*TAU/6+.4,x=Math.cos(a)*h.r,y=Math.sin(a)*h.r*.65;c.strokeStyle='#253b2d';c.lineWidth=8;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x*.4,-26,Math.cos(a+.3)*h.r*.65,-47);c.stroke();c.strokeStyle=i%2?'#869269':'#516845';c.lineWidth=3;c.stroke();}c.restore();return;
 }
 const radius=h.shape==='line'?Math.max(h.length,h.width):h.r;
 outline(c,h);c.fillStyle=active?color+'28':color+'10';c.fill('evenodd');
 c.save();outline(c,h);c.clip('evenodd');
 // A soft luminous rim, rather than stripes across the actors and floor.
 const glow=c.createRadialGradient(0,0,Math.max(0,radius*.65),0,0,Math.max(1,radius));glow.addColorStop(0,color+'00');glow.addColorStop(1,color+(active?'38':'24'));c.fillStyle=glow;c.fillRect(-radius,-radius,radius*2,radius*2);
 if(h.cloud&&active){for(let i=0;i<9;i++){const a=i*2.4+time*.25,r=(i%4)/4*h.r;c.fillStyle='#b9eaaa14';c.beginPath();c.ellipse(Math.cos(a)*r,Math.sin(a)*r,25+Math.sin(time+i)*5,14,0,0,TAU);c.fill();}}
 c.restore();
 outline(c,h);c.strokeStyle='#130f18bb';c.lineWidth=4;c.stroke();c.strokeStyle=color;c.lineWidth=h.minion?1:1.4;c.globalAlpha=.75+progress*.2;c.stroke();c.globalAlpha=1;
 ticks(c,h,color,active?1:progress);
 if(!active){
  // The cast is a single bright trace along the fixed damage boundary.
  c.strokeStyle='#ffe5bd';c.lineWidth=2;c.shadowColor=color;c.shadowBlur=5;c.beginPath();
  if(h.shape==='line'){c.save();c.rotate(h.angle);for(const side of [-1,1]){c.moveTo(-h.length/2,side*h.width/2);c.lineTo(-h.length/2+h.length*progress,side*h.width/2);}c.restore();}
  else if(h.shape==='cone')c.arc(0,0,h.r,h.angle-h.spread,h.angle-h.spread+2*h.spread*progress);
  else c.arc(0,0,h.r,-Math.PI/2,-Math.PI/2+TAU*progress);
  c.stroke();c.shadowBlur=0;
 }
 // Engraved directional runes sit near the edge; they never mask the target.
 if(!h.minion){
  if(h.shape==='line'){c.save();c.rotate(h.angle);for(const sign of [-1,1])rune(c,sign*(h.length/2-14),0,sign<0?Math.PI/2:-Math.PI/2,accent,4);c.restore();}
  else if(h.shape==='cone'){for(const sign of [-1,1]){const a=h.angle+sign*h.spread*.8;rune(c,Math.cos(a)*(h.r-15),Math.sin(a)*(h.r-15),a+Math.PI/2,accent,4);}}
  else for(let i=0;i<4;i++){const a=i*TAU/4;rune(c,Math.cos(a)*(h.r-15),Math.sin(a)*(h.r-15),a+Math.PI/2,accent,4);}
 }
 if(h.inner){c.strokeStyle='#bcd6c3';c.lineWidth=1;c.setLineDash([3,5]);c.beginPath();c.arc(0,0,h.inner,0,TAU);c.stroke();c.setLineDash([]);}
 // A few embers grow toward impact, without flashing the whole surface.
 if(!h.minion&&!active)for(let i=0;i<6;i++){
  const a=h.shape==='cone'?h.angle-h.spread+(i+.5)/6*h.spread*2:i*TAU/6+time*.06;
  const r=h.r||h.width/2;let x=Math.cos(a)*(r-4),y=Math.sin(a)*(r-4);
  if(h.shape==='line'){const t=(i+.5)/6-.5;x=Math.cos(h.angle)*h.length*t-Math.sin(h.angle)*h.width*.46;y=Math.sin(h.angle)*h.length*t+Math.cos(h.angle)*h.width*.46;}
  c.globalAlpha=(.25+progress*.55)*(1+Math.sin(time*3+i))*.5;c.fillStyle='#ffe6bd';c.fillRect(x,y-Math.sin(time*2+i)*3,1.5,1.5);
 }
 c.restore();
}
// Repaint the warning edge above dense blast clouds, keeping escape routes legible.
export function drawTelegraphEdge(c,h,now){
 if(now>=h.at||h.solid)return;
 c.save();c.translate(h.x,h.y);outline(c,h);c.strokeStyle='#090d18d9';c.lineWidth=4;c.stroke();c.strokeStyle=h.warningOnly?'#dfc9ff':h.breaks?'#ffe0a0':'#ffc2aa';c.lineWidth=1.6;c.stroke();
 if(h.inner){c.strokeStyle='#d5f2cf';c.lineWidth=1;c.beginPath();c.arc(0,0,h.inner,0,TAU);c.stroke();}
 c.restore();
}
