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

// Draw one complete opaque source pose. Crossfading whole silhouettes creates
// doubled swords, capes and facial contours; movement/camera remain continuous.
export function resetPoseMixes(){}
export const poseCacheStats=()=>({frames:0,bytes:0,limit:32*1024*1024,mode:'crisp-source'});
export function drawActorFrame(c,key,image,x,y,width,height,time){drawAnimatedFrame(c,image,x,y,width,height);}
export function drawPose(c,key,pose,x,y,width,height,time){
 if(!pose?.image)return;
 const image=pose.next&&pose.mix>=.5?pose.next:pose.image;
 drawAnimatedFrame(c,image,x,y,width,height);
}
