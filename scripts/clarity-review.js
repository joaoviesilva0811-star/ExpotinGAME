// Real browser caches, complete source silhouettes and crisp (unmixed) poses.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:3015');
 const report=await page.evaluate(async()=>{
  const m=await import('/motion-sprites.js'),s=await import('/strike-sprites.js'),a=await import('/animation-layout.js'),v=await import('/volumes.js');
  await Promise.all([m.motionSpritesReady,s.strikeAssetsReady,v.volumeAssetsReady]);
  const metadata=await(await fetch('/assets/motion-frames.json')).json(),failures=[],groups=[];
  const probe=document.createElement('canvas');probe.width=probe.height=512;const p=probe.getContext('2d');p.imageSmoothingEnabled=false;
  function hash(image){const c=image.getContext('2d'),data=c.getImageData(0,0,image.width,image.height).data;let h=0,count=0,edge=0;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*4;h=(h*31+data[i]+data[i+1]*3+data[i+2]*7+data[i+3])|0;if(data[i+3]>65){count++;if(x<2||y<2||x>=image.width-2||y>=image.height-2)edge++;}}if(edge||count<8)failures.push({edge,count});return h;}
  let usable=0;
  for(const[name,spec]of Object.entries(metadata))for(const[group,indices]of Object.entries(spec.groups)){
   const hashes=indices.map(i=>{if(spec.frames[i].sourceEdge)failures.push({name,group,i,sourceEdge:true});usable++;return hash(m.motionFrame(name,i));});
   groups.push({name,group,count:indices.length,unique:new Set(hashes).size});
  }
  const layout=await(await fetch('/assets/strike-frames.json')).json();let directionalPoses=0;
  for(const[name,spec]of Object.entries(layout))for(let d=0;d<8;d++)for(let i=0;i<spec.cols;i++){
   const pose=s.strikeFrame({clip:name,direction:d,progress:i/(spec.cols-1)});if(!pose)throw Error('Missing directional attack '+name+d+i);hash(pose.image);directionalPoses++;
  }
  let fxPoses=0;const diagnostics=v.volumeFrameDiagnostics();
  for(const f of diagnostics){p.clearRect(0,0,512,512);if(!v.drawVolume(p,'red',256,320,110,(f.col+.1)/diagnostics.filter(d=>d.model===f.model).length,1,false,f.model))throw Error('Missing effect '+f.model);hash(probe);fxPoses++;}
  // Compare exact pixels against the selected source, rather than rewarding
  // artificial crossfades as new drawings.
  const pose=s.strikeFrame({clip:'knight-cleave',direction:6,progress:.37});p.clearRect(0,0,512,512);a.drawPose(p,'qa',pose,100,100,100,92,0);const actual=hash(probe);p.clearRect(0,0,512,512);a.drawAnimatedFrame(p,pose.mix>=.5?pose.next:pose.image,100,100,100,92);const expected=hash(probe);
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1900;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#101823';c.fillRect(0,0,1280,1900);c.font='18px monospace';
  const selected=Object.entries(metadata).flatMap(([name,spec])=>Object.keys(spec.groups).filter(g=>g==='wake'||g==='step'||g==='south').map(group=>({name,group,spec})));
  selected.forEach(({name,group,spec},row)=>{c.fillStyle='#e4c899';c.fillText(name+' / '+group,16,30+row*200);for(let i=0;i<8;i++){const image=m.motionGroupFrame(name,group,i/8),hero=name.startsWith('express');a.drawAnimatedFrame(c,image,25+i*156,50+row*200,hero?100:155,hero?92:155);}});
  Object.assign(canvas.style,{position:'fixed',inset:0,zIndex:1000});document.body.append(canvas);
  return{usableMotionPoses:usable,groups,strikes:s.strikeDiagnostics(),directionalPoses,fxPoses,effectModels:new Set(diagnostics.map(d=>d.model)).size,exactSourcePixels:actual===expected,failures,cache:a.poseCacheStats()};
 });
 assert.equal(report.usableMotionPoses,532);assert.equal(report.strikes.total,1994);assert.equal(report.fxPoses,145);assert.equal(report.effectModels,21);assert.ok(report.groups.every(g=>g.unique===g.count));assert.equal(report.exactSourcePixels,true);assert.deepEqual(report.failures,[]);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:1280,height:1900});await page.screenshot({path:'artifacts/18-motion-contact.png'});
 await writeFile('artifacts/clarity-review.json',JSON.stringify({...report,errors},null,2));console.log('PASS: complete distinct motion poses, eight attack directions, 21 effects, no clipping or whole-body crossfades.');
}finally{await browser.close();}
