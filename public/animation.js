// Animation atlases contain distinct drawn poses, not copies of one idle sprite.
// Cache normalized frames once; never read pixels during the render loop.
let metadata={};fetch(new URL('./assets/animation-frames.json',import.meta.url)).then(r=>r.json()).then(data=>{metadata=data;cache.clear();});
const sheets=new Map(),cache=new Map(),gaits=new Map();
export const ANIMATION_FRAMES=732;
for(const name of ['knight','archer','rogue','varkhul','tharazul','azrakiel','minions',...['knight','archer','rogue'].map(n=>'emote-'+n),...['knight','archer','rogue','varkhul','tharazul','azrakiel','revenant','thornling','acolyte'].map(n=>'direction-'+n)]){
  const image=new Image();image.onload=()=>{sheets.set(name,image);};image.src=new URL(`./assets/${name.startsWith('emote-')||name.startsWith('direction-')?name:'animation-'+name}.png`,import.meta.url).href;
}
function frame(name,row,col,boss=false){
  const image=sheets.get(name);if(!image)return null;
  const mirror=name==='direction-acolyte'&&row===7;if(mirror)row=1;
  const key=`${name}:${row}:${col}:${mirror}`;if(cache.has(key))return cache.get(key);
  const cols=6,rows=name==='direction-acolyte'?7:name==='minions'?3:name.startsWith('emote-')?4:name.startsWith('direction-')?8:6,cw=image.width/cols,ch=image.height/rows;
  const crop=metadata[name]?.frames[row]?.[col],head=metadata[name]?.heads?.[row]?.[col];
  const c=document.createElement('canvas');c.width=boss?210:100;c.height=boss?210:92;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  const scale=boss?Math.min(198/cw,194/ch):Math.min(94/cw,78/ch),w=cw*scale,h=ch*scale;
  if(crop){const [sx,sy,sw,sh]=crop,sc=metadata[name].scale;ctx.drawImage(image,sx,sy,sw,sh,c.width/2+(sx-(col+.5)*cw)*sc,c.height-sh*sc-9,sw*sc,sh*sc);if(head)c.ironHead={x:c.width/2+(head[0]-(col+.5)*cw)*sc,y:c.height-sh*sc-9+(head[1]-sy)*sc};}
  else ctx.drawImage(image,col*cw,row*ch,cw,ch,(c.width-w)/2,c.height-h-3,w,h);
  if(mirror){const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const dc=copy.getContext('2d');dc.translate(c.width,0);dc.scale(-1,1);dc.drawImage(c,0,0);if(c.ironHead)copy.ironHead={x:c.width-c.ironHead.x,y:c.ironHead.y};cache.set(key,copy);return copy;}
  cache.set(key,c);return c;
}
export function characterFrame(p,time,now){
  let gait=gaits.get(p.id);if(!gait){gait={x:p.x,y:p.y,step:0};gaits.set(p.id,gait);}
  const d=Math.hypot(p.x-gait.x,p.y-gait.y);if(d<40)gait.step+=d;gait.x=p.x;gait.y=p.y;
  let row=0,col=0,flip=false;
  const moving=Math.hypot(p.vx||0,p.vy||0)>12,a=moving?Math.atan2(p.vy,p.vx):p.facing||0;
  row=Math.abs(Math.cos(a))>.65?(Math.cos(a)>0?3:2):(Math.sin(a)>0?0:1);
  if(moving)col=Math.floor(gait.step/14)%6;
  if(p.emoteUntil>now){const row=['step','cross','spin','victory'].indexOf(p.emote),col=Math.floor((now-p.emoteAt)*7)%6;const image=frame('emote-'+p.classId,Math.max(0,row),col);if(image)return {image,flip:false,angle:p.emote==='spin'?[1.57,.5,-.6,-1.57,3.14,2.4][col]:1.57};}
  if(p.lastHurt!==undefined&&now-p.lastHurt<.38){row=5;col=Math.min(5,Math.floor((now-p.lastHurt)/.38*6));}
  else if(now-p.attackAt>=0&&now-p.attackAt<(p.attackFor||.5)){row=4;col=Math.min(5,Math.floor((now-p.attackAt)/(p.attackFor||.5)*6));flip=Math.cos(p.facing)<0;const image=frame('direction-'+p.classId,facingRow(p.facing),col);if(image)return{image,flip:false,angle:p.facing};}
  const image=frame(p.classId,row,col);return image?{image,flip,angle:row===5?Math.PI/2:a}:null;
}
export const facingRow=angle=>((Math.round((Math.PI/2-angle)/(Math.PI/4))%8)+8)%8;
export function bossFrame(b,round,time,now){
  const name=['varkhul','tharazul','azrakiel'][round];let row=0,col=Math.floor(time*4)%6;
  if(b.state==='chase'){row=1;col=Math.floor(time*6)%6;}
  if(b.state==='windup'){row=b.attack===5?5:b.attack%2?3:2;const progress=(now-b.startedAt)/(b.until-b.startedAt||1);col=Math.min(1,Math.floor(Math.max(0,progress)*2));}
  if(b.state==='execute'){row=b.attack===5?5:b.attack%2?3:2;col=2+Math.min(3,Math.floor(Math.max(0,now-b.startedAt)/(b.executeFor||.45)*4));}
  if(b.state==='recover'){row=b.attack===5?5:b.attack%2?3:2;col=5;}
  if(b.state==='awakening'){row=5;col=Math.min(5,Math.floor(Math.max(0,now-b.startedAt)/4.4*6));}
  if(b.state==='fallen'){row=4;col=5;}
  if(b.state==='dormant'){row=0;col=0;}
  if(b.state==='transition'){row=5;col=Math.min(5,Math.floor(Math.max(0,now-b.startedAt)*4));}
  if(now-b.hurtAt<.26&&['idle','chase','recover'].includes(b.state)){row=4;col=Math.min(5,Math.floor((now-b.hurtAt)/.26*6));}
  if(['windup','execute','recover','idle','chase'].includes(b.state)){const dcol=b.state==='windup'?Math.min(1,col):b.state==='execute'?col:b.state==='recover'?5:0;const image=frame('direction-'+name,facingRow(b.facing),dcol,true);if(image)return image;}
  return frame(name,row,col,true);
}
export function drawMinion(c,m,time,now){
  let col=m.state==='chase'?1+Math.floor(time*6)%2:m.state==='windup'?3:m.state==='recover'?4:0;
  if(now-m.hurtAt<.3)col=5;
  const progress=Math.max(0,now-m.animAt);let dcol=m.state==='windup'?Math.min(1,Math.floor(progress/1.15*2)):m.state==='recover'?2+Math.min(3,Math.floor(progress/.85*4)):0;
  const directional=frame('direction-'+m.kind,facingRow(m.aim!==undefined&&['windup','recover'].includes(m.state)?m.aim:m.facing),dcol);
  const image=directional||frame('minions',m.round,col);const spawning=now<m.activeAt;
  c.save();c.translate(m.x,m.y);c.globalAlpha=spawning?.35:1;
  c.fillStyle='#0007';c.beginPath();c.ellipse(0,7,18,7,0,0,7);c.fill();
  if(image){if(!directional&&Math.cos(m.facing)<0)c.scale(-1,1);if(now-m.hurtAt<.14)c.filter='brightness(1.8)';if(m.state==='chase')c.translate(0,Math.sin(time*6)*.8);c.drawImage(image,-41,-64,82,75);}
  else{c.fillStyle=['#a06167','#86a269','#9781b1'][m.round];c.fillRect(-12,-32,24,32);}
  c.restore();
  if(!spawning){c.fillStyle='#151d26';c.fillRect(m.x-19,m.y-66,38,3);c.fillStyle=['#d16a72','#94c36d','#b792e7'][m.round];c.fillRect(m.x-19,m.y-66,38*m.hp/m.maxHp,3);}
}
