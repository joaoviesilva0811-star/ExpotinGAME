import {ROUND_OUTRO_TIME} from '../public/narrative-timing.js';
import {KEYS} from '../public/keys.js';
import {clamp} from '../public/shared.js';
export function dropBossKey(room){
 if(room.keys.some(k=>k.round===room.round))return;
 const info=KEYS[room.round];room.keyDrop={...info,round:room.round,x:room.boss.x,y:room.boss.y,spawned:room.now,collectedAt:null,carrier:null};room.keySceneUntil=room.now+8.5;room.gateUnlocked=false;
 for(const p of room.players.values()){p.input={x:0,y:0};p.vx=p.vy=0;}
 room.emit('keyDrop',{round:room.round,x:room.boss.x,y:room.boss.y,name:info.name,color:info.color});
}
export function tickBossKeys(room,dt,solids){
 const key=room.keyDrop;
 if(key&&!key.collectedAt){
  const heroes=[...room.players.values()].filter(p=>p.connected&&p.hp>0&&!p.eliminated).sort((a,b)=>Math.hypot(a.x-key.x,a.y-key.y)-Math.hypot(b.x-key.x,b.y-key.y));
  const carrier=heroes[0];
  if(carrier){
   for(const [i,p]of heroes.entries()){
    const target=i===0?key:{x:key.x+Math.cos(i*2.4)*85,y:key.y+Math.sin(i*2.4)*65};const dx=target.x-p.x,dy=target.y-p.y,dist=Math.hypot(dx,dy);
    if(dist>30){const angle=Math.atan2(dy,dx),step=Math.min(dist,dt*170);let best=-Infinity,heading=angle;
     for(const turn of [0,.6,-.6,1.2,-1.2,1.8,-1.8]){const a=angle+turn,probe={x:p.x+Math.cos(a)*Math.max(40,step),y:p.y+Math.sin(a)*Math.max(40,step)};let score=-Math.hypot(probe.x-target.x,probe.y-target.y)-Math.abs(turn)*3;if(solids.some(o=>Math.hypot(probe.x-o.x,probe.y-o.y)<o.r+19))score-=1000;if(score>best){best=score;heading=a;}}
     const old={x:p.x,y:p.y};room.move(p,Math.cos(heading)*step,Math.sin(heading)*step);p.vx=(p.x-old.x)/Math.max(.001,dt);p.vy=(p.y-old.y)/Math.max(.001,dt);p.facing=heading;
    }else p.vx=p.vy=0;
   }
   // The magical key is attracted to its approaching bearer; ownership still
   // requires actual server-side proximity, never a client pickup command.
   if(room.now-key.spawned>2.5){const dx=carrier.x-key.x,dy=carrier.y-key.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*210);if(d){key.x=clamp(key.x+dx/d*step,55,1145);key.y=clamp(key.y+dy/d*step,55,705);}}
   if(room.now-key.spawned>=2.5&&Math.hypot(carrier.x-key.x,carrier.y-key.y)<=44){key.collectedAt=room.now;key.carrier=carrier.id;if(!room.keys.some(k=>k.round===key.round))room.keys.push({round:key.round,id:key.id,name:key.name,color:key.color,carrier:carrier.id,at:room.now});room.gateUnlocked=true;
    for(const p of room.players.values())p.vx=p.vy=0;
    room.secretUnlocked=room.wins===3&&[0,1,2].every(round=>room.keys.some(k=>k.round===round));
    room.keySceneUntil=Math.max(room.keySceneUntil,room.now+4.5);
    if(room.state==='ending'){room.endingAt=Math.max(room.endingAt,room.keySceneUntil);room.transitionAt=room.endingAt+(room.secretUnlocked?18:14);}
    if(room.state==='round_end'){room.outroStarted=Math.max(room.outroStarted,room.keySceneUntil-6);room.transitionAt=Math.max(room.transitionAt,room.outroStarted+ROUND_OUTRO_TIME);}
    room.emit('keyPickup',{round:key.round,owner:carrier.id,name:key.name,color:key.color,x:key.x,y:key.y});
   }
  }
 }
 if(room.state==='ending'&&room.secretUnlocked&&!room.vaultOpenedAt&&room.now>=room.endingAt+5){room.vaultOpenedAt=room.now;room.emit('secretGate',{keys:room.keys.map(k=>k.id),text:'As três chaves abriram a Câmara da Coroa.'});}
}
