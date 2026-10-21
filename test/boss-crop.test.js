import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{HurtCamera}from'../public/hurt-camera.js';import{ImpactFeel}from'../public/impact-feel.js';
test('Varkhul attack crops contain one torso and never admit a neighbouring body marker',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/assets/strike-frames.json',import.meta.url)));
 for(const name of ['varkhul-riposte','varkhul-chains']){
  const s=data[name];assert.equal(s.registration,'body-marker-exact-runs');assert.equal(s.frames.length,s.rows*s.cols);
  for(const f of s.frames){const contains=(x,y)=>f.spans.some(([yy,l,r])=>yy===y&&l<=x&&x<r);assert.ok(contains(...f.bodySeed));
   for(const p of s.bodyMarkers)if(p[0]!==f.bodySeed[0]||p[1]!==f.bodySeed[1])assert.equal(contains(...p),false,name+' included a second torso');
  }
 }
});
test('normal damage and knight impacts have a visible stronger pulse while zero strength remains still',()=>{
 const h=new HurtCamera();h.hit(0,14,false,160);assert.ok(h.step(.025,.45).x>2);assert.equal(h.step(.01,0).x,0);
 const i=new ImpactFeel();i.hit('knight',0,25,1);assert.ok(i.step(.02,.45).x>1.5);assert.equal(i.step(.01,0).x,0);
});
