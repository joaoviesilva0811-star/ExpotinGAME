import {CLASSES, REVIVE, WORLD, distance, hazardContains} from '../public/shared.js';

export function routeClear(a,b,solids,padding=0){
 const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
 return !solids.some(o=>{const t=l?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.y-a.y)*dy)/l)):0;return Math.hypot(o.x-a.x-t*dx,o.y-a.y-t*dy)<o.r+padding;});
}
// A small visibility graph is used only during rescues, not on every combat
// tick. Waypoints go around pillars instead of steering forever into a wall.
export function rescueRoute(a,b,solids){
 if(routeClear(a,b,solids,19))return {point:b,length:distance(a,b)};
 const nodes=[a,b];
 for(const o of solids)for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,r=o.r+35,p={x:o.x+Math.cos(angle)*r,y:o.y+Math.sin(angle)*r};
  if(p.x>WORLD.margin+18&&p.x<WORLD.w-WORLD.margin-18&&p.y>WORLD.margin+18&&p.y<WORLD.h-WORLD.margin-18&&routeClear(p,p,solids,20))nodes.push(p);
 }
 const costs=nodes.map(()=>Infinity),previous=[],done=new Set();costs[0]=0;
 for(let step=0;step<nodes.length;step++){
  let n=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(n<0||costs[i]<costs[n]))n=i;
  if(n<0||!Number.isFinite(costs[n]))break;if(n===1){let first=1;while(previous[first]!==0)first=previous[first];return{point:nodes[first],length:costs[1]};}
  done.add(n);for(let j=1;j<nodes.length;j++)if(!done.has(j)&&routeClear(nodes[n],nodes[j],solids,19)){
   const cost=costs[n]+distance(nodes[n],nodes[j]);if(cost<costs[j]){costs[j]=cost;previous[j]=n;}
  }
 }
 return null;
}
function pointSafe(point,threats,now,until){
 return !threats.some(h=>!h.warningOnly&&!h.solid&&(h.end??Infinity)>now&&(h.at??now)<until&&hazardContains(point,h,22));
}
export function rescueApproach(bot,down,threats,now,{solids=[],boss=null,projectiles=[]}={}){
 const remaining=REVIVE.duration-(bot.reviveTarget===down.id?bot.revive||0:0),deadline=down.downAt+20;
 const points=[];if(distance(bot,down)<REVIVE.range-5)points.push({x:bot.x,y:bot.y});
 const angle=Math.atan2(bot.y-down.y,bot.x-down.x);
 for(let i=0;i<16;i++){const a=angle+i*Math.PI/8;points.push({x:down.x+Math.cos(a)*54,y:down.y+Math.sin(a)*54});}
 let best=null;
 for(const point of points){
  if(point.x<WORLD.margin+18||point.x>WORLD.w-WORLD.margin-18||point.y<WORLD.margin+18||point.y>WORLD.h-WORLD.margin-18||!routeClear(point,down,solids,2)||!routeClear(point,point,solids,21))continue;
  if(boss&&distance(point,boss)<(boss.radius||50)+26)continue;
  const travel=distance(bot,point)/(CLASSES[bot.classId]?.speed||120);
  if(now+travel+remaining>=deadline-.15||!pointSafe(point,threats,now,now+travel+remaining+.25))continue;
  if(projectiles.some(q=>q.enemy&&!routeClear(q,{x:q.x+q.vx*1.2,y:q.y+q.vy*1.2},[{...point,r:24}])) )continue;
  // Cheap direct candidates are tested first; compute at most one graph per
  // blocked approach after finding the nearest safe point.
  const score=distance(bot,point)+(routeClear(bot,point,solids,19)?0:200);
  if(!best||score<best.score)best={point,score};
 }
 if(!best)return null;
 const route=rescueRoute(bot,best.point,solids);if(!route||now+route.length/(CLASSES[bot.classId]?.speed||120)+remaining>=deadline-.15)return null;
 return{point:best.point,waypoint:route.point,length:route.length};
}
export function rescueAssignments(players,threats,now,context={}){
 const live=players.filter(p=>p.connected&&p.hp>0&&!p.eliminated),assigned=new Map(),reserved=new Set();
 const casualties=players.filter(p=>p.connected!==false&&p.hp<=0&&!p.eliminated&&p.downAt!==null&&now-p.downAt<19.7).sort((a,b)=>a.downAt-b.downAt+(a.isBot?0:-.5)-(b.isBot?0:-.5));
 for(const down of casualties){const human=live.find(p=>!p.isBot&&p.reviveTarget===down.id);if(human){assigned.set(down.id,human.id);reserved.add(human.id);}}
 for(const down of casualties){
  if(assigned.has(down.id))continue;let best=null;
  for(const bot of live){
   if(!bot.isBot||reserved.has(bot.id))continue;
   const approach=rescueApproach(bot,down,threats,now,context);if(!approach)continue;
   const score=approach.length+(bot.hp/bot.maxHp<.3?160:0)-(bot.reviveTarget===down.id?240:0)-(bot.classId==='knight'?18:0);
   if(!best||score<best.score)best={id:bot.id,score};
  }
  if(best){assigned.set(down.id,best.id);reserved.add(best.id);}
 }
 return assigned;
}
