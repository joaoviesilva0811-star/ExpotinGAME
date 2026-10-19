import {createVolumes,drawVolume,drawVolumeGlow,drawSmoke,drawMissileVolume} from './volumes.js';
import {impactAreaPoints,traceImpactArea,impactStyle} from './impact-geometry.js';
// Bounded layered effects: tapered weapon trails, airborne sparks and ground debris.
let smokeCount=0;
const particles=[],decals=[],slashes=[],launches=[],fields=[],projectileTraces=new Map();
export function resetFX(){particles.length=decals.length=slashes.length=launches.length=fields.length=0;projectileTraces.clear();smokeCount=0;}
const palette={gold:['#fff5d9','#e6bf77','#94714d'],red:['#ffe6cd','#e68b71','#763d48'],green:['#efffd6','#a3d77e','#47715c'],violet:['#faf1ff','#bd99e7','#6b538d'],ice:['#ffffff','#c3efff','#689fbf']};
function spawn(x,y,colors,count,type,speed,angle=null,kind='red'){
 for(let i=0,n=Math.min(count,1800-particles.length);i<n;i++){
  if(type==='smoke'&&smokeCount>=96)break;if(type==='smoke')smokeCount++;
  const a=angle===null?Math.random()*Math.PI*2:angle+(Math.random()-.5)*1.2,s=speed*(.25+Math.random()*.75),life=type==='smoke'?1.1+Math.random()*.7:type==='dust'?.65+Math.random()*.55:.25+Math.random()*.6;
  particles.push({x,y,z:type==='dust'?2:12,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.65,vz:type==='smoke'?15+Math.random()*18:type==='dust'?10:35+Math.random()*90,life,total:life,type,kind,color:colors[i%colors.length],size:type==='smoke'?48+Math.random()*38:type==='dust'?7+Math.random()*13:1.2+Math.random()*2.2,rotation:Math.random()*7});
 }
}
export function impactFX(x,y,kind='gold',heavy=false){
 const colors=palette[kind]||palette.gold;
 spawn(x,y,colors,heavy?28:12,'spark',heavy?210:125);spawn(x,y,['#a3967c','#746956','#514f48'],heavy?15:5,'chip',heavy?150:70);spawn(x,y,['#82755c','#70675c','#56544d'],heavy?14:5,'dust',heavy?95:45);
 if(heavy){decals.push({x,y,r:35+Math.random()*20,life:22,total:22,seed:Math.random()*30});if(decals.length>80)decals.shift();}
}
export function magicFX(x,y,kind='violet',count=22){spawn(x,y,palette[kind]||palette.violet,count,'mote',90);}
export function footFX(x,y){spawn(x,y,['#8c8271','#6e6a60'],2,'dust',14);}
export function slashFX(x,y,angle,kind='gold',heavy=false,wait=.12){
 if(slashes.length>=48)slashes.shift();
 slashes.push({x,y,angle,wait,colors:palette[kind]||palette.gold,kind,life:heavy?.4:.3,total:heavy?.4:.3,r:heavy?104:kind==='violet'?54:67,heavy,emitted:0});
}
export function bowFX(x,y,angle,kind='gold',wait=.17){if(launches.length<32)launches.push({x,y,angle,kind,wait});}
export function stepFX(dt){
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){if(p.type==='smoke')smokeCount--;particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=(p.type==='smoke'?8:p.type==='dust'?15:235)*dt;p.rotation+=dt*5;
  if(p.z<0){p.z=0;p.vz*=-.3;p.vx*=.65;p.vy*=.65;}p.vx*=Math.exp(-dt*(p.type==='dust'?2:.7));p.vy*=Math.exp(-dt*(p.type==='dust'?2:.7));}
 for(let i=launches.length-1;i>=0;i--){const b=launches[i];b.wait-=dt;if(b.wait>0)continue;spawn(b.x+Math.cos(b.angle)*24,b.y+Math.sin(b.angle)*24,palette[b.kind]||palette.gold,9,'spark',100,b.angle);spawn(b.x,b.y,['#9c937c','#776f5b'],3,'dust',25);launches.splice(i,1);}
 for(let i=fields.length-1;i>=0;i--){fields[i].life-=dt;if(fields[i].life<=0)fields.splice(i,1);}
 for(let i=decals.length-1;i>=0;i--){decals[i].life-=dt;if(decals[i].life<=0)decals.splice(i,1);}
 for(let i=slashes.length-1;i>=0;i--){const s=slashes[i];if(s.wait>0){s.wait-=dt;continue;}s.life-=dt;if(s.life<=0){slashes.splice(i,1);continue;}
  const t=1-s.life/s.total,step=Math.floor(t*14);if(step>s.emitted&&t<.8){const a=s.angle-1.4+t*2.9;s.emitted=step;spawn(s.x+Math.cos(a)*s.r,s.y+Math.sin(a)*s.r-6,s.colors,s.heavy?4:2,'spark',s.heavy?130:75,a+.7);if(step%3===0)spawn(s.x+Math.cos(a)*s.r,s.y+Math.sin(a)*s.r,['#a49373','#686152'],2,'dust',32);}
 }
}
export function drawGroundFX(c){
 for(const field of fields)drawAreaImpact(c,field);
 c.save();for(const d of decals){c.globalAlpha=Math.min(.5,d.life/5);c.strokeStyle='#141c23';c.lineWidth=1.8;for(let i=0;i<5;i++){const a=d.seed+i*1.256;c.beginPath();c.moveTo(d.x,d.y);c.lineTo(d.x+Math.cos(a)*d.r*.45,d.y+Math.sin(a)*d.r*.3);c.lineTo(d.x+Math.cos(a+.2)*d.r,d.y+Math.sin(a+.2)*d.r*.65);c.stroke();}}c.restore();
}

function drawAreaImpact(c,f){
 const h=f.h,t=1-f.life/f.total,fade=Math.pow(1-t,.7),colors=palette[f.kind]||palette.red;
 c.save();traceImpactArea(c,h);c.clip('evenodd');
 // A low, full-surface flash is visible across the damage area, below all actors.
 c.globalCompositeOperation='screen';c.globalAlpha=fade*(.16+Math.sin(t*Math.PI)*.17);c.fillStyle=colors[1];
 const extent=h.shape==='line'?h.length+h.width:h.r*2;c.fillRect(h.x-extent,h.y-extent,extent*2,extent*2);
 c.globalCompositeOperation='source-over';
 if(!h.inner)drawVolumeGlow(c,f.kind,h.x,h.y,h.r||h.width,fade*.45);
 for(const p of f.points){
  const a=p.seed*.73,reach=13+(p.seed%13),lift=Math.sin(Math.min(1,t*3)*Math.PI)*8;
  c.save();c.translate(p.x,p.y);c.rotate(a);c.globalAlpha=fade*.65;c.strokeStyle='#090e16';c.lineWidth=3;
  c.beginPath();c.moveTo(-reach,0);c.lineTo(-3,-3);c.lineTo(2,2);c.lineTo(reach,-2);c.moveTo(2,2);c.lineTo(5,9);c.stroke();
  c.strokeStyle=colors[1];c.lineWidth=1;c.globalAlpha=fade*.6;c.stroke();
  if(f.kind==='green'&&f.model!=='poisonCloud'){
   c.rotate(-a);c.strokeStyle='#92b76b';c.lineWidth=2;c.beginPath();c.moveTo(-6,4);c.quadraticCurveTo(-8,-8-lift,2,-14-lift);c.moveTo(2,-14-lift);c.lineTo(-2,-20-lift);c.moveTo(2,-14-lift);c.lineTo(8,-19-lift);c.stroke();
  }else if(f.kind==='violet'){
   c.rotate(-a+t);c.fillStyle=colors[1];c.globalAlpha=fade*.45;c.beginPath();c.moveTo(0,-10-lift);c.lineTo(4,-2-lift);c.lineTo(0,6-lift);c.lineTo(-4,-2-lift);c.closePath();c.fill();
  }else{c.fillStyle='#a79278';c.globalAlpha=fade*.7;c.fillRect(-4,-lift,5,3);c.fillStyle=colors[0];c.globalAlpha=fade*.65;c.fillRect(5,-2-lift,2,2);}
  c.restore();
 }
 // Moving pressure fronts are clipped to the footprint and cannot cross a safe hole.
 c.globalCompositeOperation='screen';c.strokeStyle=colors[0];c.lineWidth=2;c.globalAlpha=fade*.55;
 for(let i=0;i<2;i++){
  const progress=Math.min(1,t*1.7-i*.18);if(progress<=0)continue;c.beginPath();
  if(h.shape==='line'){c.save();c.translate(h.x,h.y);c.rotate(h.angle);const x=-h.length/2+h.length*progress;c.moveTo(x,-h.width/2);c.lineTo(x,h.width/2);c.restore();}
  else if(h.shape==='cone')c.arc(h.x,h.y,h.r*progress,h.angle-h.spread,h.angle+h.spread);
  else c.arc(h.x,h.y,(h.inner||0)+(h.r-(h.inner||0))*progress,0,Math.PI*2);
  c.stroke();
 }
 c.restore();
}
function bladeTrail(c,s,t,offset=0){
 const sweep=s.angle-1.5+t*3.25+offset,span=1.45*Math.sin(Math.min(1,t*2)*Math.PI/2),r=s.r*(.82+Math.sin(t*Math.PI)*.18);
 c.save();c.translate(s.x,s.y-18);
 // Curved ribbons taper to a sharp point. Separate facets show the blade edge.
 for(let layer=2;layer>=0;layer--){
  const thickness=(layer===0?2:layer===1?9:17)*(s.heavy?1.4:1),start=sweep-span,steps=18;
  c.beginPath();for(let i=0;i<=steps;i++){const u=i/steps,a=start+span*u,rr=r+Math.sin(u*Math.PI)*thickness*.28;const x=Math.cos(a)*rr,y=Math.sin(a)*rr*.72;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}
  for(let i=steps;i>=0;i--){const u=i/steps,a=start+span*u,rr=r-Math.sin(u*Math.PI)*thickness;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr*.72);}c.closePath();
  c.globalAlpha=(1-t)*(layer===2?.18:layer===1?.45:.95);c.fillStyle=s.colors[layer];c.fill();
 }
 const x=Math.cos(sweep)*r,y=Math.sin(sweep)*r*.72;c.globalAlpha=Math.sin(t*Math.PI)*.8;c.strokeStyle='#fff5dc';c.lineWidth=1;c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-5);c.lineTo(x,y+5);c.stroke();c.restore();
}
export function drawFX(c){
 c.save();for(const p of particles){c.globalAlpha=Math.min(1,p.life/.2)*(p.type==='dust'?.18:.9);c.fillStyle=p.color;c.strokeStyle=p.color;
  if(p.type==='smoke'){c.globalCompositeOperation='source-over';drawSmoke(c,p);}
  else if(p.type==='spark'){c.globalCompositeOperation='lighter';c.lineWidth=p.size;c.beginPath();c.moveTo(p.x-p.vx*.022,p.y-p.z-p.vy*.022);c.lineTo(p.x,p.y-p.z);c.stroke();}
  else if(p.type==='dust'){c.globalCompositeOperation='source-over';c.beginPath();c.ellipse(p.x,p.y-p.z,p.size*(1.4-p.life/p.total),p.size*.45,0,0,7);c.fill();}
  else{c.globalCompositeOperation=p.type==='mote'?'lighter':'source-over';c.save();c.translate(p.x,p.y-p.z);c.rotate(p.rotation);if(p.type==='mote'){c.globalAlpha*=.7;c.beginPath();c.moveTo(0,-p.size*1.5);c.lineTo(p.size*.6,0);c.lineTo(0,p.size*1.5);c.lineTo(-p.size*.6,0);c.closePath();c.fill();}else c.fillRect(-p.size/2,-p.size/2,p.size,p.size);c.restore();}}
 c.globalCompositeOperation='source-over';c.globalAlpha=1;
 let drawn=0;
 for(const f of fields){
  const age=f.total-f.life;
  c.save();
  // Only the ground layer is clipped to damage geometry. Cutting a hole in
  // airborne billboards amputates roots, blades and clouds. Their emitters
  // still sit outside the safe center, whose boundary is drawn above the FX.
  for(const b of f.volumes){if(drawn++>=160)break;drawVolume(c,f.kind,b.x,b.y,b.width,(age-b.delay)/1.2,.88,b.flip,f.model,b.angle||0);}
  if(f.h.inner){c.globalAlpha=Math.min(.9,f.life*2);c.strokeStyle='#101c1de0';c.lineWidth=4;c.beginPath();c.arc(f.h.x,f.h.y,f.h.inner,0,Math.PI*2);c.stroke();c.strokeStyle='#d5f2cf';c.lineWidth=1.3;c.stroke();}
  c.restore();
 }
 c.globalCompositeOperation='lighter';
 for(const s of slashes){if(s.wait>0)continue;const t=1-s.life/s.total;bladeTrail(c,s,t);if(s.kind==='violet')bladeTrail(c,{...s,r:s.r*.72,x:s.x-8,y:s.y+8},t,-.4);}
 c.restore();
}
export function drawProjectile(c,p,time){
 const a=Math.atan2(p.vy,p.vx),speed=Math.hypot(p.vx,p.vy),color=p.enemy?(p.color==='seed'?'#b2d887':p.color==='blade'?'#ebbaa3':'#c6a5ee'):p.color==='ice'?'#c6efff':p.color==='pierce'?'#e9d4a2':'#d4bf95';
 const old=projectileTraces.get(p.id);if(!old||Math.hypot(p.x-old.x,p.y-old.y)>20){if(p.color!=='arrow')spawn(p.x,p.y-6,palette[p.color==='ice'?'ice':p.enemy?'violet':'gold'],1,'mote',12);projectileTraces.set(p.id,{x:p.x,y:p.y,time});}
 if(projectileTraces.size>180)for(const[id,v]of projectileTraces)if(time-v.time>2)projectileTraces.delete(id);
 c.save();c.translate(p.x,p.y-18);c.rotate(a);
 // Fine separated air trails replace the thick rectangular colored strip.
 for(let i=0;i<3;i++){c.globalAlpha=.12-i*.025;c.strokeStyle=color;c.lineWidth=i===0?1.4:.65;c.beginPath();c.moveTo(-18-speed*.04-i*5,(i-1)*3);c.quadraticCurveTo(-16,(i-1)*4,-5,(i-1));c.stroke();}c.globalAlpha=1;
 if(p.enemy)drawMissileVolume(c,p.color==='seed'?'green':p.color==='blade'?'red':'violet',time);
 if(p.enemy&&p.color!=='blade'){
  c.fillStyle=p.color==='seed'?'#617b45':'#675184';c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(8,0);c.lineTo(-1,-5);c.lineTo(-8,0);c.lineTo(-1,5);c.closePath();c.fill();c.stroke();c.fillStyle='#e8e5d7';c.fillRect(-1,-1,4,2);
 }else if(p.enemy){
  c.rotate(time*9);c.fillStyle='#a1a3b0';c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(-13,7);c.quadraticCurveTo(0,-16,14,-5);c.lineTo(1,-1);c.closePath();c.fill();c.stroke();
 }else{
  c.strokeStyle='#57402d';c.lineWidth=3;c.beginPath();c.moveTo(-23,0);c.lineTo(1,0);c.stroke();c.strokeStyle='#cbb58a';c.lineWidth=1;c.stroke();
  c.fillStyle=p.color==='ice'?'#c4e9f4':'#d0d6d5';c.strokeStyle='#52626b';c.lineWidth=.7;c.beginPath();c.moveTo(8,0);c.lineTo(-1,-3.5);c.lineTo(1,0);c.lineTo(-1,3.5);c.closePath();c.fill();c.stroke();
  c.fillStyle=p.color==='ice'?'#91c4df':'#c7b48a';for(const side of [-1,1]){c.beginPath();c.moveTo(-23,0);c.lineTo(-28,side*4);c.lineTo(-22,side*3);c.lineTo(-17,0);c.closePath();c.fill();}
  if(p.color==='ice'){c.strokeStyle='#d2f2ff';c.globalAlpha=.7;for(let i=0;i<3;i++){const x=-9-i*9,y=Math.sin(time*12+i*2)*5;c.beginPath();c.moveTo(x-2,y-2);c.lineTo(x+2,y+2);c.moveTo(x+2,y-2);c.lineTo(x-2,y+2);c.stroke();}}
 }
 c.restore();
}
export function hazardImpact(h,kind){
 if(h.minor){impactFX(h.x,h.y,kind,false);return;}
 const model=impactStyle(h,kind),points=impactAreaPoints(h),colors=palette[kind]||palette.red;
 if(fields.length>=16)fields.shift();fields.push({h:{...h},kind,model,points,volumes:createVolumes(h,points,model),life:1.45,total:1.45});
 // Emit throughout the interior as well as along the perimeter. A bounded subset
 // feeds the airborne simulation; the surface layer still covers every cell.
 const stride=Math.max(1,Math.ceil(points.length/42));
 for(let i=0;i<points.length;i+=stride){const p=points[i],a=Math.atan2(p.y-h.y,p.x-h.x);
  spawn(p.x,p.y,colors,7,'spark',170,a);spawn(p.x,p.y,['#a29173','#746b60'],4,'chip',95);spawn(p.x,p.y,['#8c7b66','#655f53'],5,'dust',65);if(i%(stride*3)===0)spawn(p.x,p.y,colors,2,'smoke',35,a,kind);
 }
 if(!h.inner)impactFX(h.x,h.y,kind,true);
}
