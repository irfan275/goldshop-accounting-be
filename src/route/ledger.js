const express = require('express');
const router = express.Router();
const {register_customer} = require('../validators/customer.validator');
const {validate} = require('../validators/validate');

const { authenticateToken } = require("../validators/middleware");
const { createLedger, getLedgerById, updateLedger, deleteLedger, getAllCustomerByFilter } = require('../controller/ledger.controller');


// Create a new Customer
router.post('/', authenticateToken,createLedger);

// Get all Customer
router.get('/', authenticateToken,getAllCustomerByFilter);

// Get a Customer by ID
router.get('/:id', authenticateToken,getLedgerById);

// Update a Customer by ID
router.put('/:id', authenticateToken,updateLedger);

// Delete a Customer by ID
router.delete('/:id',authenticateToken,  deleteLedger);

module.exports = router;