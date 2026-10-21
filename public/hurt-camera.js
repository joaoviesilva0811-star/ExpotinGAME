import {clamp} from './shared.js';
import {damageProfile} from './damage-response.js';
export class HurtCamera{
 constructor(){this.hits=[];}
 hit(angle,amount,blocked=false,maxHp=100,flags={}){
  if(!Number.isFinite(amount)||amount<=0)return;
  const profile=damageProfile(amount,maxHp,{blocked,...flags});
  this.hits.push({angle:Number.isFinite(angle)?angle:0,age:0,power:profile.severity,profile});
  if(this.hits.length>4)this.hits.shift();
 }
 step(dt,strength=.45){
  let x=0,y=0,flash=0;const latest=this.hits.at(-1);
  for(const h of this.hits){h.age+=Math.max(0,dt);const kick=Math.sin(h.age*35)*Math.exp(-h.age*12)*h.power*58*strength;x+=Math.cos(h.angle)*kick;y+=Math.sin(h.angle)*kick;flash=Math.max(flash,Math.max(0,1-h.age/.36)*h.power);}
  this.hits=this.hits.filter(h=>h.age<.55);
  return{x:clamp(x,-14,14),y:clamp(y,-14,14),flash,angle:latest?.angle||0,blocked:latest?.profile.blocked||false};
 }
 reset(){this.hits=[];}
}
