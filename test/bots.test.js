import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../server/engine.js';

test('solo companions are exactly the two classes not selected by the human',()=>{
  const r=new Room('IRON-SOLO22','human','Solo',false,true);r.add('human','Jogador');
  for(const cls of ['knight','archer','rogue']){
    r.select('human',cls);const bots=[...r.players.values()].filter(p=>p.isBot);
    assert.equal(bots.length,2);assert.ok(bots.every(p=>p.classId!==cls&&p.ready));
    assert.equal(new Set([...r.players.values()].map(p=>p.classId)).size,3);
  }
  assert.throws(()=>r.add('stranger','Intruso'),/solo/);
  assert.ok(r.snapshot().players.filter(p=>p.isBot).every(p=>p.name));
});
test('LAN bots remain optional, humans replace bot slots, and bots never become leaders',()=>{
  const r=new Room('IRON-LAN222','a','LAN',true);r.add('a','Ana');r.setBots('a',true);
  assert.equal(r.players.size,3);r.add('b','Bruno');assert.equal(r.players.size,4);
  r.add('c','Caio');assert.equal(r.players.size,4);assert.equal([...r.players.values()].filter(p=>p.isBot).length,1);
  r.disconnect('a');assert.equal(r.owner,'b');assert.equal(r.players.get(r.owner).isBot,undefined);
  assert.throws(()=>r.setBots('c',false),/líder/);r.setBots('b',false);assert.equal(r.players.size,3);
});
test('companions fight all rounds via normal combat, use resources and preserve coherent results',()=>{
  const r=new Room('IRON-SOLO22','human','Solo',false,true);const human=r.add('human','Cavaleiro');human.ready=true;r.start('human');
  for(let i=0;i<22000&&r.state!=='finished';i++){
    r.tick(.05);
    for(const p of r.players.values()){
      assert.ok(p.energy>=0&&p.energy<=100);assert.ok(p.hp>=0&&p.hp<=p.maxHp);
    }
  }
  assert.equal(r.state,'finished');assert.equal(r.results.length,3);assert.equal(r.wins,r.results.filter(x=>x.won).length);
  const bots=[...r.players.values()].filter(p=>p.isBot);
  assert.ok(bots.every(p=>p.stats.damage>0&&p.stats.skills>0));
  assert.equal(human.stats.damage,0); // No automated human; only the two real AI companions act.
  assert.ok(bots.every(p=>p.stats.taken>0));
  r.restartLobby('human');assert.ok([...r.players.values()].filter(p=>p.isBot).every(p=>p.ready));
});
test('AI allies can reach and revive an incapacitated human with the ordinary revive timer',()=>{
  const r=new Room('IRON-SOLO22','a','Solo',false,true);const a=r.add('a','Arqueiro');r.select('a','archer');a.ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);
  r.boss.nextAt=r.now+15;r.hurt(a,999);const bots=[...r.players.values()].filter(p=>p.isBot);for(const b of bots){b.x=a.x+40;b.y=a.y;}
  for(let i=0;i<110&&a.hp===0;i++)r.tick(.05);
  assert.ok(a.hp>0);assert.equal(bots.reduce((sum,b)=>sum+b.stats.revives,0),1);
});
