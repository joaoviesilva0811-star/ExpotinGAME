import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3013');
 const result=await page.evaluate(async()=>{const s=await import('/strike-sprites.js'),w=await import('/motion-sprites.js'),a=await import('/animation-layout.js');await s.strikeAssetsReady;await w.motionSpritesReady;const canvas=document.createElement('canvas');canvas.width=canvas.height=300;const c=canvas.getContext('2d'),report=[];
 function hash(){const data=c.getImageData(0,0,300,300).data;let h=0;for(let i=0;i<data.length;i+=4)h=(h*31+data[i]+data[i+1]*3+data[i+2]*7+data[i+3])|0;return h;}
 for(const actor of ['knight','archer','rogue','revenant','thornling','acolyte']){const seen=new Set();for(let i=0;i<60;i++){c.clearRect(0,0,300,300);a.drawPose(c,actor,s.strikeFrame({clip:actor+'-walk',direction:0,progress:i/60,loop:true}),100,100,100,92,i/60);seen.add(hash());}report.push({actor,unique:seen.size});}
 for(const actor of ['varkhul','tharazul','azrakiel']){const seen=new Set();for(let i=0;i<60;i++){c.clearRect(0,0,300,300);a.drawPose(c,actor,{image:w.motionGroupFrame('gait-'+actor,'south',i/60)},40,40,210,210,i/60);seen.add(hash());}report.push({actor,unique:seen.size});}
 // Populate all directions; the texture cache must stay bounded.
 for(const actor of ['knight','archer','rogue','revenant','thornling','acolyte'])for(let d=0;d<8;d++)for(let i=0;i<32;i++)a.drawPose(c,'budget',s.strikeFrame({clip:actor+'-walk',direction:d,progress:i/32,loop:true}),100,100,100,92,i/60);
 return{report,cache:a.poseCacheStats()};});assert.ok(result.report.slice(0,6).every(r=>r.unique>=7&&r.unique<=8));assert.ok(result.report.slice(6).every(r=>r.unique>=16&&r.unique<=24));assert.ok(result.cache.bytes<=result.cache.limit);await writeFile('artifacts/walk-smoothing-review.json',JSON.stringify(result,null,2));console.log('PASS: sharp walk source poses remain distinct for all nine actors; bosses use 16–24 real poses per cycle without ghost images.',JSON.stringify(result));
}finally{await browser.close();}
