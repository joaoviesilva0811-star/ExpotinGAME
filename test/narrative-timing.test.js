import test from'node:test';import assert from'node:assert/strict';import{narrativeFilmShot,ROUND_OUTRO_TIME}from'../public/narrative-timing.js';
const interlude={state:'round_end',round:0,results:[{won:true}],gateUnlocked:true,keyDrop:{collectedAt:22},outroStarted:20,transitionAt:20+ROUND_OUTRO_TIME};
test('interlude follows the shared clock after key/results and visits all three panels',()=>{
 assert.equal(narrativeFilmShot(interlude,25.99),null);assert.equal(narrativeFilmShot(interlude,26.5).index,0);assert.equal(narrativeFilmShot(interlude,30).index,1);assert.equal(narrativeFilmShot(interlude,33).index,2);assert.equal(narrativeFilmShot(interlude,35.6),null);
 assert.equal(narrativeFilmShot({...interlude,round:1},28).asset,'comic-bridge-cathedral');
});
test('losses and unearned/uncollected keys never show a victory interlude',()=>{
 for(const change of [{results:[{won:false}]},{gateUnlocked:false},{keyDrop:{collectedAt:null}},{round:2},{state:'battle'}])assert.equal(narrativeFilmShot({...interlude,...change},28),null);
});
const victory={state:'ending',wins:3,secretUnlocked:true,vaultOpenedAt:105,endingAt:100,transitionAt:118,keys:[0,1,2].map(round=>({round}))};
test('final HQ requires all three keys and authoritative vault opening before its epilogue window',()=>{
 assert.equal(narrativeFilmShot(victory,108),null);assert.equal(narrativeFilmShot(victory,109).asset,'comic-ending-crown');assert.equal(narrativeFilmShot(victory,117).index,2);assert.equal(narrativeFilmShot(victory,117.81).index,2);assert.equal(narrativeFilmShot(victory,118),null);
 for(const change of [{wins:2},{secretUnlocked:false},{vaultOpenedAt:null},{keys:[{round:0},{round:1}]}])assert.equal(narrativeFilmShot({...victory,...change},110),null);
});
test('late snapshots select a deterministic current panel without mutating shared results or keys',()=>{
 const before=structuredClone(victory);assert.deepEqual(narrativeFilmShot(victory,114.1),narrativeFilmShot(victory,114.1));assert.deepEqual(victory,before);assert.equal(narrativeFilmShot(null,12),null);
});

test('late vault animations finish before the final page; final page stays present until the results clock',()=>{
 const late={...victory,vaultOpenedAt:110};assert.equal(narrativeFilmShot(late,113.19),null);assert.equal(narrativeFilmShot(late,113.21).index,0);assert.ok(narrativeFilmShot(late,117.99));assert.equal(narrativeFilmShot(late,118),null);
});
