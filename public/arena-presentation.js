import {clamp} from './shared.js';
const positive=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):1;

// Presentation geometry only. Neither a shadow nor a vulnerability indicator
// changes collisions, attack reach, damage or the server's recovery deadline.
export function exposedWindow(b,now){
 if(!b||b.hp<=0||b.state!=='recover'||!Number.isFinite(now))return 0;
 const until=b.exposedUntil||0,start=b.startedAt;
 if(!Number.isFinite(start)||until<=start||now<start||now>=until)return 0;
 return clamp((until-now)/(until-start),0,1);
}
export function groundShadowShape(width,height,distance,power){
 const w=positive(width),h=positive(height);
 const travel=clamp((Number(distance)||0)/500,.15,1);
 return{length:Math.min(h*.4,12+h*.25*travel),width:Math.min(w*.42,h*.38),
  opacity:clamp((Number(power)||0)*.7,.035,.17),flatten:.42};
}
export function atmosphereCount(quality,density=1){
 const base=quality==='low'?8:quality==='medium'?16:24;
 return Math.max(4,Math.round(base*Math.sqrt(clamp(Number(density)||.12,.12,1))));
}
