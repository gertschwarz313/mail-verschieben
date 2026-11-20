const { handler, withImap } = require('./_lib');

// Neueste Mails eines Ordners (Standard: Posteingang), optional mit Suche
module.exports = handler(async ({ query }) => {
  const mailbox = query.mailbox || 'INBOX';
  const limit = Math.min(Number(query.limit) || 30, 60);
  const q = (query.q || '').trim();
  return withImap(query.account, async (client) => {
    const lock = await client.getMailboxLock(mailbox, { readOnly: true });
    try {
      let uids;
      if (q) {
        uids = await client.search({ or: [{ subject: q }, { from: q }] }, { uid: true });
      } else {
        const total = client.mailbox.exists;
        if (!total) return { mailbox, messages: [] };
        const from = Math.max(1, total - limit + 1);
        uids = null;
        const msgs = [];
        for await (const m of client.fetch(`${from}:*`, { uid: true, envelope: true, flags: true, internalDate: true })) msgs.push(m);
        return { mailbox, messages: shape(msgs, limit) };
      }
      if (!uids || !uids.length) return { mailbox, messages: [] };
      uids = uids.sort((a, b) => a - b).slice(-limit);
      const msgs = [];
      for await (const m of client.fetch(uids.join(','), { uid: true, envelope: true, flags: true, internalDate: true }, { uid: true })) msgs.push(m);
      return { mailbox, messages: shape(msgs, limit) };
    } finally {
      lock.release();
    }
  });
});

function shape(msgs, limit) {
  return msgs
    .map(m => {
      const f = (m.envelope && m.envelope.from && m.envelope.from[0]) || {};
      const date = m.envelope && m.envelope.date ? m.envelope.date : m.internalDate;
      return {
        uid: m.uid,
        subject: (m.envelope && m.envelope.subject) || '(kein Betreff)',
        from: f.name || f.address || 'Unbekannt',
        fromAddress: f.address || '',
        date: date ? new Date(date).toISOString() : null,
        seen: m.flags ? m.flags.has('\\Seen') : true,
      };
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.uid - a.uid)
    .slice(0, limit);
}
