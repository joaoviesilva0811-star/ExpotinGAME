// Each extra controller has its own authenticated server session/socket.
// Positions, resources, damage and scores still come from the ordinary server.
export class LocalSeats{
 constructor({room,session,send,notify}){this.room=room;this.session=session;this.primarySend=send;this.notify=notify;this.seats=new Map();}
 id(slot){return slot===0?this.session()?.id:this.seats.get(slot)?.id;}
 players(){const room=this.room();return room?Array.from({length:3},(_,slot)=>({slot,player:room.players.find(p=>p.id===this.id(slot))})).filter(s=>s.player):[];}
 async ensure(slot){
  const room=this.room();if(!slot||!room?.couch||room.state!=='lobby')return;
  let s=this.seats.get(slot);if(s?.code===room.code&&(!s.failedUntil||s.failedUntil>Date.now()))return;
  if(s)this.closeSeat(s);const used=new Set([...room.players.filter(p=>!p.isBot).map(p=>p.classId),...[...this.seats.values()].map(s=>s.classId)]);s={slot,classId:['knight','archer','rogue'].find(c=>!used.has(c))||['knight','archer','rogue'][slot],code:room.code,seq:Date.now()*1000,joining:true,closed:false};this.seats.set(slot,s);
  try{const response=await fetch('/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Jogador '+(slot+1)})});const data=await response.json();if(!response.ok)throw new Error(data.error);if(s.closed)return;s.token=data.token;this.connect(s);}catch(e){s.failedUntil=Date.now()+10000;this.notify('Controle '+(slot+1)+': '+e.message);}
 }
 connect(s){
  if(s.closed)return;const url=new URL('/ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';const ws=s.ws=new WebSocket(url);
  ws.onopen=()=>ws.send(JSON.stringify({type:'auth',token:s.token}));
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='welcome'){s.id=m.session.id;if(!m.room){const room=this.room();if(!room||room.code!==s.code)return this.closeSeat(s);const used=new Set(room.players.filter(p=>!p.isBot).map(p=>p.classId)),classId=s.classId||['knight','archer','rogue'].find(c=>!used.has(c))||['knight','archer','rogue'][s.slot];ws.send(JSON.stringify({type:'join',code:s.code,classId}));}else s.joining=false;}if(m.type==='joined')s.joining=false;if(m.type==='error')this.notify(m.error);};
  ws.onclose=()=>{if(!s.closed)s.retry=setTimeout(()=>this.connect(s),1200);};ws.onerror=()=>{};
 }
 send(slot,type,data={}){if(slot===0)return this.primarySend(type,data);const s=this.seats.get(slot);if(s?.ws?.readyState===WebSocket.OPEN&&!s.joining)s.ws.send(JSON.stringify({type,...data,seq:++s.seq}));}
 closeSeat(s){s.closed=true;clearTimeout(s.retry);s.ws?.close();}
 clear(){for(const s of this.seats.values())this.closeSeat(s);this.seats.clear();}
}
