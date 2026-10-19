import { randomBytes } from 'node:crypto';
import { WORLD, CLASSES, BOSSES, COSTS, COOLDOWNS, clamp, distance } from '../public/shared.js';
import { thinkBots, BOT_NAMES } from './bots.js';

const uid = () => randomBytes(6).toString('hex');
const stats = () => ({ damage: 0, taken: 0, avoided: 0, revives: 0, skills: 0 });
export const normalize = (x, y) => { const d = Math.hypot(x, y); return d > 0 ? { x: x / d, y: y / d } : { x: 1, y: 0 }; };
export function segmentDistance(a, b, o) {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  const t = length2 ? clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / length2, 0, 1) : 0;
  return Math.hypot(o.x - a.x - t * dx, o.y - a.y - t * dy);
}
export const makePlayer = (session, name) => ({
  id: session, name, classId: 'knight', ready: false, connected: true, disconnectedAt: null,
  x: 270, y: 380, vx: 0, vy: 0, hp: 160, maxHp: 160, energy: 100, facing: 0,
  cds: [0, 0, 0], basicAt: 0, block: false, blockAt: 0, shieldUntil: 0, rootUntil: 0,
  shadowBonus: 0, poisonUntil: 0, downAt: null, eliminated: false, revive: 0, reviveTarget: null,
  input: { x: 0, y: 0, ax: 1, ay: 0, block: false, attack: false, revive: false },
  stats: stats(), roundStats: stats(), lastSeq: -1
});
export function obstacles(round) {
  const r = [
    [{ x: 170, y: 155, r: 27 }, { x: 1030, y: 155, r: 27 }, { x: 170, y: 605, r: 27 }, { x: 1030, y: 605, r: 27 }],
    [{ x: 160, y: 155, r: 38 }, { x: 1040, y: 160, r: 38 }, { x: 155, y: 600, r: 38 }, { x: 1040, y: 600, r: 38 }],
    [{ x: 170, y: 170, r: 30 }, { x: 1030, y: 170, r: 30 }, { x: 170, y: 590, r: 30 }, { x: 1030, y: 590, r: 30 }]
  ];
  return r[round] || r[0];
}
export class Room {
  constructor(code, owner, name, isPublic = false, solo = false) {
    this.code = code; this.owner = owner; this.name = name; this.public = isPublic;
    this.players = new Map(); this.state = 'lobby'; this.round = 0; this.now = 0;
    this.events = []; this.eventId = 0; this.projectiles = []; this.hazards = []; this.effects = [];
    this.score = 0; this.wins = 0; this.results = []; this.created = Date.now();
    this.transitionAt = 0; this.remaining = 300; this.boss = null; this.finishedSaved = false;
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
  reconnect(id) { const p = this.players.get(id); if (p) { p.connected = true; p.disconnectedAt = null; p.input = { x: 0, y: 0 }; this.emit('notice', { text: `${p.name} reconectou.` }); } }
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
    this.round = 0; this.score = 0; this.bestScore = 0; this.wins = 0; this.results = []; this.finishedSaved = false;
    for (const p of this.players.values()) { p.stats = stats(); p.hp = p.maxHp; }
    this.prepareRound();
  }
  restartLobby(id) {
    if (id !== this.owner || this.state !== 'finished') return;
    this.state = 'lobby'; this.boss = null; this.hazards = []; this.projectiles = [];
    for (const p of this.players.values()) { p.ready = !!p.isBot; p.hp = p.maxHp; p.downAt = null; p.eliminated = false; }
  }
  prepareRound() {
    this.state = 'countdown'; this.transitionAt = this.now + 3; this.remaining = 300;
    this.projectiles = []; this.hazards = []; this.effects = [];
    const info = BOSSES[this.round];
    const hp = Math.round(info.hp * (.25 + .1875 * this.players.size));
    this.boss = { x: 820, y: 380, hp, maxHp: hp, phase: 1, state: 'idle', until: this.now + 3,
      facing: Math.PI, target: null, attackIndex: 0, nextAt: this.now + 5, slowUntil: 0, poison: [], immuneUntil: 0, attack: null };
    let i = 0;
    for (const p of this.players.values()) {
      p.x = 265; p.y = 265 + i++ * 72; p.vx = 0; p.vy = 0;
      p.hp = p.hp > 0 ? Math.min(p.maxHp, p.hp + (p.maxHp - p.hp) * .5) : p.maxHp;
      p.energy = 100; p.cds = [0, 0, 0]; p.basicAt = 0; p.blockAt = 0; p.block = false;
      p.shieldUntil = 0; p.rootUntil = 0; p.shadowBonus = 0; p.poisonUntil = 0;
      p.downAt = null; p.eliminated = false; p.revive = 0; p.reviveTarget = null; p.roundStats = stats();
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
    } else if (msg.type === 'skill' && Number.isInteger(msg.slot) && msg.slot >= 0 && msg.slot < 3) this.skill(p, msg.slot);
  }
  active(p) { return p && p.connected && p.hp > 0 && !p.eliminated; }
  canAct(p) { return this.state === 'battle' && this.active(p) && !p.block && !p.input.block && !p.input.revive; }
  hitBoss(p, amount) {
    if (this.state !== 'battle' || !this.boss || this.boss.hp <= 0 || this.now < this.boss.immuneUntil) return 0;
    const actual = Math.min(amount, this.boss.hp); this.boss.hp -= actual;
    p.stats.damage += actual; p.roundStats.damage += actual;
    this.emit('hit', { x: this.boss.x, y: this.boss.y - 40, amount: actual, owner: p.id, target: 'boss' });
    if (this.boss.hp <= 0) this.endRound(true);
    return actual;
  }
  melee(p, amount, reach) {
    if (distance(p, this.boss) > reach + BOSSES[this.round].radius) return false;
    if (obstacles(this.round).some(o => segmentDistance(p, this.boss, o) < o.r)) return false;
    const dir = normalize(p.input.ax || Math.cos(p.facing), p.input.ay || Math.sin(p.facing));
    const target = normalize(this.boss.x - p.x, this.boss.y - p.y);
    if (dir.x * target.x + dir.y * target.y < -.1) return false;
    return this.hitBoss(p, amount) > 0;
  }
  projectile(p, damage, color = 'arrow', opts = {}) {
    const dir = normalize(p.input.ax || Math.cos(p.facing), p.input.ay || Math.sin(p.facing));
    const angle = Math.atan2(dir.y, dir.x) + (opts.angle || 0);
    this.projectiles.push({ id: uid(), owner: p.id, x: p.x, y: p.y, vx: Math.cos(angle) * 640, vy: Math.sin(angle) * 640, damage, color, left: opts.range || 570, slow: opts.slow || 0 });
  }
  basic(p) {
    if (!this.canAct(p) || this.now < p.basicAt) return;
    const c = CLASSES[p.classId]; p.basicAt = this.now + c.interval; p.reviveTarget = null;
    if (p.classId === 'archer') this.projectile(p, c.damage);
    else { this.melee(p, c.damage + p.shadowBonus, c.range); p.shadowBonus = 0; }
    this.emit('attack', { owner: p.id, kind: p.classId, x: p.x, y: p.y, angle: p.facing, slot: -1 });
  }
  skill(p, slot) {
    if (!this.canAct(p) || p.energy < COSTS[slot] || this.now < p.cds[slot]) return false;
    p.energy -= COSTS[slot]; p.cds[slot] = this.now + COOLDOWNS[slot]; p.stats.skills++; p.roundStats.skills++;
    p.reviveTarget = null;
    if (p.classId === 'knight') {
      if (slot === 0) this.melee(p, 25, 112);
      if (slot === 1) {
        this.dash(p, 175); this.melee(p, 35, 105);
        if (this.boss?.state === 'windup' && this.boss.phase === 1 && distance(p, this.boss) < 155) {
          this.hazards = this.hazards.filter(h => !h.telegraph); this.boss.state = 'recover'; this.boss.until = this.now + 1.6;
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
      if (slot === 2 && distance(p, this.boss) < 96 + BOSSES[this.round].radius) {
        this.boss.poison = this.boss.poison.filter(x => x.owner !== p.id);
        this.boss.poison.push({ owner: p.id, next: this.now + 1, ticks: 3 });
      }
    }
    this.emit('attack', { owner: p.id, kind: p.classId, x: p.x, y: p.y, angle: p.facing, slot });
    return true;
  }
  dash(p, length) {
    const dir = normalize(p.input.ax || Math.cos(p.facing), p.input.ay || Math.sin(p.facing));
    const old = { x: p.x, y: p.y };
    for (let i = 0; i < length; i += 5) this.move(p, dir.x * Math.min(5, length - i), dir.y * Math.min(5, length - i));
    this.emit('dash', { x: old.x, y: old.y, tx: p.x, ty: p.y, kind: p.classId });
  }
  move(p, dx, dy) {
    p.x = clamp(p.x + dx, WORLD.margin, WORLD.w - WORLD.margin);
    p.y = clamp(p.y + dy, WORLD.margin, WORLD.h - WORLD.margin);
    const solids = [...obstacles(this.round), ...this.hazards.filter(h => h.solid && h.at <= this.now)];
    for (const o of solids) {
      const d = distance(p, o), min = o.r + 17;
      if (d < min) { const n = normalize(p.x - o.x, p.y - o.y); p.x = o.x + n.x * min; p.y = o.y + n.y * min; }
    }
    p.x = clamp(p.x, WORLD.margin, WORLD.w - WORLD.margin); p.y = clamp(p.y, WORLD.margin, WORLD.h - WORLD.margin);
  }
  hurt(p, amount, breaks = false) {
    if (!this.active(p) || this.state !== 'battle') return;
    let factor = 1;
    if (p.block && !breaks) factor *= .4;
    if (p.shieldUntil > this.now) factor *= .5;
    else if ([...this.players.values()].some(a => this.active(a) && a.classId === 'knight' && a.shieldUntil > this.now && distance(a, p) < 175)) factor *= .75;
    const final = Math.round(amount * factor * 10) / 10;
    const taken = Math.min(p.hp, final), avoided = amount - final;
    p.hp = Math.max(0, p.hp - final); p.stats.taken += taken; p.roundStats.taken += taken;
    p.stats.avoided += avoided; p.roundStats.avoided += avoided;
    p.reviveTarget = null; p.revive = 0; p.lastHurt = this.now;
    if (breaks && p.block) { p.block = false; p.blockAt = this.now + .8; this.emit('notice', { text: `${p.name}: defesa quebrada!` }); }
    this.emit('hurt', { owner: p.id, x: p.x, y: p.y, amount: final, blocked: factor < 1 });
    if (p.hp <= 0) { p.downAt = this.now; p.block = false; p.vx = p.vy = 0; this.emit('notice', { text: `${p.name} caiu! Segure E perto para reviver.` }); }
  }
  endRound(won, reason = '') {
    if (this.state !== 'battle') return;
    const reward = won ? BOSSES[this.round].reward + Math.floor(this.remaining / 3) : 0;
    this.score += reward; if (won) this.wins++;
    const result = { round: this.round, won, reason, remaining: Math.ceil(this.remaining), reward, players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, ...p.roundStats })) };
    this.results.push(result); this.state = this.round === 2 ? 'finished' : 'round_end'; this.transitionAt = this.now + 7;
    if (this.state === 'finished') {
      if (this.wins === 3) this.score += 150;
      this.score += [...this.players.values()].reduce((s, p) => s + Math.floor(p.stats.damage / 30 + p.stats.avoided / 8 + p.stats.revives * 30), 0);
    }
    this.projectiles = []; this.hazards = []; this.effects = [];
    this.emit(won ? 'victory' : 'defeat', { text: won ? 'Chefe derrotado!' : reason });
  }
  planAttack() {
    const b = this.boss, living = [...this.players.values()].filter(p => this.active(p)); if (!living.length) return;
    const target = living[b.attackIndex % living.length];
    b.target = target.id; b.attackIndex++;
    b.facing = Math.atan2(target.y - b.y, target.x - b.x);
    b.state = 'windup'; b.until = this.now + (b.phase === 2 ? .95 : 1.3);
    const kind = (b.attackIndex - 1) % 3;
    b.attack = kind;
    const hazard = (x, y, r, damage, opt = {}) => this.hazards.push({ id: uid(), x, y, r, damage, at: b.until, end: b.until + .32, telegraph: true, next: b.until, ...opt });
    if (this.round === 0) {
      if (kind === 0) hazard(b.x, b.y, 190, 25, { shape: 'cone', angle: b.facing, spread: 1.05 });
      if (kind === 1) hazard(b.x, b.y, 230, 32, { breaks: true });
      if (kind === 2) hazard(target.x, target.y, 85, 18, { root: 1.8 });
    } else if (this.round === 1) {
      if (kind === 0) { for (const p of living) hazard(p.x, p.y, 65, 20, { root: 1.5 }); }
      if (kind === 1) hazard(target.x, target.y, 118, 8, { end: b.until + 5, tick: .8, cloud: true });
      if (kind === 2) hazard(b.x, b.y, 205, 34, { breaks: true });
      if (b.phase === 2 && this.hazards.filter(h => h.solid).length < 4) {
        const angle = this.now * 2;
        hazard(clamp(b.x + Math.cos(angle) * 200, 250, 950), clamp(b.y + Math.sin(angle) * 200, 200, 560), 29, 0, { solid: true, end: b.until + 9 });
      }
    } else {
      if (kind === 0) hazard(b.x, b.y, 245, 36, { shape: 'cone', angle: b.facing, spread: 1.8, breaks: true });
      if (kind === 1) {
        for (const p of living) hazard(p.x, p.y, 83, 32, { at: b.until + .5, end: b.until + .85, next: b.until + .5, breaks: true });
      }
      if (kind === 2) hazard(target.x, target.y, 88, 42, { at: b.until + .65, end: b.until + 1, next: b.until + .65, mark: target.id, breaks: true });
      if (b.phase === 2) hazard(250 + (Math.sin(this.now * 3) + 1) * 350, 160 + (Math.cos(this.now * 5) + 1) * 220, 70, 22, { at: b.until + .6, end: b.until + 1, next: b.until + .6 });
    }
    const names = [['Corte Devastador', 'Impacto do Trono — rompe defesa', 'Correntes dos Condenados'], ['Raízes Aprisionadoras', 'Sopro Venenoso', 'Pisada Sísmica — rompe defesa'], ['Foice do Eclipse — esquive!', 'Ruptura do Vazio', 'Marca da Morte — saia da marca!']];
    this.emit('warning', { text: names[this.round][kind] });
  }
  tick(dt) {
    this.now += dt;
    for (const p of this.players.values()) if (!p.connected && p.disconnectedAt !== null && this.now - p.disconnectedAt > 60) this.remove(p.id);
    if (this.state === 'countdown' && this.now >= this.transitionAt) { this.state = 'battle'; this.boss.nextAt = this.now + 1.5; return; }
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
      const was = p.block;
      p.block = !!(input.block && p.energy > 0 && this.now >= p.blockAt);
      if (was && !p.block) p.blockAt = this.now + .4;
      if (p.block) {
        p.energy = Math.max(0, p.energy - 15 * dt);
        if (p.energy <= 0) { p.block = false; p.blockAt = this.now + .4; }
      } else p.energy = Math.min(100, p.energy + 12 * dt);
      const dir = normalize(input.x || 0, input.y || 0), moving = !!(input.x || input.y);
      const speed = (this.now < p.rootUntil ? 0 : CLASSES[p.classId].speed) * (p.block ? .42 : 1);
      const smoothing = Math.min(1, dt * 16);
      p.vx += ((moving ? dir.x * speed : 0) - p.vx) * smoothing;
      p.vy += ((moving ? dir.y * speed : 0) - p.vy) * smoothing;
      this.move(p, p.vx * dt, p.vy * dt);
      if (input.ax || input.ay) p.facing = Math.atan2(input.ay, input.ax);
      if (input.attack) this.basic(p);
      if (input.revive && !p.block && !input.attack && !moving) {
        const down = [...this.players.values()].find(a => a.id !== p.id && a.hp <= 0 && !a.eliminated && a.downAt !== null && distance(a, p) < 86);
        if (down && (p.lastHurt === undefined || this.now - p.lastHurt > .1)) {
          if (p.reviveTarget !== down.id) { p.reviveTarget = down.id; p.revive = 0; }
          p.revive += dt;
          if (p.revive >= 4) {
            down.hp = down.maxHp * .4; down.downAt = null; down.eliminated = false; down.revive = 0;
            p.stats.revives++; p.roundStats.revives++; p.revive = 0; p.reviveTarget = null;
            this.emit('heal', { owner: down.id, x: down.x, y: down.y }); this.emit('notice', { text: `${p.name} reviveu ${down.name}!` });
          }
        } else { p.reviveTarget = null; p.revive = 0; }
      } else { p.reviveTarget = null; p.revive = 0; }
    }
    for (const e of this.effects.filter(e => e.at <= this.now)) {
      const p = this.players.get(e.owner); if (this.active(p)) this.melee(p, 18, 94);
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
    if (b.phase === 1 && b.hp / b.maxHp < BOSSES[this.round].threshold) {
      b.phase = 2; b.state = 'transition'; b.until = this.now + 1.5; b.immuneUntil = b.until;
      this.hazards = this.hazards.filter(h => !h.telegraph || h.at <= this.now);
      this.emit('phase', { text: BOSSES[this.round].phase, x: b.x, y: b.y });
    }
    if (b.state === 'transition' && this.now >= b.until) { b.state = 'idle'; b.nextAt = this.now + .6; }
    if (b.state === 'windup' && this.now >= b.until) {
      b.state = 'execute'; b.until = this.now + .4;
      this.emit('bossAttack', { x: b.x, y: b.y, kind: b.attack, round: this.round });
    } else if (b.state === 'execute' && this.now >= b.until) { b.state = 'recover'; b.until = this.now + (b.phase === 2 ? .85 : 1.45); }
    else if (b.state === 'recover' && this.now >= b.until) { b.state = 'idle'; b.nextAt = this.now + (b.phase === 2 ? .7 : 1.25); }
    if (['idle', 'chase'].includes(b.state)) {
      const targets = [...this.players.values()].filter(p => this.active(p));
      const target = targets.find(p => p.id === b.target) || targets[0];
      if (target) {
        const dist = distance(b, target); b.facing = Math.atan2(target.y - b.y, target.x - b.x);
        if (dist > 125) {
          b.state = 'chase'; const n = normalize(target.x - b.x, target.y - b.y);
          const speed = BOSSES[this.round].speed * (b.phase === 2 ? 1.25 : 1) * (this.now < b.slowUntil ? .45 : 1);
          this.move(b, n.x * speed * dt, n.y * speed * dt);
        } else b.state = 'idle';
        if (this.now >= b.nextAt) this.planAttack();
      }
    }
    this.tickHazards();
  }
  tickProjectiles(dt) {
    const kept = [];
    for (const q of this.projectiles) {
      if (this.state !== 'battle') break;
      const old = { x: q.x, y: q.y }; q.x += q.vx * dt; q.y += q.vy * dt; q.left -= Math.hypot(q.vx, q.vy) * dt;
      // Swept segment collision: no arrow tunneling through boss or pillars.
      if ([...obstacles(this.round), ...this.hazards.filter(h => h.solid && h.at <= this.now)].some(o => segmentDistance(old, q, o) < o.r)) continue;
      if (segmentDistance(old, q, this.boss) < BOSSES[this.round].radius + 6) {
        const p = this.players.get(q.owner);
        if (p) this.hitBoss(p, q.damage);
        if (q.slow) this.boss.slowUntil = this.now + q.slow;
      } else if (q.left > 0 && q.x > 0 && q.y > 0 && q.x < WORLD.w && q.y < WORLD.h) kept.push(q);
    }
    this.projectiles = this.state === 'battle' ? kept : [];
  }
  tickHazards() {
    for (const h of this.hazards) {
      if (this.now < h.at || this.now > h.end || this.now < h.next || h.solid) continue;
      h.next = h.tick ? this.now + h.tick : Infinity;
      this.emit('impact', { x: h.x, y: h.y, r: h.r, round: this.round });
      for (const p of this.players.values()) {
        if (!this.active(p) || distance(p, h) > h.r + 13) continue;
        if (h.shape === 'cone') {
          const a = Math.atan2(p.y - h.y, p.x - h.x);
          if (Math.abs(Math.atan2(Math.sin(a - h.angle), Math.cos(a - h.angle))) > h.spread) continue;
        }
        this.hurt(p, h.damage, h.breaks);
        if (h.root && p.hp > 0) p.rootUntil = this.now + h.root;
      }
    }
    this.hazards = this.hazards.filter(h => h.end > this.now);
  }
  snapshot() {
    const playerView = p => ({ id: p.id, name: p.name, classId: p.classId, isBot: !!p.isBot, ready: p.ready, connected: p.connected,
      x: p.x, y: p.y, vx: p.vx, vy: p.vy, hp: p.hp, maxHp: p.maxHp, energy: p.energy, facing: p.facing,
      cds: p.cds, basicAt: p.basicAt, block: p.block, shieldUntil: p.shieldUntil, rootUntil: p.rootUntil,
      downAt: p.downAt, eliminated: p.eliminated, revive: p.revive, reviveTarget: p.reviveTarget, stats: p.stats });
    return { code: this.code, name: this.name, owner: this.owner, public: this.public, solo: this.solo, botsEnabled: this.botsEnabled, state: this.state, round: this.round,
      now: this.now, transitionAt: this.transitionAt, remaining: this.remaining, boss: this.boss,
      players: [...this.players.values()].map(playerView), projectiles: this.projectiles, hazards: this.hazards,
      score: this.score, bestScore: this.bestScore || 0, wins: this.wins, results: this.results, events: this.events };
  }
}
