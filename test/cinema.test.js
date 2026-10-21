import test from'node:test';import assert from'node:assert/strict';import{localEmoteShot}from'../public/camera-shots.js';import{effectVariant,EFFECT_VARIANTS,baseEffect}from'../public/effect-variants.js';import{Room}from'../server/engine.js';
test('emote camera belongs only to this machine, chooses the latest local actor and restores after cancellation',()=>{
 const a={id:'a',hp:100,x:200,y:300,emoteAt:5,emoteUntil:8},b={...a,id:'b',x:800,emoteAt:6,emoteUntil:9},room={state:'battle',players:[a,b]};assert.equal(localEmoteShot(room,['a'],6).owner,'a');assert.equal(localEmoteShot(room,['a','b'],6).owner,'b');assert.ok(localEmoteShot(room,['a'],6).zoom>1.9);assert.equal(localEmoteShot(room,['remote'],6),null);assert.equal(localEmoteShot(room,['a'],8.1),null);assert.equal(localEmoteShot({...room,state:'countdown'},['a'],6),null);a.hp=0;assert.equal(localEmoteShot(room,['a'],6),null);
});
test('attack variations use event ids consistently without mutating shapes, roots and lances have separate models',()=>{
 for(const[base,variants]of Object.entries(EFFECT_VARIANTS)){const seen=new Set();for(let id=0;id<variants.length*2;id++){const h={id,x:300,y:200,r:120,inner:50};const before=JSON.stringify(h),v=effectVariant(base,h);assert.equal(effectVariant(base,{...h}),v);assert.equal(JSON.stringify(h),before);assert.equal(baseEffect(v),base);seen.add(v);}assert.equal(seen.size,variants.length);}
 assert.ok(Array.from({length:9},(_,id)=>effectVariant('rootEruption',{id,shape:'line'})).includes('grove-leaf'));
});
test('reconnecting in preparation requires readiness again, while an active battle keeps its state',()=>{
 const r=new Room('IRON-CINEMA','a','QA');const p=r.add('a','Ana');p.ready=true;r.disconnect('a');r.reconnect('a');assert.equal(p.ready,false);p.ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);r.disconnect('a');r.reconnect('a');assert.equal(r.state,'battle');assert.equal(p.ready,true);
});
