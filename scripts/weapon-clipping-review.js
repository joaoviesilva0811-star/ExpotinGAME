import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1120}});await page.goto(process.env.TEST_URL||'http://127.0.0.1:3006');await page.waitForTimeout(2000);
 const count=await page.evaluate(async()=>{
  const {drawPlayer,drawBoss}=await import('/art.js'),{characterFrame,bossFrame}=await import('/animation.js');
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1120;const c=canvas.getContext('2d');c.fillStyle='#111922';c.fillRect(0,0,1440,1120);c.imageSmoothingEnabled=false;c.font='24px Pixelify';c.fillStyle='#d4bf91';c.fillText('ARMAS COMPLETAS · CORPO NA MESMA ESCALA · BORDA VERMELHA = CACHE ANTIGO',26,36);
  let outside=0;
  for(let row=0;row<3;row++)for(let col=0;col<6;col++){
   const x=col*240+120,y=row*350+330,now=10,p={id:'review-'+row+col,classId:['knight','archer','rogue'][row],x,y,facing:-Math.PI/2,vx:0,vy:0,hp:100,attackAt:now-(col+.1)/6*.52,attackFor:.52,attackSlot:-1,lastHurt:-10};
   if(col<3){drawPlayer(c,p,0,{now});const image=characterFrame(p,0,now)?.image;if(image?.ironFrame&&(image.ironFrame.top<0||image.ironFrame.left<0||image.width>100))outside++;c.strokeStyle='#df7b7977';c.strokeRect(x-50,y-77,100,92);}
   else{const b={x,y,facing:Math.PI/2+(col-3)*Math.PI/4,hp:100,state:'execute',attack:0,startedAt:now-.32,executeFor:.45,hurtAt:-10};drawBoss(c,b,row,0,now);assertImage(bossFrame(b,row,0,now));c.strokeStyle='#df7b7977';c.strokeRect(x-105,y-187,210,210);}
  }
  function assertImage(image){if(!image?.ironFrame)throw new Error('Animated sprite did not load');}
  Object.assign(canvas.style,{position:'fixed',inset:0,width:'100vw',height:'100vh',zIndex:100});document.body.append(canvas);return outside;
 });assert.ok(count>0);await page.screenshot({path:'artifacts/141-weapons-complete.png'});console.log('PASS: hero and boss weapons rendered with the same body anchor and space outside the old canvas.');
}finally{await browser.close();}
