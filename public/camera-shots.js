// A remote LAN player's emote never steals this machine's camera. Couch co-op
// shares one display, so the most recent local emote receives the short shot.
export function localEmoteShot(room,localIds,now,userZoom=1.55){
 if(room?.state!=='battle')return null;
 const actor=room.players.filter(p=>localIds.includes(p.id)&&p.hp>0&&p.emoteUntil>now).sort((a,b)=>b.emoteAt-a.emoteAt)[0];
 return actor?{x:actor.x,y:actor.y,zoom:Math.min(2.25,Math.max(userZoom,2.05)),owner:actor.id}:null;
}
