import {introFilmShot} from './intro-timing.js';
import {sceneImage} from './scenes.js';
import {BOSSES,clamp} from './shared.js';
const PANEL_ROWS=[[0,345,669,1024],[0,344,669,1024],[0,342,670,1024]];
const CAPTIONS=[
 ['UM REI ESQUECIDO. UM JURAMENTO A CUMPRIR.','ALDRIC ERGUE O ESCUDO. NINGUÉM RECUA.','O FERRO CAI. A COROA EXIGE SEU TRIBUTO.'],
 ['SOB AS RAÍZES, O ANTIGO GUARDIÃO RESPIRA.','LYRA PREPARA A FLECHA. A FLORESTA ESCUTA.','A PASSAGEM SE FECHA. THARAZUL DESPERTA.'],
 ['O ÚLTIMO SELO DORME SOB O ECLIPSE.','NYX SACA AS LÂMINAS. A LUZ SE APAGA.','AS CORRENTES ECOAM. AZRAKIEL OS AGUARDA.']
];
// Original comic panels based on the dialogue model sheet. Never composite
// gameplay sprites over a differently illustrated backdrop. PNGs stay unedited.
export function drawIntroFilm(c,room,now,time,{x=0,y=0,reduced=false}={}){
 const shot=introFilmShot(room,now);if(!shot)return false;
 const round=room.round,image=sceneImage('comic-'+['throne','forest','cathedral'][round]);
 const color=['#e9b373','#94ca82','#ba9de0'][round],rows=PANEL_ROWS[round];
 c.save();c.globalAlpha=shot.opacity;c.translate(reduced?0:x,reduced?0:y);c.fillStyle='#090b10';c.fillRect(-24,-24,1248,808);
 const px=110,pw=980,top=58,total=620,gap=7;
 for(let i=0;i<3;i++){
  const sy=rows[i],sh=rows[i+1]-sy,ph=total*sh/1024-gap,py=top+total*sy/1024;
  c.fillStyle='#17151a';c.fillRect(px-3,py-3,pw+6,ph+6);
  const shown=i<shot.index?1:i===shot.index?(reduced?1:clamp(shot.progress*4,0,1)):0;
  if(image&&shown>0){
   c.save();c.beginPath();c.rect(px,py,pw*shown,ph);c.clip();
   const move=reduced?0:Math.sin((shot.age+i)*.4)*2;
   c.drawImage(image,0,sy,image.width,sh,px-2+move,py-1,pw+4,ph+2);
   if(i!==shot.index){c.fillStyle='#080b1766';c.fillRect(px,py,pw,ph);}
   if(i===shot.index&&!reduced){
    c.fillStyle=color;for(let k=0;k<16;k++){c.globalAlpha=shot.opacity*(.12+(k%4)*.04);const qx=px+(k*173+shot.age*(7+k%4))%pw,qy=py+ph-(k*47+shot.age*12)%ph;c.fillRect(qx,qy,2,2);}
   }
   c.restore();
  }
  c.globalAlpha=shot.opacity;c.strokeStyle=i===shot.index?color:'#5b4c3b';c.lineWidth=i===shot.index?2:1;c.strokeRect(px-3,py-3,pw+6,ph+6);
  c.fillStyle='#101117';c.fillRect(px+8,py+8,26,22);c.fillStyle=i===shot.index?color:'#86776b';c.font='15px Pixelify,monospace';c.textAlign='center';c.fillText(String(i+1).padStart(2,'0'),px+21,py+24);
 }
 c.globalAlpha=shot.opacity;c.textAlign='center';c.fillStyle=color;c.font='13px Pixelify,monospace';c.fillText(['I · O REI SEM TRONO','II · O CORAÇÃO SOB AS RAÍZES','III · O ÚLTIMO ECLIPSE'][round],600,29);
 c.font='bold 19px Pixelify,monospace';c.fillStyle='#f0ddba';c.fillText(CAPTIONS[round][shot.index],600,716);
 c.font='12px Pixelify,monospace';c.fillStyle=color;c.fillText(BOSSES[round].arena.toUpperCase()+' · '+(shot.index+1)+'/3',600,744);
 c.restore();return true;
}
