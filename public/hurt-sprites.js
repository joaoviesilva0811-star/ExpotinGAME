import {frameCacheLayout} from './animation-layout.js';
const clips=new Map(),reactions=new Map();
export const hurtSpritesReady=fetch(new URL('./assets/hurt-frames.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Hurt frames missing');return r.json();}).then(data=>Promise.all(Object.entries(data).map(([name,spec])=>new Promise(resolve=>{
 const atlas=new Image();atlas.onerror=()=>resolve(false);atlas.onload=()=>{const [w,h]=spec.nominal;
  const images=spec.frames.map((f,index)=>{const[sx,sy,sw,sh,center]=f,sc=spec.scale,x=w/2+(sx-center)*sc,y=h-9-sh*sc,layout=frameCacheLayout(w,h,x,y,sw*sc,sh*sc),image=document.createElement('canvas');image.width=layout.cacheWidth;image.height=layout.cacheHeight;image.ironFrame=layout;const c=image.getContext('2d');c.imageSmoothingEnabled=false;if(spec.flipRows?.includes(Math.floor(index/4))){c.translate(layout.cacheWidth,0);c.scale(-1,1);}c.drawImage(atlas,sx,sy,sw,sh,x-layout.left,y-layout.top,sw*sc,sh*sc);if(spec.flipRows?.includes(Math.floor(index/4)))image.ironFrame={...layout,left:w-layout.left-layout.cacheWidth};return image;});clips.set(name,images);resolve(true);
 };atlas.src=new URL('./assets/'+spec.file,import.meta.url).href;
})))).then(r=>r.every(Boolean)).catch(()=>false);
export function hurtFrame(p,name,now){
 const stamp=p.lastHurt??p.hurtAt??-10,key=p.id||name;let state=reactions.get(key);if(!state){state={seen:-10,played:-10};reactions.set(key,state);}
 if(stamp>state.seen){state.seen=stamp;if(stamp-state.played>.28)state.played=stamp;}
 const age=now-state.played;if(age<0||age>=.34||p.hp<=0)return null;
 const a=p.facing||0,x=Math.cos(a),y=Math.sin(a),row=Math.abs(x)>.65?(x>0?1:3):(y<0?2:0),col=Math.min(3,Math.floor(age/.34*4));return clips.get(name)?.[row*4+col]||null;
}
export function hurtSpriteDiagnostics(){return [...clips].map(([name,images])=>({name,count:images.length,frames:images.map(image=>({width:image.width,height:image.height,layout:image.ironFrame}))}));}
export function resetHurtReactions(){reactions.clear();}
