import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}});await page.goto(process.env.TEST_URL||'http://127.0.0.1:3006');
 const result=await page.evaluate(async()=>{
  const {drawVolume,volumeAssetsReady}=await import('/volumes.js'),{terrain}=await import('/art.js');if(!await volumeAssetsReady)throw new Error('VFX atlas missing');
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1080;const c=canvas.getContext('2d');c.fillStyle='#111922';c.fillRect(0,0,1440,1080);c.imageSmoothingEnabled=false;c.fillStyle='#e5c88c';c.font='28px Pixelify';c.fillText('CERCO DAS FERAS · 9 MODELOS DE IMPACTO · 54 QUADROS',32,48);
  const rows=[['redEruption','steelSweep','stoneWave'],['rootEruption','poisonCloud','ironChains'],['crystalEruption','voidSweep','voidRift']],labels=['ERUPÇÃO DE BRASAS','CORTE DE AÇO','ONDA DE PEDRAS','RAÍZES ANCESTRAIS','NUVEM VENENOSA','CORRENTES DE FERRO','ESTILHAÇOS DO VAZIO','CORTE DA FOICE','FENDA DO VAZIO'];
  let drawn=0;
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
   const x=col*480,y=85+row*328;c.save();c.beginPath();c.rect(x+12,y,456,300);c.clip();c.globalAlpha=.4;c.drawImage(terrain(row),100,150,450,300,x+12,y,456,300);c.globalAlpha=1;
   drawn+=Number(drawVolume(c,['red','green','violet'][row],x+240,y+(row===0&&col>0||row===2&&col===1?170:254),row===0&&col>0||row===2&&col===1?350:250,.4,1,false,rows[row][col]));c.restore();c.font='21px Pixelify';c.fillStyle='#e5cfaa';c.fillText(labels[row*3+col],x+32,y+280);
  }
  Object.assign(canvas.style,{position:'fixed',inset:0,width:'100vw',height:'100vh',zIndex:100});document.body.append(canvas);return drawn;
 });assert.equal(result,9);await page.screenshot({path:'artifacts/14-effect-models.png'});console.log('PASS: all nine distinct animated models loaded and rendered.');
}finally{await browser.close();}
