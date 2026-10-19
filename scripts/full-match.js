// Browser acceptance test. Bots exist ONLY in this test: they send ordinary
// movement/skill intentions through four separate authenticated connections.
// No server state, damage, HP, cooldown, timer, or result is changed by the test.
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});
const origin=process.env.TEST_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const errors=[];
async function createPlayer(name,classId){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{
    if(location.protocol==='http:'||location.protocol==='https:')import('/shared.js').then(m=>window.__shared=m);
    const NativeSocket=window.WebSocket;let seq=Date.now()*1000;
    window.WebSocket=class extends NativeSocket{
      constructor(...args){super(...args);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='welcome')window.__session=m.session;if(m.room)window.__room=m.room;});}
      send(raw){
        let m=JSON.parse(raw),r=window.__room,p=r?.players.find(p=>p.id===window.__session?.id);
        if(['input','skill','dodge','potion'].includes(m.type))m.seq=++seq;
        if(m.type!=='input'||r?.state!=='battle'||!p||p.hp<=0)return super.send(JSON.stringify(m));
        const normalize=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};},distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
        const nearest=r.minions?.filter(m=>m.hp>0&&m.activeAt<=r.now).sort((a,b)=>distance(p,a)-distance(p,b))[0];
        const b=nearest&&distance(p,nearest)<(p.classId==='archer'?480:230)?nearest:r.boss,dist=distance(p,b),dir=normalize(b.x-p.x,b.y-p.y),desired=p.classId==='archer'?290:b===r.boss?96:67;
        const danger=(pos,h)=>{
          if(h.warningOnly)return false;const dx=pos.x-h.x,dy=pos.y-h.y,d=Math.hypot(dx,dy);
          if(h.shape==='line'){const along=dx*Math.cos(h.angle)+dy*Math.sin(h.angle),across=-dx*Math.sin(h.angle)+dy*Math.cos(h.angle);return Math.abs(along)<=h.length/2+23&&Math.abs(across)<=h.width/2+23;}
          if(d>h.r+23||h.inner&&d<h.inner-23)return false;
          if(h.shape==='cone'){const a=Math.atan2(dy,dx)-h.angle;return Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<h.spread+.1;}return true;
        };
        const threats=r.hazards.filter(h=>h.end>r.now&&h.at<r.now+1.6&&!h.solid),unsafe=threats.some(h=>danger(p,h));
        const down=r.players.filter(a=>a.id!==p.id&&a.hp<=0&&!a.eliminated&&a.downAt!==null&&r.now-a.downAt<19.5).sort((a,b)=>distance(p,a)-distance(p,b))[0];
        const reviving=!!(down&&distance(p,down)<73&&!unsafe);let mx=0,my=0;
        if(down&&!reviving&&!unsafe){const n=normalize(down.x-p.x,down.y-p.y);mx=n.x;my=n.y;}
        else if(!reviving){
          let best=-Infinity;const speed={knight:116,archer:140,rogue:158}[p.classId];
          const covers=[...window.__shared.ARENA_OBSTACLES[r.round],...r.hazards.filter(h=>h.solid&&h.at<=r.now)];
          for(let i=0;i<25;i++){
            const a=i/24*Math.PI*2,x=i===24?0:Math.cos(a),y=i===24?0:Math.sin(a),next={x:p.x+x*speed*.85,y:p.y+y*speed*.85};let score=-Math.abs(distance(next,b)-desired)*.12;
            if(next.x<65||next.x>1135||next.y<65||next.y>695)score-=2000;
            for(const h of threats)if(danger(next,h))score-=unsafe?1500:800;
            for(const o of covers)if(distance(next,o)<o.r+30)score-=1300;
            for(const q of r.projectiles.filter(q=>q.enemy))if(distance(next,{x:q.x+q.vx*.55,y:q.y+q.vy*.55})<45)score-=900;
            if(!unsafe&&i===24&&Math.abs(dist-desired)<20)score+=8;
            if(score>best){best=score;mx=x;my=y;}
          }
        }
        const imminent=threats.find(h=>danger(p,h)&&h.at-r.now<.22&&h.at>=r.now),block=!!(imminent&&!imminent.breaks&&p.energy>=18&&p.classId==='knight');
        m={type:'input',seq:m.seq,x:mx,y:my,ax:dir.x,ay:dir.y,attack:!reviving&&!block,block,revive:reviving};super.send(JSON.stringify(m));
        if(imminent?.breaks&&p.energy>=20&&p.dodgeReady<=r.now)super.send(JSON.stringify({type:'dodge',seq:++seq}));
        if(p.potions?.[0]==='heal'&&p.hp<p.maxHp*.6||p.potions?.[0]==='ice'&&dist<220)super.send(JSON.stringify({type:'potion',seq:++seq}));
        if(reviving||block)return;
        let budget=p.energy;const use=slot=>{const cost=[20,30,40][slot];if(p.cds[slot]<=r.now&&budget>=cost){super.send(JSON.stringify({type:'skill',slot,seq:++seq}));budget-=cost;}};
        if(p.classId==='knight'){if((unsafe||p.hp<p.maxHp*.55)&&p.shieldUntil<=r.now)use(2);if(dist>170&&dist<330)use(1);if(dist<145)use(0);}
        else if(p.classId==='archer'&&dist<530){if(r.boss.phase>=2&&r.boss.slowUntil<=r.now&&budget>=60)use(2);if(budget>=55)use(1);use(0);}
        else if(p.classId==='rogue'){if(dist>180&&dist<335)use(1);if(dist<145){if(budget>=60)use(2);use(0);}}

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
    await a.waitForFunction(round=>window.__room?.round===round&&window.__room.state==='battle',round,{timeout:360000});
    await a.waitForTimeout(2500);await a.screenshot({path:`artifacts/arena-${round+1}.png`,fullPage:true});
    console.log(`Round ${round+1}: ${await a.locator('#boss-name').textContent()}`);
    if(round<2){await a.waitForFunction(round=>window.__room?.round===round&&window.__room.state==='round_end',round,{timeout:360000});await a.waitForTimeout(6600);await a.screenshot({path:`artifacts/corredor-${round+1}.png`,fullPage:true});}

  }
  await a.waitForFunction(()=>window.__room?.state==='ending',null,{timeout:360000});await a.waitForTimeout(5000);await a.screenshot({path:'artifacts/pc-10-final.png',fullPage:true});
  await a.waitForFunction(()=>window.__room?.state==='finished',null,{timeout:360000});await a.waitForTimeout(400);
  await a.screenshot({path:'artifacts/08-vitoria.png',fullPage:true});
  const results=await Promise.all(pages.map(p=>p.evaluate(()=>({score:window.__room.score,wins:window.__room.wins,state:window.__room.state,rounds:window.__room.results.length,damage:window.__room.players.map(p=>p.stats.damage)}))));
  await writeFile('artifacts/match-result.json',JSON.stringify({results,errors},null,2));
  for(const r of results){assert.equal(r.state,'finished');assert.equal(r.rounds,3);assert.equal(r.wins,3);assert.equal(r.score,results[0].score);assert.ok(r.damage.every(d=>d>0));}
  assert.deepEqual(errors,[]);console.log('PASS: four independent browser sessions completed all three bosses via ordinary combat commands. Identical victory, score and results in all clients.',JSON.stringify(results[0]));
}finally{await browser.close();}
