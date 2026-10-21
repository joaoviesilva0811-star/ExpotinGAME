import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{strikeDirection}from'../public/strike-timing.js';
test('walking inbetweens keep base phase timings, use complete sources and count only reachable drawings',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/assets/stride-frames.json',import.meta.url))),base=JSON.parse(readFileSync(new URL('../public/assets/strike-frames.json',import.meta.url)));let count=0;
 for(const[name,spec]of Object.entries(data)){const reachable=new Set(Array.from({length:8},(_,d)=>strikeDirection(d,spec.mirrorEast).row)),used=new Set();
  spec.cycles.forEach((cycle,row)=>{let last=-1;for(const f of cycle){assert.ok(f.phase>last&&f.phase>=0&&f.phase<1);last=f.phase;if(f.source==='new'){assert.equal(spec.frames[f.index].sourceEdge,false);if(reachable.has(row))used.add(f.index);}else{const order=base[name+'-walk'].valid[row].indexOf(f.index);assert.equal(f.phase,order/base[name+'-walk'].valid[row].length);}}});count+=used.size;
 }assert.equal(count,20);
});
