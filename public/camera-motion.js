import {clamp} from './shared.js';
const TAU=Math.PI*2;
const weight={knight:1,archer:.48,rogue:.68};
// Continuous presentation motion, independent of authority, aim and world bounds.
export class CameraMotion{
 constructor(){this.reset();}
 reset(){this.phase=0;this.envelope=0;this.pulses=[];this.lastAttack=-10;}
 attack(classId,angle,time){if(time-this.lastAttack<.08)return;this.lastAttack=time;this.pulses.push({age:0,angle,power:weight[classId]||.6,gate:false});this.trim();}
 gate(closing=false,landing=false){this.pulses.push({age:0,angle:Math.PI/2,power:landing?(closing?2.2:1.6):.7,gate:true});this.trim();}
 trim(){if(this.pulses.length>6)this.pulses.shift();}
 step(dt,actors=[],strength=.45){
  dt=Math.max(0,Math.min(.1,dt));const living=actors.filter(p=>p.hp>0),speed=living.length?living.reduce((n,p)=>n+Math.hypot(p.vx||0,p.vy||0),0)/living.length:0;
  this.phase+=speed*dt/84*TAU;this.envelope+=(clamp(speed/115,0,1)-this.envelope)*(1-Math.exp(-dt*12));
  const shared=actors.length>1?.58:1;let x=Math.sin(this.phase)*2.1*this.envelope,y=(Math.cos(this.phase*2)-.2)*2.7*this.envelope;
  for(const p of this.pulses){p.age+=dt;const k=Math.sin(p.age*(p.gate?29:38))*Math.exp(-p.age*(p.gate?8:14))*p.power*(p.gate?12:10);x+=Math.cos(p.angle)*k;y+=Math.sin(p.angle)*k;}
  this.pulses=this.pulses.filter(p=>p.age<(p.gate?.9:.36));
  return{x:clamp(x*strength*shared,-11,11),y:clamp(y*strength*shared,-13,13),stride:this.phase,envelope:this.envelope};
 }
}
