// Gemeinsame Hilfsfunktionen: Anmeldung, Postfächer, IMAP-Verbindung
const crypto = require('crypto');
const { ImapFlow } = require('imapflow');

const COOKIE = 'mv_auth';
const MAX_AGE = 60 * 60 * 24 * 365; // ein Jahr angemeldet bleiben

// Die Zugangsdaten der Postfächer liegen verschlüsselt (AES-256-GCM) in einem
// HttpOnly-Cookie auf dem iPhone. Der Schlüssel liegt nur auf dem Server.
function key() {
  const k = process.env.SESSION_KEY || process.env.APP_PASSWORD;
  if (!k) throw httpError(500, 'SESSION_KEY ist nicht eingerichtet.');
  return crypto.createHash('sha256').update('mv-key:' + k).digest();
}

function seal(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString('base64url');
}

function unseal(token) {
  try {
    const buf = Buffer.from(token, 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'));
  } catch (_) { return null; }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function authCookie(accounts) {
  if (!accounts || !accounts.length) return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
  return `${COOKIE}=${seal({ accounts, exp: Date.now() + MAX_AGE * 1000 })}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

function sessionAccounts(req) {
  const raw = getCookie(req, COOKIE);
  const s = raw && unseal(raw);
  if (!s || !Array.isArray(s.accounts) || s.exp < Date.now()) return [];
  return s.accounts;
}

// Passenden IMAP-Server zur Mailadresse raten (eigene Domains: Strato)
const HOSTS = {
  'gmail.com': 'imap.gmail.com', 'googlemail.com': 'imap.gmail.com',
  'gmx.de': 'imap.gmx.net', 'gmx.net': 'imap.gmx.net', 'gmx.at': 'imap.gmx.net', 'gmx.ch': 'imap.gmx.net',
  'web.de': 'imap.web.de', 't-online.de': 'secureimap.t-online.de',
  'outlook.com': 'outlook.office365.com', 'outlook.de': 'outlook.office365.com', 'hotmail.com': 'outlook.office365.com', 'hotmail.de': 'outlook.office365.com', 'live.com': 'outlook.office365.com', 'live.de': 'outlook.office365.com',
  'icloud.com': 'imap.mail.me.com', 'me.com': 'imap.mail.me.com', 'mac.com': 'imap.mail.me.com',
  'yahoo.com': 'imap.mail.yahoo.com', 'yahoo.de': 'imap.mail.yahoo.com', 'aol.com': 'imap.aol.com',
  'freenet.de': 'mx.freenet.de', 'posteo.de': 'posteo.de', 'mailbox.org': 'imap.mailbox.org', '1und1.de': 'imap.1und1.de', 'ionos.de': 'imap.ionos.de',
};
function guessHost(email) {
  const domain = String(email).split('@')[1] || '';
  return HOSTS[domain.toLowerCase()] || 'imap.strato.de';
}

let currentReq = null;
function accounts() {
  return sessionAccounts(currentReq).map((a, i) => ({ id: i, name: a.name || a.user, user: a.user, pass: a.pass, host: a.host, port: a.port || 993, secure: a.secure !== false }));
}

function account(id) {
  const list = accounts();
  if (!list.length) throw httpError(401, 'Bitte anmelden.');
  const acc = list[Number(id) || 0];
  if (!acc) throw httpError(400, 'Unbekanntes Postfach.');
  return acc;
}

async function withImap(accId, fn) {
  const acc = typeof accId === 'object' && accId ? accId : account(accId);
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
      currentReq = req;
      if (auth && !sessionAccounts(req).length) return send(res, 401, { error: 'Bitte anmelden.' });
      const url = new URL(req.url, 'http://x');
      const body = req.method === 'POST' ? await readBody(req) : {};
      const out = await fn({ req, res, query: Object.fromEntries(url.searchParams), body });
      if (!res.writableEnded) send(res, 200, out);
    } catch (e) {
      send(res, e.status || 500, { error: e.message || 'Unbekannter Fehler' });
    }
  };
}

module.exports = { handler, withImap, accounts, sessionAccounts, authCookie, guessHost, httpError, send };
