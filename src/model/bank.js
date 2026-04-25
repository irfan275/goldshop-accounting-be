
const mongoose = require('mongoose');
const {  StatusEnum } = require("../constants/user.constant");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const BankSchema = new Schema({
    name: { type:String},
    code: { type:String},
  },{ collection: 'Bank',timestamps: true });

const Bank = mongoose.model("Bank", BankSchema);
module.exports = Bank;

