import {AudioEngine} from '../public/audio.js';
const audio=new AudioEngine();
let classId='knight',busy=false;
const $=id=>document.getElementById(id);
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#sound-toggle'))audio.enable();},{once:true});
$('sound-toggle').onclick=async()=>{const on=await audio.toggle();$('sound-toggle').textContent=on?'♪ SOM':'♫ MUDO';};
document.addEventListener('click',e=>{if(e.target.closest('button'))audio.fx('ui');});
const fxCanvas=$('menu-embers'),fx=fxCanvas.getContext('2d');
function animate(time){const w=innerWidth,h=innerHeight;if(fxCanvas.width!==w||fxCanvas.height!==h){fxCanvas.width=w;fxCanvas.height=h;}fx.clearRect(0,0,w,h);const t=time/1000;for(let i=0;i<42;i++){const x=(i*137.3+Math.sin(t*.3+i)*24)%w,y=h-((t*(8+i%5)+i*83)%h);fx.globalAlpha=.2+Math.sin(t+i)*.14;fx.fillStyle=i%3?'#e7b06c':'#b9d5d9';fx.fillRect(x,y,i%7?1:2,i%7?2:3);}audio.music(t,0,false);requestAnimationFrame(animate);}requestAnimationFrame(animate);
const companions={knight:'Lyra, a arqueira + Nyx, o ladino',archer:'Aldric, o cavaleiro + Nyx, o ladino',rogue:'Aldric, o cavaleiro + Lyra, a arqueira'};
try{$('nickname').value=localStorage.getItem('desktop-name')||'Viajante';}catch{}
for(const button of document.querySelectorAll('[data-class]'))button.onclick=()=>{classId=button.dataset.class;for(const b of document.querySelectorAll('[data-class]'))b.classList.toggle('selected',b===button);$('companions').textContent=companions[classId];};
async function launch(mode){
  if(busy)return;busy=true;for(const b of document.querySelectorAll('button'))b.disabled=true;
  $('status').className='';$('status').textContent=mode==='join'?'Procurando o computador do anfitrião…':'Preparando o jogo no seu computador…';
  try{
    if(!window.ironDesktop)throw new Error('Abra pelo executável Shadows of the Iron Crown, não pelo arquivo HTML.');
    const name=$('nickname').value.trim();try{localStorage.setItem('desktop-name',name);}catch{}
    document.body.classList.add('departing');await new Promise(resolve=>setTimeout(resolve,360));
    const result=await window.ironDesktop.launch({mode,name,classId,address:$('address').value,code:$('code').value});
    if(!result.ok)throw new Error(result.error);
    $('status').textContent='Expedição aberta. Feche a janela do jogo para voltar a este menu.';
  }catch(error){$('status').className='error';$('status').textContent=error.message;}
  finally{document.body.classList.remove('departing');busy=false;for(const b of document.querySelectorAll('button'))b.disabled=false;}
}
$('solo').onclick=()=>launch('solo');$('host').onclick=()=>launch('host');$('join').onclick=()=>{$('join-form').hidden=!$('join-form').hidden;if(!$('join-form').hidden)$('address').focus();};$('join-form').onsubmit=event=>{event.preventDefault();launch('join');};
