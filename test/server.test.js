import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { get } from 'node:http';
import { createGameServer } from '../server/index.js';

let app,base,directory;
before(async()=>{directory=await mkdtemp(join(tmpdir(),'iron-test-'));app=createGameServer({dataDir:directory});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;});
after(async()=>{await app.close();await rm(directory,{recursive:true,force:true});});
async function post(path,data,token){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});return{status:r.status,...await r.json()};}
function client(token){return new Promise((resolve,reject)=>{
  const ws=new WebSocket(base.replace('http:','ws:')+'/ws');const messages=[];const waits=[];
  const timeout=setTimeout(()=>reject(new Error('WS welcome timeout')),4000);
  ws.on('open',()=>ws.send(JSON.stringify({type:'auth',token})));
  ws.on('error',reject);
  ws.on('message',raw=>{const m=JSON.parse(raw);messages.push(m);for(const w of [...waits])if(w.predicate(m)){waits.splice(waits.indexOf(w),1);clearTimeout(w.timeout);w.resolve(m);}
    if(m.type==='welcome'){clearTimeout(timeout);resolve({ws,messages,send:(type,data={})=>ws.send(JSON.stringify({type,...data})),wait:predicate=>{const found=messages.find(predicate);if(found)return Promise.resolve(found);return new Promise((resolve,reject)=>{const w={predicate,resolve,timeout:setTimeout(()=>reject(new Error('Message timeout')),4500)};waits.push(w);});}});}
  });
});}
test('account hashing, credentials, sessions and logout persist in SQLite',async()=>{
  const reg=await post('register',{name:'TestePersistente',password:'Senha-de-teste-123'});assert.equal(reg.status,200);assert.ok(reg.token.length>=40);
  const wrong=await post('login',{name:'TestePersistente',password:'errada'});assert.equal(wrong.status,400);
  const logged=await post('login',{name:'testepersistente',password:'Senha-de-teste-123'});assert.equal(logged.status,200);assert.equal(logged.session.name,'TestePersistente');
  const rows=app.store.db.prepare('SELECT password FROM users').all();assert.notEqual(rows[0].password,'Senha-de-teste-123');
  assert.ok(app.store.getSession(logged.token));await post('logout',{},logged.token);assert.equal(app.store.getSession(logged.token),null);
});
test('two independent authenticated clients join a real room, share movement and damage, reconnect securely',async()=>{
  const ga=await post('guest',{name:'Cliente A'}),gb=await post('guest',{name:'Cliente B'});
  const a=await client(ga.token),b=await client(gb.token);
  a.send('create',{public:true});const joined=await a.wait(m=>m.type==='joined');const code=joined.room.code;assert.match(code,/^IRON-[A-Z2-9]{6}$/);
  b.send('join',{code});await b.wait(m=>m.type==='joined');
  const publicRooms=await(await fetch(base+'/api/rooms')).json();assert.ok(publicRooms.some(r=>r.code===code));
  a.send('ready',{ready:true});b.send('ready',{ready:true});
  await a.wait(m=>m.type==='snapshot'&&m.room.players.every(p=>p.ready));a.send('start');
  const fighting=await b.wait(m=>m.type==='snapshot'&&m.room.state==='battle');assert.equal(fighting.room.players.length,2);
  a.send('input',{seq:1,x:1,y:0,ax:1,ay:0,attack:false});
  const moved=await b.wait(m=>m.type==='snapshot'&&m.room.players.find(p=>p.id===ga.session.id).x>280);assert.ok(moved.room.players[0].x>265);
  const r=app.rooms.get(code),p=r.players.get(ga.session.id);p.x=r.boss.x-90;p.y=r.boss.y;
  a.send('input',{seq:2,x:0,y:0,ax:1,ay:0});a.send('skill',{seq:3,slot:0,hp:99999,damage:99999});
  const damaged=await b.wait(m=>m.type==='snapshot'&&m.room.boss&&m.room.boss.hp<m.room.boss.maxHp);
  assert.equal(damaged.room.boss.maxHp-damaged.room.boss.hp,25);assert.ok(damaged.room.players[0].energy<100);assert.ok(damaged.room.players[0].hp<=160);
  a.ws.close();await new Promise(resolve=>a.ws.once('close',resolve));const reconnect=await client(ga.token);
  const welcome=await reconnect.wait(m=>m.type==='welcome');assert.equal(welcome.room.code,code);assert.equal(welcome.session.id,ga.session.id);
  const bad=new WebSocket(base.replace('http:','ws:')+'/ws');await new Promise(resolve=>{bad.on('open',()=>bad.send(JSON.stringify({type:'auth',token:code})));bad.on('close',resolve);});
  assert.ok(app.rooms.get(code).players.has(ga.session.id));
  reconnect.ws.close();b.ws.close();
});
test('unapproved origins and invalid inputs are rejected',async()=>{
  const r=await fetch(base+'/api/health',{headers:{Origin:'https://evil.example'}});assert.equal(r.status,403);
  const guest=await post('guest',{name:'<script>'});assert.equal(guest.status,400);
  const traversal=await fetch(base+'/%2e%2e%2fserver/store.js');assert.notEqual(traversal.status,200);
  const lanPolicy=await new Promise((resolve,reject)=>get(base+'/api/health',{headers:{Host:'192.168.1.10:48230'}},response=>{response.resume();resolve(response.headers['content-security-policy']);}).on('error',reject));
  assert.ok(lanPolicy.includes('ws://192.168.1.10:48230'));
});
