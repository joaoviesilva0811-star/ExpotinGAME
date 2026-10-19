// Layered, bounded particle simulation: ground dust, bouncing debris and light.
const particles=[],decals=[],slashes=[];
const palette={gold:['#fff4ce','#f4bd66','#b76d36'],red:['#ffe0c1','#ed7960','#913846'],green:['#e9ffd7','#a3e87a','#4c9166'],violet:['#faf0ff','#cb9cff','#795eae'],ice:['#ffffff','#b5f1ff','#6ba4cf']};
function spawn(x,y,colors,count,type,speed){
  for(let i=0,n=Math.min(count,680-particles.length);i<n;i++){
    const a=Math.random()*Math.PI*2,s=speed*(.25+Math.random()*.75),life=type==='dust'?.65+Math.random()*.55:.35+Math.random()*.6;
    particles.push({x,y,z:type==='dust'?2:12,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.65,vz:type==='dust'?10:35+Math.random()*90,life,total:life,type,color:colors[i%colors.length],size:type==='dust'?6+Math.random()*10:1.3+Math.random()*2,rotation:Math.random()*7});
  }
}
export function impactFX(x,y,kind='gold',heavy=false){
  const colors=palette[kind]||palette.gold;
  spawn(x,y,colors,heavy?28:12,'spark',heavy?210:125);spawn(x,y,['#9d8c71','#6c6356','#514f48'],heavy?15:5,'chip',heavy?150:70);spawn(x,y,['#82755c','#70675c','#56544d'],heavy?14:5,'dust',heavy?95:45);
  if(heavy){decals.push({x,y,r:35+Math.random()*20,life:22,total:22,seed:Math.random()*30});if(decals.length>80)decals.shift();}
}
export function magicFX(x,y,kind='violet',count=22){spawn(x,y,palette[kind]||palette.violet,count,'mote',90);}
export function footFX(x,y){spawn(x,y,['#8c8271','#6e6a60'],2,'dust',14);}
export function slashFX(x,y,angle,kind='gold',heavy=false,wait=.12){slashes.push({x,y,angle,wait,colors:palette[kind]||palette.gold,life:heavy?.38:.27,total:heavy?.38:.27,r:heavy?96:64});}
export function stepFX(dt){
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=(p.type==='dust'?15:235)*dt;p.rotation+=dt*5;
    if(p.z<0){p.z=0;p.vz*=-.3;p.vx*=.65;p.vy*=.65;}p.vx*=Math.exp(-dt*(p.type==='dust'?2:.7));p.vy*=Math.exp(-dt*(p.type==='dust'?2:.7));}
  for(let i=decals.length-1;i>=0;i--){decals[i].life-=dt;if(decals[i].life<=0)decals.splice(i,1);}
  for(let i=slashes.length-1;i>=0;i--){if(slashes[i].wait>0){slashes[i].wait-=dt;continue;}slashes[i].life-=dt;if(slashes[i].life<=0)slashes.splice(i,1);}
}
export function drawGroundFX(c){
  c.save();for(const d of decals){c.globalAlpha=Math.min(.5,d.life/5);c.strokeStyle='#141c23';c.lineWidth=1.8;for(let i=0;i<5;i++){const a=d.seed+i*1.256;c.beginPath();c.moveTo(d.x,d.y);c.lineTo(d.x+Math.cos(a)*d.r*.45,d.y+Math.sin(a)*d.r*.3);c.lineTo(d.x+Math.cos(a+.2)*d.r,d.y+Math.sin(a+.2)*d.r*.65);c.stroke();}}c.restore();
}
export function drawFX(c){
  c.save();for(const p of particles){c.globalAlpha=Math.min(1,p.life/.2)*(p.type==='dust'?.2:.9);c.fillStyle=p.color;c.strokeStyle=p.color;
    if(p.type==='spark'){c.globalCompositeOperation='lighter';c.lineWidth=p.size;c.beginPath();c.moveTo(p.x-p.vx*.025,p.y-p.z-p.vy*.025);c.lineTo(p.x,p.y-p.z);c.stroke();}
    else if(p.type==='dust'){c.globalCompositeOperation='source-over';c.beginPath();c.ellipse(p.x,p.y-p.z,p.size*(1.4-p.life/p.total),p.size*.45,0,0,7);c.fill();}
    else{c.globalCompositeOperation=p.type==='mote'?'lighter':'source-over';c.save();c.translate(p.x,p.y-p.z);c.rotate(p.rotation);c.fillRect(-p.size/2,-p.size/2,p.size,p.size);c.restore();}}
  c.globalCompositeOperation='lighter';
  for(const s of slashes){if(s.wait>0)continue;const t=1-s.life/s.total;c.globalAlpha=(1-t)*.8;
    for(let i=0;i<3;i++){c.strokeStyle=s.colors[i];c.lineWidth=7-i*2;c.beginPath();c.arc(s.x,s.y-17,s.r+i*2,s.angle-1.5+t*.85,s.angle+.7+t*.85);c.stroke();}}
  c.restore();
}
export function hazardImpact(h,kind){
 if(h.minor){impactFX(h.x,h.y,kind,false);return;}
 const count=h.shape==='line'?Math.min(10,Math.ceil(h.length/60)):h.shape==='cone'?8:12;
 for(let i=0;i<count;i++){
  let x,y;
  if(h.shape==='line'){const t=(i+.5)/count-.5;x=h.x+Math.cos(h.angle)*h.length*t;y=h.y+Math.sin(h.angle)*h.length*t;}
  else{const a=h.shape==='cone'?h.angle-h.spread+2*h.spread*i/(count-1):i/count*Math.PI*2,r=h.r*(h.shape==='cone'?.8:1);x=h.x+Math.cos(a)*r;y=h.y+Math.sin(a)*r;}
  spawn(x,y,palette[kind]||palette.red,4,'spark',100);spawn(x,y,['#a29173','#746b60'],3,'dust',60);
 }
 impactFX(h.x,h.y,kind,true);
}
