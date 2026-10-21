import test from 'node:test';
import assert from 'node:assert/strict';
import {materialDynamics,stepMaterialParticle,footprintBounds,footprintVisible,appendProjectileTrail} from '../public/effect-materials.js';
const particle=type=>({type,x:0,y:0,z:40,vx:100,vy:40,vz:20,life:1,total:1,rotation:0,seed:.7});
test('material motion separates falling metal, fluttering leaves and rising cinders',()=>{
 const metal=particle('metal'),leaf=particle('leaf'),ember=particle('ember');
 for(let i=0;i<20;i++)for(const p of [metal,leaf,ember]){p.life-=1/60;stepMaterialParticle(p,1/60);}
 assert.ok(metal.z<leaf.z&&leaf.z<ember.z);assert.ok(ember.vz>20);assert.ok(metal.rotation>leaf.rotation);
 const repeat=particle('leaf');for(let i=0;i<20;i++){repeat.life-=1/60;stepMaterialParticle(repeat,1/60);}assert.deepEqual(repeat,leaf);
});
test('all materials settle without negative height or nonfinite pooled state',()=>{
 for(const type of ['spark','chip','metal','splinter','leaf','ember','shard','mote','dust','smoke']){
  const p=particle(type);p.z=.01;p.vz=-50;for(let i=0;i<180;i++){p.life-=1/60;stepMaterialParticle(p,1/60);assert.ok(p.z>=0);for(const key of ['x','y','z','vx','vy','vz','rotation'])assert.ok(Number.isFinite(p[key]),type+' '+key);}
 }
 assert.equal(materialDynamics('unknown'),materialDynamics('chip'));
});
test('rotated impact footprint culling includes every lane corner and excludes distant scarring',()=>{
 const h={shape:'line',x:600,y:380,angle:.71,length:420,width:90},a=footprintBounds(h);
 for(const x of [-210,210])for(const y of [-45,45]){
  const px=h.x+x*Math.cos(h.angle)-y*Math.sin(h.angle),py=h.y+x*Math.sin(h.angle)+y*Math.cos(h.angle);
  assert.ok(px>=a.left-1e-8&&px<=a.right+1e-8&&py>=a.top-1e-8&&py<=a.bottom+1e-8);
 }
 assert.equal(footprintVisible(h,{left:0,right:100,top:0,bottom:100}),false);
 assert.equal(footprintVisible(h,a),true);assert.equal(footprintVisible(h,null),true);
 assert.deepEqual(footprintBounds({x:10,y:20,r:5,inner:2}),{left:5,right:15,top:15,bottom:25});
});
test('projectile trails follow actual turns, remain bounded and break at teleports',()=>{
 let trail=null;for(let i=0;i<20;i++)trail=appendProjectileTrail(trail,{x:i*12,y:i<10?0:(i-10)*8},i/60);
 assert.equal(trail.points.length,5);assert.ok(trail.points[0].y<trail.points.at(-1).y);const before=trail.points.length;
 trail=appendProjectileTrail(trail,{x:trail.x+1,y:trail.y+1},1);assert.equal(trail.points.length,before);
 trail=appendProjectileTrail(trail,{x:900,y:900},2);assert.deepEqual(trail.points,[{x:900,y:900}]);assert.equal(trail.emitX,900);
});
