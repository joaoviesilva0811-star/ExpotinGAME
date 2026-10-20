import test from 'node:test';import assert from 'node:assert/strict';
import {Room,obstacles} from '../server/engine.js';
import {CLASSES,REVIVE} from '../public/shared.js';
import {rescueAssignments,rescueApproach,rescueRoute,routeClear} from '../server/rescue.js';
import {rescuePose} from '../public/rescue-timing.js';
function battle(){const r=new Room('IRON-RESCUE','a','Resgate',false,true);const a=r.add('a','Ana');r.select('a','archer');a.ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);r.boss.nextAt=r.now+60;r.nextWave=r.now+60;r.boss.x=1000;r.boss.y=100;return r;}
function bot(id,x,y,cls='knight'){return{id,x,y,classId:cls,hp:100,maxHp:100,connected:true,isBot:true,revive:0};}
function down(id,x,y,now,isBot=false){return{id,x,y,hp:0,connected:true,downAt:now,eliminated:false,isBot};}
test('requested basic damage keeps distinct class cadence, skill cost and cooldown limits',()=>{
 assert.deepEqual(Object.values(CLASSES).map(c=>c.damage),[25,32,18]);assert.ok(CLASSES.rogue.interval<CLASSES.knight.interval);const r=battle(),p=r.players.get('a');p.x=700;p.y=380;r.boss.x=820;r.boss.y=380;p.input={x:0,y:0,ax:1,ay:0};r.basic(p);const at=p.basicAt;r.basic(p);assert.equal(p.basicAt,at);assert.equal(r.effects.length,1);assert.equal(r.effects[0].damage,32);assert.equal(p.energy,100);
});
test('rescue coordinator keeps a committed rescuer, reserves human channels and covers bot casualties',()=>{
 const d=down('down',400,380,0,true),a=bot('a',450,380),b=bot('b',455,380,'rogue');b.reviveTarget=d.id;b.revive=2;
 assert.equal(rescueAssignments([d,a,b],[],3).get(d.id),'b');a.isBot=false;a.reviveTarget=d.id;assert.equal(rescueAssignments([d,a,b],[],3).get(d.id),'a');
 a.reviveTarget=null;const second=down('second',600,400,1);const result=rescueAssignments([d,second,a,b],[],3);assert.equal(result.size,1);assert.equal(new Set(result.values()).size,result.size);
});
test('bots choose safe edges of small hazards, reject future impacts during channel, and skip expired rescue deadlines',()=>{
 const d=down('down',400,380,0),a=bot('a',445,380),tiny={x:400,y:380,r:10,at:2,end:7};
 const safe=rescueApproach(a,d,[tiny],2);assert.ok(safe);assert.ok(Math.hypot(safe.point.x-400,safe.point.y-380)>32);
 const incoming={x:400,y:380,r:170,at:5.5,end:6};assert.equal(rescueAssignments([d,a],[incoming],2).size,0);assert.equal(rescueAssignments([d,a],[],17).size,0);
});
test('rescue paths go around cover rather than reviving through pillars',()=>{
 const a={x:300,y:380},b={x:600,y:380},cover=[{x:450,y:380,r:42}];assert.equal(routeClear(a,b,cover,19),false);const path=rescueRoute(a,b,cover);assert.ok(path&&path.length>300);assert.ok(routeClear(a,path.point,cover,19));
 const r=battle(),players=[...r.players.values()],helper=players[1],victim=players[2],o=obstacles(0)[0];for(const p of players)if(p.isBot)p.isBot=false;helper.x=o.x-38;helper.y=o.y;victim.x=o.x+38;victim.y=o.y;r.hurt(victim,999);
 for(let i=0;i<90;i++){r.command(helper.id,{type:'input',seq:i+1,x:0,y:0,ax:1,ay:0,revive:true});r.tick(.05);}assert.equal(helper.revive,0);assert.equal(victim.hp,0);
});
test('a bot revives another bot with the same four second channel and authoritative animation stamps',()=>{
 const r=battle(),[human,helper,victim]=[...r.players.values()];human.x=130;human.y=130;helper.x=420;helper.y=380;victim.x=465;victim.y=380;r.hurt(victim,999);const started=r.now;
 for(let i=0;i<65;i++)r.tick(.05);assert.equal(victim.hp,0);assert.ok(helper.revive>2);
 for(let i=0;i<40&&victim.hp===0;i++)r.tick(.05);assert.equal(victim.hp,victim.maxHp*REVIVE.health);assert.ok(r.now-started>=4);assert.equal(victim.revivedBy,helper.id);assert.equal(helper.stats.revives,1);assert.ok(victim.hitSafeUntil>r.now);const snap=r.snapshot().players.find(p=>p.id===victim.id);assert.equal(snap.revivedAt,victim.revivedAt);assert.ok(r.events.some(e=>e.type==='revived'&&e.rescuer===helper.id&&e.owner===victim.id));
});
test('rescue poses kneel/channel/finish and fallen actors rise, while attacks and movement can resume',()=>{
 const p={id:'a',hp:100,facing:0,reviveTarget:'b',revive:.2,attackAt:-10,revivedAt:-10};assert.equal(rescuePose(p,1).phase,'help');const a=rescuePose({...p,revive:1},1),b=rescuePose({...p,revive:1.2},1);assert.notEqual(a.position,b.position);
 assert.equal(rescuePose({...p,hp:0},1).downPose,true);const risen={...p,reviveTarget:null,revive:0,revivedAt:4};assert.equal(rescuePose(risen,4.5).phase,'rise');assert.equal(rescuePose({...risen,vx:30},4.5),null);assert.equal(rescuePose({...risen,attackAt:4.1},4.5),null);assert.equal(rescuePose({...risen,revivedAt:-10,aidAt:4,aidUntil:4.55},4.2).phase,'finish');
});
