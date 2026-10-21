import test from 'node:test';
import assert from 'node:assert/strict';
import {exposedWindow,groundShadowShape,atmosphereCount} from '../public/arena-presentation.js';
import {configureLighting,setLightingDensity,stepLighting,lightingStats,emitLight,resetLighting} from '../public/lighting.js';

test('exposed ring counts down only during the authoritative recovery window',()=>{
 const b={hp:100,state:'recover',startedAt:10,exposedUntil:12};
 assert.equal(exposedWindow(b,10),1);assert.equal(exposedWindow(b,11),.5);assert.equal(exposedWindow(b,12),0);
 assert.equal(exposedWindow(b,9.9),0);assert.equal(exposedWindow({...b,state:'windup'},11),0);assert.equal(exposedWindow({...b,hp:0},11),0);
 assert.equal(exposedWindow({...b,startedAt:undefined},11),0);assert.equal(exposedWindow({...b,exposedUntil:10},11),0);
});
test('ground shadow stays short and flat instead of reproducing a standing actor',()=>{
 for(const [w,h]of [[100,92],[210,210],[82,75]])for(const d of [0,100,500,5000]){
  const s=groundShadowShape(w,h,d,.4);assert.ok(s.length<=h*.4);assert.ok(s.width<=h*.38);
  assert.ok(Math.max(s.length,s.width)*s.flatten<h*.18);assert.ok(s.opacity<=.17);
 }
 for(const value of Object.values(groundShadowShape(NaN,undefined,Infinity,NaN)))assert.ok(Number.isFinite(value));
});
test('ambient decoration reduces with load while staying within each quality budget',()=>{
 for(const quality of ['low','medium','high']){
  const full=atmosphereCount(quality,1),busy=atmosphereCount(quality,.12);assert.ok(busy<full);assert.ok(busy>=4);
 }
 assert.equal(atmosphereCount('high',1),24);assert.equal(atmosphereCount('medium',1),16);assert.equal(atmosphereCount('low',1),8);
});
test('spell and missile lights respect the cap without becoming shadow sources',()=>{
 resetLighting();configureLighting(true,'high');setLightingDensity(.12);
 for(let i=0;i<40;i++)emitLight(600,380,'#ffffff',200,1,1);
 stepLighting(.016,0,1,Array.from({length:30},()=>({x:600,y:380,color:'void',enemy:true})));
 const s=lightingStats();assert.equal(s.active,s.adaptiveLimit);assert.equal(s.shadowSources,4);
 configureLighting(false,'high');stepLighting(.016,0,1);assert.equal(lightingStats().shadowSources,0);
 resetLighting();configureLighting(true,'high');setLightingDensity(1);
});
