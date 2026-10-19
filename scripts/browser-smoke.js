import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const origin=process.env.TEST_URL||'http://127.0.0.1:3000';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
async function player(name,mobile=false){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.locator('#player-name').fill(name);await page.getByRole('button',{name:'Jogar sem conta'}).click();await page.locator('#create-room').waitFor({state:'visible'});return page;
}
try{
  const a=await player('Sir Aldric'),b=await player('Lyra');
  await a.locator('#create-room').click();await a.locator('.room-code-box strong').waitFor();const code=await a.locator('.room-code-box strong').textContent();
  await b.locator('#room-code').fill(code);await b.locator('#join-form button').click();await b.locator('[data-class="archer"]').click();
  await a.waitForFunction(()=>document.querySelectorAll('.member').length===2);
  await a.screenshot({path:'artifacts/02-sala.png',fullPage:true});
  await a.getByRole('button',{name:'Estou pronto'}).click();await b.getByRole('button',{name:'Estou pronto'}).click();await a.getByRole('button',{name:'Iniciar expedição'}).click();
  await a.locator('#hud').waitFor({state:'visible'});await a.waitForTimeout(18500);
  await a.mouse.move(970,520);await a.keyboard.down('KeyD');await a.waitForTimeout(1200);await a.keyboard.up('KeyD');
  await a.keyboard.press('Digit3');await a.keyboard.down('Space');await a.waitForTimeout(150);
  await a.screenshot({path:'artifacts/03-defesa.png',fullPage:true});await a.keyboard.up('Space');
  await b.mouse.move(950,520);await b.mouse.down();await b.keyboard.press('Digit1');await b.waitForTimeout(250);
  await b.screenshot({path:'artifacts/04-ataque.png',fullPage:true});await b.mouse.up();
  const aEnergy=await a.locator('#my-en').textContent();if(aEnergy==='100 / 100')throw new Error('Energy did not decrease after skill and defense');
  await a.reload();await a.locator('#hud').waitFor({state:'visible'});await a.waitForTimeout(300);await a.screenshot({path:'artifacts/05-reconexao.png'});
  const mobile=await player('Mobile',true);await mobile.screenshot({path:'artifacts/06-celular-inicio.png',fullPage:true});await mobile.locator('#create-room').click();await mobile.getByRole('button',{name:'Estou pronto'}).click();await mobile.getByRole('button',{name:'Iniciar expedição'}).click();await mobile.waitForTimeout(18500);
  await mobile.screenshot({path:'artifacts/07-celular-combate.png',fullPage:true});
  if(!await mobile.locator('#joystick').isVisible())throw new Error('Mobile joystick missing');
  const stick=await mobile.locator('#joystick').boundingBox();await mobile.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await mobile.mouse.down();await mobile.mouse.move(stick.x+stick.width-5,stick.y+stick.height/2);await mobile.waitForTimeout(700);await mobile.mouse.up();
  const attack=await mobile.locator('#touch-attack').boundingBox(),cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:attack.x+attack.width/2,y:attack.y+attack.height/2}]});
  await mobile.waitForTimeout(180);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('PASS: two independent browser contexts, shared room, class selection, start, movement, skills/defense energy, session recovery and mobile UI.');
}finally{await browser.close();}
