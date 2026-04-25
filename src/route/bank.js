const express = require("express");
const router = express.Router();


const { authenticateToken } = require("../validators/middleware");
const { createBank, getAllBanks, getBankById } = require("../controller/bank.controller");

router.post("/", authenticateToken,createBank);
router.get("/", authenticateToken,getAllBanks);
router.get("/:id",authenticateToken, getBankById);

module.exports = router;