const { Messages } = require("../constants/message.constant");
const { StatusCode } = require("../constants/status.constant");
const { StatusEnum, UserRoles } = require("../constants/user.constant");
const { updateUserDetails } = require("../helper/db.helper");
const { ERROR, SUCCESS } = require("../helper/response.helper");
const { Shop} = require("../model");
const Sequence = require("../model/sequence");


// Create a new garage
const createShop = async (req, res) => {
   if(req.user.role !== UserRoles.SUPER_ADMIN){
    res.json({
          message: "Not Authorized to create shop",
          data: {}
        });
   }
    try {
        const { name, ownerName, address ,address_ar,phone,shortName} = req.body;
        const newShop = new Shop({
            name,
            ownerName,
            address,
            address_ar,
            phone,
            shortName
        });
        updateUserDetails(req,newShop,true);
        const data = await newShop.save();
        return SUCCESS(res,data);
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Get all shops
const getAllShops = async (req, res) => {
    try {
        const shops = await Shop.find({status : {$ne : StatusEnum.DELETED}});
        return SUCCESS(res,shops)
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Get a garage by ID
const getShopById = async (req, res) => {
    try {
        const shop = await Shop.findOne({_id : req.params.id, status : {$ne : StatusEnum.DELETED}});
        if (!shop) {
            return res.status(404).json({ message: 'Shop not found' });
        }
        return SUCCESS(res,shop);
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Update a shop by ID
const updateShop = async (req, res) => {
  if(req.user.role !== UserRoles.SUPER_ADMIN){
    res.json({
          message: "Not Authorized to create shop",
          data: {}
        });
   }
    try {
        updateUserDetails(req,req.body,false);
        const updatedShop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedShop) {
            return res.status(404).json({ message: 'Shop not found' });
        }
        return SUCCESS(res,updatedShop)
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Delete a shop by ID
const deleteShop = async (req, res) => {
  if(req.user.role !== UserRoles.SUPER_ADMIN){
    res.json({
          message: "Not Authorized to create shop",
          data: {}
        });
   }
    try {
        //const deletedShop = await Shop.findByIdAndDelete(req.params.id);
        let data = { status : StatusEnum.DELETED};
        updateUserDetails(req,data,false);
        const deletedShop = await Shop.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!deletedShop) {
            return res.status(404).json({ message: 'Shop not found' });
        }
        return SUCCESS(res,{},'Shop deleted successfully');
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};
const getInvoiceNumber = async (req, res) => {

  try {
    const shop = await Shop.findOne({_id : req.params.id, status : {$ne : StatusEnum.DELETED}}).lean();
    let seqName = `INV-${shop.shortName}`;
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

};
const getInvoiceNumberForPurchase = async (req, res) => {

  try {
    const shop = await Shop.findOne({_id : req.params.id, status : {$ne : StatusEnum.DELETED}}).lean();
    let seqName = `PV-${shop.shortName}`;
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

};
const getInvoiceNumberForReceipt = async (req, res) => {

  try {
    const shop = await Shop.findOne({_id : req.params.id, status : {$ne : StatusEnum.DELETED}}).lean();
    let seqName = `RE-${shop.shortName}`;
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

};
module.exports={
    createShop,
    getAllShops,
    getShopById,
    deleteShop,
    updateShop,
    getInvoiceNumber,
    getInvoiceNumberForPurchase,
    getInvoiceNumberForReceipt
}