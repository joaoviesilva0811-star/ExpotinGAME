import {frameCacheLayout} from './animation-layout.js';
const clips=new Map();
export const bossWalkReady=fetch(new URL('./assets/boss-walk-frames.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Walk frames missing');return r.json();}).then(data=>Promise.all(Object.entries(data).map(([name,spec])=>new Promise(resolve=>{
 const atlas=new Image();atlas.onerror=()=>resolve(false);atlas.onload=()=>{
  const images=spec.frames.map((f,index)=>{const [sx,sy,sw,sh,center]=f,sc=spec.scale,x=105+(sx-center)*sc,y=201-sh*sc,layout=frameCacheLayout(210,210,x,y,sw*sc,sh*sc),image=document.createElement('canvas');image.width=layout.cacheWidth;image.height=layout.cacheHeight;image.ironFrame=layout;const c=image.getContext('2d');c.imageSmoothingEnabled=false;if(spec.spans?.[index]){c.beginPath();for(const[y0,x0,x1]of spec.spans[index])c.rect(x+(x0-sx)*sc-layout.left,y+(y0-sy)*sc-layout.top,(x1-x0)*sc,sc+.1);c.clip();}c.drawImage(atlas,sx,sy,sw,sh,x-layout.left,y-layout.top,sw*sc,sh*sc);return image;});clips.set(name,images);resolve(true);
 };atlas.src=new URL('./assets/'+spec.file,import.meta.url).href;
})))).then(results=>results.every(Boolean)).catch(()=>false);
export function bossWalkFrame(name,direction,position){const images=clips.get(name+'-'+direction);return images?.[Math.floor(position)%12]||null;}
export function bossWalkDiagnostics(){return [...clips].map(([name,images])=>({name,count:images.length,frames:images.map(image=>({width:image.width,height:image.height,layout:image.ironFrame}))}));}
