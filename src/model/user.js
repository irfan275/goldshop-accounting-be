const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { UserRoles, StatusEnum } = require("../constants/user.constant");
const { addUpdatedByPreSave, addCreatedByPreSave } = require("../helper/db.helper");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    // lastName: {
    //     type: String,
    //     required: true,
    // },
    email: {
        type: String,
       
    },
    civilId: {
        type: Number,
       
    },
    phoneNumber: {
        type: Number,
        required: true,
        unique: true,
    },
    profilePicture: {
        type: String, // You can store the URL of the image
    },
    password: {
        type: String,
        required: true,
        select: false, // Don't include password field by default when querying
    },
    status: {
        type: String,
        enum: Object.keys(StatusEnum),
        default: 'ACTIVE', // Optional: Set a default value
      },
    shopId : {
        type : ObjectId,
        ref : 'Shop'
    },
    role: {
        type: String,
        enum: UserRoles,
        default: "EMPLOYEE"
    },
    twoFactorSecret: { type: String },
    twoFactorEnabled: { type: Boolean, default: true },
    createdBy : {
        type : ObjectId,
        ref : 'User'
    },
    updatedBy : {
        type : ObjectId,
        ref : 'User',
        //required : true
    },
  },{ collection: 'User',timestamps: true });

  // Define pre-save middleware
  //UserSchema.plugin(addCreatedByPreSave);
  //UserSchema.plugin(addUpdatedByPreSave);
// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(this.password, salt);
        this.password = hashedPassword;
        next();
    } catch (error) {
        return next(error);
    }
});
// For update
UserSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();

    if (update.password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(update.password, salt);
      this.setUpdate(update);
    }

    next();
  } catch (error) {
    next(error);
  }
});
// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        // Log the hashed password stored in the database for debugging
        //console.log('Stored Password:', this.password);

        // Compare the candidate password with the hashed password
        const passwordsMatch = await bcrypt.compare(candidatePassword, this.password);

        // Log the result of password comparison
       // console.log('Passwords Match:', passwordsMatch);

        return passwordsMatch;
    } catch (error) {
        // Log any errors that occur during password comparison
        console.error('Error comparing passwords:', error);
        throw error; // Rethrow the error to propagate it up the call stack
    }
};

const User = mongoose.model('User', UserSchema);
module.exports = User;

// Define the super admin user data
const superAdminData = {
    name: 'Super admin',
    //lastName : 'admin',
    phoneNumber: '79972104',
    password: 'Test@123', 
    role: UserRoles.SUPER_ADMIN,
  };
  
  // Function to create the super admin user
  async function createSuperAdmin() {
    try {
      // Check if the super admin already exists
      const existingUser = await User.findOne({ role: UserRoles.SUPER_ADMIN });
      if (existingUser) {
        console.log('Super admin already exists.');
        return;
      }
      
      // Create the super admin user
      const superAdmin = new User(superAdminData);
      await superAdmin.save();
      console.log('Super admin created successfully.');
    } catch (error) {
      console.error('Error creating super admin:', error.message);
    } finally {
      // Disconnect from MongoDB after migration
      //mongoose.disconnect();
    }
  }
  
  // Call the function to create the super admin user
  createSuperAdmin();