import {localEmoteShot} from './camera-shots.js';
import {renderAssetsReady} from './render-ready.js';
import {drawItemSprite,paintItemIcon} from './item-art.js';
import {drawRescueLink} from './rescue-art.js';
import {GamepadHub,padLabels,padMenu} from './gamepads.js';
import {LocalSeats} from './local-seats.js';
import {AdaptiveEffects} from './effect-budget.js';
import {drawMagicalKey,drawKeyReward,drawKeyRing,drawKeyPassage,drawSecretEnding,epilogueCast} from './key-art.js';
import {sceneImage} from './scenes.js';
import {configureLighting,stepLighting,drawGroundLighting,drawLightSpill,emitLight,resetLighting,lightingStats} from './lighting.js';
import {LocalMotion,PositionTrack,cameraFocus} from './motion.js';
import {cleanSettings,FrameMonitor} from './presentation.js';
import {HurtCamera} from './hurt-camera.js';
import {resetPoseMixes} from './animation-layout.js';
import { CLASSES, BOSSES, COSTS, COOLDOWNS, WORLD, DODGE, clamp, ARENA_OBSTACLES, EMOTES } from './shared.js';
import { drawPlayer, drawBoss, terrain, pillar, torch, light, playerSprite, exportAtlas, bossSprite,drawPlayerHighlight } from './art.js';
import { STORY,BRIDGES,endingStory } from './story.js';
import { cinematicPlayer,drawGate,drawAwakening,drawCorridor,drawEnding } from './scenes.js';
import { hudIcon } from './hud-art.js';
import { drawTelegraph,drawTelegraphEdge } from './telegraphs.js';
import { drawMinion,resetAnimationState } from './animation.js';
import { impactFX,hazardImpact,magicFX,footFX,slashFX,bowFX,drawProjectile,stepFX,drawGroundFX,drawFX,resetFX,setEffectsQuality,effectsStats,effectsOcclude,setRenderBounds,setEffectsDensity } from './vfx.js';
import { AudioEngine } from './audio.js';

const $ = id => document.getElementById(id);
const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const desktopParams=new URLSearchParams(location.search);
const nativeDesktop=desktopParams.get('desktop')==='1';
const apiBase = (window.IRON_CONFIG?.serverUrl || '').replace(/\/$/,'');
const canvas=$('game'), ctx=canvas.getContext('2d',{alpha:false});canvas.width=WORLD.w;canvas.height=WORLD.h;ctx.imageSmoothingEnabled=false;
const audio=new AudioEngine();
const enableAudio=()=>audio.enable().then(()=>{$('audio-toggle').textContent='♪';$('audio-toggle').title='Desativar áudio';});
document.addEventListener('pointerdown',e=>{if(e.target.closest('#audio-toggle'))return;enableAudio();},{once:true});
document.addEventListener('keydown',enableAudio,{once:true});
let room=null,session=null,token=null,ws=null,connected=false,connecting=null,reconnectTimer=null,retry=0;
let screen='home',lobbySignature='',resultsSignature='',lastEvent=0,snapshotAt=0,seq=Date.now()*1000,latency=0;
let warningUntil=0,shake=0,flash=0,frameTime=0,previousFrame=performance.now(),pointer=null,pointerClient=null,attacking=false;
const pendingReadySlots=new Map();
let lastStep=0,dialogueKey='',assetsReady=false;
renderAssetsReady.then(()=>{assetsReady=true;window.IRON_ASSETS_READY=true;for(const[slot,wanted]of pendingReadySlots){if(room?.state==='lobby'&&room.code===wanted.code)localSeats.send(slot,'ready',{ready:wanted.ready});}pendingReadySlots.clear();lobbySignature='';if(room?.state==='lobby')renderLobby();}).catch(error=>{console.error(error);toast('Não foi possível preparar a arte. Reabra o jogo com o pacote completo.',true);});
const keys=new Set(),positions=new Map(),attackUntil=new Map(),particles=[],floats=[],rings=[];
const input={x:0,y:0,block:false,attack:false,revive:false};
let joystick={x:0,y:0},touchBlock=false,touchAttack=false,touchRevive=false;
let cameraFraction=.5,zoom=1.55,viewX=600,viewY=380,viewZoom=1.55;
let stageRect=canvas.getBoundingClientRect();new ResizeObserver(()=>{stageRect=canvas.getBoundingClientRect();}).observe(canvas);
const portraitQuery=matchMedia('(max-width:720px) and (orientation:portrait)');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const footPositions=new Map();
const gamepads=new GamepadHub(),localSeats=new LocalSeats({room:()=>room,session:()=>session,send:(type,data)=>send(type,{...data,seq:++seq}),notify:toast});let controllerSignature='';const seatMotion=new Map(),seatVisual=new Map();
let settings;try{settings=cleanSettings(JSON.parse(storageGet('iron-presentation')||'{}'));}catch{settings=cleanSettings();}
setEffectsQuality(settings.quality);configureLighting(settings.lighting,settings.quality);const localMotion=new LocalMotion(),tracks=new Map(),monitor=new FrameMonitor(),hurtCamera=new HurtCamera();const effectsSurface=new AdaptiveEffects();effectsSurface.configure(settings.quality,settings.autoEffects);audio.configure(settings);let perfLast=0,lastHud=0,teamMarkup='',solidsNow=[],localVisual=null;
function setZoom(value){zoom=clamp(value,1,2);$('zoom-value').textContent=Math.round(zoom*100)+'%';}
$('zoom-in').onclick=()=>setZoom(zoom+.12);$('zoom-out').onclick=()=>setZoom(zoom-.12);
const portraitCamera=()=>screen==='battle'&&portraitQuery.matches;
const symbols={knight:['⚔','➶','♜'],archer:['➶','⋮','❄'],rogue:['⚔','◈','✧']};
function storageGet(key){try{return localStorage.getItem(key);}catch{return null;}}
function storageSet(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch{}}
token=storageGet('iron-session');
function toast(text,error=false){const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=text;$('toasts').append(el);setTimeout(()=>el.remove(),6500);}
function setStatus(text,state=''){const el=$('network');el.className='connection '+state;el.innerHTML='<i></i>'+esc(text);}
async function api(path,data){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(apiBase+'/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:controller.signal});
    let result;try{result=await response.json();}catch{throw new Error('O endereço configurado não respondeu como servidor do jogo. Verifique config.js.');}
    if(!response.ok)throw new Error(result.error||'O servidor não respondeu.');return result;
  }catch(error){if(error instanceof TypeError||error.name==='AbortError')throw new Error('Sem conexão com o servidor. Confira o endereço em config.js e se o backend está ligado.');throw error;}finally{clearTimeout(timeout);}
}
function send(type,data={}){if(ws?.readyState===WebSocket.OPEN&&connected)ws.send(JSON.stringify({type,...data}));}
function setSession(value){session=value;$('guest-form').hidden=!!session;$('account-links').hidden=!!session;$('session-panel').hidden=!session;$('session-name').textContent=session?.name||'';$('entry-subtitle').textContent=session?'Sua próxima batalha está a um código de distância.':'Escolha um nome. Reúna seus aliados.';}
function showScreen(next){
  screen=next;
  for(const id of ['home','lobby','results'])$(id).hidden=id!==next;
  $('hud').hidden=next!=='battle';
  document.body.classList.toggle('in-game',next==='battle'||next==='ending');document.body.classList.toggle('in-lobby',next==='lobby');document.body.classList.toggle('in-results',next==='results');
  if(next!=='battle'){keys.clear();input.attack=false;touchAttack=touchBlock=touchRevive=false;joystick={x:0,y:0};}
}
function connect(){
  if(connected)return Promise.resolve();if(connecting)return connecting;
  setStatus('CONECTANDO');
  const endpoint=new URL(apiBase||location.origin);endpoint.protocol=endpoint.protocol==='https:'?'wss:':'ws:';endpoint.pathname='/ws';endpoint.search='';endpoint.hash='';
  connecting=new Promise((resolve,reject)=>{
    const socket=new WebSocket(endpoint);ws=socket;let welcomed=false;
    const timeout=setTimeout(()=>{socket.close();reject(new Error('O servidor multiplayer não respondeu.'));},12000);
    socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'auth',token})));
    socket.addEventListener('message',event=>{
      let msg;try{msg=JSON.parse(event.data);}catch{return;}
      if(msg.type==='welcome'){
        clearTimeout(timeout);welcomed=true;connected=true;retry=0;connecting=null;setSession(msg.session);setStatus('CONECTADO','online');
        room=null;lastEvent=0;positions.clear();
        if(msg.room)acceptSnapshot(msg.room,true);else showScreen('home');resolve();
      }
      if(msg.type==='joined'){lastEvent=0;positions.clear();lobbySignature='';resultsSignature='';acceptSnapshot(msg.room,true);}
      if(msg.type==='snapshot')acceptSnapshot(msg.room);
      if(msg.type==='left'){localSeats.clear();room=null;positions.clear();showScreen('home');$('footer-state').textContent='A escuridão espera por você.';}
      if(msg.type==='error')toast(msg.error,true);
      if(msg.type==='pong')latency=Math.round(performance.now()-msg.time);
    });
    socket.addEventListener('close',event=>{
      clearTimeout(timeout);if(socket!==ws)return;connected=false;connecting=null;setStatus('DESCONECTADO','offline');
      if(!welcomed)reject(new Error('Não foi possível conectar ao multiplayer.'));
      if(event.code===4003){token=null;storageSet('iron-session',null);setSession(null);room=null;showScreen('home');toast('Sua sessão expirou. Entre novamente.',true);return;}
      if(event.code===4001){toast('Esta sessão foi aberta em outra aba. Use uma sessão diferente para outro jogador.',true);return;}
      if(token){if(room)toast('Conexão interrompida. Tentando reconectar…');clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>connect().catch(()=>{}),Math.min(10000,1000*2**retry++));}
    });
    socket.addEventListener('error',()=>setStatus('SEM CONEXÃO','offline'));
  });return connecting;
}
function acceptSnapshot(value,initial=false){
  const oldState=room?.state,oldRound=room?.round;room=value;snapshotAt=performance.now();
  if(initial||oldRound!==value.round||oldState!==value.state){tracks.clear();localMotion.reset();resetAnimationState();resetPoseMixes();hurtCamera.reset();for(const m of seatMotion.values())m.reset();seatVisual.clear();}
  solidsNow=[...ARENA_OBSTACLES[value.round||0],...value.hazards.filter(h=>h.solid&&h.at<=value.now)];
  for(const [id,entity]of [...value.players.map(p=>[p.id,p]),...value.minions.map(p=>[p.id,p]),...(value.boss?[['boss',value.boss]]:[])]){let track=tracks.get(id);if(!track){track=new PositionTrack();tracks.set(id,track);}track.push(entity,value.now);}
  const own=value.players.find(p=>p.id===session?.id);if(own)localMotion.accept(own,snapshotAt/1000,latency/1000);for(const {slot,player}of localSeats.players())if(slot){if(!seatMotion.has(player.id))seatMotion.set(player.id,new LocalMotion());seatMotion.get(player.id).accept(player,snapshotAt/1000,latency/1000);}
  const liveIds=new Set([...value.players,...value.minions].map(p=>p.id));liveIds.add('boss');for(const id of tracks.keys())if(!liveIds.has(id)){tracks.delete(id);positions.delete(id);}

  if(initial)lastEvent=value.events.at(-1)?.id||0;
  for(const e of value.events){if(e.id>lastEvent){eventEffect(e);lastEvent=e.id;}}
  if($('key-icons')){drawKeyRing($('key-icons'),value.keys||[]);$('key-count').textContent=(value.keys?.length||0)+'/3 CHAVES';}
  if(value.state==='lobby'){
    if(screen!=='lobby')showScreen('lobby');renderLobby();
  }else if(['countdown','battle'].includes(value.state)||value.keyDrop&&value.now<value.keySceneUntil){
    if(screen!=='battle'){showScreen('battle');buildAbilities();}
    if(snapshotAt-lastHud>90){updateHud();lastHud=snapshotAt;}
  }else if(value.state==='ending'){if(screen!=='ending')showScreen('ending');}
  else{
    if(screen!=='results')showScreen('results');renderResults();
  }
  if(oldState!==value.state&&value.state==='battle')toast('A batalha começou. Ataque nos intervalos dos golpes!');
  $('footer-state').textContent=`${room.code} · ${room.players.length}/4 jogadores · ${connected?latency+' ms':'reconectando'}`;
}
const me=()=>room?.players.find(p=>p.id===session?.id);
const localOwnerSlot=()=>localSeats.players().find(s=>s.player.id===room?.owner)?.slot;
function sendAsLeader(type,data={}){const slot=localOwnerSlot();if(slot!==undefined)localSeats.send(slot,type,data);}
function renderLobby(){
  const p=me();if(!p)return;
  const signature=JSON.stringify([room.owner,room.code,room.botsEnabled,controllerSignature,assetsReady,room.players.map(p=>[p.id,p.name,p.classId,p.ready,p.connected])]);
  if(lobbySignature===signature)return;lobbySignature=signature;
  const leader=localOwnerSlot()!==undefined,allReady=room.players.every(p=>p.ready&&p.connected);
  $('lobby').innerHTML=`<div class="lobby-heading"><div><span class="eyebrow">PREPARAÇÃO · ${room.public?'SALA PÚBLICA':room.solo?'SOLO + COMPANHEIROS':'SALA PRIVADA'}</span><h2>Escolha sua lenda.</h2>${room.couch?'<p class="controller-help">COOP NO MESMO PC · Até 3 controles. Pressione um botão em cada controle para entrar. ← / → escolhem classe · A / × pronto · START / OPTIONS inicia.</p>':''}<p class="muted">Três destinos. Uma equipe. A coroa espera.</p></div><div class="room-code-box"><div><small>CÓDIGO DA EXPEDIÇÃO</small><strong>${esc(room.code)}</strong></div><button class="icon-btn" data-action="copy" title="Copiar código" aria-label="Copiar código">⧉</button></div></div>
    <div class="lobby-grid"><div><div class="class-grid">${Object.entries(CLASSES).map(([id,c])=>`<button class="class-card ${p.classId===id?'selected':''}" data-class="${id}"><span class="selected-mark">${p.classId===id?'◈ SELECIONADO':''}</span><canvas width="190" height="150" data-portrait="${id}"></canvas><div class="class-text"><h3>${c.name}</h3><p>${c.role}</p><p>${id==='knight'?'Resista à escuridão. Proteja seus aliados.':id==='archer'?'Encontre a distância. Acerte o ponto fraco.':'Ataque nas sombras. Desapareça antes do golpe.'}</p><div class="class-meta"><span>♥ ${c.hp} VIDA</span><span>⚡ 100 ENERGIA</span></div></div></button>`).join('')}</div>
    <div class="skill-preview">${CLASSES[p.classId].skills.map((name,i)=>`<div><strong><kbd>${gamepads.locked?[padLabels(gamepads.seats[0]?.kind).skill1,padLabels(gamepads.seats[0]?.kind).skill2,padLabels(gamepads.seats[0]?.kind).skill3][i]:i+1}</kbd> ${name}</strong>${CLASSES[p.classId].descriptions[i]}<br><span>${COSTS[i]} energia · ${COOLDOWNS[i]}s</span></div>`).join('')}</div></div>
    <aside class="panel team-lobby"><h3>SEU GRUPO <span class="muted">${room.players.length}/4</span></h3>${room.players.map(a=>`<div class="member"><span class="member-avatar" style="color:${CLASSES[a.classId].color}">${a.classId==='knight'?'♜':a.classId==='archer'?'➶':'◈'}</span><div class="member-text"><strong>${esc(a.name)} ${a.id===room.owner?'♛':''}</strong><small>${CLASSES[a.classId].name} · ${a.isBot?'COMPANHEIRO IA':a.connected?'conectado':'desconectado'}</small></div><span class="badge" style="color:${a.ready?'#8ccfa2':'#7d8880'}">${a.ready?'PRONTO':'…'}</span></div>`).join('')}${Array.from({length:4-room.players.length},()=>'<div class="empty-slot">+ Aguardando um aliado</div>').join('')}<p class="fine">${room.solo?'Companheiros das outras duas classes lutam e podem reviver você. Troque sua classe para atualizar a equipe.':'Compartilhe o código. Seus amigos entram pelo mesmo servidor. Você pode completar as classes ausentes com bots.'}</p></aside></div>
    ${nativeDesktop&&desktopParams.get('mode')==='host'?`<div class="lan-info">REDE LOCAL · IP DO ANFITRIÃO: <strong>${esc(desktopParams.get('lan')||'127.0.0.1')}</strong> · porta 48230 · compartilhe também o código da sala.</div>`:''}${leader&&!room.solo?`<label class="check bot-option"><input type="checkbox" id="bot-toggle" ${room.botsEnabled?'checked':''}> Completar as classes ausentes com companheiros IA</label>`:''}<div class="lobby-actions"><button class="text-link" data-action="leave">← Sair da sala</button><p>${!assetsReady?'Preparando sprites e efeitos antes da apresentação…':leader?'Marque pronto e inicie quando todos estiverem preparados.':'Aguardando o líder iniciar a expedição.'}</p><div><button class="${p.ready?'secondary':'primary'}" data-action="ready" ${!assetsReady?'disabled':''}>${p.ready?'✓ Pronto · cancelar':'Estou pronto'}</button>${leader?`<button class="primary" data-action="start" ${!allReady||!assetsReady?'disabled':''}>Iniciar expedição →</button>`:''}</div></div><p class="lobby-controls"><kbd>WASD</kbd> mover &nbsp; <kbd>Mouse</kbd> mirar e atacar &nbsp; <kbd>1 2 3</kbd> habilidades &nbsp; <kbd>Espaço</kbd> defender &nbsp; <kbd>E</kbd> dash &nbsp; <kbd>4</kbd> poção &nbsp; <kbd>R</kbd> reviver &nbsp; <kbd>Tab</kbd> emotes</p>`;
  for(const el of $('lobby').querySelectorAll('[data-portrait]')){
    const c=el.getContext('2d');c.imageSmoothingEnabled=false;const cls=el.dataset.portrait;
    c.fillStyle=CLASSES[cls].color+'0c';c.beginPath();c.ellipse(95,117,52,17,0,0,Math.PI*2);c.fill();
    drawPlayer(c,{x:95,y:126,id:'portrait-'+cls,facing:1.4,classId:cls,hp:100},0,{scale:1.7});
  }
}
$('lobby').addEventListener('change',event=>{if(event.target.id==='bot-toggle')sendAsLeader('bots',{enabled:event.target.checked});});
$('lobby').addEventListener('click',event=>{
  const btn=event.target.closest('button');if(!btn)return;audio.fx('ui');
  if(btn.dataset.class){pendingReadySlots.delete(0);send('class',{classId:btn.dataset.class});}
  const action=btn.dataset.action;
  if(action==='copy')copyCode();if(action==='ready'&&assetsReady)send('ready',{ready:!me().ready});if(action==='start')sendAsLeader('start');if(action==='leave')send('leave');
});
async function copyCode(){try{await navigator.clipboard.writeText(room.code);toast('Código copiado: '+room.code);}catch{openModal(`<span class="eyebrow">COMPARTILHE COM OS ALIADOS</span><h2>${esc(room.code)}</h2><p>Selecione e copie o código acima.</p>`);}}
function buildAbilities(){
  const p=me();if(!p)return;const c=CLASSES[p.classId];
  $('abilities').innerHTML=c.skills.map((name,i)=>`<button class="ability" data-slot="${i}" aria-label="${name}" title="${name}: ${c.descriptions[i]} · ${COSTS[i]} energia · ${COOLDOWNS[i]}s"><canvas class="skill-art" width="64" height="64" data-icon-slot="${i}"></canvas><span class="skill-symbol">${symbols[p.classId][i]}</span><kbd>${gamepads.locked?[padLabels(gamepads.seats[0]?.kind).skill1,padLabels(gamepads.seats[0]?.kind).skill2,padLabels(gamepads.seats[0]?.kind).skill3][i]:i+1}</kbd><span class="cost">${COSTS[i]} ⚡</span><span class="cooldown-cover"></span><span class="cd-number"></span></button>`).join('');
  const offset=p.classId==='knight'?0:p.classId==='archer'?3:6;for(const el of $('abilities').querySelectorAll('[data-icon-slot]'))hudIcon(el,offset+Number(el.dataset.iconSlot));hudIcon($('dash-icon'),11);
  const cctx=$('portrait').getContext('2d');cctx.clearRect(0,0,64,64);cctx.imageSmoothingEnabled=false;drawPlayer(cctx,{id:'hudportrait',x:32,y:61,facing:1.57,classId:p.classId,hp:100},0,{scale:.9});
}
$('abilities').addEventListener('pointerdown',e=>{const btn=e.target.closest('[data-slot]');if(btn){e.preventDefault();useSkill(Number(btn.dataset.slot));}});
function useSkill(slot){if(gamepads.locked)return;
  if(screen!=='battle'||$('modal').open)return;const p=me();if(!p||p.hp<=0||p.eliminated)return;
  if(p.block||input.block){toast('Solte a defesa para usar uma habilidade.');return;}
  if(p.energy<COSTS[slot]){toast('Energia insuficiente.');return;}
  if(p.cds[slot]>room.now)return;
  sendInput();send('skill',{slot,seq:++seq});
}
function updateHud(){updateLocalHUD();
  if(!room)return;const p=me(),b=room.boss,info=BOSSES[room.round];if(!p||!b)return;
  $('boss-round').textContent=`RODADA 0${room.round+1} / 03`;$('boss-name').textContent=info.name;
  $('boss-health-fill').style.width=(b.hp/b.maxHp*100)+'%';$('boss-health-fill').style.background=`linear-gradient(90deg,${info.color}77,${info.color})`;
  $('boss-hp').textContent=`${Math.ceil(b.hp)} / ${b.maxHp}`;$('boss-phase').textContent=b.state==='transition'?'TRANSIÇÃO · IMUNE':b.phase===3?info.finalPhase.toUpperCase():b.phase===2?info.phase.toUpperCase():'FASE I · '+info.title.toUpperCase();
  $('timer').textContent=formatTime(room.remaining);$('timer').style.color=room.remaining<45?'#ed7b7b':'';
  $('boss-action').textContent=b.state==='windup'?'⚠ '+b.attackName:b.state==='recover'?'ABERTURA · ATAQUE AGORA':b.state==='transition'?'NOVA FASE':b.guarding?'ARMADURA ATIVA':'CERQUE O CHEFE · ELIMINE OS LACAIOS';
  $('boss-action').classList.toggle('opening',b.state==='recover');
  if(room.state==='countdown'){$('boss-action').textContent=room.now<room.intro.gateAt?'O GRUPO CHEGA À ARENA':room.now<room.intro.awakeningAt?'OS PORTÕES SE FECHARAM':room.transitionAt-room.now>3?'O PODER ESTÁ DESPERTANDO':'PREPARE-SE PARA A BATALHA';$('boss-phase').textContent=room.now<room.intro.awakeningAt?'DORMENTE':'DESPERTAR';}
  $('minion-count').textContent=(room.minions?.filter(m=>m.hp>0).length||0)+' LACAIOS';
  $('hud').dataset.class=p.classId;const potion=p.potions?.[0],pot=$('potion-slot');paintItemIcon($('potion-icon'),potion==='ice'?'ice':'heal',room.now);$('potion-icon').style.opacity=potion?'1':'.18';pot.disabled=!potion||p.hp<=0||p.potionReady>room.now;pot.classList.toggle('has-potion',!!potion);pot.querySelector('strong').textContent=potion==='ice'?'❄':potion==='heal'?'✚':'◇';pot.querySelector('small').textContent=potion?(potion==='ice'?'GELO':'CURA')+' ×'+p.potions.length:'SEM POÇÃO';
  $('dash-slot').disabled=p.energy<DODGE.cost||p.hp<=0||p.dodgeReady>room.now;$('dash-cd').textContent=p.dodgeReady>room.now?(p.dodgeReady-room.now).toFixed(1)+'s':'20 ⚡';
  $('arena-name').textContent=info.arena.toUpperCase();$('my-name').textContent=p.name;$('my-class').textContent=CLASSES[p.classId].name;
  $('my-health').style.width=(p.hp/p.maxHp*100)+'%';$('my-hp').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('my-energy').style.width=p.energy+'%';$('my-en').textContent=`${Math.floor(p.energy)} / 100`;
  $('status-effects').textContent=[p.block?'DEFENDENDO −60%':null,p.shieldUntil>room.now?'MURALHA REAL':null,p.rootUntil>room.now?'IMOBILIZADO':null,p.reviveTarget?'REVIVENDO '+Math.min(100,Math.floor(p.revive/4*100))+'%':null].filter(Boolean).join(' · ');
  const nextTeam=room.players.filter(a=>a.id!==p.id).map(a=>`<div class="ally" style="border-left-color:${CLASSES[a.classId].color}"><div><span>${esc(a.name)}</span><small>${!a.connected?'OFFLINE':a.eliminated?'FORA':a.hp<=0?'CAÍDO':(a.isBot?'IA · ':'')+CLASSES[a.classId].name.toUpperCase()}</small></div><div class="ally-bar"><i style="width:${a.hp/a.maxHp*100}%"></i></div></div>`).join('');if(nextTeam!==teamMarkup){$('team-panel').innerHTML=nextTeam;teamMarkup=nextTeam;}
  for(const btn of $('abilities').children){const slot=Number(btn.dataset.slot),cd=Math.max(0,p.cds[slot]-room.now);btn.classList.toggle('unavailable',cd>0||p.energy<COSTS[slot]||p.hp<=0||p.block);btn.querySelector('.cooldown-cover').style.height=cd/COOLDOWNS[slot]*100+'%';btn.querySelector('.cd-number').textContent=cd>0?cd.toFixed(1):'';btn.setAttribute('aria-label',CLASSES[p.classId].skills[slot]+(cd>0?' · '+cd.toFixed(1)+' segundos':p.energy<COSTS[slot]?' · energia insuficiente':' · pronta'));btn.classList.toggle('ready',cd<=0&&p.energy>=COSTS[slot]&&p.hp>0&&!p.block);}
  const down=p.hp<=0||!p.connected;$('down-message').style.display=down?'block':'none';
  if(down){const helper=room.players.find(a=>a.hp>0&&a.reviveTarget===p.id&&a.revive>0);$('down-message').textContent=p.eliminated?'Fora de combate. Você retorna na próxima rodada.':helper?`${helper.name} está ajudando você · ${Math.min(100,Math.floor(helper.revive/4*100))}%`:`Você caiu. Aguarde o auxílio de um aliado. ${Math.max(0,Math.ceil(20-(room.now-p.downAt)))}s`; }
}
function renderResults(){
  const signature=room.state+room.results.length+room.score;if(signature===resultsSignature)return;resultsSignature=signature;
  const last=room.results.at(-1),finished=room.state==='finished',won=finished?room.wins===3:last.won;
  const data=finished?room.players.map(p=>({name:p.name,...p.stats})):last.players;
  data.sort((a,b)=>(b.damage+b.revives*100)-(a.damage+a.revives*100));
  $('results').innerHTML=`<div class="panel result-panel"><span class="eyebrow">${finished?'A EXPEDIÇÃO CHEGOU AO FIM':`RODADA ${room.round+1} CONCLUÍDA`}</span><h2>${finished?(won?'A coroa caiu. Sua lenda vive.':'A escuridão venceu esta vez.'):(won?'O inimigo encontrou seu fim.':'Reúnam suas forças.')}</h2><p class="muted">${finished?`${room.wins} de 3 chefes derrotados. ${won?'Bônus de expedição perfeita: +150 pontos.':'Uma nova expedição espera por sua equipe.'}`:won?`${BOSSES[room.round].name} foi derrotado. Os sobreviventes recuperam 50% da vida perdida.`:esc(last.reason)}</p><div class="round-pips">${[0,1,2].map(i=>`<span class="${room.results[i]?(room.results[i].won?'win':'loss'):''}"></span>`).join('')}</div><div class="score-summary"><div><strong>${room.score}</strong><span>PONTOS DA EQUIPE</span></div><div><strong>${formatTime(last.remaining)}</strong><span>TEMPO RESTANTE</span></div><div><strong>${finished?room.wins+'/3':'+'+last.reward}</strong><span>${finished?'CHEFES DERROTADOS':'PONTOS DA RODADA'}</span></div></div><table><thead><tr><th>JOGADOR</th><th>DANO CAUSADO</th><th>RECEBIDO</th><th>EVITADO</th><th>REVIVES</th><th>HABILIDADES</th><th>MAIOR COMBO</th><th>BÔNUS COMBO</th></tr></thead><tbody>${data.map((p,i)=>`<tr><td>${i+1}. ${esc(p.name)}</td><td>${Math.round(p.damage)}</td><td>${Math.round(p.taken)}</td><td>${Math.round(p.avoided)}</td><td>${p.revives}</td><td>${p.skills}</td><td>${p.maxCombo||0} hits</td><td>+${Math.floor(p.comboPoints||0)}</td></tr>`).join('')}</tbody></table>${finished?`<p class="muted">Recorde desta formação: ${room.bestScore || room.score} pontos. Resultado registrado no Quadro de Lendas.</p><div class="result-actions">${localOwnerSlot()!==undefined?'<button class="primary" data-action="restart">Jogar novamente →</button>':'<span class="muted">Aguardando o líder voltar à preparação.</span>'}<button class="secondary" data-action="ranking">Quadro de lendas</button><button class="secondary" data-action="leave">Sair da sala</button></div>`:'<p class="muted" id="next-round">A próxima arena está sendo preparada…</p>'}</div>`;
}
$('results').addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='restart'){resultsSignature='';lobbySignature='';sendAsLeader('restart');}if(action==='leave')send('leave');if(action==='ranking')showRanking();});
function formatTime(seconds){const s=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

let modalRevision=0;
function openModal(html){modalRevision++;$('emote-wheel').hidden=true;document.body.classList.add('menu-open');$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();resetInput();return modalRevision;}
function closeModal(){modalRevision++;document.body.classList.remove('menu-open');$('modal').close();resetInput();}
$('close-modal').onclick=closeModal;$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const rect=$('modal').getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeModal();}});
$('modal').addEventListener('close',()=>{if(!$('modal').open)document.body.classList.remove('menu-open');resetInput();});$('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
function help(){openModal(`<span class="eyebrow">GUIA DA EXPEDIÇÃO</span><h2>O trono não cai sozinho.</h2><p>Derrote três chefes em até cinco minutos por arena. As áreas marcadas avisam onde o próximo golpe vai atingir. Ataque durante a recuperação do chefe.</p><button type="button" class="primary" id="resume-battle">Retomar partida</button><button type="button" class="secondary" id="menu-settings">Gráficos e áudio</button><div class="help-grid"><span><kbd>WASD</kbd> movimentação</span><span><kbd>Mouse</kbd> mirar · segurar para atacar</span><span><kbd>1 / 2 / 3</kbd> habilidades</span><span><kbd>Espaço</kbd> defender</span><span><kbd>R</kbd> segurar 4s para reviver</span><span><kbd>E</kbd> dash · 20 de energia</span><span><kbd>4</kbd> poção coletada</span><span><kbd>Esc</kbd> menu local</span></div><p>A defesa reduz 60% do dano e drena 15 de energia por segundo. Energia regenera 12/s. Golpes indicados com “rompe defesa” exigem esquiva. Use E para esquivar: custa 20 de energia, tem 2,4s de recarga e protege brevemente durante o avanço. Colete poções dos lacaios passando por elas e use a próxima com 4 (até três guardadas). Reviva um aliado antes de 20s, ficando parado e sem receber dano.</p><p>Controle Xbox / PlayStation: analógico esquerdo move, direito mira; X / □ ataca; A / × dash; Y / △ habilidade 1; RB / R1 habilidade 2; RT / R2 habilidade 3; LB / L1 defende; B / ○ segurado revive; ↑ usa poção; ↓ emote; START / OPTIONS abre o menu. Durante uso do controle, teclado e mouse não comandam a batalha. Esc e mouse ficam disponíveis nos menus. O menu não pausa a partida online.</p>${room?'<button class="secondary" id="modal-leave">Sair da sala</button>':''}${nativeDesktop?'<button type="button" class="secondary" id="return-pc-menu">Voltar ao menu do PC</button>':''}`);$('resume-battle')?.addEventListener('click',closeModal);$('menu-settings')?.addEventListener('click',presentationSettings);$('modal-leave')?.addEventListener('click',()=>{localSeats.clear();send('leave');closeModal();});$('return-pc-menu')?.addEventListener('click',()=>{localSeats.clear();audio.dispose();window.ironDesktop.returnToMenu().catch(()=>{});});}
$('help').onclick=help;$('battle-menu').onclick=help;
function presentationSettings(){openModal(`<span class="eyebrow">CONFORTO E DESEMPENHO</span><h2>Ajustes da expedição</h2><form id="presentation-form" class="presentation-form"><label>Efeitos visuais<select id="fx-quality"><option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto · efeitos completos</option></select></label><label>Volume da música<input id="music-volume" type="range" min="0" max="100" step="1"></label><label>Volume dos efeitos<input id="effects-volume" type="range" min="0" max="100" step="1"></label><label>Impacto da câmera <output id="shake-value"></output><input id="shake-strength" type="range" min="0" max="100" step="5"></label><label class="check"><input id="auto-camera" type="checkbox"> Câmera acompanha a mira e ataques grandes</label><label class="check"><input id="player-outline" type="checkbox"> Destacar meu personagem atrás dos efeitos</label><label class="check"><input id="dynamic-lights" type="checkbox"> Iluminação dinâmica e sombras</label><label class="check"><input id="auto-effects" type="checkbox"> Ajustar efeitos para priorizar 60 FPS</label><label class="check"><input id="show-perf" type="checkbox"> Mostrar FPS e tempo de quadro</label><p>Os avisos de perigo permanecem completos em todas as qualidades. O menu não pausa a partida.</p><button class="primary" type="submit">Salvar e voltar</button></form>`);
 $('fx-quality').value=settings.quality;$('music-volume').value=settings.musicVolume*100;$('effects-volume').value=settings.effectsVolume*100;$('shake-strength').value=settings.shake*100;$('shake-value').textContent=Math.round(settings.shake*100)+'%';$('auto-camera').checked=settings.autoCamera;$('player-outline').checked=settings.outline;$('show-perf').checked=settings.showPerf;$('dynamic-lights').checked=settings.lighting;$('auto-effects').checked=settings.autoEffects;
 const apply=()=>{settings=cleanSettings({quality:$('fx-quality').value,musicVolume:Number($('music-volume').value)/100,effectsVolume:Number($('effects-volume').value)/100,shake:Number($('shake-strength').value)/100,autoCamera:$('auto-camera').checked,outline:$('player-outline').checked,showPerf:$('show-perf').checked,lighting:$('dynamic-lights').checked,autoEffects:$('auto-effects').checked});setEffectsQuality(settings.quality);configureLighting(settings.lighting,settings.quality);effectsSurface.configure(settings.quality,settings.autoEffects);audio.configure(settings);storageSet('iron-presentation',JSON.stringify(settings));if(nativeDesktop&&window.ironPreferences)window.ironPreferences.save(settings).catch(()=>toast('Não foi possível salvar os ajustes no perfil do PC.'));$('shake-value').textContent=Math.round(settings.shake*100)+'%';};
 $('presentation-form').oninput=apply;$('presentation-form').onsubmit=e=>{e.preventDefault();apply();closeModal();};}
 $('settings').onclick=presentationSettings;

$('open-lore').onclick=()=>openModal(`<span class="eyebrow">OS DONOS DA ESCURIDÃO</span><h2>Três arenas. Três maldições.</h2>${BOSSES.map((b,i)=>`<div class="lore-item"><strong style="color:${b.color}">${b.name}</strong><p>${b.title} · ${b.arena}<br>${['Desvie da espada e da onda de choque. A investida do cavaleiro interrompe preparações na primeira fase.','Evite as nuvens de veneno e as raízes. Na segunda fase, raízes sólidas bloqueiam partes do caminho.','Saia das marcas de explosão e do arco da foice. O Apocalipse adiciona zonas perigosas.'][i]}</p></div>`).join('')}`);
async function showRanking(){const revision=openModal('<span class="eyebrow">QUADRO DE LENDAS</span><h2>Expedições eternizadas.</h2><p>Consultando os registros…</p>');try{const rows=await api('leaderboard');if(!$('modal').open||revision!==modalRevision)return;$('modal-content').innerHTML=`<span class="eyebrow">QUADRO DE LENDAS</span><h2>Expedições eternizadas.</h2>${rows.length?`<table><thead><tr><th>#</th><th>EQUIPE</th><th>PONTOS</th><th>CHEFES</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.team)}</td><td>${r.score}</td><td>${r.wins}/3</td></tr>`).join('')}</tbody></table>`:'<p>As páginas ainda estão vazias. Sua equipe pode escrever a primeira lenda.</p>'}`;}catch(e){if(!$('modal').open||revision!==modalRevision)return;$('modal-content').innerHTML=`<h2>Registros indisponíveis.</h2><p>${esc(e.message)}</p>`;}}
$('ranking').onclick=showRanking;
$('audio-toggle').onclick=async()=>{const enabled=await audio.toggle();$('audio-toggle').textContent=enabled?'♪':'♫';$('audio-toggle').title=enabled?'Desativar áudio':'Ativar áudio';$('audio-toggle').setAttribute('aria-label',$('audio-toggle').title);toast(enabled?'Áudio ativado.':'Áudio desativado.');};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Tela cheia não está disponível neste navegador.');}};
async function authenticate(path,data){const result=await api(path,data);token=result.token;storageSet('iron-session',token);setSession(result.session);await connect();audio.fx('ui');}
$('guest-form').addEventListener('submit',async e=>{e.preventDefault();const btn=$('guest-submit');btn.disabled=true;try{await authenticate('guest',{name:$('player-name').value.trim()});storageSet('iron-name',$('player-name').value);}catch(error){toast(error.message,true);}finally{btn.disabled=false;}});
function accountForm(register){const revision=openModal(`<span class="eyebrow">${register?'ESCREVA SUA LENDA':'RETORNE À EXPEDIÇÃO'}</span><h2>${register?'Criar conta':'Entrar na conta'}</h2><p>A conta é opcional e protegida por senha. O código de sala é compartilhado separadamente.</p><form id="account-form"><label for="account-name">NOME DE USUÁRIO</label><input id="account-name" autocomplete="username" minlength="3" maxlength="20" required><label for="account-password">SENHA ${register?'· MÍNIMO 10 CARACTERES':''}</label><input id="account-password" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="${register?10:1}" maxlength="128" required><button class="primary" type="submit">${register?'Criar minha conta':'Entrar'} →</button><span id="account-error" class="muted" role="alert"></span></form>`);$('account-form').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await authenticate(register?'register':'login',{name:$('account-name').value,password:$('account-password').value});if(revision===modalRevision)closeModal();}catch(error){if(revision===modalRevision&&$('account-error'))$('account-error').textContent=error.message;}finally{btn.disabled=false;}};}
$('login').onclick=()=>accountForm(false);$('register').onclick=()=>accountForm(true);
$('logout').onclick=async()=>{try{await api('logout',{});}catch{}clearTimeout(reconnectTimer);token=null;storageSet('iron-session',null);ws?.close(1000);ws=null;connected=false;setSession(null);setStatus('SERVIDOR DISPONÍVEL','online');};
$('create-room').onclick=async()=>{try{await connect();send('create',{public:$('public-room').checked});}catch(error){toast(error.message,true);}};
$('create-solo').onclick=async()=>{try{await connect();send('create',{mode:'solo'});}catch(error){toast(error.message,true);}};
$('join-form').onsubmit=async e=>{e.preventDefault();try{await connect();send('join',{code:$('room-code').value});}catch(error){toast(error.message,true);}};
$('public-rooms').onclick=async()=>{const revision=openModal('<span class="eyebrow">EXPEDIÇÕES ABERTAS</span><h2>Encontre seus aliados.</h2><p>Buscando salas…</p>');try{const rows=await api('rooms');if(!$('modal').open||revision!==modalRevision)return;$('modal-content').innerHTML=`<span class="eyebrow">EXPEDIÇÕES ABERTAS</span><h2>Encontre seus aliados.</h2>${rows.length?rows.map(r=>`<div class="room-list-item"><div><strong>${esc(r.name)}</strong><small>${esc(r.code)} · ${r.players}/4 jogadores</small></div><button class="secondary" data-join="${esc(r.code)}">Entrar →</button></div>`).join(''):'<p>Nenhuma sala pública disponível agora. Crie uma expedição e convide seus amigos.</p>'}`;for(const btn of $('modal-content').querySelectorAll('[data-join]'))btn.onclick=()=>{send('join',{code:btn.dataset.join,...(nativeDesktop?{classId:desktopParams.get('class')||'knight'}:{})});closeModal();};}catch(error){if(!$('modal').open||revision!==modalRevision)return;$('modal-content').innerHTML=`<h2>Sem conexão.</h2><p>${esc(error.message)}</p>`;}};

function resetInput(){keys.clear();attacking=false;touchAttack=false;touchBlock=false;touchRevive=false;joystick={x:0,y:0};input.x=0;input.y=0;input.attack=false;input.block=false;input.revive=false;const thumb=$('joystick').firstElementChild;thumb.style.transform='';if(screen==='battle')sendInput();}
addEventListener('keydown',e=>{
  if(e.code==='Escape'&&$('modal').open){e.preventDefault();closeModal();return;}
  if(gamepads.locked&&e.code!=='Escape'&&screen==='battle'){e.preventDefault();return;}
  if(e.code==='Tab'&&screen==='battle'&&!$('modal').open){e.preventDefault();$('emote-wheel').hidden=!$('emote-wheel').hidden;resetInput();return;}
  if(!$('emote-wheel').hidden&&['Digit1','Digit2','Digit3','Digit4'].includes(e.code)){e.preventDefault();playEmote(Object.keys(EMOTES)[Number(e.code.at(-1))-1]);return;}
  if(e.code==='Escape'&&!$('emote-wheel').hidden){e.preventDefault();$('emote-wheel').hidden=true;return;}
  if(e.code==='Escape'){if(!$('modal').open&&screen==='battle'){e.preventDefault();help();}return;}
  if(screen!=='battle'||$('modal').open||e.target.matches('input,textarea'))return;
  if(['Space','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Digit1','Digit2','Digit3','Digit4','KeyE','KeyR','KeyJ','Equal','Minus'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(!e.repeat&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))sendInput();if(!e.repeat&&e.code==='KeyE')useDash();if(!e.repeat&&e.code==='Digit4')useItem();if(e.code==='Equal')setZoom(zoom+.1);if(e.code==='Minus')setZoom(zoom-.1);if(!e.repeat&&['Digit1','Digit2','Digit3'].includes(e.code))useSkill(Number(e.code.at(-1))-1);
});
addEventListener('keyup',e=>{keys.delete(e.code);if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))sendInput();});addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});
function worldPointer(e){const rect=canvas.getBoundingClientRect(),cover=portraitCamera(),s=(cover?Math.max:Math.min)(rect.width/WORLD.w,rect.height/WORLD.h),ox=(rect.width-WORLD.w*s)*(cover?cameraFraction:.5),oy=(rect.height-WORLD.h*s)/2;return{x:((e.clientX-rect.left-ox)/s-600)/viewZoom+viewX,y:((e.clientY-rect.top-oy)/s-380)/viewZoom+viewY};}
canvas.addEventListener('pointermove',e=>{if(!gamepads.locked&&e.pointerType==='mouse'){pointerClient={clientX:e.clientX,clientY:e.clientY};pointer=worldPointer(pointerClient);}});
canvas.addEventListener('pointerdown',e=>{if(!gamepads.locked&&e.button===0&&e.pointerType==='mouse'&&screen==='battle'&&!$('modal').open){attacking=true;pointerClient={clientX:e.clientX,clientY:e.clientY};pointer=worldPointer(pointerClient);e.preventDefault();canvas.setPointerCapture(e.pointerId);}});
addEventListener('pointerup',()=>{attacking=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
for(const [id,set] of [['touch-block',v=>touchBlock=v],['touch-attack',v=>touchAttack=v],['touch-revive',v=>touchRevive=v]]){
  const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);set(true);});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>set(false));
}
let stickId=null;
function updateStick(e){const rect=$('joystick').getBoundingClientRect(),dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2),len=Math.hypot(dx,dy),max=rect.width*.35,scale=len>max?max/len:1;joystick={x:dx*scale/max,y:dy*scale/max};$('joystick').firstElementChild.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
$('joystick').addEventListener('pointerdown',e=>{stickId=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);updateStick(e);e.preventDefault();});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(event,()=>{stickId=null;joystick={x:0,y:0};$('joystick').firstElementChild.style.transform='';});
function sampleIntent(){
  const modal=$('modal').open||document.hidden||!$('emote-wheel').hidden;
  if(gamepads.locked){Object.assign(input,gamepads.intent(0,modal));return input;}
  input.x=modal?0:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystick.x;
  input.y=modal?0:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joystick.y;
  input.block=!modal&&(keys.has('Space')||touchBlock);input.attack=!modal&&(attacking||touchAttack||keys.has('KeyJ'));input.revive=!modal&&(keys.has('KeyR')||touchRevive);
  return input;
}
function sendInput(){
  if(screen!=='battle'||!connected||!room)return;const p=me();if(!p)return;
  sampleIntent();
  if(gamepads.locked){for(const seat of gamepads.seats)localSeats.send(seat.slot,'input',gamepads.intent(seat.slot,$('modal').open||document.hidden||!$('emote-wheel').hidden));return;}
  if(pointerClient)pointer=worldPointer(pointerClient);
  const target=pointer||room.boss||{x:p.x+1,y:p.y},dx=target.x-(localVisual?.x??p.x),dy=target.y-(localVisual?.y??p.y),len=Math.hypot(dx,dy)||1;
  send('input',{...input,ax:dx/len,ay:dy/len,seq:++seq});
}
function playEmote(kind){$('emote-wheel').hidden=true;resetInput();send('emote',{emote:kind,seq:++seq});}
for(const button of $('emote-wheel').querySelectorAll('[data-emote]'))button.onclick=()=>playEmote(button.dataset.emote);
$('emote-open').onclick=()=>{$('emote-wheel').hidden=!$('emote-wheel').hidden;resetInput();};
$('emote-close').onclick=()=>{$('emote-wheel').hidden=true;};
function useDash(){if(gamepads.locked)return;if(screen!=='battle'||$('modal').open)return;sendInput();send('dodge',{seq:++seq});}
function useItem(){if(gamepads.locked)return;if(screen!=='battle'||$('modal').open)return;sendInput();send('potion',{seq:++seq});}
$('dash-slot').onclick=useDash;$('potion-slot').onclick=useItem;$('touch-dash').onclick=useDash;
canvas.addEventListener('wheel',e=>{if(!gamepads.locked&&screen==='battle'){e.preventDefault();setZoom(zoom-Math.sign(e.deltaY)*.08);}},{passive:false});
setInterval(sendInput,50);setInterval(()=>{if(connected)send('ping',{time:performance.now()});},2500);

function burst(x,y,color,count=15,speed=90){
  const max=Math.min(count,400-particles.length);for(let i=0;i<max;i++){const a=Math.random()*Math.PI*2,s=(.25+Math.random())*speed;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-25,life:.3+Math.random()*.55,total:.85,color,size:Math.random()<.2?4:2});}
}
function ring(x,y,r,color,duration=.55){rings.push({x,y,r,color,life:duration,total:duration});}
function eventEffect(e){
  const info=BOSSES[room.round];
  if(e.type==='round'){resetLighting();positions.clear();resetAnimationState();resetPoseMixes();hurtCamera.reset();localMotion.reset();resetFX();rings.length=particles.length=floats.length=0;}
  if(e.type==='gate'){impactFX(e.x,e.y,'gold',true);audio.fx('gate');shake=3;}
  if(e.type==='awaken'){magicFX(e.x,e.y,e.round===1?'green':e.round===2?'violet':'red',60);audio.fx('roar',e.round);ring(e.x,e.y,270,info.color,1.5);shake=4;}
  if(e.type==='hit'){emitLight(e.x,e.y,'#ffe3a9',100,.18,.35);impactFX(e.x,e.y+25,room.round===1?'green':room.round===2?'violet':'gold');
    burst(e.x,e.y+22,'#d9b39b',7);const old=floats.find(f=>f.owner===e.owner&&f.target===e.target&&f.life>.72);if(old){old.amount+=e.amount;old.text=Math.round(old.amount).toString();old.life=1;}else{const i=room.players.findIndex(p=>p.id===e.owner);floats.push({owner:e.owner,target:e.target,amount:e.amount,x:e.x+(i-1.5)*25,y:e.y-12-(i%2)*19,text:Math.round(e.amount).toString(),color:e.owner===session.id?'#f1d4a0':'#c4c6ae',life:1});}audio.fx(room.players.find(p=>p.id===e.owner)?.classId==='knight'?'heavyHit':'hit');
  }
  if(e.type==='attack'){
    attackUntil.set(e.owner,frameTime+.5);
    if(e.kind!=='archer')slashFX(e.x,e.y,e.angle,e.kind==='rogue'?'violet':'gold',e.slot===1,e.slot>=0?0:.12,e.id);
    if(e.slot>=0)magicFX(e.x,e.y,e.kind==='archer'?'green':e.kind==='rogue'?'violet':'gold',12);audio.fx(e.kind==='archer'?'arrow':e.slot===2?'magic':e.kind==='rogue'?'dagger':'sword');
    if(e.slot===2&&e.kind==='knight'){burst(e.x,e.y,'#e7cb85',28);ring(e.x,e.y,170,'#e4c583',.8);}
  }
  if(e.type==='shot'){emitLight(e.x,e.y,e.color==='ice'?'#a7e5ff':'#e0d294',95,.18,.3);}if(e.type==='shot')bowFX(e.x,e.y,Math.atan2(e.vy,e.vx),e.color==='ice'?'ice':e.color==='pierce'?'gold':'green',0);
  if(e.type==='hurt'){emitLight(e.x,e.y,e.blocked?'#b3dce9':'#ea6472',90,.2,.35);
    impactFX(e.x,e.y-12,e.blocked?'gold':'red');
    burst(e.x,e.y-20,e.blocked?'#a8cee4':'#d96973',e.blocked?12:19);floats.push({x:e.x,y:e.y-65,text:'−'+Math.round(e.amount),color:e.blocked?'#a4d6e3':'#f2a19e',life:1});audio.fx(e.blocked?'block':'hit');if(localSeats.players().some(s=>s.player.id===e.owner)){const slot=localSeats.players().find(s=>s.player.id===e.owner).slot;gamepads.rumble(slot,e.amount,e.blocked);shake=Math.max(shake,e.blocked?1.5:Math.min(7,2+e.amount*.12));hurtCamera.hit(e.angle||0,e.amount,e.blocked);flash=e.blocked?0:.06*settings.shake;}
  }
  if(e.type==='revived'){emitLight(e.x,e.y,'#b9edc6',120,.85,.42);magicFX(e.x,e.y,'green',22);ring(e.x,e.y,46,'#c6ecc5',.65);audio.fx('pickup');}
  if(e.type==='emote'){magicFX(e.x,e.y,'gold',8);audio.fx('ui');}
  if(e.type==='dodge'){footFX(e.x,e.y);audio.fx('dash');}
  if(e.type==='summon'){magicFX(e.x,e.y,'violet',26);ring(e.x,e.y,35,info.color,1.5);audio.fx('summon');}
  if(e.type==='minionAttack'&&e.kind!=='acolyte')slashFX(e.x,e.y,e.angle,e.kind==='thornling'?'green':'red',false,1.15,e.id);
  if(e.type==='minionDeath'){impactFX(e.x,e.y,room.round===1?'green':'violet',true);audio.fx('minion');}
  if(e.type==='keyDrop'){emitLight(e.x,e.y,e.color,220,4,.35);magicFX(e.x,e.y,'gold',60);audio.fx('pickup');}
  if(e.type==='keyPickup'){emitLight(e.x,e.y,e.color,190,1.1,.4);audio.fx('pickup');toast(e.name+' recolhida.');}
  if(e.type==='secretGate'){audio.fx('gate');emitLight(600,210,'#f4d69a',400,3,.55);shake=4;}
  if(e.type==='pickup'){if(e.owner===session.id)toast(e.kind==='heal'?'Poção de cura coletada · use 4':'Poção de gelo coletada · use 4');audio.fx('pickup');magicFX(e.x,e.y,e.kind==='ice'?'ice':'green',14);}
  if(e.type==='venom')magicFX(e.x,e.y,'green',18);
  if(e.type==='frost'){ring(e.x,e.y,e.r,'#b8eeff',1);magicFX(e.x,e.y,'ice',60);audio.fx('frost');}
  if(e.type==='dash'){for(let i=0;i<8;i++)burst(e.x+(e.tx-e.x)*i/8,e.y+(e.ty-e.y)*i/8,e.kind==='rogue'?'#a995d5':'#d9be85',3,30);}
  if(e.type==='impact'){if(!e.minor){const d=e.shape==='cone'?e.r*.4:0;emitLight(e.x+Math.cos(e.angle||0)*d,e.y+Math.sin(e.angle||0)*d,info.color,Math.min(330,Math.max(140,e.r||e.width||140)),.75,.62);}hazardImpact(e,room.round===1?'green':room.round===2?'violet':'red');shake=Math.max(shake,e.minor?2:9);audio.fx(e.minor?'attack':'boss',room.round);}
  if(e.type==='heal'){burst(e.x,e.y-20,'#9ce6b6',28);ring(e.x,e.y,70,'#a0e5b3');audio.fx('heal');}
  if(e.type==='warning'||e.type==='phase'){if(e.type==='phase')warning(e.text,3);audio.fx('warning');if(e.type==='phase'){ring(e.x,e.y,310,info.color,1.4);burst(e.x,e.y,info.color,50,200);shake=7;}}
  if(e.type==='notice')toast(e.text);
  if(e.type==='bossAttack'){attackUntil.set('boss',frameTime+.6);audio.fx('roar',room.round);slashFX(e.x,e.y,room.boss.facing,room.round===1?'green':room.round===2?'violet':'red',true,0,e.id);}
  if(e.type==='victory'||e.type==='defeat'){audio.fx(e.type);if(e.type==='victory'){burst(room.boss.x,room.boss.y,info.color,70,210);shake=8;}}
}
function warning(text,seconds){$('danger').textContent=text;warningUntil=frameTime+seconds;$('danger').classList.add('visible');}
function smoothPosition(id,target,dt,now){
 if(seatVisual.has(id))return{...target,...seatVisual.get(id)};
 if(id===session?.id&&localVisual){positions.set(id,{x:localVisual.x,y:localVisual.y});return{...target,...localVisual};}
 const p=tracks.get(id)?.sample(now-.065,target)||target;positions.set(id,{x:p.x,y:p.y});return p;
}
function drawHazard(h,now,time){drawTelegraph(ctx,h,now,time,room.round);}
function drawShield(p,time){
  if(!p.block&&p.shieldUntil<=(room?.now||0))return;
  const wall=p.shieldUntil>(room?.now||0),r=wall?43:30;ctx.save();ctx.translate(p.x,p.y-19);ctx.strokeStyle=wall?'#e8cc8ba0':'#9bd2dfbb';ctx.fillStyle=wall?'#cbb26612':'#7abccc16';ctx.lineWidth=2;
  ctx.beginPath();if(wall)ctx.ellipse(0,0,r,r*1.15,0,0,Math.PI*2);else ctx.arc(0,0,r,p.facing-1.5,p.facing+1.5);ctx.stroke();ctx.fill();
  for(let i=0;i<5;i++){const a=time+i*1.25;ctx.fillStyle=wall?'#ead39f':'#b4e3e9';ctx.fillRect(Math.cos(a)*r,Math.sin(a)*r*1.1,2,3);}ctx.restore();
  if(wall)light(ctx,p.x,p.y,125,'#e5c778',.1);
}
function drawDrop(d,time){
  const ice=d.kind==='ice',color=ice?'#a7e8ff':'#f2a3a2',y=d.y-16+Math.sin(time*3+d.x)*3;
  light(ctx,d.x,d.y-10,62,color,.16);ctx.save();ctx.fillStyle='#030b1280';ctx.beginPath();ctx.ellipse(d.x,d.y+5,16,6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.globalAlpha=.4;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(d.x,d.y+5,16,7,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<5;i++){const a=time*1.5+i*Math.PI*2/5;ctx.fillStyle=color;ctx.globalAlpha=.35+Math.sin(time*4+i)*.2;ctx.fillRect(d.x+Math.cos(a)*17,d.y-6+Math.sin(a)*6-(time*9+i*7)%25,2,2);}ctx.globalAlpha=1;
  if(!drawItemSprite(ctx,d.kind,d.x,y,42,time)){ctx.fillStyle=color;ctx.fillRect(d.x-6,y-8,12,16);}
  ctx.restore();
}
function drawProjectiles(projectiles){for(const p of projectiles)drawProjectile(ctx,p,frameTime);}

function render(time){
  paintItemIcon($('brand-crown'),'cursed',time/1000);
  const cpuStart=performance.now(),frameInterval=time-previousFrame;const dt=Math.min(.05,frameInterval/1000);previousFrame=time;frameTime=time/1000;updateControllers();
  ctx.clearRect(0,0,WORLD.w,WORLD.h);ctx.save();
  if(shake>.1&&!reducedMotion){ctx.translate((Math.random()-.5)*shake*settings.shake,(Math.random()-.5)*shake*settings.shake);}shake*=Math.exp(-dt*12);const hurtView=hurtCamera.step(dt,reducedMotion?0:settings.shake);ctx.translate(hurtView.x,hurtView.y);
  const gameplay=room&&room.state!=='lobby',round=gameplay?room.round:0,now=room?room.now+(time-snapshotAt)/1000:0;
  const own=me();localVisual=room?.state==='battle'&&own?localMotion.step(sampleIntent(),time/1000,dt,now,solidsNow,room.boss):null;
  seatVisual.clear();if(room?.state==='battle')for(const {slot,player}of localSeats.players())if(slot&&seatMotion.has(player.id)){const p=seatMotion.get(player.id).step(gamepads.intent(slot,$('modal').open),time/1000,dt,now,solidsNow,room.boss);if(p)seatVisual.set(player.id,p);}
  if(gamepads.locked&&own){const a=gamepads.seats[0]?.aim||{x:1,y:0},p=localVisual||own;pointer={x:p.x+a.x*160,y:p.y+a.y*160};}
  const localParty=localSeats.players().map(s=>seatVisual.get(s.player.id)||s.player).filter(p=>p.hp>0),sharedCamera=localParty.length>1;
  const partyCenter=sharedCamera?{x:(Math.min(...localParty.map(p=>p.x))+Math.max(...localParty.map(p=>p.x)))/2,y:(Math.min(...localParty.map(p=>p.y))+Math.max(...localParty.map(p=>p.y)))/2}:null;
  const sharedZoom=sharedCamera?Math.max(1,Math.min(zoom,1000/(Math.max(...localParty.map(p=>p.x))-Math.min(...localParty.map(p=>p.x))+200),540/(Math.max(...localParty.map(p=>p.y))-Math.min(...localParty.map(p=>p.y))+180))):zoom;
  const keyScene=gameplay&&room.keyDrop&&now<room.keySceneUntil;const keyBanner=$('key-announcement');keyBanner.hidden=!keyScene;if(keyScene){keyBanner.style.setProperty('--key-color',room.keyDrop.color);$('reward-name').textContent=room.keyDrop.name;$('reward-caption').textContent=room.keyDrop.collectedAt?'CHAVE CONQUISTADA · PASSAGEM LIBERADA':'UM SELO MÁGICO FOI REVELADO';const kc=$('reward-key').getContext('2d');kc.clearRect(0,0,128,128);drawMagicalKey(kc,round,64,64+Math.sin(now*3)*3,104,now);}const ending=gameplay&&room.state==='ending'&&!keyScene;
  const corridor=gameplay&&room.state==='round_end'&&now-room.outroStarted>=6&&!keyScene,awakening=room?.state==='countdown'&&now>=room.intro?.awakeningAt&&now<room.intro.awakeningAt+4.4;
  const emoteShot=localEmoteShot(room,localSeats.players().map(s=>s.player.id),now,zoom);
  const broadCast=settings.autoCamera&&room?.boss?.state==='windup'&&room.hazards.some(h=>h.r>220||h.length>400);viewZoom+=((ending?(room.secretUnlocked?1:1.1):keyScene?Math.min(zoom,1.3):corridor?1:awakening?Math.min(zoom,1.25):emoteShot?emoteShot.zoom:sharedCamera?sharedZoom:broadCast?Math.max(1.1,zoom-.14):zoom)-viewZoom)*(1-Math.exp(-dt*4));
  $('results').classList.toggle('corridor',!!corridor);document.body.classList.toggle('in-cinematic',!!(ending||keyScene||corridor||room?.state==='countdown'&&room.transitionAt-now>3));
  document.body.classList.toggle('secret-ending',!!(ending&&room.secretUnlocked));const story=$('story-card');let tale=null;if(ending&&now-room.endingAt>(room.secretUnlocked?11:2.5))tale=endingStory(room.wins);else if(corridor){const bridge=BRIDGES[round];tale={chapter:'ENTRE AS SOMBRAS',title:bridge[0],text:bridge[1]};}else if(room?.state==='countdown'&&now-room.intro.started<3.5)tale=STORY[round];story.hidden=!tale;if(tale){$('story-chapter').textContent=tale.chapter;$('story-title').textContent=tale.title;$('story-text').textContent=tale.text;}
  let fade=0;if(room?.state==='countdown')fade=clamp(1-(now-room.intro.started)/.8,0,1);if(room?.state==='round_end')fade=clamp((now-room.transitionAt+.65)/.65,0,1);$('scene-fade').style.opacity=fade;
  const caption=$('cinema-caption');caption.hidden=!corridor&&!awakening&&!keyScene&&!(ending&&room.secretUnlocked&&now-room.endingAt<11);if(ending&&room.secretUnlocked)caption.textContent='OS TRÊS SELOS · A CÂMARA DA COROA';if(keyScene)caption.textContent=room.keyDrop.collectedAt?room.keyDrop.name.toUpperCase()+' · PASSAGEM LIBERADA':'A CHAVE DO GUARDIÃO · '+room.keyDrop.name.toUpperCase();else if(corridor)caption.textContent='PELAS PROFUNDEZAS · '+BOSSES[Math.min(2,round+1)].arena.toUpperCase();else if(awakening)caption.textContent=['VARKHUL REIVINDICA A COROA DE FERRO','AS RAÍZES DESPERTAM. THARAZUL SE ERGUE.','O ECLIPSE CHEGOU. AS SEIS ASAS SE ABREM.'][round];
  const cover=portraitCamera(),rect=stageRect;canvas.style.objectFit=cover?'cover':'contain';canvas.style.objectPosition='50% 50%';cameraFraction=.5;
  const screenScale=cover?Math.max(rect.width/WORLD.w,rect.height/WORLD.h):Math.min(rect.width/WORLD.w,rect.height/WORLD.h);
  const visibleW=(cover?rect.width/screenScale:WORLD.w)/viewZoom,visibleH=(cover?rect.height/screenScale:WORLD.h)/viewZoom;
  if(gameplay){const raw=localVisual||me()||room.players[0],hero=room.state==='countdown'||ending?cinematicPlayer(room,raw,room.players.indexOf(raw),now):raw,p=ending||corridor?{x:600,y:380}:awakening?room.boss:keyScene?room.keyDrop:emoteShot?emoteShot:sharedCamera?partyCenter:cameraFocus(hero,pointer,settings.autoCamera&&!reducedMotion),t=1-Math.exp(-dt*5);const tx=clamp(p?.x||600,visibleW/2,WORLD.w-visibleW/2),ty=clamp(p?.y||380,visibleH/2,WORLD.h-visibleH/2);viewX+=(tx-viewX)*t;viewY+=(ty-viewY)*t;ctx.translate(600,380);ctx.scale(viewZoom,viewZoom);ctx.translate(-viewX,-viewY);}
  else{viewX=600;viewY=380;}
  const cameraLeft=viewX-visibleW/2,cameraWidth=visibleW;
  setRenderBounds(gameplay?{left:viewX-WORLD.w/viewZoom/2,right:viewX+WORLD.w/viewZoom/2,top:viewY-WORLD.h/viewZoom/2,bottom:viewY+WORLD.h/viewZoom/2}:null);
  stepFX(dt);stepLighting(dt,round,frameTime,room?.projectiles||[]);
  if(corridor)drawCorridor(ctx,frameTime);else ctx.drawImage(ending&&room.secretUnlocked&&sceneImage('secret-chamber')||terrain(round),0,0,WORLD.w,WORLD.h);if(!corridor){drawGroundLighting(ctx,round);drawGroundFX(ctx);}
  if(gameplay&&!corridor){for(const h of room.hazards)drawHazard(h,now,frameTime);}
  else{
    // Actual engine artwork is also used by the atmospheric title diorama.
    light(ctx,820,335,300,'#9d5b58',.13);light(ctx,400,550,230,'#5e8790',.13);
  }
  const objects=[];
  const obs=corridor||ending&&room.secretUnlocked?[]:ARENA_OBSTACLES[round];
  if(gameplay&&!corridor&&!ending){objects.push({y:380,draw:()=>drawGate(ctx,room,now)});drawAwakening(ctx,room.boss,round,now,room.intro);}
  for(const o of obs.filter(o=>!o.renderSkip))objects.push({y:o.y,draw:()=>pillar(ctx,o,round)});
  const boss=corridor||ending&&room.secretUnlocked?null:gameplay?smoothPosition('boss',room.boss,dt,now):{x:815,y:360,hp:100,state:'idle',facing:Math.PI};
  if(boss){objects.push({y:boss.y,draw:()=>drawBoss(ctx,boss,round,frameTime,now)});if(gameplay&&boss.phase>=2)light(ctx,boss.x,boss.y-40,170,BOSSES[round].color,.12);}
  const list=ending&&room.secretUnlocked?epilogueCast(room):room?room.players:[{id:'preview-knight',name:'',x:460,y:470,classId:'knight',facing:-.4,hp:160},{id:'preview-archer',name:'',x:340,y:380,classId:'archer',facing:0,hp:100},{id:'preview-rogue',name:'',x:555,y:530,classId:'rogue',facing:-1,hp:115}];
  for(const [index,raw]of list.entries()){
    const p=gameplay?(ending||corridor||room.state==='countdown'?cinematicPlayer(room,raw,index,now):smoothPosition(raw.id,raw,dt,now)):raw;
    objects.push({y:p.y,draw:()=>{
      if(gameplay&&localSeats.players().some(s=>s.player.id===p.id)){ctx.strokeStyle='#dcc28766';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y+8,23,10,0,0,Math.PI*2);ctx.stroke();}
      drawPlayer(ctx,p,frameTime,{alpha:p.connected===false?.4:1,attacking:attackUntil.get(p.id)>frameTime,now});
      if(gameplay){
        drawShield(p,frameTime);
        if(p.rootUntil>now){ctx.strokeStyle='#a0bb67';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(p.x,p.y-6-i*6,20,7,0,0,Math.PI*2);ctx.stroke();}}
        ctx.textAlign='center';ctx.font='10px Arial';ctx.fillStyle=p.id===session?.id?'#ebd3a4':'#c6d2c0';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(p.name+(p.isBot?' · IA':room.couch?' · J'+((localSeats.players().find(s=>s.player.id===p.id)?.slot??0)+1):''),p.x,p.y-69);ctx.shadowBlur=0;
        if(p.hp<=0&&!p.eliminated){ctx.fillStyle='#e1b1a2';ctx.font='bold 17px Arial';ctx.fillText('+',p.x,p.y-35);}
        if(p.revive>0){const down=room.players.find(a=>a.id===p.reviveTarget);if(down)drawRescueLink(ctx,p,positions.get(down.id)?{...down,...positions.get(down.id)}:down,now);}
      }
    }});
  }
  if(gameplay)for(const raw of room.minions||[]){const m=smoothPosition(raw.id,raw,dt,now);objects.push({y:m.y,draw:()=>drawMinion(ctx,m,frameTime,now)});}
  if(gameplay&&!ending&&!corridor)for(const d of room.drops||[])drawDrop(d,frameTime);
  objects.sort((a,b)=>a.y-b.y);for(const o of objects)o.draw();
  if(gameplay)drawProjectiles(room.projectiles);if(ending){if(room.secretUnlocked)drawSecretEnding(ctx,room,now);else drawEnding(ctx,room,now);}if(keyScene)drawKeyReward(ctx,room,now);if(gameplay&&!corridor&&!ending)drawKeyPassage(ctx,room,now);
  for(const [x,y] of [[85,105],[1115,105],[85,665],[1115,665]])torch(ctx,x,y,frameTime,round===1?'#afd28b':round===2?'#ba99ed':'#f1b37c');
  for(let i=rings.length-1;i>=0;i--){const p=rings[i];p.life-=dt;if(p.life<=0){rings.splice(i,1);continue;}const progress=1-p.life/p.total;ctx.globalAlpha=p.life/p.total;ctx.strokeStyle=p.color;ctx.lineWidth=p.slash?5:2;ctx.beginPath();if(p.slash)ctx.arc(p.x,p.y-17,p.r*(.5+progress*.5),p.angle-1.2+progress,p.angle+1.2+progress);else ctx.ellipse(p.x,p.y,p.r*(.3+progress*.7),p.r*(.3+progress*.7)*.6,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=45*dt;ctx.globalAlpha=clamp(p.life/.3,0,1);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);}ctx.globalAlpha=1;
  drawLightSpill(ctx);effectsSurface.record(frameInterval/1000,effectsStats().fields>0);setEffectsDensity(effectsSurface.scale);drawFX(ctx);
  if(room?.state==='battle'&&settings.outline)for(const {player}of localSeats.players()){const p=player.id===session?.id?(localVisual||player):(seatVisual.get(player.id)||player);if(p.hp>0&&(effectsOcclude(p)||boss&&p.y<boss.y&&Math.hypot(p.x-boss.x,p.y-boss.y)<140))drawPlayerHighlight(ctx,p,frameTime,now);}
  if(gameplay&&!corridor&&!ending){
    for(const h of room.hazards)drawTelegraphEdge(ctx,h,now);
    const p=me();if(p&&p.hp>0){const pos=positions.get(p.id)||p;ctx.strokeStyle='#fce6b9bb';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(pos.x-7,pos.y+15);ctx.lineTo(pos.x,pos.y+19);ctx.lineTo(pos.x+7,pos.y+15);ctx.stroke();}
  }
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.life-=dt;f.y-=30*dt;if(f.life<=0){floats.splice(i,1);continue;}ctx.globalAlpha=Math.min(1,f.life*3);ctx.font='bold 16px Georgia';ctx.textAlign='center';ctx.strokeStyle='#17202b';ctx.lineWidth=3;ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;
  // Mist and drifting embers are deterministic, independent of network simulation.
  for(let i=0;i<25;i++){const x=(i*197+frameTime*(i%3+1)*4)%1200,y=(i*97+Math.sin(frameTime*.5+i)*17)%760;ctx.globalAlpha=.2+Math.sin(frameTime+i)*.12;ctx.fillStyle=round===1?'#afc29a':round===2?'#bba9dc':'#c5a77f';ctx.fillRect(x,y,2,2);}ctx.globalAlpha=1;
  const shade=ctx.createRadialGradient(600,380,130,600,380,760);shade.addColorStop(0,'transparent');shade.addColorStop(1,'#040c178c');ctx.fillStyle=shade;ctx.fillRect(0,0,1200,760);
  if(gameplay&&!ending&&!corridor&&room?.boss){
    const top=viewY-visibleH/2,b=room.boss;
    if(b.x<cameraLeft+30||b.x>cameraLeft+cameraWidth-30||b.y<top+30||b.y>top+visibleH-30){
      const x=clamp(b.x,cameraLeft+28,cameraLeft+cameraWidth-28),y=clamp(b.y,top+110/zoom,top+visibleH-45/zoom),a=Math.atan2(b.y-viewY,b.x-viewX);
      ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=BOSSES[round].color;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle=BOSSES[round].color;ctx.font='8px Arial';ctx.textAlign='center';ctx.fillText(BOSSES[round].name,x,y+17);
    }
  }
  if(flash>0){ctx.fillStyle=`rgba(170,30,45,${flash})`;ctx.fillRect(0,0,1200,760);flash=Math.max(0,flash-dt);}
  ctx.restore();
  if(hurtView.flash>0){const a=hurtView.angle+Math.PI,ex=600+Math.cos(a)*680,ey=380+Math.sin(a)*450,g=ctx.createRadialGradient(ex,ey,20,ex,ey,750);g.addColorStop(0,'#dc4b65');g.addColorStop(1,'transparent');ctx.save();ctx.globalAlpha=hurtView.flash*.24;ctx.fillStyle=g;ctx.fillRect(0,0,1200,760);ctx.restore();}
  if(screen==='battle'&&room){
    if(room.state==='countdown'&&room.transitionAt-now<=3)$('countdown').innerHTML=`<small>${BOSSES[room.round].arena.toUpperCase()}</small><span>${BOSSES[room.round].title}</span><strong>${Math.max(1,Math.ceil(room.transitionAt-now))}</strong>`;else $('countdown').textContent='';
    const line=room.state==='countdown'?room.dialogue?.find(d=>now>=d.at&&now<d.until):null;
    $('dialogue').hidden=!line;if(line){
      const key=round+':'+line.at+':'+line.name;
      if(dialogueKey!==key){dialogueKey=key;const box=$('dialogue');box.dataset.boss=String(!!line.boss);box.style.setProperty('--voice',line.boss?BOSSES[round].color:CLASSES[line.classId].color);$('dialogue-name').textContent=line.name;$('dialogue-role').textContent=line.boss?BOSSES[round].title.toUpperCase():CLASSES[line.classId].name.toUpperCase()+' · A ÚLTIMA EXPEDIÇÃO';$('dialogue-scene').textContent=BOSSES[round].arena.toUpperCase();const c=$('dialogue-portrait').getContext('2d');c.clearRect(0,0,128,128);c.imageSmoothingEnabled=false;if(line.boss){const image=bossSprite(round,0);c.drawImage(image,image.width*.25,image.height*.08,image.width*.5,image.height*.48,0,0,128,128);}else drawPlayer(c,{id:'voice-'+line.classId,x:64,y:174,facing:Math.PI/2,classId:line.classId,hp:100},0,{scale:2.1,now});}
      const letters=Array.from(line.text),revealed=reducedMotion?letters.length:Math.min(letters.length,Math.floor(Math.max(0,now-line.at)*65));const speech=letters.slice(0,revealed).join('');if($('dialogue-text').textContent!==speech)$('dialogue-text').textContent=speech;const beat=Math.min(2,Math.floor((now-line.at)/Math.max(.1,line.until-line.at)*3));$('dialogue-beats').textContent=[0,1,2].map(i=>i===beat?'◆':'◇').join(' ');
    }
    if(frameTime>warningUntil)$('danger').classList.remove('visible');
  }
  if(screen==='results'&&room?.state==='round_end'&&$('next-round'))$('next-round').textContent=`Próxima arena em ${Math.max(0,Math.ceil(room.transitionAt-now))} segundos · ${BOSSES[Math.min(2,room.round+1)].arena}`;
  if(screen==='battle'&&room?.state==='battle'&&frameTime-lastStep>.43){const p=me();if(p&&p.hp>0&&Math.hypot(p.vx,p.vy)>25){audio.fx('step');footFX(p.x,p.y+3);lastStep=frameTime;}}
  audio.music(frameTime,round,screen==='battle'&&room?.state==='battle');const perf=monitor.record(frameInterval,performance.now()-cpuStart);if(time-perfLast>500){perfLast=time;const el=$('performance');el.hidden=!settings.showPerf;if(settings.showPerf){const fx=effectsStats();el.textContent=Math.round(perf.fps)+' FPS · P95 '+perf.p95.toFixed(1)+'ms · CPU '+perf.cpu.toFixed(1)+'ms · '+fx.particles+' partículas';}window.IRON_PERF={...perf,...effectsStats(),...effectsSurface.stats(),quality:settings.quality,lights:lightingStats(),camera:{x:viewX,y:viewY,zoom:viewZoom,emote:emoteShot?.owner||null}};}requestAnimationFrame(render);
}
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();if(room)help();else showScreen('home');});
window.IRON_ART={exportAtlas,bossSprite,playerSprite};
requestAnimationFrame(render);
$('player-name').value=storageGet('iron-name')||'';
async function boot(){
  if(nativeDesktop&&window.ironPreferences){try{settings=cleanSettings(await window.ironPreferences.get());setEffectsQuality(settings.quality);configureLighting(settings.lighting,settings.quality);effectsSurface.configure(settings.quality,settings.autoEffects);audio.configure(settings);}catch{}}
  try{await api('health');setStatus(nativeDesktop?'PC · SEM HOSPEDAGEM':'SERVIDOR DISPONÍVEL','online');
    if(nativeDesktop){
      const name=(desktopParams.get('name')||'Viajante').slice(0,20);let reused=false;
      if(token){try{const result=await api('session');if(result.session.name===name){setSession(result.session);await connect();reused=true;}}catch{token=null;storageSet('iron-session',null);}}
      if(!reused)await authenticate('guest',{name});
      if(!room){const mode=desktopParams.get('mode');if(mode==='solo'||mode==='couch'||mode==='host')send('create',{mode:mode==='solo'?'solo':mode==='couch'?'couch':'lan',public:mode==='host',classId:desktopParams.get('class')||'knight'});else if(desktopParams.get('code'))send('join',{code:desktopParams.get('code'),classId:desktopParams.get('class')||'knight'});else $('public-rooms').click();}
      return;
    }
    if(token){const result=await api('session');setSession(result.session);await connect();}}
  catch(error){if(token&&error.message.includes('Sessão')){token=null;storageSet('iron-session',null);setSession(null);setStatus('SERVIDOR DISPONÍVEL','online');}else{setStatus('SERVIDOR OFFLINE','offline');toast(error.message,true);}}
}
boot();

function updateControllers(){
 let frames=[];try{frames=gamepads.poll(navigator.getGamepads?.()||[]);}catch{}
 const signature=gamepads.seats.map(s=>s.slot+':'+s.connected+':'+s.kind).join();
 if(signature!==controllerSignature){const was=controllerSignature;controllerSignature=signature;document.body.classList.toggle('controller-mode',gamepads.locked);pointerClient=pointer=null;keys.clear();attacking=false;lobbySignature='';if(gamepads.locked)audio.enable();if(screen==='battle')buildAbilities();if(was)resetInput();}
 for(const frame of frames){
  if(frame.slot&&room?.couch&&room.state==='lobby')localSeats.ensure(frame.slot);
  if(frame.pressed.has(9)){if($('modal').open){closeModal();continue;}if(room?.state==='lobby'){if(assetsReady&&room.owner===localSeats.id(frame.slot)&&room.players.every(p=>p.ready&&p.connected))localSeats.send(frame.slot,'start');continue;}if(screen==='battle'){help();continue;}}
  if($('modal').open){if(frame.pressed.has(1))closeModal();else padMenu(frame,$('modal'));continue;}
  if(screen==='lobby'&&room){const id=localSeats.id(frame.slot),p=room.players.find(p=>p.id===id);if(!p)continue;const classes=Object.keys(CLASSES);if(frame.pressed.has(14)||frame.pressed.has(15)){const d=frame.pressed.has(14)?-1:1;pendingReadySlots.delete(frame.slot);localSeats.send(frame.slot,'class',{classId:classes[(classes.indexOf(p.classId)+d+classes.length)%classes.length]});}if(frame.pressed.has(0)){if(assetsReady)localSeats.send(frame.slot,'ready',{ready:!p.ready});else pendingReadySlots.set(frame.slot,{code:room.code,ready:!p.ready});}if(frame.pressed.has(1)){pendingReadySlots.delete(frame.slot);localSeats.send(frame.slot,'ready',{ready:false});}continue;}
  if(screen==='results'){if(frame.slot===0)padMenu(frame,$('results'));continue;}
  if(screen!=='battle'||room?.state!=='battle')continue;
  if([0,3,5,7,12].some(b=>frame.pressed.has(b)))localSeats.send(frame.slot,'input',gamepads.intent(frame.slot));
  if(frame.pressed.has(0))localSeats.send(frame.slot,'dodge');
  for(const [button,slot]of [[3,0],[5,1],[7,2]])if(frame.pressed.has(button))localSeats.send(frame.slot,'skill',{slot});
  if(frame.pressed.has(12))localSeats.send(frame.slot,'potion');
  if(frame.pressed.has(13)){const seat=gamepads.seats[frame.slot];localSeats.send(frame.slot,'emote',{emote:Object.keys(EMOTES)[(seat.emoteIndex||0)%4]});seat.emoteIndex=(seat.emoteIndex||0)+1;}
 }
}
function updateLocalHUD(){
 if(!room)return;const seats=localSeats.players(),party=seats.length>1;document.body.classList.toggle('couch-active',party);$('couch-hud').hidden=!party;
 const p=me(),combo=p?.combo;$('combo-meter').hidden=!combo?.count||party;if(combo?.count){$('combo-meter').innerHTML=`<strong>${combo.count} HITS</strong><span>×${combo.multiplier.toFixed(2)} · +${Math.floor(p.stats.comboPoints||0)} pontos</span><i style="width:${Math.max(0,(combo.until-room.now)/3.5*100)}%"></i>`;}
 const labels=gamepads.locked?padLabels(gamepads.seats[0]?.kind):null;if(labels){$('dash-slot').querySelector('kbd').textContent=labels.dash;$('potion-slot').querySelector('kbd').textContent='↑';document.querySelector('.battle-tips').innerHTML=`<span>${labels.attack} atacar</span><span>${labels.block} defender</span><span>${labels.revive} segurar para reviver</span>`;}else{$('dash-slot').querySelector('kbd').textContent='E';$('potion-slot').querySelector('kbd').textContent='4';document.querySelector('.battle-tips').innerHTML='<span>R segurar para reviver</span><span>Mouse ataque básico</span><span>Espaço defender</span>';}
 if(!party)return;
 $('couch-hud').innerHTML=seats.map(({slot,player:p})=>{const pad=gamepads.seats[slot],l=padLabels(pad?.kind),c=p.combo;return `<section class="couch-player" style="--seat:${['#dfbd7d','#89cba0','#bfa5e8'][slot]}"><header><strong>J${slot+1} · ${esc(p.name)}</strong><small>${p.hp<=0?'CAÍDO':!pad?.connected?'CONTROLE DESCONECTADO':CLASSES[p.classId].name}</small></header><div class="couch-resource health"><i style="width:${p.hp/p.maxHp*100}%"></i><span>♥ ${Math.ceil(p.hp)} / ${p.maxHp}</span></div><div class="couch-resource energy"><i style="width:${p.energy}%"></i><span>⚡ ${Math.floor(p.energy)}</span></div><div class="couch-skills">${[0,1,2].map((n)=>`<span class="${p.cds[n]>room.now||p.energy<COSTS[n]?'unavailable':''}">${[l.skill1,l.skill2,l.skill3][n]} ${p.cds[n]>room.now?(p.cds[n]-room.now).toFixed(1)+'s':COSTS[n]+'⚡'}</span>`).join('')}<span>${l.dash} ${p.dodgeReady>room.now?(p.dodgeReady-room.now).toFixed(1)+'s':'DASH'}</span><span class="couch-potion"><canvas data-couch-potion="${slot}" width="32" height="32" aria-hidden="true"></canvas>↑ ${p.potions?.length||0}</span></div><footer>${c?.count?c.count+' HITS · ×'+c.multiplier.toFixed(2)+' · ':''}+${Math.floor(p.stats.comboPoints||0)} BÔNUS COMBO</footer></section>`;}).join('');
 for(const {slot,player}of seats){const icon=$('couch-hud').querySelector(`[data-couch-potion="${slot}"]`);paintItemIcon(icon,player.potions?.[0]==='ice'?'ice':'heal',room.now);if(icon)icon.style.opacity=player.potions?.length?'1':'.2';}
}
document.addEventListener('pointerdown',e=>{if(gamepads.locked&&screen==='battle'&&!$('modal').open&&e.pointerType==='mouse'){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
addEventListener('pagehide',()=>localSeats.clear(),{once:true});
