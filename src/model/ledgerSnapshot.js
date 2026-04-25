const mongoose = require("mongoose");

const ledgerSnapshotSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },

  balances: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'LedgerSnapshot'
});

module.exports = mongoose.model("LedgerSnapshot", ledgerSnapshotSchema);