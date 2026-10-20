import {frameCacheLayout} from './animation-layout.js';
import {rescuePose} from './rescue-timing.js';
const clips=new Map();
export const rescueSpritesReady=fetch(new URL('./assets/rescue-frames.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Rescue frames missing');return r.json();}).then(data=>Promise.all(Object.entries(data).map(async([name,spec])=>{
 const atlas=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=new URL('./assets/'+spec.file,import.meta.url).href;}),images=[];
 const [w,h]=spec.nominal;
 for(const f of spec.frames){const[sx,sy,sw,sh]=f.rect,[px,py]=f.pivot,sc=spec.scale,x=w/2+(sx-px)*sc,y=h-9+(sy-py)*sc,layout=frameCacheLayout(w,h,x,y,sw*sc,sh*sc),image=document.createElement('canvas');image.width=layout.cacheWidth;image.height=layout.cacheHeight;image.ironFrame=layout;
  const c=image.getContext('2d');c.imageSmoothingEnabled=false;c.beginPath();for(const[yy,left,right]of f.spans)c.rect(w/2+(left-px)*sc-layout.left,h-9+(yy-py)*sc-layout.top,(right-left)*sc,sc+.05);c.clip();c.drawImage(atlas,sx,sy,sw,sh,x-layout.left,y-layout.top,sw*sc,sh*sc);images.push(image);
 }
 clips.set(name,images);return true;
}))).then(r=>r.every(Boolean)).catch(error=>{console.warn('Rescue atlas unavailable',error);return false;});
export function rescueFrame(p,now){const pose=rescuePose(p,now),images=clips.get(p.classId);if(!pose||!images)return null;const n=Math.floor(pose.position),mix=pose.position-n;return{image:images[pose.row*8+n],next:images[pose.row*8+Math.min(7,n+1)],mix,flip:false,downPose:!!pose.downPose,rescue:true,phase:pose.phase,angle:p.facing};}
export function rescueDiagnostics(){return[...clips].map(([name,images])=>({name,count:images.length}));}

export function rescueSourceFrame(name,row,col){return clips.get(name)?.[row*8+col]||null;}
