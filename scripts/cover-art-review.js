import {chromium}from'playwright-core';import {writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:760}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3019');await page.waitForFunction(()=>window.IRON_ASSETS_READY===true,null,{timeout:45000});
 const report=await page.evaluate(async()=>{
  const {drawCover,drawArenaGround}=await import('/arena-art.js'),{terrain}=await import('/art.js'),spec=await(await fetch('/assets/cover-frames.json')).json();
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=760;canvas.style='position:fixed;inset:0;width:1200px;height:760px;z-index:99999';document.body.append(canvas);const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const cases=[];
  for(let round=0;round<3;round++){
   c.save();c.beginPath();c.rect(round*400,0,400,760);c.clip();c.drawImage(terrain(round),400,0,400,760,round*400,0,400,760);c.fillStyle='#060b1466';c.fillRect(round*400,0,400,760);c.translate(round*400,0);c.scale(2,2);
   for(const [i,hp]of[100,40,0].entries()){const p={x:100,y:125+i*115,hp,maxHp:100,hitAt:-10};if(hp)drawCover(c,p,round,3);else drawArenaGround(c,{round,covers:[p]},3,'low');}
   c.restore();c.fillStyle='#f6e0b0';c.font='15px Georgia';c.textAlign='center';c.fillText(['PEDRA · CASTELO','RAÍZES · FLORESTA','CRISTAIS · CATEDRAL'][round],round*400+200,28);
  }
  return{frames:spec.frames,ready:window.IRON_ASSETS_READY,method:'Explicit art fixture: intact, damaged and broken; not a gameplay screenshot'};
 });
 assert.equal(report.frames.length,6);assert.equal(new Set(report.frames.map(f=>f.round+':'+f.broken)).size,6);assert.deepEqual(errors,[]);await page.screenshot({path:'artifacts/20-cover-art-review.png'});await writeFile('artifacts/cover20-review.json',JSON.stringify({...report,errors},null,2));console.log('PASS: six registered cover/rubble drawings, all three cached damage states and asset readiness.');
}finally{await browser.close();}
