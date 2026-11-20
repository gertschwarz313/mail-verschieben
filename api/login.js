const { handler, makeToken, passwordMatches, sessionCookie, send, MAX_AGE, httpError } = require('./_lib');

module.exports = handler(async ({ res, body }) => {
  if (body.logout) return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  // kleine Bremse gegen Durchprobieren
  await new Promise(r => setTimeout(r, 400));
  if (!passwordMatches(body.password)) throw httpError(401, 'Falsches Passwort.');
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(makeToken(), MAX_AGE) });
}, { auth: false, methods: ['POST'] });
