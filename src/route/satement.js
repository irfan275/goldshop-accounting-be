const express = require('express');
const router = express.Router();
const {register_customer} = require('../validators/customer.validator');
const {validate} = require('../validators/validate');

const { authenticateToken } = require("../validators/middleware");
const { getStatement } = require('../controller/statment.controller');




router.get('/', authenticateToken,getStatement);


module.exports = router;