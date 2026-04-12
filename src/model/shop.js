const mongoose = require('mongoose');
const { StatusEnum } = require("../constants/user.constant");
const { addUpdatedByPreSave, addCreatedByPreSave } = require("../helper/db.helper");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

// Custom function to validate coordinates
function validateCoordinates(value) {
    // Check if location is present and not null
    if (this.location && value) {
        // Validate coordinates format
        return Array.isArray(value) && value.length === 2;
    }
    // Bypass validation if location is missing or null
    return true;
}

const ShopSchema = new Schema({
    name: { 
        type: String, 
        default: '',
        trim: true,
        required: true
    },
    shortName: {
        type: String,
        unique:true
    },
    ownerName: {
        type: String
    },
    address: {
        type: String
    },
    address_ar: {
        type: String
    },
    phone: {
        type: Number
    },
    status: {
        type: String,
        enum: StatusEnum,
        default: 'ACTIVE'
    },
    createdBy: {
        type: ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: ObjectId,
        ref: 'User'
    }
}, { collection: 'Shop', timestamps: true });

const Garage = mongoose.model('Shop', ShopSchema);
module.exports = Garage;
