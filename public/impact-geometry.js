import {hazardContains} from './shared.js';
// A uniform lattice covers the actual footprint, including the center of circles
// and the width of lanes. Safe holes and the outside of cones are excluded.
export function impactAreaPoints(h,spacing=38){
 const points=[],line=h.shape==='line',halfX=line?h.length/2:h.r,halfY=line?h.width/2:h.r;
 const step=Math.max(spacing,Math.sqrt(halfX*halfY*4/144));
 const angle=line?h.angle||0:0,ca=Math.cos(angle),sa=Math.sin(angle);
 const nx=Math.max(1,Math.ceil(halfX*2/step)),ny=Math.max(1,Math.ceil(halfY*2/step));
 for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
  const lx=-halfX+(ix+.5)/nx*halfX*2,ly=-halfY+(iy+.5)/ny*halfY*2,x=h.x+lx*ca-ly*sa,y=h.y+lx*sa+ly*ca;
  if(hazardContains({x,y},h,0))points.push({x,y,seed:(ix*17+iy*31)%97});
 }
 return points;
}
export function traceImpactArea(c,h){
 c.beginPath();
 if(h.shape==='line'){c.save();c.translate(h.x,h.y);c.rotate(h.angle||0);c.rect(-h.length/2,-h.width/2,h.length,h.width);c.restore();}
 else if(h.shape==='cone'){c.moveTo(h.x,h.y);c.arc(h.x,h.y,h.r,h.angle-h.spread,h.angle+h.spread);c.closePath();}
 else{c.arc(h.x,h.y,h.r,0,Math.PI*2);if(h.inner){c.moveTo(h.x+h.inner,h.y);c.arc(h.x,h.y,h.inner,Math.PI*2,0,true);}}
}

// Select by the authoritative hazard, never by the boss's newer attack state.
export function impactStyle(h,kind){
 if(kind==='green')return h.cloud?'poisonCloud':'rootEruption';
 if(kind==='violet')return h.shape==='cone'||h.shape==='line'?'voidSweep':h.visual==='void'||h.mark?'voidRift':'crystalEruption';
 if(h.visual==='chains')return 'ironChains';
 if(h.shape==='cone'||h.shape==='line')return 'steelSweep';
 return h.inner||h.breaks?'stoneWave':'redEruption';
}
