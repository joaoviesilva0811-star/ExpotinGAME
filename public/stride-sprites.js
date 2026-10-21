import {frameCacheLayout} from './animation-layout.js';
import {strikeDirection} from './strike-timing.js';
import {strikeSourceFrame,strikeAssetsReady} from './strike-sprites.js';
const clips=new Map();
export const strideAssetsReady=Promise.all([strikeAssetsReady,fetch(new URL('./assets/stride-frames.json',import.meta.url)).then(r=>r.json())]).then(async([,specs])=>{
 for(const [name,spec]of Object.entries(specs)){
  const atlas=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=new URL('./assets/'+spec.file,import.meta.url).href;}),images=new Map();
  const reachable=new Set(Array.from({length:8},(_,d)=>strikeDirection(d,spec.mirrorEast).row)),used=new Set([...reachable].flatMap(row=>spec.cycles[row].filter(f=>f.source==='new').map(f=>f.index)));
  for(const i of used){const f=spec.frames[i],[sx,sy,sw,sh]=f.rect,[px,py]=f.pivot,sc=spec.scale,x=50+(sx-px)*sc,y=83+(sy-py)*sc,l=frameCacheLayout(100,92,x,y,sw*sc,sh*sc),a=document.createElement('canvas');a.width=l.cacheWidth;a.height=l.cacheHeight;a.ironFrame=l;const c=a.getContext('2d');c.imageSmoothingEnabled=false;c.beginPath();for(const[yy,left,right]of f.spans)c.rect(50+(left-px)*sc-l.left,83+(yy-py)*sc-l.top,(right-left)*sc,sc+.05);c.clip();c.drawImage(atlas,sx,sy,sw,sh,x-l.left,y-l.top,sw*sc,sh*sc);images.set(i,a);}
  clips.set(name,{spec,images});
 }return true;
}).catch(()=>false);
export function strideFrame(name,direction,phase){
 const clip=clips.get(name);if(!clip)return null;const {row,flip}=strikeDirection(direction,clip.spec.mirrorEast),cycle=clip.spec.cycles[row],t=(phase%1+1)%1;let best=null,distance=2;
 for(const f of cycle){const d=Math.abs(t-f.phase),wrap=Math.min(d,1-d);if(wrap<distance){distance=wrap;best=f;}}
 const image=best.source==='new'?clip.images.get(best.index):strikeSourceFrame(name+'-walk',best.index);return image?{image,flip,locomotion:true}:null;
}
export function strideDiagnostics(){return[...clips].map(([name,c])=>({name,newPoses:c.images.size,cycles:c.spec.cycles.map(v=>v.length)}));}
