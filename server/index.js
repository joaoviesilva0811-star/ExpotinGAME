import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { WebSocketServer, WebSocket } from 'ws';
import { Room } from './engine.js';
import { Store } from './store.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
export function createGameServer(options = {}) {
  const store = new Store(options.dataDir || process.env.DATA_DIR || resolve(root, 'data'));
  const rooms = new Map(), clients = new Map(), limits = new Map();
  const allowedOrigins = (options.origins || process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const publicDir = resolve(root, 'public');
  function ip(req) { return req.socket.remoteAddress || 'unknown'; }
  function limit(key, max, duration) {
    const now = Date.now(); let b = limits.get(key);
    if (!b || now > b.until) { b = { count: 0, until: now + duration }; limits.set(key, b); }
    return ++b.count <= max;
  }
  function originAllowed(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // Native clients authenticate using bearer tokens too.
    if (allowedOrigins.includes(origin)) return true;
    try { return new URL(origin).host === req.headers.host && ['http:', 'https:'].includes(new URL(origin).protocol); } catch { return false; }
  }
  function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
  async function body(req) {
    let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 4096) throw new Error('Requisição grande demais.'); }
    try { return JSON.parse(data); } catch { throw new Error('JSON inválido.'); }
  }
  function secure(req) { return req.socket.encrypted || (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-proto'] === 'https'); }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    let socketSources='';
    try{const host=new URL('http://'+req.headers.host).host;socketSources=` ws://${host} wss://${host}`;}catch{}
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https: wss: http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*"+socketSources+"; media-src 'self' blob:");
    if (!originAllowed(req)) return json(res, 403, { error: 'Origem não autorizada. Configure ALLOWED_ORIGINS no servidor.' });
    if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return json(res, 400, { error: 'URL inválida.' }); }
    try {
      if (path === '/api/health' && req.method === 'GET') return json(res, 200, { status: 'ok', rooms: rooms.size, protocol: 1, localDesktop: !!options.localDesktop });
      if (path === '/api/rooms' && req.method === 'GET') {
        return json(res, 200, [...rooms.values()].filter(r => r.public && r.state === 'lobby' && r.players.size < 4).map(r => ({ code: r.code, name: r.name, players: r.players.size })));
      }
      if (path === '/api/leaderboard' && req.method === 'GET') return json(res, 200, store.leaderboard());
      if (path === '/api/session' && req.method === 'GET') {
        const token = req.headers.authorization?.replace(/^Bearer /, ''); const session = store.getSession(token);
        return json(res, session ? 200 : 401, session ? { session } : { error: 'Sessão expirada. Entre novamente.' });
      }
      if (['/api/guest', '/api/register', '/api/login', '/api/logout'].includes(path) && req.method === 'POST') {
        if (!limit('auth:' + ip(req), 30, 60000)) return json(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' });
        if (process.env.NODE_ENV === 'production' && !options.localDesktop && !secure(req)) return json(res, 400, { error: 'A autenticação exige HTTPS em produção.' });
        const data = await body(req);
        if (path === '/api/logout') {
          const token = req.headers.authorization?.replace(/^Bearer /, '');
          const session = store.getSession(token); store.revoke(token);
          if (session) clients.get(session.id)?.close(4003, 'Session revoked');
          return json(res, 200, { ok: true });
        }
        const name = typeof data.name === 'string' ? data.name.trim().normalize('NFC') : '';
        if (name.length < 2 || name.length > 20 || /[\p{C}<>]/u.test(name)) throw new Error('Use um nome com 2 a 20 caracteres.');
        const result = path === '/api/guest' ? store.session(name) : await store[path === '/api/register' ? 'register' : 'login'](name, data.password);
        return json(res, 200, result);
      }
      if (path.startsWith('/api/')) return json(res, 404, { error: 'Endpoint não encontrado.' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Método não permitido.' });
      const target = resolve(publicDir, '.' + (path === '/' ? '/index.html' : path));
      if (!target.startsWith(publicDir + sep) || path.includes('\0')) return json(res, 403, { error: 'Acesso negado.' });
      const content = await readFile(target);
      const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
      res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') return json(res, 404, { error: 'Arquivo não encontrado.' });
      if (path.startsWith('/api/')) return json(res, 400, { error: error.message.slice(0, 180) });
      console.error('HTTP request failed:', error.code || error.name); return json(res, 500, { error: 'Erro interno.' });
    }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws' || !originAllowed(req) || !limit('upgrade:' + ip(req), 30, 60000) || wss.clients.size > 400) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); return socket.destroy(); }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  function send(ws, type, data = {}) { if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 256000) ws.send(JSON.stringify({ type, ...data })); }
  function findRoom(id) { return [...rooms.values()].find(r => r.players.has(id)); }
  function leave(ws) {
    const r = ws.room; if (!r) return; r.remove(ws.session.id); ws.room = null;
    if (![...r.players.values()].some(p=>!p.isBot)) rooms.delete(r.code);
  }
  function makeCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return 'IRON-' + [...randomBytes(6)].map(x => alphabet[x % alphabet.length]).join('');
  }
  wss.on('connection', (ws, req) => {
    ws.alive = true; ws.session = null; ws.room = null; ws.messages = { count: 0, until: Date.now() + 1000 };
    ws.on('error', () => {}); ws.on('pong', () => { ws.alive = true; });
    const authTimeout = setTimeout(() => { if (!ws.session) ws.close(4003, 'Authenticate first'); }, 8000);
    ws.on('message', async raw => {
      if (Date.now() > ws.messages.until) ws.messages = { count: 0, until: Date.now() + 1000 };
      if (++ws.messages.count > 65) { ws.close(4008, 'Rate limit'); return; }
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return send(ws, 'error', { error: 'Mensagem inválida.' }); }
      if (!msg || typeof msg !== 'object') return;
      try {
        if (msg.type === 'auth') {
          if (ws.session) return;
          const session = store.getSession(msg.token); if (!session) { send(ws, 'error', { error: 'Sessão expirada.' }); ws.close(4003); return; }
          clearTimeout(authTimeout); ws.session = session;
          const previous = clients.get(session.id); clients.set(session.id, ws);
          if (previous && previous !== ws) previous.close(4001, 'Session used in another tab');
          const r = findRoom(session.id); if (r) { ws.room = r; r.reconnect(session.id); }
          send(ws, 'welcome', { session, room: r?.snapshot() || null }); return;
        }
        if (!ws.session) { ws.close(4003); return; }
        if (ws.session.expires < Date.now()) { ws.close(4003); return; }
        if (msg.type === 'ping') return send(ws, 'pong', { time: msg.time });
        if (['create', 'join', 'leave', 'start', 'restart', 'class', 'ready', 'bots'].includes(msg.type) && !limit('actions:' + ws.session.id, 40, 10000)) throw new Error('Aguarde antes de repetir essa ação.');
        if (msg.type === 'create') {
          if (ws.room) throw new Error('Saia da sala atual primeiro.');
          if (rooms.size >= 100) throw new Error('Servidor cheio. Tente novamente mais tarde.');
          let code; do { code = makeCode(); } while (rooms.has(code));
          const roomName = typeof msg.name === 'string' ? msg.name.trim().slice(0, 32) : `Expedição de ${ws.session.name}`;
          const solo=msg.mode==='solo';
          const r = new Room(code, ws.session.id, roomName || 'Expedição', !solo && msg.public === true, solo);
          r.add(ws.session.id, ws.session.name);
          if(msg.classId)r.select(ws.session.id,msg.classId);
          rooms.set(code, r); ws.room = r; return send(ws, 'joined', { room: r.snapshot() });
        }
        if (msg.type === 'join') {
          if (ws.room) throw new Error('Saia da sala atual primeiro.');
          const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
          const r = rooms.get(code); if (!r) throw new Error('Sala não encontrada. Confira o código.');
          r.add(ws.session.id, ws.session.name);
          if(msg.classId && r.state==='lobby')r.select(ws.session.id,msg.classId);
          ws.room = r; return send(ws, 'joined', { room: r.snapshot() });
        }
        if (msg.type === 'leave') { leave(ws); return send(ws, 'left'); }
        const r = ws.room; if (!r) return;
        if (msg.type === 'class') r.select(ws.session.id, msg.classId);
        else if (msg.type === 'bots') r.setBots(ws.session.id,msg.enabled);
        else if (msg.type === 'ready' && r.state === 'lobby') r.players.get(ws.session.id).ready = msg.ready === true;
        else if (msg.type === 'start') r.start(ws.session.id);
        else if (msg.type === 'restart') r.restartLobby(ws.session.id);
        else r.command(ws.session.id, msg);
      } catch (error) { send(ws, 'error', { error: error.message.slice(0, 180) }); }
    });
    ws.on('close', () => {
      clearTimeout(authTimeout);
      if (ws.session && clients.get(ws.session.id) === ws) { clients.delete(ws.session.id); ws.room?.disconnect(ws.session.id); }
    });
  });
  let previous = performance.now();
  const tick = setInterval(() => {
    const now = performance.now(), dt = Math.min(.25, (now - previous) / 1000); previous = now;
    for (const [code, r] of rooms) {
      r.tick(dt);
      if (r.state === 'finished' && !r.finishedSaved) { r.bestScore = store.saveMatch(r); r.finishedSaved = true; }
      if (![...r.players.values()].some(p=>!p.isBot)) { rooms.delete(code); continue; }
      const snapshot = r.snapshot();
      for (const p of r.players.values()) { const ws = clients.get(p.id); if (ws?.room === r) send(ws, 'snapshot', { room: snapshot }); }
    }
  }, 50);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); }
    for (const [key, value] of limits) if (value.until < Date.now()) limits.delete(key);
    store.cleanup();
  }, 20000);
  async function close() {
    clearInterval(tick); clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
    await new Promise(resolve => wss.close(resolve));
    await new Promise(resolve => server.close(resolve)); store.close();
  }
  return { server, rooms, store, close };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createGameServer();
  const port = Number(process.env.PORT || 3000);
  app.server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Iron Crown listening on port ${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
}
