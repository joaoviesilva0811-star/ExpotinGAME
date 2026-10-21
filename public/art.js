import {recoilOffset} from './damage-response.js';
import {hitFlash} from './frame-tint.js';
import {drawCastShadow} from './lighting.js';
import {actorMotion} from './animation-timing.js';
import {drawAnimatedFrame,drawActorFrame,drawPose} from './animation-layout.js';
import { sceneImage } from './scenes.js';
import { characterFrame, bossFrame } from './animation.js';
import { WORLD, CLASSES, BOSSES } from './shared.js';

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rect = (c, x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
function poly(c, points, fill, stroke = '#0c1115') {
  c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
}
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const sprites = new Map();
const atlas = new Image();
let atlasLoaded = false;
const atlasFrames = [
  [[70,36,151,196],[259,37,214,183],[542,38,214,182],[808,15,211,207],[1024,38,210,183],[1282,39,229,198]],
  [[79,251,152,181],[307,249,161,180],[554,251,167,181],[819,248,133,185],[1071,244,157,195],[1295,242,234,192]],
  [[67,450,154,184],[288,449,196,172],[545,448,181,186],[809,444,155,185],[1041,455,233,178],[1280,463,240,172]],
  [[8,635,248,367],[256,635,256,352],[512,635,256,345],[768,635,256,366],[1024,635,256,354],[1280,635,250,366]]
];
atlas.onload=()=>{atlasLoaded=true;sprites.clear();};
atlas.src=new URL('./assets/characters.png',import.meta.url).href;
export const atlasReady=()=>atlasLoaded;
function atlasPlayer(classId,direction,frame,attack){
  const row=classId==='knight'?0:classId==='archer'?1:2;
  const col=attack?4+(frame%2):[0,2,3,1][direction];
  const [sx,sy,sw,sh]=atlasFrames[row][col];
  const out=canvas(76,80),c=out.getContext('2d');c.imageSmoothingEnabled=false;
  const sc=Math.min(70/sw,64/sh),w=Math.round(sw*sc),h=Math.round(sh*sc);
  // A slight stride/bob supplements the supplied directional and attack poses.
  const bob=frame===1?-1:frame===2?1:0;
  c.drawImage(atlas,sx,sy,sw,sh,Math.round(38-w/2),65-h+bob,w,h);return out;
}
function metal(c, x, y, w, h, dark = false) {
  rect(c,x,y,w,h,dark?'#1c2530':'#394a54'); rect(c,x+1,y+1,w-2,2,dark?'#526273':'#98aaa4');
  rect(c,x+1,y+3,2,h-4,dark?'#344758':'#5c737b'); rect(c,x+w-2,y+3,1,h-3,'#18202b');
}
export function playerSprite(classId, direction = 0, frame = 0, attack = false) {
  const key = `${classId}:${direction}:${frame}:${attack}`; if (sprites.has(key)) return sprites.get(key);
  if(atlasLoaded){const img=atlasPlayer(classId,direction,frame,attack);sprites.set(key,img);return img;}
  const img = canvas(76, 80), c = img.getContext('2d'); c.imageSmoothingEnabled = false;
  const back = direction === 2, side = direction === 1 || direction === 3;
  if (direction === 3) { c.translate(76,0); c.scale(-1,1); }
  const knight = classId === 'knight', archer = classId === 'archer';
  const cape = knight ? '#672c38' : archer ? '#354f39' : '#443552';
  const light = knight ? '#9d4b4b' : archer ? '#668058' : '#79618e';
  const gold = '#c4a569', step = frame === 1 ? 3 : frame === 2 ? -3 : 0;
  // Shortened legs and visible shoulders establish the overhead camera.
  poly(c, [[25,40],[47,40],[53,65],[43,70],[36,63],[26,69],[20,63]], cape);
  rect(c,25,48+step,9,13,'#151c23'); rect(c,41,48-step,9,13,'#151c23');
  metal(c,25,50+step,8,8,!knight); metal(c,41,50-step,8,8,!knight);
  rect(c,24,59+step,11,5,'#26313b'); rect(c,40,59-step,11,5,'#26313b');
  rect(c,25,59+step,7,1,'#6a797c'); rect(c,41,59-step,7,1,'#6a797c');
  poly(c, [[24,26],[49,26],[52,43],[46,54],[28,54],[21,43]], knight?'#34434e':archer?'#4d5141':'#292b39');
  if (knight) {
    metal(c,27,30,19,16); rect(c,29,35,14,2,'#83928a'); rect(c,31,39,11,2,'#647e85');
    rect(c,35,31,2,15,'#b29c6b');
    poly(c,[[18,26],[29,24],[30,35],[19,36],[15,31]],'#475b63');
    poly(c,[[45,24],[55,27],[58,32],[52,37],[44,34]],'#364a56');
    rect(c,18,27,10,2,'#a7b2a1'); rect(c,47,26,7,2,'#869996');
    [20,26,48,53].forEach(x=>rect(c,x,31,2,2,gold));
  } else {
    rect(c,27,32,18,3,light); rect(c,31,36,12,2,cape); rect(c,29,42,15,2,'#7b6851');
    poly(c,[[18,29],[26,26],[28,35],[20,40],[15,36]],cape);
    poly(c,[[47,26],[55,30],[59,37],[50,40],[46,35]],cape);
    rect(c,18,31,7,2,light); rect(c,49,31,6,2,light);
    for(let i=0;i<4;i++)rect(c,28+i*3,34+i*2,3,2,'#917354');
  }
  rect(c,26,47,23,4,'#1c2026'); rect(c,34,47,5,4,gold); rect(c,35,48,3,2,'#564a39');
  if (back) {
    poly(c, [[23,27],[48,27],[52,57],[46,65],[39,63],[35,67],[24,62],[21,54]],cape);
    poly(c, [[25,30],[29,31],[28,58],[24,60]],light,null);
    poly(c, [[42,31],[46,32],[49,56],[44,59]],knight?'#492530':archer?'#283e31':'#302d43',null);
    if(knight){rect(c,33,35,8,2,gold);rect(c,36,32,2,14,gold);rect(c,33,43,8,2,gold);}
    if(archer){poly(c,[[37,29],[43,29],[45,52],[38,54]],'#65513d');for(let i=0;i<3;i++){rect(c,37+i*3,22,1,12,'#b3a58a');rect(c,36+i*3,21,3,3,'#a9b8a0');}}
  }
  // Arms, weapons and asymmetric equipment.
  const armY = attack ? 30 : 40 + Math.abs(step)/2;
  if(knight){
    metal(c,16,35,8,12); metal(c,49,34,8,12);
    if(!back){
      poly(c,[[13,34],[26,33],[28,48],[21,58],[13,51],[10,41]],'#35434a');
      poly(c,[[15,36],[23,35],[25,47],[20,54],[15,49]],'#5e4541','#b79b66');
      rect(c,18,39,2,11,gold);rect(c,15,43,8,2,gold);
    }
    const sx=attack?61:56, sy=attack?19:42;
    poly(c,[[sx-2,sy-12],[sx+1,sy-17],[sx+3,sy-12],[sx+2,sy+15],[sx-1,sy+15]],'#91a5a9');
    rect(c,sx,sy-12,1,26,'#d2d6bd');rect(c,sx-5,sy+15,11,2,gold);rect(c,sx-1,sy+17,3,7,'#4d3732');rect(c,sx-2,sy+23,5,3,gold);
  } else if(archer){
    rect(c,17,36,6,10,'#514d3d');rect(c,49,35,7,9,'#514d3d');
    const bx=attack?61:57;
    poly(c,[[bx-3,22],[bx+5,29],[bx+8,39],[bx+5,51],[bx-3,59],[bx+2,48],[bx+4,39],[bx+1,29]],'#b09059');
    c.strokeStyle='#bfc4ad';c.lineWidth=1;c.beginPath();c.moveTo(bx-3,23);c.lineTo(attack?bx-10:bx-3,39);c.lineTo(bx-3,58);c.stroke();
    if(attack){rect(c,39,38,31,1,'#bdac88');poly(c,[[69,36],[74,38],[69,41]],'#bcc9b8');rect(c,39,37,4,3,'#d6bc8e');}
  } else {
    rect(c,16,37,6,9,'#242b38');rect(c,50,36,6,9,'#242b38');
    const sy=attack?25:43;
    [17,55].forEach((x,i)=>{poly(c,[[x,sy],[x+(i?-3:3),sy-14],[x+4,sy],[x+2,sy+5]],'#acb4c0');rect(c,x-2,sy+3,8,2,gold);rect(c,x,sy+5,3,5,'#70566c');});
  }
  // Head top, narrow visible face and deep helmet / hood shadows.
  if(knight){
    poly(c,[[26,13],[31,7],[39,6],[46,11],[48,22],[43,30],[31,30],[25,23]],'#455966');
    poly(c,[[29,13],[34,9],[40,8],[43,12],[38,15],[30,18]],'#9caea9',null);
    rect(c,34,7,3,18,'#c0b58c');rect(c,25,19,22,3,'#18232e');
    if(!back){rect(c,28,21,6,2,'#050d17');rect(c,38,21,6,2,'#050d17');rect(c,34,20,3,10,'#8b9b96');rect(c,29,26,3,2,'#2e3c46');rect(c,41,26,3,2,'#2e3c46');}
    else{rect(c,27,21,18,3,'#647e87');rect(c,30,26,13,2,'#263b45');}
  } else {
    poly(c,[[25,16],[30,8],[37,5],[45,12],[49,24],[43,31],[29,31],[23,25]],cape);
    poly(c,[[29,14],[35,8],[39,9],[32,18],[28,24],[25,24]],light,null);
    if(!back){poly(c,[[29,19],[42,18],[44,26],[39,31],[31,28]],'#111a23');rect(c,31,22,3,1,'#d3c6aa');rect(c,39,22,3,1,'#d3c6aa');rect(c,33,26,7,2,archer?'#92725d':'#514759');}
    else{rect(c,36,13,2,14,light);rect(c,30,26,12,2,light);}
  }
  // Side sprites retain their overhead proportions, with face looking along movement.
  if(side){rect(c,42,18,6,3,'#16202b');rect(c,46,20,3,5,knight?'#80928f':'#a08770');}
  sprites.set(key,img); return img;
}
export function bossSprite(round, frame=0) {
  const key=`boss:${round}:${frame}`;if(sprites.has(key))return sprites.get(key);
  if(atlasLoaded){
    const [sx,sy,sw,sh]=atlasFrames[3][round*2+frame];
    const out=canvas(156,156),c=out.getContext('2d');c.imageSmoothingEnabled=false;
    const sc=Math.min(151/sw,146/sh),w=Math.round(sw*sc),h=Math.round(sh*sc);
    c.drawImage(atlas,sx,sy,sw,sh,Math.round(78-w/2),145-h,w,h);sprites.set(key,out);return out;
  }
  const img=canvas(156,156),c=img.getContext('2d'),r=rng(round+99);
  if(round===0){
    poly(c,[[49,59],[103,59],[123,130],[102,143],[84,135],[69,146],[39,136],[31,122]],'#49232c');
    for(let i=0;i<11;i++){const x=40+i*6;poly(c,[[x,70],[x+5,72],[x+13,131],[x+5,137]],i%2?'#612935':'#351c29',null);}
    metal(c,55,112,15,20,true);metal(c,87,113,15,20,true);rect(c,52,132,20,7,'#111b29');rect(c,86,133,20,7,'#111b29');
    poly(c,[[48,52],[102,50],[110,79],[98,111],[57,113],[43,81]],'#202b39');
    poly(c,[[53,56],[75,62],[76,104],[56,96],[49,74]],'#344151');poly(c,[[79,62],[98,55],[105,74],[95,98],[80,104]],'#293545');
    for(let y=66;y<99;y+=8){rect(c,60,y,8,2,'#9c344b');rect(c,86,y,7,2,'#9c344b');}
    rect(c,75,63,3,40,'#a98260');rect(c,55,105,43,5,'#0f1928');rect(c,73,104,9,7,'#a58756');
    [[32,51],[99,49]].forEach(([x,y])=>{poly(c,[[x,y+8],[x+9,y-5],[x+26,y+1],[x+25,y+22],[x+7,y+22]],'#334050');for(let i=0;i<3;i++)poly(c,[[x+i*8,y+4],[x+i*8-2,y-9],[x+i*8+7,y+6]],'#8c979c');});
    metal(c,31,76,15,27,true);metal(c,108,73,14,27,true);
    poly(c,[[57,27],[63,18],[82,17],[95,27],[97,46],[87,62],[63,58],[54,44]],'#2a3542');
    poly(c,[[62,28],[68,23],[81,21],[89,29],[80,34],[61,35]],'#60707a',null);
    rect(c,60,40,34,6,'#0a101c');rect(c,64,42,8,2,'#ff7075');rect(c,81,42,8,2,'#ff7075');rect(c,75,38,4,18,'#77818a');
    rect(c,60,25,33,5,'#c8a566');[[60,13],[68,17],[76,9],[85,16],[92,12]].forEach(([x,y])=>poly(c,[[x-1,26],[x,y],[x+4,26]],'#b99a63'));
    const sy=frame?42:88;poly(c,[[119,sy-34],[125,sy-45],[131,sy-35],[128,sy+36],[120,sy+36]],'#657580');rect(c,123,sy-34,2,66,'#c5c7b4');
    for(let i=0;i<4;i++)rect(c,126,sy-20+i*11,5,2,'#a43b51');rect(c,110,sy+34,29,4,'#b18f59');rect(c,121,sy+38,6,16,'#3d2936');
  } else if(round===1){
    // Dragon viewed over its spine: broad back, four feet, horns and root antlers.
    poly(c,[[72,114],[84,113],[103,137],[95,149],[83,135],[75,126],[61,140],[55,133]],'#3d4c35');
    [[36,49],[101,47],[35,104],[103,106]].forEach(([x,y],i)=>{poly(c,[[x,y],[x+17,y-4],[x+25,y+16],[x+15,y+27],[x-5,y+18]],'#384e3a');for(let j=0;j<3;j++)poly(c,[[x+j*5,y+20],[x+j*5-2,y+30],[x+j*5+4,y+23]],'#b0ac7b');});
    poly(c,[[54,34],[75,19],[100,32],[111,62],[103,112],[80,132],[51,114],[42,78]],'#334b3b');
    for(let i=0;i<110;i++){const x=50+r()*53,y=39+r()*82;rect(c,x,y,4+Math.floor(r()*5),3,['#526441','#314c3b','#77815a','#273d36'][i%4]);}
    for(let i=0;i<9;i++){const y=36+i*9;poly(c,[[72,y+6],[78,y-4],[84,y+6],[78,y+11]],'#98a47a');rect(c,77,y,2,5,'#c2b58a');}
    [[52,47,-1],[98,47,1]].forEach(([x,y,dir])=>{for(let i=0;i<4;i++){poly(c,[[x,y+i*12],[x+dir*15,y-15+i*9],[x+dir*23,y-17+i*9],[x+dir*11,y-10+i*9],[x+dir*4,y+10+i*9]],'#6d6b49');}});
    poly(c,[[53,53],[66,42],[89,43],[101,58],[96,83],[86,101],[66,101],[54,83]],'#465f43');
    poly(c,[[60,78],[91,78],[89,103],[78,112],[66,106]],'#4e6d49');
    rect(c,58,72,10,4,'#0c261e');rect(c,87,72,10,4,'#0c261e');rect(c,60,73,7,2,'#b7ff85');rect(c,88,73,7,2,'#b7ff85');
    poly(c,[[55,57],[43,37],[45,18],[52,35],[61,48]],'#a39c70');poly(c,[[96,57],[109,35],[105,15],[100,36],[91,47]],'#a39c70');
    rect(c,65,99,24,5,'#122f27');[67,73,81,86].forEach(x=>poly(c,[[x,100],[x+1,105],[x+3,100]],'#d0c59d'));
    for(let i=0;i<24;i++){rect(c,45+r()*64,35+r()*60,2,2,i%3?'#6e9356':'#b4d27a');}
    if(frame) {poly(c,[[66,105],[87,105],[100,144],[77,152],[56,141]],'#74b955',null);for(let i=0;i<16;i++)rect(c,61+r()*35,113+r()*35,3,3,'#b1e96e');}
  } else {
    // Three pairs of wings with layered, individually readable feathers.
    for(let layer=0;layer<3;layer++)for(const dir of [-1,1]){
      const by=48+layer*17,spread=60-layer*5;
      poly(c,[[78,by],[78+dir*spread,by-27+layer*3],[78+dir*(spread+7),by+10],[78+dir*38,by+25],[78,by+16]],'#242539');
      for(let f=0;f<8;f++){
        const x=78+dir*(20+f*5), y=by-3-f*2;
        poly(c,[[x,y],[x+dir*14,y-10],[x+dir*9,y+16+layer*4],[x+dir*3,y+23+layer*4]],f%2?'#373548':'#464055','#131b29');
        rect(c,x,y+2,2,7,'#5c506b');
      }
    }
    poly(c,[[58,65],[97,64],[106,130],[90,143],[78,134],[63,143],[49,131]],'#242338');
    for(let i=0;i<7;i++)poly(c,[[60+i*5,91],[64+i*5,94],[70+i*5,135],[65+i*5,139]],i%2?'#362947':'#191e31',null);
    metal(c,57,112,12,26,true);metal(c,87,112,12,26,true);
    poly(c,[[56,53],[98,52],[102,76],[93,106],[61,107],[51,76]],'#232a3b');
    poly(c,[[60,59],[77,67],[95,58],[92,86],[77,98],[60,85]],'#4a3f58','#a28c70');
    poly(c,[[70,70],[78,65],[86,72],[79,86]],'#ac83d2','#e5bc84');rect(c,76,72,4,8,'#e4b7ff');
    [[45,52],[96,51]].forEach(([x,y])=>{poly(c,[[x,y],[x+17,y-8],[x+25,y+13],[x+12,y+22],[x-4,y+13]],'#35364c','#88785e');rect(c,x+7,y+4,3,5,'#b993e6');});
    poly(c,[[62,28],[77,17],[91,28],[94,45],[85,62],[68,60],[59,43]],'#292e40');
    poly(c,[[66,30],[76,23],[85,29],[78,42]],'#778095',null);rect(c,64,43,10,3,'#c491ff');rect(c,81,43,9,3,'#c491ff');
    poly(c,[[75,31],[79,30],[81,59],[76,64]],'#a7a5ac');
    c.strokeStyle='#bb9b66';c.lineWidth=2;c.beginPath();c.arc(77,24,20,Math.PI,Math.PI*2);c.stroke();
    [58,67,77,87,96].forEach((x,i)=>{rect(c,x,8-(i===2?7:0),2,16,'#bb9b66');});
    const sx=frame?124:116;
    poly(c,[[sx,36],[sx+3,34],[sx+6,140],[sx+3,143]],'#ae96c4');
    poly(c,[[sx-8,37],[sx-9,30],[sx+2,22],[sx+17,25],[sx+30,43],[sx+29,66],[sx+24,53],[sx+15,40],[sx+4,35]],'#81649f','#c09ad5');
    poly(c,[[sx+2,25],[sx+14,29],[sx+24,44],[sx+27,55],[sx+23,46],[sx+11,34],[sx-3,32]],'#bb8aeb',null);
  }
  sprites.set(key,img);return img;
}
export function drawPlayer(c,p,time,{scale=1,alpha=1,attacking=false,now=time}={}){
  const a=p.facing||0,direction=Math.abs(Math.cos(a))>.65?(Math.cos(a)>0?1:3):(Math.sin(a)>0?0:2);
  const animated=characterFrame(p,time,now),img=animated?.image||playerSprite(p.classId,direction,0,attacking);
  c.save();c.globalAlpha=alpha;
  drawCastShadow(c,img,p,(img.ironFrame?.width||img.width)*scale,(img.ironFrame?.height||img.height)*scale,15*scale);
  c.fillStyle='#030b1280';c.beginPath();c.ellipse(p.x,p.y+7,22*scale,9*scale,0,0,Math.PI*2);c.fill();
  const recoil=recoilOffset(p,now);c.translate(p.x+recoil.x,p.y+recoil.y);
  const motion=actorMotion(p,time,now);if(p.hp>0){c.translate(0,motion.lift);c.rotate(motion.lean);c.scale(motion.sx,motion.sy);}
  if(p.hp<=0){if(!animated?.downPose)c.rotate(-Math.PI/2);c.globalAlpha*=animated?.downPose ? .78 : .5;}
  else if(p.dodgeUntil>now){c.rotate(Math.sin((now-p.dodgeAt)/.24*Math.PI)*.35);c.globalAlpha*=.75;}
  if(animated?.flip)c.scale(-1,1);
  if(animated?.bowPhase==='aim'&&Math.hypot(p.vx||0,p.vy||0)>12)c.translate(0,Math.sin(time*8)*.8);
  const hurt=now-(p.lastHurt??-10);
  const iw=img.ironFrame?.width||img.width,ih=img.ironFrame?.height||img.height;drawPose(c,p.id||p.classId,animated?.next?{...animated,image:hurt>=0&&hurt<.16?hitFlash(img):img,next:hurt>=0&&hurt<.16?hitFlash(animated.next):animated.next}:{image:hurt>=0&&hurt<.16?hitFlash(img):img},-iw/2*scale,(-ih+15)*scale,iw*scale,ih*scale,time);c.restore();
}
export function drawBoss(c,b,round,time,now=time){
  const animation=bossFrame(b,round,time,now),img=animation||bossSprite(round,['windup','execute'].includes(b.state)?1:0),sc=round===1?1.1:1;
  c.save();drawCastShadow(c,img,b,animation?210:206,animation?210:206,23);c.fillStyle='#030510a0';c.beginPath();c.ellipse(b.x,b.y+8,68,25,0,0,Math.PI*2);c.fill();
  if(b.hp<=0)c.globalAlpha=.35;
  if(b.state==='transition'){c.shadowColor=BOSSES[round].color;c.shadowBlur=22;}

  let w=animation?210:206,h=animation?210:206;if(b.state==='fallen'){h*=.45;w*=1.1;}if(b.state==='dormant'){h*=round===1?.6:.77;w*=round===2?.77:1;c.filter='brightness(.5) saturate(.6)';}
  const bob=b.state==='chase'?Math.sin(time*6)*1.3:0;
  const motion=actorMotion(b,time,now,true),recoil=recoilOffset(b,now,true);c.translate(b.x+recoil.x,b.y+23+bob+motion.lift+recoil.y);c.rotate(motion.lean);c.scale(motion.sx*(b.walkFlip?-1:1),motion.sy);drawPose(c,'boss-'+round,b.strikePose?{...b.strikePose,image:now-b.hurtAt<.055?hitFlash(img):img,next:now-b.hurtAt<.055?hitFlash(b.strikePose.next):b.strikePose.next}:{image:now-b.hurtAt<.055?hitFlash(img):img},-w*sc/2,-h*sc,w*sc,h*sc,time);c.restore();
}

const terrains=new Map();
export function terrain(round){
  const painted=sceneImage(round);if(painted)return painted;
  if(terrains.has(round))return terrains.get(round);
  const img=canvas(WORLD.w,WORLD.h),c=img.getContext('2d'),random=rng(741+round*997);
  const palettes=[['#293233','#303a39','#323b39','#263031','#35403e'],['#202f29','#24382d','#283a2d','#293b30','#23332c'],['#2c2c39','#30313c','#33343e','#292c37','#35343f']][round];
  rect(c,0,0,1200,760,'#0b1219');
  for(let y=35;y<730;y+=24)for(let x=35-(Math.floor(y/24)%2)*24;x<1160;x+=48){
    const p=palettes[Math.floor(random()*palettes.length)];rect(c,x,y,46,22,p);rect(c,x,y,46,1,'#69706724');rect(c,x,y+20,46,2,'#11191e35');
    for(let i=0;i<3;i++){rect(c,x+random()*43,y+random()*18,1+Math.floor(random()*4),1,i%2?'#7a83741a':'#101b2055');}
    if(random()<.17){c.strokeStyle='#101a2180';c.beginPath();c.moveTo(x+22,y+1);c.lineTo(x+29,y+9);c.lineTo(x+24,y+14);c.lineTo(x+34,y+21);c.stroke();}
    if(round===1&&random()<.4){for(let i=0;i<9;i++)rect(c,x+random()*44,y+random()*22,2,2,['#42543c','#394c36','#4b6140'][i%3]);}
  }
  // Inlaid arena ring, etched radial symbols and broken mosaic.
  c.save();c.translate(600,380);c.strokeStyle=round===0?'#948b6534':round===1?'#8b9a5e22':'#8d7baf38';c.lineWidth=2;
  for(const rad of [200,211,285,292]){c.beginPath();c.ellipse(0,0,rad,rad*.78,0,0,Math.PI*2);c.stroke();}
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.save();c.translate(Math.cos(a)*246,Math.sin(a)*192);c.rotate(a);c.strokeRect(-4,-7,8,14);c.beginPath();c.moveTo(-7,0);c.lineTo(7,0);c.moveTo(0,-10);c.lineTo(0,10);c.stroke();c.restore();}
  c.restore();
  // Hand-built wall courses, doors and broken crenellations.
  for(let y=0;y<42;y+=12)for(let x=0;x<1200;x+=48){
    rect(c,x+(y%24?20:0),y,45,10,['#384043','#30383e','#40474a'][Math.floor(random()*3)]);rect(c,x+(y%24?20:0),y,45,1,'#87918c33');
  }
  rect(c,0,39,1200,7,'#0b131c');rect(c,0,46,1200,3,'#5c655c44');
  for(const x of [0,1160]){for(let y=45;y<730;y+=30){rect(c,x,y,39,28,'#303a3d');rect(c,x+1,y+1,34,2,'#626d683d');}rect(c,x===0?37:x,45,4,690,'#0c1620');}
  for(let x=0;x<1200;x+=44){rect(c,x,730,42,30,'#2c363a');rect(c,x,730,42,2,'#6c777266');}
  // Altar / arena entrance.
  for(let i=0;i<4;i++)rect(c,510+i*12,46+i*7,180-i*24,7,i%2?'#3f4947':'#4b524d');
  if(round===0){
    rect(c,567,28,66,49,'#1b252d');rect(c,577,32,46,39,'#3a3e41');rect(c,581,36,38,28,'#5c3f3c');rect(c,568,61,65,10,'#6c6051');
    for(let i=0;i<5;i++)poly(c,[[572+i*12,33],[578+i*12,13],[584+i*12,33]],'#75634d');
    // Tattered carpets guide the eye toward the throne.
    for(let y=85;y<710;y+=7){if(random()>.1)rect(c,579+random()*3,y,42-random()*5,7,'#53333577');if(y%21===1){rect(c,580,y,2,4,'#a58b5833');rect(c,617,y,2,4,'#a58b5833');}}
    for(const x of [73,1120])for(let y=100;y<700;y+=100){poly(c,[[x,y],[x+15,y+4],[x+15,y+48],[x+7,y+57],[x,y+49]],'#623d3f');rect(c,x+6,y+11,2,28,'#9a8058');rect(c,x+2,y+22,11,2,'#9a8058');}
  }
  if(round===1){
    for(let i=0;i<26;i++){
      const x=random()*1200,y=random()<.5?random()*65:695+random()*65;
      poly(c,[[x,y],[x+8,y-15],[x+13,y+5],[x+25,y-10],[x+19,y+12],[x+1,y+15]],'#344c37');
      rect(c,x+8,y-3,2,17,'#66714a');
    }
    for(let i=0;i<80;i++){const x=55+random()*1090,y=60+random()*650;rect(c,x,y,3,1,'#76805288');rect(c,x+2,y-2,1,4,'#5f7449');}
  }
  if(round===2){
    for(const x of [85,1090])for(let y=100;y<690;y+=85){rect(c,x,y,24,39,'#222b39');rect(c,x+4,y+4,16,29,'#4b4360');rect(c,x+11,y+4,2,29,'#a17f9250');rect(c,x+4,y+16,16,2,'#a17f9250');}
    for(let i=0;i<13;i++)rect(c,526+i*12,47,6,35,i%2?'#81738633':'#9d765533');
  }
  // Rubble, bones, tiny vegetation and discarded masonry.
  for(let i=0;i<145;i++){
    const x=55+random()*1090,y=57+random()*651;
    if(random()<.7&&Math.abs(x-600)<350&&Math.abs(y-380)<240)continue;
    rect(c,x+1,y+3,8,3,'#101a20a0');rect(c,x,y,5+Math.floor(random()*9),4+Math.floor(random()*4),'#48514b');rect(c,x,y,6,1,'#8b8a6b44');
  }
  terrains.set(round,img);return img;
}
export function pillar(c,o,round){
  const x=o.x,y=o.y;
  const painted=sceneImage(round);if(o.crop&&painted){const[sx,sy,sw,sh]=o.crop;c.drawImage(painted,sx,sy,sw,sh,sx*WORLD.w/1536,sy*WORLD.h/1024,sw*WORLD.w/1536,sh*WORLD.h/1024);return;}
  if(o.kind){cover(c,o,round);return;}
  c.fillStyle='#060c1266';c.beginPath();c.ellipse(x+12,y+13,o.r+8,16,0,0,Math.PI*2);c.fill();
  if(round===1){
    poly(c,[[x-20,y+9],[x-8,y-18],[x-12,y-90],[x+8,y-105],[x+21,y-76],[x+14,y-17],[x+32,y+12],[x+11,y+5],[x+1,y+18],[x-8,y+3]],'#333d32');
    poly(c,[[x-5,y-76],[x+2,y-91],[x+6,y-24],[x,y+5],[x-5,y-14]],'#5a5940',null);
    for(let i=0;i<4;i++){poly(c,[[x,y-42-i*11],[x-26-i*4,y-65-i*12],[x-34-i*5,y-93-i*9],[x-23-i*3,y-78-i*8],[x-11,y-66-i*8]],'#3d4d36');}
    for(let i=0;i<5;i++)poly(c,[[x+4,y-34-i*13],[x+31,y-48-i*9],[x+38,y-69-i*9],[x+20,y-54-i*8]],'#46593b');
    return;
  }
  rect(c,x-29,y-1,58,17,'#1c2831');rect(c,x-30,y-5,60,12,'#56605a');rect(c,x-26,y-3,52,2,'#85877a');
  rect(c,x-21,y-73,42,69,'#404b50');rect(c,x-19,y-71,8,65,'#596460');rect(c,x+9,y-71,9,65,'#2b3842');
  for(let j=0;j<4;j++){rect(c,x-21,y-61+j*17,42,2,'#222f37');rect(c,x-21,y-59+j*17,42,1,'#6c746655');}
  rect(c,x-27,y-83,54,11,'#5f6760');rect(c,x-23,y-90,46,8,'#3e4c51');rect(c,x-26,y-84,51,2,'#91927c');
  if(round===2){rect(c,x-4,y-63,8,32,'#473f58');rect(c,x-9,y-52,18,4,'#aa9164');rect(c,x-2,y-61,3,25,'#aa9164');}
}
function cover(c,o,round){
 const {x,y,r,kind}=o;c.save();c.translate(x,y);c.fillStyle='#050b1277';c.beginPath();c.ellipse(8,8,r+8,r*.55,0,0,7);c.fill();
 if(kind==='stump'){c.fillStyle='#353b2d';c.fillRect(-r*.7,-29,r*1.4,34);c.fillStyle='#766e4c';c.beginPath();c.ellipse(0,-28,r*.72,r*.4,0,0,7);c.fill();c.strokeStyle='#4b5135';for(let i=1;i<=3;i++){c.beginPath();c.ellipse(0,-28,r*i*.18,r*i*.09,0,0,7);c.stroke();}}
 else if(kind==='pew'){for(const yy of [-15,0]){rect(c,-r,yy-18,r*2,12,'#4c3841');rect(c,-r,yy-18,r*2,2,'#a18a67');}rect(c,-r,-38,7,46,'#4d4248');rect(c,r-7,-38,7,46,'#4d4248');}
 else{for(let i=0;i<7;i++){const a=i*2.4,xx=Math.cos(a)*r*.6,yy=Math.sin(a)*r*.32;poly(c,[[xx-12,yy],[xx-9,yy-18],[xx+8,yy-23],[xx+16,yy-9],[xx+13,yy+3]],kind==='altar'?'#5c5467':kind==='stone'?'#4b6157':'#5b6261');rect(c,xx-7,yy-17,12,2,kind==='altar'?'#b49371':'#8a9282');}}
 if(round===1)for(let i=0;i<5;i++)rect(c,-r+10+i*9,-12-Math.sin(i)*15,5,3,'#688457');c.restore();
}
const glowCache=new Map();
export function light(c,x,y,r,color,alpha=.3){
 let image=glowCache.get(color);if(!image){image=document.createElement('canvas');image.width=image.height=192;const q=image.getContext('2d'),g=q.createRadialGradient(96,96,0,96,96,96);g.addColorStop(0,color);g.addColorStop(1,'transparent');q.fillStyle=g;q.fillRect(0,0,192,192);glowCache.set(color,image);}
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=alpha;c.drawImage(image,x-r,y-r,r*2,r*2);c.restore();
}
export function torch(c,x,y,time,color='#f0a663'){
  rect(c,x-5,y,10,17,'#1a222b');rect(c,x-8,y-2,16,5,'#8e7452');
  poly(c,[[x-6,y],[x-8,y-11],[x-3,y-16],[x+Math.sin(time*9)*3,y-29],[x+4,y-17],[x+8,y-11],[x+5,y]],'#b3653d',null);
  poly(c,[[x-3,y-2],[x-4,y-12],[x+1,y-20],[x+3,y-9],[x+2,y]],color,null);
  rect(c,x-1,y-10,3,7,'#ffe3a2');light(c,x,y-12,105+Math.sin(time*8)*4,color,.27);
}
export function exportAtlas(){
  const out=canvas(76*8,80*12),c=out.getContext('2d');let row=0;
  const frames=[];
  for(const cls of Object.keys(CLASSES))for(let d=0;d<4;d++){
    for(let f=0;f<8;f++){c.drawImage(playerSprite(cls,d,f%3,f>=6),f*76,row*80);frames.push({name:`${cls}-${d}-${f}`,x:f*76,y:row*80,w:76,h:80});}row++;
  }
  return {url:out.toDataURL('image/png'),frames};
}

const silhouetteCache=new WeakMap();
export function drawPlayerHighlight(c,p,time,now){
 const pose=characterFrame(p,time,now);if(!pose)return;const img=pose.image;let entry=silhouetteCache.get(img);
 if(!entry){
  const fill=document.createElement('canvas');fill.width=img.width;fill.height=img.height;fill.ironFrame=img.ironFrame;const q=fill.getContext('2d');q.fillStyle='#ffe5a5';q.fillRect(0,0,fill.width,fill.height);q.globalCompositeOperation='destination-in';q.drawImage(img,0,0);
  const edge=document.createElement('canvas');edge.width=img.width+4;edge.height=img.height+4;if(img.ironFrame)edge.ironFrame={...img.ironFrame,left:img.ironFrame.left-2,top:img.ironFrame.top-2};const e=edge.getContext('2d');for(const[x,y]of [[-1.25,0],[1.25,0],[0,-1.25],[0,1.25]])e.drawImage(fill,2+x,2+y);e.globalCompositeOperation='destination-out';e.drawImage(fill,2,2);entry={fill,edge};silhouetteCache.set(img,entry);
 }
 const m=actorMotion(p,time,now),w=img.ironFrame?.width||img.width,h=img.ironFrame?.height||img.height;
 const recoil=recoilOffset(p,now);c.save();c.translate(p.x+recoil.x,p.y+m.lift+recoil.y);c.rotate(m.lean);c.scale((pose.flip?-1:1)*m.sx,m.sy);c.globalAlpha=.85;drawAnimatedFrame(c,entry.edge,-w/2,-h+15,w,h);c.globalAlpha=.1;drawAnimatedFrame(c,entry.fill,-w/2,-h+15,w,h);c.restore();
}
