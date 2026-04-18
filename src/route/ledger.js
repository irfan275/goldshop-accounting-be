const express = require('express');
const router = express.Router();
const {register_customer} = require('../validators/customer.validator');
const {validate} = require('../validators/validate');

const { authenticateToken } = require("../validators/middleware");
const { createLedger, getLedgerById, updateLedger, deleteLedger, getAllCustomerByFilter, getAllLedger, getInvoiceNumberForLedger, getBalance } = require('../controller/ledger.controller');


// Create a new Customer
router.post('/', authenticateToken,createLedger);

router.get("/sequence/:id",authenticateToken, getInvoiceNumberForLedger);
// Get all Customer
router.get('/', authenticateToken,getAllLedger);

// Get a Customer by ID
router.get('/:id', authenticateToken,getLedgerById);

// Update a Customer by ID
router.put('/:id', authenticateToken,updateLedger);

// Delete a Customer by ID
router.delete('/:id',authenticateToken,  deleteLedger);

router.get('/balance/all', authenticateToken,getBalance);


module.exports = router;