import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:2520}});await page.goto(process.env.TEST_URL||'http://127.0.0.1:3006');
 const result=await page.evaluate(async()=>{
  const {volumeAssetsReady,volumeFrameDiagnostics,drawVolume}=await import('/volumes.js'),fx=await import('/vfx.js');if(!await volumeAssetsReady)throw new Error('Missing effect atlas');
  const diagnostics=volumeFrameDiagnostics(),failures=[];let poses=0;
  const names=[...new Set(diagnostics.map(d=>d.model))],{baseEffect}=await import('/effect-variants.js');
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=names.length*280;const c=canvas.getContext('2d');c.fillStyle='#111922';c.fillRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  const probe=document.createElement('canvas');probe.width=probe.height=1024;const p=probe.getContext('2d');
  for(const [row,name]of names.entries())for(let col=0;col<diagnostics.filter(d=>d.model===name).length;col++){
   const progress=(col+.1)/diagnostics.filter(d=>d.model===name).length,flat=['steelSweep','stoneWave','voidSweep'].includes(baseEffect(name));
   for(let dir=0;dir<8;dir++){
    p.clearRect(0,0,1024,1024);if(!drawVolume(p,'red',512,flat?512:700,180,progress,1,false,name,dir*Math.PI/4))throw new Error('Missing pose '+name+col);
    const data=p.getImageData(0,0,1024,1024).data;let count=0,edge=0;
    for(let y=0;y<1024;y++)for(let x=0;x<1024;x++)if(data[(y*1024+x)*4+3]>16){count++;if(x<8||y<8||x>=1016||y>=1016)edge++;}
    if(count<10||edge)failures.push({name,col,dir,count,edge});poses++;
   }
   const x=col*240,y=row*280;c.fillStyle='#192631';c.fillRect(x+8,y+8,224,264);c.strokeStyle='#3b4a54';c.lineWidth=1;c.strokeRect(x+15,y+45,210,208);
   c.fillStyle='#d4bf91';c.font='17px Pixelify';c.fillText(name+' · '+(col+1),x+18,y+33);drawVolume(c,'red',x+120,y+(flat?155:242),125,progress,1,false,name);
  }
  // Isolated sprites are not cookie-cut by the annular ground hitbox.
  fx.resetFX();fx.hazardImpact({x:512,y:700,r:250,inner:140},'green');fx.stepFX(.36);let airClips=0;const native=p.clip.bind(p);p.clip=(...args)=>{airClips++;native(...args);};fx.drawFX(p);
  Object.assign(canvas.style,{position:'fixed',inset:0,width:'100vw',height:'100vh',zIndex:100});document.body.append(canvas);return{diagnostics,failures,poses,airClips};
 });
 assert.equal(result.diagnostics.length,145);assert.deepEqual(result.diagnostics.filter(d=>d.sourceEdgeMax>4||d.bounds.right<d.bounds.left),[],'Frames must have transparent gutters and contain artwork');assert.deepEqual(result.failures,[]);assert.equal(result.poses,1160);assert.equal(result.airClips,0,'Airborne annular effects must keep their complete silhouettes');
 await page.screenshot({path:'artifacts/141-all-effect-frames.png'});console.log('PASS: all 145 source frames retain their silhouettes; 1,160 directional effects stay complete; annular air effects are unmasked.');
}finally{await browser.close();}
