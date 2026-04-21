const mongoose = require('mongoose');
const { StatusEnum } = require("../constants/user.constant");
const { getNextSequenceValue } = require('../helper/common.helper');
const { Shop } = require('.');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const EntrySchema = new Schema({
  type: String,
  subType: String,
  unit: String,
  credit: Number,
  debit: Number,
    rate: {type : Number},
    value: {type : Number}
});

const LedgerSchema = new Schema({
    invoiceNumber: {
        type: String,
        unique: true,
    },
    date: {type:String},
    name: {type:String},
    description: {type:String},
    entries: [EntrySchema],
    isOfficial: {
    type: Boolean,
    default: true
    },
    shop : {
        type : ObjectId,
        ref : 'Shop'
    },
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
LedgerSchema.pre("save", async function (next) {
  try {

    if (!this.isNew) {
      return next();
    }

    const shop = await Shop.findById(this.shop);

    if (!shop) {
      return next(new Error("Shop not found"));
    }
    let seqName = `LEG-${shop.shortName}`;
    const sequence = await getNextSequenceValue(seqName);

    this.invoiceNumber = seqName+"-"+sequence;

    next();

  } catch (error) {
    next(error);
  }
});
const Ledger = mongoose.model("Ledger", LedgerSchema);
module.exports = Ledger;