import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {frameCacheLayout,drawAnimatedFrame} from '../public/animation-layout.js';
test('all 732 stored poses retain weapons and raised limbs beyond the original body canvas',()=>{
 const meta=JSON.parse(readFileSync(new URL('../public/assets/animation-frames.json',import.meta.url)));let count=0,formerlyClipped=0;
 for(const [name,info]of Object.entries(meta)){
  const boss=['varkhul','tharazul','azrakiel'].some(n=>name.includes(n)),w=boss?210:100,h=boss?210:92;
  const file=(name.startsWith('direction-')||name.startsWith('emote-')?name:'animation-'+name)+'.png',png=readFileSync(new URL('../public/assets/'+file,import.meta.url)),cw=png.readUInt32BE(16)/6;
  for(const row of info.frames)for(const [col,[sx,sy,sw,sh]]of row.entries()){
   const x=w/2+(sx-(col+.5)*cw)*info.scale,y=h-sh*info.scale-9,dw=sw*info.scale,dh=sh*info.scale,l=frameCacheLayout(w,h,x,y,dw,dh);
   if(x<0||y<0||x+dw>w||y+dh>h)formerlyClipped++;
   assert.ok(x-l.left>=8&&y-l.top>=8);assert.ok(x-l.left+dw<=l.cacheWidth-8&&y-l.top+dh<=l.cacheHeight-8);count++;
  }
 }
 assert.equal(count,732);assert.equal(formerlyClipped,113);
});
test('padded frames preserve body position and scale, including scaled and fallen poses',()=>{
 const calls=[],ctx={drawImage:(...args)=>calls.push(args)},image={width:140,height:110,ironFrame:{left:-20,top:-18,width:100,height:92}};
 drawAnimatedFrame(ctx,image,-50,-77,100,92);assert.deepEqual(calls.pop(),[image,-70,-95,140,110]);
 drawAnimatedFrame(ctx,image,200,300,210,105);const a=calls.pop();assert.equal(a[1],158);assert.ok(Math.abs(a[2]-(300-18*105/92))<1e-9);assert.equal(a[3],294);
});
