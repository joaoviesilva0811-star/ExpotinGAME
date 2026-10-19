// Browser acceptance test. Bots exist ONLY in this test: they send ordinary
// movement/skill intentions through four separate authenticated connections.
// No server state, damage, HP, cooldown, timer, or result is changed by the test.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});
const origin=process.env.TEST_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const errors=[];
async function createPlayer(name,classId){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{
    const NativeSocket=window.WebSocket;let seq=Date.now()*1000;
    window.WebSocket=class extends NativeSocket{
      constructor(...args){super(...args);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='welcome')window.__session=m.session;if(m.room)window.__room=m.room;});}
      send(raw){
        let m=JSON.parse(raw),r=window.__room,p=r?.players.find(p=>p.id===window.__session?.id);
        if(['input','skill'].includes(m.type))m.seq=++seq;
        if(m.type!=='input'||r?.state!=='battle'||!p||p.hp<=0)return super.send(JSON.stringify(m));
        const b=r.boss,dx=b.x-p.x,dy=b.y-p.y,dist=Math.hypot(dx,dy),dir={x:dx/(dist||1),y:dy/(dist||1)},desired=p.classId==='archer'?300:90;
        let mx=dist>desired+12?dir.x:dist<desired-12?-dir.x:0,my=dist>desired+12?dir.y:dist<desired-12?-dir.y:0;
        const danger=(pos,h)=>{if(Math.hypot(pos.x-h.x,pos.y-h.y)>h.r+24)return false;if(h.shape==='cone'){const a=Math.atan2(pos.y-h.y,pos.x-h.x);return Math.abs(Math.atan2(Math.sin(a-h.angle),Math.cos(a-h.angle)))<h.spread+.12;}return true;};
        const threats=r.hazards.filter(h=>h.end>r.now&&h.at<r.now+1.7&&!h.solid);
        if(threats.some(h=>danger(p,h))){let best=-Infinity;for(let i=0;i<24;i++){
          const a=i/24*Math.PI*2,x=Math.cos(a),y=Math.sin(a),next={x:p.x+x*180,y:p.y+y*180};let score=0;
          if(next.x<60||next.x>1140||next.y<60||next.y>700)score-=2000;
          for(const h of threats)if(danger(next,h))score-=1000;
          score-=Math.abs(Math.hypot(next.x-b.x,next.y-b.y)-desired)*.1;
          if(score>best){best=score;mx=x;my=y;}
        }}
        m={type:'input',seq:m.seq,x:mx,y:my,ax:dir.x,ay:dir.y,attack:true,block:false,revive:false};
        super.send(JSON.stringify(m));
        if(dist<(p.classId==='archer'?520:150)){
          let budget=p.energy;
          for(const slot of [0,...(p.classId==='archer'?[1]:[]),2]){
            const cost=[20,30,40][slot];
            if(p.cds[slot]<=r.now&&budget>=cost){super.send(JSON.stringify({type:'skill',slot,seq:++seq}));budget-=cost;}
          }
        }
      }
    };
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.locator('#player-name').fill(name);await page.locator('#guest-submit').click();await page.locator('#create-room').waitFor({state:'visible'});
  page.classId=classId;return page;
}
try{
  const pages=[];
  for(const [name,cls]of [['Aldric','knight'],['Lyra','archer'],['Nyx','rogue'],['Elowen','archer']])pages.push(await createPlayer(name,cls));
  const a=pages[0];await a.locator('#create-room').click();await a.locator('.room-code-box strong').waitFor();const code=await a.locator('.room-code-box strong').textContent();
  for(const p of pages.slice(1)){await p.locator('#room-code').fill(code);await p.locator('#join-form button').click();await p.locator(`[data-class="${p.classId}"]`).click();}
  for(const p of pages)await p.getByRole('button',{name:'Estou pronto'}).click();
  await a.getByRole('button',{name:'Iniciar expedição'}).click();
  for(let round=0;round<3;round++){
    await a.waitForFunction(round=>window.__room?.round===round&&window.__room.state==='battle',round,{timeout:120000});
    await a.waitForTimeout(2500);await a.screenshot({path:`artifacts/arena-${round+1}.png`,fullPage:true});
    console.log(`Round ${round+1}: ${await a.locator('#boss-name').textContent()}`);
  }
  await a.waitForFunction(()=>window.__room?.state==='finished',null,{timeout:120000});await a.waitForTimeout(400);
  await a.screenshot({path:'artifacts/08-vitoria.png',fullPage:true});
  const results=await Promise.all(pages.map(p=>p.evaluate(()=>({score:window.__room.score,wins:window.__room.wins,state:window.__room.state,rounds:window.__room.results.length,damage:window.__room.players.map(p=>p.stats.damage)}))));
  for(const r of results){assert.equal(r.state,'finished');assert.equal(r.rounds,3);assert.equal(r.wins,3);assert.equal(r.score,results[0].score);assert.ok(r.damage.every(d=>d>0));}
  assert.deepEqual(errors,[]);console.log('PASS: four independent browser sessions completed all three bosses via ordinary combat commands. Identical victory, score and results in all clients.',JSON.stringify(results[0]));
}finally{await browser.close();}
