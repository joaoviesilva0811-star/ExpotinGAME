import {rescueFrame} from './rescue-sprites.js';
import {heroStrike,bossStrike,minionStrike} from './strike-timing.js';
import {strikeFrame} from './strike-sprites.js';
import {hitFlash} from './frame-tint.js';
import {drawCastShadow} from './lighting.js';
import {hurtFrame,resetHurtReactions} from './hurt-sprites.js';
import {bossWalkFrame} from './boss-walk.js';
import {bossPose,walkFacing,actorMotion} from './animation-timing.js';
import {frameCacheLayout,drawAnimatedFrame,drawPose} from './animation-layout.js';
export {drawAnimatedFrame} from './animation-layout.js';
import {facingRow,archerPose} from './animation-state.js';
export {facingRow} from './animation-state.js';
// Animation atlases contain distinct drawn poses, not copies of one idle sprite.
// Cache normalized frames once; never read pixels during the render loop.
let metadata={};fetch(new URL('./assets/animation-frames.json',import.meta.url)).then(r=>r.json()).then(data=>{metadata=data;cache.clear();});
const sheets=new Map(),cache=new Map(),gaits=new Map(),bossGaits=new Map();
export function resetAnimationState(){gaits.clear();bossGaits.clear();resetHurtReactions();}
export const BASE_ANIMATION_FRAMES=732,ANIMATION_FRAMES=3016;
for(const name of ['knight','archer','rogue','varkhul','tharazul','azrakiel','minions',...['knight','archer','rogue'].map(n=>'emote-'+n),...['knight','archer','rogue','varkhul','tharazul','azrakiel','revenant','thornling','acolyte'].map(n=>'direction-'+n)]){
  const image=new Image();image.onload=()=>{sheets.set(name,image);};image.src=new URL(`./assets/${name.startsWith('emote-')||name.startsWith('direction-')?name:'animation-'+name}.png`,import.meta.url).href;
}
function frame(name,row,col,boss=false){
  const image=sheets.get(name);if(!image)return null;
  const mirror=name==='direction-acolyte'&&row===7;if(mirror)row=1;
  const key=`${name}:${row}:${col}:${mirror}`;if(cache.has(key))return cache.get(key);
  const cols=6,rows=name==='direction-acolyte'?7:name==='minions'?3:name.startsWith('emote-')?4:name.startsWith('direction-')?8:6,cw=image.width/cols,ch=image.height/rows;
  const crop=metadata[name]?.frames[row]?.[col],head=metadata[name]?.heads?.[row]?.[col];
  const c=document.createElement('canvas'),nominalWidth=boss?210:100,nominalHeight=boss?210:92;c.width=nominalWidth;c.height=nominalHeight;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  const scale=boss?Math.min(198/cw,194/ch):Math.min(94/cw,78/ch),w=cw*scale,h=ch*scale;
  if(crop){
    const [sx,sy,sw,sh]=crop,sc=metadata[name].scale,x=nominalWidth/2+(sx-(col+.5)*cw)*sc,y=nominalHeight-sh*sc-9;
    const layout=frameCacheLayout(nominalWidth,nominalHeight,x,y,sw*sc,sh*sc);c.width=layout.cacheWidth;c.height=layout.cacheHeight;c.ironFrame=layout;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,sx,sy,sw,sh,x-layout.left,y-layout.top,sw*sc,sh*sc);
    if(head)c.ironHead={x:nominalWidth/2+(head[0]-(col+.5)*cw)*sc,y:y+(head[1]-sy)*sc};
  }
  else ctx.drawImage(image,col*cw,row*ch,cw,ch,(c.width-w)/2,c.height-h-3,w,h);
  if(mirror){const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const dc=copy.getContext('2d');dc.translate(c.width,0);dc.scale(-1,1);dc.drawImage(c,0,0);if(c.ironFrame)copy.ironFrame={...c.ironFrame,left:c.ironFrame.width-c.ironFrame.left-c.width};if(c.ironHead)copy.ironHead={x:nominalWidth-c.ironHead.x,y:c.ironHead.y};cache.set(key,copy);return copy;}
  cache.set(key,c);return c;
}
export function characterFrame(p,time,now){
  let gait=gaits.get(p.id);if(!gait){gait={x:p.x,y:p.y,step:0};gaits.set(p.id,gait);}
  const d=Math.hypot(p.x-gait.x,p.y-gait.y);if(d<40)gait.step+=d;gait.x=p.x;gait.y=p.y;
  let row=0,col=0,flip=false;
  const moving=Math.hypot(p.vx||0,p.vy||0)>12,a=moving?Math.atan2(p.vy,p.vx):p.facing||0;
  row=Math.abs(Math.cos(a))>.65?(Math.cos(a)>0?3:2):(Math.sin(a)>0?0:1);
  if(moving)col=Math.floor(gait.step/14)%6;
  const rescue=rescueFrame(p,now);if(rescue)return rescue;
  if(p.emoteUntil>now){const row=['step','cross','spin','victory'].indexOf(p.emote),col=Math.floor((now-p.emoteAt)*7)%6;const image=frame('emote-'+p.classId,Math.max(0,row),col);if(image)return {image,flip:false,angle:p.emote==='spin'?[1.57,.5,-.6,-1.57,3.14,2.4][col]:1.57};}
  const strike=strikeFrame(heroStrike(p,now));if(strike)return{...strike,angle:p.facing};
  if(moving&&!p.block){const walk=strikeFrame({clip:p.classId+'-walk',direction:facingRow(p.aiming?p.facing:a),progress:gait.step/84%1,loop:true});if(walk&&!p.aiming)return{...walk,angle:a};}
  const hurtImage=hurtFrame(p,p.classId,now);
  const bow=p.classId==='archer'&&p.hp>0?archerPose(p,now):null;
  if(hurtImage&&!moving&&!(p.classId==='archer'&&(p.aiming||bow?.phase==='fire')))return{image:hurtImage,flip:false,angle:p.facing,hurt:true};
  if(bow){const image=frame('direction-archer',bow.row,bow.col);if(image)return{image,flip:bow.flip,angle:p.facing,bowPhase:bow.phase};}
  if(p.lastHurt!==undefined&&now-p.lastHurt<.38){row=5;col=Math.min(5,Math.floor((now-p.lastHurt)/.38*6));}
  else if(now-p.attackAt>=0&&now-p.attackAt<(p.attackFor||.5)){row=4;col=Math.min(5,Math.floor((now-p.attackAt)/(p.attackFor||.5)*6));flip=Math.cos(p.facing)<0;const image=frame('direction-'+p.classId,facingRow(p.facing),col);if(image)return{image,flip:false,angle:p.facing};}
  const image=frame(p.classId,row,col);return image?{image,flip,angle:row===5?Math.PI/2:a}:null;
}
export function bossFrame(b,round,time,now){
 b.strikePose=null;const name=['varkhul','tharazul','azrakiel'][round];let gait=bossGaits.get(name);
 if(!gait){gait={x:b.x,y:b.y,phase:0};bossGaits.set(name,gait);}
 const d=Math.hypot(b.x-gait.x,b.y-gait.y);if(d<100&&b.state==='chase')gait.phase+=d/[52,62,70][round];gait.x=b.x;gait.y=b.y;b.walkPhase=gait.phase;
 const hurtImage=['idle','recover'].includes(b.state)?hurtFrame(b,name,now):null;if(hurtImage){b.walkFlip=false;return hurtImage;}
 const strike=strikeFrame(bossStrike(b,round,now));b.strikePose=strike;if(strike){b.walkFlip=strike.flip;return strike.image;}
 const q=bossPose(b,time,now,gait.phase),direction=walkFacing(b.facing||0);
 if(q.mode==='walk'){
  const image=bossWalkFrame(name,direction.direction,q.position);
  if(image){b.walkFlip=direction.flip;b.strikePose={image,next:bossWalkFrame(name,direction.direction,(Math.floor(q.position)+1)%12),mix:q.position%1,locomotion:true,flip:direction.flip};return image;}
  return frame(name,1,Math.floor(q.position/2)%6,true);
 }
 b.walkFlip=false;
 if(q.mode==='direction')return frame('direction-'+name,facingRow(b.facing),Math.floor(q.position),true)||frame(name,2,Math.floor(q.position),true);
 if(q.mode==='recover')return q.progress<.42?frame('direction-'+name,facingRow(b.facing),5,true):frame(name,0,Math.floor(time*5)%6,true);
 return frame(name,q.row,Math.floor(q.position),true);
}
export function drawMinion(c,m,time,now){
  let col=m.state==='chase'?1+Math.floor(time*6)%2:m.state==='windup'?3:m.state==='recover'?4:0;
  if(now-m.hurtAt<.3)col=5;
  const progress=Math.max(0,now-m.animAt);let dcol=m.state==='windup'?Math.min(1,Math.floor(progress/1.15*2)):m.state==='recover'?2+Math.min(3,Math.floor(progress/.85*4)):0;
  const directional=['windup','recover'].includes(m.state)?frame('direction-'+m.kind,facingRow(m.aim!==undefined&&['windup','recover'].includes(m.state)?m.aim:m.facing),dcol):null;
  const hurtImage=['idle','recover'].includes(m.state)?hurtFrame(m,m.kind,now):null;const walk=m.state==='chase'?strikeFrame({clip:m.kind+'-walk',direction:facingRow(m.facing),progress:time*1.45%1,loop:true}):null;const strike=walk||(hurtImage?null:strikeFrame(minionStrike(m,now)));const image=hurtImage||strike?.image||directional||frame('minions',m.round,col);const spawning=now<m.activeAt;
  if(image)drawCastShadow(c,image,m,82,75,11);
  c.save();c.translate(m.x,m.y);c.globalAlpha=spawning?.35:1;const motion=actorMotion(m,time,now);c.translate(0,motion.lift);c.rotate(motion.lean);c.scale(motion.sx,motion.sy);
  c.fillStyle='#0007';c.beginPath();c.ellipse(0,7,18,7,0,0,7);c.fill();
  if(image){if(strike?.flip||!strike&&!hurtImage&&!directional&&Math.cos(m.facing)<0)c.scale(-1,1);if(m.state==='chase')c.translate(0,Math.sin(time*6)*.8);if(strike)drawPose(c,m.id,now-m.hurtAt<.14?{...strike,image:hitFlash(strike.image),next:hitFlash(strike.next)}:strike,-41,-64,82,75,time);else drawAnimatedFrame(c,now-m.hurtAt<.14?hitFlash(image):image,-41,-64,82,75);}
  else{c.fillStyle=['#a06167','#86a269','#9781b1'][m.round];c.fillRect(-12,-32,24,32);}
  c.restore();
  if(!spawning){c.fillStyle='#151d26';c.fillRect(m.x-19,m.y-66,38,3);c.fillStyle=['#d16a72','#94c36d','#b792e7'][m.round];c.fillRect(m.x-19,m.y-66,38*m.hp/m.maxHp,3);}
}
