// Precomputed hit flash. Canvas filters otherwise allocate a filtered surface
// for every damage pose, often forcing software compositing.
const flashes=new WeakMap();
export function hitFlash(image){
 let out=flashes.get(image);if(out)return out;
 out=document.createElement('canvas');out.width=image.width;out.height=image.height;out.ironFrame=image.ironFrame;out.ironHead=image.ironHead;
 const c=out.getContext('2d');c.drawImage(image,0,0);c.globalCompositeOperation='source-atop';c.globalAlpha=.42;c.fillStyle='#fff3dc';c.fillRect(0,0,out.width,out.height);flashes.set(image,out);return out;
}
