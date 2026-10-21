import {installCombatDriver} from './combat-driver.js';
// Native gameplay recording via the Chromium screencast stream. No game state
// changes, screenshot time-lapse, health edits or accelerated battle timers.
import {_electron as electron} from 'playwright-core';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve('artifacts/controller-recording-'+Date.now()),framesDir=resolve(root,'frames');await mkdir(framesDir,{recursive:true});
const app=await electron.launch({executablePath:resolve('dist/IronCrown-Linux-x64/iron-crown'),args:['--no-sandbox','--ozone-platform=headless','--disable-gpu'],env:{...process.env,XDG_CONFIG_HOME:resolve(root,'config'),XDG_CACHE_HOME:resolve(root,'cache')},timeout:25000});
try{
 await installCombatDriver(app.context(),{gamepad:true});
 const menu=await app.firstWindow(),errors=[];menu.on('pageerror',e=>errors.push(e.message));await menu.setViewportSize({width:1120,height:820});await menu.waitForTimeout(800);await menu.screenshot({path:'artifacts/pc-01-menu.png'});await menu.locator('#nickname').fill(process.env.PREVIEW_NAME||'Lyra');await menu.locator('[data-class='+(process.env.PREVIEW_CLASS||'archer')+']').click();
 const next=menu.waitForURL(/^http:/);await menu.locator('#solo').click();await next;const page=menu;await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'Estou pronto'}).click();
 await page.screenshot({path:'artifacts/pc-02-solo.png'});
 const cdp=await app.context().newCDPSession(page);const frames=[],writes=[];
 cdp.on('Page.screencastFrame',event=>{cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});if(frames.length>6000)return;const file=resolve(framesDir,String(frames.length).padStart(5,'0')+'.jpg');frames.push({file,time:event.metadata.timestamp});writes.push(writeFile(file,Buffer.from(event.data,'base64')));});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1440,maxHeight:960,everyNthFrame:1});
 await page.getByRole('button',{name:'Iniciar expedição'}).click();await page.waitForTimeout(1600);await page.screenshot({path:'artifacts/pc-08-chegada.png'});await page.waitForTimeout(9000);await page.screenshot({path:'artifacts/pc-06-dialogo.png'});
 await page.waitForFunction(()=>window.__room?.state==='battle',null,{timeout:25000});await page.evaluate(()=>{window.__driverPauseUntil=Date.now()+4200;window.__driverEmoteUntil=Date.now()+250;});await page.waitForTimeout(1300);await page.screenshot({path:'artifacts/18-preview-emote.png'});await page.waitForTimeout(3000);await page.waitForTimeout(18000);await page.screenshot({path:'artifacts/16-controller-combat.png'});await page.waitForTimeout(27000);
 await cdp.send('Page.stopScreencast');await Promise.all(writes);if(frames.length<40)throw new Error('Screencast did not deliver enough frames');
 for(const name of ['pc-01-menu','pc-02-solo']){const encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',resolve('artifacts/'+name+'.png'),'-vf','scale=1440:960:force_original_aspect_ratio=decrease,pad=1440:960:(ow-iw)/2:(oh-ih)/2','-frames:v','1','-q:v','2',resolve(root,name+'.jpg')],{encoding:'utf8'});if(encoded.status!==0)throw new Error(encoded.stderr);}
 const timeline=[`file '${resolve(root,'pc-01-menu.jpg')}'\nduration 2.5`,`file '${resolve(root,'pc-02-solo.jpg')}'\nduration 1.5`];
 for(let i=0;i<frames.length-1;i++){const delta=Math.max(.015,Math.min(3,frames[i+1].time-frames[i].time));timeline.push(`file '${frames[i].file}'\nduration ${delta.toFixed(4)}`);}timeline.push(`file '${frames.at(-1).file}'\nduration 0.1`);
 const list=resolve(root,'frames.txt');await writeFile(list,timeline.join('\n')+'\n');
 const output=resolve('artifacts/previa-controles.mp4');const ff=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-stream_loop','-1','-i',resolve('public/assets/audio/battle-throne.ogg'),'-vf','scale=1440:960:force_original_aspect_ratio=decrease,pad=1440:960:(ow-iw)/2:(oh-ih)/2,fps=60','-c:v','libx264','-threads','2','-preset','veryfast','-crf','20','-maxrate','8M','-bufsize','16M','-c:a','aac','-b:a','128k','-shortest','-pix_fmt','yuv420p','-movflags','+faststart',output],{encoding:'utf8'});if(ff.status!==0)throw new Error(ff.stderr);
 if(errors.length)throw Error('Preview runtime errors: '+errors.join('; '));console.log('Native preview recorded:',frames.length,'streamed frames,',Math.round(frames.at(-1).time-frames[0].time),'seconds.');
}finally{await app.close();}
