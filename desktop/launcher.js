let classId='knight',busy=false;
const $=id=>document.getElementById(id);
const companions={knight:'Lyra, a arqueira + Nyx, o ladino',archer:'Aldric, o cavaleiro + Nyx, o ladino',rogue:'Aldric, o cavaleiro + Lyra, a arqueira'};
try{$('nickname').value=localStorage.getItem('desktop-name')||'Viajante';}catch{}
for(const button of document.querySelectorAll('[data-class]'))button.onclick=()=>{classId=button.dataset.class;for(const b of document.querySelectorAll('[data-class]'))b.classList.toggle('selected',b===button);$('companions').textContent=companions[classId];};
async function launch(mode){
  if(busy)return;busy=true;for(const b of document.querySelectorAll('button'))b.disabled=true;
  $('status').className='';$('status').textContent=mode==='join'?'Procurando o computador do anfitrião…':'Preparando o jogo no seu computador…';
  try{
    if(!window.ironDesktop)throw new Error('Abra pelo executável Shadows of the Iron Crown, não pelo arquivo HTML.');
    const name=$('nickname').value.trim();try{localStorage.setItem('desktop-name',name);}catch{}
    const result=await window.ironDesktop.launch({mode,name,classId,address:$('address').value,code:$('code').value});
    if(!result.ok)throw new Error(result.error);
    $('status').textContent='Expedição aberta. Feche a janela do jogo para voltar a este menu.';
  }catch(error){$('status').className='error';$('status').textContent=error.message;}
  finally{busy=false;for(const b of document.querySelectorAll('button'))b.disabled=false;}
}
$('solo').onclick=()=>launch('solo');$('host').onclick=()=>launch('host');$('join').onclick=()=>{$('join-form').hidden=!$('join-form').hidden;if(!$('join-form').hidden)$('address').focus();};$('join-form').onsubmit=event=>{event.preventDefault();launch('join');};
