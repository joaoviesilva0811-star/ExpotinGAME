// Original atlases are preserved; only registered, feathered runtime caches are drawn.
const models={},glows=[],rowOf=kind=>kind==='green'?1:kind==='violet'?2:0;
const original=kind=>['redEruption','rootEruption','crystalEruption'][rowOf(kind)];
function loadAtlas(file,names,xs,ys,baseW,baseH){return new Promise(resolve=>{
 const atlas=new Image();atlas.onerror=()=>resolve(false);atlas.onload=()=>{
  const cw=atlas.width/6,ch=atlas.height/3;
  names.forEach((name,row)=>{
   const frames=[];
   for(let col=0;col<6;col++){
    const image=document.createElement('canvas');image.width=320;image.height=360;const c=image.getContext('2d');c.imageSmoothingEnabled=false;
    const scale=Math.min(300/cw,340/ch),dx=160-(xs[col]/baseW*atlas.width-col*cw)*scale,dy=345-(ys[row]/baseH*atlas.height-row*ch)*scale;
    c.drawImage(atlas,col*cw,row*ch,cw,ch,dx,dy,cw*scale,ch*scale);
    c.globalCompositeOperation='destination-in';const edge=c.createLinearGradient(dx,0,dx+cw*scale,0);edge.addColorStop(0,'transparent');edge.addColorStop(.075,'#fff');edge.addColorStop(.925,'#fff');edge.addColorStop(1,'transparent');c.fillStyle=edge;c.fillRect(0,0,320,360);
    const top=c.createLinearGradient(0,dy,0,dy+ch*scale);top.addColorStop(0,'transparent');top.addColorStop(.045,'#fff');top.addColorStop(1,'#fff');c.fillStyle=top;c.fillRect(0,0,320,360);frames.push(image);
   }
   models[name]=frames;
  });resolve(true);
 };atlas.src=new URL('./assets/'+file,import.meta.url).href;
});}
export const volumeAssetsReady=Promise.all([
 loadAtlas('fx-eruptions.png',['redEruption','rootEruption','crystalEruption'],[106,334,639,899,1165,1433],[334,667,994],1536,1024),
 loadAtlas('fx-physical.png',['steelSweep','stoneWave','poisonCloud'],[145,440,750,1050,1345,1650],[264,553,862],1800,900),
 loadAtlas('fx-occult.png',['voidSweep','voidRift','ironChains'],[150,445,745,1045,1345,1650],[276,563,866],1800,900)
]).then(results=>results.every(Boolean));
for(let row=0;row<3;row++){
 const glow=document.createElement('canvas');glow.width=glow.height=128;const c=glow.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,['#ffdca7','#d9ff9e','#eee0ff'][row]);g.addColorStop(.2,['#f69d53bb','#8adf58bb','#b790f3bb'][row]);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,128,128);glows[row]=glow;
}
export function createVolumes(h,points,model){
 const sweep=model==='steelSweep'||model==='voidSweep';
 if(sweep){
  if(h.shape==='line'){const n=Math.min(5,Math.ceil(h.length/130));return Array.from({length:n},(_,i)=>{const d=(i+.5)/n*h.length-h.length/2;return{x:h.x+Math.cos(h.angle)*d,y:h.y+Math.sin(h.angle)*d,width:Math.max(150,h.width*2),delay:i*.045,angle:h.angle};});}
  const d=h.r*.45;return[{x:h.x+Math.cos(h.angle)*d,y:h.y+Math.sin(h.angle)*d,width:h.r*1.8,delay:0,angle:h.angle}];
 }
 if(model==='stoneWave')return[{x:h.x,y:h.y,width:h.r*2.5,delay:0,ground:true}];
 const count=Math.min(model==='ironChains'?9:model==='voidRift'?12:22,Math.max(6,Math.ceil(points.length/4))),out=[];
 for(let i=0;i<count&&points.length;i++){const p=points[Math.min(points.length-1,Math.floor((i+.5)*points.length/count))];out.push({x:p.x,y:p.y,width:(model==='poisonCloud'?155:130)+p.seed%64,delay:(p.seed%5)*.025,flip:p.seed%2===0});}
 if(!h.inner&&h.shape!=='line')out.push({x:h.x,y:h.y,width:Math.min(300,Math.max(185,h.r*1.35)),delay:0,flip:false});
 return out.sort((a,b)=>a.y-b.y);
}
export function drawVolume(c,kind,x,y,width,progress,opacity=1,flip=false,model=original(kind),angle=0){
 const frames=models[model];if(!frames||progress<0||progress>=1)return false;
 const image=frames[Math.min(5,Math.floor(progress*6))],height=width*360/320,sweep=model==='steelSweep'||model==='voidSweep',ground=model==='stoneWave';
 c.save();c.globalAlpha*=opacity*Math.min(1,(1-progress)*3);c.translate(x,y);
 if(sweep){c.rotate(angle);c.scale(1,.78);c.translate(0,height*.29);}else if(ground){c.scale(1,.72);c.translate(0,height*.29);}
 if(flip)c.scale(-1,1);c.drawImage(image,-width/2,-height*345/360,width,height);c.restore();return true;
}
export function drawVolumeGlow(c,kind,x,y,r,alpha){c.save();c.globalCompositeOperation='screen';c.globalAlpha*=alpha;c.drawImage(glows[rowOf(kind)],x-r,y-r*.65,r*2,r*1.3);c.restore();}
export function drawSmoke(c,p){
 const frames=models[p.kind==='green'?'poisonCloud':p.kind==='violet'?'voidRift':'stoneWave'];if(!frames)return false;
 const image=frames[p.life/p.total>.5?4:5],width=p.size*(2.2-p.life/p.total*.5);
 c.save();c.globalAlpha*=.32;c.translate(p.x,p.y-p.z);c.rotate(p.rotation*.08);c.drawImage(image,-width/2,-width*.83,width,width*1.125);c.restore();return true;
}
export function drawMissileVolume(c,kind,time){
 const frames=models[kind==='green'?'poisonCloud':kind==='red'?'steelSweep':'voidSweep'];if(!frames)return;
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=.6;c.drawImage(frames[2+Math.floor(time*9)%2],-40,-18,57,38);c.globalAlpha=.25;c.drawImage(frames[4],-73,-20,60,42);c.restore();
}
