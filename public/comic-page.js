import {comicCaption,comicEase,comicPanelMotion,comicPanelRects} from './comic-timing.js';
const patterns=new Map(),contextPatterns=new WeakMap(),captionLayouts=new Map();
function paperPattern(c,color){
 let context=contextPatterns.get(c);if(!context){context=new Map();contextPatterns.set(c,context);}if(context.has(color))return context.get(color);
 let tile=patterns.get(color);if(!tile){const image=document.createElement('canvas');image.width=image.height=96;const q=image.getContext('2d');q.fillStyle='#0b0f16';q.fillRect(0,0,96,96);q.fillStyle='#b5a17b08';for(let i=0;i<42;i++)q.fillRect(i*37%96,i*61%96,1+(i%3),1);q.strokeStyle=color+'08';q.beginPath();q.moveTo(0,95);q.lineTo(95,0);q.stroke();tile=image;patterns.set(color,tile);if(patterns.size>8)patterns.delete(patterns.keys().next().value);}
 const pattern=c.createPattern(tile,'repeat');context.set(color,pattern);return pattern;
}
function corner(c,x,y,dx,dy,color){
 c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x+dx*17,y);c.lineTo(x,y);c.lineTo(x,y+dy*15);c.moveTo(x+dx*6,y+dy*3);c.lineTo(x+dx*3,y+dy*3);c.lineTo(x+dx*3,y+dy*7);c.stroke();c.fillStyle=color;c.fillRect(x+dx*5-1,y+dy*5-1,2,2);
}
function pageMotes(c,p,shot,color,motif){
 c.fillStyle=color;c.strokeStyle=color;c.lineWidth=1;
 for(let k=0;k<16;k++){
  const t=shot.age,s=k*2.399,px=p.x+(k*173+t*(6+k%4))%p.w,py=p.y+p.h-(k*47+t*(8+k%5))%p.h;
  c.globalAlpha=shot.opacity*(.14+(k%4)*.035);
  if(motif==='leaf'){const a=Math.sin(t*.7+s)*1.2;c.save();c.translate(px,py);c.rotate(a);c.beginPath();c.moveTo(-3,0);c.quadraticCurveTo(0,-3,4,0);c.quadraticCurveTo(0,2,-3,0);c.fill();c.restore();}
  else if(motif==='void'){const a=t*.4+s;c.beginPath();c.moveTo(px-Math.cos(a)*2,py-Math.sin(a)*2);c.lineTo(px+Math.cos(a)*2,py+Math.sin(a)*2);c.stroke();}
  else c.fillRect(px,py,1+k%2,k%5?1:3);
 }
}
// Canvas-only HQ director. Paints original art as panels with matching lighting
// and framing; never overlays a sprite or blends two character silhouettes.
export function drawComicPage(c,image,shot,{title='',caption='',footer='',color='#e9b373',rows=[0,1/3,2/3,1],x=0,y=0,reduced=false,seed=0,motif='ember'}={}){
 if(!shot||shot.opacity<=0)return false;
 const panels=comicPanelRects(image?.width||1536,image?.height||1024,rows);if(!panels.length)return false;
 c.save();c.globalAlpha=shot.opacity;c.translate(reduced?0:x,reduced?0:y);c.imageSmoothingEnabled=false;c.fillStyle='#080b12';c.fillRect(-24,-24,1248,808);
 c.fillStyle=paperPattern(c,color)||'#0b0f16';c.fillRect(42,40,1116,662);
 c.strokeStyle='#65533b66';c.lineWidth=1;c.strokeRect(43,41,1114,660);
 for(const p of panels){
  const m=comicPanelMotion(shot,p.index,reduced),active=m.active;
  c.globalAlpha=shot.opacity;c.fillStyle='#15151c';c.fillRect(p.x-4,p.y-4,p.w+8,p.h+8);
  if(image&&m.reveal>0){
   c.save();c.beginPath();
   if(m.reveal<1){const edge=p.x+(p.w+20)*m.reveal;c.moveTo(p.x,p.y);c.lineTo(edge+10,p.y);c.lineTo(edge-10,p.y+p.h);c.lineTo(p.x,p.y+p.h);c.closePath();}
   else c.rect(p.x,p.y,p.w,p.h);
   c.clip();const dw=p.w*m.zoom,dh=p.h*m.zoom;
   c.drawImage(image,p.sx,p.sy,p.sw,p.sh,p.x-(dw-p.w)/2+m.pan,p.y-(dh-p.h)/2,dw,dh);
   if(!active){c.fillStyle='#070b18';c.globalAlpha=shot.opacity*(1-m.opacity);c.fillRect(p.x,p.y,p.w,p.h);}
   if(m.particles){c.save();pageMotes(c,p,{...shot,age:shot.age+seed*.01},color,motif);c.restore();}
   if(active&&!reduced){const glow=(1-comicEase(shot.progress/.3))*.12;if(glow>0){c.globalCompositeOperation='screen';c.globalAlpha=shot.opacity*glow;c.fillStyle=color;c.fillRect(p.x,p.y,p.w,p.h);}}
   c.restore();
  }
  c.globalAlpha=shot.opacity;c.strokeStyle=active?color:'#74634b';c.lineWidth=active?2:1;c.strokeRect(p.x-3,p.y-3,p.w+6,p.h+6);
  corner(c,p.x-6,p.y-6,1,1,active?color:'#74634b');corner(c,p.x+p.w+6,p.y+p.h+6,-1,-1,active?color:'#74634b');
  c.fillStyle='#101219';c.fillRect(p.x+7,p.y+7,30,24);c.strokeStyle=active?color:'#76634a';c.strokeRect(p.x+7.5,p.y+7.5,29,23);c.fillStyle=active?color:'#b49d7e';c.font='14px Pixelify,monospace';c.textAlign='center';c.fillText(String(p.index+1).padStart(2,'0'),p.x+22,p.y+24);
  if(active){c.globalAlpha=shot.opacity*.7;c.fillStyle=color;c.fillRect(p.x,p.y+p.h+2,p.w*comicEase(shot.progress),1);}
 }
 c.globalAlpha=shot.opacity;c.textAlign='center';c.font='13px Pixelify,monospace';c.fillStyle=color;c.fillText(title,600,27);
 c.strokeStyle=color+'77';c.lineWidth=1;for(const side of [-1,1]){c.beginPath();c.moveTo(600+side*270,22);c.lineTo(600+side*510,22);c.stroke();c.save();c.translate(600+side*522,22);c.rotate(Math.PI/4);c.strokeRect(-3,-3,6,6);c.restore();}
 c.fillStyle='#090d16';c.fillRect(95,704,1010,34);c.strokeStyle='#66523988';c.beginPath();c.moveTo(95,704);c.lineTo(1105,704);c.stroke();
 let lines=captionLayouts.get(caption);if(!lines){c.font='bold 18px Pixelify,monospace';if(c.measureText(caption).width<=950)lines=[caption];else{c.font='bold 15px Pixelify,monospace';lines=[''];for(const word of caption.split(' ')){const last=lines.length-1,next=(lines[last]+' '+word).trim();if(c.measureText(next).width>950&&last===0)lines.push(word);else lines[last]=next;}}captionLayouts.set(caption,lines);if(captionLayouts.size>48)captionLayouts.delete(captionLayouts.keys().next().value);}
 c.font=lines.length>1?'bold 15px Pixelify,monospace':'bold 18px Pixelify,monospace';c.fillStyle='#f0ddba';const visible=comicCaption(lines.join('\n'),shot,reduced).split('\n');for(let i=0;i<visible.length;i++)c.fillText(visible[i],600,lines.length>1?717+i*16:725);
 c.font='10px Pixelify,monospace';c.fillStyle='#b9a184';c.fillText(footer,600,752);
 c.restore();return true;
}
