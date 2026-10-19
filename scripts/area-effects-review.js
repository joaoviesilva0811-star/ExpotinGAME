import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const origin=process.env.TEST_URL||'http://127.0.0.1:3003';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}});await page.goto(origin);await page.waitForTimeout(1000);
 const result=await page.evaluate(async()=>{
  const fx=await import('/vfx.js'),{terrain}=await import('/art.js');await(await import('/volumes.js')).volumeAssetsReady;
  const test=document.createElement('canvas');test.width=400;test.height=400;const t=test.getContext('2d');fx.resetFX();fx.hazardImpact({x:200,y:200,r:150,inner:75},'violet');fx.stepFX(.15);fx.drawGroundFX(t);
  const safe=t.getImageData(200,200,1,1).data[3],outside=t.getImageData(10,10,1,1).data[3],inside=t.getImageData(310,200,1,1).data[3];
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1080;const c=canvas.getContext('2d');c.fillStyle='#111922';c.fillRect(0,0,1440,1080);c.imageSmoothingEnabled=false;c.fillStyle='#e5c88c';c.font='28px Pixelify';c.fillText('IMPACTOS DOS CHEFES · TODA A ÁREA ATINGIDA',40,45);
  for(let round=0;round<3;round++){
   fx.resetFX();const y=120+round*312;
   c.save();c.beginPath();c.rect(25,y,1390,272);c.clip();c.globalAlpha=.38;c.drawImage(terrain(round),0,0,1200,760,25,y,1390,272);c.globalAlpha=1;
   const shapes=[{x:180,y:y+140,r:105},{x:530,y:y+140,r:105,inner:55},{x:820,y:y+140,r:122,shape:'cone',angle:-.35,spread:1.05},{x:1210,y:y+140,r:140,shape:'line',angle:-.35,length:260,width:95}];
   for(const h of shapes)fx.hazardImpact(h,['red','green','violet'][round]);for(let i=0;i<12;i++)fx.stepFX(.05);fx.drawGroundFX(c);fx.drawFX(c);c.restore();
   c.fillStyle=['#dfac92','#a7cd87','#cbb1ec'][round];c.font='19px Pixelify';c.fillText(['VARKHUL · FISSURAS, PEDRA E BRASAS','THARAZUL · RAÍZES E ENERGIA DA FLORESTA','AZRAKIEL · VEIOS E ESTILHAÇOS DO VAZIO'][round],40,y-17);
  }
  for(const [i,label]of ['CÍRCULO PREENCHIDO','ANEL · CENTRO SEGURO','CONE DIRECIONAL','FAIXA · TODA A LARGURA'].entries()){c.fillStyle='#c7c0af';c.font='17px Pixelify';c.fillText(label,60+i*355,88);}
  Object.assign(canvas.style,{position:'fixed',inset:0,width:'100vw',height:'100vh',zIndex:100});document.body.append(canvas);return{safe,outside,inside};
 });assert.equal(result.safe,0);assert.equal(result.outside,0);assert.ok(result.inside>0);await page.screenshot({path:'artifacts/14-area-impacts.png'});console.log('PASS: full impact surface visible inside, safe hole and outside remain clear.',result);
}finally{await browser.close();}
