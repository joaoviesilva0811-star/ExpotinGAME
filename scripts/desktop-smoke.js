import {_electron as electron} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const executable=process.env.IRON_DESKTOP_BINARY||resolve('dist/IronCrown-Linux-x64/iron-crown');
const testRoot=resolve(tmpdir(),'iron-native-test-'+Date.now());
await mkdir('artifacts',{recursive:true});
const errors=[];const apps=[];
async function launch(id){
  const config=resolve(testRoot,id,'config'),cache=resolve(testRoot,id,'cache');await mkdir(config,{recursive:true});await mkdir(cache,{recursive:true});
  const app=await electron.launch({executablePath:executable,args:process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--disable-gpu']:[],env:{...process.env,XDG_CONFIG_HOME:config,XDG_CACHE_HOME:cache},timeout:25000});apps.push(app);
  assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1120,height:820});
  await app.context().addInitScript(()=>{
    const Native=window.WebSocket;window.WebSocket=class extends Native{constructor(...args){super(...args);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='welcome')window.__session=m.session;if(m.room)window.__room=m.room;});}};
    const NativeAudio=window.Audio;window.__audio=[];window.Audio=function(...args){const a=new NativeAudio(...args);window.__audio.push(a);return a;};
  });await page.reload();await page.waitForTimeout(900);
  return{app,page};
}
async function gameWindow(instance,action){
  const next=instance.page.waitForURL(/^http:/,{timeout:20000});await action();await next;const game=instance.page;
  game.on('pageerror',e=>errors.push(e.message));await game.setViewportSize({width:1440,height:960});await game.locator('.class-card').first().waitFor({timeout:20000});return game;
}
try{
  const host=await launch('host');await host.page.screenshot({path:'artifacts/pc-01-menu.png'});await host.page.locator('#sound-toggle').click();await host.page.waitForFunction(()=>window.__audio.some(a=>a.currentTime>.1&&!a.paused));
  await host.page.locator('#nickname').fill('Aldric PC');
  const solo=await gameWindow(host,()=>host.page.locator('#solo').click());
  const memberText=await solo.locator('.member-text').allTextContents();assert.ok(memberText.some(t=>t.includes('Lyra'))&&memberText.some(t=>t.includes('Nyx')));
  await solo.locator('[data-class="archer"]').click();await solo.waitForFunction(()=>document.querySelector('.member-text')?.textContent.includes('Arqueiro'));
  let members=await solo.locator('.member-text').allTextContents();assert.ok(members.some(t=>t.includes('Aldric')&&t.includes('COMPANHEIRO'))&&members.some(t=>t.includes('Nyx')));assert.ok(!members.some(t=>t.includes('Lyra')));
  await solo.locator('[data-class="knight"]').click();await solo.waitForFunction(()=>document.querySelector('.member-text')?.textContent.includes('Cavaleiro'));
  await solo.screenshot({path:'artifacts/pc-02-solo.png'});
  await solo.getByRole('button',{name:'Estou pronto'}).click();await solo.getByRole('button',{name:'Iniciar expedição'}).click();
  let sawDialogue=false,sawAwakening=false,sawArrival=false;const deadline=performance.now()+25000;
  while(performance.now()<deadline){
    const r=await solo.evaluate(()=>window.__room);if(r?.state==='battle')break;if(!r?.intro||r.state==='lobby'){await solo.waitForTimeout(50);continue;}
    await solo.waitForTimeout(90);
    if(!sawArrival&&r.now>r.intro.started+1&&r.now<r.intro.gateAt){await solo.screenshot({path:'artifacts/pc-08-chegada.png'});sawArrival=true;}
    if(!sawDialogue&&r?.now>r.intro.dialogueAt+.3){await solo.screenshot({path:'artifacts/pc-06-dialogo.png'});assert.ok(await solo.locator('#dialogue').isVisible());sawDialogue=true;}
    if(!sawAwakening&&r?.boss.state==='awakening'&&r.now>r.intro.awakeningAt+1){await solo.screenshot({path:'artifacts/pc-09-despertar.png'});sawAwakening=true;}
  }
  assert.ok(sawDialogue&&sawAwakening);
  await solo.waitForFunction(()=>window.__room.state==='battle',null,{timeout:25000});
  await solo.keyboard.press('Tab');await solo.locator('[data-emote="step"]').click();await solo.waitForFunction(()=>window.__room.players.some(p=>p.name==='Aldric PC'&&p.emoteUntil>window.__room.now));await solo.screenshot({path:'artifacts/pc-07-emote.png'});
  const energy=await solo.evaluate(()=>window.__room.players.find(p=>p.name==='Aldric PC').energy);await solo.keyboard.down('KeyD');await solo.keyboard.press('KeyE');await solo.waitForTimeout(200);await solo.keyboard.up('KeyD');
  assert.ok(await solo.evaluate(before=>window.__room.players.find(p=>p.name==='Aldric PC').energy<before-12,energy));
  await solo.keyboard.down('KeyD');await solo.waitForTimeout(1500);await solo.keyboard.up('KeyD');await solo.keyboard.down('KeyJ');await solo.keyboard.press('Digit1');await solo.keyboard.press('Digit3');await solo.waitForTimeout(12000);
  await solo.screenshot({path:'artifacts/pc-03-bots.png'});
  await solo.keyboard.up('KeyJ');
  // Record a smooth preview separately with scripts/record-preview.js.
  await solo.evaluate(()=>{window.ironDesktop.returnToMenu().catch(()=>{});});await host.page.waitForURL(/^file:/);await host.page.locator('#nickname').fill('Aldric PC');
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
  await a.waitForFunction(()=>window.__room?.state==='battle',null,{timeout:25000});
  async function aimWorld(target){const pt=await b.evaluate(target=>{const rect=document.querySelector('#game').getBoundingClientRect(),s=Math.min(rect.width/1200,rect.height/760),v=window.IRON_PERF.camera;return{x:rect.left+(rect.width-1200*s)/2+(600+(target.x-v.x)*v.zoom)*s,y:rect.top+(rect.height-760*s)/2+(380+(target.y-v.y)*v.zoom)*s};},target);await b.mouse.move(pt.x,pt.y);}
  const cover=await b.evaluate(()=>window.__room.covers[0]);await aimWorld(cover);await b.mouse.down();await b.waitForFunction(()=>window.__room.covers[0].hp<=0,null,{timeout:10000});await b.mouse.up();await a.waitForFunction(()=>window.__room.covers[0].hp<=0);assert.equal(await a.evaluate(()=>window.__room.covers[0].hp),await b.evaluate(()=>window.__room.covers[0].hp));
  await b.mouse.down();await b.keyboard.press('Digit1');for(let i=0;i<18;i++){await aimWorld(await b.evaluate(()=>window.__room.boss));await b.waitForTimeout(120);}await b.mouse.up();await b.waitForTimeout(300);
  // Wait for in-flight friendly arrows before comparing two independent HUDs.
  // Reading sequentially while arrows still land can compare different ticks.
  await b.waitForFunction(()=>window.__room.projectiles.every(q=>q.enemy),null,{timeout:6000});
  const hp=await b.evaluate(()=>Math.ceil(window.__room.boss.hp)),max=await b.evaluate(()=>window.__room.boss.maxHp);
  await a.waitForFunction(hp=>Math.ceil(window.__room.boss.hp)===hp,hp,{timeout:5000});
  await Promise.all([a.waitForFunction(({hp,max})=>document.querySelector('#boss-hp').textContent===`${hp} / ${max}`,{hp,max}),b.waitForFunction(({hp,max})=>document.querySelector('#boss-hp').textContent===`${hp} / ${max}`,{hp,max})]);assert.ok(hp<max);
  await b.reload();await b.locator('#hud').waitFor({state:'visible'});assert.equal(await b.locator('#my-name').textContent(),'Lyra PC');
  await a.screenshot({path:'artifacts/pc-05-lan-combate.png'});
  assert.deepEqual(errors,[]);console.log('PASS: packaged native app, embedded Node runtime, audible menu track, dialogues, emotes, energy-limited dash, solo bots/class replacement, combat, two native instances over TCP '+lan+', same boss, shared destructible cover, and client reconnection.');
}finally{for(const app of apps.reverse())await app.close().catch(()=>{});}
