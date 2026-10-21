import {clamp} from './shared.js';
export const WALK_FRAMES=12;
export function walkFacing(angle){const x=Math.cos(angle),y=Math.sin(angle);return Math.abs(x)>.65?{direction:'east',flip:x<0}:{direction:y<0?'north':'south',flip:false};}
export function bossPose(b,time,now,walkPhase=0){
 const elapsed=Math.max(0,now-(b.startedAt??now)),progress=clamp(elapsed/Math.max(.01,(b.until??now+1)-(b.startedAt??now)),0,1);
 if(b.state==='chase')return{mode:'walk',position:(walkPhase-Math.floor(walkPhase))*12+1e-8,rate:12};
 if(b.state==='windup')return{mode:'direction',position:Math.min(1,progress*1.3),anticipation:Math.sin(progress*Math.PI*.5),progress};
 if(b.state==='execute')return{mode:'direction',position:2+clamp(elapsed/(b.executeFor||.45),0,1)*3,impact:Math.sin(progress*Math.PI),progress};
 if(b.state==='recover')return{mode:'recover',position:5,progress};
 if(b.state==='fallen')return{mode:'base',row:4,position:5};
 if(b.state==='dormant')return{mode:'base',row:0,position:0};
 if(b.state==='awakening'||b.state==='transition')return{mode:'base',row:5,position:clamp(elapsed/(b.state==='awakening'?4.4:1.1)*5,0,5)};
 return{mode:'base',row:0,position:time*5%6};
}
export function actorMotion(p,time,now,boss=false){
 const hurt=Math.max(0,now-(p.lastHurt??p.hurtAt??-10)),recoil=hurt<.23?Math.sin(hurt/.23*Math.PI)*(1-hurt/.23):0;
 const a=p.facing||0,speed=Math.hypot(p.vx||0,p.vy||0),moving=boss?p.state==='chase':speed>12;
 const cycle=(p.walkPhase??time*(boss?1.2:1.9))*Math.PI*2;
 let lift=moving?-Math.abs(Math.sin(cycle))* (boss?2.6:1.3):Math.sin(time*(boss?2.3:2.8))*(boss?1:.45),lean=moving?Math.sin(cycle)*(boss?.012:.018):0;
 let sx=1,sy=1;
 if(boss){const q=bossPose(p,time,now);if(q.mode==='direction'&&p.state==='windup'){sy=1-q.anticipation*.025;sx=1+q.anticipation*.012;lean+=Math.cos(a)*q.anticipation*.025;}if(q.mode==='direction'&&p.state==='execute')lean+=Math.cos(a)*Math.sin(q.progress*Math.PI)*.055;if(q.mode==='recover'){lift+=Math.sin(q.progress*Math.PI)*2;lean-=Math.cos(a)*Math.sin(q.progress*Math.PI)*.025;}}
 else{const dt=now-(p.attackAt??-10),total=p.attackFor||.52;if(dt>=0&&dt<total){const t=dt/total;lean+=Math.cos(a)*Math.sin(t*Math.PI)*(p.classId==='knight'?.055:p.classId==='archer'?-.025:.04);lift-=Math.sin(t*Math.PI)*(p.classId==='rogue'?1.8:.6);}if(p.block){sx=1.02;sy=.98;}}
 if(!boss&&p.emoteUntil>now){const beat=(now-p.emoteAt)/1.15*Math.PI*2;lift-=Math.abs(Math.sin(beat*2))*2.2;lean+=Math.sin(beat)*.045;sx*=1+Math.sin(beat*2)*.012;sy*=1-Math.sin(beat*2)*.012;}
 return{lift:lift+recoil*(boss?1.6:.8),lean:lean-recoil*Math.cos(a)*(boss?.025:.055),sx,sy,recoil};
}
