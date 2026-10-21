import test from'node:test';import assert from'node:assert/strict';
import {comicSequenceShot,comicPanelMotion,comicPanelRects,comicCaption}from'../public/comic-timing.js';
test('comic director follows absolute time for openings, five-second interludes and endings',()=>{
 for(const duration of [5,9,9.6]){
  assert.equal(comicSequenceShot(-.01,duration),null);assert.equal(comicSequenceShot(duration,duration),null);
  for(let index=0;index<3;index++){const s=comicSequenceShot((index+.5)*duration/3,duration);assert.equal(s.index,index);assert.ok(Math.abs(s.progress-.5)<1e-10);assert.ok(s.opacity>0);}
 }
 assert.equal(comicSequenceShot(3.099,9.6,[0,3.1,6.3,9.6]).index,0);assert.equal(comicSequenceShot(3.1,9.6,[0,3.1,6.3,9.6]).index,1);
 assert.equal(comicSequenceShot(6.3,9.6,[0,3.1,6.3,9.6]).index,2);assert.equal(comicSequenceShot(1,5,[0,4,3,5]),null);
});
test('panels reveal only in order and reduced motion disables camera and particle choreography',()=>{
 const s=comicSequenceShot(4,9.6,[0,3.1,6.3,9.6]);
 assert.equal(comicPanelMotion(s,0).reveal,1);assert.equal(comicPanelMotion(s,2).reveal,0);
 const active=comicPanelMotion(s,1);assert.ok(active.zoom>1&&active.particles>0&&active.opacity===1);
 const reduced=comicPanelMotion(s,1,true);assert.equal(reduced.reveal,1);assert.equal(reduced.zoom,1);assert.equal(reduced.pan,0);assert.equal(reduced.particles,0);
 const start=comicSequenceShot(3.1,9.6,[0,3.1,6.3,9.6]);assert.equal(comicPanelMotion(start,1).reveal,0);assert.equal(comicPanelMotion(start,0).zoom,1.028);
});
test('comic registration preserves panel aspect and never samples adjacent source rows',()=>{
 for(const rows of [[0,345,669,1024],[0,1/3,2/3,1]]){
  const panels=comicPanelRects(1536,1024,rows);assert.equal(panels.length,3);
  for(const p of panels){assert.ok(p.y>=48&&p.y+p.h<=685);assert.ok(p.sy>=0&&p.sy+p.sh<=1024);assert.ok(Math.abs(p.w/p.h-p.sw/p.sh)<1e-9);}
  for(let i=1;i<3;i++)assert.ok(panels[i].y-(panels[i-1].y+panels[i-1].h)>=6.99);
 }
 assert.deepEqual(comicPanelRects(0,1024),[]);assert.deepEqual(comicPanelRects(1536,1024,[0,.7,.5,1]),[]);
});
test('caption reveal keeps the full sentence available for reduced motion and reading time',()=>{
 const text='TRÊS DESTINOS · UMA COROA';assert.equal(comicCaption(text,{progress:0},true),text);assert.equal(comicCaption(text,{progress:0}), '');assert.equal(comicCaption(text,{progress:.4}),text);assert.equal(comicCaption(text,{progress:1}),text);
});
