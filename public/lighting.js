import {clamp} from './shared.js';
import {drawAnimatedFrame} from './animation-layout.js';
const textures=new Map(),masks=new WeakMap(),lights=[];let frameLights=[],enabled=true,limit=24,density=1;
const colors=['#f4a85d','#8bd875','#b693f5'];
function texture(color){let image=textures.get(color);if(!image){image=document.createElement('canvas');image.width=image.height=192;const c=image.getContext('2d'),g=c.createRadialGradient(96,96,0,96,96,96);g.addColorStop(0,color);g.addColorStop(.25,color+'a0');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,192,192);textures.set(color,image);}return image;}
export function configureLighting(active,quality){enabled=active;limit=quality==='low'?8:quality==='medium'?16:24;}
export const adaptiveLightLimit=(limit,scale)=>Math.min(limit,Math.max(6,Math.round(limit*Math.sqrt(clamp(scale,.12,1)))));
export function setLightingDensity(scale){density=clamp(scale,.12,1);}
export function resetLighting(){lights.length=0;frameLights=[];}
export function emitLight(x,y,color,radius=130,life=.35,power=.4){if(!enabled)return;if(lights.length>=40)lights.shift();lights.push({x,y,color,r:radius,life,total:life,power});}
export function stepLighting(dt,round,time,projectiles=[],phase=1){
 for(let i=lights.length-1;i>=0;i--){lights[i].life-=dt;if(lights[i].life<=0)lights.splice(i,1);}
 frameLights=[];if(!enabled)return;const cap=adaptiveLightLimit(limit,density);
 for(const[x,y]of [[85,105],[1115,105],[85,665],[1115,665]])frameLights.push({x,y:y-12,r:235,color:colors[round],power:.32+Math.sin(time*7+x)*.025});
 for(const[x,y]of [[390,240],[830,520]])frameLights.push({x,y,r:round===1?245:200,color:round===0?'#f4cf8d':round===1?'#b2d78d':'#bbb6f5',power:.1+(phase-1)*.012});
 for(const p of projectiles){if(frameLights.length>=cap-2)break;frameLights.push({x:p.x,y:p.y-12,r:p.enemy?92:65,color:p.color==='ice'?'#a7e5ff':p.color==='seed'?'#8cdb65':p.color==='void'?'#b18aef':'#f0d19b',power:p.enemy?.28:.16});}
 for(const l of (cap>frameLights.length?lights.slice(-(cap-frameLights.length)):[])){const t=l.life/l.total;frameLights.push({...l,power:l.power*Math.sin(Math.min(1,t*2)*Math.PI/2),r:l.r*(1.1-t*.2)});}
}
export function drawGroundLighting(c,round){
 if(!enabled)return;c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.09;c.fillStyle=['#bdb1b8','#a1bbaa','#b0a4c6'][round];c.fillRect(0,0,1200,760);c.globalCompositeOperation='screen';
 for(const l of frameLights){c.globalAlpha=l.power;c.drawImage(texture(l.color),l.x-l.r,l.y-l.r*.7,l.r*2,l.r*1.4);}c.restore();
}
export function drawLightSpill(c){if(!enabled||density<.4)return;c.save();c.globalCompositeOperation='screen';for(const l of frameLights){c.globalAlpha=l.power*.23;c.drawImage(texture(l.color),l.x-l.r,l.y-l.r,l.r*2,l.r*2);}c.restore();}
export function drawCastShadow(c,image,p,w,h,offset){
 if(!enabled)return;let source=null,best=0;
 for(const l of frameLights){const d=Math.hypot(l.x-p.x,l.y-p.y),strength=l.power*Math.max(0,1-d/(l.r*2));if(strength>best){best=strength;source=l;}}
 if(!source||best<.025)return;
 let mask=masks.get(image);if(!mask){mask=document.createElement('canvas');mask.width=image.width;mask.height=image.height;mask.ironFrame=image.ironFrame;const q=mask.getContext('2d');q.fillStyle='#020509';q.fillRect(0,0,mask.width,mask.height);q.globalCompositeOperation='destination-in';q.drawImage(image,0,0);masks.set(image,mask);}
 const angle=Math.atan2(p.y-source.y,p.x-source.x);c.save();c.globalAlpha=clamp(best,.06,.24);c.translate(p.x,p.y+8);c.rotate(angle+Math.PI/2);c.scale(1,clamp(Math.hypot(p.x-source.x,p.y-source.y)/320,.25,.7));drawAnimatedFrame(c,mask,-w/2,-h+offset,w,h);c.restore();
}
export function lightingStats(){return{enabled,active:frameLights.length,limit,adaptiveLimit:adaptiveLightLimit(limit,density),density,textures:textures.size};}
