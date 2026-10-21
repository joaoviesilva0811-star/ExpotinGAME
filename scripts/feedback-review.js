// Native input-only acceptance. The observer reads server events and DOM layout;
// it never changes game resources, timers, HP or simulation state.
import {_electron as electron} from 'playwright-core';
import {installCombatDriver} from './combat-driver.js';
import {resolve} from 'node:path';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=resolve('artifacts/feedback-'+Date.now());await mkdir(root,{recursive:true});
const app=await electron.launch({executablePath:resolve('dist/IronCrown-Linux-x64/iron-crown'),args:['--no-sandbox','--ozone-platform=headless','--disable-gpu'],env:{...process.env,XDG_CONFIG_HOME:resolve(root,'config'),XDG_CACHE_HOME:resolve(root,'cache')}});
try{
 await installCombatDriver(app.context(),{gamepad:true});
 await app.context().addInitScript(()=>{
  const Native=window.WebSocket,seen=new Set();window.__damageEvents=[];
  window.WebSocket=class extends Native{constructor(...args){super(...args);this.addEventListener('message',ev=>{const m=JSON.parse(ev.data);for(const e of m.room?.events||[])if(e.type==='hurt'&&!seen.has(e.id)){seen.add(e.id);window.__damageEvents.push({...e,observed:performance.now()});}});}};
 });
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#nickname').fill('Aldric');await page.locator('[data-class=knight]').click();const next=page.waitForURL(/^http:/);await page.locator('#solo').click();await next;await page.getByRole('button',{name:'Estou pronto'}).click();await page.getByRole('button',{name:'Iniciar expedição'}).click();await page.waitForFunction(()=>window.__room?.state==='battle',null,{timeout:30000});
 await page.evaluate(()=>window.__driverPauseUntil=Date.now()+18000);
 await page.waitForFunction(()=>window.__damageEvents.some(e=>e.owner===window.__session.id),null,{timeout:22000,polling:'raf'});await page.screenshot({path:'artifacts/20-native-hurt.png'});
 const bars=await page.evaluate(()=>{
  const ids=['my-health','my-health-memory','boss-health-fill','boss-health-memory','my-hp','boss-hp'];return Object.fromEntries(ids.map(id=>{const e=document.getElementById(id),b=e.getBoundingClientRect(),s=getComputedStyle(e);return[id,{x:b.x,y:b.y,width:b.width,height:b.height,z:s.zIndex,position:s.position,text:e.textContent}];}));
 });
 for(const key of ['my-health','my-health-memory','boss-health-fill','boss-health-memory'])assert.ok(bars[key].height>0&&bars[key].width>=0,key+' has no geometry');
 assert.ok(Math.abs(bars['boss-hp'].y-bars['boss-health-fill'].y)<10,'boss HP text moved below its bar');
 assert.ok(Math.abs(bars['my-hp'].y-bars['my-health'].y)<10,'player HP text moved below its bar');
 await page.evaluate(()=>window.__driverPauseUntil=0);await page.waitForTimeout(5000);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Gráficos e áudio'}).click();await page.locator('#hurt-effects').uncheck();await page.locator('#shake-strength').fill('0');await page.locator('#shake-strength').dispatchEvent('input');await page.getByRole('button',{name:'Salvar e voltar'}).click();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Gráficos e áudio'}).click();assert.equal(await page.locator('#hurt-effects').isChecked(),false);assert.equal(await page.locator('#shake-strength').inputValue(),'0');await page.getByRole('button',{name:'Salvar e voltar'}).click();
 const events=await page.evaluate(()=>window.__damageEvents);const own=await page.evaluate(()=>window.__session.id);assert.ok(events.some(e=>e.owner===own&&e.maxHp===160&&Number.isFinite(e.angle)&&Number.isFinite(e.hp)));assert.deepEqual(errors,[]);assert.equal(app.windows().length,1);
 await writeFile('artifacts/feedback20-review.json',JSON.stringify({method:'Packaged Linux; ordinary virtual controller; stood still briefly to receive a real server attack; no HP/time changes',events,bars,errors},null,2));console.log('PASS: real hurt events, directional metadata, health-memory geometry, damage-feedback opt-out, one window, zero JS errors.');
}finally{await app.close();}
