const { Messages } = require("../constants/message.constant");
const { StatusCode } = require("../constants/status.constant");
const { StatusEnum, UserRoles } = require("../constants/user.constant");
const { ERROR, SUCCESS } = require("../helper/response.helper");
const { updateUserDetails } = require("../helper/db.helper");
const { Shop, Ledger,SilverBuyAndSellLedger } = require("../model");
const { checkUserPrivileges } = require("../utils/roles.utils");
const mongoose = require("mongoose");
const { validateCardExpiry, getNextSequenceValue } = require("../helper/common.helper");
const Sequence = require("../model/sequence");
const { getPurchaseLedgerStatement, getBuyAndSellLedgerStatement, getSilverBuyAndSellLedgerStatement } = require("../services/historyService");


const createLedger= async (req, res) => {
  try {

    // checkUserPrivileges(
    //   res,
    //   req.user.roles,
    //   UserRoles.ADMIN,
    //   UserRoles.MANAGER
    // );

    const { date, name, description, entries, shop,isBooking,custId } = req.body;
    
        // 1. Create ledger
        const ledger = await SilverBuyAndSellLedger({
          date,
          name,
          custId,
          description,
          shop,
          isBooking,
          entries
        });
    updateUserDetails(req, ledger, true);
    const data = await ledger.save();

    return SUCCESS(res, data);
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};

const updateLedger = async (req, res) => {

  try {
    if(req.user.role === 'EMPLOYEE'&& req.user.shop != req.body.shop)
    {
      res.json({
        message: "Not Authorized to update Invoice",
        data: {}
      });
  
    }
    let query = { _id: req.params.id, status: { $ne: StatusEnum.DELETED } };
    let oldLedger = await SilverBuyAndSellLedger.findOne(query).lean();

    if (!oldLedger) {
      return ERROR(res, StatusCode.NOT_FOUND, Messages.LEDGER_NOT_FOUND);
    }
    let updatedData = req.body;
    if(updatedData.shop != oldLedger.shop.toString())
    {
      const invoiceNumber =await getSequenceById(updatedData.shop);
      updatedData.invoiceNumber=invoiceNumber;
    }
    const ledger = await SilverBuyAndSellLedger.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    res.json({
      message: "Ledger updated successfully",
      data: ledger
    });

  } catch (error) {

    res.status(500).json({
      message: "Error updating ledger",
      error: error.message
    });

  }

};

// Get all Customer
const getAllLedger = async (req, res) => {
  try {

    const data = await  getSilverBuyAndSellLedgerStatement(req);
    return SUCCESS(res, data);
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};

// Get a customer by ID
const getLedgerById = async (req, res) => {
  try {

    let query = {
      _id: req.params.id,
      status: { $ne: StatusEnum.DELETED }
    };
    const ledger = await SilverBuyAndSellLedger.findOne(query)
      .lean();
    if (!ledger) {
      return ERROR(res, StatusCode.NOT_FOUND, Messages.LEDGER_NOT_FOUND);
    }
    return SUCCESS(res, ledger);
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};

// Delete a customer by ID
const deleteLedger = async (req, res) => {
  try {

    const data = await SilverBuyAndSellLedger.findByIdAndDelete(req.params.id);
    if (!data) {
      return ERROR(res, StatusCode.NOT_FOUND, Messages.LEDGER_NOT_FOUND);
    }
    return SUCCESS(res, {}, "Ledger deleted successfully");
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};
const getInvoiceNumberForLedger = async (req, res) => {

  try {
    const shop = await Shop.findOne({_id : req.params.id, status : {$ne : StatusEnum.DELETED}}).lean();
    let seqName = `SBS-LEG-${shop.shortName}`;
    let sequence = await Sequence.findOne(
      {name:seqName}
    );
    let sequenceNumber = !sequence? 0 : sequence.value;
    res.json({ invoiceNumber : `${seqName}-${sequenceNumber+1}`});

  } catch (error) {

    res.status(500).json({
      message: "Error",
      error: error.message
    });

  }
}
const getSequenceById = async (id) => {
  const shop = await Shop.findById(id);

    if (!shop) {
      return next(new Error("Shop not found"));
    }
    let seqName = `SBS-LEG-${shop.shortName}`;
    const sequence = await getNextSequenceValue(seqName);

    let invoiceNumber = seqName+"-"+sequence;
    return invoiceNumber;
}
const createBuyAndSellLedgerFromId = async(req, res) => {
  try {

    // if(req.user.role === UserRoles.EMPLOYEE){
    //   res.json({
    //         message: "Not Authorized to create Buy and Sell Ledger",
    //         data: {}
    //       });
    // }

    const { ledgerId } = req.body;
    const ledger = await Ledger.findById(ledgerId).lean();

      if (!ledger) {
        throw new Error("Ledger not found");
      }

      const data = buildPurchaseFromLedger(ledger);

      const purchase = new SilverBuyAndSellLedger(data);
      updateUserDetails(req, purchase, true);
      await purchase.save();

    return SUCCESS(res, purchase);
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
}
const transformToPurchaseEntries = (entries = []) => {
  return entries.map(e => ({
    ...e,
    credit: e.credit || 0,
    debit: e.debit || 0
  }));
};
const buildPurchaseFromLedger = (ledger) => {
  return {
    date: ledger.date,
    name: ledger.name,
    custId: ledger.custId,
    description: ledger.description,

    // 🔥 flip entries
    entries: transformToPurchaseEntries(ledger.entries),

    //isOfficial: ledger.isOfficial,
    isBooking: ledger.isBooking,
    shop: ledger.shop,
    ledgerId : ledger.invoiceNumber

  };
};
module.exports = {
  createLedger,
  updateLedger,
  deleteLedger,
  getAllLedger,
  getLedgerById,
  getInvoiceNumberForLedger,
  createBuyAndSellLedgerFromId
};
