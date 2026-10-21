// Presentation-only flight/material parameters. Effects never change attack
// geometry or the server simulation. Shared constants keep pooled particles
// independent of the previous material occupying the same object.
const dynamics={
 spark:{gravity:235,drag:.7,bounce:.3,spin:5},
 chip:{gravity:235,drag:.7,bounce:.3,spin:5},
 metal:{gravity:285,drag:.9,bounce:.38,spin:9},
 splinter:{gravity:195,drag:1.3,bounce:.18,spin:6},
 leaf:{gravity:45,drag:1.1,bounce:.12,spin:4},
 ember:{gravity:-10,drag:.95,bounce:.1,spin:2},
 shard:{gravity:250,drag:.55,bounce:.12,spin:4.2},
 mote:{gravity:85,drag:1.3,bounce:.18,spin:3},
 dust:{gravity:15,drag:2,bounce:.3,spin:5},
 smoke:{gravity:8,drag:.7,bounce:.3,spin:5}
};
export const materialDynamics=type=>dynamics[type]||dynamics.chip;
export function stepMaterialParticle(p,dt){
 const d=materialDynamics(p.type);
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=d.gravity*dt;p.rotation+=dt*d.spin;
 if(p.type==='leaf'){
  const age=p.total-p.life;
  p.x+=Math.sin(age*12+p.seed)*14*dt;p.y+=Math.cos(age*9+p.seed)*5*dt;
 }
 if(p.z<0){p.z=0;p.vz*=-d.bounce;p.vx*=.65;p.vy*=.65;}
 const friction=Math.exp(-dt*d.drag);p.vx*=friction;p.vy*=friction;
}
export function footprintBounds(h){
 if(h.shape==='line'){
  const cs=Math.abs(Math.cos(h.angle||0)),sn=Math.abs(Math.sin(h.angle||0));
  const x=cs*h.length/2+sn*h.width/2,y=sn*h.length/2+cs*h.width/2;
  return{left:h.x-x,right:h.x+x,top:h.y-y,bottom:h.y+y};
 }
 return{left:h.x-h.r,right:h.x+h.r,top:h.y-h.r,bottom:h.y+h.r};
}
export function footprintVisible(h,bounds){
 if(!bounds)return true;const a=footprintBounds(h);
 return a.right>=bounds.left&&a.left<=bounds.right&&a.bottom>=bounds.top&&a.top<=bounds.bottom;
}
export function appendProjectileTrail(trace,p,time){
 if(!trace||Math.hypot(p.x-trace.x,p.y-trace.y)>260){return{x:p.x,y:p.y,time,emitX:p.x,emitY:p.y,points:[{x:p.x,y:p.y}]};}
 const last=trace.points.at(-1);
 if(Math.hypot(p.x-last.x,p.y-last.y)>=10){trace.points.push({x:p.x,y:p.y});if(trace.points.length>5)trace.points.shift();}
 trace.x=p.x;trace.y=p.y;trace.time=time;return trace;
}
