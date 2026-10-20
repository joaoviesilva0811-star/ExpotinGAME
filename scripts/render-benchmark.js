// Deterministic presentation stress benchmark. It does not simulate a match
// or modify authoritative game state; real gameplay is tested separately.
import {chromium} from 'playwright-core';import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:760}});await page.route('**/app.js',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3012');
 const cdp=await page.context().newCDPSession(page);if(process.env.BENCH_PROFILE){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
 const result=await page.evaluate(async()=>{
  const art=await import('/art.js'),anim=await import('/animation.js'),fx=await import('/vfx.js'),light=await import('/lighting.js'),vol=await import('/volumes.js'),strikes=await import('/strike-sprites.js');const {AdaptiveEffects}=await import('/effect-budget.js');await vol.volumeAssetsReady;await strikes.strikeAssetsReady;await new Promise(r=>setTimeout(r,1800));
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=760;Object.assign(canvas.style,{position:'fixed',inset:0,zIndex:1000,width:'1200px',height:'760px'});document.body.append(canvas);const c=canvas.getContext('2d',{alpha:false});c.imageSmoothingEnabled=false;
  let seed=12345;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const results=[];
  for(const scenario of ['regular','storm','storm-low']){
   fx.resetFX();anim.resetAnimationState();fx.setEffectsQuality(scenario==='storm-low'?'low':'high');light.resetLighting();light.configureLighting(true,scenario==='storm-low'?'low':'high');
   const surface=new AdaptiveEffects();surface.configure(scenario==='storm-low'?'low':'high');const samples=[],cpu=[],calls={drawImage:0,stroke:0,fill:0,save:0};let n=0,last=performance.now(),started=last,lastBurst=-10;const originals={};for(const name of Object.keys(calls)){originals[name]=c[name].bind(c);c[name]=(...args)=>{calls[name]++;return originals[name](...args);};}
   await new Promise(resolve=>{function frame(t){const interval=t-last;last=t;const time=(t-started)/1000,dt=Math.min(.05,interval/1000),begin=performance.now();
    if(time-lastBurst>(scenario==='regular'?1.3:.8)){lastBurst=time;fx.hazardImpact({x:540,y:440,r:scenario==='regular'?140:300},'red');if(scenario!=='regular'){fx.hazardImpact({x:810,y:410,r:260,inner:135},'green');fx.hazardImpact({x:450,y:390,r:300,shape:'cone',angle:.6,spread:.9},'violet');}for(let i=0;i<14;i++)fx.impactFX(150+i*55,300+(i%3)*90,'gold',true);light.emitLight(540,440,'#ec6c75',280,.5,.5);}
    fx.stepFX(dt);light.stepLighting(dt,0,time);c.clearRect(0,0,1200,760);c.drawImage(art.terrain(0),0,0);light.drawGroundLighting(c,0);fx.drawGroundFX(c);
    for(let i=0;i<4;i++)art.drawPlayer(c,{id:'hero'+i,x:320+i*130,y:510,classId:['knight','archer','rogue','knight'][i],hp:100,vx:50,vy:0,facing:i*.8,attackAt:Math.floor(time/.8)*.8,attackFor:.62,attackSlot:i-1,lastHurt:Math.floor(time/2)*2},time,{now:time});
    art.drawBoss(c,{id:'boss',x:650,y:340,hp:1000,phase:2,facing:1.2,state:'execute',startedAt:Math.floor(time),until:Math.floor(time)+1,executeFor:1,hurtAt:Math.floor(time*3)/3},0,time,time);
    for(let i=0;i<10;i++)anim.drawMinion(c,{id:'minion'+i,x:170+i*95,y:570+(i%2)*40,kind:['revenant','thornling','acolyte'][i%3],round:i%3,hp:100,maxHp:100,state:'chase',vx:60,vy:0,facing:1,hurtAt:-10,activeAt:0,animAt:0},time,time);
    for(let i=0;i<24;i++)fx.drawProjectile(c,{id:'bolt'+i,x:100+i*43,y:190+Math.sin(time+i)*80,vx:180,vy:60,enemy:true,color:i%2?'void':'seed'},time);
    light.drawLightSpill(c);surface.record(interval/1000,fx.effectsStats().fields>0);fx.setEffectsDensity(surface.scale);fx.drawFX(c);if(n>=35){samples.push(interval);cpu.push(performance.now()-begin);}n++;if(samples.length>=180||time>16)resolve();else requestAnimationFrame(frame);
   }requestAnimationFrame(frame);});for(const name of Object.keys(calls))c[name]=originals[name];
   const sorted=[...samples].sort((a,b)=>a-b),sortedCPU=[...cpu].sort((a,b)=>a-b);results.push({scenario,frames:samples.length,fps:1000*samples.length/samples.reduce((a,b)=>a+b,0),p95:sorted[Math.floor(sorted.length*.95)],cpuMedian:sortedCPU[Math.floor(cpu.length*.5)],cpuP95:sortedCPU[Math.floor(cpu.length*.95)],callsPerFrame:Object.fromEntries(Object.entries(calls).map(([k,v])=>[k,Math.round(v/n)])),effects:fx.effectsStats(),...surface.stats()});
  }return{canvas:[1200,760],results,userAgent:navigator.userAgent};
 });if(process.env.BENCH_PROFILE){const {profile}=await cdp.send('Profiler.stop');await writeFile('artifacts/renderer-'+(process.env.BENCH_LABEL||'before')+'.cpuprofile',JSON.stringify(profile));}
 await writeFile('artifacts/render-'+(process.env.BENCH_LABEL||'before')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.results.map(({scenario,fps,p95,cpuMedian,callsPerFrame})=>({scenario,fps,p95,cpuMedian,callsPerFrame})),null,2));
}finally{await browser.close();}
