const { validationResult } = require('express-validator')
const { Messages } = require('../constants/message.constant')

exports.validate = (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }
    const extractedErrors = []
    errors.array().map(err => extractedErrors.push({ [err.param]: err.msg === 'Invalid value' ? err.param + Messages.IS_REQ :  err.msg  })) ////err.msg
  
    return res.status(422).json({
      errors: extractedErrors,
    })
  }