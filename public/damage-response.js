import {clamp} from './shared.js';

// Presentation only: no hit stop, movement lock or changes to damage/energy.
export function damageProfile(amount,maxHp=100,{blocked=false,guardBroken=false,downed=false}={}){
 const ratio=Math.max(0,Number(amount)||0)/Math.max(1,Number(maxHp)||100);
 const severity=Math.max(guardBroken||downed?.65:0,clamp(ratio*2.8,.12,1)*(blocked&&!guardBroken?.35:1));
 return{severity,blocked:!!blocked&&!guardBroken,guardBroken:!!guardBroken,downed:!!downed,heavy:guardBroken||downed||ratio>=.2};
}
export function recoilOffset(p,now,boss=false){
 const age=now-(p.lastHurt??p.hurtAt??-10);
 if(age<0||age>.32||p.hp<=0)return{x:0,y:0};
 const angle=p.hurtAngle??((p.facing||0)+Math.PI),strength=clamp((p.hurtAmount??20)/25,.25,1.5)*(p.hurtBlocked?.35:1);
 const k=Math.sin(age/.32*Math.PI)*Math.exp(-age*6)*(boss?2.8:6)*strength;
 return{x:Math.cos(angle)*k,y:Math.sin(angle)*k};
}
export function impactShake(event,players=[]){
 if(!players.length)return 0;
 const radius=Math.max(40,event.r||event.width||100);
 const d=Math.min(...players.filter(p=>p.hp>0).map(p=>Math.hypot(p.x-event.x,p.y-event.y)));
 if(!Number.isFinite(d))return 0;
 return(event.minor?4:18)*clamp(1-Math.max(0,d-radius*.7)/470,.08,1);
}
// Hold recently lost health, then let its gold segment catch the red bar.
export class HealthMemory{
 constructor(){this.values=new Map();}
 sample(id,hp,maxHp,time){
  const value=clamp(hp/Math.max(1,maxHp),0,1);let s=this.values.get(id);
  if(!s||s.maxHp!==maxHp||time<s.time){s={value,trail:value,hold:time,time,maxHp};this.values.set(id,s);}
  if(value<s.value)s.hold=time+.42;
  if(value>s.value)s.trail=Math.max(value,s.trail);
  if(time>s.hold)s.trail=value+(s.trail-value)*Math.exp(-Math.max(0,time-Math.max(s.time,s.hold))*5.5);
  s.value=value;s.time=time;s.trail=clamp(s.trail,value,1);return s.trail*100;
 }
 reset(){this.values.clear();}
}
