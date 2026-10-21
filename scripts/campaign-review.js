// Native acceptance through ordinary Gamepad API input. No state/HP/time edits.
import {_electron as electron} from 'playwright-core';import {installCombatDriver} from './combat-driver.js';import {resolve} from 'node:path';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=resolve('artifacts/campaign19-'+Date.now());await mkdir(root,{recursive:true});
const app=await electron.launch({executablePath:resolve('dist/IronCrown-Linux-x64/iron-crown'),args:['--no-sandbox','--ozone-platform=headless','--disable-gpu'],env:{...process.env,XDG_CONFIG_HOME:resolve(root,'config'),XDG_CACHE_HOME:resolve(root,'cache')}});
try{
 await installCombatDriver(app.context(),{gamepad:true});const page=await app.firstWindow(),errors=[],samples=[],broken=new Set(),phases=[new Set(),new Set(),new Set()],shots=new Set();page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#nickname').fill('Lyra');await page.locator('[data-class='+ (process.env.CAMPAIGN_CLASS||'archer')+']').click();const next=page.waitForURL(/^http:/);await page.locator('#solo').click();await next;await page.getByRole('button',{name:'Estou pronto'}).click();await page.getByRole('button',{name:'Iniciar expedição'}).click();let previous='',final=null;
 for(const deadline=Date.now()+1000000;Date.now()<deadline;){
  const r=await page.evaluate(()=>window.__room);if(!r){await page.waitForTimeout(100);continue;}
  const key=r.round+':'+r.state+':'+r.boss?.phase;if(key!==previous){console.log('Native campaign',key,'time',Math.round(r.now),'boss HP',Math.round(r.boss?.hp||0));previous=key;}
  for(const e of r.events)if(e.type==='coverBreak')broken.add(r.round+':'+e.id);
  if(r.state==='battle'){phases[r.round].add(r.boss.phase);samples.push({round:r.round,remaining:r.remaining,...await page.evaluate(()=>window.IRON_PERF)});const shot=r.round+':'+r.boss.phase;if(!shots.has(shot)&&300-r.remaining>8){shots.add(shot);await page.screenshot({path:`artifacts/19-native-arena-${r.round+1}-phase-${r.boss.phase}.png`});}}
  if(r.state==='finished'){final=r;await page.screenshot({path:'artifacts/19-native-results.png'});break;}
  await page.waitForTimeout(1000);
 }
 assert.ok(final,'campaign timed out');const report={wins:final.wins,score:final.score,keys:final.keys,secretUnlocked:final.secretUnlocked,results:final.results,players:final.players.map(p=>({name:p.name,isBot:p.isBot,stats:p.stats})),phases:phases.map(p=>[...p]),coverBreakEvents:broken.size,samples,errors,method:'Packaged Linux app, ordinary virtual controller, no recording, no HP/time edits'};await writeFile('artifacts/campaign19-review.json',JSON.stringify(report,null,2));assert.equal(final.wins,3);assert.equal(final.keys.length,3);assert.equal(final.secretUnlocked,true);assert.deepEqual(errors,[]);console.log('PASS: three native battles, keys, secret ending, no runtime errors; broken covers:',broken.size);
}finally{await app.close();}
