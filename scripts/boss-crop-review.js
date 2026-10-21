import {chromium} from 'playwright-core';import {writeFile}from'node:fs/promises';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';
const before=JSON.parse(execFileSync('git',['show','v1.11.0:public/assets/strike-frames.json'],{encoding:'utf8',maxBuffer:16*1024*1024}));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage({viewport:{width:1000,height:1020}});await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3019');
 const report=await page.evaluate(async before=>{
  const {strikeAssetsReady,strikeSourceFrame}=await import('/strike-sprites.js'),{drawAnimatedFrame}=await import('/animation-layout.js');await strikeAssetsReady;const after=await(await fetch('/assets/strike-frames.json')).json();
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1020;Object.assign(canvas.style,{position:'fixed',inset:0,zIndex:9999});document.body.append(canvas);const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#101823';c.fillRect(0,0,1000,1020);c.font='18px monospace';c.fillStyle='#eee0b9';c.fillText('BEFORE: neighbouring pose leak',35,35);c.fillText('AFTER: one registered body',545,35);
  const report=[];let line=0;
  for(const [name,index]of [['varkhul-riposte',15],['varkhul-riposte',26],['varkhul-chains',13],['varkhul-chains',21]]){
   const a=before[name],f=a.frames[index],atlas=await new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.src='/assets/'+a.file;});const [sx,sy,sw,sh]=f.rect,[px,py]=f.pivot,sc=a.scale*(f.scale||1),y=90+line*230;
   c.save();c.translate(210,y+180);c.beginPath();for(const[yy,l,r]of f.spans)c.rect((l-px)*sc,(yy-py)*sc,(r-l)*sc,sc+.05);c.clip();c.drawImage(atlas,sx,sy,sw,sh,(sx-px)*sc,(sy-py)*sc,sw*sc,sh*sc);c.restore();
   drawAnimatedFrame(c,strikeSourceFrame(name,index),650,y-30,210,210);c.fillStyle='#c1b997';c.font='13px monospace';c.fillText(name+' / '+index,35,y-15);line++;
  }
  for(const name of ['varkhul-riposte','varkhul-chains']){
   const s=after[name];let leaked=0;for(const f of s.frames)for(const [x,y]of s.bodyMarkers)if((x!==f.bodySeed[0]||y!==f.bodySeed[1])&&f.spans.some(([yy,l,r])=>yy===y&&l<=x&&x<r))leaked++;
   report.push({name,frames:s.frames.length,foreignBodyLeaks:leaked,loaded:s.frames.every((_,i)=>!!strikeSourceFrame(name,i))});
  }
  const fx=await import('/vfx.js');fx.setEffectsQuality('high');const counts={};for(const kind of ['knight','archer','rogue']){fx.resetFX();fx.weaponImpact(600,380,kind,0);counts[kind]=fx.effectsStats().particles;}if(counts.knight<60||counts.archer<24||counts.rogue<30)throw Error('Impact particles not reinforced');fx.resetFX();for(let i=0;i<100;i++)fx.impactFX(600,380,'red',true);if(fx.effectsStats().particles>fx.effectsStats().budget.particles)throw Error('Particle budget exceeded');report.push({particleCounts:counts,bounded:true});return report;
 },before);assert.ok(report.filter(r=>r.name).every(r=>r.foreignBodyLeaks===0&&r.loaded));await page.screenshot({path:'artifacts/boss-crop-before-after.png'});await writeFile('artifacts/boss-crop-review.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
