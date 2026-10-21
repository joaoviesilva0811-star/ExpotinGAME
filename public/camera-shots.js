// A remote LAN player's emote never steals this machine's camera. Couch co-op
// shares one display, so the most recent local emote receives the short shot.
export function localEmoteShot(room,localIds,now,userZoom=1.55){
 if(room?.state!=='battle')return null;
 const actor=room.players.filter(p=>localIds.includes(p.id)&&p.hp>0&&p.emoteUntil>now).sort((a,b)=>b.emoteAt-a.emoteAt)[0];
 return actor?{x:actor.x,y:actor.y,zoom:Math.min(2.25,Math.max(userZoom,2.05)),owner:actor.id}:null;
}

// A couch party stays a shared-screen party even when only one actor survives.
// With everyone down, keep a finite shot of their bodies for the defeat/rescue.
export function localPartyCamera(players,userZoom=1.55){
 const seated=players.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 if(seated.length<2)return{shared:false,center:null,zoom:userZoom};
 const alive=seated.filter(p=>p.hp>0),party=alive.length?alive:seated;
 const xs=party.map(p=>p.x),ys=party.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 return{shared:true,center:{x:(left+right)/2,y:(top+bottom)/2},zoom:Math.max(1,Math.min(userZoom,1000/(right-left+200),540/(bottom-top+180)))};
}
