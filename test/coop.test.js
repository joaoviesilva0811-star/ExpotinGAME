import test from 'node:test';import assert from 'node:assert/strict';
import {GamepadHub,radialStick,controllerKind,padLabels} from '../public/gamepads.js';
import {recordCombo,expireCombo,comboState} from '../server/combos.js';
import {Room} from '../server/engine.js';
import {updateVelocity} from '../public/motion.js';
const pad=(index,id='Xbox 045e',buttons=[],axes=[0,0,0,0])=>({index,id,connected:true,mapping:'standard',axes,buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))});
test('three controllers have independent analog aim, button edges and disconnect stops',()=>{
 const h=new GamepadHub();h.poll([pad(0,'Xbox 045e',[0]),pad(1,'DualSense 054c',[0]),pad(2,'Xbox',[0]),pad(3,'Extra',[0])]);assert.equal(h.seats.length,3);assert.equal(h.locked,true);
 h.poll([pad(0),pad(1,'DualSense 054c'),pad(2,'Xbox')]);const frames=h.poll([pad(0,'Xbox 045e',[2],[1,0,0,-1]),pad(1,'DualSense 054c',[4],[0,.6,-1,0]),pad(2,'Xbox',[7])]);assert.equal(frames.length,3);assert.equal(h.intent(0).attack,true);assert.equal(h.intent(1).block,true);assert.equal(h.intent(1).ax,-1);assert.ok(h.intent(1).y>0&&h.intent(1).y<1);assert.equal(h.intent(0).ay,-1);assert.ok(frames[2].pressed.has(7));
 assert.equal(h.poll([pad(0,'Xbox 045e',[2]),pad(1,'DualSense 054c',[4]),pad(2,'Xbox',[7])])[2].pressed.has(7),false);
 h.poll([pad(0)]);assert.equal(h.intent(1).y,0);assert.equal(h.intent(1).block,false);h.poll([]);assert.equal(h.locked,false);assert.equal(h.intent(0).attack,false);h.poll([pad(6,'Replacement DualSense',[0])]);assert.equal(h.seats.length,3);assert.equal(h.seats[0].index,6);assert.equal(h.seats[0].kind,'ps');assert.equal(h.locked,true);
});
test('deadzone removes drift and analog speed retains full keyboard diagonal limits',()=>{
 assert.deepEqual(radialStick(.08,-.04),{x:0,y:0});assert.ok(Math.abs(radialStick(1,1).x-Math.SQRT1_2)<1e-8);const p={vx:0,vy:0};for(let i=0;i<60;i++)updateVelocity(p,{x:.5,y:0},140,1/60);assert.ok(Math.abs(p.vx-70)<.01);
 assert.equal(controllerKind('DualSense Wireless Controller (054c)'),'ps');assert.equal(controllerKind('Xbox 360 045e'),'xbox');assert.equal(padLabels('ps').dash,'×');assert.equal(padLabels('xbox').attack,'X');
});
test('combos count actual positive damage with bounded simultaneous hits and timeout',()=>{
 const p={combo:comboState(),stats:{},roundStats:{}};recordCombo(p,0,0);recordCombo(p,-50,0);assert.equal(p.combo.count,0);for(let i=0;i<20;i++){recordCombo(p,30,i*.3);recordCombo(p,1,i*.3);}assert.equal(p.combo.count,20);assert.equal(p.combo.multiplier,1.75);assert.ok(p.stats.comboPoints>0);assert.equal(p.stats.maxCombo,20);expireCombo(p,10);assert.equal(p.combo.count,0);assert.equal(p.stats.maxCombo,20);
});
test('server rejects forged combo commands, real damage breaks chains, dodge avoids breaking',()=>{
 const r=new Room('IRON-COMBO','a','Combo');const p=r.add('a','Hero');p.ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);r.command('a',{type:'combo',seq:1,count:999,score:9999});assert.equal(p.combo.count,0);r.hitBoss(p,20);assert.equal(p.combo.count,1);p.dodgeUntil=r.now+1;r.hurt(p,25);assert.equal(p.combo.count,1);p.dodgeUntil=0;r.hurt(p,25);assert.equal(p.combo.count,0);assert.equal(r.snapshot().players[0].stats.maxCombo,1);
});
test('a boss key remains visible before collection and has a full post-pickup presentation',()=>{
 const r=new Room('IRON-KEYLONG','a','Key');const p=r.add('a','Hero');p.ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);r.hitBoss(p,99999);const born=r.now;assert.ok(r.keySceneUntil-born>=8.5);r.tick(2.4);assert.equal(r.keys.length,0);for(let i=0;i<100&&!r.keys.length;i++)r.tick(.05);assert.equal(r.keys.length,1);assert.ok(r.keyDrop.collectedAt-born>=2.5);assert.ok(r.keySceneUntil-r.keyDrop.collectedAt>=4.5);assert.ok(r.outroStarted+6>=r.keySceneUntil);
});
