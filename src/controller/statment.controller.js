const { Messages } = require("../constants/message.constant");
const { StatusCode } = require("../constants/status.constant");
const { StatusEnum, UserRoles } = require("../constants/user.constant");
const { ERROR, SUCCESS } = require("../helper/response.helper");
const {PurchaseLedger, Ledger } = require("../model");
const { getAllBanksCodeList, updateTotals } = require("../services/historyService");
const { checkUserPrivileges } = require("../utils/roles.utils");
const mongoose = require("mongoose");


function resetTotals() {
  return {
    cash: { credit: 0, debit: 0 },
    gold: { credit: 0, debit: 0 },
    silver: { credit: 0, debit: 0 },
    bank: { credit: 0, debit: 0 },
    ttb: { credit: 0, debit: 0 },
    silver_bar: { credit: 0, debit: 0 },
  };
}
// Get all Customer
const getStatement = async (req, res) => {
  try {
        let { fromDate, toDate, customer } = req.query;
    
        if (!toDate) {
          toDate = new Date().toLocaleDateString("en-CA");
        }
    
        if (!fromDate) {
          const d = new Date(toDate);
          d.setDate(d.getDate() - 6);
          fromDate = d.toLocaleDateString("en-CA");
        }
    
        let query = {
          status: { $ne: StatusEnum.DELETED }
        };
    
        if (req.user.role === 'EMPLOYEE') {
          query.shop = new mongoose.Types.ObjectId(String(req.user.shop));
        }
    
        query.date = { $gte: fromDate, $lte: toDate };
  
    
        if (customer) {
          query.custId = new mongoose.Types.ObjectId(String(customer));;
        }
    
        const purchaseLedgers = await PurchaseLedger.find(query)
          .sort({ date: 1, createdAt: 1 })
          .lean();
        const ledgers = await Ledger.find(query)
          .sort({ date: 1, createdAt: 1 })
          .lean();
    // 🔥 add type
          const purchaseWithType = purchaseLedgers.map(item => ({
            ...item,
            entryType: "purchase"
          }));

          const ledgerWithType = ledgers.map(item => ({
            ...item,
            entryType: "ledger"
          }));

          // 🔥 merge
          const merged = [...purchaseWithType, ...ledgerWithType];

          // 🔥 sort by date + createdAt
          merged.sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date); // ASC
          }

          // same date → fallback (important!)
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
        const rows = [];
        let totals = resetTotals();
        const allBanks = await getAllBanksCodeList();
        for (let i = 0; i < merged.length; i++) {
          const ledger = merged[i];
          const dateKey = ledger.date;
    
    
          let entryTotals = resetTotals();
    
          for (const entry of ledger.entries) {
            updateTotals(entryTotals, entry);
            updateTotals(totals, entry);
          }
          // ======================
          // NORMAL ROW
          // ======================
          rows.push({
            isTotal: false,
            date: dateKey,
            id: ledger._id,
            invoiceNumber: ledger.invoiceNumber,
            customer: ledger.name,
            description: ledger.description,
    
            cash: entryTotals.cash,
            gold: entryTotals.gold,
            silver: entryTotals.silver,
            ttb: entryTotals.ttb,
            silver_bar: entryTotals.silver_bar,
            bank: entryTotals.bank,
    
            // flat dynamic banks
            ...Object.fromEntries(
              Object.entries(entryTotals)
                .filter(([k]) => k.startsWith("bank_"))
            )
          });
    
        }
        if(merged.length > 0){
          rows.push({
                        isTotal: true,
                        date: '',
                        customer: '',
                        description: 'TOTAL',
    
                        cash: { ...totals.cash },
                        gold: { ...totals.gold },
                        bank: { ...totals.bank },
                        ttb: { ...totals.ttb},
                        silver: { ...totals.silver },
                        silver_bar: { ...totals.silver_bar },
    
                        ...Object.fromEntries(
                            allBanks.map(k => [
                              k,
                              {
                                credit: totals[k]?.credit || 0,
                                debit: totals[k]?.debit || 0
                              }
                            ])
                          )
                      });
        }
        
    return SUCCESS(res, rows);
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};



module.exports = {
  getStatement
};
