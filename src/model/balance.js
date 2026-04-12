
const mongoose = require('mongoose');
const {  StatusEnum } = require("../constants/user.constant");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const BalanceSchema = new Schema({
    balance: { type:Number},
    grams: { type:Number},
    count: { type:Number},
    gramsPerUnit: { type:Number}
  },{ collection: 'Balance',timestamps: true });

const Balance = mongoose.model("Balance", BalanceSchema);
module.exports = Balance;

