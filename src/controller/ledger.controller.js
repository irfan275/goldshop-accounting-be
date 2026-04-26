const { Messages } = require("../constants/message.constant");
const { StatusCode } = require("../constants/status.constant");
const { StatusEnum, UserRoles } = require("../constants/user.constant");
const { ERROR, SUCCESS } = require("../helper/response.helper");
const { updateUserDetails } = require("../helper/db.helper");
const { Customer, Ledger, Balance, LedgerSnapshot, Shop } = require("../model");
const { checkUserPrivileges } = require("../utils/roles.utils");
const mongoose = require("mongoose");
const { updateBalances } = require("../services/balanceService");
const { createLedgerHistory, getLedgerStatement } = require("../services/historyService");
const { normalizeDate } = require("../helper/common.helper");
const { rebuildSnapshotsFrom } = require("../services/ledgerSnapshotService");
const Sequence = require("../model/sequence");

// Create a new customer
const createLedger = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const { date, name, description, entries, shop,isOfficial } = req.body;

    // 1. Create ledger
    const ledgerArr = await Ledger.create([{
      date,
      name,
      description,
      shop,
      entries,
      isOfficial,
      createdBy : req.user?._id
    }], { session });

    const ledger = ledgerArr[0];

    // 2. Capture BEFORE balances
    const balanceIds = entries.map(e => e.type);

    const beforeBalances = await Balance.find({
      _id: { $in: balanceIds }
    }).session(session).lean();

    // 3. Update balances (IMPORTANT: pass session)
    await updateBalances(entries, session);

    // 4. Create history (IMPORTANT: pass session)
    await createLedgerHistory({
      ledger,
      entries,
      userId: req.user?._id,
      beforeBalances,
      session
    });

    const entryDate = ledger.date;

    //const normalizedDate = entryDate;


    await session.commitTransaction();
    session.endSession();
    // 2. ❌ DELETE future snapshots
    await LedgerSnapshot.deleteMany({
      date: { $gte: entryDate },
    });

    // 3. ✅ REBUILD snapshots
    await rebuildSnapshotsFrom(entryDate);
    return SUCCESS(res, ledger);

  } catch (e) {
    console.log(e);

    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
  finally {
    if (session) {
      session.endSession(); // 👈 always clean up
    }
  }
};
// Update a customer by ID
const updateLedger = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const id = req.params.id;
    let query = { _id: req.params.id, status: { $ne: StatusEnum.DELETED } };
    let ledger = await Ledger.findOne(query).lean();

    if (!ledger) {
      return ERROR(res, StatusCode.NOT_FOUND, Messages.LEDGER_NOT_FOUND);
    }

     let updatedData = req.body;
    if(updatedData.entries.length > 0){
      // 1. Get old ledger
        const oldLedger = await Ledger.findById(id).session(session);

        // 2. Reverse old balances
        const reverseEntries = oldLedger.entries.map(e => ({
          type: e.type,
          credit: e.debit || 0,
          debit: e.credit || 0
        }));

        await updateBalances(reverseEntries, session);

    }
    updateUserDetails(req, updatedData, true);
    // 2. Capture BEFORE balances
    const updatedLedger = await Ledger.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
    if (!updatedLedger) {
      return ERROR(res, StatusCode.NOT_FOUND, Messages.LEDGER_NOT_FOUND);
    }
    ledger = await Ledger.findOne({ _id: updatedLedger._id })
      .lean();
    if(updatedData.entries.length > 0)
    {
        let entries = updatedData.entries
         const balanceIds = entries.map(e => e.type);
        const beforeBalances = await Balance.find({
          _id: { $in: balanceIds }
        }).session(session).lean();

        // 3. Update balances (IMPORTANT: pass session)
        await updateBalances(entries, session);

        // 4. Create history (IMPORTANT: pass session)
        await createLedgerHistory({
          ledger,
          entries,
          userId: req.user?._id,
          beforeBalances,
          session
        });

        const entryDate = ledger.date;

        //const normalizedDate = entryDate;


        await session.commitTransaction();
        session.endSession();
        // 2. ❌ DELETE future snapshots
        await LedgerSnapshot.deleteMany({
          date: { $gte: entryDate },
        });

        // 3. ✅ REBUILD snapshots
        await rebuildSnapshotsFrom(entryDate);
    }
    
    return SUCCESS(res, ledger);

  } catch (e) {
    console.log(e);

    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
  finally {
    if (session) {
      session.endSession(); // 👈 always clean up
    }
  }
};

// Get all Customer
const getAllLedger = async (req, res) => {
  try {

    let query = {
      status: { $ne: StatusEnum.DELETED }
    };
    const data = await  getLedgerStatement(req);
    // const ledgers = await Ledger.find(query)
    //   .sort({ createdAt: -1 })
    //   .lean();

    return SUCCESS(res, data);
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};

// Get all customers by filter
const getAllCustomerByFilter = async (req, res) => {
  try {
    let { status, search, page, size } = req.query;

    status = status || StatusEnum.ACTIVE;
    page = parseInt(page) || 1;
    size = parseInt(size) || 50;
    const skip = (page - 1) * size;

    let query = { status };
    let aggregateQuery = [{ $match: query }];

    if (search && search.trim() !== "") {
      if (search.length < 3) {
        return ERROR(res, StatusCode.BAD_REQUEST, Messages.INVALID_LENGTH_ERROR);
      }

      // Remove spaces from search for fullName matching
      const cleanedSearch = search.replace(/\s+/g, "");

      // Add field without spaces for name matching
      aggregateQuery.push({
        $addFields: {
          fullName: { $replaceAll: { input: "$name", find: " ", replacement: "" }},
          civilIdStr: { $toString: "$civilId" },
          phoneStr: { $toString: "$phone" }
        }
      });

      // Match using $regex as string (not JS RegExp)
      aggregateQuery.push({
        $match: {
          $or: [
            { fullName: { $regex: cleanedSearch, $options: "i" } },
            { phoneStr: { $regex: search, $options: "i" } },
            { civilIdStr: { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    // Sort by createdAt descending
    aggregateQuery.push({ $sort: { createdAt: -1 } });

    // Pagination
    aggregateQuery.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: size }],
        totalCount: [{ $count: "count" }]
      }
    });

    const result = await Customer.aggregate(aggregateQuery);

    const customers = result[0]?.data || [];
    const totalRecords = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / size);

    return res.json({
      data: customers,
      page,
      size,
      totalRecords,
      totalPages
    });
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
    const ledger = await Ledger.findOne(query)
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
// Get a customer by ID
const getBalance = async (req, res) => {
  try {
    const balances = await Balance.find({}).lean();

    const result = {
      cash: 0,
      bank: 0,
      gold_raw: 0,
      gold_bar: 0,
      silver_raw: 0,
      silver_bar: 0
    };

    balances.forEach(b => {
      const id = b._id;

      // =========================
      // 🔥 DYNAMIC BANK HANDLING
      // =========================
      if (id.startsWith("bank_")) {
        const val = Number(b.balance || 0);

        // individual bank
        result[id] = val;

        // total bank
        result.bank += val;

        return;
      }

      // =========================
      // NORMAL TYPES (UNCHANGED)
      // =========================
      switch (id) {
        case "cash":
          result.cash = Number(b.balance || 0);
          break;

        case "bank":
          // optional: ignore if using dynamic banks only
          result.bank += Number(b.balance || 0);
          break;

        case "gold_raw":
          result.gold_raw = Number(b.grams || 0);
          break;

        case "gold_bar_1tt":
          result.gold_bar = Number(b.count || 0);
          break;

        case "silver_raw":
          result.silver_raw = Number(b.grams || 0);
          break;

        case "silver_bar_kg":
          result.silver_bar = Number(b.count || 0);
          break;
      }
    });

    return res.json(result);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server Error" });
  }
};
// Delete a customer by ID
const deleteLedger = async (req, res) => {
  try {

    const data = await Ledger.findByIdAndDelete(req.params.id);
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
    let seqName = `LEG-${shop.shortName}`;
    let sequence = await Sequence.findOne(
      {name:seqName}
    );
    let sequenceNumber = !sequence? 0 : sequence.value;
    res.json({ invoiceNumber : `${seqName}-${sequenceNumber+1}`
    });

  } catch (error) {

    res.status(500).json({
      message: "Error",
      error: error.message
    });

  }
}

module.exports = {
  createLedger,
  updateLedger,
  deleteLedger,
  getAllLedger,
  getLedgerById,
  getAllCustomerByFilter,
  getInvoiceNumberForLedger,
  getBalance
};
