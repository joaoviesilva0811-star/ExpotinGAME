import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const hash = text => createHash('sha256').update(text).digest('hex');
export class Store {
  constructor(directory) {
    mkdirSync(directory, { recursive: true });
    this.db = new DatabaseSync(join(directory, 'iron-crown.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, user_id TEXT REFERENCES users(id), name TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS matches(id INTEGER PRIMARY KEY, team TEXT NOT NULL, score INTEGER NOT NULL, wins INTEGER NOT NULL, details TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
      PRAGMA user_version=1;`);
    this.cleanup();
  }
  cleanup() { this.db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now()); }
  session(name, userId = null) {
    const token = randomBytes(32).toString('base64url'), id = randomBytes(16).toString('hex');
    const expires = Date.now() + (userId ? 7 : 1) * 86400000;
    this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?)').run(id, hash(token), userId, name, expires);
    return { token, session: { id, name, userId, expires } };
  }
  getSession(token) {
    if (typeof token !== 'string' || token.length > 100) return null;
    const r = this.db.prepare('SELECT id,name,user_id as userId,expires FROM sessions WHERE token_hash=? AND expires>?').get(hash(token), Date.now());
    return r || null;
  }
  revoke(token) { if (token) this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token)); }
  async register(name, password) {
    if (!/^[\p{L}\p{N}_-]{3,20}$/u.test(name)) throw new Error('Use de 3 a 20 letras, números, _ ou - no nome da conta.');
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) throw new Error('A senha deve ter de 10 a 128 caracteres.');
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)).toString('hex');
    const id = randomBytes(16).toString('hex');
    try { this.db.prepare('INSERT INTO users VALUES(?, ?, ?, ?, ?, ?)').run(id, name.toLocaleLowerCase('pt-BR'), name, salt, derived, Date.now()); }
    catch (error) { if (error.code?.includes('CONSTRAINT') || String(error).includes('UNIQUE')) throw new Error('Este nome de conta já está em uso.'); throw error; }
    return this.session(name, id);
  }
  async login(name, password) {
    if (typeof name !== 'string' || typeof password !== 'string' || password.length > 128) throw new Error('Credenciais inválidas.');
    const user = this.db.prepare('SELECT * FROM users WHERE username=?').get(name.toLocaleLowerCase('pt-BR'));
    const derived = await scrypt(password, user?.salt || '00000000000000000000000000000000', 64);
    if (!user || !timingSafeEqual(derived, Buffer.from(user.password, 'hex'))) throw new Error('Nome ou senha incorretos.');
    return this.session(user.name, user.id);
  }
  saveMatch(room) {
    const team = [...room.players.values()].map(p => p.name).sort((a,b) => a.localeCompare(b)).join(', ');
    this.db.prepare('INSERT INTO matches(team,score,wins,details,created) VALUES(?,?,?,?,?)').run(team, room.score, room.wins, JSON.stringify(room.results), Date.now());
    return this.db.prepare('SELECT MAX(score) AS best FROM matches WHERE team=?').get(team).best;
  }
  leaderboard() { return this.db.prepare('SELECT id,team,score,wins,created FROM matches ORDER BY score DESC, created ASC LIMIT 10').all(); }
  close() { this.db.close(); }
}
