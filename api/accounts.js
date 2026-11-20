const { handler, accounts } = require('./_lib');

module.exports = handler(async () => ({
  accounts: accounts().map(a => ({ id: a.id, name: a.name })),
}));
