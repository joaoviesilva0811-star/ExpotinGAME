import { BOSSES, WORLD, clamp, distance } from '../public/shared.js';

export const ATTACK_NAMES=[
  ['Corte do Tirano','Tríade de Ferro','Ondas do Trono','Prisão dos Condenados','Investida Real — esquive da faixa!','Lâminas da Coroa','Estilhaços do Trono','Círculo do Carrasco'],
  ['Jardim de Espinhos','Sopro da Putrefação','Pisada e Onda Sísmica','Raízes em Cruz','Esporos Errantes','Círculo da Colheita — encontre a zona segura!','Sementes de Caça','Abraço da Mata'],
  ['Foice Dupla do Eclipse','Fissuras em Sequência','Sentença da Morte','Cruz da Catedral — saia das faixas!','Estrelas das Seis Asas','Pulso do Vazio — procure o centro!','Lanças do Horizonte','Trono do Eclipse']
];
const cycle=[0,3,1,6,2,5,7,4];
const ranges=[{near:[0,1,2,7],far:[3,4,5,6]},{near:[2,3,5,7],far:[0,1,4,6]},{near:[0,3,5,7],far:[1,2,4,6]}];
export function chooseBossAttack(round,index,dist,previous){
 const pool=dist<205?ranges[round].near:dist>315?ranges[round].far:cycle;
 let offset=index%pool.length;if(pool[offset]===previous)offset=(offset+1)%pool.length;
 return pool[offset];
}
export function bossTactic(round,phase,index,dist,previous){
 const scripts=[
  {near:[[0,1,2,7],[1,0,7,2],[7,1,2,0]],far:[[3,5,4,6],[4,3,6,5],[6,4,5,3]]},
  {near:[[2,3,7,5],[7,2,5,3],[5,7,3,2]],far:[[0,1,4,6],[4,6,0,1],[6,4,1,0]]},
  {near:[[0,3,5,7],[3,0,7,5],[7,5,0,3]],far:[[1,2,4,6],[2,6,1,4],[6,4,2,1]]}
 ];
 const reach=dist<245?'near':'far',pool=scripts[round][reach][Math.min(2,Math.max(0,phase-1))];
 let n=index%pool.length;if(pool[n]===previous)n=(n+1)%pool.length;
 return{kind:pool[n],label:[['O TIRANO AVANÇA','A COROA CAÇA'],['A MATA SUFOCA','AS SEMENTES CERCAM'],['A FOICE JULGA','O VAZIO PERSEGUE']][round][reach==='near'?0:1]};
}
export function planBossAttack(room,forcedKind){
  const b=room.boss,living=[...room.players.values()].filter(p=>room.active(p));if(!living.length)return;
  const farthest=living.reduce((a,p)=>distance(b,p)>distance(b,a)?p:a,living[0]);
  const target=b.attackIndex%3===1&&distance(b,farthest)>315?farthest:living[b.attackIndex%living.length];
  const tactic=bossTactic(room.round,b.phase,b.attackIndex,distance(b,target),b.attack);
  const kind=forcedKind??tactic.kind;b.tactic=tactic.label;b.exposedUntil=0;
  b.attackIndex++;b.target=target.id;b.facing=Math.atan2(target.y-b.y,target.x-b.x);b.state='windup';b.attack=kind;
  const heavy=[1,2,4,6,7].includes(kind),windup=(heavy?1.95:1.65)-(b.phase-1)*.12;
  b.startedAt=room.now;b.until=room.now+windup;b.attackName=ATTACK_NAMES[room.round][kind];
  b.recoveryFor=(heavy?2:1.5)+(b.phase===3?.25:0);b.executeFor=.45;b.guarding=b.phase>1;
  const add=(x,y,r,damage,options={})=>{
    const h={id:`hazard-${++room.eventId}`,x,y,r,damage,at:b.until,end:b.until+.38,next:b.until,started:room.now,telegraph:true,...options};
    h.next=h.at;if(options.end===undefined)h.end=h.at+.38;
    room.hazards.push(h);b.executeFor=Math.max(b.executeFor,h.at-b.until+.35);return h;
  };
  const circle=(x,y,r,damage,delay=0,extra={})=>add(x,y,r,damage,{at:b.until+delay,...extra});
  const cone=(angle,r,damage,delay=0)=>circle(b.x,b.y,r,damage,delay,{shape:'cone',angle,spread:room.round===2?1.18:.95});
  const line=(ax,ay,bx,by,width,damage,delay=0,extra={})=>add((ax+bx)/2,(ay+by)/2,Math.hypot(bx-ax,by-ay)/2,damage,{shape:'line',angle:Math.atan2(by-ay,bx-ax),length:Math.hypot(bx-ax,by-ay),width,at:b.until+delay,...extra});
  const volley=(count,spread,speed,damage,color,delay=0,radial=false)=>{
    room.effects.push({kind:'volley',at:b.until+delay,x:b.x,y:b.y,count,spread,speed,damage,color,angle:b.facing,radial});
    cone(b.facing,210,0,delay).warningOnly=true;
  };
  if(room.round===0){
    if(kind===0){cone(b.facing,175,27);if(b.phase===3)cone(b.facing+.6,180,22,.8);}
    if(kind===1){for(let i=0;i<3;i++)cone(b.facing+(i-1)*.7,168,22,i*.62);b.recoveryFor=2.25;}
    if(kind===2){circle(b.x,b.y,140,30,0,{breaks:true});circle(b.x,b.y,260,25,.75,{inner:150,breaks:true});if(b.phase===3)circle(b.x,b.y,345,22,1.5,{inner:265,breaks:true});b.recoveryFor=2.1;}
    if(kind===3){for(const p of living.slice(0,b.phase===1?1:2)){circle(p.x,p.y,66,14,0,{root:1.05,visual:'chains'});circle(p.x,p.y,142,24,1.65,{inner:76,visual:'chains'});}}
    if(kind===4){
      const len=clamp(distance(b,target)+65,210,390),tx=clamp(b.x+Math.cos(b.facing)*len,85,WORLD.w-85),ty=clamp(b.y+Math.sin(b.facing)*len,85,WORLD.h-85);
      line(b.x,b.y,tx,ty,86,32,0,{breaks:true,visual:'charge'});circle(tx,ty,95,25,.7,{breaks:true});
      b.charge={x:b.x,y:b.y,tx,ty,start:b.until,end:b.until+.65};b.recoveryFor=2.35;
    }
    if(kind===5)volley(b.phase===3?9:7,1.85,180,15,'blade');
    if(kind===6){for(let i=0;i<3;i++)volley(5,.9,225,14,'blade',i*.65);for(const p of living.slice(0,b.phase>1?2:1))circle(p.x,p.y,72,19,1.4,{visual:'shrapnel'});b.recoveryFor=2.3;}
    if(kind===7){circle(b.x,b.y,185,29,0,{breaks:true});for(let i=0;i<4;i++)cone(b.facing+i*Math.PI/2,245,22,.8+i*.1).spread=.45;b.recoveryFor=2.25;}
  }else if(room.round===1){
    if(kind===0){living.forEach((p,i)=>circle(p.x,p.y,60,18,i*.18,{root:.9,visual:'roots'}));}
    if(kind===1){for(let i=1;i<=3;i++){
      const x=clamp(b.x+Math.cos(b.facing)*i*92,75,1125),y=clamp(b.y+Math.sin(b.facing)*i*92,75,685);
      circle(x,y,75,5,i*.12,{end:b.until+4.5,tick:1,cloud:true});
    }}
    if(kind===2){circle(b.x,b.y,150,31,0,{breaks:true});circle(b.x,b.y,270,22,.8,{inner:170,breaks:true});}
    if(kind===3){for(let i=0;i<4;i++){const a=b.facing+i*Math.PI/2;line(b.x,b.y,b.x+Math.cos(a)*350,b.y+Math.sin(a)*350,58,22,i*.18,{root:.65,visual:'roots'});}}
    if(kind===4){volley(b.phase===3?12:9,Math.PI*2,145,13,'seed',0,true);circle(target.x,target.y,76,5,.9,{cloud:true,tick:1,end:b.until+4.2});}
    if(kind===5){circle(b.x,b.y,300,30,0,{inner:128,breaks:true,visual:'roots'});for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;circle(b.x+Math.cos(a)*210,b.y+Math.sin(a)*210,48,0,1.2,{solid:true,end:b.until+8,visual:'roots'});}}
    if(kind===6){volley(7,1.05,210,12,'seed');for(let i=0;i<3;i++){const a=b.facing+(i-1)*.3,x=clamp(target.x+Math.cos(a)*i*70,75,1125),y=clamp(target.y+Math.sin(a)*i*70,75,685);circle(x,y,70,5,i*.4,{cloud:true,tick:1,end:b.until+5.5});}b.recoveryFor=2.2;}
    if(kind===7){circle(b.x,b.y,150,26,0,{root:.9,breaks:true});circle(b.x,b.y,275,22,.9,{inner:165,breaks:true,visual:'roots'});b.recoveryFor=2.2;}
    if(b.phase>1&&kind!==5&&room.hazards.filter(h=>h.solid).length<4){const a=b.attackIndex*1.9;circle(clamp(b.x+Math.cos(a)*205,220,980),clamp(b.y+Math.sin(a)*175,170,590),28,0,.65,{solid:true,end:b.until+7,visual:'roots'});}
  }else{
    if(kind===0){cone(b.facing,215,30);cone(b.facing+Math.PI,220,28,.85);b.recoveryFor=1.8;}
    if(kind===1){for(const p of living){circle(p.x,p.y,68,24);circle(clamp(p.x+Math.cos(b.facing+1.57)*100,70,1130),clamp(p.y+Math.sin(b.facing+1.57)*100,70,690),68,24,.65);}}
    if(kind===2){circle(target.x,target.y,83,38,.2,{mark:target.id,breaks:true});circle(target.x,target.y,155,24,1.15,{inner:95,breaks:true});}
    if(kind===3){line(80,b.y,1120,b.y,70,31,0,{breaks:true,visual:'void'});line(b.x,65,b.x,695,70,31,.65,{breaks:true,visual:'void'});}
    if(kind===4){volley(b.phase===3?12:8,Math.PI*2,175,17,'void',0,true);volley(5,1.3,190,16,'void',.85);b.executeFor=1.15;}
    if(kind===5){circle(b.x,b.y,350,32,0,{inner:145,breaks:true});for(let i=0;i<5;i++){const a=i*Math.PI*2/5;circle(clamp(b.x+Math.cos(a)*255,90,1110),clamp(b.y+Math.sin(a)*255,90,670),52,23,.9);}}
    if(kind===6){for(let i=0;i<3;i++){const a=b.facing+(i===0?0:i===1?.27:-.27);line(b.x,b.y,clamp(b.x+Math.cos(a)*650,60,1140),clamp(b.y+Math.sin(a)*650,60,700),52,23,i*.65,{visual:'void'});}volley(7,1.2,235,13,'void',1.6);b.recoveryFor=2.3;}
    if(kind===7){for(let i=0;i<4;i++)cone(b.facing+i*Math.PI/2,235,24,i*.3).spread=.55;circle(b.x,b.y,350,24,1.45,{inner:245,breaks:true});b.recoveryFor=2.25;}
    if(b.phase===3&&kind!==5)circle(target.x,target.y,62,20,1.6,{visual:'void'});
  }
  b.comboStage=room.hazards.filter(h=>h.telegraph&&!h.warningOnly&&h.started===room.now).length;
  room.emit('warning',{text:b.attackName,kind,phase:b.phase,duration:windup,heavy});
}
