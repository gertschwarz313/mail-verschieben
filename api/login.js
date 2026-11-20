const { handler, withImap, sessionAccounts, authCookie, guessHost, send, httpError } = require('./_lib');

// Postfach anmelden (wird nach erfolgreichem Test verschlüsselt im Cookie gespeichert),
// weiteres Postfach hinzufügen, oder abmelden.
module.exports = handler(async ({ req, res, body }) => {
  const existing = sessionAccounts(req);
  if (body.logout) return send(res, 200, { ok: true }, { 'Set-Cookie': authCookie([]) });
  const user = String(body.user || '').trim();
  const pass = String(body.pass || '');
  if (!user || !pass) throw httpError(400, 'Bitte Mailadresse und Passwort eingeben.');
  let [host, port] = String(body.host || '').trim().split(':');
  const acc = {
    user, pass,
    host: host || guessHost(user),
    port: Number(port) || Number(body.port) || 993,
    name: user,
    secure: process.env.ALLOW_INSECURE_IMAP !== '1',
  };
  await withImap(acc, async () => {}); // Zugang testen
  const list = existing.filter(a => a.user.toLowerCase() !== user.toLowerCase()).concat(acc).slice(0, 6);
  send(res, 200, { ok: true, account: list.length - 1 }, { 'Set-Cookie': authCookie(list) });
}, { auth: false, methods: ['POST'] });
