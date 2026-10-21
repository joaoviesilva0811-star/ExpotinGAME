import {clamp} from './shared.js';
const weights={knight:1,archer:.22,rogue:.42};
export class ImpactFeel{
 constructor(){this.pulses=[];this.last=-10;}
 hit(classId,angle,amount,time){if(amount<=0||time-this.last<.07)return;this.last=time;this.pulses.push({angle,age:0,power:(weights[classId]||.3)*clamp(amount/25,.4,1.4)});if(this.pulses.length>3)this.pulses.shift();}
 step(dt,strength){let x=0,y=0;for(const p of this.pulses){p.age+=dt;const t=p.age/.15,k=Math.sin(t*Math.PI*2)*Math.exp(-t*4)*p.power*8*strength;x+=Math.cos(p.angle)*k;y+=Math.sin(p.angle)*k;}this.pulses=this.pulses.filter(p=>p.age<.15);return{x:clamp(x,-3,3),y:clamp(y,-3,3)};}
 reset(){this.pulses=[];this.last=-10;}
}
