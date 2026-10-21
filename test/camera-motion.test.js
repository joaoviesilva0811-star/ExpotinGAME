import test from 'node:test';import assert from 'node:assert/strict';
import {CameraMotion}from'../public/camera-motion.js';import {GateTimeline,gateProgress}from'../public/gate-timing.js';import {heroStrike}from'../public/strike-timing.js';
const actor={hp:100,vx:115,vy:0};
test('walking camera follows travel continuously, eases to rest and can be disabled',()=>{
 const c=new CameraMotion();let last;for(let i=0;i<60;i++)last=c.step(1/60,[actor],1);assert.ok(Math.abs(last.x)+Math.abs(last.y)>.1);assert.ok(last.envelope>.99);assert.equal(c.step(.016,[actor],0).x,0);
 for(let i=0;i<120;i++)last=c.step(1/60,[{...actor,vx:0}],1);assert.ok(last.envelope<.001);assert.ok(Math.abs(last.x)+Math.abs(last.y)<.001);
});
test('walking phase is frame-rate independent and shared-screen motion is attenuated',()=>{
 const a=new CameraMotion(),b=new CameraMotion();let p,q;for(let i=0;i<60;i++)p=a.step(1/60,[actor],1);for(let i=0;i<120;i++)q=b.step(1/120,[actor],1);assert.ok(Math.abs(p.stride-q.stride)<1e-8);assert.ok(Math.abs(p.x-q.x)<1e-8);
 const c=new CameraMotion();let shared;for(let i=0;i<60;i++)shared=c.step(1/60,[actor,{...actor,vx:-115}],1);assert.ok(Math.abs(shared.x)<Math.abs(p.x));
});
test('attack sway has class weight and gate contact is heavier than starting travel, bounded and expiring',()=>{
 const a=new CameraMotion(),b=new CameraMotion();a.attack('knight',0,1);b.attack('archer',0,1);assert.ok(a.step(.025,[],1).x>b.step(.025,[],1).x);
 const start=new CameraMotion(),land=new CameraMotion();start.gate(true,false);land.gate(true,true);assert.ok(land.step(.03,[],1).y>start.step(.03,[],1).y);
 for(let i=0;i<100;i++)land.gate(true,true);assert.equal(land.pulses.length,6);assert.ok(land.step(.03,[],1).y<=18);for(let i=0;i<100;i++)land.step(.02,[],1);assert.equal(land.pulses.length,0);
});
test('gate timeline schedules one start/contact per movement and ignores duplicate or late snapshots',()=>{
 const r={code:'IRON-X',round:0,intro:{started:0,gateAt:3.55},gateUnlocked:false},t=new GateTimeline();t.step(r,3);assert.equal(t.step(r,3.56)[0].id,'close');assert.equal(t.step(r,3.56).length,0);assert.equal(t.step(r,4.41)[0].id,'closed');assert.equal(t.step(r,4.39).length,0);
 r.gateUnlocked=true;r.keyDrop={collectedAt:20};t.step(r,19.8);assert.equal(t.step(r,20.02)[0].id,'open');assert.equal(t.step(r,21.21)[0].id,'opened');assert.equal(t.step(r,21.3).length,0);
 const late=new GateTimeline();assert.equal(late.step(r,30).length,0);r.round=1;r.intro={started:40,gateAt:44};assert.equal(t.step(r,43.5).length,0);assert.equal(t.step(r,44.01)[0].id,'close');
});
test('gates close/open smoothly at the correct endpoints without granting an unlock',()=>{
 const r={intro:{gateAt:3},gateUnlocked:false,keyDrop:{collectedAt:10}};assert.equal(gateProgress(r,2),0);assert.equal(gateProgress(r,3.85),1);assert.ok(gateProgress(r,3.4)>0&&gateProgress(r,3.4)<1);assert.equal(gateProgress(r,12,true),1);r.gateUnlocked=true;assert.equal(gateProgress(r,10,true),1);assert.equal(gateProgress(r,11.2,true),0);
});
test('skill follow-through is monotonic and never jumps back to anticipation halfway through',()=>{
 for(const classId of ['knight','archer','rogue'])for(const attackSlot of [0,1,2]){const p={classId,attackSlot,hp:100,attackAt:1,attackFor:.62,facing:0};let last=.5;for(let i=0;i<100;i++){const v=heroStrike(p,1+i*.006).progress;assert.ok(v>=last&&v<1);last=v;}assert.ok(last>.96);}
});

test('illustrated opening has arena/party/mechanism shots and ends before synchronized dialogue',async()=>{
 const{introFilmShot}=await import('../public/intro-timing.js');const{Room}=await import('../server/engine.js');const r=new Room('IRON-FILM','a','QA'),p=r.add('a','Hero');p.ready=true;r.start('a');const at=r.intro.started;
 assert.equal(introFilmShot(r,at+.5).shot,'arena');assert.equal(introFilmShot(r,at+4).shot,'party');assert.equal(introFilmShot(r,at+8).shot,'gate');assert.equal(introFilmShot(r,at+9.7),null);assert.ok(r.dialogue.every(d=>d.at>=at+9.8));assert.ok(r.intro.awakeningAt>r.intro.dialogueAt);
 r.tick(6);assert.equal(r.remaining,300);assert.equal(r.state,'countdown');r.tick(r.transitionAt-r.now+.01);assert.equal(r.state,'battle');assert.equal(introFilmShot(r,r.now),null);assert.equal(r.remaining,300);
});
