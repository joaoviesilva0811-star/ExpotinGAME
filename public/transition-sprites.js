import {frameCacheLayout} from './animation-layout.js';
import {TransitionTiming} from './transition-timing.js';
const clips=new Map(),timing=new TransitionTiming();
export const transitionAssetsReady=fetch(new URL('./assets/transition-frames.json',import.meta.url)).then(r=>r.json()).then(data=>Promise.all(Object.entries(data).map(async([name,spec])=>{
 const atlas=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=new URL('./assets/'+spec.file,import.meta.url).href;}),images=[];
 for(const f of spec.frames){const[sx,sy,sw,sh]=f.rect,[px,py]=f.pivot,sc=spec.scale*(f.scale||1),x=50+(sx-px)*sc,y=83+(sy-py)*sc,layout=frameCacheLayout(100,92,x,y,sw*sc,sh*sc),image=document.createElement('canvas');image.width=layout.cacheWidth;image.height=layout.cacheHeight;image.ironFrame=layout;const c=image.getContext('2d');c.imageSmoothingEnabled=false;c.beginPath();for(const[yy,l,r]of f.spans)c.rect(50+(l-px)*sc-layout.left,83+(yy-py)*sc-layout.top,(r-l)*sc,sc+.05);c.clip();c.drawImage(atlas,sx,sy,sw,sh,x-layout.left,y-layout.top,sw*sc,sh*sc);images.push(image);if(images.length%8===0)await new Promise(r=>setTimeout(r,0));}clips.set(name,{spec,images});return true;
}))).then(r=>r.every(Boolean));
export function transitionFrame(p,now){const pose=timing.sample(p,now),clip=clips.get('transit-'+p.classId);if(!pose||!clip||p.classId==='archer'&&pose.direction==='north')return null;const mirror=pose.direction==='west'&&!clip.spec.groups[pose.group],group=mirror?pose.group.replace('west','east'):pose.group;const ids=clip.spec.groups[group];if(!ids?.length)return null;return{image:clip.images[ids[Math.floor(pose.progress*ids.length)]],flip:mirror,angle:p.facing,transition:pose.group};}
export function resetTransitions(){timing.clear();}
export const transitionDiagnostics=()=>[...clips].map(([name,{spec}])=>({name,groups:Object.fromEntries(Object.entries(spec.groups).map(([n,v])=>[n,v.length])),usable:Object.values(spec.groups).reduce((n,v)=>n+v.length,0)}));

export const transitionSourceFrame=(name,index)=>clips.get(name)?.images[index]||null;
