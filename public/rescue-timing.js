import {REVIVE,clamp} from './shared.js';
export function rescuePose(p,now){
 const a=p.facing||0,x=Math.cos(a),y=Math.sin(a),direction=Math.abs(x)>.65?(x>0?1:3):y<0?2:0;
 if(p.hp<=0)return{row:4+direction,position:0,phase:'down',downPose:true};
 if(p.reviveTarget&&p.revive>0){
  const age=p.revive;
  return{row:direction,position:age<.5?age/.5*3:4+(1-Math.cos((age-.5)*5))*.5,phase:'help'};
 }
 const moving=Math.hypot(p.vx||0,p.vy||0)>12,acting=(p.attackAt??-10)>=(p.revivedAt??-10)||p.dodgeUntil>now;
 const rise=now-(p.revivedAt??-10);
 if(!moving&&!acting&&rise>=0&&rise<REVIVE.recovery&&(p.lastHurt??-10)<=(p.revivedAt??-10))return{row:4+direction,position:clamp(rise/REVIVE.recovery,0,1)*7,phase:'rise'};
 const aid=now-(p.aidAt??-10);
 if(!moving&&p.aidUntil>now&&(p.attackAt??-10)<p.aidAt)return{row:direction,position:6+clamp(aid/.55,0,1),phase:'finish'};
 return null;
}
