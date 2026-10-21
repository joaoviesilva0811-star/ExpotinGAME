import {clamp} from './shared.js';
// Small contact geometry uses authoritative impacts, independent of FX quality.
// Blood/steel colors differ; no full-screen flash or blur filter.
export class HurtEffects{
 constructor(){this.contacts=[];this.critical=0;this.mask=null;}
 hit(e,profile,time){this.contacts.push({...e,profile,at:time});if(this.contacts.length>24)this.contacts.shift();}
 reset(){this.contacts=[];this.critical=0;}
 ground(c,time){
  this.contacts=this.contacts.filter(h=>time-h.at<.42);
  for(const h of this.contacts){const t=clamp((time-h.at)/.42,0,1),r=12+t*27,a=h.angle||0,color=h.profile.blocked?'#c8efff':h.profile.guardBroken?'#ffb879':'#ed8290';
   c.save();c.translate(h.x,h.y-20);c.globalAlpha=(1-t)**2;c.strokeStyle=color;c.lineWidth=h.profile.heavy?2.4:1.4;
   c.beginPath();c.ellipse(0,10,r,r*.42,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<7;i++){const dir=a+(i-3)*.38,near=8+t*10,far=near+(1-t)*12*(i%2?1:.6);c.beginPath();c.moveTo(Math.cos(dir)*near,Math.sin(dir)*near);c.lineTo(Math.cos(dir)*far,Math.sin(dir)*far);c.stroke();}
   if(h.profile.guardBroken){c.font='bold 11px Pixelify,monospace';c.textAlign='center';c.fillStyle=color;c.fillText('DEFESA QUEBRADA',0,-48-t*12);}
   c.restore();
  }
 }
 overlay(c,view,dt,time,ratio,{enabled=true,reducedMotion=false,shared=false}={}){
  const target=enabled&&!shared&&ratio>0?clamp((.3-ratio)/.25,0,1):0;
  this.critical+=(target-this.critical)*(1-Math.exp(-Math.max(0,dt)*5));
  if(!enabled)return;
  if(!this.mask){this.mask=document.createElement('canvas');this.mask.width=600;this.mask.height=380;const m=this.mask.getContext('2d'),g=m.createRadialGradient(300,190,120,300,190,355);g.addColorStop(0,'transparent');g.addColorStop(.62,'#5b112a11');g.addColorStop(1,'#6b1637');m.fillStyle=g;m.fillRect(0,0,600,380);}
  c.save();const beat=reducedMotion?1:.88+Math.sin(time*5.7)*.12;
  if(this.critical>.005){c.globalAlpha=this.critical*.3*beat;c.drawImage(this.mask,0,0,1200,760);}
  if(view.flash>.005){
   const angle=view.angle+Math.PI;c.globalAlpha=Math.min(.55,view.flash*(shared?.3:.55));
   c.strokeStyle=view.blocked?'#a4dced':'#e76b82';c.lineWidth=4;c.beginPath();c.ellipse(600,380,550,330,0,angle-.11,angle+.11);c.stroke();
   c.translate(600+Math.cos(angle)*530,380+Math.sin(angle)*310);c.rotate(angle);
   c.fillStyle=view.blocked?'#c1edff':'#f4939e';c.beginPath();c.moveTo(7,-15);c.lineTo(-5,0);c.lineTo(7,15);c.lineTo(2,0);c.closePath();c.fill();
  }
  c.restore();
 }
}
