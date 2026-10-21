import {_electron as electron} from 'playwright-core';
import {resolve} from 'node:path';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=resolve('/tmp/iron-preferences-'+Date.now());await mkdir(root,{recursive:true});
const app=await electron.launch({executablePath:resolve('dist/IronCrown-Linux-x64/iron-crown'),args:['--no-sandbox','--ozone-platform=headless','--disable-gpu'],env:{...process.env,XDG_CONFIG_HOME:resolve(root,'config'),XDG_CACHE_HOME:resolve(root,'cache')}});
try{
 const menu=await app.firstWindow(),errors=[];await menu.locator('#nickname').fill('Preferências');
 async function open(){const next=menu.waitForURL(/^http:/);await menu.locator('#solo').click();await next;const p=menu;p.on('pageerror',e=>errors.push(e.message));await p.locator('.class-card').first().waitFor();return p;}
 const first=await open(),origin=new URL(first.url()).origin;await first.locator('#settings').click();await first.locator('#fx-quality').selectOption('low');await first.locator('#dynamic-lights').uncheck();await first.locator('#hurt-effects').uncheck();await first.locator('#auto-effects').uncheck();await first.locator('#show-perf').check();await first.locator('#music-volume').fill('85');await first.locator('#effects-volume').fill('60');await first.locator('#shake-strength').fill('0');await first.locator('#shake-strength').dispatchEvent('input');await first.getByRole('button',{name:'Salvar e voltar'}).click();
 await first.waitForFunction(async()=>{const s=await window.ironPreferences.get();return s.quality==='low'&&s.shake===0&&s.lighting===false;});await first.evaluate(()=>{window.ironDesktop.returnToMenu().catch(()=>{});});await menu.waitForURL(/^file:/);await menu.locator('#nickname').fill('Preferências');
 const second=await open();assert.notEqual(new URL(second.url()).origin,origin);await second.waitForFunction(()=>window.IRON_PERF?.quality==='low'&&!window.IRON_PERF.lights.enabled);assert.ok(await second.locator('#performance').isVisible());
 const saved=await second.evaluate(()=>window.ironPreferences.get());assert.equal(saved.hurtEffects,false);assert.equal(saved.shake,0);assert.equal(saved.autoEffects,false);assert.equal(saved.musicVolume,.85);assert.equal(saved.effectsVolume,.6);await second.locator('#settings').click();assert.equal(await second.locator('#shake-strength').inputValue(),'0');
 // Sanitization refuses extra fields without exposing a filesystem interface.
 const sanitized=await second.evaluate(()=>window.ironPreferences.save({quality:'invalid',shake:500,path:'/tmp/no',energy:999}));assert.equal(sanitized.quality,'high');assert.equal(sanitized.shake,1);assert.equal(sanitized.path,undefined);assert.equal(sanitized.energy,undefined);
 assert.deepEqual(errors,[]);console.log('PASS: real native settings survive a new solo origin, including zero shake, lights and FPS; preference IPC sanitizes values.');
}finally{await app.close();}
