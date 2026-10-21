import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:2280}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3019');
 const report=await page.evaluate(async()=>{
  const t=await import('/transition-sprites.js'),p=await import('/portraits.js'),a=await import('/animation-layout.js'),art=await import('/art.js'),scenes=await import('/scenes.js'),arena=await import('/arena-art.js'),{makeCovers}=await import('/arena-state.js');
  await Promise.all([t.transitionAssetsReady,p.portraitAssetsReady,scenes.sceneAssetsReady,(await import('/animation.js')).animationAssetsReady]);arena.prewarmArenaArt();
  const spec=await(await fetch('/assets/transition-frames.json')).json(),failures=[],groups=[];let poses=0;
  function inspect(image,name){const data=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let h=0,count=0,edge=0;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*4;h=(h*31+data[i]*3+data[i+1]*5+data[i+2]*7+data[i+3])|0;if(data[i+3]>65){count++;if(x<2||y<2||x>=image.width-2||y>=image.height-2)edge++;}}if(count<20||edge)failures.push({name,count,edge});return h;}
  for(const[name,s]of Object.entries(spec)){for(let i=0;i<s.frames.length;i++){assertEdge(s.frames[i]);inspect(t.transitionSourceFrame(name,i),name+i);poses++;}for(const[group,indices]of Object.entries(s.groups))groups.push({name,group,count:indices.length,unique:new Set(indices.map(i=>inspect(t.transitionSourceFrame(name,i),name+i))).size});}
  function assertEdge(frame){if(frame.sourceEdge)failures.push({sourceEdge:frame.sourceIndex});}
  for(const name of ['knight','archer','rogue','varkhul','tharazul','azrakiel']){const image=document.createElement('canvas');image.width=image.height=160;p.paintPortrait(image,name);inspect(image,'portrait-'+name);}
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=2280;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  for(let round=0;round<3;round++){c.save();c.translate(0,round*760);c.drawImage(art.terrain(round),0,0,1200,760);const room={round,covers:makeCovers(round)};room.covers[1].hp=40;room.covers[2].hp=0;arena.drawArenaGround(c,room,6);for(const cover of room.covers)arena.drawCover(c,cover,round,6);arena.drawBossPresence(c,{x:820,y:380,hp:100,phase:3,state:'recover',exposedUntil:7},round,6,6);arena.drawArenaForeground(c,round,6);c.fillStyle='#e9d6a2';c.font='18px monospace';c.fillText('REVISÃO DE ARTE · COBERTURA INTACTA / RACHADA / DESTRUÍDA · ARENA '+(round+1),35,45);c.restore();}
  Object.assign(canvas.style,{position:'fixed',inset:0,zIndex:1000});document.body.append(canvas);
  return{poses,portraits:6,groups,failures,diagnostics:t.transitionDiagnostics()};
 });
 assert.equal(report.poses,159);assert.deepEqual(report.failures,[]);assert.ok(report.groups.every(g=>g.unique===g.count));assert.deepEqual(errors,[]);await page.screenshot({path:'artifacts/19-arena-art-review.png'});await writeFile('artifacts/arena-art19-review.json',JSON.stringify({...report,errors},null,2));console.log('PASS: 159 complete unique transition poses, six complete portraits and all three cached arena layers.');
}finally{await browser.close();}
