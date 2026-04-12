const { Balance } = require("../model");


const GRAMS_PER_TTB = 116.64;

const updateBalances = async (entries) => {
  for (const item of entries) {
    if (item.type === "gold_bar") {
      const changeCount = (item.credit || 0) - (item.debit || 0);
      const changeGrams = changeCount * GRAMS_PER_TTB;

      await Balance.updateOne(
        { _id: "gold_bar_1tt" },
        {
          $inc: { count: changeCount },
          $setOnInsert: { gramsPerUnit: GRAMS_PER_TTB }
        },
        { upsert: true }
      );

      await Balance.updateOne(
        { _id: "gold_raw" },
        { $inc: { grams: changeGrams } },
        { upsert: true }
      );
    }

    else if (item.type === "gold_raw") {
      const change = (item.credit || 0) - (item.debit || 0);

      await Balance.updateOne(
        { _id: "gold_raw" },
        { $inc: { grams: change } },
        { upsert: true }
      );
    }

    else {
      const change = (item.credit || 0) - (item.debit || 0);

      await Balance.updateOne(
        { _id: item.type },
        { $inc: { balance: change } },
        { upsert: true }
      );
    }
  }
};

module.exports = {
    updateBalances
}