import test from 'node:test';
import assert from 'node:assert/strict';
import {Room,obstacles} from '../server/engine.js';
import {tickMinions} from '../server/minions.js';
import {tickLoot,usePotion} from '../server/loot.js';
import {DODGE,BOSSES,hazardContains} from '../public/shared.js';
function battle(){const r=new Room('IRON-TEST22','a','Test');const p=r.add('a','Jogador');p.ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);return[r,p];}
test('dash spends energy once, obeys cooldown, protects during movement and stays within walls',()=>{
 const [r,p]=battle();p.x=80;p.y=300;p.input={x:-1,y:0,ax:-1,ay:0};
 r.command(p.id,{type:'dodge',seq:1,energy:999});assert.equal(p.energy,80);const hp=p.hp;r.hurt(p,30,true);assert.equal(p.hp,hp);
 r.command(p.id,{type:'dodge',seq:1});assert.equal(p.energy,80);assert.equal(r.dodge(p),false);
 for(let i=0;i<6;i++)r.tick(.04);assert.ok(p.x>=55&&p.x<80);r.now+=.01;r.hurt(p,30,true);assert.equal(p.hp,hp-30);
 r.now=p.dodgeReady;p.energy=19;assert.equal(r.dodge(p),false);p.energy=20;assert.equal(r.dodge(p),true);assert.equal(p.energy,0);assert.ok(Math.abs(p.dodgeReady-r.now-DODGE.cooldown)<1e-9);
});
test('all eighteen boss patterns are announced and phases cancel unexecuted attacks',()=>{
 for(let round=0;round<3;round++)for(let kind=0;kind<6;kind++){
  const [r,p]=battle();r.round=round;r.prepareRound();r.tick(r.transitionAt-r.now+.01);p.x=700;p.y=380;r.planAttack(kind);
  assert.equal(r.boss.attack,kind);assert.ok(r.events.some(e=>e.type==='warning'&&e.text));assert.ok(r.hazards.length);
  assert.ok(r.hazards.every(h=>h.at-r.now>=1.4));
  r.boss.hp=r.boss.maxHp*.6;r.tick(.01);assert.equal(r.boss.phase,2);assert.equal(r.boss.state,'transition');assert.equal(r.effects.some(e=>e.kind==='volley'),false);
  const before=r.boss.hp;assert.equal(r.hitBoss(p,99999),0);assert.equal(r.boss.hp,before);
  r.tick(1.6);r.boss.hp=r.boss.maxHp*.2;r.tick(.05);assert.equal(r.boss.phase,3);
 }
});
test('line and annular hitboxes preserve their visible safe zones',()=>{
 const ring={x:500,y:400,r:200,inner:100};assert.equal(hazardContains({x:500,y:400},ring),false);assert.equal(hazardContains({x:650,y:400},ring),true);
 const line={x:400,y:400,shape:'line',angle:Math.PI/2,length:300,width:50};assert.equal(hazardContains({x:400,y:520},line),true);assert.equal(hazardContains({x:500,y:400},line),false);
});
test('minions spawn with warning, really damage and die, and drop a server-owned potion',()=>{
 const [r,p]=battle();r.nextWave=r.now;tickMinions(r,.05);assert.equal(r.minions.length,1);const m=r.minions[0];
 assert.ok(m.activeAt>r.now);assert.equal(r.hitMinion(p,m,999),0);r.now=m.activeAt+.01;p.x=m.x-45;p.y=m.y;
 m.attackAt=r.now;tickMinions(r,.01);const h=r.hazards.find(h=>h.minion);assert.ok(h);p.x=m.x+Math.cos(m.facing)*45;p.y=m.y+Math.sin(m.facing)*45;
 r.now=h.at+.01;r.tickHazards();assert.ok(p.hp<p.maxHp);
 r.hitMinion(p,m,999);assert.equal(m.hp,0);assert.equal(r.drops.length,1);const drop=r.drops[0];p.x=drop.x;p.y=drop.y;tickLoot(r);assert.deepEqual(p.potions,['heal']);assert.equal(r.drops.length,0);
 p.hp=70;assert.equal(usePotion(r,p),true);assert.equal(p.hp,115);assert.equal(usePotion(r,p),false);
});
test('ice potion requires an item and proximity, and cannot be forged by input',()=>{
 const [r,p]=battle();r.command(p.id,{type:'potion',seq:1,kind:'ice'});assert.equal(r.boss.slowUntil,0);
 p.potions=['ice'];p.x=r.boss.x-150;p.y=r.boss.y;r.command(p.id,{type:'potion',seq:2});assert.ok(r.boss.slowUntil>=r.now+4);assert.equal(p.potions.length,0);assert.equal(p.stats.damage,15);
});
test('companions are mortal and an incapacitated character cannot drink or dash',()=>{
 const r=new Room('IRON-TEST22','a','Solo',false,true);r.add('a','Jogador').ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);
 const bot=[...r.players.values()].find(p=>p.isBot);r.hurt(bot,999);assert.equal(bot.hp,0);assert.notEqual(bot.downAt,null);bot.potions=['heal'];assert.equal(usePotion(r,bot),false);assert.equal(r.dodge(bot),false);
 r.now+=21;r.tick(.01);assert.equal(bot.eliminated,true);
});
test('pre-battle dialogue does not consume the five-minute combat timer',()=>{
 const r=new Room('IRON-TEST22','a','Dialog');r.add('a','Jogador').ready=true;r.start('a');assert.ok(r.dialogue[0].text);r.tick(5);assert.equal(r.state,'countdown');assert.equal(r.remaining,300);r.tick(r.transitionAt-r.now+.01);assert.equal(r.state,'battle');assert.equal(r.remaining,300);
});
test('cooperating team wins through real combat with longer rounds and actual casualties',()=>{
 const r=new Room('IRON-TEST22','a','Balance');let lootSeed=20261019;r.lootRoll=max=>{lootSeed=(Math.imul(lootSeed,1664525)+1013904223)>>>0;return lootSeed%max;};for(const [i,cls]of ['knight','archer','rogue','archer'].entries()){const p=r.add(String.fromCharCode(97+i),cls);r.select(p.id,cls);p.ready=true;}for(const p of r.players.values())p.isBot=true;r.start('a');
 for(let i=0;i<19000&&r.state!=='finished';i++)r.tick(.05);
 assert.equal(r.state,'finished');assert.equal(r.wins,3);assert.ok(r.results.every(x=>300-x.remaining>45));assert.ok(r.results.every(x=>x.remaining>0));assert.ok([...r.players.values()].every(p=>p.stats.taken>0&&p.stats.damage>0));
});
test('cosmetics are validated in lobby, emotes synchronize and combat cancels them',()=>{
 const r=new Room('IRON-TEST22','a','Style');const p=r.add('a','Ana');
 r.command(p.id,{type:'cosmetic',seq:1,hat:'cowboy'});assert.equal(p.hat,'cowboy');r.command(p.id,{type:'cosmetic',seq:2,hat:'../../hack'});assert.equal(p.hat,'cowboy');
 p.ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);r.command(p.id,{type:'cosmetic',seq:3,hat:'cake'});assert.equal(p.hat,'cowboy');
 r.command(p.id,{type:'emote',seq:4,emote:'spin'});assert.equal(p.emote,'spin');assert.ok(p.emoteUntil>r.now);assert.equal(r.snapshot().players[0].emote,'spin');
 r.hurt(p,10);assert.equal(p.emoteUntil,0);r.command(p.id,{type:'emote',seq:5,emote:'step'});assert.equal(p.emote,'spin');
 r.now=p.emoteReady;r.command(p.id,{type:'emote',seq:6,emote:'cross'});r.command(p.id,{type:'input',seq:7,x:1,y:0,ax:1,ay:0});r.tick(.05);assert.equal(p.emoteUntil,0);
});
test('cover blocks both friendly arrows and enemy bolts, bosses aim toward all quadrants',()=>{
 for(let round=0;round<3;round++){
  const[r,p]=battle();r.round=round;r.prepareRound();r.tick(r.transitionAt-r.now+.01);
  const cover=obstacles(round).find(o=>o.kind&&!o.renderSkip);p.x=cover.x-80;p.y=cover.y;p.input={ax:1,ay:0};r.projectile(p,30);r.tickProjectiles(.3);assert.equal(r.projectiles.length,0);
  r.projectiles.push({id:'enemy',enemy:true,x:cover.x+80,y:cover.y,vx:-300,vy:0,left:300,damage:30});r.tickProjectiles(.5);assert.equal(r.projectiles.length,0);
  for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){p.x=r.boss.x+Math.cos(a)*120;p.y=r.boss.y+Math.sin(a)*120;r.hazards=[];r.planAttack(0);assert.ok(Math.abs(Math.atan2(Math.sin(r.boss.facing-a),Math.cos(r.boss.facing-a)))<.001);}
 }
});

test('rogue poison also applies to a minion in reach and facing, with real damage over time',()=>{
 const [r,p]=battle();p.classId='rogue';r.nextWave=r.now;tickMinions(r,.01);const m=r.minions[0];r.now=m.activeAt+.01;p.x=m.x-70;p.y=m.y;p.input={ax:1,ay:0};r.skill(p,2);const hp=m.hp;
 for(let i=0;i<3;i++){r.now+=1.01;tickMinions(r,.01);}assert.equal(m.hp,hp-24);assert.equal(p.energy,60);
});

test('arrival, gate and awakening are shared presentation stages; combat stays locked until countdown ends',()=>{
 const r=new Room('IRON-TEST22','a','Cinema');const p=r.add('a','Ana');p.ready=true;r.start('a');assert.equal(r.boss.state,'dormant');assert.equal(r.remaining,300);
 r.command('a',{type:'input',seq:1,x:1,y:0,ax:1,ay:0,attack:true});const x=p.x;r.tick(3.6);assert.equal(p.x,x);assert.equal(r.skill(p,0),false);assert.equal(r.events.filter(e=>e.type==='gate').length,1);
 r.tick(.1);assert.equal(r.events.filter(e=>e.type==='gate').length,1);r.tick(7);assert.equal(r.boss.state,'awakening');assert.equal(r.events.filter(e=>e.type==='awaken').length,1);assert.ok(r.snapshot().intro.awakeningAt>r.snapshot().intro.gateAt);assert.equal(r.remaining,300);
 r.tick(r.transitionAt-r.now+.01);assert.equal(r.state,'battle');assert.equal(r.boss.state,'idle');assert.equal(r.remaining,300);r.tick(.1);assert.ok(r.remaining<300);
 r.hitBoss(p,999999);assert.equal(r.state,'round_end');assert.equal(r.transitionAt-r.outroStarted,11);r.tick(6.1);assert.equal(r.round,0);r.tick(5);assert.equal(r.round,1);assert.equal(r.state,'countdown');assert.equal(r.boss.state,'dormant');
});

test('the final cutscene locks combat and preserves the score before showing final results',()=>{
 const [r,p]=battle();r.round=2;r.prepareRound();r.tick(r.transitionAt-r.now+.01);r.wins=2;r.hitBoss(p,999999);assert.equal(r.state,'ending');assert.equal(r.wins,3);const score=r.score;
 assert.equal(r.skill(p,0),false);r.tick(13);assert.equal(r.state,'ending');assert.equal(r.score,score);r.tick(1.1);assert.equal(r.state,'finished');assert.equal(r.score,score);
});
