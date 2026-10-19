import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../server/engine.js';
import {chooseBossAttack,ATTACK_NAMES} from '../server/bosses.js';
test('every boss switches between close pressure and ranged control without repeating the last attack',()=>{
 const near=[[0,1,2,7],[2,3,5,7],[0,3,5,7]],far=[[3,4,5,6],[0,1,4,6],[1,2,4,6]];
 for(let round=0;round<3;round++){
  assert.equal(ATTACK_NAMES[round].length,8);let previous=-1;const seen=new Set();
  for(let i=0;i<8;i++){const choice=chooseBossAttack(round,i,130,previous);assert.ok(near[round].includes(choice));assert.notEqual(choice,previous);seen.add(choice);previous=choice;}assert.ok(seen.has(7));
  previous=-1;seen.clear();for(let i=0;i<8;i++){const choice=chooseBossAttack(round,i,500,previous);assert.ok(far[round].includes(choice));assert.notEqual(choice,previous);seen.add(choice);previous=choice;}assert.ok(seen.has(6));
 }
});
test('new boss moves announce both melee areas and ranged volleys before damage; phase changes cancel pending volleys',()=>{
 for(let round=0;round<3;round++)for(const kind of [6,7]){
  const r=new Room('IRON-RANGE1','a','Range');const p=r.add('a','Hero');p.ready=true;r.start('a');r.round=round;r.prepareRound();r.tick(r.transitionAt-r.now+.01);p.x=100;p.y=650;r.planAttack(kind);
  assert.equal(r.boss.attack,kind);assert.ok(r.hazards.length);assert.ok(r.hazards.every(h=>h.at-r.now>=1.4));
  if(kind===6)assert.ok(r.effects.some(e=>e.kind==='volley'));
  const hp=p.hp;r.tick(.05);assert.equal(p.hp,hp);
  r.boss.hp=r.boss.maxHp*.6;r.tick(.01);assert.equal(r.boss.state,'transition');assert.ok(!r.effects.some(e=>e.kind==='volley'));
 }
});
