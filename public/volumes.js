import {baseEffect} from './effect-variants.js';
// Cache whole source cells, including transparent gutters. The ground pivot and
// maximum silhouette width are shared by all six frames, so no pose is trimmed,
// stretched to match another pose, or displaced when the plume expands.
const models={},glows=[],rowOf=kind=>kind==='green'?1:kind==='violet'?2:0;
const original=kind=>['redEruption','rootEruption','crystalEruption'][rowOf(kind)];
const diagnostics=[];
function loadEffect(file,name,rects){return new Promise(resolve=>{
 const atlas=new Image();atlas.onerror=()=>resolve(false);atlas.onload=()=>{
  {
   const frames=[];let span=1;
   for(let frame=0;frame<rects.length;frame++){
    // Actual transparent gutters define each complete source rectangle.
    // Dividing the image into equal cells would cut some portal bases.
    const [sx,sy,sw,sh]=rects[frame];
    const padding=12,image=document.createElement('canvas');image.width=sw+padding*2;image.height=sh+padding*2;const c=image.getContext('2d');c.imageSmoothingEnabled=false;
    c.drawImage(atlas,sx,sy,sw,sh,padding,padding,sw,sh);
    const pixels=c.getImageData(padding,padding,sw,sh).data;let left=sw,top=sh,right=-1,bottom=-1,edgePixels=0;const strongEdges=[0,0,0,0];
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(pixels[(y*sw+x)*4+3]>16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);if(x<3||y<3||x>=sw-3||y>=sh-3)edgePixels++;if(pixels[(y*sw+x)*4+3]>110){if(x<2)strongEdges[0]++;if(y<2)strongEdges[1]++;if(x>=sw-2)strongEdges[2]++;if(y>=sh-2)strongEdges[3]++;}}
    const bounds={left,top,right,bottom};diagnostics.push({model:name,col:frame,sw,sh,edgePixels,sourceEdgeMax:Math.max(...strongEdges),bounds});
    span=Math.max(span,right-left+1);
    // Register the actual ground contact, since each source pose can sit at
    // a different height inside its generously padded cell. Never crop to it.
    let weight=0,weightedX=0;
    for(let y=Math.max(top,bottom-14);y<=bottom;y++)for(let x=left;x<=right;x++){const a=pixels[(y*sw+x)*4+3];if(a>16){weight+=a;weightedX+=x*a;}}
    frames.push({image,pivotX:padding+(weight?weightedX/weight:sw*.5),pivotY:padding+bottom,centerX:padding+(left+right)/2,centerY:padding+(top+bottom)/2,padding});
   }
   models[name]={frames,span};
  }resolve(true);
 };atlas.src=new URL('./assets/'+file,import.meta.url).href;
});}
export const volumeAssetsReady=Promise.all(['effect-frames.json','variant-frames.json'].map(file=>fetch(new URL('./assets/'+file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Effect coordinates unavailable');return r.json();}))).then(parts=>Object.assign({},...parts)).then(layout=>Promise.all(Object.entries(layout).map(([name,spec])=>loadEffect(spec.file,name,spec.frames)))).then(results=>results.every(Boolean)).catch(()=>false);
export function volumeFrameDiagnostics(){return diagnostics.map(d=>({...d,bounds:{...d.bounds}}));}
for(let row=0;row<3;row++){
 const glow=document.createElement('canvas');glow.width=glow.height=128;const c=glow.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,['#ffdca7','#d9ff9e','#eee0ff'][row]);g.addColorStop(.2,['#f69d53bb','#8adf58bb','#b790f3bb'][row]);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,128,128);glows[row]=glow;
}
export function createVolumes(h,points,model){
 const family=baseEffect(model),sweep=family==='steelSweep'||family==='voidSweep';
 if(sweep){
  if(h.shape==='line'){const n=Math.min(5,Math.ceil(h.length/130));return Array.from({length:n},(_,i)=>{const d=(i+.5)/n*h.length-h.length/2;return{x:h.x+Math.cos(h.angle)*d,y:h.y+Math.sin(h.angle)*d,width:Math.max(150,h.width*2),delay:i*.045,angle:h.angle};});}
  const d=h.r*.45;return[{x:h.x+Math.cos(h.angle)*d,y:h.y+Math.sin(h.angle)*d,width:h.r*1.8,delay:0,angle:h.angle}];
 }
 if(family==='stoneWave')return[{x:h.x,y:h.y,width:h.r*2.5,delay:0,ground:true}];
 const count=Math.min(family==='ironChains'?9:family==='voidRift'?12:22,Math.max(6,Math.ceil(points.length/4))),out=[];
 for(let i=0;i<count&&points.length;i++){const p=points[Math.min(points.length-1,Math.floor((i+.5)*points.length/count))];out.push({x:p.x,y:p.y,width:(family==='poisonCloud'?155:130)+p.seed%64,delay:(p.seed%5)*.025,flip:p.seed%2===0});}
 if(!h.inner&&h.shape!=='line')out.push({x:h.x,y:h.y,width:Math.min(300,Math.max(185,h.r*1.35)),delay:0,flip:false});
 return out.sort((a,b)=>a.y-b.y);
}
function rasterFrame(asset,f,width){
 // Keep the full frame and its pivot; only cache a smaller render texture.
 const bucket=[64,96,144,192,256,384].find(n=>n>=width);
 if(!bucket)return{image:f.image,ratio:1};
 f.scaled??=new Map();let out=f.scaled.get(bucket);if(out)return out;
 const ratio=bucket/asset.span,image=document.createElement('canvas');image.width=Math.ceil(f.image.width*ratio)+4;image.height=Math.ceil(f.image.height*ratio)+4;const c=image.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(f.image,0,0,f.image.width*ratio,f.image.height*ratio);out={image,ratio};f.scaled.set(bucket,out);return out;
}
export function drawVolume(c,kind,x,y,width,progress,opacity=1,flip=false,model=original(kind),angle=0){
 const asset=models[model];if(!asset||progress<0||progress>=1)return false;
 const f=asset.frames[Math.min(asset.frames.length-1,Math.floor(progress*asset.frames.length))],scale=width/asset.span,sweep=baseEffect(model)==='steelSweep'||baseEffect(model)==='voidSweep',ground=baseEffect(model)==='stoneWave';
 c.save();c.globalAlpha*=opacity*Math.min(1,(1-progress)*3);c.translate(x,y);
 if(sweep)c.rotate(angle);
 // Flat impacts pivot around their visible center; upright plumes remain
 // registered to the same ground point throughout the full animation.
 const pivotY=sweep||ground?f.centerY:f.pivotY,pivotX=sweep||ground?f.centerX:f.pivotX;
 const raster=rasterFrame(asset,f,width),r=scale/raster.ratio;c.scale(flip?-r:r,r);c.drawImage(raster.image,-pivotX*raster.ratio,-pivotY*raster.ratio);c.restore();return true;
}
export function drawVolumeGlow(c,kind,x,y,r,alpha){c.save();c.globalCompositeOperation='screen';c.globalAlpha*=alpha;c.drawImage(glows[rowOf(kind)],x-r,y-r*.65,r*2,r*1.3);c.restore();}
function drawCentered(c,model,index,width){const asset=models[model];if(!asset)return false;const f=asset.frames[index],scale=width/asset.span;c.save();const raster=rasterFrame(asset,f,width),r=scale/raster.ratio;c.scale(r,r);c.drawImage(raster.image,-f.centerX*raster.ratio,-f.centerY*raster.ratio);c.restore();return true;}
export function drawSmoke(c,p){
 c.save();c.globalAlpha*=.32;c.translate(p.x,p.y-p.z);c.rotate(p.rotation*.08);const drawn=drawCentered(c,p.kind==='green'?'poisonCloud':p.kind==='violet'?'voidRift':'stoneWave',p.life/p.total>.5?4:5,p.size*(2.2-p.life/p.total*.5));c.restore();return drawn;
}
export function drawMissileVolume(c,kind,time){
 const model=kind==='green'?'poisonCloud':kind==='red'?'steelSweep':'voidSweep';
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=.6;c.translate(-12,0);drawCentered(c,model,2+Math.floor(time*9)%2,57);c.globalAlpha=.25;c.translate(-30,0);drawCentered(c,model,4,60);c.restore();
}

export async function prewarmVolumes(){await volumeAssetsReady;let n=0;for(const asset of Object.values(models))for(const f of asset.frames)for(const width of [144,192,256]){rasterFrame(asset,f,width);if(++n%8===0)await new Promise(r=>setTimeout(r,0));}return n;}

export function volumeDuration(model){return Math.max(.24,Math.min(.8,(models[model]?.frames.length||6)*.085));}
