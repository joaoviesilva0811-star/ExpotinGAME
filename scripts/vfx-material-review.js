// Renderer fixture only. No gameplay state/HP or native input is fabricated.
import {chromium} from 'playwright-core';import {mkdir,writeFile}from'node:fs/promises';import assert from'node:assert/strict';
await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3019');
 const result=await page.evaluate(async()=>{
  const fx=await import('/vfx.js'),volumes=await import('/volumes.js');if(!await volumes.volumeAssetsReady)throw Error('Required effect art unavailable');
  let seed=891;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1000;Object.assign(canvas.style,{position:'fixed',inset:0,zIndex:9999});document.body.append(canvas);const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#141b26';c.fillRect(0,0,1200,1000);c.fillStyle='#efdcb6';c.font='20px monospace';c.fillText('VFX MATERIAL FIXTURE / CONTACT, DEBRIS AND COLD SCARRING',25,32);
  fx.setEffectsQuality('high');fx.setEffectsDensity(1);fx.setRenderBounds(null);const counts={};
  for(const [i,kind]of ['knight','archer','rogue'].entries()){
   fx.resetFX();fx.weaponImpact(200+i*400,220,kind,-.3);counts[kind]=fx.effectsStats().particles;for(let j=0;j<7;j++)fx.stepFX(.012);fx.drawGroundFX(c);fx.drawFX(c);c.fillStyle='#d9caad';c.font='16px monospace';c.fillText(kind.toUpperCase(),135+i*400,95);
  }
  for(const[i,kind]of ['red','green','violet'].entries()){
   fx.resetFX();const h={x:200+i*400,y:535,r:100,shape:'circle',id:i+9};fx.hazardImpact(h,kind);for(let j=0;j<17;j++)fx.stepFX(.012);fx.drawGroundFX(c);fx.drawFX(c);c.fillStyle='#d9caad';c.fillText(kind.toUpperCase()+' / ACTIVE',105+i*400,345);
  }
  for(const[i,kind]of ['red','green','violet'].entries()){
   fx.resetFX();fx.hazardImpact({x:200+i*400,y:815,r:105,inner:38,shape:'circle',id:i+20},kind);for(let j=0;j<140;j++)fx.stepFX(.012);fx.drawGroundFX(c);c.fillStyle='#d9caad';c.fillText(kind.toUpperCase()+' / COLD FLOOR',90+i*400,665);
  }
  // Inner safe holes remain transparent in both fresh ground impacts and
  // persistent floor residue; airborne billboards are tested separately.
  const check=document.createElement('canvas');check.width=check.height=500;const q=check.getContext('2d');fx.resetFX();fx.hazardImpact({x:250,y:250,r:130,inner:70,shape:'circle',id:123},'violet');fx.drawGroundFX(q);const fresh=q.getImageData(250,250,1,1).data[3];for(let i=0;i<140;i++)fx.stepFX(.012);q.clearRect(0,0,500,500);fx.drawGroundFX(q);const cold=q.getImageData(250,250,1,1).data[3];
  fx.resetFX();for(let i=0;i<100;i++){fx.impactFX(250,250,'red',true);fx.hazardImpact({x:250,y:250,r:100,shape:'circle',id:i},'green');}const bounded=fx.effectsStats();for(let i=0;i<500;i++)fx.stepFX(.02);const expired=fx.effectsStats();
  for(let i=0;i<225;i++)fx.drawProjectile(q,{id:i,x:10+i%10,y:20,vx:100,vy:50,enemy:false,color:'arrow'},10);const trailLimit=fx.effectsStats().trails;fx.resetFX();
  return{method:'Browser Canvas renderer fixture; not a gameplay screenshot or performance benchmark',counts,freshSafeHoleAlpha:fresh,coldSafeHoleAlpha:cold,bounded,expired,trailLimit};
 });
 assert.deepEqual(result.counts,{knight:67,archer:26,rogue:33});assert.equal(result.freshSafeHoleAlpha,0);assert.equal(result.coldSafeHoleAlpha,0);assert.ok(result.bounded.particles<=result.bounded.budget.particles);assert.ok(result.bounded.contacts<=36&&result.bounded.residues<=8&&result.bounded.fields<=16);assert.equal(result.trailLimit,180);for(const key of ['particles','contacts','residues','smoke','fields'])assert.equal(result.expired[key],0);assert.deepEqual(errors,[]);
 await page.screenshot({path:'artifacts/vfx-material-review.png'});await writeFile('artifacts/vfx-material-review.json',JSON.stringify({...result,errors},null,2));console.log('PASS: material particle counts unchanged, cold/fresh annular safe holes clear, all queues bounded/expired, no browser errors.');
}finally{await browser.close();}
