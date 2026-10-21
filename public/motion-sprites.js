import {frameCacheLayout} from './animation-layout.js';
import {clamp} from './shared.js';
const clips=new Map();
export const motionSpritesReady=fetch(new URL('./assets/motion-frames.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Motion layout missing');return r.json();}).then(data=>Promise.all(Object.entries(data).map(async([name,spec])=>{
 const atlas=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Motion atlas missing: '+name));i.src=new URL('./assets/'+spec.file,import.meta.url).href;}),images=[];const[w,h]=spec.nominal;
 for(const f of spec.frames){const[sx,sy,sw,sh]=f.rect,[px,py]=f.pivot,sc=spec.scale*(f.scale||1),x=w/2+(sx-px)*sc,y=h-9+(sy-py)*sc,layout=frameCacheLayout(w,h,x,y,sw*sc,sh*sc),image=document.createElement('canvas');image.width=layout.cacheWidth;image.height=layout.cacheHeight;image.ironFrame=layout;const c=image.getContext('2d');c.imageSmoothingEnabled=false;c.beginPath();for(const[yy,left,right]of f.spans)c.rect(w/2+(left-px)*sc-layout.left,h-9+(yy-py)*sc-layout.top,(right-left)*sc,sc+.05);c.clip();c.drawImage(atlas,sx,sy,sw,sh,x-layout.left,y-layout.top,sw*sc,sh*sc);images.push(image);if(images.length%8===0)await new Promise(r=>setTimeout(r,0));}clips.set(name,{spec,images});return true;
}))).then(r=>r.every(Boolean));
export function motionFrame(name,index){const clip=clips.get(name);return clip?.images[Math.max(0,Math.min(clip.images.length-1,Math.floor(index)))]||null;}
export function motionGroupFrame(name,group,progress){const clip=clips.get(name),indices=clip?.spec.groups[group];if(!indices?.length)return null;const t=(progress%1+1)%1;return clip.images[indices[Math.floor(t*indices.length)]];}
export function expressFrame(p,now){if(p.emoteUntil<=now)return null;const image=motionGroupFrame('express-'+p.classId,p.emote,Math.max(0,now-p.emoteAt)/(p.classId==='archer'&&p.emote==='spin'?.7:1.15));return image?{image,flip:false,angle:p.facing,emote:true}:null;}
export function cinemaFrame(b,round,time,now){
 const name='cinema-'+['varkhul','tharazul','azrakiel'][round],age=Math.max(0,now-(b.startedAt??now));
 if(b.state==='dormant')return motionGroupFrame(name,'wake',0);
 if(b.state==='awakening')return age<1.15?motionGroupFrame(name,'wake',Math.min(.9999,age/1.15)):motionGroupFrame(name,'rage',(age-1.15)/.6);
 if(b.state==='transition')return motionGroupFrame(name,'rage',age/.5);
 if(['idle','recover'].includes(b.state))return motionGroupFrame(name,b.phase>1?'rage':'idle',time/.7);
 return null;
}
export function gaitFrame(b,round,phase){const name='gait-'+['varkhul','tharazul','azrakiel'][round],a=b.facing||0,x=Math.cos(a),y=Math.sin(a),direction=Math.abs(x)>.65?(x>0?'east':'west'):y<0?'north':'south';return motionGroupFrame(name,direction,phase);}
export function motionDiagnostics(){return[...clips].map(([name,{spec,images}])=>({name,count:images.length,cols:spec.cols,rows:spec.rows,groups:Object.fromEntries(Object.entries(spec.groups).map(([k,v])=>[k,v.length]))}));}
