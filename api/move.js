const { handler, withImap, httpError } = require('./_lib');

// Mail verschieben. Antwort enthält die neue UID im Zielordner (für "Rückgängig").
module.exports = handler(async ({ body }) => {
  const uid = Number(body.uid);
  const from = body.from || 'INBOX';
  const to = body.to;
  if (!uid || !to) throw httpError(400, 'Mail oder Zielordner fehlt.');
  if (to === from) throw httpError(400, 'Die Mail liegt schon in diesem Ordner.');
  return withImap(body.account, async (client) => {
    const lock = await client.getMailboxLock(from);
    try {
      const found = await client.search({ uid: String(uid) }, { uid: true });
      if (!found || !found.includes(uid)) throw httpError(404, 'Die Mail wurde nicht gefunden. Vielleicht wurde sie schon verschoben?');
      const result = await client.messageMove(String(uid), to, { uid: true });
      if (!result) throw httpError(404, 'Die Mail wurde nicht gefunden. Vielleicht wurde sie schon verschoben?');
      const newUid = result.uidMap ? result.uidMap.get(uid) : null;
      return { ok: true, to, newUid: newUid || null };
    } finally {
      lock.release();
    }
  });
}, { methods: ['POST'] });
