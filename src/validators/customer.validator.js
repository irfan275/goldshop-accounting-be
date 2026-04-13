const { body,query } = require('express-validator')
const { Messages } = require('../constants/message.constant')


  const register_customer = () => {
    return [
        body('name').exists(),
        body('phone').exists(),
    ]
  }



module.exports = {
  register_customer
}