const { Messages } = require("../constants/message.constant");
const { StatusCode } = require("../constants/status.constant");
const { StatusEnum, UserRoles } = require("../constants/user.constant");
const { ERROR, SUCCESS } = require("../helper/response.helper");
const { updateUserDetails } = require("../helper/db.helper");
const { Customer, Ledger, Balance, LedgerSnapshot } = require("../model");
const { checkUserPrivileges } = require("../utils/roles.utils");
const mongoose = require("mongoose");
const { updateBalances } = require("../services/balanceService");
const { createLedgerHistory, getLedgerStatement } = require("../services/historyService");
const { normalizeDate } = require("../helper/common.helper");
const { rebuildSnapshotsFrom } = require("../services/ledgerSnapshotService");

// Create a new customer
const createLedger = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const { date, name, description, entries } = req.body;

    // 1. Create ledger
    const ledgerArr = await Ledger.create([{
      date,
      name,
      description,
      entries,
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
      return ERROR(res, StatusCode.NOT_FOUND, Messages.USER_NOT_FOUND);
    }
    return SUCCESS(res, ledger);
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};
// Update a customer by ID
const updateLedger = async (req, res) => {
  try {


    let query = { _id: req.params.id, status: { $ne: StatusEnum.DELETED } };
    let ledger = await Ledger.findOne(query).lean();

    if (!ledger) {
      return ERROR(res, StatusCode.NOT_FOUND, Messages.USER_NOT_FOUND);
    }

     let updatedData = req.body;

    // for (let key in req.body) {
    //   // Check if the key exists in keysToCheck array
    //   if (
    //     [
    //       "name",
    //       "email",
    //       "phone",
    //        "civilId"
    //     ].includes(key)
    //   ) {
    //     // Key exists in the array
    //     updatedData[key] = req.body[key];
    //   }
    // }
    updateUserDetails(req, updatedData, true);
    updateBalances(updatedData);
    const updated = await Ledger.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
    if (!updated) {
      return ERROR(res, StatusCode.NOT_FOUND, Messages.USER_NOT_FOUND);
    }
    ledger = await Ledger.findOne({ _id: updated._id })
      .lean();
    return SUCCESS(res, ledger);
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};

// Delete a customer by ID
const deleteLedger = async (req, res) => {
  try {

    const data = await Ledger.findByIdAndDelete(req.params.id);
    if (!data) {
      return ERROR(res, StatusCode.NOT_FOUND, Messages.USER_NOT_FOUND);
    }
    return SUCCESS(res, {}, "Ledger deleted successfully");
  } catch (e) {
    console.log(e);
    return ERROR(res, StatusCode.SERVER_ERROR, Messages.SERVER_ERROR);
  }
};


module.exports = {
  createLedger,
  updateLedger,
  deleteLedger,
  getAllLedger,
  getLedgerById,
  getAllCustomerByFilter
};
