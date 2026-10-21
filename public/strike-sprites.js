import {frameCacheLayout} from './animation-layout.js';
import {strikeDirection} from './strike-timing.js';
const clips=new Map();let total=0;
export const strikeAssetsReady=fetch(new URL('./assets/strike-frames.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Strike layout unavailable');return r.json();}).then(data=>Promise.all(Object.entries(data).map(async([name,spec])=>{
 const atlas=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=new URL('./assets/'+spec.file,import.meta.url).href;});const images=[];clips.set(name,{spec,images});const[w,h]=spec.nominal;
 for(let i=0;i<spec.frames.length;i++){const f=spec.frames[i],[sx,sy,sw,sh]=f.rect,[px,py]=f.pivot,sc=spec.scale*(f.scale||1),x=w/2+(sx-px)*sc,y=h-9+(sy-py)*sc,layout=frameCacheLayout(w,h,x,y,sw*sc,sh*sc),image=document.createElement('canvas');image.width=layout.cacheWidth;image.height=layout.cacheHeight;image.ironFrame=layout;const c=image.getContext('2d');c.imageSmoothingEnabled=false;
  if(f.spans){c.beginPath();for(const[yy,left,right]of f.spans)c.rect(w/2+(left-px)*sc-layout.left,h-9+(yy-py)*sc-layout.top,(right-left)*sc,sc+.05);c.clip();}
  c.drawImage(atlas,sx,sy,sw,sh,x-layout.left,y-layout.top,sw*sc,sh*sc);images.push(image);total++;if(i%8===7)await new Promise(r=>setTimeout(r,0));
 }return true;
}))).then(r=>r.every(Boolean)).catch(error=>{console.warn('New attack atlas could not be loaded',error);return false;});
export function strikeFrame(pose){if(!pose)return null;const clip=clips.get(pose.clip);if(!clip)return null;const {row,flip}=strikeDirection(pose.direction,clip.spec.mirrorEast,clip.spec.mirrorWest),valid=clip.spec.valid?.[row]||Array.from({length:clip.spec.cols},(_,i)=>i),position=Math.max(0,Math.min(pose.loop?.999999:1,pose.progress))*(pose.loop?valid.length:valid.length-1),index=Math.floor(position),col=valid[index]%clip.spec.cols,image=clip.images[row*clip.spec.cols+col],next=clip.images[row*clip.spec.cols+valid[pose.loop?(index+1)%valid.length:Math.min(valid.length-1,index+1)]%clip.spec.cols],mix=position-index;return image&&next?{image,next,mix,locomotion:!!pose.loop,flip,clip:pose.clip,row,col}:null;}
export function strikeDiagnostics(){return{total,clips:[...clips].map(([name,c])=>({name,cols:c.spec.cols,count:c.images.length}))};}

export const strikeSourceFrame=(name,index)=>clips.get(name)?.images[index]||null;
