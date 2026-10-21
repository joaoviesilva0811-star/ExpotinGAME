import {adaptiveLightLimit,configureLighting,setLightingDensity,stepLighting,lightingStats,emitLight,resetLighting} from '../public/lighting.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {Room} from '../server/engine.js';import {damageCover,tickArena} from '../server/arena.js';
import {arenaObstacles,makeCovers} from '../public/arena-state.js';import {ARENA_OBSTACLES,hazardContains} from '../public/shared.js';
import {bossTactic} from '../server/bosses.js';import {TransitionTiming} from '../public/transition-timing.js';import {ImpactFeel} from '../public/impact-feel.js';
function battle(classId='knight'){const r=new Room('IRON-CRAFT','a','QA'),p=r.add('a','Hero');r.select('a',classId);p.ready=true;r.start('a');r.tick(r.transitionAt+.01);r.boss.nextAt=r.now+100;return{r,p};}
test('destructible geometry has walkable space, authoritative damage and no score farming',()=>{
 for(let round=0;round<3;round++)for(const c of makeCovers(round))for(const o of ARENA_OBSTACLES[round])assert.ok(Math.hypot(c.x-o.x,c.y-o.y)>c.r+o.r+30,`${round} cover overlaps a fixed obstacle`);
 const{r,p}=battle(),c=r.covers[0];p.x=c.x-70;p.y=c.y;p.facing=0;p.input.ax=1;p.input.ay=0;
 const before=c.hp;r.melee(p,25,110);assert.equal(c.hp,before-25);assert.equal(p.stats.damage,0);assert.equal(p.combo.count,0);assert.equal(arenaObstacles(r).includes(c),true);
 damageCover(r,c,1000,p.id);assert.equal(c.hp,0);assert.equal(arenaObstacles(r).includes(c),false);assert.ok(r.events.some(e=>e.type==='coverBreak'));assert.ok(r.events.every(e=>Number.isSafeInteger(e.id)));assert.equal(r.events.find(e=>e.type==='coverBreak').coverId,c.id);assert.equal(damageCover(r,c,999,p.id),0);
 const snap=r.snapshot();assert.equal(snap.covers[0].hp,0);r.prepareRound();assert.ok(r.covers.every(c=>c.hp===c.maxHp));
});
test('cover blocks actual arrows until destroyed, then the path is free',()=>{
 const{r,p}=battle('archer'),c=r.covers[0];p.x=c.x-70;p.y=c.y;p.input.ax=1;p.input.ay=0;r.boss.x=c.x+75;r.boss.y=c.y;
 const hp=r.boss.hp;r.projectile(p,32);for(let i=0;i<8;i++)r.tickProjectiles(.025);assert.equal(r.boss.hp,hp);assert.equal(c.hp,c.maxHp-32);
 damageCover(r,c,999);r.projectile(p,32);for(let i=0;i<12;i++)r.tickProjectiles(.025);assert.ok(r.boss.hp<hp);
});
test('floor traps announce 2.4 seconds, are fixed in place, damage through the normal energy/HP path and can be dodged',()=>{
 const{r,p}=battle();r.nextTrap=r.now;tickArena(r);const h=r.hazards.find(h=>h.environment);assert.ok(Math.abs(h.at-r.now-2.4)<1e-9);assert.ok(r.events.some(e=>e.type==='arenaTrap'));p.x=h.x;p.y=h.y;const hp=p.hp;r.tickHazards();assert.equal(p.hp,hp);
 r.now=h.at;p.dodgeUntil=r.now+.2;r.tickHazards();assert.equal(p.hp,hp);p.dodgeUntil=0;h.next=r.now;r.tickHazards();assert.ok(p.hp<hp);assert.ok(hazardContains({x:h.x,y:h.y},h));
});
test('boss tactics vary by phase/distance without repeating and exposed damage ends on schedule',()=>{
 for(let round=0;round<3;round++)for(const dist of [130,500]){const patterns=[];for(let phase=1;phase<=3;phase++){let previous=-1;const seq=[];for(let i=0;i<4;i++){const t=bossTactic(round,phase,i,dist,previous);assert.notEqual(t.kind,previous);assert.ok(t.label);seq.push(t.kind);previous=t.kind;}patterns.push(seq.join(','));}assert.equal(new Set(patterns).size,3);}
 const{r,p}=battle();r.boss.state='recover';r.boss.exposedUntil=r.now+1;assert.equal(r.hitBoss(p,25),28);r.now+=1.1;assert.equal(r.hitBoss(p,25),25);
});
test('crisp transition timing respects guard, basic anticipation, release, movement and invalidates dead actors',()=>{
 const t=new TransitionTiming(),p={id:'a',classId:'knight',hp:100,vx:80,vy:0,facing:0,attackAt:-10};assert.equal(t.sample(p,1),null);p.vx=0;assert.equal(t.sample(p,1.1).group,'settle-east');p.block=true;assert.equal(t.sample(p,1.2).group,'guard-east');assert.ok(t.sample(p,1.6).progress>.99);p.block=false;assert.equal(t.sample(p,1.7).group,'guard-east');p.attackAt=2;p.attackFor=.6;p.attackSlot=-1;assert.equal(t.sample(p,2.05),null);assert.equal(t.sample(p,2.2),null);p.hp=0;assert.equal(t.sample(p,2.21),null);
});
test('outgoing camera has distinct class weights, remains bounded, respects zero strength and decays',()=>{
 const samples={};for(const id of ['knight','archer','rogue']){const f=new ImpactFeel();f.hit(id,0,25,1);samples[id]=Math.abs(f.step(.02,1).x);assert.equal(f.step(.01,0).x,0);for(let i=0;i<20;i++)f.step(.02,1);assert.equal(f.step(.02,1).x,0);}assert.ok(samples.knight>samples.rogue&&samples.rogue>samples.archer);
});

test('adaptive lighting bounds temporary overdraw while retaining the six room sources',()=>{
 assert.equal(adaptiveLightLimit(24,1),24);assert.equal(adaptiveLightLimit(24,.12),8);assert.equal(adaptiveLightLimit(8,.12),6);configureLighting(true,'high');setLightingDensity(.12);for(let i=0;i<30;i++)emitLight(i,i,'#ffffff',200,1,.5);stepLighting(.016,0,1,Array.from({length:30},()=>({x:500,y:400,color:'void',enemy:true})));assert.equal(lightingStats().active,8);configureLighting(false,'high');stepLighting(.016,0,1);assert.equal(lightingStats().active,0);resetLighting();setLightingDensity(1);
});
