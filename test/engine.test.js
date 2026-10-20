import test from 'node:test';
import assert from 'node:assert/strict';
import { Room, obstacles } from '../server/engine.js';
import { CLASSES, BOSSES } from '../public/shared.js';

function battle(classes = ['knight']) {
  const r = new Room('IRON-TEST22', 'a', 'Teste');
  classes.forEach((cls, i) => { const id=String.fromCharCode(97+i);const p=r.add(id,id);r.select(id,cls);p.ready=true; });
  r.start('a');r.tick(r.transitionAt-r.now+.01);return r;
}
function aim(r,p,x=1,y=0,seq=1){r.command(p.id,{type:'input',seq,x:0,y:0,ax:x,ay:y});}

test('leader and readiness are enforced; capacity is 4',()=>{
  const r=new Room('IRON-TEST22','a','Teste');r.add('a','Ana');r.add('b','Bia');r.add('c','Caio');r.add('d','Dani');
  assert.throws(()=>r.add('e','Eva'),/4 jogadores/);assert.throws(()=>r.start('b'),/líder/);assert.throws(()=>r.start('a'),/prontos/);
  for(const p of r.players.values())p.ready=true;r.start('a');assert.equal(r.state,'countdown');
  assert.throws(()=>r.add('e','Eva'),/começou/);
});
test('class stats and boss HP scale with real participant count',()=>{
  const solo=battle(['archer']),group=battle(['knight','archer','rogue','knight']);
  assert.equal(solo.players.get('a').maxHp,100);assert.equal(group.players.get('c').maxHp,115);
  assert.equal(group.boss.maxHp,BOSSES[0].hp);assert.ok(solo.boss.maxHp<group.boss.maxHp&&solo.boss.maxHp>=500);
});
test('skills consume resources once, enforce cooldown and reject duplicate sequence IDs',()=>{
  const r=battle(),p=r.players.get('a');p.x=700;p.y=380;aim(r,p);
  r.command('a',{type:'skill',slot:0,seq:2});assert.equal(p.energy,80);assert.equal(r.boss.hp,r.boss.maxHp-25);
  r.command('a',{type:'skill',slot:0,seq:2});r.command('a',{type:'skill',slot:0,seq:3});
  assert.equal(p.energy,80);assert.equal(p.stats.skills,1);
  p.energy=19;r.now+=3;assert.equal(r.skill(p,0),false);assert.equal(p.energy,19);
  r.command('a',{type:'input',seq:4,x:NaN,y:0,ax:1,ay:0});assert.equal(p.input.x,0);
  r.command('a',{type:'setHp',seq:5,hp:999999,damage:99999});assert.equal(p.hp,160);assert.equal(r.boss.hp,r.boss.maxHp-25);
});
test('melee requires reach and aim; basic attack has a minimum interval',()=>{
  const r=battle(),p=r.players.get('a');aim(r,p);r.basic(p);r.tick(.2);assert.equal(r.boss.hp,r.boss.maxHp);
  p.x=740;p.y=380;r.now+=1;aim(r,p,-1,0,2);r.basic(p);r.tick(.2);assert.equal(r.boss.hp,r.boss.maxHp);
  r.now+=1;aim(r,p,1,0,3);r.basic(p);assert.equal(r.boss.hp,r.boss.maxHp); // Anticipation precedes contact.
  r.tick(.2);assert.equal(r.boss.hp,r.boss.maxHp-12);
  r.basic(p);r.tick(.2);assert.equal(r.boss.hp,r.boss.maxHp-12);
});
test('archer projectiles hit by collision, miss out of range and apply slow',()=>{
  const r=battle(['archer']),p=r.players.get('a');p.x=500;p.y=380;aim(r,p);
  r.skill(p,2);assert.equal(p.energy,60);for(let i=0;i<12;i++)r.tickProjectiles(.05);
  assert.equal(r.boss.hp,r.boss.maxHp-20);assert.ok(r.boss.slowUntil>r.now);
  aim(r,p,-1,0,2);r.projectile(p,30);for(let i=0;i<25;i++)r.tickProjectiles(.05);assert.equal(r.boss.hp,r.boss.maxHp-20);
});
test('defense drains energy, blocks attacks, respects release delay and guard breaks',()=>{
  const r=battle(),p=r.players.get('a');r.command('a',{type:'input',seq:1,x:0,y:0,ax:1,ay:0,block:true});
  r.tick(.1);assert.equal(p.block,true);assert.equal(p.energy,98.5);r.hurt(p,25);assert.equal(p.hp,150);assert.equal(p.stats.avoided,15);
  const before=r.boss.hp;assert.equal(r.skill(p,0),false);r.basic(p);assert.equal(r.boss.hp,before);
  r.hurt(p,30,true);assert.equal(p.hp,120);assert.equal(p.block,false);
  r.tick(.1);assert.equal(p.block,false);
  r.command('a',{type:'input',seq:2,x:0,y:0,ax:1,ay:0,block:false});r.tick(.5);assert.ok(p.energy<=100&&p.energy>=0);
});
test('royal wall protects nearby allies and does not protect distant allies',()=>{
  const r=battle(['knight','rogue']),a=r.players.get('a'),b=r.players.get('b');a.x=300;a.y=300;b.x=350;b.y=300;
  aim(r,a);r.skill(a,2);r.hurt(a,40);r.hurt(b,40);assert.equal(a.hp,140);assert.equal(b.hp,85);
  b.x=900;r.hurt(b,40);assert.equal(b.hp,45);
});
test('rogue double hit and poison apply only to a nearby boss',()=>{
  const r=battle(['rogue']),p=r.players.get('a');p.x=740;p.y=380;aim(r,p);r.skill(p,0);r.tick(.16);
  assert.equal(p.stats.damage,36);r.skill(p,2);for(let i=0;i<3;i++)r.tick(1.01);
  assert.equal(p.stats.damage,60);p.x=100;r.now+=20;p.energy=100;r.skill(p,2);assert.equal(r.boss.poison.length,0);
});
test('revive takes 4 uninterrupted seconds, damage resets progress, bleedout lasts 20 seconds',()=>{
  const r=battle(['knight','rogue']),a=r.players.get('a'),b=r.players.get('b');
  // Isolate this timer test from long-range boss marks; damage interruption is asserted below.
  r.boss.nextAt=r.now+60;r.nextWave=r.now+60;a.x=100;b.x=140;a.y=b.y=380;r.hurt(b,999);assert.equal(b.hp,0);
  const input=seq=>r.command('a',{type:'input',seq,x:0,y:0,ax:1,ay:0,revive:true});
  for(let i=0;i<30;i++){input(i+1);r.tick(.05);}assert.ok(a.revive>1&&b.hp===0);
  r.hurt(a,1);assert.equal(a.revive,0);
  for(let i=0;i<84;i++){input(i+31);r.tick(.05);}assert.ok(b.hp>0);assert.equal(a.stats.revives,1);assert.equal(b.hp,CLASSES.rogue.hp*.4);
  r.hurt(b,999);r.now+=21;input(120);r.tick(.05);assert.equal(b.eliminated,true);
});
test('boss windup telegraphs, phase transition and attacks resolve on server',()=>{
  for(const round of [0,1,2]){
    const r=battle();r.round=round;r.prepareRound();r.tick(r.transitionAt-r.now+.01);r.planAttack(0);
    assert.equal(r.boss.state,'windup');assert.ok(r.hazards.length>0);assert.ok(r.hazards.every(h=>h.at>r.now));
    const p=r.players.get('a'),h=r.hazards[0];p.x=h.x+40;p.y=h.y;h.shape=undefined;
    const hp=p.hp;r.tickHazards();assert.equal(p.hp,hp);r.now=h.at+.01;r.tickHazards();assert.ok(p.hp<hp);
    r.boss.hp=r.boss.maxHp*.2;r.tick(.01);assert.equal(r.boss.phase,2);assert.equal(r.boss.state,'transition');
  }
});
test('arena movement remains inside boundaries and solid pillars',()=>{
  const r=battle(),p=r.players.get('a');r.move(p,-10000,-10000);assert.equal(p.x,55);assert.equal(p.y,55);
  const o=obstacles(0)[0];p.x=o.x;p.y=o.y;r.move(p,0,0);assert.ok(Math.hypot(p.x-o.x,p.y-o.y)>=o.r+17-.001);
});
test('full three-round progression gives coherent results, healing and a final score',()=>{
  const r=battle(),p=r.players.get('a');
  for(let round=0;round<3;round++){
    assert.equal(r.state,'battle');assert.equal(r.round,round);p.hp=80;r.hitBoss(p,99999);
    assert.equal(r.results.length,round+1);assert.equal(r.results[round].won,true);
    for(let i=0;i<100&&!r.keyDrop.collectedAt;i++)r.tick(.05);assert.ok(r.keyDrop.collectedAt);
    if(round<2){assert.equal(r.state,'round_end');r.tick(r.transitionAt-r.now+.01);assert.equal(p.hp,120);assert.equal(r.state,'countdown');r.tick(r.transitionAt-r.now+.01);}
  }
  assert.equal(r.state,'ending');r.tick(r.transitionAt-r.now+.01);assert.equal(r.state,'finished');assert.equal(r.wins,3);assert.ok(r.score>=650);assert.ok(p.stats.damage>2000);
  r.restartLobby('a');assert.equal(r.state,'lobby');assert.equal(p.ready,false);
});
test('timeout and total wipe are losses, and disconnected identities reserve a slot',()=>{
  const r=battle();r.remaining=.01;r.tick(.05);assert.equal(r.results[0].won,false);assert.match(r.results[0].reason,/tempo/);
  const s=battle();s.players.get('a').hp=0;s.tick(.05);assert.match(s.results[0].reason,/equipe/);
  const l=new Room('IRON-TEST22','a','Teste');l.add('a','Ana');l.add('b','Bia');l.disconnect('a');assert.equal(l.owner,'b');l.add('a','Ana');assert.equal(l.players.size,2);assert.equal(l.players.get('a').connected,true);
  l.disconnect('a');l.tick(61);assert.equal(l.players.has('a'),false);
});
