const { normalizeDate } = require("../helper/common.helper");
const { LedgerSnapshot, Ledger } = require("../model");


const getOpeningBefore = async (date) =>{
  const snapshot = await LedgerSnapshot.findOne({
    date: { $lt: date },
  }).sort({ date: -1 });

  if (snapshot) return { ...snapshot.balances };

  // default if no snapshot
  return {
    cash: 0,
    gold_raw: 0,
    gold_bar: 0,
    silver_raw: 0,
    silver_bar: 0,
    bank: 0
  };
}
const rebuildSnapshotsFrom = async (startDate) => {

  const start = startDate; // already "YYYY-MM-DD"

  // 1. Opening balance
  let runningBalance = await getOpeningBefore(start);

  // 2. Fetch entries
  const entries = await Ledger.find({
    date: { $gte: start },
  }).sort({ date: 1 });

  // 3. Group by string date
  const grouped = {};

  entries.forEach((entry) => {
    const d = entry.date; // already string

    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(entry);
  });

  // 4. Sort dates correctly
  const sortedDates = Object.keys(grouped).sort(); // works for YYYY-MM-DD

  for (const dateKey of sortedDates) {

    const dayEntries = grouped[dateKey];

    dayEntries.forEach((entry) => {
      entry.entries.forEach((e) => {
        runningBalance[e.type] += (e.credit || 0) - (e.debit || 0);
      });
    });

    // 5. Save snapshot (STRING DATE — FIXED)
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