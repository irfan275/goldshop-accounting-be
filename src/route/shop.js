const express = require("express");
const router = express.Router();
const {createShop,deleteShop,getAllShops,getShopById,updateShop, getInvoiceNumber, getInvoiceNumberForPurchase, getInvoiceNumberForReceipt} = require("../controller/shop.controller");


const { authenticateToken } = require("../validators/middleware");

router.post("/", authenticateToken,createShop);
router.get("/", authenticateToken,getAllShops);
router.get("/sequence/:id",authenticateToken, getInvoiceNumber);
router.get("/purchase/sequence/:id",authenticateToken, getInvoiceNumberForPurchase);
router.get("/receipt/sequence/:id",authenticateToken, getInvoiceNumberForReceipt);
router.get("/:id", authenticateToken,getShopById);
router.put("/:id", authenticateToken,updateShop);
router.delete("/:id", authenticateToken,deleteShop);

module.exports = router;