// Runtime cache/art review. Preview fixtures are labelled; no game rules change.
import{chromium}from'playwright-core';import{mkdir,writeFile}from'node:fs/promises';import assert from'node:assert/strict';
await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage({viewport:{width:1280,height:780}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3014');
 const report=await page.evaluate(async()=>{
  const item=await import('/item-art.js');if(!await item.itemSpritesReady)throw Error('Item sprites failed');let edge=0;const rows=[];
  function hash(image){const d=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let h=0;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*4;h=(h*31+d[i]+3*d[i+1]+7*d[i+2]+d[i+3])|0;if((x<2||y<2||x>=image.width-2||y>=image.height-2)&&d[i+3]>65)edge++;}return h;}
  const canvas=document.createElement('canvas');canvas.id='contact';canvas.width=1280;canvas.height=780;const c=canvas.getContext('2d');c.fillStyle='#101b24';c.fillRect(0,0,1280,780);c.imageSmoothingEnabled=false;c.font='20px monospace';c.fillStyle='#e5c997';c.fillText('IRON CROWN · POÇÕES / COROAS · REVISÃO DE ARTE',25,38);
  for(const [row,name]of ['heal','ice','cursed','royal'].entries()){const hashes=[];c.font='14px monospace';c.fillText({heal:'CURA',ice:'GELO',cursed:'COROA DE FERRO',royal:'COROA SECRETA'}[name],25,72+row*164);for(let i=0;i<8;i++){hashes.push(hash(item.itemFrame(name,i/8)));item.drawItemSprite(c,name,85+i*155,147+row*164,112,i/8);}rows.push({name,unique:new Set(hashes).size});}
  document.body.replaceChildren(canvas);Object.assign(canvas.style,{position:'fixed',inset:0});
  return{items:item.itemDiagnostics(),rows,edgeFailures:edge};
 });assert.equal(report.items.reduce((n,i)=>n+i.count,0),32);assert.equal(report.edgeFailures,0);assert.ok(report.rows.every(r=>r.unique===8));assert.deepEqual(errors,[]);await page.screenshot({path:'artifacts/17-potions-crowns.png'});await writeFile('artifacts/item-review.json',JSON.stringify({...report,errors},null,2));console.log('PASS: 32 complete distinct item frames, two readable potions, cursed and restored crowns.');
}finally{await browser.close();}
