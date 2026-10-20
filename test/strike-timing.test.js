import test from 'node:test';import assert from 'node:assert/strict';
import {heroStrike,bossStrike,minionStrike,strikeDirection} from '../public/strike-timing.js';
import {AdaptiveEffects} from '../public/effect-budget.js';
import {cleanSettings} from '../public/presentation.js';
test('each class selects four distinct attacks, timed to the authoritative release',()=>{
 for(const classId of ['knight','archer','rogue']){
  const p={classId,hp:100,attackAt:0,attackFor:.65,facing:0},clips=new Set();
  for(const attackSlot of [-1,0,1,2]){p.attackSlot=attackSlot;clips.add(heroStrike(p,0).clip);if(attackSlot>=0)assert.equal(heroStrike(p,0).progress,.5);}
  assert.equal(clips.size,4);p.attackSlot=-1;const hit={knight:.18,archer:.17,rogue:.12}[classId];assert.equal(heroStrike(p,hit).progress,.5);assert.equal(heroStrike(p,.66),null);p.hp=0;assert.equal(heroStrike(p,0),null);
 }
});
test('boss attacks have three families with continuous anticipation, execution and recovery',()=>{
 for(let round=0;round<3;round++){
  const b={state:'windup',startedAt:0,until:1,facing:0},clips=new Set();for(let attack=0;attack<8;attack++){b.attack=attack;clips.add(bossStrike(b,round,.5).clip);}assert.equal(clips.size,3);
  assert.equal(bossStrike(b,round,1).progress,.5);b.state='execute';assert.equal(bossStrike(b,round,0).progress,.5);assert.equal(bossStrike(b,round,1).progress,.75);b.state='recover';assert.equal(bossStrike(b,round,0).progress,.75);assert.ok(bossStrike(b,round,1).progress<1);b.state='chase';assert.equal(bossStrike(b,round,.5),null);
 }
});
test('minions aim independently and corrected east poses face the bow direction',()=>{
 for(const kind of ['revenant','thornling','acolyte']){const p=minionStrike({kind,state:'windup',animAt:0,aim:Math.PI},.5);assert.equal(p.direction,6);assert.ok(p.progress>0&&p.progress<.5);}
 for(let d=0;d<8;d++){const corrected=strikeDirection(d,true);assert.equal(corrected.flip,d>=1&&d<=3);assert.equal(corrected.row,corrected.flip?8-d:d);assert.deepEqual(strikeDirection(d,false),{row:d,flip:false});}
});
test('adaptive effects reduce only presentation density and recover gradually; opt out is respected',()=>{
 const b=new AdaptiveEffects();b.configure('high',true);for(let i=0;i<150;i++)b.record(1/30);assert.equal(b.scale,.12);
 for(let i=0;i<500;i++)b.record(1/60);assert.ok(b.scale>.12&&b.scale<1);b.configure('high',false);for(let i=0;i<100;i++)b.record(1/20);assert.equal(b.scale,1);
 b.configure('low',true);assert.equal(b.scale,1);assert.equal(cleanSettings({}).autoEffects,true);assert.equal(cleanSettings({autoEffects:false}).autoEffects,false);
});
