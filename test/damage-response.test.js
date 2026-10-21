import test from 'node:test';
import assert from 'node:assert/strict';
import {damageProfile,recoilOffset,HealthMemory,impactShake} from '../public/damage-response.js';
import {HurtCamera} from '../public/hurt-camera.js';
import {Room} from '../server/engine.js';
import {cleanSettings} from '../public/presentation.js';
import {localPartyCamera} from '../public/camera-shots.js';

test('damage severity considers class health; actual guard is lighter, broken guard is heavy',()=>{
 assert.ok(damageProfile(25,100).severity>damageProfile(25,160).severity);
 assert.ok(damageProfile(25,100,{blocked:true}).severity<damageProfile(25,100).severity);
 const broken=damageProfile(25,100,{blocked:true,guardBroken:true});assert.equal(broken.blocked,false);assert.equal(broken.heavy,true);
 assert.equal(damageProfile(1,160,{downed:true}).heavy,true);
});
test('camera spring follows impact direction, has a return stroke and bounded multi-hit amplitude',()=>{
 const c=new HurtCamera();c.hit(Math.PI/2,32);const a=c.step(.025,1);assert.ok(a.y>0);assert.ok(Math.abs(a.x)<1e-8);
 const back=c.step(.095,1);assert.ok(back.y<0);
 for(let i=0;i<40;i++)c.hit(0,80);assert.equal(c.hits.length,4);const burst=c.step(.025,1);assert.ok(Math.abs(burst.x)<=14);assert.equal(c.step(.01,0).x,0);
 c.step(1,1);assert.equal(c.hits.length,0);assert.equal(c.step(.01).flash,0);
});
test('camera time does not depend on render FPS or accept invalid/zero hits',()=>{
 const a=new HurtCamera(),b=new HurtCamera();a.hit(.8,40);b.hit(.8,40);
 for(let i=0;i<6;i++)a.step(1/60,1);for(let i=0;i<12;i++)b.step(1/120,1);
 const x=a.step(0,1),y=b.step(0,1);assert.ok(Math.abs(x.x-y.x)<1e-8);assert.ok(Math.abs(x.flash-y.flash)<1e-8);
 a.reset();a.hit(0,0);a.hit(0,NaN);assert.equal(a.hits.length,0);
});
test('additive actor recoil follows the source, is weaker for guards/bosses and never moves collision state',()=>{
 const p={x:100,y:200,hp:100,lastHurt:1,hurtAngle:Math.PI/2,hurtAmount:25,facing:0},copy={...p},a=recoilOffset(p,1.07);
 assert.ok(Math.abs(a.x)<1e-8&&a.y>0);assert.deepEqual(p,copy);assert.ok(recoilOffset({...p,hurtBlocked:true},1.07).y<a.y);assert.ok(recoilOffset(p,1.07,true).y<a.y);
 assert.deepEqual(recoilOffset(p,1.5),{x:0,y:0});assert.deepEqual(recoilOffset({...p,hp:0},1.07),{x:0,y:0});
});
test('health memory holds damage then decays, heals immediately, isolates players and resets',()=>{
 const m=new HealthMemory();assert.equal(m.sample('a',100,100,1),100);assert.equal(m.sample('a',60,100,1.1),100);assert.equal(m.sample('a',60,100,1.5),100);
 const trail=m.sample('a',60,100,1.7);assert.ok(trail<100&&trail>60);assert.equal(m.sample('b',20,100,1.7),20);assert.equal(m.sample('a',100,100,1.8),100);
 assert.equal(m.sample('a',40,160,1.9),25);m.reset();assert.equal(m.values.size,0);
});
test('server reports actual lost HP, guard break and source direction, separately from protective mitigation',()=>{
 const r=new Room('IRON-FEEL','a','QA'),p=r.add('a','Hero');p.ready=true;r.start('a');r.tick(r.transitionAt+.01);
 p.block=true;r.hurt(p,25,false,{x:p.x,y:p.y-50});let e=r.events.filter(e=>e.type==='hurt').at(-1);assert.equal(e.amount,10);assert.equal(e.blocked,true);assert.equal(e.guardBroken,false);assert.equal(e.angle,Math.PI/2);
 p.block=true;r.hurt(p,25,true,{x:p.x-50,y:p.y});e=r.events.filter(e=>e.type==='hurt').at(-1);assert.equal(e.guardBroken,true);assert.equal(e.blocked,false);assert.equal(p.block,false);assert.equal(e.angle,0);
 p.shieldUntil=r.now+2;p.hp=3;r.hurt(p,25,false,{x:p.x+50,y:p.y});e=r.events.filter(e=>e.type==='hurt').at(-1);assert.equal(e.amount,3);assert.equal(e.blocked,false);assert.equal(e.mitigated,true);assert.equal(e.downed,true);assert.equal(e.hp,0);
 const snap=r.snapshot().players.find(a=>a.id===p.id);assert.equal(snap.hurtAmount,3);assert.equal(snap.hurtAngle,Math.PI);assert.equal(snap.hurtBlocked,false);
});
test('damage ambience can be disabled without changing other graphics preferences',()=>{
 assert.equal(cleanSettings().hurtEffects,true);const s=cleanSettings({hurtEffects:false,shake:0,quality:'low'});assert.equal(s.hurtEffects,false);assert.equal(s.shake,0);assert.equal(s.quality,'low');
});
test('distant boss impacts attenuate camera motion and use the nearest living couch player',()=>{
 const e={x:400,y:300,r:100},near={x:450,y:300,hp:100},far={x:1100,y:650,hp:100};
 assert.ok(impactShake(e,[near])>impactShake(e,[far]));assert.equal(impactShake(e,[{...near,hp:0}]),0);assert.equal(impactShake(e,[]),0);
 assert.equal(impactShake(e,[far,near]),impactShake(e,[near]));assert.ok(impactShake({...e,minor:true},[near])<impactShake(e,[near]));
});
test('couch camera follows the last survivor rather than the fallen primary and remains finite on a wipe',()=>{
 const team=[{x:100,y:200,hp:0},{x:900,y:600,hp:40},{x:300,y:200,hp:0}];
 const shot=localPartyCamera(team);assert.equal(shot.shared,true);assert.deepEqual(shot.center,{x:900,y:600});assert.equal(shot.zoom,1.55);
 const wipe=localPartyCamera(team.map(p=>({...p,hp:0})));assert.equal(wipe.shared,true);assert.deepEqual(wipe.center,{x:500,y:400});assert.ok(Number.isFinite(wipe.zoom));
 assert.equal(localPartyCamera([]).shared,false);assert.equal(localPartyCamera([team[1]]).center,null);
});
