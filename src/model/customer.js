const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {  StatusEnum } = require("../constants/user.constant");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const CustomerSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: Number,
         required: true,
        
    },
    type: {
        type: String,
    },
    description: {
        type: String,
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
        ref : 'User',
        //required : true
    },
  },{ collection: 'Customer',timestamps: true });


const Customer = mongoose.model('Customer', CustomerSchema);
module.exports = Customer;

