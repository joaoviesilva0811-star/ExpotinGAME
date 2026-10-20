// Batch equal materials/opacity into paths, without changing particle physics.
const materials=new Map(),active=[];let epoch=0;
export function particleMaterial(type,color,size){
 const width=type==='spark'?Math.round(size*2)/2:0,key=type+color+width;
 let bins=materials.get(key);if(!bins){bins=Array.from({length:8},(_,i)=>({type,color,width,alpha:(type==='dust'?.18:.9)*(i+1)/8,points:[],epoch:0}));materials.set(key,bins);}return bins;
}
export function paintParticles(c,particles,drawSmoke,bounds){
 epoch++;active.length=0;c.save();
 for(const p of particles){
  const y=p.y-p.z,r=p.type==='smoke'?p.size*4:p.type==='dust'?p.size*1.5:Math.max(20,p.size*2,Math.hypot(p.vx,p.vy)*.022);
  if(bounds&&(p.x+r<bounds.left||p.x-r>bounds.right||y+r<bounds.top||y-r>bounds.bottom))continue;
  if(p.type==='smoke'){c.globalCompositeOperation='source-over';c.globalAlpha=Math.min(1,p.life/.2)*.9;drawSmoke(c,p);continue;}
  const bins=p.paint||particleMaterial(p.type,p.color,p.size),index=Math.max(0,Math.min(7,Math.ceil(Math.min(1,p.life/.2)*8)-1)),bin=bins[index];
  if(bin.epoch!==epoch){bin.epoch=epoch;bin.points.length=0;active.push(bin);}bin.points.push(p);
 }
 for(const b of active){c.globalAlpha=b.alpha;c.fillStyle=c.strokeStyle=b.color;c.globalCompositeOperation=b.type==='spark'||b.type==='mote'?'lighter':'source-over';c.beginPath();
  for(const p of b.points){const x=p.x,y=p.y-p.z;
   if(b.type==='spark'){c.moveTo(x-p.vx*.022,y-p.vy*.022);c.lineTo(x,y);}
   else if(b.type==='dust'){const rx=p.size*(1.4-p.life/p.total),ry=p.size*.45;c.moveTo(x+rx,y);c.ellipse(x,y,rx,ry,0,0,Math.PI*2);}
   else{const sn=Math.sin(p.rotation),cs=Math.cos(p.rotation),r=p.size*.5;if(b.type==='mote'){c.moveTo(x+sn*r*3,y-cs*r*3);c.lineTo(x+cs*r*1.2,y+sn*r*1.2);c.lineTo(x-sn*r*3,y+cs*r*3);c.lineTo(x-cs*r*1.2,y-sn*r*1.2);}else{c.moveTo(x-r*cs+r*sn,y-r*sn-r*cs);c.lineTo(x+r*cs+r*sn,y+r*sn-r*cs);c.lineTo(x+r*cs-r*sn,y+r*sn+r*cs);c.lineTo(x-r*cs-r*sn,y-r*sn+r*cs);}c.closePath();}
  }
  if(b.type==='spark'){c.lineWidth=b.width;c.stroke();}else c.fill();
 }
 c.restore();return active.length;
}
