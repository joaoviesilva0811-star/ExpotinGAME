import {makeCovers,TRAP_NAMES} from '../public/arena-state.js';
import {hazardContains} from '../public/shared.js';
export function resetArena(room){room.covers=makeCovers(room.round);room.arenaBeat=0;room.nextTrap=room.transitionAt+12;}
export function damageCover(room,cover,amount,owner=null){
 if(room.state!=='battle'||!cover||cover.hp<=0||!Number.isFinite(amount)||amount<=0)return 0;
 const actual=Math.min(cover.hp,amount);cover.hp-=actual;cover.hitAt=room.now;
 room.emit('coverHit',{x:cover.x,y:cover.y,coverId:cover.id,material:cover.material,owner});
 if(cover.hp<=0){cover.destroyedAt=room.now;room.emit('coverBreak',{x:cover.x,y:cover.y,coverId:cover.id,material:cover.material});}
 return actual;
}
export function damageCoversInHazard(room,h){
 if(h.minion||h.cloud||h.warningOnly||h.solid)return;
 for(const cover of room.covers||[])if(cover.hp>0&&hazardContains(cover,h,cover.r*.5))damageCover(room,cover,h.breaks?90:50);
}
export function tickArena(room){
 if(room.state!=='battle'||room.now<room.nextTrap)return;
 const index=room.arenaBeat++%3,cover=room.covers[index],x=cover.x,y=cover.y,at=room.now+2.4;
 // Fixed floor fixtures, not undodgeable player-following damage. All clients
 // receive the same ordinary authoritative hazard and countdown.
 room.hazards.push({id:'arena-'+(++room.eventId),x,y,r:room.round===1?100:86,damage:room.round===2?19:16,at,end:at+.5,next:at,started:room.now,telegraph:true,environment:true,visual:['forge','roots','void'][room.round],breaks:false});
 room.nextTrap=room.now+(room.boss.phase===3?15:21);
 room.emit('arenaTrap',{x,y,name:TRAP_NAMES[room.round],at});
}
