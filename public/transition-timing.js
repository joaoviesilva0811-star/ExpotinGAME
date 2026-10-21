export class TransitionTiming{
 constructor(){this.actors=new Map();}
 clear(){this.actors.clear();}
 sample(p,now){
  const attacking=p.hp>0&&now>=(p.attackAt??-10)&&now<(p.attackAt??-10)+(p.attackFor||.5);
  const speed=Math.hypot(p.vx||0,p.vy||0),mode=p.hp<=0?'down':p.reviveTarget?'rescue':p.emoteUntil>now?'emote':p.block?'guard':attacking?'attack':speed>12?'move':'idle';
  let a=this.actors.get(p.id);if(!a){a={mode,at:now,previous:mode};this.actors.set(p.id,a);}if(a.mode!==mode){a.previous=a.mode;a.mode=mode;a.at=now;}
  const x=Math.cos(p.facing||0),y=Math.sin(p.facing||0),direction=Math.abs(x)>.65?(x>0?'east':'west'):y<0?'north':'south',age=Math.max(0,now-a.at);
  const pose=(action,t)=>({group:action+'-'+direction,progress:Math.max(0,Math.min(.9999,t)),direction});
  if(mode==='guard')return pose('guard',age/.32);
  // Basic windup belongs to its attack clip; a settle clip here interrupted it.
  if(mode==='idle'&&a.previous==='guard'&&age<.22)return pose('guard',1-age/.22);
  if(mode==='idle'&&['move','attack','emote'].includes(a.previous)&&age<.3)return pose('settle',a.previous==='move'?age/.3:1-age/.3);
  return null;
 }
}
