const mongoose = require('mongoose');
const { StatusEnum } = require("../constants/user.constant");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const EntrySchema = new Schema({
  type: String,
  subType: String,
  unit: String,
  credit: Number,
  debit: Number
});

const LedgerSchema = new Schema({
    date: {type:Date},
    name: {type:String},
    description: {type:String},
    entries: [EntrySchema],
    status: {
        type: String,
        enum: Object.keys(StatusEnum),
        default: 'ACTIVE', // Optional: Set a default value
    },
    createdBy : {
        type : ObjectId,
        ref : 'User'
    },
    updatedBy : {
        type : ObjectId,
        ref : 'User'
    },
}, { collection: 'Ledger',timestamps: true });

const Ledger = mongoose.model("Ledger", LedgerSchema);
module.exports = Ledger;