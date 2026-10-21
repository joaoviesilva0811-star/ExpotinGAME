// Renderer-only arena fixture. Does not alter any server or gameplay state.
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3019');
 const initial=await page.evaluate(async()=>{
  const {renderAssetsReady}=await import('/render-ready.js');await renderAssetsReady;
  const art=await import('/art.js'),arena=await import('/arena-art.js'),light=await import('/lighting.js'),{makeCovers}=await import('/arena-state.js');
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;Object.assign(canvas.style,{position:'fixed',inset:0,zIndex:9999,width:'1200px',height:'800px'});document.body.append(canvas);
  window.drawDepthFixture=(round)=>{
   const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#101823';c.fillRect(0,0,1200,800);c.drawImage(art.terrain(round),0,0,1200,760);
   const covers=makeCovers(round);covers[1].hp=covers[1].maxHp*.35;covers[2].hp=0;
   const room={round,covers};light.resetLighting();light.configureLighting(true,'high');light.setLightingDensity(1);light.stepLighting(.016,round,11,[],3);light.drawGroundLighting(c,round);arena.drawArenaGround(c,room,11,'high');
   for(const p of covers)arena.drawCover(c,p,round,11);
   const boss={x:830,y:400,hp:100,phase:3,state:'recover',facing:Math.PI/2,startedAt:10,until:12,exposedUntil:12,attack:0,hurtAt:-10};arena.drawBossPresence(c,boss,round,11,11);art.drawBoss(c,boss,round,11,11);
   for(const [i,classId]of ['knight','archer','rogue'].entries())art.drawPlayer(c,{id:'depth-'+classId,classId,x:160+i*120,y:600,hp:100,vx:0,vy:0,facing:-Math.PI/2,attackAt:-10,lastHurt:-10},11,{now:11});
   light.drawLightSpill(c);arena.drawArenaForeground(c,round,11,'high');c.fillStyle='#ead5b0';c.font='15px monospace';c.fillText('ARENA DEPTH · RENDERER FIXTURE · '+['THRONE','FOREST','CATHEDRAL'][round],20,785);
   return{round,...arena.arenaDepthStats(),...light.lightingStats()};
  };
  return arena.arenaDepthStats();
 });
 const rows=[];for(let round=0;round<3;round++){rows.push(await page.evaluate(r=>window.drawDepthFixture(r),round));await page.screenshot({path:`artifacts/arena-depth-${round+1}.png`});}
 assert.deepEqual(errors,[]);assert.ok(rows.every(r=>r.shadowSources===4&&r.groundPasses===1&&r.shadowTextures===1));
 await writeFile('artifacts/arena-depth-review.json',JSON.stringify({method:'Browser renderer fixture, source artwork and real draw functions; not gameplay',initial,rows,errors},null,2));console.log('PASS: three material arenas, one cached ground pass, four stable shadow lamps, one shared ground-shadow texture, no JS errors.');
}finally{await browser.close();}
