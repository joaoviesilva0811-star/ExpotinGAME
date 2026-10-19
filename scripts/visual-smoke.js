// Presentation review uses the real game plus a separate renderer contact sheet.
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.TEST_URL||'http://127.0.0.1:3001';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const Native=window.WebSocket;window.WebSocket=class extends Native{constructor(...args){super(...args);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.room)window.__room=m.room;});}};});
 await page.goto(origin);await page.locator('#player-name').fill('Lyra');await page.getByRole('button',{name:'Jogar sem conta'}).click();await page.locator('#create-solo').click();await page.locator('[data-class=archer]').click();await page.waitForTimeout(700);
 assert.equal(await page.locator('[data-hat],.wardrobe').count(),0);await page.screenshot({path:'artifacts/13-lobby.png'});
 await page.getByRole('button',{name:'Estou pronto'}).click();await page.getByRole('button',{name:'Iniciar expedição'}).click();
 await page.waitForFunction(()=>window.__room?.state==='countdown'&&window.__room.now>window.__room.intro.dialogueAt+.7);await page.screenshot({path:'artifacts/13-dialogue-hero.png'});
 assert.ok(await page.locator('#dialogue-portrait').isVisible());
 await page.waitForFunction(()=>window.__room.now>window.__room.intro.awakeningAt+.6);await page.screenshot({path:'artifacts/13-dialogue-boss.png'});
 await page.waitForFunction(()=>window.__room?.state==='battle');await page.keyboard.down('KeyJ');await page.mouse.move(1200,400);await page.waitForTimeout(2200);await page.keyboard.up('KeyJ');
 await page.waitForFunction(()=>window.__room?.hazards.some(h=>h.at>window.__room.now),null,{timeout:15000});await page.screenshot({path:'artifacts/13-combat.png'});
 // Eight genuine sprite poses and the shared warning geometry, rendered in isolation.
 const hashes=await page.evaluate(async()=>{
  const {drawPlayer}=await import('/art.js'),{drawTelegraph}=await import('/telegraphs.js'),fx=await import('/vfx.js');
  fx.resetFX();const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1000;const c=canvas.getContext('2d');c.fillStyle='#151c23';c.fillRect(0,0,1440,1000);c.imageSmoothingEnabled=false;
  c.fillStyle='#e5c88c';c.font='26px Pixelify';c.fillText('ARQUEIRO · MIRA E DISPARO EM OITO DIREÇÕES',50,52);
  const hashes=[];
  for(let i=0;i<8;i++){
   const facing=Math.PI/2-i*Math.PI/4,x=95+i*175;drawPlayer(c,{id:'contact-'+i,classId:'archer',x,y:210,hp:100,facing,aiming:true,attackAt:10,attackSlot:-1,attackFor:.52,lastHurt:10.1},0,{scale:1.7,now:10.21});
   const pixels=c.getImageData(x-65,70,130,150).data;let hash=0;for(let j=0;j<pixels.length;j+=4)hash=(hash*31+pixels[j]+pixels[j+1]*3+pixels[j+2]*7)|0;hashes.push(hash);
   c.fillStyle='#b7b3a6';c.font='16px Pixelify';c.fillText(['S','SE','E','NE','N','NO','O','SO'][i],x-10,250);
  }
  c.fillStyle='#e5c88c';c.font='25px Pixelify';c.fillText('MARCAÇÕES · CONTORNO FIXO, PREPARAÇÃO E ÁREA SEGURA',50,315);
  const warnings=[{x:190,y:500,r:120},{x:520,y:500,r:135,inner:70},{x:800,y:500,r:145,shape:'cone',angle:-.7,spread:.8},{x:1190,y:500,r:150,shape:'line',length:285,width:75,angle:-.55}];
  for(const h of warnings)drawTelegraph(c,{...h,started:10,at:12},11.4,2,0);
  c.fillStyle='#e5c88c';c.font='25px Pixelify';c.fillText('GOLPES · LÂMINA, FAÍSCAS E PROJÉTEIS',50,720);
  fx.slashFX(220,890,-.7,'gold',false,0);fx.slashFX(530,890,-.7,'violet',false,0);fx.slashFX(870,890,-.7,'red',true,0);for(let i=0;i<7;i++)fx.stepFX(.02);fx.drawFX(c);
  fx.drawProjectile(c,{id:'contact-arrow',x:1220,y:820,vx:640,vy:-180,color:'ice'},2);
  const old=document.getElementById('visual-contact');if(old)old.remove();canvas.id='visual-contact';Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:100});document.body.append(canvas);return hashes;
 });assert.equal(new Set(hashes).size,8,'All eight aimed attack sprites must differ, even while hurt');await page.screenshot({path:'artifacts/13-directions-effects.png'});await page.evaluate(()=>document.getElementById('visual-contact').remove());
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(origin);await mobile.locator('#player-name').fill('Mobile');await mobile.getByRole('button',{name:'Jogar sem conta'}).click();await mobile.locator('#create-solo').click();await mobile.screenshot({path:'artifacts/13-mobile-lobby.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: illustrated lobby, no hats, hero/boss portraits, actual combat warnings, eight distinct aimed firing sprites through hurt, effects contact sheet and mobile layout.');
}finally{await browser.close();}
