const { Messages } = require("../constants/message.constant");
const { StatusCode } = require("../constants/status.constant");
const { StatusEnum, UserRoles } = require("../constants/user.constant");
const { updateUserDetails } = require("../helper/db.helper");
const { ERROR, SUCCESS } = require("../helper/response.helper");
const { Shop, Bank} = require("../model");
const Sequence = require("../model/sequence");


// Create a new garage
const createBank = async (req, res) => {
   if(req.user.role !== UserRoles.SUPER_ADMIN){
    res.json({
          message: "Not Authorized to create shop",
          data: {}
        });
   }
    try {
        const { name, code} = req.body;
        const newBank = new Bank({
            name,
            code
        });
        updateUserDetails(req,newBank,true);
        const data = await newBank.save();
        return SUCCESS(res,data);
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Get all shops
const getAllBanks = async (req, res) => {
    try {
        const data = await Bank.find({status : {$ne : "DELETED"}});
        return SUCCESS(res,data)
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Get a garage by ID
const getBankById = async (req, res) => {
    try {
        const bank = await Bank.findOne({_id : req.params.id, status : {$ne : StatusEnum.DELETED}});
        if (!bank) {
            return res.status(404).json({ message: 'bank not found' });
        }
        return SUCCESS(res,bank);
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};


module.exports={
    createBank,
    getAllBanks,
    getBankById
}