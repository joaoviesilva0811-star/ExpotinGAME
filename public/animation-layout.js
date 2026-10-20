// Keep the logical 100x92 / 210x210 body canvas as the world anchor, while
// allowing drawn weapons and raised limbs to extend beyond that rectangle.
export function frameCacheLayout(width,height,x,y,drawWidth,drawHeight,padding=8){
 const left=Math.min(0,Math.floor(x)-padding),top=Math.min(0,Math.floor(y)-padding);
 const right=Math.max(width,Math.ceil(x+drawWidth)+padding),bottom=Math.max(height,Math.ceil(y+drawHeight)+padding);
 return{left,top,cacheWidth:right-left,cacheHeight:bottom-top,width,height};
}
export function drawAnimatedFrame(c,image,x,y,width,height){
 const layout=image.ironFrame;
 if(!layout){c.drawImage(image,x,y,width,height);return;}
 const sx=width/layout.width,sy=height/layout.height;
 c.drawImage(image,x+layout.left*sx,y+layout.top*sy,image.width*sx,image.height*sy);
}

// Brief aligned pose transitions keep feet/body anchored. Source frames remain
// complete; no temporary image allocation or image readback in the render loop.
const mixes=new Map();
export function resetPoseMixes(){mixes.clear();poseSurfaces.clear();}
export function drawActorFrame(c,key,image,x,y,width,height,time){
 let m=mixes.get(key);
 if(!m){m={current:image,previous:null,at:time};mixes.set(key,m);}
 if(m.current!==image){m.previous=m.current;m.current=image;m.at=time;}
 const t=Math.max(0,Math.min(1,(time-m.at)/.045));
 if(m.previous&&t<1){if(t<=.001)drawAnimatedFrame(c,m.previous,x,y,width,height);else drawPose(c,'transition-'+key,{image:m.previous,next:image,mix:t},x,y,width,height,time);}else{m.previous=null;drawAnimatedFrame(c,image,x,y,width,height);}
 if(mixes.size>160)for(const k of mixes.keys()){if(k===key)continue;mixes.delete(k);if(mixes.size<=100)break;}
}

// Subframes blend in a reusable local surface with additive premultiplied
// alpha. Aligned overlapping body pixels stay opaque instead of ghosting.
const poseSurfaces=new Map();
// Walking actors share cached quarter-step blends. Ten identical minions no
// longer upload ten freshly painted textures every frame. Bound cache to 32MiB.
const locomotionCache=new Map(),imageIds=new WeakMap();let imageSerial=0,locomotionBytes=0;
export const poseCacheStats=()=>({frames:locomotionCache.size,bytes:locomotionBytes,limit:32*1024*1024});
function locomotionFrame(a,b,mix){
 const step=Math.round(mix*4);if(step<=0)return a;if(step>=4)return b;
 if(!imageIds.has(a))imageIds.set(a,++imageSerial);if(!imageIds.has(b))imageIds.set(b,++imageSerial);const key=imageIds.get(a)+':'+imageIds.get(b)+':'+step;
 let image=locomotionCache.get(key);if(image)return image;
 const aa=a.ironFrame,bb=b.ironFrame;if(!aa||!bb)return a;const left=Math.min(aa.left,bb.left),top=Math.min(aa.top,bb.top),right=Math.max(aa.left+a.width,bb.left+b.width),bottom=Math.max(aa.top+a.height,bb.top+b.height);
 image=document.createElement('canvas');image.width=right-left;image.height=bottom-top;image.ironFrame={left,top,width:aa.width,height:aa.height};const q=image.getContext('2d');q.imageSmoothingEnabled=false;q.globalAlpha=1-step/4;drawAnimatedFrame(q,a,-left,-top,aa.width,aa.height);q.globalCompositeOperation='lighter';q.globalAlpha=step/4;drawAnimatedFrame(q,b,-left,-top,aa.width,aa.height);
 locomotionCache.set(key,image);locomotionBytes+=image.width*image.height*4;while(locomotionBytes>32*1024*1024){const [old,frame]=locomotionCache.entries().next().value;locomotionBytes-=frame.width*frame.height*4;locomotionCache.delete(old);}return image;
}
export function drawPose(c,key,pose,x,y,width,height,time){
 if(pose?.locomotion&&pose.next){const image=locomotionFrame(pose.image,pose.next,pose.mix);mixes.set(key,{current:image,previous:null,at:time});return drawAnimatedFrame(c,image,x,y,width,height);}
 if(!pose?.next||pose.mix<=.001)return drawActorFrame(c,key,pose.image,x,y,width,height,time);
 const a=pose.image.ironFrame,b=pose.next.ironFrame;if(!a||!b)return drawActorFrame(c,key,pose.image,x,y,width,height,time);
 const left=Math.min(a.left,b.left),top=Math.min(a.top,b.top),right=Math.max(a.left+pose.image.width,b.left+pose.next.width),bottom=Math.max(a.top+pose.image.height,b.top+pose.next.height);
 let surface=poseSurfaces.get(key);if(!surface){surface=document.createElement('canvas');poseSurfaces.set(key,surface);}if(surface.width<right-left||surface.height<bottom-top){surface.width=Math.max(surface.width,right-left);surface.height=Math.max(surface.height,bottom-top);}
 surface.ironFrame={left,top,width:a.width,height:a.height};const q=surface.getContext('2d');q.clearRect(0,0,surface.width,surface.height);q.imageSmoothingEnabled=false;q.globalCompositeOperation='source-over';q.globalAlpha=1-pose.mix;drawAnimatedFrame(q,pose.image,-left,-top,a.width,a.height);q.globalCompositeOperation='lighter';q.globalAlpha=pose.mix;drawAnimatedFrame(q,pose.next,-left,-top,a.width,a.height);q.globalAlpha=1;q.globalCompositeOperation='source-over';drawAnimatedFrame(c,surface,x,y,width,height);
 if(poseSurfaces.size>100)for(const k of poseSurfaces.keys()){if(k!==key)poseSurfaces.delete(k);if(poseSurfaces.size<=60)break;}
}
