const { body,query } = require('express-validator')
const { Messages } = require('../constants/message.constant')


  const register_item = () => {
    return [
        body('name').exists(),
        body('description').exists(),
      //body('location',"Please send last name.").exists(),
      //body('phoneNumber',"Please send phone.").exists(),
      //body('zip_code',"Please send zip code.").exists()
    ]
  }



module.exports = {
  register_item
}