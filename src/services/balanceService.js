const { Balance } = require("../model");


const GRAMS_PER_TTB = 116.64;
const GRAMS_PER_KG = 1000;

const updateBalances = async (entries,session) => {
  for (const item of entries) {
    if (item.type === "gold_bar") {
      const changeCount = (item.credit || 0) - (item.debit || 0);
      const changeGrams = changeCount * GRAMS_PER_TTB;

      await Balance.updateOne(
        { _id: "gold_bar_1tt" },
        {
          $inc: { count: changeCount.toFixed(3) },
          $setOnInsert: { gramsPerUnit: GRAMS_PER_TTB }
        },
        { upsert: true },
        { session }
      );

      await Balance.updateOne(
        { _id: "gold_raw" },
        { $inc: { grams: changeGrams } },
        { upsert: true },
        { session }
      );
    }
    else if (item.type === "silver_bar") {
      const changeCount = (item.credit || 0) - (item.debit || 0);
      const changeGrams = changeCount * GRAMS_PER_KG;

      await Balance.updateOne(
        { _id: "silver_bar_kg" },
        {
          $inc: { count: changeCount.toFixed(3) },
          $setOnInsert: { gramsPerUnit: GRAMS_PER_KG }
        },
        { upsert: true },
        { session }
      );

      await Balance.updateOne(
        { _id: "silver_raw" },
        { $inc: { grams: changeGrams } },
        { upsert: true },
        { session }
      );
    }
    else if (item.type === "gold_raw" || item.type === 'silver_raw') {
      const change = (item.credit || 0) - (item.debit || 0);

      await Balance.updateOne(
        { _id: item.type },
        { $inc: { grams: change.toFixed(3) } },
        { upsert: true },
        { session }
      );
    }

    else {
      const change = (item.credit || 0) - (item.debit || 0);

      await Balance.updateOne(
        { _id: item.type },
        { $inc: { balance: change } },
        { upsert: true },
        { session }
      );
    }
  }
};

module.exports = {
    updateBalances
}