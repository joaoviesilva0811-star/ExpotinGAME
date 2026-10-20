import {clamp} from './shared.js';
export class HurtCamera{
 constructor(){this.hits=[];}
 hit(angle,amount,blocked=false){this.hits.push({angle,age:0,power:clamp(amount/22,.2,1)*(blocked?.32:1)});if(this.hits.length>4)this.hits.shift();}
 step(dt,strength=.45){let x=0,y=0,flash=0;for(const h of this.hits){h.age+=dt;const kick=Math.sin(Math.min(1,h.age/.055)*Math.PI/2)*Math.exp(-h.age*15)*h.power*9*strength;x+=Math.cos(h.angle)*kick;y+=Math.sin(h.angle)*kick;flash=Math.max(flash,Math.max(0,1-h.age/.24)*h.power*strength);}this.hits=this.hits.filter(h=>h.age<.45);return{x,y,flash,angle:this.hits.at(-1)?.angle||0};}
 reset(){this.hits=[];}
}
