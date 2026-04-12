const { body,query, check } = require('express-validator')
const { Messages } = require('../constants/message.constant')


  const login_validator = () => {
    return [
      body('phoneNumber').exists().withMessage("Phone Number required"),
      body('password').exists(),
    ]
  }
  const register_user_validator = () => {
    return [
      //body('email').exists().isEmail(),
      //body('password').exists(),
      body('name').exists(),
      //body('lastName').exists(),
      // Validate the 'roles' field
      body('role')
      .exists(), // Check if the field exists
      // .isArray().withMessage('Roles must be an array') // Check if it's an array
      // .custom(value => value.length >= 1).withMessage('At least one role must be provided'), 
      //body('garageId').exists() // Check if the field exists
      //.isArray().withMessage('Garage ids must be an array') // Check if it's an array
      //.custom(value => value.length >= 1).withMessage('At least one garage id must be provided'), 
      check('phoneNumber')
      .optional({ checkFalsy: true })
      .isLength({ min: 8, max: 14 }).withMessage('Phone number must be between 8 and 14 digits')
      //.matches(/^(\+44\s?7\d{3}|\+44\s?2\d{2,3}|\(?07\d{3}\)?|\(?02\d{2,3}\)?)\s?\d{3,4}\s?\d{3,4}$/).withMessage('Invalid UK phone number format')
    ]
  }

  const update_user_validator = () => {
    return [
      check('phoneNumber')
      .optional({ checkFalsy: true })
      .isLength({ min: 8, max: 14 }).withMessage('Phone number must be between 10 and 14 digits')
      //.matches(/^(\+44\s?7\d{3}|\+44\s?2\d{2,3}|\(?07\d{3}\)?|\(?02\d{2,3}\)?)\s?\d{3,4}\s?\d{3,4}$/).withMessage('Invalid UK phone number format')
    ]
  }
  const update_password_validator = () => {
    return [
      //body('email', "Please send email or password.").exists(),
      body('password', "Please send email or password.").exists()
    ]
  }
  const forgot_password_validator = () => {
    return [
      body('email', "Please send mail.").exists()
    ]
  }
  const reset_password_validator = () => {
    return [
      body('email', "Please send email.").exists().isEmail(),
      body('newPassword', "Please send password.").exists(),
      body('otp', "Please send otp.").exists().custom((value, { req }) => {
        if (value.length != 4) {
            throw new Error('OTP should be 4 characters long.');
        }
        return true; // Indicates the validation succeeded
    }),
    ]
  }


module.exports = {
  login_validator,
  register_user_validator,
  forgot_password_validator,
  reset_password_validator,
  update_password_validator,
  update_user_validator

}