const { Messages } = require("../constants/message.constant");
const { StatusCode } = require("../constants/status.constant");
const { StatusEnum, UserRoles } = require("../constants/user.constant");
const { ERROR, SUCCESS } = require("../helper/response.helper");
const { User } = require("../model");
const { createToken } = require("../validators/middleware");
const { updateUserDetails } = require("../helper/db.helper");
const speakeasy = require('speakeasy');

const loginUser = async (req,res) => {
    //console.log(req.originalUrl);
    try{
        let {phoneNumber,password,otp} = req.body;
        

        const  user = await User.findOne({phoneNumber}).select('+password');
        
        if (!user) 
            return ERROR(res, StatusCode.NOT_FOUND,Messages.EMAIL_NOT_REG);
        // Call the comparePassword method to compare the entered password
        const passwordsMatch = await user.comparePassword(password);

        if (!passwordsMatch) {
            return ERROR(res,StatusCode.NOT_FOUND,Messages.LOGIN_INVALID);
        }
        if(process.env.OTP_VALIDATION == 'true'){
            const verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: otp,
                window: 1
            });

            if (!verified) {
                return ERROR(res,StatusCode.NOT_FOUND, 'Invalid OTP');
            }
        }
        
        const accessToken = createToken({
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            shop: user.shopId,
            id: user._id,
        });
        let userData = {
            user: user,
            accessToken : accessToken
        }
        // Passwords match, login successful
        return SUCCESS(res,userData);

    }catch (e){
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
}
// Create a new user
const createUser = async (req, res) => {
    try {
        const { email,name, phoneNumber, profilePicture,role,password,shopId,civilId } = req.body;

        // create user profile information
        const newUser = await User({
            name,
            phoneNumber,
            email,
            role,
            password,
            shopId,
            civilId
            //profilePicture
        });
        const user = await User.find({phoneNumber : phoneNumber, status : {$ne : StatusEnum.DELETED}});
        if (user.length != 0) {
            return ERROR(res,StatusCode.BAD_REQUEST,Messages.USER_ALREADY_EXIST);
        }

        updateUserDetails(req,newUser,true);
        const savedUser = await newUser.save();
        return SUCCESS(res,savedUser);
        //res.status(201).json(savedGarage);
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Get all garages
const getAllUsers = async (req, res) => {
    try {
      let query = {
      status: { $ne: StatusEnum.DELETED },
      role: { $ne: UserRoles.SUPER_ADMIN },
    };
    //filterRoleToAccessUserData(req.user, query);
    const users = await User.find(query)
      .populate({
        path: "shopId",
        select: "name",
      })
      .sort({ createdAt: -1 });
    return SUCCESS(res, users);
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Get a garage by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.find({_id : req.params.id, status : {$ne : StatusEnum.DELETED}});
        if (!user) {
            return SUCCESS(res,StatusCode.BAD_REQUEST,Messages.USER_NOT_FOUND);
        }
        return SUCCESS(res,garage);
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Update a garage by ID
const updateUser = async (req, res) => {
    try {
        const { email } = req.body;
        // if(email)
        // {
        //     console.log("Email can not updated");
        //     delete req.body.email;
        // }
        updateUserDetails(req,req.body,false);
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedUser) {
            return SUCCESS(res,StatusCode.BAD_REQUEST,Messages.USER_NOT_FOUND);
        }
        return SUCCESS(res,updatedUser)
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};

// Delete a garage by ID
const deleteUser = async (req, res) => {
    try {
        //const deletedGarage = await Garage.findByIdAndDelete(req.params.id);
        //let data = { status : StatusEnum.DELETED};
        //updateUserDetails(req,data,false);
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'User not found' });
        }
        return SUCCESS(res,{},'User deleted successfully');
    } catch (e) {
        console.log(e)
        return ERROR(res,StatusCode.SERVER_ERROR,Messages.SERVER_ERROR);
    }
};


async function generate2FASecret(req, res) {
  const userId = req.params.userId;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const secret = speakeasy.generateSecret({
    length: 20
  });

  // Save in DB
  user.twoFactorSecret = secret.base32;
  user.twoFactorEnabled = true;
  await user.save();

  res.json({
    message: '2FA secret generated successfully',
    userId: user._id
  });
}
async function get2FASecret(req, res) {
  const userId = req.params.userId;

  const user = await User.findById(userId);
  if (!user || !user.twoFactorSecret) {
    return res.status(404).json({ message: '2FA not set for this user' });
  }

  res.json({
    secret: user.twoFactorSecret
  });
}
module.exports = {
  loginUser,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  getAllUsers,
  generate2FASecret,
  get2FASecret
};