// Inspect every original pose in the actual runtime cache, then render channel
// and recovery blends. This is an art review, not a fake gameplay recording.
import {chromium} from 'playwright-core';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3014');
 const report=await page.evaluate(async()=>{
  const {rescueSpritesReady,rescueFrame,rescueSourceFrame,rescueDiagnostics}=await import('/rescue-sprites.js'),{drawAnimatedFrame,drawPose}=await import('/animation-layout.js');if(!await rescueSpritesReady)throw Error('Rescue atlas load failed');const spec=await(await fetch('/assets/rescue-frames.json')).json(),rows=[],edge=[];
  function hash(image){const a=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let h=0;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*4;h=(h*31+a[i]+a[i+1]*3+a[i+2]*7+a[i+3])|0;if((x<2||y<2||x>=image.width-2||y>=image.height-2)&&a[i+3]>65)edge.push([x,y]);}return h;}
  const directions=[Math.PI/2,0,-Math.PI/2,Math.PI];
  for(const name of Object.keys(spec))for(let row=0;row<8;row++){
   const hashes=[];for(let col=0;col<8;col++){
    hashes.push(hash(rescueSourceFrame(name,row,col)));
   }
   rows.push({name,row,unique:new Set(hashes).size});
  }
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1050;canvas.id='contact';const c=canvas.getContext('2d');c.fillStyle='#121d24';c.fillRect(0,0,1280,1050);c.imageSmoothingEnabled=false;c.fillStyle='#e2c18c';c.font='20px monospace';c.fillText('IRON CROWN · RESGATE / LEVANTAR · POSES DESENHADAS',24,34);
  for(const [i,name]of Object.keys(spec).entries())for(let mode=0;mode<2;mode++){
   const y=105+i*310+mode*145;c.font='13px monospace';c.fillStyle='#d6c9a9';c.fillText(name+' · '+(mode?'LEVANTAR':'AUXÍLIO'),18,y-40);
   for(let col=0;col<8;col++){
    drawAnimatedFrame(c,rescueSourceFrame(name,mode?4:0,col),70+col*151,y-60,100,92);
   }
  }
  document.body.replaceChildren(canvas);Object.assign(canvas.style,{position:'fixed',inset:0});
  const blended=document.createElement('canvas');blended.width=200;blended.height=200;const b=blended.getContext('2d'),subframes=[];for(let i=0;i<30;i++){b.clearRect(0,0,200,200);drawPose(b,'smooth',rescueFrame({id:'r',classId:'knight',hp:100,facing:0,revivedAt:1,attackAt:-10},1+i/60),50,60,100,92,i/60);subframes.push(hash(blended));}
  return{clips:rescueDiagnostics(),sourceFrames:Object.values(spec).reduce((n,s)=>n+s.frames.length,0),sourceEdge:Object.values(spec).flatMap(s=>s.frames).filter(f=>f.sourceEdge).length,edgeFailures:edge.length,rows,subframes:new Set(subframes).size};
 });
 assert.equal(report.sourceFrames,192);assert.equal(report.sourceEdge,0);assert.equal(report.edgeFailures,0);assert.ok(report.rows.every(row=>row.unique===8));assert.equal(report.subframes,5);assert.deepEqual(errors,[]);await page.screenshot({path:'artifacts/17-rescue-poses.png'});await writeFile('artifacts/rescue-review.json',JSON.stringify({...report,errors},null,2));console.log('PASS:',JSON.stringify(report));
}finally{await browser.close();}
