import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../server/engine.js';
import {archerPose,facingRow} from '../public/animation-state.js';

test('archer keeps eight aiming poses while waiting, strafing, taking damage and releasing the bow',()=>{
 const rows=new Set();
 for(let i=0;i<8;i++){
  const facing=Math.PI/2-i*Math.PI/4,p={facing,vx:90,vy:0,aiming:true,attackAt:10,attackFor:.52,attackSlot:-1,lastHurt:10.15};
  const draw=archerPose(p,10.1),release=archerPose(p,10.175),hold=archerPose(p,10.9);rows.add(draw.row);
  assert.equal(draw.row,i);assert.ok(draw.col<3);assert.equal(release.col,3);assert.equal(hold.row,i);assert.equal(hold.phase,'aim');assert.equal(hold.col,1);
  p.aiming=false;p.vx=0;assert.equal(archerPose(p,11).row,i);
 }
 assert.equal(rows.size,8);assert.equal(facingRow(Math.PI*2),facingRow(0));
});

test('input followed immediately by a skill fires exactly along cardinal and diagonal aim, including zero components',()=>{
 for(const[ax,ay]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
  const r=new Room('IRON-AIM123','a','Aim'),p=r.add('a','Lyra');r.select('a','archer');p.ready=true;r.start('a');r.tick(r.transitionAt-r.now+.01);
  r.command(p.id,{type:'input',seq:1,x:0,y:0,ax,ay});
  // No intervening tick: skill and pose must use the just-accepted input.
  r.command(p.id,{type:'skill',slot:0,seq:2});const arrow=r.projectiles[0],n=Math.hypot(ax,ay);
  assert.ok(arrow);assert.ok(Math.abs(arrow.vx-640*ax/n)<1e-8);assert.ok(Math.abs(arrow.vy-640*ay/n)<1e-8);
  assert.equal(p.facing,Math.atan2(ay,ax));assert.equal(r.events.at(-1).angle,p.facing);
  assert.equal(r.dodge(p),true);const speed=86/.24;assert.ok(Math.abs(p.dodgeVX-speed*ax/n)<1e-8);assert.ok(Math.abs(p.dodgeVY-speed*ay/n)<1e-8);
 }
});
