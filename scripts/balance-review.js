// Deterministic authoritative encounters. All AI actors send the same commands
// and consume the same resources as human players; these are test simulations.
import{Room}from'../server/engine.js';import{CLASSES,BOSSES}from'../public/shared.js';import{mkdir,writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const damage=Object.values(CLASSES).map(c=>c.damage),health=BOSSES.map(b=>b.hp),reports=[];
for(const mode of ['v1.6-reference','v1.7']){
 Object.values(CLASSES).forEach((c,i)=>c.damage=mode==='v1.7'?damage[i]:[12,15,10][i]);BOSSES.forEach((b,i)=>b.hp=mode==='v1.7'?health[i]:[5600,7200,9200][i]);
 const r=new Room('IRON-REVIEW','a','Balance');let seed=20261019;r.lootRoll=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
 for(const[i,cls]of['knight','archer','rogue','archer'].entries()){const p=r.add(String.fromCharCode(97+i),cls);r.select(p.id,cls);p.ready=true;}
 for(const p of r.players.values())p.isBot=true;r.start('a');const phases=[new Set(),new Set(),new Set()];
 for(let i=0;i<19000&&r.state!=='finished';i++){r.tick(.05);if(r.state==='battle')phases[r.round].add(r.boss.phase);for(const p of r.players.values()){assert.ok(p.hp>=0&&p.hp<=p.maxHp);assert.ok(p.energy>=0&&p.energy<=100);}}
 assert.equal(r.wins,3);assert.ok(phases.every(p=>p.size===3));assert.ok(r.results.every(x=>300-x.remaining>45));reports.push({mode,damage:Object.values(CLASSES).map(c=>c.damage),bossHP:BOSSES.map(b=>b.hp),wins:r.wins,combatSeconds:r.results.map(x=>300-x.remaining),phases:phases.map(p=>[...p]),players:[...r.players.values()].map(p=>({class:p.classId,...p.stats}))});
}
Object.values(CLASSES).forEach((c,i)=>c.damage=damage[i]);BOSSES.forEach((b,i)=>b.hp=health[i]);await mkdir('artifacts',{recursive:true});await writeFile('artifacts/balance-review.json',JSON.stringify({method:'Four ordinary AI command streams, deterministic loot, same updated rescue AI in both cases. Not a player skill benchmark.',reports},null,2));console.log(JSON.stringify(reports.map(({mode,damage,bossHP,wins,combatSeconds})=>({mode,damage,bossHP,wins,combatSeconds}))));
