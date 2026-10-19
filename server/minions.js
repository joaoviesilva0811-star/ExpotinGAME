import { WORLD, clamp, distance, BOSSES } from '../public/shared.js';

// Every minion, spawn and hit is simulated on the authoritative room server.
export const MINIONS = [
  {kind:'revenant',name:'Guarda Condenado',hp:74,speed:66,range:65,damage:11,interval:3.4},
  {kind:'thornling',name:'Filhote de Espinhos',hp:62,speed:79,range:60,damage:9,interval:3.1},
  {kind:'acolyte',name:'Acólito do Vazio',hp:68,speed:58,range:300,damage:12,interval:4.2}
];
export function tickMinions(room,dt){
  const b=room.boss,info=MINIONS[room.round];
  room.minions=room.minions.filter(m=>m.hp>0);
  if(room.now>=room.nextWave){
    const cap=b.phase===3?5:4,number=Math.min(cap-room.minions.length,room.players.size>=3?2:1);
    for(let i=0;i<number;i++){
      const a=(room.waveIndex++*2.399)+i*.7;
      let x=clamp(b.x+Math.cos(a)*270,100,WORLD.w-100),y=clamp(b.y+Math.sin(a)*225,95,WORLD.h-95);
      // A spawn must not trap a player without warning.
      const near=[...room.players.values()].find(p=>room.active(p)&&distance(p,{x,y})<105);
      if(near){x=near.x<600?1080:120;y=near.y<380?650:110;}
      const m={id:`minion-${++room.eventId}`,x,y,vx:0,vy:0,hp:info.hp,maxHp:info.hp,kind:info.kind,round:room.round,activeAt:room.now+2,attackAt:room.now+3.5,state:'spawn',facing:0,hurtAt:-10,animAt:room.now};
      room.minions.push(m);room.emit('summon',{x,y,kind:m.kind,color:BOSSES[room.round].color});
    }
    room.nextWave=room.now+(b.phase===3?23:29);
    if(number>0)room.emit('notice',{text:`${info.name}: lacaios invocados! Elimine-os para recuperar energia.`});
  }
  for(const m of room.minions){
    if(room.now<m.activeAt)continue;
    for(const poison of m.poison||[]){if(poison.ticks>0&&room.now>=poison.next){const owner=room.players.get(poison.owner);if(owner)room.hitMinion(owner,m,8);poison.ticks--;poison.next+=1;}}
    m.poison=(m.poison||[]).filter(x=>x.ticks>0);if(m.hp<=0)continue;
    const target=[...room.players.values()].filter(p=>room.active(p)).sort((a,b)=>distance(m,a)-distance(m,b))[0];if(!target)continue;
    const dx=target.x-m.x,dy=target.y-m.y,d=Math.hypot(dx,dy)||1;if(!['windup','recover'].includes(m.state))m.facing=Math.atan2(dy,dx);
    if(m.state==='windup'){
      m.vx=m.vy=0;
      if(room.now>=m.until){
        if(m.kind==='acolyte')room.projectiles.push({id:`bolt-${++room.eventId}`,enemy:true,x:m.x,y:m.y,vx:Math.cos(m.aim)*155,vy:Math.sin(m.aim)*155,damage:info.damage,color:'void',left:650});
        m.state='recover';m.until=room.now+.85;m.animAt=room.now;
      }
      continue;
    }
    if(m.state==='recover'&&room.now<m.until)continue;
    if(d>info.range-10){m.state='chase';m.vx=dx/d*info.speed*(room.now<m.slowUntil?.4:1);m.vy=dy/d*info.speed*(room.now<m.slowUntil?.4:1);room.move(m,m.vx*dt,m.vy*dt);}
    else{m.state='idle';m.vx=m.vy=0;}
    // Gentle separation prevents unreadable stacks of minions.
    for(const other of room.minions){if(other===m)continue;const dist=distance(m,other);if(dist<35&&dist>0){room.move(m,(m.x-other.x)/dist*18*dt,(m.y-other.y)/dist*18*dt);}}
    if(d<info.range+15&&room.now>=m.attackAt){
      m.state='windup';m.animAt=room.now;m.until=room.now+1.15;m.attackAt=room.now+info.interval;m.aim=m.facing;
      if(m.kind!=='acolyte')room.hazards.push({id:`claw-${++room.eventId}`,minion:true,x:m.x,y:m.y,r:info.range+12,shape:'cone',angle:m.facing,spread:.72,damage:info.damage,at:m.until,end:m.until+.25,next:m.until,started:room.now,telegraph:true});
      room.emit('minionAttack',{x:m.x,y:m.y,kind:m.kind,angle:m.facing});
    }
  }
}
