const { handler, withImap, httpError } = require('./_lib');

// Neuen Ordner anlegen, optional als Unterordner von "parent"
module.exports = handler(async ({ body }) => {
  const name = String(body.name || '').trim();
  const parent = body.parent ? String(body.parent) : '';
  if (!name) throw httpError(400, 'Bitte einen Ordnernamen eingeben.');
  if (name.length > 100) throw httpError(400, 'Der Name ist zu lang.');
  return withImap(body.account, async (client) => {
    const list = await client.list();
    let delimiter = (list.find(f => f.delimiter) || {}).delimiter || '/';
    if (parent) {
      const p = list.find(f => f.path === parent);
      if (!p) throw httpError(400, 'Der übergeordnete Ordner wurde nicht gefunden.');
      delimiter = p.delimiter || delimiter;
    }
    if (name.includes(delimiter)) throw httpError(400, `Der Name darf kein „${delimiter}“ enthalten.`);
    const path = parent ? parent + delimiter + name : name;
    if (list.some(f => f.path.toLowerCase() === path.toLowerCase())) throw httpError(409, 'Diesen Ordner gibt es schon.');
    const res = await client.mailboxCreate(path);
    try { await client.mailboxSubscribe(res.path); } catch (_) {}
    return { ok: true, path: res.path };
  });
}, { methods: ['POST'] });
