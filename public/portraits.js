const portraits=new Map(),pending=new Map();
export const portraitAssetsReady=fetch(new URL('./assets/portrait-frames.json',import.meta.url)).then(r=>r.json()).then(async data=>{
 const atlas=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=new URL('./assets/cast-portraits.png',import.meta.url).href;});
 for(const[name,f]of Object.entries(data)){const[sx,sy,sw,sh]=f.rect,a=document.createElement('canvas');a.width=a.height=160;const c=a.getContext('2d');c.imageSmoothingEnabled=false;const sc=146/Math.max(sw,sh),x=(160-sw*sc)/2,y=(160-sh*sc)/2;c.beginPath();for(const[yy,l,r]of f.spans)c.rect(x+(l-sx)*sc,y+(yy-sy)*sc,(r-l)*sc,sc+.05);c.clip();c.drawImage(atlas,sx,sy,sw,sh,x,y,sw*sc,sh*sc);portraits.set(name,a);}
 for(const[canvas,name]of pending)paintPortrait(canvas,name);pending.clear();return true;
});
export function paintPortrait(canvas,name){if(!canvas)return;const a=portraits.get(name);if(!a){pending.set(canvas,name);return;}const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;c.drawImage(a,0,0,canvas.width,canvas.height);}
