import {comboState,recordCombo,resetCombo,expireCombo} from './combos.js';
import {dropBossKey,tickBossKeys} from './keys.js';
import {updateVelocity,moveEntity} from '../public/motion.js';
import { randomBytes, randomInt } from 'node:crypto';
import { WORLD, CLASSES, BOSSES, COSTS, COOLDOWNS, DODGE, REVIVE, clamp, distance, hazardContains, ARENA_OBSTACLES, EMOTES } from '../public/shared.js';
import { routeClear } from './rescue.js';
import { thinkBots, BOT_NAMES } from './bots.js';
import { planBossAttack } from './bosses.js';
import { tickMinions } from './minions.js';
import { dropPotion, tickLoot, usePotion, roundDialogue } from './loot.js';

const uid = () => randomBytes(6).toString('hex');
const stats = () => ({ damage: 0, taken: 0, avoided: 0, revives: 0, skills: 0, comboPoints:0, maxCombo:0 });
export const normalize = (x, y) => { const d = Math.hypot(x, y); return d > 0 ? { x: x / d, y: y / d } : { x: 1, y: 0 }; };
export function aimDirection(p) {
  const {ax,ay}=p.input;
  return Number.isFinite(ax)&&Number.isFinite(ay)&&Math.hypot(ax,ay)>.001 ? normalize(ax,ay) : {x:Math.cos(p.facing),y:Math.sin(p.facing)};
}
export function segmentDistance(a, b, o) {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  const t = length2 ? clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / length2, 0, 1) : 0;
  return Math.hypot(o.x - a.x - t * dx, o.y - a.y - t * dy);
}
export const makePlayer = (session, name) => ({
  id: session, name, emote:null,emoteAt:-10,emoteUntil:0,emoteReady:0,classId: 'knight', ready: false, connected: true, disconnectedAt: null,
  x: 270, y: 380, vx: 0, vy: 0, hp: 160, maxHp: 160, energy: 100, facing: 0,
  cds: [0, 0, 0], basicAt: 0, block: false, blockAt: 0, shieldUntil: 0, rootUntil: 0,
  attackAt: -10, attackFor: .45, attackSlot: -1, dodgeAt: -10, dodgeUntil: 0, dodgeReady: 0, hitSafeUntil: 0,
  shadowBonus: 0, poisonUntil: 0, downAt: null, eliminated: false, revive: 0, reviveTarget: null, reviveStartedAt: -10, aidUntil: 0, aidAt: -10, revivedAt: -10, revivedBy: null,
  input: { x: 0, y: 0, ax: 1, ay: 0, block: false, attack: false, revive: false },
  combo:comboState(), potions: [], potionReady: 0, stats: stats(), roundStats: stats(), lastSeq: -1
});
export const obstacles=round=>ARENA_OBSTACLES[round]||ARENA_OBSTACLES[0];
export class Room {
  constructor(code, owner, name, isPublic = false, solo = false) {
    this.code = code; this.owner = owner; this.name = name; this.public = isPublic;
    this.players = new Map(); this.state = 'lobby'; this.round = 0; this.now = 0;
    this.events = []; this.eventId = 0; this.projectiles = []; this.hazards = []; this.effects = [];
    this.drops=[];this.lootKills=0;this.dialogue=[];this.minions = []; this.nextWave = 0; this.waveIndex = 0;
    this.score = 0; this.wins = 0; this.results = []; this.created = Date.now();
    this.transitionAt = 0; this.remaining = 300; this.boss = null; this.finishedSaved = false;
    this.keys=[];this.keyDrop=null;this.keySceneUntil=0;this.gateUnlocked=false;this.secretUnlocked=false;this.vaultOpenedAt=null;
    this.lootRoll=randomInt;
    this.solo = solo; this.botsEnabled = solo;
  }
  emit(type, data = {}) {
    const e = { id: ++this.eventId, type, ...data };
    this.events.push(e);
    if (this.events.length > 80) this.events.shift();
    return e;
  }
  add(id, name) {
    if (this.players.has(id)) { this.reconnect(id); return this.players.get(id); }
    if (this.solo && id !== this.owner) throw new Error('Esta é uma expedição solo com companheiros.');
    if (this.state !== 'lobby') throw new Error('A partida já começou.');
    if(this.players.size>=4){const bot=[...this.players.values()].find(p=>p.isBot);if(bot)this.players.delete(bot.id);}
    if (this.players.size >= 4) throw new Error('Esta sala já tem 4 jogadores.');
    const p = makePlayer(id, name); this.players.set(id, p); this.syncBots(); return p;
  }
  syncBots() {
    if(this.state!=='lobby')return;
    for(const p of this.players.values())if(p.isBot)this.players.delete(p.id);
    if(!this.botsEnabled)return;
    const occupied=new Set([...this.players.values()].map(p=>p.classId));
    for(const classId of Object.keys(CLASSES)) {
      if(occupied.has(classId)||this.players.size>=4)continue;
      const id='bot-'+uid(),p=makePlayer(id,BOT_NAMES[classId]);
      p.classId=classId;p.maxHp=p.hp=CLASSES[classId].hp;p.isBot=true;p.ready=true;
      this.players.set(id,p);
    }
  }
  setBots(id,enabled) {
    if(id!==this.owner||this.state!=='lobby')throw new Error('Só o líder pode configurar os companheiros na preparação.');
    this.botsEnabled=this.solo||enabled===true;this.syncBots();
  }
  reconnect(id) { const p = this.players.get(id); if (p) { p.connected = true; p.disconnectedAt = null;if(this.state==='lobby'&&!p.isBot)p.ready=false; p.input = { x: 0, y: 0 }; this.emit('notice', { text: `${p.name} reconectou.` }); } }
  disconnect(id) {
    const p = this.players.get(id); if (!p) return;
    p.connected = false; p.disconnectedAt = this.now; p.input = { x: 0, y: 0 }; p.block = false;
    this.emit('notice', { text: `${p.name} desconectou. Vaga reservada por 60s.` });
    if (this.owner === id) this.owner = [...this.players.values()].find(x => x.connected && !x.isBot)?.id || id;
  }
  remove(id) { this.players.delete(id); if (this.owner === id) this.owner = [...this.players.values()].find(p=>!p.isBot)?.id || null;this.syncBots(); }
  select(id, classId) {
    const p = this.players.get(id); if (!p || this.state !== 'lobby' || !CLASSES[classId]) return;
    p.classId = classId; p.hp = p.maxHp = CLASSES[classId].hp; p.ready = false;
    this.syncBots();
  }
  start(id) {
    if (id !== this.owner) throw new Error('Apenas o líder pode iniciar.');
    if (!['lobby', 'finished'].includes(this.state)) throw new Error('A partida está em andamento.');
    if (![...this.players.values()].every(p => p.ready && p.connected)) throw new Error('Todos devem estar conectados e prontos.');
    this.keys=[];this.keyDrop=null;this.secretUnlocked=false;this.vaultOpenedAt=null;
    this.round = 0; this.score = 0; this.bestScore = 0; this.wins = 0; this.results = []; this.finishedSaved = false;
    for (const p of this.players.values()) { p.stats = stats(); p.hp = p.maxHp; }
    this.prepareRound();
  }
  restartLobby(id) {
    if (id !== this.owner || this.state !== 'finished') return;
    this.keys=[];this.keyDrop=null;this.keySceneUntil=0;this.secretUnlocked=false;this.vaultOpenedAt=null;
    this.state = 'lobby'; this.boss = null; this.hazards = []; this.projectiles = [];
    for (const p of this.players.values()) { p.ready = !!p.isBot; p.hp = p.maxHp; p.downAt = null; p.eliminated = false; }
  }
  prepareRound() {
    this.keyDrop=null;this.keySceneUntil=0;this.gateUnlocked=false;
    this.state = 'countdown'; this.transitionAt = this.now + 17.7; this.remaining = 300;
    this.projectiles = []; this.hazards = []; this.effects = []; this.minions = []; this.drops=[];this.lootKills=0;this.intro={started:this.now,gateAt:this.now+3.55,dialogueAt:this.now+4,awakeningAt:this.now+10.3};this.gateClosed=false;this.awakened=false;this.dialogue=roundDialogue(this,4); this.nextWave = this.transitionAt+8; this.waveIndex = 0;
    const info = BOSSES[this.round];
    const hp = Math.round(info.hp * (.25 + .1875 * this.players.size));
    this.boss = { x: 820, y: 380, hp, maxHp: hp, phase: 1, state: 'dormant', until: this.transitionAt,
      isBoss: true, radius: info.radius, hurtAt: -10, startedAt: this.now, facing: Math.PI, target: null, attackIndex: 0, nextAt: this.now + 5, slowUntil: 0, poison: [], immuneUntil: 0, attack: null };
    let i = 0;
    for (const p of this.players.values()) {
      p.x = 265; p.y = 265 + i++ * 72; p.vx = 0; p.vy = 0;
      p.hp = p.hp > 0 ? Math.min(p.maxHp, p.hp + (p.maxHp - p.hp) * .5) : p.maxHp;
      p.attackAt = -10; p.dodgeAt = -10; p.dodgeUntil = p.dodgeReady = p.hitSafeUntil = 0;
      p.energy = 100; p.cds = [0, 0, 0]; p.basicAt = 0; p.blockAt = 0; p.block = false;
      p.shieldUntil = 0; p.rootUntil = 0; p.shadowBonus = 0; p.poisonUntil = 0;
      p.downAt = null; p.eliminated = false; p.revive = 0; p.reviveTarget = null; p.reviveStartedAt = p.aidAt = p.revivedAt = -10; p.aidUntil = 0; p.revivedBy = null; p.roundStats = stats();resetCombo(p);
      p.input = { x: 0, y: 0, ax: 1, ay: 0, attack: false, block: false, revive: false };
    }
    this.emit('round', { round: this.round, text: info.title });
  }
  command(id, msg) {
    const p = this.players.get(id); if (!p || !p.connected) return;
    if (!Number.isSafeInteger(msg.seq) || msg.seq <= p.lastSeq) return;
    p.lastSeq = msg.seq;
    if (msg.type === 'input') {
      if (![msg.x, msg.y, msg.ax, msg.ay].every(Number.isFinite)) return;
      p.input = { x: clamp(msg.x, -1, 1), y: clamp(msg.y, -1, 1), ax: clamp(msg.ax, -1, 1), ay: clamp(msg.ay, -1, 1), block: msg.block === true, attack: msg.attack === true, revive: msg.revive === true };
      p.lastInput = this.now;
      if (msg.ax || msg.ay) p.facing = Math.atan2(msg.ay, msg.ax);
    } else if(msg.type==='emote'&&Object.hasOwn(EMOTES,msg.emote)&&this.active(p)&&this.now>=p.emoteReady&&['countdown','battle'].includes(this.state)){
      p.emote=msg.emote;p.emoteAt=this.now;p.emoteUntil=this.now+3.6;p.emoteReady=this.now+5;p.vx=p.vy=0;p.input={x:0,y:0,ax:Math.cos(p.facing),ay:Math.sin(p.facing)};this.emit('emote',{owner:p.id,kind:msg.emote,x:p.x,y:p.y});
    } else if (msg.type === 'skill' && Number.isInteger(msg.slot) && msg.slot >= 0 && msg.slot < 3) this.skill(p, msg.slot);
    else if (msg.type === 'dodge') this.dodge(p);
    else if (msg.type === 'potion') usePotion(this,p);
  }
  active(p) { return p && p.connected && p.hp > 0 && !p.eliminated; }
  canAct(p) { return this.state === 'battle' && this.active(p) && !p.block && !p.input.block && !p.input.revive && this.now >= p.dodgeUntil; }
  hitBoss(p, amount) {
    if (this.state !== 'battle' || !this.boss || this.boss.hp <= 0 || this.now < this.boss.immuneUntil) return 0;
    if (this.boss.guarding && this.boss.state === 'windup') amount *= .65;
    const actual = Math.min(Math.round(amount * 10) / 10, this.boss.hp); this.boss.hp -= actual; this.boss.hurtAt = this.now;
    p.stats.damage += actual; p.roundStats.damage += actual;recordCombo(p,actual,this.now);
    this.emit('hit', { x: this.boss.x, y: this.boss.y - 40, amount: actual, owner: p.id, target: 'boss' });
    if (this.boss.hp <= 0) this.endRound(true);
    return actual;
  }
  hitMinion(p, m, amount) {
    if (m.hp <= 0 || this.now < m.activeAt || this.state !== 'battle') return 0;
    const actual = Math.min(m.hp, amount); m.hp -= actual; m.hurtAt = this.now;
    p.stats.damage += actual; p.roundStats.damage += actual;recordCombo(p,actual,this.now);
    this.emit('hit', { x:m.x, y:m.y-20, amount:actual, owner:p.id, target:m.id, minion:true });
    if (m.hp <= 0) { dropPotion(this,m); this.emit('minionDeath', {x:m.x,y:m.y,kind:m.kind}); p.energy = Math.min(100,p.energy+8); }
    return actual;
  }
  melee(p, amount, reach) {
    const dir = aimDirection(p);
    const canHit = (target,radius) => {
      if (distance(p,target)>reach+radius) return false;
      if (obstacles(this.round).some(o=>segmentDistance(p,target,o)<o.r)) return false;
      const n=normalize(target.x-p.x,target.y-p.y); return dir.x*n.x+dir.y*n.y>=.05;
    };
    let hit=false;
    for(const m of this.minions) if(m.hp>0&&canHit(m,18)) hit=this.hitMinion(p,m,amount)>0||hit;
    if(this.boss && canHit(this.boss,BOSSES[this.round].radius)) hit=this.hitBoss(p,amount)>0||hit;
    return hit;
  }
  projectile(p, damage, color = 'arrow', opts = {}) {
    const dir = aimDirection(p);
    const angle = Math.atan2(dir.y, dir.x) + (opts.angle || 0);
    const q={ id: uid(), owner: p.id, x: p.x, y: p.y, vx: Math.cos(angle) * 640, vy: Math.sin(angle) * 640, damage, color, left: opts.range || 570, slow: opts.slow || 0 };
    this.projectiles.push(q);
    this.emit('shot',{owner:p.id,projectile:q.id,x:q.x,y:q.y,vx:q.vx,vy:q.vy,color:q.color});
  }
  basic(p) {
    if (!this.canAct(p) || this.now < p.basicAt) return;
    p.emoteUntil=0;const c = CLASSES[p.classId]; p.basicAt = this.now + c.interval; p.reviveTarget = null;
    p.attackAt = this.now; p.attackFor = p.classId === 'rogue' ? .38 : p.classId==='knight'?.62:.52; p.attackSlot = -1;
    this.effects.push({kind:'basic',at:this.now+(p.classId==='archer'?.17:p.classId==='rogue'?.12:.18),owner:p.id,damage:c.damage+p.shadowBonus,reach:c.range}); p.shadowBonus=0;
    this.emit('attack', { owner: p.id, kind: p.classId, x: p.x, y: p.y, angle: p.facing, slot: -1 });
  }
  skill(p, slot) {
    if (!this.canAct(p) || p.energy < COSTS[slot] || this.now < p.cds[slot]) return false;
    p.emoteUntil=0;p.energy -= COSTS[slot]; p.cds[slot] = this.now + COOLDOWNS[slot]; p.stats.skills++; p.roundStats.skills++;
    p.reviveTarget = null; p.attackAt = this.now; p.attackFor = slot===1?.62:.5; p.attackSlot = slot;
    if (p.classId === 'knight') {
      if (slot === 0) this.melee(p, 25, 112);
      if (slot === 1) {
        this.dash(p, 175); this.melee(p, 35, 105);
        if (this.boss?.state === 'windup' && this.boss.phase === 1 && distance(p, this.boss) < 155) {
          this.hazards = this.hazards.filter(h => !h.telegraph); this.effects = this.effects.filter(e=>e.kind!=='volley'); this.boss.charge=null; this.boss.guarding=false; this.boss.state = 'recover';this.boss.startedAt=this.now; this.boss.until = this.now + 1.6;
          this.emit('notice', { text: 'Investida interrompeu o chefe!' });
        }
      }
      if (slot === 2) p.shieldUntil = this.now + 4;
    } else if (p.classId === 'archer') {
      if (slot === 0) this.projectile(p, 30, 'pierce');
      if (slot === 1) for (let i = -2; i <= 2; i++) this.projectile(p, 8, 'rain', { angle: i * .055 });
      if (slot === 2) this.projectile(p, 20, 'ice', { slow: 2 });
    } else {
      if (slot === 0) { this.melee(p, 18, 94); this.effects.push({ at: this.now + .15, owner: p.id, kind: 'double' }); }
      if (slot === 1) { this.dash(p, 155); p.shadowBonus = 25; }
      if (slot === 2) {
        const dir=aimDirection(p);
        for(const target of [this.boss,...this.minions]){
          const n=normalize(target.x-p.x,target.y-p.y);
          if(target.hp<=0||distance(p,target)>96+(target.isBoss?BOSSES[this.round].radius:18)||dir.x*n.x+dir.y*n.y<.05||obstacles(this.round).some(o=>segmentDistance(p,target,o)<o.r))continue;
          target.poison=(target.poison||[]).filter(x=>x.owner!==p.id);target.poison.push({owner:p.id,next:this.now+1,ticks:3});
          this.emit('venom',{x:target.x,y:target.y});
        }
      }
    }
    this.emit('attack', { owner: p.id, kind: p.classId, x: p.x, y: p.y, angle: p.facing, slot });
    return true;
  }
  dodge(p) {
    if (!this.canAct(p) || p.energy<DODGE.cost || this.now<p.dodgeReady || this.now<p.rootUntil) return false;
    const moving=p.input.x||p.input.y; const n=moving?normalize(p.input.x||0,p.input.y||0):aimDirection(p);
    p.emoteUntil=0;p.energy-=DODGE.cost; p.dodgeAt=this.now; p.dodgeUntil=this.now+DODGE.duration; p.dodgeReady=this.now+DODGE.cooldown;
    p.dodgeVX=n.x*DODGE.distance/DODGE.duration; p.dodgeVY=n.y*DODGE.distance/DODGE.duration;
    p.block=false; p.revive=0; p.reviveTarget=null;
    this.emit('dodge',{owner:p.id,x:p.x,y:p.y,angle:Math.atan2(n.y,n.x)}); return true;
  }
  dash(p, length) {
    const dir = aimDirection(p);
    const old = { x: p.x, y: p.y };
    for (let i = 0; i < length; i += 5) this.move(p, dir.x * Math.min(5, length - i), dir.y * Math.min(5, length - i));
    this.emit('dash', { x: old.x, y: old.y, tx: p.x, ty: p.y, kind: p.classId });
  }
  move(p, dx, dy) {
    moveEntity(p,dx,dy,[...obstacles(this.round),...this.hazards.filter(h=>h.solid&&h.at<=this.now)],this.boss);
  }

  hurt(p, amount, breaks = false, source = null) {
    if (!this.active(p) || this.state !== 'battle' || this.now<p.dodgeUntil) return;
    let factor = 1;
    if (p.block && !breaks) factor *= .4;
    if (p.shieldUntil > this.now) factor *= .5;
    else if ([...this.players.values()].some(a => this.active(a) && a.classId === 'knight' && a.shieldUntil > this.now && distance(a, p) < 175)) factor *= .75;
    const final = Math.round(amount * factor * 10) / 10;
    const taken = Math.min(p.hp, final), avoided = amount - final;
    p.hp = Math.max(0, p.hp - final); p.stats.taken += taken; p.roundStats.taken += taken;
    p.stats.avoided += avoided; p.roundStats.avoided += avoided;
    if(taken>0)resetCombo(p);p.emoteUntil=0;p.reviveTarget = null; p.revive = 0; p.lastHurt = this.now;
    if (breaks && p.block) { p.block = false; p.blockAt = this.now + .8; this.emit('notice', { text: `${p.name}: defesa quebrada!` }); }
    const origin=source||this.boss||{x:p.x-1,y:p.y};
    this.emit('hurt', {angle:Math.atan2(p.y-origin.y,p.x-origin.x), owner: p.id, x: p.x, y: p.y, amount: final, blocked: factor < 1 });
    if (p.hp <= 0) { p.downAt = this.now; p.block = false; p.vx = p.vy = 0; this.emit('notice', { text: `${p.name} caiu! Segure R perto para reviver.` }); }
  }
  endRound(won, reason = '') {
    if (this.state !== 'battle') return;
    const reward = won ? BOSSES[this.round].reward + Math.floor(this.remaining / 3) : 0;
    this.score += reward; if (won) this.wins++;
    const result = { round: this.round, won, reason, remaining: Math.ceil(this.remaining), reward, players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, ...p.roundStats })) };
    this.results.push(result); this.state = this.round === 2 ? 'ending' : 'round_end'; this.outroStarted=this.now;this.transitionAt = this.now + 11;
    if (this.state === 'ending') {
      this.endingAt=this.now+(won?4:0);this.transitionAt=this.endingAt+(this.wins===3&&this.keys.length===2?18:14);this.boss.state=won?'fallen':'awakening';this.boss.startedAt=this.now;
      if (this.wins === 3) this.score += 150;
      this.score += [...this.players.values()].reduce((s, p) => s + Math.floor(p.stats.damage / 30 + p.stats.avoided / 8 + p.stats.revives * 30 + (p.stats.comboPoints||0)), 0);
    }
    this.projectiles = []; this.hazards = []; this.effects = []; this.minions = [];
    if(won){this.boss.state='fallen';this.boss.startedAt=this.now;dropBossKey(this);if(this.round===2)for(const p of this.players.values()){p.hp=Math.max(p.hp,p.maxHp*.4);p.downAt=null;p.eliminated=false;}}
    this.emit(won ? 'victory' : 'defeat', { text: won ? 'Chefe derrotado!' : reason });
  }
  planAttack(kind) { planBossAttack(this,kind); }
  tick(dt) {
    this.now += dt;for(const p of this.players.values())expireCombo(p,this.now);
    for (const p of this.players.values()) if (!p.connected && p.disconnectedAt !== null && this.now - p.disconnectedAt > 60) this.remove(p.id);
    if(['round_end','ending'].includes(this.state)){tickBossKeys(this,dt,obstacles(this.round));if(this.keyDrop&&!this.keyDrop.collectedAt&&this.now>=this.transitionAt){this.transitionAt=this.now+.5;return;}}
    if(this.state==='ending'&&this.now>=this.transitionAt){this.state='finished';return;}
    if(this.state==='countdown'){
      if(!this.gateClosed&&this.now>=this.intro.gateAt){this.gateClosed=true;this.emit('gate',{x:48,y:380});}
      if(!this.awakened&&this.now>=this.intro.awakeningAt){this.awakened=true;this.boss.state='awakening';this.boss.startedAt=this.intro.awakeningAt;this.emit('awaken',{x:this.boss.x,y:this.boss.y,round:this.round});}
      if(this.now>=this.transitionAt){this.state='battle';this.boss.state='idle';this.boss.nextAt=this.now+1.5;}return;
    }
    if (this.state === 'round_end' && this.now >= this.transitionAt) { this.round++; this.prepareRound(); }
    if (this.state !== 'battle') return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) { this.endRound(false, 'O tempo se esgotou.'); return; }
    if (![...this.players.values()].some(p => this.active(p))) { this.endRound(false, 'Toda a equipe caiu.'); return; }
    thinkBots(this,obstacles(this.round));
    if(this.state!=='battle')return;
    for (const p of this.players.values()) {
      if (p.downAt !== null && this.now - p.downAt > 20) p.eliminated = true;
      if (!this.active(p)) continue;
      if (this.now - (p.lastInput || 0) > .6) p.input = { x: 0, y: 0 };
      const input = p.input;
      if(input.x||input.y||input.attack||input.block||input.revive)p.emoteUntil=0;
      const was = p.block;
      p.block = !!(this.now>=p.dodgeUntil && input.block && p.energy > 0 && this.now >= p.blockAt);
      if (was && !p.block) p.blockAt = this.now + .4;
      if (p.block) {
        p.energy = Math.max(0, p.energy - 15 * dt);
        if (p.energy <= 0) { p.block = false; p.blockAt = this.now + .4; }
      } else p.energy = Math.min(100, p.energy + 12 * dt);
      const dir = normalize(input.x || 0, input.y || 0), moving = !!(input.x || input.y);
      const speed = (this.now < p.rootUntil ? 0 : CLASSES[p.classId].speed) * (p.block ? .42 : 1);
      if(this.now<p.rootUntil){p.vx=0;p.vy=0;}
      updateVelocity(p,input,speed,dt);
      if(this.now<p.dodgeUntil){p.vx=p.dodgeVX;p.vy=p.dodgeVY;}
      this.move(p, p.vx * dt, p.vy * dt);
      if (input.ax || input.ay) p.facing = Math.atan2(input.ay, input.ax);
      if (input.attack) this.basic(p);
      if (input.revive && !p.block && !input.attack && !moving && Math.hypot(p.vx,p.vy)<22 && this.now>=p.dodgeUntil) {
        const solids=[...obstacles(this.round),...this.hazards.filter(h=>h.solid&&h.at<=this.now)];
        const down = [...this.players.values()].filter(a => a.id !== p.id && a.connected && a.hp <= 0 && !a.eliminated && a.downAt !== null && this.now-a.downAt<=20 && distance(a, p) < REVIVE.range && routeClear(p,a,solids,2))
          .sort((a,b)=>(a.id===p.reviveTarget?-100:0)-(b.id===p.reviveTarget?-100:0)||a.downAt-b.downAt)[0];
        if (down && (p.lastHurt === undefined || this.now - p.lastHurt > .1)) {
          if (p.reviveTarget !== down.id) { p.reviveTarget = down.id; p.revive = 0; p.reviveStartedAt=this.now; }
          p.facing=Math.atan2(down.y-p.y,down.x-p.x);p.revive += dt;
          if (p.revive >= REVIVE.duration) {
            down.hp = down.maxHp * REVIVE.health; down.downAt = null; down.eliminated = false; down.revive = 0;
            down.revivedAt=this.now;down.revivedBy=p.id;down.lastHurt=-10;down.hitSafeUntil=this.now+REVIVE.grace;
            down.facing=Math.atan2(p.y-down.y,p.x-down.x);down.attackAt=-10;down.vx=down.vy=0;
            p.stats.revives++; p.roundStats.revives++; p.revive = 0; p.reviveTarget = null;p.aidAt=this.now;p.aidUntil=this.now+.55;
            this.emit('revived', {owner:down.id,rescuer:p.id,x:down.x,y:down.y,fromX:p.x,fromY:p.y});
            this.emit('heal', { owner: down.id, x: down.x, y: down.y }); this.emit('notice', { text: `${p.name} reviveu ${down.name}!` });
          }
        } else { p.reviveTarget = null; p.revive = 0; }
      } else { p.reviveTarget = null; p.revive = 0; }
    }
    for (const e of this.effects.filter(e => e.at <= this.now)) {
      if(e.kind==='volley'){
        for(let i=0;i<e.count;i++){const a=e.angle+(e.radial?i/e.count*Math.PI*2:(i/(e.count-1)-.5)*e.spread);
          this.projectiles.push({id:uid(),enemy:true,x:e.x,y:e.y,vx:Math.cos(a)*e.speed,vy:Math.sin(a)*e.speed,damage:e.damage,color:e.color,left:1050});}
      }else{const p=this.players.get(e.owner);if(this.active(p)&&!p.block&&this.now>=p.dodgeUntil){
        if(e.kind==='basic'&&p.classId==='archer')this.projectile(p,e.damage);else this.melee(p,e.damage||18,e.reach||94);
      }}
    }
    this.effects = this.effects.filter(e => e.at > this.now);
    if (this.state !== 'battle') return;
    this.tickProjectiles(dt);
    if (this.state !== 'battle') return;
    const b = this.boss;
    for (const poison of b.poison) if (poison.ticks > 0 && this.now >= poison.next) {
      const p = this.players.get(poison.owner); if (p) this.hitBoss(p, 8);
      poison.ticks--; poison.next += 1;
    }
    b.poison = b.poison.filter(x => x.ticks > 0);
    if (this.state !== 'battle') return;
    const threshold = b.phase===1?BOSSES[this.round].threshold:BOSSES[this.round].finalThreshold;
    if (b.phase<3 && b.state!=='transition' && b.hp / b.maxHp < threshold) {
      b.phase++;b.startedAt=this.now; b.charge=null; b.guarding=false; b.state = 'transition'; b.until = this.now + 1.5; b.immuneUntil = b.until;
      this.hazards = this.hazards.filter(h => !h.telegraph || h.at <= this.now);
      this.effects=this.effects.filter(e=>e.kind!=='volley'); this.nextWave=Math.min(this.nextWave,this.now+3);
      this.emit('phase', { text: b.phase===3?BOSSES[this.round].finalPhase:BOSSES[this.round].phase, x: b.x, y: b.y });
    }
    if (b.state === 'transition' && this.now >= b.until) { b.state = 'idle'; b.nextAt = this.now + .6; }
    if (b.state === 'windup' && this.now >= b.until) {
      b.state = 'execute'; b.startedAt=this.now; b.until = this.now + (b.executeFor||.45); b.guarding=false;
      this.emit('bossAttack', { x: b.x, y: b.y, kind: b.attack, round: this.round });
    } else if (b.state === 'execute' && this.now >= b.until) { b.state = 'recover'; b.until = this.now + (b.recoveryFor||1.5); b.startedAt=this.now; }
    else if (b.state === 'recover' && this.now >= b.until) { b.state = 'idle'; b.nextAt = this.now + (b.phase===3?.6:1); b.charge=null; }
    if (['idle', 'chase'].includes(b.state)) {
      const targets = [...this.players.values()].filter(p => this.active(p));
      const target = targets.find(p => p.id === b.target) || targets[0];
      if (target) {
        const dist = distance(b, target); b.facing = Math.atan2(target.y - b.y, target.x - b.x);
        if (dist > 105) {
          b.state = 'chase'; const n = normalize(target.x - b.x, target.y - b.y);
          const speed = BOSSES[this.round].speed * (1+(b.phase-1)*.12) * (this.now < b.slowUntil ? .45 : 1);
          let best=-Infinity,heading=b.facing;
          for(const turn of [0,.55,-.55,1.05,-1.05,1.6,-1.6]){const a=b.facing+turn,probe={x:b.x+Math.cos(a)*90,y:b.y+Math.sin(a)*90};let score=-distance(probe,target)-Math.abs(turn)*7;if(obstacles(this.round).some(o=>distance(probe,o)<o.r+BOSSES[this.round].radius+3))score-=2000;if(probe.x<55||probe.x>1145||probe.y<55||probe.y>705)score-=2000;if(score>best){best=score;heading=a;}}
          this.move(b, Math.cos(heading)*speed*dt, Math.sin(heading)*speed*dt);
        } else b.state = 'idle';
        if (this.now >= b.nextAt) this.planAttack();
      }
    }
    if(b.charge && this.now>=b.charge.start && this.now<=b.charge.end){const q=b.charge,t=clamp((this.now-q.start)/(q.end-q.start),0,1);this.move(b,q.x+(q.tx-q.x)*t-b.x,q.y+(q.ty-q.y)*t-b.y);}
    tickMinions(this,dt);tickLoot(this);
    this.tickHazards();
  }
  tickProjectiles(dt) {
    const kept = [];
    for (const q of this.projectiles) {
      if (this.state !== 'battle') break;
      const old = { x: q.x, y: q.y }; q.x += q.vx * dt; q.y += q.vy * dt; q.left -= Math.hypot(q.vx, q.vy) * dt;
      // Swept segment collision: no arrow tunneling through boss or pillars.
      if ([...obstacles(this.round), ...this.hazards.filter(h => h.solid && h.at <= this.now)].some(o => segmentDistance(old, q, o) < o.r)) continue;
      if(q.enemy){
        const target=[...this.players.values()].find(p=>this.active(p)&&this.now>=p.dodgeUntil&&segmentDistance(old,q,p)<21);
        if(target){if(this.now>=target.hitSafeUntil){this.hurt(target,q.damage,false,{x:target.x-q.vx,y:target.y-q.vy});target.hitSafeUntil=this.now+.2;}continue;}
      }else{
        const targets=[...this.minions.filter(m=>m.hp>0&&this.now>=m.activeAt),this.boss].map(target=>({target,t:((target.x-old.x)*q.vx+(target.y-old.y)*q.vy)/(Math.hypot(q.vx,q.vy)||1)})).sort((a,b)=>a.t-b.t);
        const hit=targets.find(({target})=>segmentDistance(old,q,target)<(target.isBoss?BOSSES[this.round].radius:18)+6)?.target;
        if(hit){const p=this.players.get(q.owner);if(p){if(hit.isBoss)this.hitBoss(p,q.damage);else this.hitMinion(p,hit,q.damage);}if(q.slow&&hit.isBoss)this.boss.slowUntil=this.now+q.slow;continue;}
      }
      if(q.left>0&&q.x>0&&q.y>0&&q.x<WORLD.w&&q.y<WORLD.h)kept.push(q);
    }
    this.projectiles = this.state === 'battle' ? kept : [];
  }
  tickHazards() {
    for (const h of this.hazards) {
      if (this.now < h.at || this.now > h.end || this.now < h.next || h.solid || h.warningOnly) continue;
      h.next = h.tick ? this.now + h.tick : Infinity;
      this.emit('impact', { x:h.x,y:h.y,r:h.r,inner:h.inner,shape:h.shape,angle:h.angle,length:h.length,width:h.width,spread:h.spread,round:this.round,visual:h.visual,cloud:!!h.cloud,breaks:!!h.breaks,mark:h.mark,minor:!!h.minion });
      for (const p of this.players.values()) {
        if (!this.active(p)||this.now<p.dodgeUntil||this.now<p.hitSafeUntil||!hazardContains(p,h,13))continue;
        this.hurt(p, h.damage, h.breaks,h); p.hitSafeUntil=this.now+.2;
        if (h.root && p.hp > 0) p.rootUntil = this.now + h.root;
      }
    }
    this.hazards = this.hazards.filter(h => h.end > this.now);
  }
  snapshot() {
    const playerView = p => ({ emote:p.emote,emoteAt:p.emoteAt,emoteUntil:p.emoteUntil,emoteReady:p.emoteReady,id: p.id, name: p.name, classId: p.classId, isBot: !!p.isBot, ready: p.ready, connected: p.connected,
      x: p.x, y: p.y, vx: p.vx, vy: p.vy, hp: p.hp, maxHp: p.maxHp, energy: p.energy, facing: p.facing, aiming: !!p.input.attack,
      attackAt:p.attackAt,attackFor:p.attackFor,attackSlot:p.attackSlot,lastHurt:p.lastHurt,dodgeAt:p.dodgeAt,dodgeUntil:p.dodgeUntil,dodgeReady:p.dodgeReady,reviveStartedAt:p.reviveStartedAt,aidAt:p.aidAt,aidUntil:p.aidUntil,revivedAt:p.revivedAt,revivedBy:p.revivedBy,
      combo:p.combo,potions:p.potions,potionReady:p.potionReady,
      cds: p.cds, basicAt: p.basicAt, block: p.block, shieldUntil: p.shieldUntil, rootUntil: p.rootUntil,
      downAt: p.downAt, eliminated: p.eliminated, revive: p.revive, reviveTarget: p.reviveTarget, stats: p.stats });
    return { code: this.code, name: this.name, owner: this.owner, public: this.public, solo: this.solo, couch:!!this.couch, botsEnabled: this.botsEnabled, state: this.state, round: this.round,
      keys:this.keys,keyDrop:this.keyDrop,keySceneUntil:this.keySceneUntil,gateUnlocked:this.gateUnlocked,secretUnlocked:this.secretUnlocked,vaultOpenedAt:this.vaultOpenedAt,endingAt:this.endingAt,intro:this.intro,outroStarted:this.outroStarted,now: this.now, transitionAt: this.transitionAt, remaining: this.remaining, boss: this.boss,
      players: [...this.players.values()].map(playerView), minions:this.minions,drops:this.drops,dialogue:this.dialogue, projectiles: this.projectiles, hazards: this.hazards,
      score: this.score, bestScore: this.bestScore || 0, wins: this.wins, results: this.results, events: this.events };
  }
}
