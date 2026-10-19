import { usePotion } from './loot.js';
import { CLASSES, COSTS, WORLD, distance, clamp, hazardContains } from '../public/shared.js';

export const BOT_NAMES = { knight: 'Aldric', archer: 'Lyra', rogue: 'Nyx' };
function direction(x,y) { const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d}; }
const unsafe=(pos,h,padding=23)=>!h.warningOnly&&hazardContains(pos,h,padding);

// Companions use exactly the same input, skill, collision, energy and damage
// paths as humans. They never set HP, damage, cooldowns or battle outcomes.
export function thinkBots(room,staticObstacles) {
  if(room.state!=='battle'||!room.boss)return;
  const mainBoss=room.boss;
  const solids=[...staticObstacles,...room.hazards.filter(h=>h.solid&&h.at<=room.now)];
  const threats=room.hazards.filter(h=>!h.solid&&h.end>room.now&&h.at<room.now+1.6);
  for(const p of room.players.values()) {
    if(!p.isBot||!room.active(p)||room.now<(p.thinkAt||0))continue;
    p.thinkAt=room.now+.15;
    if(p.potions[0]==='heal'&&p.hp<p.maxHp*.55||p.potions[0]==='ice'&&room.boss.state==='chase')usePotion(room,p);
    const nearest=room.minions.filter(m=>m.hp>0&&room.now>=m.activeAt).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    const boss=nearest&&distance(p,nearest)<(p.classId==='archer'?480:230)?nearest:mainBoss;
    const aim=direction(boss.x-p.x,boss.y-p.y),dist=distance(p,boss);
    const desired=p.classId==='archer'?290:boss===mainBoss?96:67;
    const danger=threats.some(h=>unsafe(p,h));
    const down=[...room.players.values()].filter(a=>a.id!==p.id&&a.hp<=0&&!a.eliminated&&a.downAt!==null&&room.now-a.downAt<19.7).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    const reviving=down&&distance(p,down)<73&&!danger;
    let mx=0,my=0;
    if(down&&!reviving&&!danger) { const d=direction(down.x-p.x,down.y-p.y);mx=d.x;my=d.y; }
    else if(!reviving) {
      if(dist>desired+18){mx=aim.x;my=aim.y;}else if(dist<desired-22){mx=-aim.x;my=-aim.y;}
      // Evaluate directions at normal running distance. Include pillars and
      // telegraphs so companions can leave poison and move around solid roots.
      let best=-Infinity;
      for(let i=0;i<25;i++) {
        const angle=i/24*Math.PI*2,x=i===24?0:Math.cos(angle),y=i===24?0:Math.sin(angle);
        const next={x:p.x+x*CLASSES[p.classId].speed*.85,y:p.y+y*CLASSES[p.classId].speed*.85};
        let score=-Math.abs(distance(next,boss)-desired)*.12;
        if(next.x<WORLD.margin+10||next.x>WORLD.w-WORLD.margin-10||next.y<WORLD.margin+10||next.y>WORLD.h-WORLD.margin-10)score-=2000;
        for(const h of threats)if(unsafe(next,h))score-=danger?1500:800;
        for(const q of room.projectiles.filter(q=>q.enemy)){const t=.55,near={x:q.x+q.vx*t,y:q.y+q.vy*t};if(distance(next,near)<45)score-=900;}
        for(const o of solids)if(distance(next,o)<o.r+30)score-=1300;
        score+=(x*mx+y*my)*3;
        if(!danger&&i===24&&dist>=desired-22&&dist<=desired+18)score+=8;
        if(score>best){best=score;mx=x;my=y;}
      }
    }
    let block=false;
    const imminent=threats.find(h=>unsafe(p,h)&&h.at-room.now<.22&&h.at>=room.now);
    if(imminent&&!imminent.breaks&&p.energy>=18&&p.classId==='knight')block=true;
    const input={type:'input',seq:p.lastSeq+1,x:clamp(mx,-1,1),y:clamp(my,-1,1),ax:aim.x,ay:aim.y,attack:!reviving&&!block,block,revive:!!reviving};
    room.command(p.id,input);
    if(reviving||block)continue;
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
