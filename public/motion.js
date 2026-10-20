import {WORLD,CLASSES,clamp} from './shared.js';
export function updateVelocity(p,intent,speed,dt){
 const length=Math.hypot(intent.x||0,intent.y||0),rate=length?22:30,t=1-Math.exp(-Math.max(0,dt)*rate);
 p.vx+=((length?(intent.x||0)/length*speed:0)-p.vx)*t;p.vy+=((length?(intent.y||0)/length*speed:0)-p.vy)*t;
}
export function moveEntity(p,dx,dy,solids=[],boss=null){
 p.x=clamp(p.x+dx,WORLD.margin,WORLD.w-WORLD.margin);p.y=clamp(p.y+dy,WORLD.margin,WORLD.h-WORLD.margin);
 for(const o of solids){const x=p.x-o.x,y=p.y-o.y,d=Math.hypot(x,y),min=o.r+(p.radius||17);if(d<min){p.x=o.x+(d?x/d:1)*min;p.y=o.y+(d?y/d:0)*min;}}
 if(!p.isBoss&&boss&&boss.hp>0){const x=p.x-boss.x,y=p.y-boss.y,d=Math.hypot(x,y),min=boss.radius+12;if(d<min){p.x=boss.x+(d?x/d:1)*min;p.y=boss.y+(d?y/d:0)*min;}}
 p.x=clamp(p.x,WORLD.margin,WORLD.w-WORLD.margin);p.y=clamp(p.y,WORLD.margin,WORLD.h-WORLD.margin);
}
export class PositionTrack{
 constructor(){this.frames=[];}
 push(p,at){const last=this.frames.at(-1);if(last&&at<=last.at)return;if(last&&Math.hypot(last.x-p.x,last.y-p.y)>180)this.frames=[];this.frames.push({x:p.x,y:p.y,vx:p.vx??(last?(p.x-last.x)/(at-last.at):0),vy:p.vy??(last?(p.y-last.y)/(at-last.at):0),at});if(this.frames.length>8)this.frames.shift();}
 sample(at,fallback){const a=this.frames;if(!a.length)return fallback;if(at<=a[0].at)return{...fallback,x:a[0].x,y:a[0].y};for(let i=1;i<a.length;i++)if(at<=a[i].at){const x=a[i-1],y=a[i],t=(at-x.at)/(y.at-x.at);return{...fallback,x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t};}const p=a.at(-1),dt=clamp(at-p.at,0,.08);return{...fallback,x:p.x+p.vx*dt,y:p.y+p.vy*dt};}
}
// Bounded presentation prediction. HP, energy, attacks and collision outcomes
// always come from the server; only the local image can lead its latest position.
export class LocalMotion{
 reset(){this.p=null;this.snapshot=null;this.intent='';this.changed=-10;}
 constructor(){this.reset();}
 accept(p,time,rtt=0){if(!this.p||!this.snapshot||p.hp<=0||Math.hypot(this.p.x-p.x,this.p.y-p.y)>105||p.dodgeUntil>this.snapshot.dodgeUntil){this.p={x:p.x,y:p.y,vx:p.vx,vy:p.vy};}this.snapshot=p;this.received=time;this.rtt=clamp(rtt,0,.3);}
 step(intent,time,dt,now,solids,boss){const s=this.snapshot;if(!s)return null;const age=Math.max(0,time-this.received),p=this.p,key=[intent.x,intent.y,intent.block,intent.revive].join(':');if(key!==this.intent){this.intent=key;this.changed=time;}
  if(s.hp<=0||s.eliminated||age>.2||now<s.dodgeUntil){p.x=s.x;p.y=s.y;p.vx=s.vx;p.vy=s.vy;return{...s,...p};}
  const speed=now<s.rootUntil||intent.revive?0:CLASSES[s.classId].speed*(intent.block?.42:1);
  if(now<s.rootUntil){p.vx=0;p.vy=0;}updateVelocity(p,intent,speed,dt);moveEntity(p,p.vx*dt,p.vy*dt,solids,boss);
  const lead=Math.min(.12,age+this.rtt*.5),target={...s};moveEntity(target,(s.vx||0)*lead,(s.vy||0)*lead,solids,boss);
  if(time-this.changed>Math.min(.22,.085+this.rtt)){const t=1-Math.exp(-dt*12);moveEntity(p,(target.x-p.x)*t,(target.y-p.y)*t,solids,boss);}
  return{...s,...p};
 }
}
export function cameraFocus(hero,aim,enabled=true){const d=aim?Math.hypot(aim.x-hero.x,aim.y-hero.y):0;return{x:hero.x+(enabled?(hero.vx||0)*.16+(d?(aim.x-hero.x)/d*24:0):0),y:hero.y+(enabled?(hero.vy||0)*.12+(d?(aim.y-hero.y)/d*18:0):0)};}
