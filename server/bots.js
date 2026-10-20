import { usePotion } from './loot.js';
import { CLASSES, COSTS, WORLD, distance, clamp, hazardContains } from '../public/shared.js';

const BOSSES_RADIUS=room=>room.boss.radius||60;
export const BOT_NAMES = { knight: 'Aldric', archer: 'Lyra', rogue: 'Nyx' };
function direction(x,y) { const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d}; }
const unsafe=(pos,h,padding=23)=>!h.warningOnly&&hazardContains(pos,h,padding);
export function routeClear(a,b,solids,padding=0){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;return !solids.some(o=>{const t=l?clamp(((o.x-a.x)*dx+(o.y-a.y)*dy)/l,0,1):0;return Math.hypot(o.x-a.x-t*dx,o.y-a.y-t*dy)<o.r+padding;});}
export function rescueAssignments(players,threats,now){
 const live=players.filter(p=>p.connected&&p.hp>0&&!p.eliminated),assigned=new Map();
 for(const down of players.filter(p=>p.hp<=0&&!p.eliminated&&p.downAt!==null&&now-p.downAt<19.7)){
  const current=live.find(p=>!p.isBot&&p.reviveTarget===down.id);if(current){assigned.set(down.id,current.id);continue;}
  if(threats.some(h=>unsafe(down,h)&&h.at<now+1.2))continue;
  const candidates=live.filter(p=>p.isBot&&![...assigned.values()].includes(p.id)&&!threats.some(h=>unsafe(p,h)&&h.at<now+.4)).sort((a,b)=>distance(a,down)+(a.hp/a.maxHp<.3?180:0)-distance(b,down)-(b.hp/b.maxHp<.3?180:0));
  if(candidates[0])assigned.set(down.id,candidates[0].id);
 }
 return assigned;
}


// Companions use exactly the same input, skill, collision, energy and damage
// paths as humans. They never set HP, damage, cooldowns or battle outcomes.
export function thinkBots(room,staticObstacles) {
  if(room.state!=='battle'||!room.boss)return;
  const mainBoss=room.boss;
  const solids=[...staticObstacles,...room.hazards.filter(h=>h.solid&&h.at<=room.now)];
  const threats=room.hazards.filter(h=>!h.solid&&h.end>room.now&&h.at<room.now+1.6);
  const members=[...room.players.values()],enemyProjectiles=room.projectiles.filter(q=>q.enemy),minions=room.minions.filter(m=>m.hp>0&&room.now>=m.activeAt),assignments=rescueAssignments(members,threats,room.now),targetLoads=new Map();
  for(const p of room.players.values()) {
    if(!p.isBot||!room.active(p)||room.now<(p.thinkAt||0))continue;
    p.thinkAt=room.now+.15;
    if(p.potions[0]==='heal'&&p.hp<p.maxHp*.55||p.potions[0]==='ice'&&room.boss.state==='chase')usePotion(room,p);
    const nearest=[...minions].sort((a,b)=>(distance(p,a)+(targetLoads.get(a.id)||0)*130)-(distance(p,b)+(targetLoads.get(b.id)||0)*130))[0];
    const boss=nearest&&distance(p,nearest)<(p.classId==='archer'?480:230)?nearest:mainBoss;
    targetLoads.set(boss.id,(targetLoads.get(boss.id)||0)+1);
    const aim=direction(boss.x-p.x,boss.y-p.y),dist=distance(p,boss);
    const desired=p.classId==='archer'?290:boss===mainBoss?96:67;
    const danger=threats.some(h=>unsafe(p,h));
    const down=members.find(a=>assignments.get(a.id)===p.id);
    const reviving=down&&distance(p,down)<73&&!danger;
    let mx=0,my=0;
    const goal=down&&!danger?down:boss,goalRange=goal===down?48:desired;
    if(!reviving) {
      if(dist>desired+18){mx=aim.x;my=aim.y;}else if(dist<desired-22){mx=-aim.x;my=-aim.y;}
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
        score+=(x*mx+y*my)*3;
        if(!danger&&i===24&&distance(p,goal)>=goalRange-22&&distance(p,goal)<=goalRange+18)score+=8;
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
