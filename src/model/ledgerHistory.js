const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LedgerHistorySchema = new Schema({
  ledgerId: {
    type: Schema.Types.ObjectId,
    ref: 'Ledger',
    required: true
  },
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE'],
    required: true
  },

  balanceChanges: [
    {
      balanceId: String,

      previous: {
        balance: Number,
        grams: Number,
        count: Number
      },

      new: {
        balance: Number,
        grams: Number,
        count: Number
      }
    }
  ],

  entriesSnapshot: { type: Array },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true, collection: 'LedgerHistory' });

module.exports = mongoose.model('LedgerHistory', LedgerHistorySchema);