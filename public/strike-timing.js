import {clamp} from './shared.js';
import {facingRow} from './animation-state.js';
const hero={knight:['sweep','cleave','charge','ward'],archer:['shot','pierce','rain','frost'],rogue:['stab','cross','shadow','venom']};
const boss={varkhul:['cleave','slam','chains','riposte','cleave','riposte','chains','slam'],tharazul:['claw','stomp','breath','stomp','breath','roots','breath','roots'],azrakiel:['scythe','rift','rift','rift','lances','orbit','lances','orbit']};
export function heroStrike(p,now){
 const elapsed=now-(p.attackAt??-10),duration=p.attackFor||.52;if(p.hp<=0||elapsed<0||elapsed>=duration)return null;
 const action=hero[p.classId]?.[(p.attackSlot??-1)+1];if(!action)return null;
 const instant=p.attackSlot>=0,hit=p.classId==='archer'?.17:p.classId==='rogue'?.12:.18;
 // The server emits skills immediately: begin at release, then follow through
 // and reload. Basic anticipation instead ends exactly at the server hit time.
 const progress=instant?(elapsed/duration+.5)%1:elapsed<hit?elapsed/hit*.5:.5+(elapsed-hit)/Math.max(.01,duration-hit)*.5;
 return {clip:p.classId+'-'+action,progress,direction:facingRow(p.facing||0)};
}
export function bossStrike(b,round,now){
 if(!['windup','execute','recover'].includes(b.state))return null;
 const name=['varkhul','tharazul','azrakiel'][round],duration=Math.max(.01,(b.until??now+1)-(b.startedAt??now)),t=clamp((now-(b.startedAt??now))/duration,0,1);
 const progress=b.state==='windup'?t*.5:b.state==='execute'?.5+t*.25:.75+t*.249;
 return{clip:name+'-'+boss[name][b.attack??0],progress,direction:facingRow(b.facing||0)};
}
export function minionStrike(m,now){if(!['windup','recover'].includes(m.state))return null;const t=Math.max(0,now-m.animAt),action={revenant:'slash',thornling:'rake',acolyte:'bolt'}[m.kind];return{clip:m.kind+'-'+action,progress:m.state==='windup'?Math.min(.5,t/1.15*.5):.5+Math.min(.499,t/.85*.5),direction:facingRow(m.aim??m.facing??0)};}
export function strikeDirection(direction,mirrorEast,mirrorWest=false){if(mirrorWest&&direction>=6)return{row:8-direction,flip:true};return mirrorEast&&direction>=1&&direction<=3?{row:8-direction,flip:true}:{row:direction,flip:false};}
