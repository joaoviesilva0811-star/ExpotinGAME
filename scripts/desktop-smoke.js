import {_electron as electron} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const executable=process.env.IRON_DESKTOP_BINARY||resolve('dist/IronCrown-Linux-x64/iron-crown');
const testRoot=resolve(tmpdir(),'iron-native-test-'+Date.now());
await mkdir('artifacts',{recursive:true});
const errors=[];const apps=[];
async function launch(id){
  const config=resolve(testRoot,id,'config'),cache=resolve(testRoot,id,'cache');await mkdir(config,{recursive:true});await mkdir(cache,{recursive:true});
  const app=await electron.launch({executablePath:executable,args:process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[],env:{...process.env,XDG_CONFIG_HOME:config,XDG_CACHE_HOME:cache},timeout:25000});apps.push(app);
  assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1120,height:820});
  return{app,page};
}
async function gameWindow(instance,action){
  const next=instance.app.waitForEvent('window',{timeout:20000});await action();const game=await next;
  game.on('pageerror',e=>errors.push(e.message));await game.setViewportSize({width:1440,height:960});await game.locator('.class-card').first().waitFor({timeout:20000});return game;
}
try{
  const host=await launch('host');await host.page.screenshot({path:'artifacts/pc-01-menu.png'});
  await host.page.locator('#nickname').fill('Aldric PC');
  const solo=await gameWindow(host,()=>host.page.locator('#solo').click());
  const memberText=await solo.locator('.member-text').allTextContents();assert.ok(memberText.some(t=>t.includes('Lyra'))&&memberText.some(t=>t.includes('Nyx')));
  await solo.locator('[data-class="archer"]').click();await solo.waitForFunction(()=>document.querySelector('.member-text')?.textContent.includes('Arqueiro'));
  let members=await solo.locator('.member-text').allTextContents();assert.ok(members.some(t=>t.includes('Aldric')&&t.includes('COMPANHEIRO'))&&members.some(t=>t.includes('Nyx')));assert.ok(!members.some(t=>t.includes('Lyra')));
  await solo.locator('[data-class="knight"]').click();await solo.waitForFunction(()=>document.querySelector('.member-text')?.textContent.includes('Cavaleiro'));
  await solo.screenshot({path:'artifacts/pc-02-solo.png'});
  await solo.getByRole('button',{name:'Estou pronto'}).click();await solo.getByRole('button',{name:'Iniciar expedição'}).click();await solo.waitForTimeout(5000);
  await solo.screenshot({path:'artifacts/pc-03-bots.png'});
  const directory=resolve(testRoot,'frames');await mkdir(directory,{recursive:true});
  for(let frame=0;frame<45;frame++){await solo.screenshot({path:resolve(directory,String(frame).padStart(3,'0')+'.png')});await solo.waitForTimeout(65);}
  const film=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','10','-i',resolve(directory,'%03d.png'),'-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',resolve('artifacts/previa-pc.mp4')],{encoding:'utf8'});if(film.status!==0)console.log('Video optional:',film.stderr?.slice(0,300));
  await solo.close();await host.page.waitForTimeout(500);
  const a=await gameWindow(host,()=>host.page.locator('#host').click());
  assert.ok(await a.locator('.lan-info').isVisible());const code=await a.locator('.room-code-box strong').textContent();
  const peer=await launch('peer');await peer.page.locator('#nickname').fill('Lyra PC');await peer.page.locator('[data-class="archer"]').click();await peer.page.locator('#join').click();
  // Cloud egress does not permit the machine's private interface. Two native
  // processes still use real TCP; set IRON_TEST_LAN_IP on an authorized LAN.
  const lan=process.env.IRON_TEST_LAN_IP||'127.0.0.1';
  await peer.page.locator('#address').fill(lan);await peer.page.locator('#code').fill(code);
  const b=await gameWindow(peer,()=>peer.page.locator('#join-form button').click());
  await a.waitForFunction(()=>document.querySelectorAll('.member').length===2);await b.waitForFunction(()=>document.querySelectorAll('.member').length===2);
  assert.ok((await b.locator('.member-text').allTextContents()).some(text=>text.includes('Lyra PC')&&text.includes('Arqueiro')));
  await a.screenshot({path:'artifacts/pc-04-lan.png'});
  await a.getByRole('button',{name:'Estou pronto'}).click();await b.getByRole('button',{name:'Estou pronto'}).click();await a.getByRole('button',{name:'Iniciar expedição'}).click();
  await a.waitForTimeout(3500);await b.mouse.move(960,480);await b.mouse.down();await b.keyboard.press('Digit1');await b.waitForTimeout(1000);await b.mouse.up();await b.waitForTimeout(900);
  assert.equal(await a.locator('#boss-hp').textContent(),await b.locator('#boss-hp').textContent());
  const [hp,max]= (await b.locator('#boss-hp').textContent()).split('/').map(Number);assert.ok(hp<max);
  await b.reload();await b.locator('#hud').waitFor({state:'visible'});assert.equal(await b.locator('#my-name').textContent(),'Lyra PC');
  await a.screenshot({path:'artifacts/pc-05-lan-combate.png'});
  assert.deepEqual(errors,[]);console.log('PASS: packaged native app, embedded Node runtime, solo bots/class replacement, combat, two native instances over TCP '+lan+', same boss, and client reconnection.');
}finally{for(const app of apps.reverse())await app.close().catch(()=>{});}
