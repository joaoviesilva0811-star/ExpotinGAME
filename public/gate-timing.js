import {clamp} from './shared.js';
export const GATE_CLOSE=.85,GATE_OPEN=1.2;
export function gateProgress(room,now,exit=false){
 const at=exit?room?.keyDrop?.collectedAt:room?.intro?.gateAt;
 if(exit&&!room?.gateUnlocked)return 1;
 if(!Number.isFinite(at))return exit?1:0;
 const t=clamp((now-at)/(exit?GATE_OPEN:GATE_CLOSE),0,1),smooth=t*t*(3-2*t);
 return exit?1-smooth:smooth;
}
export class GateTimeline{
 constructor(){this.reset();}
 reset(){this.key='';this.last=0;this.seen=new Set();}
 step(room,now){
  if(!room?.intro)return[];const key=room.code+':'+room.round+':'+room.intro.started;
  if(key!==this.key){this.key=key;this.last=now-.1;this.seen.clear();}
  const cues=[{id:'close',at:room.intro.gateAt,x:65,y:450,closing:true,landing:false},{id:'closed',at:room.intro.gateAt+GATE_CLOSE,x:65,y:450,closing:true,landing:true}];
  if(room.round<2&&room.gateUnlocked&&Number.isFinite(room.keyDrop?.collectedAt)){cues.push({id:'open',at:room.keyDrop.collectedAt,x:1112,y:420,closing:false,landing:false},{id:'opened',at:room.keyDrop.collectedAt+GATE_OPEN,x:1112,y:420,closing:false,landing:true});}
  const out=cues.filter(c=>!this.seen.has(c.id)&&c.at>this.last&&c.at<=now&&now-c.at<.35);for(const c of out)this.seen.add(c.id);this.last=Math.max(this.last,now);return out;
 }
}
