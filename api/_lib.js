// Gemeinsame Hilfsfunktionen: Anmeldung, Postfächer, IMAP-Verbindung
const crypto = require('crypto');
const { ImapFlow } = require('imapflow');

const COOKIE = 'mv_session';
const MAX_AGE = 60 * 60 * 24 * 180; // 180 Tage angemeldet bleiben

function secret() {
  const pw = process.env.APP_PASSWORD;
  if (!pw) throw httpError(500, 'APP_PASSWORD ist nicht eingerichtet.');
  return crypto.createHash('sha256').update('mv:' + pw + ':' + (process.env.SESSION_SECRET || '')).digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function makeToken() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return exp + '.' + sign(exp);
}

function validToken(token) {
  if (!token || !token.includes('.')) return false;
  const [exp, sig] = token.split('.');
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sig || '');
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function passwordMatches(input) {
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(String(process.env.APP_PASSWORD || '')).digest();
  return !!process.env.APP_PASSWORD && crypto.timingSafeEqual(a, b);
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function sessionCookie(token, maxAge) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

// Postfächer aus Umgebungsvariablen: MAIL_USER/MAIL_PASS (+ MAIL_HOST, MAIL_NAME),
// weitere Konten als MAIL2_USER, MAIL2_PASS, MAIL2_HOST, MAIL2_NAME usw. (bis 9)
function accounts() {
  const list = [];
  for (let i = 1; i <= 9; i++) {
    const p = i === 1 ? 'MAIL_' : `MAIL${i}_`;
    const user = process.env[p + 'USER'];
    if (!user) continue;
    list.push({
      id: list.length,
      name: process.env[p + 'NAME'] || user,
      user,
      pass: process.env[p + 'PASS'] || '',
      host: process.env[p + 'HOST'] || 'imap.strato.de',
      port: Number(process.env[p + 'PORT'] || 993),
      secure: (process.env[p + 'SECURE'] || 'true') !== 'false',
    });
  }
  return list;
}

function account(id) {
  const list = accounts();
  if (!list.length) throw httpError(500, 'Es ist noch kein Postfach eingerichtet (MAIL_USER fehlt).');
  const acc = list[Number(id) || 0];
  if (!acc) throw httpError(400, 'Unbekanntes Postfach.');
  return acc;
}

async function withImap(accId, fn) {
  const acc = account(accId);
  const client = new ImapFlow({
    host: acc.host, port: acc.port, secure: acc.secure,
    auth: { user: acc.user, pass: acc.pass },
    logger: false, emitLogs: false,
    socketTimeout: 30000,
  });
  try {
    await client.connect();
  } catch (e) {
    const msg = e.authenticationFailed ? 'Anmeldung beim Mailserver fehlgeschlagen. Stimmen E-Mail-Adresse und Passwort?' : 'Mailserver nicht erreichbar: ' + (e.message || e);
    throw httpError(502, msg);
  }
  try {
    return await fn(client, acc);
  } finally {
    try { await client.logout(); } catch (_) { client.close(); }
  }
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

// Wrapper für geschützte Endpunkte
function handler(fn, { auth = true, methods = ['GET'] } = {}) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) return send(res, 405, { error: 'Methode nicht erlaubt' });
      if (auth && !validToken(getCookie(req, COOKIE))) return send(res, 401, { error: 'Bitte anmelden.' });
      const url = new URL(req.url, 'http://x');
      const body = req.method === 'POST' ? await readBody(req) : {};
      const out = await fn({ req, res, query: Object.fromEntries(url.searchParams), body });
      if (!res.writableEnded) send(res, 200, out);
    } catch (e) {
      send(res, e.status || 500, { error: e.message || 'Unbekannter Fehler' });
    }
  };
}

module.exports = { handler, withImap, accounts, httpError, makeToken, passwordMatches, sessionCookie, send, MAX_AGE };
