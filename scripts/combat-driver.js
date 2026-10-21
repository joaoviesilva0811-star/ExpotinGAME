// Test automation only: ordinary intentions; never changes game state or resources.
export async function installCombatDriver(context,{gamepad=false}={}){
 await context.addInitScript(gamepad=>{
    if(location.protocol==='http:'||location.protocol==='https:')import('/shared.js').then(m=>window.__shared=m);
    const NativeSocket=window.WebSocket;let seq=Date.now()*1000;if(gamepad){window.__automatedPads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.__automatedPads});}
    window.WebSocket=class extends NativeSocket{
      constructor(...args){super(...args);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='welcome')window.__session=m.session;if(m.room)window.__room=m.room;});}
      send(raw){
        let m=JSON.parse(raw),r=window.__room,p=r?.players.find(p=>p.id===window.__session?.id);
        if(!gamepad&&['input','skill','dodge','potion'].includes(m.type))m.seq=++seq;
        if(m.type!=='input'||r?.state!=='battle'||!p||p.hp<=0){if(gamepad&&m.type==='input'&&r?.state!=='battle')window.__automatedPads=[];return super.send(gamepad?raw:JSON.stringify(m));}
        if(gamepad&&Date.now()<(window.__driverPauseUntil||0)){super.send(raw);const emote=Date.now()<(window.__driverEmoteUntil||0);window.__automatedPads=[{index:0,id:'Xbox virtual acceptance controller',connected:true,mapping:'standard',axes:[0,0,1,0],buttons:Array.from({length:17},(_,i)=>({pressed:emote&&i===13,value:emote&&i===13?1:0}))}];return;}
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
        const covers=[...window.__shared.ARENA_OBSTACLES[r.round],...(r.covers||[]).filter(c=>c.hp>0),...r.hazards.filter(h=>h.solid&&h.at<=r.now)];
        const clear=(from,to,padding)=>covers.every(o=>{const dx=to.x-from.x,dy=to.y-from.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((o.x-from.x)*dx+(o.y-from.y)*dy)/l)):0;return Math.hypot(o.x-from.x-t*dx,o.y-from.y-t*dy)>=o.r+padding;});
        const reviving=!!(down&&distance(p,down)<73&&!unsafe&&clear(p,down,2));let mx=0,my=0;
        if(!reviving){
          let best=-Infinity;const speed={knight:116,archer:140,rogue:158}[p.classId],goal=down&&!unsafe?down:b,range=goal===down?34:desired;
          for(let i=0;i<25;i++){
            const a=i/24*Math.PI*2,x=i===24?0:Math.cos(a),y=i===24?0:Math.sin(a),next={x:p.x+x*speed*.85,y:p.y+y*speed*.85};let score=-Math.abs(distance(next,goal)-range)*.12;
            if(next.x<65||next.x>1135||next.y<65||next.y>695)score-=2000;
            for(const h of threats)if(danger(next,h))score-=unsafe?1500:800;
            for(const o of covers)if(distance(next,o)<o.r+30)score-=1300;
            if(!clear(p,next,17))score-=900;
            for(const q of r.projectiles.filter(q=>q.enemy))if(distance(next,{x:q.x+q.vx*.55,y:q.y+q.vy*.55})<45)score-=900;
            if(!unsafe&&i===24&&Math.abs(distance(p,goal)-range)<20)score+=8;
            if(score>best){best=score;mx=x;my=y;}
          }
        }
        const imminent=threats.find(h=>danger(p,h)&&h.at-r.now<.22&&h.at>=r.now),block=!!(imminent&&!imminent.breaks&&p.energy>=18&&p.classId==='knight');
        m={type:'input',seq:m.seq,x:mx,y:my,ax:dir.x,ay:dir.y,attack:!reviving&&!block,block,revive:reviving};super.send(gamepad?raw:JSON.stringify(m));
        const buttons=new Set(),previous=window.__automatedPads?.[0]?.buttons||[];if(m.attack)buttons.add(2);if(block)buttons.add(4);if(reviving)buttons.add(1);
        const action=(type,data={})=>{if(gamepad){const button=type==='dodge'?0:type==='potion'?12:[3,5,7][data.slot];if(!previous[button]?.pressed)buttons.add(button);}else super.send(JSON.stringify({type,...data,seq:++seq}));};
        const publish=()=>{if(gamepad)window.__automatedPads=[{index:0,id:'Xbox virtual acceptance controller',connected:true,mapping:'standard',axes:[m.x,m.y,m.ax,m.ay],buttons:Array.from({length:17},(_,i)=>({pressed:buttons.has(i),value:buttons.has(i)?1:0}))}];};
        if(imminent?.breaks&&p.energy>=20&&p.dodgeReady<=r.now)action('dodge');
        if(p.potions?.[0]==='heal'&&p.hp<p.maxHp*.6||p.potions?.[0]==='ice'&&dist<220)action('potion');
        if(reviving||block)return publish();
        let budget=p.energy;const use=slot=>{const cost=[20,30,40][slot];if(p.cds[slot]<=r.now&&budget>=cost){action('skill',{slot});budget-=cost;}};
        if(p.classId==='knight'){if((unsafe||p.hp<p.maxHp*.55)&&p.shieldUntil<=r.now)use(2);if(dist>170&&dist<330)use(1);if(dist<145)use(0);}
        else if(p.classId==='archer'&&dist<530){if(r.boss.phase>=2&&r.boss.slowUntil<=r.now&&budget>=60)use(2);if(budget>=55)use(1);use(0);}
        else if(p.classId==='rogue'){if(dist>180&&dist<335)use(1);if(dist<145){if(budget>=60)use(2);use(0);}}
        publish();
      }
    };
  },gamepad);
}
