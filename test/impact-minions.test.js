import test from 'node:test';
import assert from 'node:assert/strict';
import {impactAreaPoints} from '../public/impact-geometry.js';
import {hazardContains} from '../public/shared.js';
import {minionWaveBudget,tickMinions} from '../server/minions.js';
import {Room} from '../server/engine.js';
test('impact particles cover the interior and width of hazards while preserving safe holes and cone edges',()=>{
 const shapes=[{x:500,y:400,r:180},{x:500,y:400,r:180,inner:90},{x:500,y:400,r:180,shape:'cone',angle:.7,spread:.9},{x:500,y:400,shape:'line',angle:1,length:420,width:110}];
 for(const h of shapes){const points=impactAreaPoints(h);assert.ok(points.length>10);assert.ok(points.length<=160);assert.ok(points.every(p=>hazardContains(p,h,0)));}
 const circle=impactAreaPoints(shapes[0]);assert.ok(circle.some(p=>Math.hypot(p.x-500,p.y-400)<60));assert.ok(circle.some(p=>Math.hypot(p.x-500,p.y-400)>140));
 const ring=impactAreaPoints(shapes[1]);assert.ok(ring.every(p=>Math.hypot(p.x-500,p.y-400)>=90));
 const lane=impactAreaPoints(shapes[3]);const across=lane.map(p=>-(p.x-500)*Math.sin(1)+(p.y-400)*Math.cos(1));assert.ok(Math.min(...across)<-30&&Math.max(...across)>30);
});
test('larger minion waves arrive earlier and never exceed team-scaled limits in any phase',()=>{
 for(let players=1;players<=4;players++)for(let phase=1;phase<=3;phase++){
  const r=new Room('IRON-WAVES1','a','Waves');for(let i=0;i<players;i++)r.add(String.fromCharCode(97+i),'Hero '+i).ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);r.boss.phase=phase;
  assert.ok(r.nextWave-r.now<=8);const budget=minionWaveBudget(players,phase);assert.ok(budget.cap>=4&&budget.cap<=10);assert.ok(budget.interval<=20);
  for(let wave=0;wave<8;wave++){r.now=r.nextWave;tickMinions(r,.01);assert.ok(r.minions.length<=budget.cap);assert.ok(r.minions.every(m=>m.hp>0));}
  assert.equal(r.minions.length,budget.cap);
 }
});

test('boss impact models follow hazard semantics, with nine distinct animated silhouettes',async()=>{
 const {impactStyle}=await import('../public/impact-geometry.js');
 const cases=[['red',{},'redEruption'],['red',{shape:'cone'},'steelSweep'],['red',{inner:80},'stoneWave'],['red',{visual:'chains'},'ironChains'],['green',{},'rootEruption'],['green',{cloud:true},'poisonCloud'],['violet',{},'crystalEruption'],['violet',{shape:'line'},'voidSweep'],['violet',{visual:'void'},'voidRift']];
 assert.equal(new Set(cases.map(([kind,h,expected])=>{assert.equal(impactStyle(h,kind),expected);return expected;})).size,9);
 assert.equal(impactStyle({visual:'chains',inner:90},'red'),'ironChains');
 assert.equal(impactStyle({cloud:true,visual:'roots'},'green'),'poisonCloud');
});
