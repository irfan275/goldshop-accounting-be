const mongoose = require("mongoose");

const ledgerSnapshotSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true }, // normalized date (00:00)
  //customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },

  balances: {
    cash: { type: Number, default: 0 },
    gold_raw: { type: Number, default: 0 },
    gold_bar: { type: Number, default: 0 },
    silver_raw: { type: Number, default: 0 },
    silver_bar: { type: Number, default: 0 },
    bank: { type: Number, default: 0 }
  }
}, { timestamps: true, collection: 'LedgerSnapshot' });

module.exports = mongoose.model("LedgerSnapshot", ledgerSnapshotSchema);