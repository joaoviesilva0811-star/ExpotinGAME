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
export function resetPoseMixes(){mixes.clear();}
export function drawActorFrame(c,key,image,x,y,width,height,time){
 let m=mixes.get(key);
 if(!m){m={current:image,previous:null,at:time};mixes.set(key,m);}
 if(m.current!==image){m.previous=m.current;m.current=image;m.at=time;}
 const t=Math.max(0,Math.min(1,(time-m.at)/.045));
 if(m.previous&&t<1){const alpha=c.globalAlpha;c.globalAlpha=alpha*(1-t);drawAnimatedFrame(c,m.previous,x,y,width,height);c.globalAlpha=alpha*t;drawAnimatedFrame(c,image,x,y,width,height);c.globalAlpha=alpha;}else{m.previous=null;drawAnimatedFrame(c,image,x,y,width,height);}
 if(mixes.size>160)for(const k of mixes.keys()){if(k===key)continue;mixes.delete(k);if(mixes.size<=100)break;}
}
