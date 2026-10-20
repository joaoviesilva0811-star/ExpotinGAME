import test from 'node:test';import assert from 'node:assert/strict';
import {updateVelocity,moveEntity,LocalMotion,PositionTrack,cameraFocus} from '../public/motion.js';
import {bossPose,actorMotion,walkFacing} from '../public/animation-timing.js';
import {FrameMonitor,cleanSettings,QUALITY} from '../public/presentation.js';
import {HurtCamera} from '../public/hurt-camera.js';
import {rescueAssignments} from '../server/bots.js';
import {Room} from '../server/engine.js';
test('movement accelerates and stops consistently across render rates, without a class speed increase',()=>{
 const results=[];for(const hz of [30,60,144]){const p={vx:0,vy:0};for(let i=0;i<hz;i++)updateVelocity(p,{x:1,y:1},140,1/hz);assert.ok(Math.hypot(p.vx,p.vy)<=140.0001);for(let i=0;i<hz/5;i++)updateVelocity(p,{x:0,y:0},140,1/hz);results.push(Math.hypot(p.vx,p.vy));}assert.ok(Math.max(...results)<.5);
});
test('local prediction responds before the next packet, respects walls, root and stale connections',()=>{
 const m=new LocalMotion(),s={x:250,y:250,vx:0,vy:0,hp:100,classId:'archer',rootUntil:0,dodgeUntil:0};m.accept(s,1,.1);
 const p=m.step({x:1,y:0},1.016,.016,5,[],null);assert.ok(p.x>250);assert.equal(p.hp,100);
 const solid={x:280,y:250,r:20};for(let i=1;i<10;i++)m.step({x:1,y:0},1+i*.016,.016,5,[solid],null);assert.ok(Math.hypot(m.p.x-solid.x,m.p.y-solid.y)>=37-.001);
 m.accept({...s,rootUntil:20},2,.1);const before=m.p.x;m.step({x:1,y:0},2.016,.016,5,[],null);assert.ok(m.p.vx<20);m.step({x:1,y:0},3,.016,5,[],null);assert.equal(m.p.x,s.x);
});
test('remote movement interpolates snapshot positions and extrapolation is bounded',()=>{
 const track=new PositionTrack();track.push({x:0,y:0,vx:100,vy:0},0);track.push({x:10,y:0,vx:100,vy:0},.1);assert.equal(track.sample(.05,{}).x,5);assert.equal(track.sample(1,{}).x,18);track.push({x:500,y:500},2);assert.equal(track.sample(2,{}).x,500);
});
test('boss chase advances all twelve poses and idle/recovery are not forced into one directional pose',()=>{
 const poses=new Set();for(let i=0;i<12;i++)poses.add(Math.floor(bossPose({state:'chase'},i/12,0,i/12).position));assert.equal(poses.size,12);assert.equal(bossPose({state:'idle'},.3,0).mode,'base');assert.equal(bossPose({state:'recover',startedAt:0,until:2},.5,1).mode,'recover');assert.notEqual(actorMotion({state:'windup',startedAt:0,until:2,facing:0},0,.1,true).sy,actorMotion({state:'windup',startedAt:0,until:2,facing:0},0,1,true).sy);assert.equal(walkFacing(Math.PI).flip,true);
});
test('hurt camera gives a directional impulse, decays, and can be disabled',()=>{
 const c=new HurtCamera();c.hit(0,25);const a=c.step(.025,1);assert.ok(a.x>0&&Math.abs(a.y)<.001);assert.equal(c.step(.01,0).x,0);for(let i=0;i<100;i++)c.step(.016,1);assert.equal(c.step(.016,1).x,0);
});
test('quality presets bound particles while performance values come from measured frames',()=>{
 assert.ok(QUALITY.low.particles<QUALITY.medium.particles&&QUALITY.medium.particles<QUALITY.high.particles);assert.equal(cleanSettings({quality:'invalid',shake:20}).shake,1);const m=new FrameMonitor();for(let i=0;i<61;i++)m.record(1000/60,4);assert.ok(Math.abs(m.report.fps-60)<.01);assert.equal(m.report.cpu,4);assert.ok(cameraFocus({x:100,y:100,vx:100,vy:0},{x:300,y:100}).x>100);
});
test('rescue assignment gives one rescuer per ally and rejects imminent danger at the casualty',()=>{
 const down={id:'down',x:300,y:300,hp:0,downAt:1,eliminated:false};const a={id:'a',x:320,y:300,hp:100,maxHp:100,connected:true,isBot:true},b={...a,id:'b',x:360};assert.equal(rescueAssignments([down,a,b],[],2).get('down'),'a');assert.equal(rescueAssignments([down,a,b],[{x:300,y:300,r:100,at:2.1}],2).size,0);
});
function battle(){const r=new Room('IRON-KEYS22','a','Keys',false,true);r.add('a','Hero').ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);return r;}
test('boss keys spawn on victory, are collected by real server proximity and cannot be forged',()=>{
 const r=battle(),p=r.players.get('a');r.command('a',{type:'keyPickup',round:2,seq:1});assert.equal(r.keys.length,0);r.hitBoss(p,99999);assert.equal(r.keyDrop.round,0);assert.equal(r.keys.length,0);for(let i=0;i<100&&!r.keys.length;i++)r.tick(.05);assert.equal(r.keys.length,1);assert.equal(r.gateUnlocked,true);assert.ok(r.events.some(e=>e.type==='keyPickup'));const count=r.keys.length;for(let i=0;i<20;i++)r.tick(.05);assert.equal(r.keys.length,count);
 const lost=battle();lost.endRound(false,'Tempo');assert.equal(lost.keyDrop,null);assert.equal(lost.keys.length,0);
});
test('three actually earned keys unlock the secret vault; a partial victory cannot open it',()=>{
 const r=battle(),p=r.players.get('a');for(let round=0;round<3;round++){r.hitBoss(p,99999);for(let i=0;i<100&&!r.keys.some(k=>k.round===round);i++)r.tick(.05);if(round<2){r.tick(r.transitionAt-r.now+.01);r.tick(r.transitionAt-r.now+.01);}}
 assert.equal(r.secretUnlocked,true);assert.equal(r.keys.length,3);r.tick(Math.max(0,r.endingAt+5.1-r.now));assert.ok(r.vaultOpenedAt);assert.ok(r.snapshot().secretUnlocked);const count=r.events.filter(e=>e.type==='secretGate').length;r.tick(.1);assert.equal(r.events.filter(e=>e.type==='secretGate').length,count);
 const partial=battle();partial.round=2;partial.wins=2;partial.hitBoss(partial.players.get('a'),99999);for(let i=0;i<100;i++)partial.tick(.05);assert.equal(partial.secretUnlocked,false);assert.equal(partial.vaultOpenedAt,null);
});
test('a disconnect during key collection cannot skip the locked passage, and a new expedition clears all keys',()=>{
 const r=battle(),p=r.players.get('a');r.hitBoss(p,99999);for(const member of r.players.values())member.connected=false;
 r.tick(12);assert.equal(r.state,'round_end');assert.equal(r.keys.length,0);assert.equal(r.gateUnlocked,false);
 for(const member of r.players.values())member.connected=true;for(let i=0;i<100&&!r.keys.length;i++)r.tick(.05);assert.equal(r.keys.length,1);assert.equal(r.gateUnlocked,true);
 r.state='finished';r.restartLobby('a');assert.deepEqual(r.keys,[]);assert.equal(r.keyDrop,null);assert.equal(r.secretUnlocked,false);assert.equal(r.vaultOpenedAt,null);
});
test('reconnecting late for the last key preserves time for the full secret ending',()=>{
 const r=battle(),p=r.players.get('a');for(let round=0;round<2;round++){r.hitBoss(p,99999);for(let i=0;i<100&&!r.keys.some(k=>k.round===round);i++)r.tick(.05);r.tick(r.transitionAt-r.now+.01);r.tick(r.transitionAt-r.now+.01);}
 r.hitBoss(p,99999);for(const member of r.players.values())member.connected=false;r.tick(30);assert.equal(r.state,'ending');assert.equal(r.secretUnlocked,false);
 for(const member of r.players.values())member.connected=true;for(let i=0;i<100&&!r.secretUnlocked;i++)r.tick(.05);assert.equal(r.secretUnlocked,true);assert.ok(r.transitionAt-r.now>=18);assert.ok(r.keySceneUntil>r.now);assert.equal(r.vaultOpenedAt,null);r.tick(r.endingAt+5.1-r.now);assert.ok(r.vaultOpenedAt);assert.equal(r.state,'ending');r.tick(r.transitionAt-r.now+.1);assert.equal(r.state,'finished');
});
