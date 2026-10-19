import { CLASSES, BOSSES, COSTS, COOLDOWNS, WORLD, DODGE, clamp, ARENA_OBSTACLES, EMOTES } from './shared.js';
import { drawPlayer, drawBoss, terrain, pillar, torch, light, playerSprite, exportAtlas, bossSprite } from './art.js';
import { STORY,BRIDGES,endingStory } from './story.js';
import { cinematicPlayer,drawGate,drawAwakening,drawCorridor,drawEnding } from './scenes.js';
import { hudIcon } from './hud-art.js';
import { drawTelegraph } from './telegraphs.js';
import { drawMinion } from './animation.js';
import { impactFX,hazardImpact,magicFX,footFX,slashFX,bowFX,drawProjectile,stepFX,drawGroundFX,drawFX,resetFX } from './vfx.js';
import { AudioEngine } from './audio.js';

const $ = id => document.getElementById(id);
const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const desktopParams=new URLSearchParams(location.search);
const nativeDesktop=desktopParams.get('desktop')==='1';
const apiBase = (window.IRON_CONFIG?.serverUrl || '').replace(/\/$/,'');
const canvas=$('game'), ctx=canvas.getContext('2d');canvas.width=WORLD.w;canvas.height=WORLD.h;ctx.imageSmoothingEnabled=false;
const audio=new AudioEngine();
const enableAudio=()=>audio.enable().then(()=>{$('audio-toggle').textContent='♪';$('audio-toggle').title='Desativar áudio';});
document.addEventListener('pointerdown',e=>{if(e.target.closest('#audio-toggle'))return;enableAudio();},{once:true});
document.addEventListener('keydown',enableAudio,{once:true});
let room=null,session=null,token=null,ws=null,connected=false,connecting=null,reconnectTimer=null,retry=0;
let screen='home',lobbySignature='',resultsSignature='',lastEvent=0,snapshotAt=0,seq=Date.now()*1000,latency=0;
let warningUntil=0,shake=0,flash=0,frameTime=0,previousFrame=performance.now(),pointer=null,pointerClient=null,attacking=false;
let lastStep=0,dialogueKey='';
const keys=new Set(),positions=new Map(),attackUntil=new Map(),particles=[],floats=[],rings=[];
const input={x:0,y:0,block:false,attack:false,revive:false};
let joystick={x:0,y:0},touchBlock=false,touchAttack=false,touchRevive=false;
let cameraFraction=.5,zoom=1.55,viewX=600,viewY=380,viewZoom=1.55;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const footPositions=new Map();
function setZoom(value){zoom=clamp(value,1,2);$('zoom-value').textContent=Math.round(zoom*100)+'%';}
$('zoom-in').onclick=()=>setZoom(zoom+.12);$('zoom-out').onclick=()=>setZoom(zoom-.12);
const portraitCamera=()=>screen==='battle'&&matchMedia('(max-width:720px) and (orientation:portrait)').matches;
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
      if(msg.type==='left'){room=null;positions.clear();showScreen('home');$('footer-state').textContent='A escuridão espera por você.';}
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
  const oldState=room?.state;room=value;snapshotAt=performance.now();
  if(initial)lastEvent=value.events.at(-1)?.id||0;
  for(const e of value.events){if(e.id>lastEvent){eventEffect(e);lastEvent=e.id;}}
  if(value.state==='lobby'){
    if(screen!=='lobby')showScreen('lobby');renderLobby();
  }else if(['countdown','battle'].includes(value.state)){
    if(screen!=='battle'){showScreen('battle');buildAbilities();}
    updateHud();
  }else if(value.state==='ending'){if(screen!=='ending')showScreen('ending');}
  else{
    if(screen!=='results')showScreen('results');renderResults();
  }
  if(oldState!==value.state&&value.state==='battle')toast('A batalha começou. Ataque nos intervalos dos golpes!');
  $('footer-state').textContent=`${room.code} · ${room.players.length}/4 jogadores · ${connected?latency+' ms':'reconectando'}`;
}
const me=()=>room?.players.find(p=>p.id===session?.id);
function renderLobby(){
  const p=me();if(!p)return;
  const signature=JSON.stringify([room.owner,room.code,room.botsEnabled,room.players.map(p=>[p.id,p.name,p.classId,p.ready,p.connected])]);
  if(lobbySignature===signature)return;lobbySignature=signature;
  const leader=room.owner===session.id,allReady=room.players.every(p=>p.ready&&p.connected);
  $('lobby').innerHTML=`<div class="lobby-heading"><div><span class="eyebrow">PREPARAÇÃO · ${room.public?'SALA PÚBLICA':room.solo?'SOLO + COMPANHEIROS':'SALA PRIVADA'}</span><h2>Escolha sua lenda.</h2><p class="muted">Três destinos. Uma equipe. A coroa espera.</p></div><div class="room-code-box"><div><small>CÓDIGO DA EXPEDIÇÃO</small><strong>${esc(room.code)}</strong></div><button class="icon-btn" data-action="copy" title="Copiar código" aria-label="Copiar código">⧉</button></div></div>
    <div class="lobby-grid"><div><div class="class-grid">${Object.entries(CLASSES).map(([id,c])=>`<button class="class-card ${p.classId===id?'selected':''}" data-class="${id}"><span class="selected-mark">${p.classId===id?'◈ SELECIONADO':''}</span><canvas width="190" height="150" data-portrait="${id}"></canvas><div class="class-text"><h3>${c.name}</h3><p>${c.role}</p><p>${id==='knight'?'Resista à escuridão. Proteja seus aliados.':id==='archer'?'Encontre a distância. Acerte o ponto fraco.':'Ataque nas sombras. Desapareça antes do golpe.'}</p><div class="class-meta"><span>♥ ${c.hp} VIDA</span><span>⚡ 100 ENERGIA</span></div></div></button>`).join('')}</div>
    <div class="skill-preview">${CLASSES[p.classId].skills.map((name,i)=>`<div><strong><kbd>${i+1}</kbd> ${name}</strong>${CLASSES[p.classId].descriptions[i]}<br><span>${COSTS[i]} energia · ${COOLDOWNS[i]}s</span></div>`).join('')}</div></div>
    <aside class="panel team-lobby"><h3>SEU GRUPO <span class="muted">${room.players.length}/4</span></h3>${room.players.map(a=>`<div class="member"><span class="member-avatar" style="color:${CLASSES[a.classId].color}">${a.classId==='knight'?'♜':a.classId==='archer'?'➶':'◈'}</span><div class="member-text"><strong>${esc(a.name)} ${a.id===room.owner?'♛':''}</strong><small>${CLASSES[a.classId].name} · ${a.isBot?'COMPANHEIRO IA':a.connected?'conectado':'desconectado'}</small></div><span class="badge" style="color:${a.ready?'#8ccfa2':'#7d8880'}">${a.ready?'PRONTO':'…'}</span></div>`).join('')}${Array.from({length:4-room.players.length},()=>'<div class="empty-slot">+ Aguardando um aliado</div>').join('')}<p class="fine">${room.solo?'Companheiros das outras duas classes lutam e podem reviver você. Troque sua classe para atualizar a equipe.':'Compartilhe o código. Seus amigos entram pelo mesmo servidor. Você pode completar as classes ausentes com bots.'}</p></aside></div>
    ${nativeDesktop&&desktopParams.get('mode')==='host'?`<div class="lan-info">REDE LOCAL · IP DO ANFITRIÃO: <strong>${esc(desktopParams.get('lan')||'127.0.0.1')}</strong> · porta 48230 · compartilhe também o código da sala.</div>`:''}${leader&&!room.solo?`<label class="check bot-option"><input type="checkbox" id="bot-toggle" ${room.botsEnabled?'checked':''}> Completar as classes ausentes com companheiros IA</label>`:''}<div class="lobby-actions"><button class="text-link" data-action="leave">← Sair da sala</button><p>${leader?'Marque pronto e inicie quando todos estiverem preparados.':'Aguardando o líder iniciar a expedição.'}</p><div><button class="${p.ready?'secondary':'primary'}" data-action="ready">${p.ready?'✓ Pronto · cancelar':'Estou pronto'}</button>${leader?`<button class="primary" data-action="start" ${!allReady?'disabled':''}>Iniciar expedição →</button>`:''}</div></div><p class="lobby-controls"><kbd>WASD</kbd> mover &nbsp; <kbd>Mouse</kbd> mirar e atacar &nbsp; <kbd>1 2 3</kbd> habilidades &nbsp; <kbd>Espaço</kbd> defender &nbsp; <kbd>E</kbd> dash &nbsp; <kbd>4</kbd> poção &nbsp; <kbd>R</kbd> reviver &nbsp; <kbd>Tab</kbd> emotes</p>`;
  for(const el of $('lobby').querySelectorAll('[data-portrait]')){
    const c=el.getContext('2d');c.imageSmoothingEnabled=false;const cls=el.dataset.portrait;
    c.fillStyle=CLASSES[cls].color+'0c';c.beginPath();c.ellipse(95,117,52,17,0,0,Math.PI*2);c.fill();
    drawPlayer(c,{x:95,y:126,id:'portrait-'+cls,facing:1.4,classId:cls,hp:100},0,{scale:1.7});
  }
}
$('lobby').addEventListener('change',event=>{if(event.target.id==='bot-toggle')send('bots',{enabled:event.target.checked});});
$('lobby').addEventListener('click',event=>{
  const btn=event.target.closest('button');if(!btn)return;audio.fx('ui');
  if(btn.dataset.class)send('class',{classId:btn.dataset.class});
  const action=btn.dataset.action;
  if(action==='copy')copyCode();if(action==='ready')send('ready',{ready:!me().ready});if(action==='start')send('start');if(action==='leave')send('leave');
});
async function copyCode(){try{await navigator.clipboard.writeText(room.code);toast('Código copiado: '+room.code);}catch{openModal(`<span class="eyebrow">COMPARTILHE COM OS ALIADOS</span><h2>${esc(room.code)}</h2><p>Selecione e copie o código acima.</p>`);}}
function buildAbilities(){
  const p=me();if(!p)return;const c=CLASSES[p.classId];
  $('abilities').innerHTML=c.skills.map((name,i)=>`<button class="ability" data-slot="${i}" aria-label="${name}" title="${name}: ${c.descriptions[i]} · ${COSTS[i]} energia · ${COOLDOWNS[i]}s"><canvas class="skill-art" width="64" height="64" data-icon-slot="${i}"></canvas><span class="skill-symbol">${symbols[p.classId][i]}</span><kbd>${i+1}</kbd><span class="cost">${COSTS[i]} ⚡</span><span class="cooldown-cover"></span><span class="cd-number"></span></button>`).join('');
  const offset=p.classId==='knight'?0:p.classId==='archer'?3:6;for(const el of $('abilities').querySelectorAll('[data-icon-slot]'))hudIcon(el,offset+Number(el.dataset.iconSlot));hudIcon($('dash-icon'),11);
  const cctx=$('portrait').getContext('2d');cctx.clearRect(0,0,64,64);cctx.imageSmoothingEnabled=false;drawPlayer(cctx,{id:'hudportrait',x:32,y:61,facing:1.57,classId:p.classId,hp:100},0,{scale:.9});
}
$('abilities').addEventListener('pointerdown',e=>{const btn=e.target.closest('[data-slot]');if(btn){e.preventDefault();useSkill(Number(btn.dataset.slot));}});
function useSkill(slot){
  if(screen!=='battle'||$('modal').open)return;const p=me();if(!p||p.hp<=0||p.eliminated)return;
  if(p.block||input.block){toast('Solte a defesa para usar uma habilidade.');return;}
  if(p.energy<COSTS[slot]){toast('Energia insuficiente.');return;}
  if(p.cds[slot]>room.now)return;
  sendInput();send('skill',{slot,seq:++seq});
}
function updateHud(){
  if(!room)return;const p=me(),b=room.boss,info=BOSSES[room.round];if(!p||!b)return;
  $('boss-round').textContent=`RODADA 0${room.round+1} / 03`;$('boss-name').textContent=info.name;
  $('boss-health-fill').style.width=(b.hp/b.maxHp*100)+'%';$('boss-health-fill').style.background=`linear-gradient(90deg,${info.color}77,${info.color})`;
  $('boss-hp').textContent=`${Math.ceil(b.hp)} / ${b.maxHp}`;$('boss-phase').textContent=b.state==='transition'?'TRANSIÇÃO · IMUNE':b.phase===3?info.finalPhase.toUpperCase():b.phase===2?info.phase.toUpperCase():'FASE I · '+info.title.toUpperCase();
  $('timer').textContent=formatTime(room.remaining);$('timer').style.color=room.remaining<45?'#ed7b7b':'';
  $('boss-action').textContent=b.state==='windup'?'⚠ '+b.attackName:b.state==='recover'?'ABERTURA · ATAQUE AGORA':b.state==='transition'?'NOVA FASE':b.guarding?'ARMADURA ATIVA':'CERQUE O CHEFE · ELIMINE OS LACAIOS';
  $('boss-action').classList.toggle('opening',b.state==='recover');
  if(room.state==='countdown'){$('boss-action').textContent=room.now<room.intro.gateAt?'O GRUPO CHEGA À ARENA':room.now<room.intro.awakeningAt?'OS PORTÕES SE FECHARAM':room.transitionAt-room.now>3?'O PODER ESTÁ DESPERTANDO':'PREPARE-SE PARA A BATALHA';$('boss-phase').textContent=room.now<room.intro.awakeningAt?'DORMENTE':'DESPERTAR';}
  $('minion-count').textContent=(room.minions?.filter(m=>m.hp>0).length||0)+' LACAIOS';
  $('hud').dataset.class=p.classId;const potion=p.potions?.[0],pot=$('potion-slot');hudIcon($('potion-icon'),potion==='ice'?10:9);$('potion-icon').style.opacity=potion?'1':'.18';pot.disabled=!potion||p.hp<=0||p.potionReady>room.now;pot.classList.toggle('has-potion',!!potion);pot.querySelector('strong').textContent=potion==='ice'?'❄':potion==='heal'?'✚':'◇';pot.querySelector('small').textContent=potion?(potion==='ice'?'GELO':'CURA')+' ×'+p.potions.length:'SEM POÇÃO';
  $('dash-slot').disabled=p.energy<DODGE.cost||p.hp<=0||p.dodgeReady>room.now;$('dash-cd').textContent=p.dodgeReady>room.now?(p.dodgeReady-room.now).toFixed(1)+'s':'20 ⚡';
  $('arena-name').textContent=info.arena.toUpperCase();$('my-name').textContent=p.name;$('my-class').textContent=CLASSES[p.classId].name;
  $('my-health').style.width=(p.hp/p.maxHp*100)+'%';$('my-hp').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('my-energy').style.width=p.energy+'%';$('my-en').textContent=`${Math.floor(p.energy)} / 100`;
  $('status-effects').textContent=[p.block?'DEFENDENDO −60%':null,p.shieldUntil>room.now?'MURALHA REAL':null,p.rootUntil>room.now?'IMOBILIZADO':null,p.reviveTarget?'REVIVENDO '+Math.min(100,Math.floor(p.revive/4*100))+'%':null].filter(Boolean).join(' · ');
  $('team-panel').innerHTML=room.players.filter(a=>a.id!==p.id).map(a=>`<div class="ally" style="border-left-color:${CLASSES[a.classId].color}"><div><span>${esc(a.name)}</span><small>${!a.connected?'OFFLINE':a.eliminated?'FORA':a.hp<=0?'CAÍDO':(a.isBot?'IA · ':'')+CLASSES[a.classId].name.toUpperCase()}</small></div><div class="ally-bar"><i style="width:${a.hp/a.maxHp*100}%"></i></div></div>`).join('');
  for(const btn of $('abilities').children){const slot=Number(btn.dataset.slot),cd=Math.max(0,p.cds[slot]-room.now);btn.classList.toggle('unavailable',cd>0||p.energy<COSTS[slot]||p.hp<=0||p.block);btn.querySelector('.cooldown-cover').style.height=cd/COOLDOWNS[slot]*100+'%';btn.querySelector('.cd-number').textContent=cd>0?cd.toFixed(1):'';}
  const down=p.hp<=0||!p.connected;$('down-message').style.display=down?'block':'none';
  if(down)$('down-message').textContent=p.eliminated?'Fora de combate. Você retorna na próxima rodada.':`Você caiu. Um aliado pode reviver você segurando R. ${Math.max(0,Math.ceil(20-(room.now-p.downAt)))}s`;
}
function renderResults(){
  const signature=room.state+room.results.length+room.score;if(signature===resultsSignature)return;resultsSignature=signature;
  const last=room.results.at(-1),finished=room.state==='finished',won=finished?room.wins===3:last.won;
  const data=finished?room.players.map(p=>({name:p.name,...p.stats})):last.players;
  data.sort((a,b)=>(b.damage+b.revives*100)-(a.damage+a.revives*100));
  $('results').innerHTML=`<div class="panel result-panel"><span class="eyebrow">${finished?'A EXPEDIÇÃO CHEGOU AO FIM':`RODADA ${room.round+1} CONCLUÍDA`}</span><h2>${finished?(won?'A coroa caiu. Sua lenda vive.':'A escuridão venceu esta vez.'):(won?'O inimigo encontrou seu fim.':'Reúnam suas forças.')}</h2><p class="muted">${finished?`${room.wins} de 3 chefes derrotados. ${won?'Bônus de expedição perfeita: +150 pontos.':'Uma nova expedição espera por sua equipe.'}`:won?`${BOSSES[room.round].name} foi derrotado. Os sobreviventes recuperam 50% da vida perdida.`:esc(last.reason)}</p><div class="round-pips">${[0,1,2].map(i=>`<span class="${room.results[i]?(room.results[i].won?'win':'loss'):''}"></span>`).join('')}</div><div class="score-summary"><div><strong>${room.score}</strong><span>PONTOS DA EQUIPE</span></div><div><strong>${formatTime(last.remaining)}</strong><span>TEMPO RESTANTE</span></div><div><strong>${finished?room.wins+'/3':'+'+last.reward}</strong><span>${finished?'CHEFES DERROTADOS':'PONTOS DA RODADA'}</span></div></div><table><thead><tr><th>JOGADOR</th><th>DANO CAUSADO</th><th>RECEBIDO</th><th>EVITADO</th><th>REVIVES</th><th>HABILIDADES</th></tr></thead><tbody>${data.map((p,i)=>`<tr><td>${i+1}. ${esc(p.name)}</td><td>${Math.round(p.damage)}</td><td>${Math.round(p.taken)}</td><td>${Math.round(p.avoided)}</td><td>${p.revives}</td><td>${p.skills}</td></tr>`).join('')}</tbody></table>${finished?`<p class="muted">Recorde desta formação: ${room.bestScore || room.score} pontos. Resultado registrado no Quadro de Lendas.</p><div class="result-actions">${room.owner===session.id?'<button class="primary" data-action="restart">Jogar novamente →</button>':'<span class="muted">Aguardando o líder voltar à preparação.</span>'}<button class="secondary" data-action="ranking">Quadro de lendas</button><button class="secondary" data-action="leave">Sair da sala</button></div>`:'<p class="muted" id="next-round">A próxima arena está sendo preparada…</p>'}</div>`;
}
$('results').addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='restart'){resultsSignature='';lobbySignature='';send('restart');}if(action==='leave')send('leave');if(action==='ranking')showRanking();});
function formatTime(seconds){const s=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

function openModal(html){$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();resetInput();}
function closeModal(){$('modal').close();resetInput();}
$('close-modal').onclick=closeModal;$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const rect=$('modal').getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeModal();}});
$('modal').addEventListener('close',resetInput);
function help(){openModal(`<span class="eyebrow">GUIA DA EXPEDIÇÃO</span><h2>O trono não cai sozinho.</h2><p>Derrote três chefes em até cinco minutos por arena. As áreas marcadas avisam onde o próximo golpe vai atingir. Ataque durante a recuperação do chefe.</p><div class="help-grid"><span><kbd>WASD</kbd> movimentação</span><span><kbd>Mouse</kbd> mirar · segurar para atacar</span><span><kbd>1 / 2 / 3</kbd> habilidades</span><span><kbd>Espaço</kbd> defender</span><span><kbd>R</kbd> segurar 4s para reviver</span><span><kbd>E</kbd> dash · 20 de energia</span><span><kbd>4</kbd> poção coletada</span><span><kbd>Esc</kbd> menu local</span></div><p>A defesa reduz 60% do dano e drena 15 de energia por segundo. Energia regenera 12/s. Golpes indicados com “rompe defesa” exigem esquiva. Use E para esquivar: custa 20 de energia, tem 2,4s de recarga e protege brevemente durante o avanço. Colete poções dos lacaios passando por elas e use a próxima com 4 (até três guardadas). Reviva um aliado antes de 20s, ficando parado e sem receber dano.</p><p>No celular, use o controle à esquerda e os botões à direita. A mira acompanha o chefe. O menu não pausa a partida online.</p>${room?'<button class="secondary" id="modal-leave">Sair da sala</button>':''}`);$('modal-leave')?.addEventListener('click',()=>{send('leave');closeModal();});}
$('help').onclick=help;$('battle-menu').onclick=help;
$('open-lore').onclick=()=>openModal(`<span class="eyebrow">OS DONOS DA ESCURIDÃO</span><h2>Três arenas. Três maldições.</h2>${BOSSES.map((b,i)=>`<div class="lore-item"><strong style="color:${b.color}">${b.name}</strong><p>${b.title} · ${b.arena}<br>${['Desvie da espada e da onda de choque. A investida do cavaleiro interrompe preparações na primeira fase.','Evite as nuvens de veneno e as raízes. Na segunda fase, raízes sólidas bloqueiam partes do caminho.','Saia das marcas de explosão e do arco da foice. O Apocalipse adiciona zonas perigosas.'][i]}</p></div>`).join('')}`);
async function showRanking(){openModal('<span class="eyebrow">QUADRO DE LENDAS</span><h2>Expedições eternizadas.</h2><p>Consultando os registros…</p>');try{const rows=await api('leaderboard');$('modal-content').innerHTML=`<span class="eyebrow">QUADRO DE LENDAS</span><h2>Expedições eternizadas.</h2>${rows.length?`<table><thead><tr><th>#</th><th>EQUIPE</th><th>PONTOS</th><th>CHEFES</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.team)}</td><td>${r.score}</td><td>${r.wins}/3</td></tr>`).join('')}</tbody></table>`:'<p>As páginas ainda estão vazias. Sua equipe pode escrever a primeira lenda.</p>'}`;}catch(e){$('modal-content').innerHTML=`<h2>Registros indisponíveis.</h2><p>${esc(e.message)}</p>`;}}
$('ranking').onclick=showRanking;
$('audio-toggle').onclick=async()=>{const enabled=await audio.toggle();$('audio-toggle').textContent=enabled?'♪':'♫';$('audio-toggle').title=enabled?'Desativar áudio':'Ativar áudio';$('audio-toggle').setAttribute('aria-label',$('audio-toggle').title);toast(enabled?'Áudio ativado.':'Áudio desativado.');};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Tela cheia não está disponível neste navegador.');}};
async function authenticate(path,data){const result=await api(path,data);token=result.token;storageSet('iron-session',token);setSession(result.session);await connect();audio.fx('ui');}
$('guest-form').addEventListener('submit',async e=>{e.preventDefault();const btn=$('guest-submit');btn.disabled=true;try{await authenticate('guest',{name:$('player-name').value.trim()});storageSet('iron-name',$('player-name').value);}catch(error){toast(error.message,true);}finally{btn.disabled=false;}});
function accountForm(register){openModal(`<span class="eyebrow">${register?'ESCREVA SUA LENDA':'RETORNE À EXPEDIÇÃO'}</span><h2>${register?'Criar conta':'Entrar na conta'}</h2><p>A conta é opcional e protegida por senha. O código de sala é compartilhado separadamente.</p><form id="account-form"><label for="account-name">NOME DE USUÁRIO</label><input id="account-name" autocomplete="username" minlength="3" maxlength="20" required><label for="account-password">SENHA ${register?'· MÍNIMO 10 CARACTERES':''}</label><input id="account-password" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="${register?10:1}" maxlength="128" required><button class="primary" type="submit">${register?'Criar minha conta':'Entrar'} →</button><span id="account-error" class="muted" role="alert"></span></form>`);$('account-form').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await authenticate(register?'register':'login',{name:$('account-name').value,password:$('account-password').value});closeModal();}catch(error){$('account-error').textContent=error.message;}finally{btn.disabled=false;}};}
$('login').onclick=()=>accountForm(false);$('register').onclick=()=>accountForm(true);
$('logout').onclick=async()=>{try{await api('logout',{});}catch{}clearTimeout(reconnectTimer);token=null;storageSet('iron-session',null);ws?.close(1000);ws=null;connected=false;setSession(null);setStatus('SERVIDOR DISPONÍVEL','online');};
$('create-room').onclick=async()=>{try{await connect();send('create',{public:$('public-room').checked});}catch(error){toast(error.message,true);}};
$('create-solo').onclick=async()=>{try{await connect();send('create',{mode:'solo'});}catch(error){toast(error.message,true);}};
$('join-form').onsubmit=async e=>{e.preventDefault();try{await connect();send('join',{code:$('room-code').value});}catch(error){toast(error.message,true);}};
$('public-rooms').onclick=async()=>{openModal('<span class="eyebrow">EXPEDIÇÕES ABERTAS</span><h2>Encontre seus aliados.</h2><p>Buscando salas…</p>');try{const rows=await api('rooms');$('modal-content').innerHTML=`<span class="eyebrow">EXPEDIÇÕES ABERTAS</span><h2>Encontre seus aliados.</h2>${rows.length?rows.map(r=>`<div class="room-list-item"><div><strong>${esc(r.name)}</strong><small>${esc(r.code)} · ${r.players}/4 jogadores</small></div><button class="secondary" data-join="${esc(r.code)}">Entrar →</button></div>`).join(''):'<p>Nenhuma sala pública disponível agora. Crie uma expedição e convide seus amigos.</p>'}`;for(const btn of $('modal-content').querySelectorAll('[data-join]'))btn.onclick=()=>{send('join',{code:btn.dataset.join,...(nativeDesktop?{classId:desktopParams.get('class')||'knight'}:{})});closeModal();};}catch(error){$('modal-content').innerHTML=`<h2>Sem conexão.</h2><p>${esc(error.message)}</p>`;}};

function resetInput(){keys.clear();attacking=false;touchAttack=false;touchBlock=false;touchRevive=false;joystick={x:0,y:0};input.x=0;input.y=0;input.attack=false;input.block=false;input.revive=false;const thumb=$('joystick').firstElementChild;thumb.style.transform='';if(screen==='battle')sendInput();}
addEventListener('keydown',e=>{
  if(e.code==='Tab'&&screen==='battle'&&!$('modal').open){e.preventDefault();$('emote-wheel').hidden=!$('emote-wheel').hidden;resetInput();return;}
  if(!$('emote-wheel').hidden&&['Digit1','Digit2','Digit3','Digit4'].includes(e.code)){e.preventDefault();playEmote(Object.keys(EMOTES)[Number(e.code.at(-1))-1]);return;}
  if(e.code==='Escape'&&!$('emote-wheel').hidden){e.preventDefault();$('emote-wheel').hidden=true;return;}
  if(e.code==='Escape'){if(!$('modal').open&&screen==='battle'){e.preventDefault();help();}return;}
  if(screen!=='battle'||$('modal').open||e.target.matches('input,textarea'))return;
  if(['Space','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Digit1','Digit2','Digit3','Digit4','KeyE','KeyR','KeyJ','Equal','Minus'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(!e.repeat&&e.code==='KeyE')useDash();if(!e.repeat&&e.code==='Digit4')useItem();if(e.code==='Equal')setZoom(zoom+.1);if(e.code==='Minus')setZoom(zoom-.1);if(!e.repeat&&['Digit1','Digit2','Digit3'].includes(e.code))useSkill(Number(e.code.at(-1))-1);
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});
function worldPointer(e){const rect=canvas.getBoundingClientRect(),cover=portraitCamera(),s=(cover?Math.max:Math.min)(rect.width/WORLD.w,rect.height/WORLD.h),ox=(rect.width-WORLD.w*s)*(cover?cameraFraction:.5),oy=(rect.height-WORLD.h*s)/2;return{x:((e.clientX-rect.left-ox)/s-600)/viewZoom+viewX,y:((e.clientY-rect.top-oy)/s-380)/viewZoom+viewY};}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){pointerClient={clientX:e.clientX,clientY:e.clientY};pointer=worldPointer(pointerClient);}});
canvas.addEventListener('pointerdown',e=>{if(e.button===0&&e.pointerType==='mouse'&&screen==='battle'&&!$('modal').open){attacking=true;pointerClient={clientX:e.clientX,clientY:e.clientY};pointer=worldPointer(pointerClient);e.preventDefault();canvas.setPointerCapture(e.pointerId);}});
addEventListener('pointerup',()=>{attacking=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
for(const [id,set] of [['touch-block',v=>touchBlock=v],['touch-attack',v=>touchAttack=v],['touch-revive',v=>touchRevive=v]]){
  const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);set(true);});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>set(false));
}
let stickId=null;
function updateStick(e){const rect=$('joystick').getBoundingClientRect(),dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2),len=Math.hypot(dx,dy),max=rect.width*.35,scale=len>max?max/len:1;joystick={x:dx*scale/max,y:dy*scale/max};$('joystick').firstElementChild.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
$('joystick').addEventListener('pointerdown',e=>{stickId=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);updateStick(e);e.preventDefault();});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(event,()=>{stickId=null;joystick={x:0,y:0};$('joystick').firstElementChild.style.transform='';});
function sendInput(){
  if(screen!=='battle'||!connected||!room)return;const p=me();if(!p)return;
  const modal=$('modal').open||document.hidden||!$('emote-wheel').hidden;
  input.x=modal?0:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystick.x;
  input.y=modal?0:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joystick.y;
  input.block=!modal&&(keys.has('Space')||touchBlock);input.attack=!modal&&(attacking||touchAttack||keys.has('KeyJ'));input.revive=!modal&&(keys.has('KeyR')||touchRevive);
  if(pointerClient)pointer=worldPointer(pointerClient);
  const target=pointer||room.boss||{x:p.x+1,y:p.y},dx=target.x-p.x,dy=target.y-p.y,len=Math.hypot(dx,dy)||1;
  send('input',{...input,ax:dx/len,ay:dy/len,seq:++seq});
}
function playEmote(kind){$('emote-wheel').hidden=true;resetInput();send('emote',{emote:kind,seq:++seq});}
for(const button of $('emote-wheel').querySelectorAll('[data-emote]'))button.onclick=()=>playEmote(button.dataset.emote);
$('emote-open').onclick=()=>{$('emote-wheel').hidden=!$('emote-wheel').hidden;resetInput();};
$('emote-close').onclick=()=>{$('emote-wheel').hidden=true;};
function useDash(){if(screen!=='battle'||$('modal').open)return;sendInput();send('dodge',{seq:++seq});}
function useItem(){if(screen!=='battle'||$('modal').open)return;sendInput();send('potion',{seq:++seq});}
$('dash-slot').onclick=useDash;$('potion-slot').onclick=useItem;$('touch-dash').onclick=useDash;
canvas.addEventListener('wheel',e=>{if(screen==='battle'){e.preventDefault();setZoom(zoom-Math.sign(e.deltaY)*.08);}},{passive:false});
setInterval(sendInput,50);setInterval(()=>{if(connected)send('ping',{time:performance.now()});},2500);

function burst(x,y,color,count=15,speed=90){
  const max=Math.min(count,400-particles.length);for(let i=0;i<max;i++){const a=Math.random()*Math.PI*2,s=(.25+Math.random())*speed;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-25,life:.3+Math.random()*.55,total:.85,color,size:Math.random()<.2?4:2});}
}
function ring(x,y,r,color,duration=.55){rings.push({x,y,r,color,life:duration,total:duration});}
function eventEffect(e){
  const info=BOSSES[room.round];
  if(e.type==='round'){positions.clear();resetFX();rings.length=particles.length=floats.length=0;}
  if(e.type==='gate'){impactFX(e.x,e.y,'gold',true);audio.fx('gate');shake=3;}
  if(e.type==='awaken'){magicFX(e.x,e.y,e.round===1?'green':e.round===2?'violet':'red',60);audio.fx('roar',e.round);ring(e.x,e.y,270,info.color,1.5);shake=4;}
  if(e.type==='hit'){impactFX(e.x,e.y+25,room.round===1?'green':room.round===2?'violet':'gold');
    burst(e.x,e.y+22,'#d9b39b',7);const old=floats.find(f=>f.owner===e.owner&&f.target===e.target&&f.life>.72);if(old){old.amount+=e.amount;old.text=Math.round(old.amount).toString();old.life=1;}else{const i=room.players.findIndex(p=>p.id===e.owner);floats.push({owner:e.owner,target:e.target,amount:e.amount,x:e.x+(i-1.5)*25,y:e.y-12-(i%2)*19,text:Math.round(e.amount).toString(),color:e.owner===session.id?'#f1d4a0':'#c4c6ae',life:1});}audio.fx('hit');
  }
  if(e.type==='attack'){
    attackUntil.set(e.owner,frameTime+.5);
    if(e.kind!=='archer')slashFX(e.x,e.y,e.angle,e.kind==='rogue'?'violet':'gold',e.slot===1,e.slot>=0?0:.12);
    else bowFX(e.x,e.y,e.angle,e.slot===2?'ice':e.slot===0?'gold':'green',e.slot>=0?0:.17);
    if(e.slot>=0)magicFX(e.x,e.y,e.kind==='archer'?'green':e.kind==='rogue'?'violet':'gold',12);audio.fx(e.kind==='archer'?'arrow':e.slot===2?'magic':'attack');
    if(e.slot===2&&e.kind==='knight'){burst(e.x,e.y,'#e7cb85',28);ring(e.x,e.y,170,'#e4c583',.8);}
  }
  if(e.type==='hurt'){
    impactFX(e.x,e.y-12,e.blocked?'gold':'red');
    burst(e.x,e.y-20,e.blocked?'#a8cee4':'#d96973',e.blocked?12:19);floats.push({x:e.x,y:e.y-65,text:'−'+Math.round(e.amount),color:e.blocked?'#a4d6e3':'#f2a19e',life:1});audio.fx(e.blocked?'block':'hit');if(e.owner===session.id){shake=e.blocked?2:5;flash=e.blocked?0:.18;}
  }
  if(e.type==='emote'){magicFX(e.x,e.y,'gold',8);audio.fx('ui');}
  if(e.type==='dodge'){footFX(e.x,e.y);audio.fx('dash');}
  if(e.type==='summon'){magicFX(e.x,e.y,'violet',26);ring(e.x,e.y,35,info.color,1.5);audio.fx('summon');}
  if(e.type==='minionAttack'&&e.kind!=='acolyte')slashFX(e.x,e.y,e.angle,e.kind==='thornling'?'green':'red',false,1.15);
  if(e.type==='minionDeath'){impactFX(e.x,e.y,room.round===1?'green':'violet',true);audio.fx('minion');}
  if(e.type==='pickup'){if(e.owner===session.id)toast(e.kind==='heal'?'Poção de cura coletada · use 4':'Poção de gelo coletada · use 4');audio.fx('pickup');magicFX(e.x,e.y,e.kind==='ice'?'ice':'green',14);}
  if(e.type==='venom')magicFX(e.x,e.y,'green',18);
  if(e.type==='frost'){ring(e.x,e.y,e.r,'#b8eeff',1);magicFX(e.x,e.y,'ice',60);audio.fx('frost');}
  if(e.type==='dash'){for(let i=0;i<8;i++)burst(e.x+(e.tx-e.x)*i/8,e.y+(e.ty-e.y)*i/8,e.kind==='rogue'?'#a995d5':'#d9be85',3,30);}
  if(e.type==='impact'){hazardImpact(e,room.round===1?'green':room.round===2?'violet':'red');burst(e.x,e.y,info.color,26,180);ring(e.x,e.y,e.r,info.color);shake=e.minor?1:4;audio.fx(e.minor?'attack':'boss',room.round);}
  if(e.type==='heal'){burst(e.x,e.y-20,'#9ce6b6',28);ring(e.x,e.y,70,'#a0e5b3');audio.fx('heal');}
  if(e.type==='warning'||e.type==='phase'){if(e.type==='phase')warning(e.text,3);audio.fx('warning');if(e.type==='phase'){ring(e.x,e.y,310,info.color,1.4);burst(e.x,e.y,info.color,50,200);shake=7;}}
  if(e.type==='notice')toast(e.text);
  if(e.type==='bossAttack'){attackUntil.set('boss',frameTime+.6);audio.fx('roar',room.round);slashFX(e.x,e.y,room.boss.facing,room.round===1?'green':room.round===2?'violet':'red',true);}
  if(e.type==='victory'||e.type==='defeat'){audio.fx(e.type);if(e.type==='victory'){burst(room.boss.x,room.boss.y,info.color,70,210);shake=8;}}
}
function warning(text,seconds){$('danger').textContent=text;warningUntil=frameTime+seconds;$('danger').classList.add('visible');}
function smoothPosition(id,target,dt){let p=positions.get(id);if(!p||Math.hypot(p.x-target.x,p.y-target.y)>220){p={x:target.x,y:target.y};positions.set(id,p);}const t=1-Math.exp(-dt*19);p.x+=(target.x-p.x)*t;p.y+=(target.y-p.y)*t;return{...target,x:p.x,y:p.y};}
function drawHazard(h,now,time){drawTelegraph(ctx,h,now,time,room.round);}
function drawShield(p,time){
  if(!p.block&&p.shieldUntil<=(room?.now||0))return;
  const wall=p.shieldUntil>(room?.now||0),r=wall?43:30;ctx.save();ctx.translate(p.x,p.y-19);ctx.strokeStyle=wall?'#e8cc8ba0':'#9bd2dfbb';ctx.fillStyle=wall?'#cbb26612':'#7abccc16';ctx.lineWidth=2;
  ctx.beginPath();if(wall)ctx.ellipse(0,0,r,r*1.15,0,0,Math.PI*2);else ctx.arc(0,0,r,p.facing-1.5,p.facing+1.5);ctx.stroke();ctx.fill();
  for(let i=0;i<5;i++){const a=time+i*1.25;ctx.fillStyle=wall?'#ead39f':'#b4e3e9';ctx.fillRect(Math.cos(a)*r,Math.sin(a)*r*1.1,2,3);}ctx.restore();
  if(wall)light(ctx,p.x,p.y,125,'#e5c778',.1);
}
function drawDrop(d,time){
  const ice=d.kind==='ice',color=ice?'#b7e8ff':'#f4a4a2',y=d.y-6+Math.sin(time*3)*3;
  light(ctx,d.x,d.y,36,color,.12);ctx.save();ctx.translate(d.x,y);ctx.strokeStyle=color;ctx.fillStyle=ice?'#76b6d0':'#b94c60';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(-4,-12);ctx.lineTo(4,-12);ctx.lineTo(4,-7);ctx.lineTo(9,2);ctx.lineTo(7,10);ctx.lineTo(-7,10);ctx.lineTo(-9,2);ctx.lineTo(-4,-7);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#e9cd98';ctx.fillRect(-5,-15,10,4);ctx.fillStyle='#fff9';ctx.fillRect(-4,0,2,6);ctx.restore();
}
function drawProjectiles(projectiles){for(const p of projectiles)drawProjectile(ctx,p,frameTime);}

function render(time){
  const dt=Math.min(.05,(time-previousFrame)/1000);previousFrame=time;frameTime=time/1000;
  ctx.clearRect(0,0,WORLD.w,WORLD.h);ctx.save();
  if(shake>.1&&!reducedMotion){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.88;}
  const gameplay=room&&room.state!=='lobby',round=gameplay?room.round:0,now=room?room.now+(time-snapshotAt)/1000:0;
  const ending=gameplay&&room.state==='ending';
  const corridor=gameplay&&room.state==='round_end'&&now-room.outroStarted>=6,awakening=room?.state==='countdown'&&now>=room.intro?.awakeningAt&&now<room.intro.awakeningAt+4.4;
  viewZoom+=((ending?1.1:corridor?1:awakening?Math.min(zoom,1.25):zoom)-viewZoom)*(1-Math.exp(-dt*4));
  $('results').classList.toggle('corridor',!!corridor);document.body.classList.toggle('in-cinematic',!!(ending||corridor||room?.state==='countdown'&&room.transitionAt-now>3));
  const story=$('story-card');let tale=null;if(ending&&now-room.endingAt>2.5)tale=endingStory(room.wins);else if(corridor){const bridge=BRIDGES[round];tale={chapter:'ENTRE AS SOMBRAS',title:bridge[0],text:bridge[1]};}else if(room?.state==='countdown'&&now-room.intro.started<3.5)tale=STORY[round];story.hidden=!tale;if(tale){$('story-chapter').textContent=tale.chapter;$('story-title').textContent=tale.title;$('story-text').textContent=tale.text;}
  let fade=0;if(room?.state==='countdown')fade=clamp(1-(now-room.intro.started)/.8,0,1);if(room?.state==='round_end')fade=clamp((now-room.transitionAt+.65)/.65,0,1);$('scene-fade').style.opacity=fade;
  const caption=$('cinema-caption');caption.hidden=!corridor&&!awakening;if(corridor)caption.textContent='PELAS PROFUNDEZAS · '+BOSSES[Math.min(2,round+1)].arena.toUpperCase();else if(awakening)caption.textContent=['VARKHUL REIVINDICA A COROA DE FERRO','AS RAÍZES DESPERTAM. THARAZUL SE ERGUE.','O ECLIPSE CHEGOU. AS SEIS ASAS SE ABREM.'][round];
  const cover=portraitCamera(),rect=canvas.getBoundingClientRect();canvas.style.objectFit=cover?'cover':'contain';canvas.style.objectPosition='50% 50%';cameraFraction=.5;
  const screenScale=cover?Math.max(rect.width/WORLD.w,rect.height/WORLD.h):Math.min(rect.width/WORLD.w,rect.height/WORLD.h);
  const visibleW=(cover?rect.width/screenScale:WORLD.w)/viewZoom,visibleH=(cover?rect.height/screenScale:WORLD.h)/viewZoom;
  if(gameplay){const raw=me()||room.players[0],hero=room.state==='countdown'||ending?cinematicPlayer(room,raw,room.players.indexOf(raw),now):raw,p=ending||corridor?{x:600,y:380}:awakening?room.boss:hero,t=1-Math.exp(-dt*5);const tx=clamp(p?.x||600,visibleW/2,WORLD.w-visibleW/2),ty=clamp(p?.y||380,visibleH/2,WORLD.h-visibleH/2);viewX+=(tx-viewX)*t;viewY+=(ty-viewY)*t;ctx.translate(600,380);ctx.scale(viewZoom,viewZoom);ctx.translate(-viewX,-viewY);}
  else{viewX=600;viewY=380;}
  const cameraLeft=viewX-visibleW/2,cameraWidth=visibleW;
  stepFX(dt);
  if(corridor)drawCorridor(ctx,frameTime);else ctx.drawImage(terrain(round),0,0,WORLD.w,WORLD.h);if(!corridor)drawGroundFX(ctx);
  if(gameplay&&!corridor){for(const h of room.hazards)drawHazard(h,now,frameTime);}
  else{
    // Actual engine artwork is also used by the atmospheric title diorama.
    light(ctx,820,335,300,'#9d5b58',.13);light(ctx,400,550,230,'#5e8790',.13);
  }
  const objects=[];
  const obs=corridor?[]:ARENA_OBSTACLES[round];
  if(gameplay&&!corridor){objects.push({y:380,draw:()=>drawGate(ctx,room,now)});drawAwakening(ctx,room.boss,round,now,room.intro);}
  for(const o of obs.filter(o=>!o.renderSkip))objects.push({y:o.y,draw:()=>pillar(ctx,o,round)});
  const boss=corridor?null:gameplay?smoothPosition('boss',room.boss,dt):{x:815,y:360,hp:100,state:'idle',facing:Math.PI};
  if(boss){objects.push({y:boss.y,draw:()=>drawBoss(ctx,boss,round,frameTime,now)});if(gameplay&&boss.phase>=2)light(ctx,boss.x,boss.y-40,170,BOSSES[round].color,.12);}
  const list=room?room.players:[{id:'preview-knight',name:'',x:460,y:470,classId:'knight',facing:-.4,hp:160},{id:'preview-archer',name:'',x:340,y:380,classId:'archer',facing:0,hp:100},{id:'preview-rogue',name:'',x:555,y:530,classId:'rogue',facing:-1,hp:115}];
  for(const [index,raw]of list.entries()){
    const p=gameplay?(ending||corridor||room.state==='countdown'?cinematicPlayer(room,raw,index,now):smoothPosition(raw.id,raw,dt)):raw;
    objects.push({y:p.y,draw:()=>{
      if(gameplay&&p.id===session?.id){ctx.strokeStyle='#dcc28766';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y+8,23,10,0,0,Math.PI*2);ctx.stroke();}
      drawPlayer(ctx,p,frameTime,{alpha:p.connected===false?.4:1,attacking:attackUntil.get(p.id)>frameTime,now});
      if(gameplay){
        drawShield(p,frameTime);
        if(p.rootUntil>now){ctx.strokeStyle='#a0bb67';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(p.x,p.y-6-i*6,20,7,0,0,Math.PI*2);ctx.stroke();}}
        ctx.textAlign='center';ctx.font='10px Arial';ctx.fillStyle=p.id===session?.id?'#ebd3a4':'#c6d2c0';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(p.name+(p.isBot?' · IA':''),p.x,p.y-69);ctx.shadowBlur=0;
        if(p.hp<=0&&!p.eliminated){ctx.fillStyle='#e1b1a2';ctx.font='bold 17px Arial';ctx.fillText('+',p.x,p.y-35);}
        if(p.revive>0){ctx.strokeStyle='#a3ddb4';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y-25,31,-Math.PI/2,-Math.PI/2+p.revive/4*Math.PI*2);ctx.stroke();}
      }
    }});
  }
  if(gameplay)for(const raw of room.minions||[]){const m=smoothPosition(raw.id,raw,dt);objects.push({y:m.y,draw:()=>drawMinion(ctx,m,frameTime,now)});}
  if(gameplay)for(const d of room.drops||[])drawDrop(d,frameTime);
  objects.sort((a,b)=>a.y-b.y);for(const o of objects)o.draw();
  if(gameplay)drawProjectiles(room.projectiles);if(ending)drawEnding(ctx,room,now);
  for(const [x,y] of [[85,105],[1115,105],[85,665],[1115,665]])torch(ctx,x,y,frameTime,round===1?'#afd28b':round===2?'#ba99ed':'#f1b37c');
  for(let i=rings.length-1;i>=0;i--){const p=rings[i];p.life-=dt;if(p.life<=0){rings.splice(i,1);continue;}const progress=1-p.life/p.total;ctx.globalAlpha=p.life/p.total;ctx.strokeStyle=p.color;ctx.lineWidth=p.slash?5:2;ctx.beginPath();if(p.slash)ctx.arc(p.x,p.y-17,p.r*(.5+progress*.5),p.angle-1.2+progress,p.angle+1.2+progress);else ctx.ellipse(p.x,p.y,p.r*(.3+progress*.7),p.r*(.3+progress*.7)*.6,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=45*dt;ctx.globalAlpha=clamp(p.life/.3,0,1);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);}ctx.globalAlpha=1;
  drawFX(ctx);
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
  if(screen==='battle'&&room){
    if(room.state==='countdown'&&room.transitionAt-now<=3)$('countdown').innerHTML=`<small>${BOSSES[room.round].arena.toUpperCase()}</small><span>${BOSSES[room.round].title}</span><strong>${Math.max(1,Math.ceil(room.transitionAt-now))}</strong>`;else $('countdown').textContent='';
    const line=room.state==='countdown'?room.dialogue?.find(d=>now>=d.at&&now<d.until):null;
    $('dialogue').hidden=!line;if(line){
      const key=round+':'+line.at+':'+line.name;
      if(dialogueKey!==key){dialogueKey=key;const box=$('dialogue');box.dataset.boss=String(!!line.boss);box.style.setProperty('--voice',line.boss?BOSSES[round].color:CLASSES[line.classId].color);$('dialogue-name').textContent=line.name;$('dialogue-role').textContent=line.boss?BOSSES[round].title.toUpperCase():CLASSES[line.classId].name.toUpperCase()+' · A ÚLTIMA EXPEDIÇÃO';$('dialogue-scene').textContent=BOSSES[round].arena.toUpperCase();const c=$('dialogue-portrait').getContext('2d');c.clearRect(0,0,128,128);c.imageSmoothingEnabled=false;if(line.boss){const image=bossSprite(round,0);c.drawImage(image,image.width*.25,image.height*.08,image.width*.5,image.height*.48,0,0,128,128);}else drawPlayer(c,{id:'voice-'+line.classId,x:64,y:174,facing:Math.PI/2,classId:line.classId,hp:100},0,{scale:2.1,now});}
      const letters=Array.from(line.text),revealed=reducedMotion?letters.length:Math.min(letters.length,Math.floor(Math.max(0,now-line.at)*65));$('dialogue-text').textContent=letters.slice(0,revealed).join('');const beat=Math.min(2,Math.floor((now-line.at)/Math.max(.1,line.until-line.at)*3));$('dialogue-beats').textContent=[0,1,2].map(i=>i===beat?'◆':'◇').join(' ');
    }
    if(frameTime>warningUntil)$('danger').classList.remove('visible');
  }
  if(screen==='results'&&room?.state==='round_end'&&$('next-round'))$('next-round').textContent=`Próxima arena em ${Math.max(0,Math.ceil(room.transitionAt-now))} segundos · ${BOSSES[Math.min(2,room.round+1)].arena}`;
  if(screen==='battle'&&room?.state==='battle'&&frameTime-lastStep>.43){const p=me();if(p&&p.hp>0&&Math.hypot(p.vx,p.vy)>25){audio.fx('step');footFX(p.x,p.y+3);lastStep=frameTime;}}
  audio.music(frameTime,round,screen==='battle'&&room?.state==='battle');requestAnimationFrame(render);
}
window.IRON_ART={exportAtlas,bossSprite,playerSprite};
requestAnimationFrame(render);
$('player-name').value=storageGet('iron-name')||'';
async function boot(){
  try{await api('health');setStatus(nativeDesktop?'PC · SEM HOSPEDAGEM':'SERVIDOR DISPONÍVEL','online');
    if(nativeDesktop){
      const name=(desktopParams.get('name')||'Viajante').slice(0,20);let reused=false;
      if(token){try{const result=await api('session');if(result.session.name===name){setSession(result.session);await connect();reused=true;}}catch{token=null;storageSet('iron-session',null);}}
      if(!reused)await authenticate('guest',{name});
      if(!room){const mode=desktopParams.get('mode');if(mode==='solo'||mode==='host')send('create',{mode:mode==='solo'?'solo':'lan',public:mode==='host',classId:desktopParams.get('class')||'knight'});else if(desktopParams.get('code'))send('join',{code:desktopParams.get('code'),classId:desktopParams.get('class')||'knight'});else $('public-rooms').click();}
      return;
    }
    if(token){const result=await api('session');setSession(result.session);await connect();}}
  catch(error){if(token&&error.message.includes('Sessão')){token=null;storageSet('iron-session',null);setSession(null);setStatus('SERVIDOR DISPONÍVEL','online');}else{setStatus('SERVIDOR OFFLINE','offline');toast(error.message,true);}}
}
boot();
