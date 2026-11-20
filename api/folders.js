const { handler, withImap } = require('./_lib');

const SPECIAL = { '\\Inbox': 'Posteingang', '\\Sent': 'Gesendet', '\\Drafts': 'Entwürfe', '\\Trash': 'Papierkorb', '\\Junk': 'Spam', '\\Archive': 'Archiv' };

// Alle Ordner und Unterordner eines Postfachs
module.exports = handler(async ({ query }) => withImap(query.account, async (client) => {
  const list = await client.list();
  const folders = list
    .filter(f => !(f.flags && f.flags.has('\\Noselect')) && !(f.flags && f.flags.has('\\NonExistent')))
    .map(f => {
      const parts = f.path.split(f.delimiter || '/');
      if (parts[0].toUpperCase() === 'INBOX' && parts.length > 1 && f.specialUse !== '\\Inbox') {
        // Unterordner des Posteingangs (z. B. INBOX/Kunden) lesbar anzeigen
        parts[0] = 'Posteingang';
      }
      const label = f.specialUse && SPECIAL[f.specialUse] && parts.length === 1 ? SPECIAL[f.specialUse] : null;
      return {
        path: f.path,
        name: label || f.name,
        parents: label ? [] : parts.slice(0, -1),
        delimiter: f.delimiter || '/',
        special: f.specialUse || null,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path, 'de', { sensitivity: 'base' }));
  return { folders };
}));
