import { randomInt } from 'node:crypto';
import { distance, BOSSES } from '../public/shared.js';

export function dropPotion(room,m){
  // First kill in every arena teaches the system; later drops remain scarce.
  if(room.lootKills++>0&&(room.lootRoll||randomInt)(100)>=46)return;
  const kind=room.lootKills%3===0?'ice':'heal';
  room.drops.push({id:`drop-${++room.eventId}`,x:m.x,y:m.y,kind,expires:room.now+35});
  room.emit('loot',{x:m.x,y:m.y,kind});
}
export function tickLoot(room){
  for(const drop of room.drops){
    if(drop.expires<=room.now)continue;
    const candidates=[...room.players.values()].filter(p=>room.active(p)&&p.potions.length<3&&distance(p,drop)<33).sort((a,b)=>(!!a.isBot-!!b.isBot)||distance(a,drop)-distance(b,drop));
    const p=candidates[0];if(!p)continue;
    p.potions.push(drop.kind);drop.expires=0;
    room.emit('pickup',{owner:p.id,x:p.x,y:p.y,kind:drop.kind});
  }
  room.drops=room.drops.filter(d=>d.expires>room.now);
}
export function usePotion(room,p){
  if(!room.canAct(p)||!p.potions.length||room.now<p.potionReady)return false;
  const kind=p.potions[0];if(kind==='heal'&&p.hp>=p.maxHp)return false;
  p.potions.shift();p.potionReady=room.now+1.25;
  if(kind==='heal'){
    const amount=Math.min(45,p.maxHp-p.hp);p.hp+=amount;
    room.emit('heal',{owner:p.id,x:p.x,y:p.y,amount,potion:true});
  }else{
    const x=p.x,y=p.y;
    if(distance(p,room.boss)<230){room.boss.slowUntil=Math.max(room.boss.slowUntil,room.now+4);room.hitBoss(p,15);}
    for(const m of room.minions)if(m.hp>0&&distance(m,p)<230){m.slowUntil=room.now+4;room.hitMinion(p,m,15);}
    room.emit('frost',{owner:p.id,x,y,r:230});
  }
  return true;
}
export function roundDialogue(room,offset=0){
  const lines=[
    {knight:'Varkhul… sua coroa não protege mais ninguém.',archer:'A espada é pesada. Esperem o golpe, depois avancem.',rogue:'Enquanto ele encara vocês, eu cuido das costas.'},
    {knight:'Escudos juntos. Não deixem ninguém nas raízes.',archer:'A floresta respira veneno. Não parem de se mover.',rogue:'Primeiro os lacaios. Eles podem carregar suprimentos.'},
    {knight:'Esta é a última porta. Todos voltaremos por ela.',archer:'Seis asas, um alvo. Guardem energia para o eclipse.',rogue:'Chegamos até aqui juntos. Agora derrubamos um deus.'}
  ][room.round];
  const dialogue=[...room.players.values()].slice(0,3).map((p,i)=>({owner:p.id,name:p.name,classId:p.classId,text:lines[p.classId],at:room.now+offset+i*2.1,until:room.now+offset+(i+1)*2.1}));
  dialogue.push({owner:'boss',name:BOSSES[room.round].name,boss:true,text:['Nenhum vivo atravessa os portões do meu reino!','Suas raízes beberão o sangue de vocês.','O vazio já conhece os seus nomes.'][room.round],at:room.now+offset+6.3,until:room.now+offset+8.4});return dialogue;
}
