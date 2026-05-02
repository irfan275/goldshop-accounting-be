const express = require('express');
const router = express.Router();
const {register_customer} = require('../validators/customer.validator');
const {validate} = require('../validators/validate');

const { authenticateToken } = require("../validators/middleware");
const { createLedger, getLedgerById, updateLedger, deleteLedger, getAllCustomerByFilter, getAllLedger, getInvoiceNumberForLedger, getBalance, createPurchaseLedgerFromId } = require('../controller/purchase_ledger.controller');


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

router.post('/createPurchaseLedger', authenticateToken,createPurchaseLedgerFromId);

module.exports = router;