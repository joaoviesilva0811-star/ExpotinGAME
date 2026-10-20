import {installCombatDriver} from './combat-driver.js';
// Browser acceptance test. Bots exist ONLY in this test: they send ordinary
// movement/skill intentions through four separate authenticated connections.
// No server state, damage, HP, cooldown, timer, or result is changed by the test.
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});
const origin=process.env.TEST_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const errors=[];
async function createPlayer(name,classId){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await installCombatDriver(context);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.locator('#player-name').fill(name);await page.locator('#guest-submit').click();await page.locator('#create-room').waitFor({state:'visible'});
  page.classId=classId;return page;
}
try{
  const pages=[];
  for(const [name,cls]of [['Aldric','knight'],['Lyra','archer'],['Nyx','rogue'],['Elowen','archer']])pages.push(await createPlayer(name,cls));
  const a=pages[0];await a.locator('#create-room').click();await a.locator('.room-code-box strong').waitFor();const code=await a.locator('.room-code-box strong').textContent();
  for(const p of pages.slice(1)){await p.locator('#room-code').fill(code);await p.locator('#join-form button').click();await p.locator(`[data-class="${p.classId}"]`).click();}
  for(const p of pages)await p.getByRole('button',{name:'Estou pronto'}).click();
  await a.getByRole('button',{name:'Iniciar expedição'}).click();
  for(let round=0;round<3;round++){
    await a.waitForFunction(round=>window.__room?.round===round&&window.__room.state==='battle',round,{timeout:360000});
    await a.waitForTimeout(2500);await a.screenshot({path:`artifacts/arena-${round+1}.png`,fullPage:true});
    console.log(`Round ${round+1}: ${await a.locator('#boss-name').textContent()}`);
    if(round<2){await a.waitForFunction(round=>window.__room?.round===round&&window.__room.state==='round_end',round,{timeout:360000});await a.waitForFunction(()=>window.__room.keys.length===window.__room.round+1&&window.__room.gateUnlocked);await a.screenshot({path:`artifacts/15-key-${round+1}.png`,fullPage:true});await a.waitForFunction(()=>window.__room.now-window.__room.outroStarted>6.5);await a.screenshot({path:`artifacts/corredor-${round+1}.png`,fullPage:true});}

  }
  await a.waitForFunction(()=>window.__room?.state==='ending',null,{timeout:360000});await a.waitForFunction(()=>window.__room.secretUnlocked&&window.__room.keys.length===3);await a.screenshot({path:'artifacts/15-key-3.png',fullPage:true});await a.waitForFunction(()=>window.__room.vaultOpenedAt);await a.waitForTimeout(4000);await a.screenshot({path:'artifacts/pc-10-final.png',fullPage:true});await a.waitForTimeout(3000);await a.screenshot({path:'artifacts/15-crown-chamber.png',fullPage:true});
  await a.waitForFunction(()=>window.__room?.state==='finished',null,{timeout:360000});await a.waitForTimeout(400);
  await a.screenshot({path:'artifacts/08-vitoria.png',fullPage:true});
  const results=await Promise.all(pages.map(p=>p.evaluate(()=>({score:window.__room.score,wins:window.__room.wins,state:window.__room.state,rounds:window.__room.results.length,damage:window.__room.players.map(p=>p.stats.damage),keys:window.__room.keys.map(k=>k.id),secretUnlocked:window.__room.secretUnlocked,vaultOpenedAt:window.__room.vaultOpenedAt}))));
  await writeFile('artifacts/match-result.json',JSON.stringify({results,errors},null,2));
  for(const r of results){assert.equal(r.state,'finished');assert.equal(r.rounds,3);assert.equal(r.wins,3);assert.equal(r.keys.length,3);assert.equal(r.secretUnlocked,true);assert.ok(r.vaultOpenedAt);assert.equal(r.score,results[0].score);assert.ok(r.damage.every(d=>d>0));}
  assert.deepEqual(errors,[]);console.log('PASS: four independent browser sessions completed all three bosses via ordinary combat commands. Identical victory, score and results in all clients.',JSON.stringify(results[0]));
}finally{await browser.close();}
