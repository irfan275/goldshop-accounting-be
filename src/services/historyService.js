
const { default: mongoose } = require('mongoose');
const { StatusEnum } = require('../constants/user.constant');
const { Balance, LedgerHistory, Ledger, LedgerSnapshot } = require('../model');

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
    let { fromDate, toDate , invoiceNumber,customer} = req.query;

    // ✅ default last 7 days
    if (!toDate) {
      toDate = new Date().toLocaleDateString("en-CA");
    }

    if (!fromDate) {
      const d = new Date(toDate);
      d.setDate(d.getDate() - 6);
      fromDate = d.toLocaleDateString("en-CA");
    }
    let query = {
      status: { $ne: StatusEnum.DELETED }
    };
    if(req.user.role === 'EMPLOYEE')
      {
        query.shop= new mongoose.Types.ObjectId(String(req.user.shop));
      }
      // ✅ DATE FILTER (always applied)
      query.date = { $gte: fromDate, $lte: toDate };

      // ✅ INVOICE NUMBER (optional)
      if (invoiceNumber) {
        query.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
      }

      // ✅ CUSTOMER (optional - partial match)
      if (customer) {
        query.name = { $regex: customer, $options: "i" };
      }
    // 1. Fetch ledgers
    const ledgers = await Ledger.find(query)
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // 2. Fetch snapshots (for closing)
    const snapshots = await LedgerSnapshot.find({
      date: { $gte: fromDate, $lte: toDate }
    }).lean();

    const snapshotMap = {};
    snapshots.forEach(s => {
      snapshotMap[s.date] = s.balances;
    });

    const rows = [];
    let currentDate = null;
    let totals = resetTotals();

    for (let i = 0; i < ledgers.length; i++) {

      const ledger = ledgers[i];
      const dateKey = ledger.date;

      // 🔥 new date
      if (currentDate !== dateKey) {
        currentDate = dateKey;
        totals = resetTotals();
      }

      // 🔥 per-entry totals
      let entryTotals = resetTotals();

      for (const entry of ledger.entries) {
        updateTotals(entryTotals, entry);
        updateTotals(totals, entry);
      }

      // 🔥 push entry row
      rows.push({
        isTotal: false,
        date: dateKey,
        id : ledger._id,
        invoiceNumber : ledger.invoiceNumber,
        customer: ledger.name,
        description: ledger.description,

        cash: entryTotals.cash,
        gold: entryTotals.gold,
        silver: entryTotals.silver,
        bank: entryTotals.bank,
        ttb: entryTotals.ttb,
        silver_bar: entryTotals.silver_bar
      });

      // 🔥 check end of date
      const next = ledgers[i + 1];
      const nextDate = next ? next.date : null;

      if (dateKey !== nextDate) {

        const closing = snapshotMap[dateKey] || resetBalance();

        rows.push({
          isTotal: true,
          date: dateKey,
          customer: '',
          description: 'TOTAL',

          cash: { ...totals.cash, closing: closing.cash },
          gold: { ...totals.gold, closing: closing.gold_raw },
          bank: { ...totals.bank, closing: closing.bank },
          ttb: { ...totals.ttb, closing: closing.gold_bar },
          silver: { ...totals.silver, closing: closing.silver_raw },
          kgb: { ...totals.silver_bar, closing: closing.silver_bar },
        });
      }
    }

    return rows;

  } catch (e) {
    console.log(e);
  }
};
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function resetTotals() {
  return {
    cash: { credit: 0, debit: 0 },
    gold: { credit: 0, debit: 0 },
    silver: { credit: 0, debit: 0 },
    bank: { credit: 0, debit: 0 },
    ttb: { credit: 0, debit: 0 },
    silver_bar: { credit: 0, debit: 0 },
  };
}
function resetBalance() {
  return {
    cash: 0,
    gold_raw: 0,
    gold_bar: 0,
    silver_raw: 0,
    silver_bar: 0,
    bank: 0
  };
}
function updateTotals(totals, entry) {
  const map = {
    cash: 'cash',
    gold_raw: 'gold',
    silver_raw: 'silver',
    bank: 'bank',
    gold_bar_1tt: 'ttb',
    silver_bar_kg: 'silver_bar'
  };
  if(entry.type === 'gold_bar' || entry.type === 'silver_bar')
    entry.type= `${entry.type+"_"+entry.subType}`;
  
  const key = map[entry.type];
  if (!key) return;

  totals[key].credit += entry.credit || 0;
  totals[key].debit += entry.debit || 0;
}
// function updateTotals(totals, entry) {
//   if (!totals[entry.type]) return;

//   totals[entry.type].credit += entry.credit || 0;
//   totals[entry.type].debit += entry.debit || 0;
// }

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