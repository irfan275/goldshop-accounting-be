
const { Balance, LedgerHistory, Ledger } = require('../model');

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
const getLedgerStatement = async (req) => {
  try {
    const { fromDate, toDate } = req.query;

    let start = fromDate ? new Date(fromDate) : new Date();
    let end = toDate ? new Date(toDate) : new Date();

    // defaults
    if (!fromDate) {
      start.setDate(end.getDate() - 6);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // 1. Fetch ledgers
    const ledgers = await Ledger.find({
      date: { $gte: start, $lte: end }
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // 2. Fetch history
    const history = await LedgerHistory.find({
      createdAt: { $gte: start, $lte: end }
    })
      .sort({ createdAt: 1 })
      .lean();

    // 3. Last history per date
    const lastHistoryPerDate = {};
    history.forEach(h => {
      const key = formatDate(h.createdAt);
      lastHistoryPerDate[key] = h;
    });

    const rows = [];
    let currentDate = null;

    let totals = resetTotals();

    for (let i = 0; i < ledgers.length; i++) {
      const ledger = ledgers[i];
      const dateKey = formatDate(ledger.date);

      // reset when date changes
      if (currentDate !== dateKey) {
        currentDate = dateKey;
        totals = resetTotals();
      }
    let entriesTotals = resetTotals();
      // entries
    for (const entry of ledger.entries) {
      updateTotals(entriesTotals, entry);
      updateTotals(totals, entry);
    }

      //let entry = ledger.entries
        rows.push({
          isTotal: false,
          date: dateKey,
          customer: ledger.name,
          description: ledger.description,

          // cash: buildCell(entry, 'cash'),
          // gold: buildCell(entry, 'gold_raw'),
          // bank: buildCell(entry, 'bank'),
          // ttb: buildCell(entry, 'gold_bar_1tt')
           cash: entriesTotals.cash,
          gold: entriesTotals.gold,
          bank: entriesTotals.bank,
          ttb: entriesTotals.ttb
        });
     // }

      // check last row of date
      const next = ledgers[i + 1];
      const nextDate = next ? formatDate(next.date) : null;

      if (dateKey !== nextDate) {
        const closing = extractClosing(lastHistoryPerDate[dateKey]);

        rows.push({
          isTotal: true,
          date: dateKey,
          customer: '',
          description: 'TOTAL',

          cash: { ...totals.cash, closing: closing.cash },
          gold: { ...totals.gold, closing: closing.gold },
          bank: { ...totals.bank, closing: closing.bank },
          ttb: { ...totals.ttb, closing: closing.ttb }
        });
      }
    }

    return rows;

  } catch (e) {
    console.log(e);
    //return res.status(500).json({ message: 'Server Error' });
  }
};
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function resetTotals() {
  return {
    cash: { credit: 0, debit: 0 },
    gold: { credit: 0, debit: 0 },
    bank: { credit: 0, debit: 0 },
    ttb: { credit: 0, debit: 0 }
  };
}

function updateTotals(totals, entry) {
  const map = {
    cash: 'cash',
    gold_raw: 'gold',
    bank: 'bank',
    gold_bar_1tt: 'ttb'
  };
  if(entry.type === 'gold_bar')
    entry.type= `${entry.type+"_"+entry.subType}`;
  const key = map[entry.type];
  if (!key) return;

  totals[key].credit += entry.credit || 0;
  totals[key].debit += entry.debit || 0;
}

function buildCell(entry, type) {
  if (entry.type !== type) return { credit: 0, debit: 0 };

  return {
    credit: entry.credit || 0,
    debit: entry.debit || 0
  };
}

function extractClosing(history) {
  if (!history) {
    return { cash: 0, gold: 0, bank: 0, ttb: 0 };
  }

  const get = (type) =>
    history.balanceChanges?.find(b => b.balanceId === type)?.new?.balance || 0;

  return {
    cash: get('cash'),
    gold: get('gold_raw'),
    bank: get('bank'),
    ttb: get('gold_bar_1tt')
  };
}
module.exports = {
  createLedgerHistory,
  getLedgerStatement
};