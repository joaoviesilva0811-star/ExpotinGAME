// Real firing inputs and server snapshots, plus a contact sheet of those captures.
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.TEST_URL||'http://127.0.0.1:3003';await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const Native=window.WebSocket;window.WebSocket=class extends Native{
   constructor(...a){super(...a);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.session)window.__session=m.session;if(m.room){window.__room=m.room;window.__shots??=[];window.__seen??=new Set();for(const q of m.room.events)if(q.type==='shot'&&q.owner===window.__session?.id&&!window.__seen.has(q.projectile)){window.__seen.add(q.projectile);window.__shots.push({...q,id:q.projectile,player:m.room.players.find(p=>p.id===q.owner),now:m.room.now});}}});}
   send(data){const m=JSON.parse(data);if(m.type==='input'&&window.__aim){m.ax=window.__aim.ax;m.ay=window.__aim.ay;}super.send(JSON.stringify(m));}
  };
 });
 await page.goto(origin);await page.locator('#player-name').fill('Lyra');await page.getByRole('button',{name:'Jogar sem conta'}).click();await page.locator('#create-solo').click();await page.locator('[data-class=archer]').click();await page.getByRole('button',{name:'Estou pronto'}).click();await page.getByRole('button',{name:'Iniciar expedição'}).click();await page.waitForFunction(()=>window.__room?.state==='battle');
 await page.keyboard.down('KeyS');await page.waitForTimeout(1100);await page.keyboard.up('KeyS');await page.keyboard.down('KeyD');await page.waitForTimeout(1000);await page.keyboard.up('KeyD');
 const shots=[];
 for(let i=0;i<8;i++){
  const angle=Math.PI/2-i*Math.PI/4;await page.evaluate(a=>{window.__aim={ax:Math.cos(a),ay:Math.sin(a)};window.__shots=[];},angle);
  if(i<3)await page.keyboard.press('Digit'+(i+1));else await page.keyboard.down('KeyJ');
  await page.waitForFunction(angle=>window.__shots?.some(q=>Math.abs(Math.atan2(Math.sin(Math.atan2(q.vy,q.vx)-angle),Math.cos(Math.atan2(q.vy,q.vx)-angle)))<.01),angle,{timeout:3000}).catch(async error=>{console.log('Firing capture failed at direction',i,await page.evaluate(()=>{const p=window.__room.players.find(p=>p.id===window.__session.id);return{x:p.x,y:p.y,hp:p.hp,state:window.__room.state,facing:p.facing};}));throw error;});await page.keyboard.up('KeyJ');
  const shot=await page.evaluate(angle=>window.__shots.find(q=>Math.abs(Math.atan2(Math.sin(Math.atan2(q.vy,q.vx)-angle),Math.cos(Math.atan2(q.vy,q.vx)-angle)))<.01),angle);assert.ok(shot);shots.push(shot);
  if(i===2||i===6)await page.screenshot({path:`artifacts/14-archer-${i===2?'east':'west'}.png`});
 }
 await writeFile('artifacts/14-real-arrows.json',JSON.stringify(shots,null,2));
 await page.evaluate(async shots=>{
  const{drawPlayer}=await import('/art.js'),{drawProjectile}=await import('/vfx.js');
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=960;const c=canvas.getContext('2d');c.fillStyle='#151c23';c.fillRect(0,0,1440,960);c.imageSmoothingEnabled=false;
  c.fillStyle='#e5c88c';c.font='30px Pixelify';c.fillText('ARQUEIRO · CORPO, ARCO E FLECHA NA MESMA DIREÇÃO',55,55);
  c.fillStyle='#a9b4b2';c.font='17px Pixelify';c.fillText('Poses e velocidades capturadas de oito disparos reais pelo servidor.',55,90);
  for(let i=0;i<shots.length;i++){
   const q=shots[i],x=180+(i%4)*355,y=330+Math.floor(i/4)*390,a=Math.atan2(q.vy,q.vx);
   c.strokeStyle='#a9925a55';c.beginPath();c.moveTo(x,y-18);c.lineTo(x+Math.cos(a)*120,y-18+Math.sin(a)*120);c.stroke();
   c.fillStyle='#d9c69a';c.font='20px Pixelify';c.fillText(['SUL','SUDESTE','LESTE','NORDESTE','NORTE','NOROESTE','OESTE','SUDOESTE'][i],x-55,y+115);
   const p={...q.player,id:'review-'+i,x,y};drawPlayer(c,p,0,{scale:1.8,now:q.now});
   drawProjectile(c,{...q,x:x+Math.cos(a)*103,y:y+Math.sin(a)*103},0);
  }
  Object.assign(canvas.style,{position:'fixed',inset:0,width:'100vw',height:'100vh',zIndex:100});document.body.append(canvas);
 },shots);await page.screenshot({path:'artifacts/14-archer-real-directions.png'});assert.deepEqual(errors,[]);console.log('PASS: eight actual server-fired arrows match the character aim. Real east/west screenshots and captured-pose contact sheet saved.');
}finally{await browser.close();}
