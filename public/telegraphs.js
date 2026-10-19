import {clamp,BOSSES} from './shared.js';
const TAU=Math.PI*2;
function outline(c,h){
 c.beginPath();
 if(h.shape==='line'){c.save();c.rotate(h.angle);c.rect(-h.length/2,-h.width/2,h.length,h.width);c.restore();}
 else if(h.shape==='cone'){c.moveTo(0,0);c.arc(0,0,h.r,h.angle-h.spread,h.angle+h.spread);c.closePath();}
 else{c.arc(0,0,h.r,0,TAU);if(h.inner)c.arc(0,0,h.inner,TAU,0,true);}
}
export function drawTelegraph(c,h,now,time,round){
 const active=now>=h.at,progress=clamp((now-(h.started??h.at-1.6))/(h.at-(h.started??h.at-1.6)),0,1);
 const color=h.cloud?'#9bda87':h.breaks?'#f2b382':BOSSES[round].color;
 c.save();c.translate(h.x,h.y);
 if(h.solid&&active){
  c.strokeStyle='#20372b';c.lineWidth=9;
  for(let i=0;i<6;i++){const a=i*TAU/6+.4,x=Math.cos(a)*h.r,y=Math.sin(a)*h.r*.65;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x*.4,-26,Math.cos(a+.3)*h.r*.65,-47);c.stroke();c.strokeStyle=i%2?'#70825a':'#455c40';c.lineWidth=4;c.stroke();}
  c.restore();return;
 }
 // Crisp outer contour with a quiet, dark interior keeps actors and terrain visible.
 outline(c,h);c.fillStyle=active?color+'23':'#0a11172e';c.fill();
 c.save();c.clip();
 const radius=h.shape==='line'?Math.max(h.length,h.width):h.r;
 const glow=c.createRadialGradient(0,0,0,0,0,Math.max(1,radius));glow.addColorStop(0,color+(active?'38':'08'));glow.addColorStop(.78,color+(active?'28':'09'));glow.addColorStop(1,color+(active?'40':'20'));c.fillStyle=glow;c.fillRect(-radius-4,-radius-4,radius*2+8,radius*2+8);
 // Restrained moving hatching conveys direction without opaque red blocks.
 c.strokeStyle=color+'20';c.lineWidth=1;const drift=(time*12)%26;
 for(let x=-radius*2;x<=radius*2;x+=26){c.beginPath();c.moveTo(x+drift,-radius);c.lineTo(x+radius+drift,radius);c.stroke();}
 if(h.cloud&&active){for(let i=0;i<10;i++){const a=i*2.4+time*.25,r=(i%4)/4*h.r;c.fillStyle='#b9eaaa12';c.beginPath();c.ellipse(Math.cos(a)*r,Math.sin(a)*r,25+Math.sin(time+i)*5,14,0,0,TAU);c.fill();}}
 c.restore();
 outline(c,h);c.strokeStyle='#081016bb';c.lineWidth=5;c.stroke();c.strokeStyle=color;c.lineWidth=h.minion?1.2:1.8;c.globalAlpha=active?.85:.55+progress*.4;c.stroke();c.globalAlpha=1;
 if(!active){
  c.strokeStyle='#fff0d4';c.lineWidth=2;c.shadowColor=color;c.shadowBlur=5;
  if(h.shape==='line'){
   c.save();c.rotate(h.angle);const x=-h.length/2+h.length*progress;c.beginPath();c.moveTo(-h.length/2,-h.width/2);c.lineTo(x,-h.width/2);c.moveTo(-h.length/2,h.width/2);c.lineTo(x,h.width/2);c.stroke();
   c.shadowBlur=0;c.strokeStyle=color+'aa';for(let i=0;i<Math.floor(h.length/55);i++){const ax=-h.length/2+30+i*55;c.beginPath();c.moveTo(ax-4,-6);c.lineTo(ax+3,0);c.lineTo(ax-4,6);c.stroke();}c.restore();
  }else if(h.shape==='cone'){
   c.beginPath();c.arc(0,0,h.r,h.angle-h.spread,h.angle-h.spread+2*h.spread*progress);c.stroke();
   c.save();c.rotate(h.angle);c.shadowBlur=0;c.strokeStyle=color+'99';for(let i=0;i<3;i++){const x=h.r*(.5+i*.16);c.beginPath();c.moveTo(x-4,-6);c.lineTo(x+3,0);c.lineTo(x-4,6);c.stroke();}c.restore();
  }else{c.beginPath();c.arc(0,0,h.r,-Math.PI/2,-Math.PI/2+TAU*progress);c.stroke();}
  c.shadowBlur=0;
  if(!h.minion&&!h.warningOnly){
   // Small timing diamond; it fills as the cast approaches impact.
   const x=h.shape==='cone'?Math.cos(h.angle)*h.r*.65:0,y=h.shape==='cone'?Math.sin(h.angle)*h.r*.65:0;
   c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle='#101820df';c.fillRect(-8,-8,16,16);c.strokeStyle=color;c.lineWidth=1;c.strokeRect(-8,-8,16,16);c.fillStyle=color;c.fillRect(-4,-4,8,8*progress);c.restore();
  }
 }
 if(h.inner){c.setLineDash([5,7]);c.strokeStyle='#c8dfc077';c.lineWidth=1;c.beginPath();c.arc(0,0,h.inner-5,0,TAU);c.stroke();c.setLineDash([]);}
 if(h.mark&&!active){c.strokeStyle=color;c.lineWidth=1.5;for(let i=0;i<4;i++){const a=i*TAU/4;c.save();c.rotate(a);c.beginPath();c.moveTo(h.r+6,-7);c.lineTo(h.r+6,0);c.lineTo(h.r+13,0);c.stroke();c.restore();}}
 c.restore();
}
