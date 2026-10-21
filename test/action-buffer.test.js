import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../server/engine.js';
import {ACTION_BUFFER_WINDOW} from '../public/action-buffer.js';
import {DODGE} from '../public/shared.js';

// Isolated authority fixtures: timers/positions are deliberately arranged to
// exercise the acceptance boundary, not presented as gameplay/performance runs.
function battle(classes=['archer']) {
 const r=new Room('IRON-BUFFER','a','Buffer');
 classes.forEach((classId,i)=>{const id=String.fromCharCode(97+i),p=r.add(id,id);r.select(id,classId);p.ready=true;});
 r.start('a');r.tick(r.transitionAt-r.now+.01);r.nextWave=r.nextTrap=r.boss.nextAt=1e9;
 r.boss.x=1030;r.boss.y=380;
 for(const p of r.players.values()){p.x=300;p.y=380;p.lastInput=r.now;}
 return r;
}
const send=(r,p,msg)=>r.command(p.id,{...msg,seq:p.lastSeq+1});
const skillEvents=(r,p)=>r.events.filter(e=>e.type==='attack'&&e.owner===p.id&&e.slot>=0);

test('an early human skill press executes once at readiness, preserves cost/cooldown and current aim',()=>{
 const r=battle(),p=r.players.get('a');p.cds[0]=r.now+.1;
 send(r,p,{type:'skill',slot:0,expiresAt:1e9});assert.ok(p.bufferedAction);assert.equal(p.energy,100);assert.equal(p.stats.skills,0);
 send(r,p,{type:'input',x:0,y:0,ax:0,ay:-1,attack:false});r.tick(.06);assert.equal(p.stats.skills,0);
 r.tick(.05);assert.equal(p.stats.skills,1);assert.equal(p.bufferedAction,null);assert.equal(p.energy,80);assert.equal(p.cds[0],r.now+2);assert.equal(skillEvents(r,p).length,1);
 assert.ok(r.projectiles[0].vy<0&&Math.abs(r.projectiles[0].vx)<1e-8);
 for(let i=0;i<50;i++)r.tick(.05);assert.equal(p.stats.skills,1);assert.equal(skillEvents(r,p).length,1);
});

test('a queued skill can follow the final dodge recovery without adding a basic attack recovery lock',()=>{
 const r=battle(),p=r.players.get('a');assert.equal(r.dodge(p),true);r.now=p.dodgeUntil-.1;p.energy=100;
 send(r,p,{type:'skill',slot:0});assert.ok(p.bufferedAction);r.tick(.11);assert.equal(p.stats.skills,1);
 p.attackAt=r.now;p.attackFor=.62;assert.equal(r.skill(p,1),true);assert.equal(p.stats.skills,2);
});

test('dash buffering respects both its cooldown and roots, uses fresh movement, and spends energy once',()=>{
 const r=battle(),p=r.players.get('a');p.dodgeReady=r.now+.05;p.rootUntil=r.now+.1;
 send(r,p,{type:'dodge'});assert.ok(p.bufferedAction);
 send(r,p,{type:'input',x:0,y:1,ax:1,ay:0});r.tick(.06);assert.equal(p.dodgeAt,-10);
 r.tick(.05);assert.equal(p.dodgeAt,r.now);assert.equal(p.energy,100-DODGE.cost);assert.equal(p.bufferedAction,null);assert.ok(p.dodgeVY>0&&Math.abs(p.dodgeVX)<1e-8);assert.ok(p.y>380);
 r.tick(.05);assert.equal(r.events.filter(e=>e.type==='dodge'&&e.owner===p.id).length,1);
});

test('presses outside 140ms and requests not serviced near their readiness are discarded',()=>{
 const r=battle(),p=r.players.get('a');p.cds[0]=r.now+ACTION_BUFFER_WINDOW+.001;send(r,p,{type:'skill',slot:0});assert.equal(p.bufferedAction,null);
 p.cds[0]=r.now+.1;send(r,p,{type:'skill',slot:0});assert.ok(p.bufferedAction);r.tick(ACTION_BUFFER_WINDOW+.07);
 assert.equal(p.bufferedAction,null);assert.equal(p.stats.skills,0);r.tick(.1);assert.equal(p.stats.skills,0);
});

test('the exact 140ms readiness boundary tolerates floating-point clock accumulation',()=>{
 const r=battle(),p=r.players.get('a');p.cds[0]=r.now+.07+.07;
 send(r,p,{type:'skill',slot:0});assert.ok(p.bufferedAction);r.tick(.07);r.tick(.07);assert.equal(p.stats.skills,1);
 const other=battle(),q=other.players.get('a');q.cds[0]=other.now+.14;send(other,q,{type:'skill',slot:0});other.tick(.191);assert.equal(q.stats.skills,0);assert.equal(q.bufferedAction,null);
});

test('a valid130ms press executes on the first ready20Hz tick, never early or on a later tick',()=>{
 const r=battle(),p=r.players.get('a');p.cds[0]=r.now+.13;send(r,p,{type:'skill',slot:0});const expires=p.bufferedAction.expiresAt;
 r.tick(.05);r.tick(.05);assert.equal(p.stats.skills,0);assert.equal(p.bufferedAction.expiresAt,expires);
 r.tick(.05);assert.equal(p.stats.skills,1);assert.equal(p.bufferedAction,null);assert.equal(p.cds[0],r.now+2);
 r.tick(.05);assert.equal(p.stats.skills,1);
 const late=battle(),q=late.players.get('a');q.cds[0]=late.now+.13;send(late,q,{type:'skill',slot:0});late.tick(.2);assert.equal(q.stats.skills,0);assert.equal(q.bufferedAction,null);
});

test('sequence replay and repeated fresh-sequence spam cannot refresh a pending action or cast it repeatedly',()=>{
 const r=battle(),p=r.players.get('a');p.cds[0]=r.now+.12;send(r,p,{type:'skill',slot:0});const pending={...p.bufferedAction},seq=p.lastSeq;
 for(let i=0;i<64;i++)send(r,p,{type:'skill',slot:0,queuedAt:r.now-999,expiresAt:1e9});assert.deepEqual(p.bufferedAction,pending);
 r.command(p.id,{type:'dodge',seq});assert.deepEqual(p.bufferedAction,pending);
 r.tick(.13);assert.equal(p.stats.skills,1);assert.equal(p.bufferedAction,null);
 for(let i=0;i<64;i++)send(r,p,{type:'skill',slot:0});assert.equal(p.bufferedAction,null);assert.equal(p.stats.skills,1);
});

test('buffering does not wait for missing energy and rechecks resources before execution',()=>{
 const r=battle(),p=r.players.get('a');p.cds[0]=r.now+.08;p.energy=19;
 send(r,p,{type:'skill',slot:0});assert.equal(p.bufferedAction,null);
 p.energy=100;send(r,p,{type:'skill',slot:0});assert.ok(p.bufferedAction);p.energy=0;r.tick(.09);
 assert.equal(p.bufferedAction,null);assert.equal(p.stats.skills,0);p.energy=100;r.tick(.05);assert.equal(p.stats.skills,0);
});

test('guard and revive input cancel pending actions even when released before readiness',()=>{
 for(const flag of ['block','revive']){
  const r=battle(),p=r.players.get('a');p.cds[0]=r.now+.1;send(r,p,{type:'skill',slot:0});assert.ok(p.bufferedAction);
  send(r,p,{type:'input',x:0,y:0,ax:1,ay:0,[flag]:true});assert.equal(p.bufferedAction,null);
  send(r,p,{type:'input',x:0,y:0,ax:1,ay:0,[flag]:false});r.tick(.12);assert.equal(p.stats.skills,0);
 }
});

test('downing, disconnect/reconnect and round changes clear intentions immediately',()=>{
 for(const cancel of ['down','disconnect','round']){
  const r=battle(['archer','knight']),p=r.players.get('a');p.cds[0]=r.now+.1;send(r,p,{type:'skill',slot:0});assert.ok(p.bufferedAction);
  if(cancel==='down'){r.hurt(p,999);p.hp=40;p.downAt=null;}
  else if(cancel==='disconnect'){r.disconnect(p.id);r.reconnect(p.id);}
  else{r.endRound(false,'QA');r.prepareRound();r.tick(r.transitionAt-r.now+.01);}
  assert.equal(p.bufferedAction,null);r.tick(.12);assert.equal(p.stats.skills,0);
 }
});

test('newer successful actions supersede the pending press and local players keep separate queues',()=>{
 const r=battle(['archer','archer']),a=r.players.get('a'),b=r.players.get('b');a.cds[0]=b.cds[0]=r.now+.1;
 send(r,a,{type:'skill',slot:0});send(r,b,{type:'skill',slot:0});assert.ok(a.bufferedAction&&b.bufferedAction);
 send(r,a,{type:'skill',slot:2});assert.equal(a.bufferedAction,null);assert.equal(a.stats.skills,1);assert.ok(b.bufferedAction);
 r.tick(.11);assert.equal(a.stats.skills,1);assert.equal(b.stats.skills,1);assert.equal(b.bufferedAction,null);
});

test('a queued cast has priority over held basic only on its execution tick',()=>{
 const r=battle(),p=r.players.get('a');p.cds[0]=r.now+.08;p.basicAt=r.now+.08;
 send(r,p,{type:'input',x:0,y:0,ax:1,ay:0,attack:true});send(r,p,{type:'skill',slot:0});r.tick(.09);
 assert.equal(p.attackSlot,0);assert.equal(r.events.filter(e=>e.type==='attack'&&e.owner===p.id&&e.slot===-1).length,0);
 r.tick(.05);assert.equal(r.events.filter(e=>e.type==='attack'&&e.owner===p.id&&e.slot===-1).length,1);
});

test('a new immobilization cannot push buffered dash past its original deadline and bots do not gain a queue',()=>{
 const r=battle(),p=r.players.get('a');p.dodgeReady=r.now+.1;send(r,p,{type:'dodge'});p.rootUntil=r.now+1;r.tick(.05);assert.equal(p.bufferedAction,null);assert.equal(p.dodgeAt,-10);
 p.rootUntil=0;p.isBot=true;p.cds[0]=r.now+.08;send(r,p,{type:'skill',slot:0});assert.equal(p.bufferedAction,null);assert.equal(p.stats.skills,0);
});
