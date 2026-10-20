// Complete native solo acceptance, recorded from the packaged game itself.
// Driver sends ordinary input commands. No HP, timer or damage modifications.
import {_electron as electron} from 'playwright-core';
import {installCombatDriver} from './combat-driver.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve('artifacts/native-recording-'+Date.now()),framesDir=resolve(root,'frames');await mkdir(framesDir,{recursive:true});await mkdir('artifacts',{recursive:true});
const app=await electron.launch({executablePath:resolve('dist/IronCrown-Linux-x64/iron-crown'),args:['--no-sandbox','--ozone-platform=headless','--disable-gpu'],env:{...process.env,XDG_CONFIG_HOME:resolve(root,'config'),XDG_CACHE_HOME:resolve(root,'cache')},timeout:25000});
try{
 await installCombatDriver(app.context());const errors=[],perf=[];
 const menu=await app.firstWindow();await menu.setViewportSize({width:1120,height:820});await menu.locator('#nickname').fill('Lyra');await menu.locator('[data-class=archer]').click();await menu.screenshot({path:'artifacts/pc-01-menu.png'});
 const next=menu.waitForURL(/^http:/);await menu.locator('#solo').click();await next;const page=menu;page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'Estou pronto'}).click();await page.screenshot({path:'artifacts/pc-02-solo.png'});
 const cdp=await app.context().newCDPSession(page),frames=[],writes=[];let recording=false,clip=0;
 cdp.on('Page.screencastFrame',event=>{cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});if(!recording||frames.length>=10000)return;const file=resolve(framesDir,String(frames.length).padStart(5,'0')+'.jpg');frames.push({file,time:event.metadata.timestamp,clip});writes.push(writeFile(file,Buffer.from(event.data,'base64')));});
 async function record(active){if(active===recording)return;recording=active;if(active){clip++;await cdp.send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:1200,maxHeight:800,everyNthFrame:1});}else await cdp.send('Page.stopScreencast');}
 await record(true);await page.getByRole('button',{name:'Iniciar expedição'}).click();
 let last='',endingShot=false,crownShot=false;const keys=new Set(),roundShots=new Set(),deadline=Date.now()+1100000;
 while(Date.now()<deadline){
  const r=await page.evaluate(()=>window.__room);if(!r){await page.waitForTimeout(100);continue;}
  const state=r.round+':'+r.state;if(state!==last){console.log('Native',r.round+1,r.state,Math.round(r.now),r.keys.length+' keys');last=state;}
  const inIntro=r.state==='countdown',elapsed=300-r.remaining,keyScene=r.keyDrop&&r.now<r.keySceneUntil;
  await record(inIntro||r.state==='battle'&&elapsed<17||keyScene||r.state==='round_end'&&r.now-r.outroStarted>=6||r.state==='ending');
  if(r.state==='battle'&&elapsed>8&&!roundShots.has(r.round)){roundShots.add(r.round);await page.screenshot({path:`artifacts/16-native-arena-${r.round+1}.png`});}
  if(r.keyDrop?.collectedAt&&!keys.has(r.round)){keys.add(r.round);await page.screenshot({path:`artifacts/16-native-key-${r.round+1}.png`});}
  if(r.state==='ending'&&r.secretUnlocked&&r.now>r.endingAt+8.5&&!endingShot){endingShot=true;await page.screenshot({path:'artifacts/16-native-vault.png'});}
  if(r.state==='ending'&&r.secretUnlocked&&r.now>r.endingAt+12.5&&!crownShot){crownShot=true;await page.screenshot({path:'artifacts/16-native-crown.png'});}
  if(r.state==='finished'){await record(false);assert.equal(r.wins,3);assert.equal(r.keys.length,3);assert.equal(r.secretUnlocked,true);assert.ok(r.vaultOpenedAt);await page.screenshot({path:'artifacts/16-native-results.png'});await writeFile('artifacts/native-keys-result.json',JSON.stringify({score:r.score,wins:r.wins,keys:r.keys,secretUnlocked:r.secretUnlocked,vaultOpenedAt:r.vaultOpenedAt,results:r.results,players:r.players.map(p=>({name:p.name,isBot:p.isBot,stats:p.stats})),perf,errors},null,2));break;}
  if(r.state==='battle'&&Math.floor(elapsed)%5===0){const sample=await page.evaluate(()=>window.IRON_PERF);if(sample&&perf.at(-1)?.at!==Math.floor(r.now))perf.push({at:Math.floor(r.now),round:r.round,...sample});}
  await page.waitForTimeout(150);
 }
 assert.ok(crownShot,'Secret ending was not reached');assert.deepEqual(errors,[]);await record(false);await Promise.all(writes);
 const timeline=[];for(const name of ['pc-01-menu','pc-02-solo']){const jpg=resolve(root,name+'.jpg'),result=spawnSync('ffmpeg',['-y','-loglevel','error','-i',resolve('artifacts/'+name+'.png'),'-vf','scale=1200:800:force_original_aspect_ratio=decrease,pad=1200:800:(ow-iw)/2:(oh-ih)/2','-frames:v','1',jpg],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);timeline.push(`file '${jpg}'\nduration 2`);}
 for(let i=0;i<frames.length-1;i++){const duration=frames[i].clip!==frames[i+1].clip ? .15 : Math.max(.015,Math.min(.2,frames[i+1].time-frames[i].time));timeline.push(`file '${frames[i].file}'\nduration ${duration.toFixed(4)}`);}timeline.push(`file '${frames.at(-1).file}'\nduration 1`);await writeFile(resolve(root,'timeline.txt'),timeline.join('\n')+'\n');
 const ff=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',resolve(root,'timeline.txt'),'-stream_loop','-1','-i',resolve('public/assets/audio/battle-throne.ogg'),'-vf','scale=1200:800:flags=area,fps=60','-c:v','libx264','-threads','2','-preset','veryfast','-crf','25','-maxrate','4M','-bufsize','8M','-c:a','aac','-b:a','128k','-shortest','-pix_fmt','yuv420p','-movflags','+faststart',resolve('artifacts/previa-pc.mp4')],{encoding:'utf8'});if(ff.status!==0)throw new Error(ff.stderr);
 console.log('PASS: complete packaged solo with two mortal NPCs, three keys, vault and crown. Native preview:',frames.length,'frames.');
}finally{await app.close();}
