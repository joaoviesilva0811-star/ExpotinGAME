// Small overhead pixel accessories, drawn in the same palette as the armor.
const cache=new Map();
const fill=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function hatSprite(kind,direction=0){
 const key=kind+':'+direction;if(cache.has(key))return cache.get(key);const out=document.createElement('canvas');out.width=40;out.height=30;const c=out.getContext('2d');c.imageSmoothingEnabled=false;
 if(kind==='cowboy'){
  fill(c,3,16,34,5,'#291c19');fill(c,1,14,38,4,'#6c492d');fill(c,4,13,32,3,'#a17443');fill(c,10,4,20,12,'#805531');fill(c,13,2,14,3,'#bc8c50');fill(c,10,12,20,4,'#35272a');fill(c,18,12,4,4,'#d7b575');fill(c,12,5,3,6,'#ac7b43');
 }else if(kind==='santa'){
  for(let y=0;y<16;y++)fill(c,10+Math.floor(y/3),15-y,21-Math.floor(y*.85),2,y%4?'#a53644':'#c44b50');fill(c,7,16,26,6,'#d8d9d1');fill(c,9,16,22,2,'#fff2d4');fill(c,25,0,6,6,'#eae7d8');fill(c,28,4,5,5,'#d8d8d2');
 }else if(kind==='prisoner'){
  fill(c,8,6,24,13,'#d0cec2');fill(c,6,16,28,5,'#2c3038');for(let x=9;x<32;x+=7)fill(c,x,6,3,12,'#30333b');fill(c,9,5,22,2,'#e9e7d5');fill(c,12,9,16,3,'#818786');
 }else if(kind==='cake'){
  fill(c,4,22,32,3,'#c8b689');fill(c,8,10,24,12,'#ab7354');fill(c,8,11,24,4,'#eecac1');fill(c,10,10,4,7,'#f5dfc7');fill(c,22,11,4,5,'#e9b4c1');fill(c,7,7,26,5,'#f0d9b9');for(const x of [13,21,28]){fill(c,x,0,2,8,'#82bec2');fill(c,x-1,0,4,2,'#f6c36d');}fill(c,12,17,17,2,'#d69b78');
 }
 if(direction===2){
  if(kind==='cowboy'){fill(c,10,12,20,4,'#4d3528');fill(c,13,5,14,2,'#956a3d');}
  if(kind==='santa'){fill(c,11,7,13,9,'#92313e');fill(c,13,6,8,2,'#bb4650');}
  if(kind==='prisoner')fill(c,12,9,16,3,'#b7b9b1');
 }
 if(direction===1||direction===3){
  const side=document.createElement('canvas');side.width=40;side.height=30;const dc=side.getContext('2d');dc.imageSmoothingEnabled=false;dc.save();dc.translate(20,15);if(direction===3)dc.scale(-1,1);dc.transform(.72,.07,0,1,0,0);dc.drawImage(out,-20,-15);dc.restore();cache.set(key,side);return side;
 }
 cache.set(key,out);return out;
}
export function drawHat(c,p,now,scale=1){
 if(!p.hat||p.hat==='none'||p.hp<=0)return;
 c.save();c.translate(p.x,p.y-61*scale);
 if(p.emoteUntil>now){const t=now-p.emoteAt;c.translate(Math.sin(t*9)*2,Math.sin(t*12)*2);c.rotate(Math.sin(t*7)*.08);}
 const a=p.facing??Math.PI/2,direction=Math.abs(Math.cos(a))>.65?(Math.cos(a)>0?1:3):(Math.sin(a)>0?0:2);
 const attack=now-p.attackAt;if(attack>=0&&attack<(p.attackFor||.5))c.rotate(Math.sin(attack/(p.attackFor||.5)*Math.PI)*.11*(Math.cos(a)<0?-1:1));
 c.rotate(Math.sin(a)*.025);c.drawImage(hatSprite(p.hat,direction),-20*scale,-13*scale,40*scale,30*scale);c.restore();
}
