
const { Balance, LedgerHistory } = require('../model');

async function createLedgerHistory({ ledger, entries, userId, beforeBalances,action,session }) {

  const balanceIds = entries.map(e => e.type);

  // BEFORE MAP
  const beforeMap = {};
  beforeBalances.forEach(b => {
    beforeMap[b._id] = b;
  });

  // AFTER MAP
  const afterBalances = await Balance.find({
    _id: { $in: balanceIds }
  }).lean();

  const afterMap = {};
  afterBalances.forEach(b => {
    afterMap[b._id] = b;
  });

  const balanceChanges = [];

  for (const entry of entries) {
    const before = beforeMap[entry.type];
    const after = afterMap[entry.type];

    if (!before || !after) continue;

    balanceChanges.push({
      balanceId: entry.type,
      previous: {
        balance: before.balance || 0,
        grams: before.grams || 0,
        count: before.count || 0
      },
      new: {
        balance: after.balance || 0,
        grams: after.grams || 0,
        count: after.count || 0
      }
    });
  }

    await LedgerHistory.create([{
        ledgerId: ledger._id,
        action: 'CREATE',
        balanceChanges,
        entriesSnapshot: entries,
        createdBy: userId
        }], { session });
}

module.exports = {
  createLedgerHistory
};