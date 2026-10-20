import { usePotion } from './loot.js';
import { CLASSES, COSTS, WORLD, distance, clamp, hazardContains } from '../public/shared.js';

const BOSSES_RADIUS=room=>room.boss.radius||60;
export const BOT_NAMES = { knight: 'Aldric', archer: 'Lyra', rogue: 'Nyx' };
function direction(x,y) { const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d}; }
const unsafe=(pos,h,padding=23)=>!h.warningOnly&&hazardContains(pos,h,padding);
export {routeClear,rescueAssignments} from './rescue.js';
import {routeClear,rescueAssignments,rescueApproach} from './rescue.js';

// Companions use exactly the same input, skill, collision, energy and damage
// paths as humans. They never set HP, damage, cooldowns or battle outcomes.
export function thinkBots(room,staticObstacles) {
  if(room.state!=='battle'||!room.boss)return;
  const mainBoss=room.boss;
  const solids=[...staticObstacles,...room.hazards.filter(h=>h.solid&&h.at<=room.now)];
  const threats=room.hazards.filter(h=>!h.solid&&h.end>room.now&&h.at<room.now+1.6);
  const members=[...room.players.values()],enemyProjectiles=room.projectiles.filter(q=>q.enemy),minions=room.minions.filter(m=>m.hp>0&&room.now>=m.activeAt),targetLoads=new Map();
  const rescueThreats=room.hazards.filter(h=>!h.solid&&h.end>room.now),context={solids,boss:mainBoss,projectiles:enemyProjectiles};
  if(!room.rescuePlan||room.now>=room.rescuePlanAt){room.rescuePlan=rescueAssignments(members,rescueThreats,room.now,context);room.rescuePlanAt=room.now+.15;}
  const assignments=room.rescuePlan,protectedAllies=members.filter(a=>assignments.has(a.id)||[...assignments.values()].includes(a.id));
  for(const p of room.players.values()) {
    if(!p.isBot||!room.active(p)||room.now<(p.thinkAt||0))continue;
    p.thinkAt=room.now+.15;
    if(p.potions[0]==='heal'&&p.hp<p.maxHp*.55||p.potions[0]==='ice'&&room.boss.state==='chase')usePotion(room,p);
    const endangered=minions.filter(m=>protectedAllies.some(a=>distance(m,a)<230));
    const nearest=[...(endangered.length?endangered:minions)].sort((a,b)=>(distance(p,a)+(targetLoads.get(a.id)||0)*130)-(distance(p,b)+(targetLoads.get(b.id)||0)*130))[0];
    const boss=nearest&&distance(p,nearest)<(p.classId==='archer'?480:230)?nearest:mainBoss;
    targetLoads.set(boss.id,(targetLoads.get(boss.id)||0)+1);
    let aim=direction(boss.x-p.x,boss.y-p.y);const dist=distance(p,boss);
    const desired=p.classId==='archer'?290:boss===mainBoss?96:67;
    const danger=threats.some(h=>unsafe(p,h));
    const assigned=members.find(a=>a.hp<=0&&!a.eliminated&&assignments.get(a.id)===p.id);
    const approach=assigned?rescueApproach(p,assigned,rescueThreats,room.now,context):null,down=approach?assigned:null;
    const reviving=down&&distance(p,down)<81&&distance(p,approach.point)<8&&!danger;
    if(down)aim=direction(down.x-p.x,down.y-p.y);
    if(p.classId==='knight'&&p.energy>=40&&p.cds[2]<=room.now&&p.shieldUntil<=room.now&&(down||protectedAllies.some(a=>distance(a,p)<175)))room.skill(p,2);
    let mx=0,my=0;
    const goal=down&&!danger?approach.waypoint:boss,goalRange=down&&!danger?0:desired;
    if(!reviving) {
      const toward=direction(goal.x-p.x,goal.y-p.y),goalDistance=distance(p,goal);
      if(goalDistance>goalRange+18){mx=toward.x;my=toward.y;}else if(goalDistance<goalRange-22){mx=-toward.x;my=-toward.y;}
      // Evaluate directions at normal running distance. Include pillars and
      // telegraphs so companions can leave poison and move around solid roots.
      let best=-Infinity;
      for(let i=0;i<25;i++) {
        const angle=i/24*Math.PI*2,x=i===24?0:Math.cos(angle),y=i===24?0:Math.sin(angle);
        const next={x:p.x+x*CLASSES[p.classId].speed*.85,y:p.y+y*CLASSES[p.classId].speed*.85};
        let score=-Math.abs(distance(next,goal)-goalRange)*.12;
        for(const ally of members)if(ally.id!==p.id&&ally.hp>0){const separation=distance(next,ally);if(separation<62)score-=(62-separation)*.6;}
        if(!danger&&goal===boss)score+=(x*(p.steerX||0)+y*(p.steerY||0))*1.4;
        if(next.x<WORLD.margin+10||next.x>WORLD.w-WORLD.margin-10||next.y<WORLD.margin+10||next.y>WORLD.h-WORLD.margin-10)score-=2000;
        for(const h of threats)if(unsafe(next,h))score-=danger?1500:800;
        for(const q of enemyProjectiles){const t=.55,near={x:q.x+q.vx*t,y:q.y+q.vy*t};if(distance(next,near)<45)score-=900;}
        for(const o of solids)if(distance(next,o)<o.r+30)score-=1300;
        if(!routeClear(p,next,solids,17))score-=900;
        if(down&&goal!==boss)score-=distance(next,goal)*.15;
        score+=(x*mx+y*my)*3;
        if(!danger&&i===24&&distance(p,goal)>=goalRange-22&&distance(p,goal)<=goalRange+(down?7:18))score+=8;
        if(score>best){best=score;mx=x;my=y;}
      }
    }
    p.steerX=mx;p.steerY=my;
    let block=false;
    const imminent=threats.find(h=>unsafe(p,h)&&h.at-room.now<.22&&h.at>=room.now);
    if(imminent&&!imminent.breaks&&p.energy>=18&&p.classId==='knight')block=true;
    const input={type:'input',seq:p.lastSeq+1,x:clamp(mx,-1,1),y:clamp(my,-1,1),ax:aim.x,ay:aim.y,attack:!reviving&&!down&&!block&&dist<CLASSES[p.classId].range+(boss===mainBoss?BOSSES_RADIUS(room):18)&&routeClear(p,boss,solids),block,revive:!!reviving};
    room.command(p.id,input);
    if(reviving||block||down)continue;
    if(imminent&&imminent.breaks&&p.energy>=20)room.dodge(p);
    const use=slot=>{if(p.cds[slot]<=room.now&&p.energy>=COSTS[slot])return room.skill(p,slot);return false;};
    if(p.classId==='knight') {
      if((danger||p.hp<p.maxHp*.55)&&p.shieldUntil<=room.now)use(2);
      if((dist>170&&dist<330)||(boss.state==='windup'&&boss.phase===1&&dist<250))use(1);
      if(distance(p,boss)<145)use(0);
    } else if(p.classId==='archer'&&dist<530) {
      if(mainBoss.phase>=2&&mainBoss.slowUntil<=room.now&&p.energy>=60)use(2);
      if(p.energy>=55)use(1);
      use(0);
    } else if(p.classId==='rogue') {
      if(danger&&p.energy>=30&&p.cds[1]<=room.now){
        p.input.ax=mx||-aim.x;p.input.ay=my||-aim.y;use(1);p.input.ax=aim.x;p.input.ay=aim.y;
      }else if(dist>180&&dist<335)use(1);
      if(distance(p,boss)<145){if(p.energy>=60)use(2);use(0);}
    }
  }
}
