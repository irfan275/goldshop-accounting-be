
const { default: mongoose } = require('mongoose');
const { StatusEnum } = require('../constants/user.constant');
const { Balance, LedgerHistory, Ledger, LedgerSnapshot, Bank, PurchaseLedger } = require('../model');
const { getAllBanks } = require('../controller/bank.controller');

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
const getAllBanksCodeList = async ()=>{
  const bankList = await Bank.find({status : {$ne : StatusEnum.DELETED}});;
  const allBanks = bankList.map(b => b.code);
  return allBanks;
}
const getLedgerStatement = async (req) => {
  try {
    let { fromDate, toDate, invoiceNumber, customer } = req.query;

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

    if (req.user.role === 'EMPLOYEE') {
      query.shop = new mongoose.Types.ObjectId(String(req.user.shop));
    }

    query.date = { $gte: fromDate, $lte: toDate };

    if (invoiceNumber) {
      query.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
    }

    if (customer) {
      query.name = { $regex: customer, $options: "i" };
    }

    const ledgers = await Ledger.find(query)
      .sort({ date: 1, createdAt: 1 })
      .lean();

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

      // new date reset
      if (currentDate !== dateKey) {
        currentDate = dateKey;
        totals = resetTotals();
      }

      let entryTotals = resetTotals();

      for (const entry of ledger.entries) {
        updateTotals(entryTotals, entry);
        updateTotals(totals, entry);
      }
      const bankList = await Bank.find({status : {$ne : StatusEnum.DELETED}});;
      const allBanks = bankList.map(b => b.code);
      // ======================
      // NORMAL ROW
      // ======================
      rows.push({
        isTotal: false,
        date: dateKey,
        id: ledger._id,
        invoiceNumber: ledger.invoiceNumber,
        customer: ledger.name,
        description: ledger.description,
        isOfficial: ledger.isOfficial,
        isBooking: ledger.isBooking,


        cash: entryTotals.cash,
        gold: entryTotals.gold,
        silver: entryTotals.silver,
        ttb: entryTotals.ttb,
        silver_bar: entryTotals.silver_bar,

        bank: entryTotals.bank,

        // flat dynamic banks
        ...Object.fromEntries(
          Object.entries(entryTotals)
            .filter(([k]) => k.startsWith("bank_"))
        )
      });

      // ======================
      // TOTAL ROW
      // ======================
      const next = ledgers[i + 1];
      const nextDate = next ? next.date : null;

      if (dateKey !== nextDate) {
        const closing = snapshotMap[dateKey] || resetTotals();

        rows.push({
          isTotal: true,
          date: dateKey,
          customer: '',
          description: 'TOTAL',

          cash: { ...totals.cash, closing: closing.cash },
          gold: { ...totals.gold, closing: closing.gold_raw },
          bank: { ...totals.bank, closing: closing.bank },
          ttb: { ...totals.ttb, closing: closing.gold_bar_1tt },
          silver: { ...totals.silver, closing: closing.silver_raw },
          silver_bar: { ...totals.silver_bar, closing: closing.silver_bar_kg },

          ...Object.fromEntries(
              allBanks.map(k => [
                k,
                {
                  credit: totals[k]?.credit || 0,
                  debit: totals[k]?.debit || 0,
                  closing: closing[k] || 0
                }
              ])
            )
        });
      }
    }

    return rows;

  } catch (e) {
    console.log(e);
  }
};
const getPurchaseLedgerStatement = async (req) => {
  try {
    let { fromDate, toDate, invoiceNumber, customer } = req.query;

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

    if (req.user.role === 'EMPLOYEE') {
      query.shop = new mongoose.Types.ObjectId(String(req.user.shop));
    }

    query.date = { $gte: fromDate, $lte: toDate };

    if (invoiceNumber) {
      query.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
    }

    if (customer) {
      query.name = { $regex: customer, $options: "i" };
    }

    const ledgers = await PurchaseLedger.find(query)
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const rows = [];
    let totals = resetTotals();
    const allBanks = await getAllBanksCodeList();
    for (let i = 0; i < ledgers.length; i++) {
      const ledger = ledgers[i];
      const dateKey = ledger.date;


      let entryTotals = resetTotals();

      for (const entry of ledger.entries) {
        updateTotals(entryTotals, entry);
        updateTotals(totals, entry);
      }
      // ======================
      // NORMAL ROW
      // ======================
      rows.push({
        isTotal: false,
        date: dateKey,
        id: ledger._id,
        invoiceNumber: ledger.invoiceNumber,
        customer: ledger.name,
        description: ledger.description,

        cash: entryTotals.cash,
        gold: entryTotals.gold,
        silver: entryTotals.silver,
        ttb: entryTotals.ttb,
        silver_bar: entryTotals.silver_bar,
        bank: entryTotals.bank,

        // flat dynamic banks
        ...Object.fromEntries(
          Object.entries(entryTotals)
            .filter(([k]) => k.startsWith("bank_"))
        )
      });

    }
    if(ledgers.length > 0){
      rows.push({
                    isTotal: true,
                    date: '',
                    customer: '',
                    description: 'TOTAL',

                    cash: { ...totals.cash },
                    gold: { ...totals.gold },
                    bank: { ...totals.bank },
                    ttb: { ...totals.ttb},
                    silver: { ...totals.silver },
                    silver_bar: { ...totals.silver_bar },

                    ...Object.fromEntries(
                        allBanks.map(k => [
                          k,
                          {
                            credit: totals[k]?.credit || 0,
                            debit: totals[k]?.debit || 0
                          }
                        ])
                      )
                  });
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
  let type = entry.type;

  // normalize type (avoid mutation)
  if (type === 'gold_bar' || type === 'silver_bar') {
    type = `${type}_${entry.subType}`;
  }

  const map = {
    cash: 'cash',
    gold_raw: 'gold',
    silver_raw: 'silver',
    gold_bar_1tt: 'ttb',
    silver_bar_kg: 'silver_bar'
  };

  const credit = Number(entry.credit || 0);
  const debit = Number(entry.debit || 0);

  // ✅ BANK HANDLING (flat structure)
  if (type.startsWith('bank_')) {
    // 1. individual bank (flat key)
    if (!totals[type]) {
      totals[type] = { credit: 0, debit: 0 };
    }

    totals[type].credit += credit;
    totals[type].debit += debit;

    // 2. overall bank total
    if (!totals.bank) {
      totals.bank = { credit: 0, debit: 0 };
    }

    totals.bank.credit += credit;
    totals.bank.debit += debit;

    return;
  }

  // ✅ other categories
  const key = map[type];
  if (!key) return;

  if (!totals[key]) {
    totals[key] = { credit: 0, debit: 0 };
  }

  totals[key].credit += credit;
  totals[key].debit += debit;
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
  getLedgerStatement,
  getPurchaseLedgerStatement,
  getAllBanksCodeList,
  updateTotals
};