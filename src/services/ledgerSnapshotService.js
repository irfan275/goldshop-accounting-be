const { normalizeDate } = require("../helper/common.helper");
const { LedgerSnapshot, Ledger } = require("../model");


const getOpeningBefore = async (date) => {
  const snapshot = await LedgerSnapshot.findOne({
    date: { $lt: date },
  }).sort({ date: -1 });

  if (!snapshot) return {};

  const balances = {};

  snapshot.balances.forEach((value, key) => {
    balances[key] = value || 0;
  });

  return balances;
};
const rebuildSnapshotsFrom = async (startDate) => {

  let runningBalance = await getOpeningBefore(startDate);

  const entries = await Ledger.find({
    date: { $gte: startDate },
  }).sort({ date: 1 });

  // group by date
  const grouped = {};

  for (const entry of entries) {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  }

  const sortedDates = Object.keys(grouped).sort();

  for (const dateKey of sortedDates) {

    const dayEntries = grouped[dateKey];

    for (const ledger of dayEntries) {
      for (const e of ledger.entries) {

        let type = e.type;

        // normalize bar types
        if (type === 'gold_bar' || type === 'silver_bar') {
          type = `${type}_${e.subType}`;
        }

        const amount = Number(e.credit || 0) - Number(e.debit || 0);

        // =========================
        // 🔥 BANK HANDLING (IMPORTANT)
        // =========================
        if (type.startsWith("bank_")) {

          // total bank
          if (runningBalance.bank === undefined) {
            runningBalance.bank = 0;
          }
          runningBalance.bank += amount;

          // individual bank
          if (runningBalance[type] === undefined) {
            runningBalance[type] = 0;
          }
          runningBalance[type] += amount;

          continue;
        }

        // =========================
        // NORMAL TYPES
        // =========================
        if (runningBalance[type] === undefined) {
          runningBalance[type] = 0;
        }

        runningBalance[type] += amount;
      }
    }

    // =========================
    // SAVE SNAPSHOT
    // =========================
    await LedgerSnapshot.findOneAndUpdate(
      { date: dateKey },
      {
        date: dateKey,
        balances: { ...runningBalance }
      },
      { upsert: true, new: true }
    );
  }
};

module.exports = {
    rebuildSnapshotsFrom,
    getOpeningBefore
}