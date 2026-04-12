let jwt = require('jsonwebtoken');
require('dotenv').config();
let authenticateToken = (req, res, next) => {

  let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
  if (token.startsWith('Bearer ')) {
    // Remove Bearer from string
    token = token.slice(7);
  }
  if (token) {
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
      if (err) {
        return res.json({
          status: 205,
          message: 'Token is not valid'
        });
      } else {
        req.user = decoded;
        next();
      }
    });
  } else {
    return res.json({
      status: 205,
      message: 'Auth token is not supplied'
    });
  }
};

const createToken = (data) => {
  //console.log(data);return 1 ;
    let token = jwt.sign(data,
        process.env.SECRET,
        { expiresIn: '360h' // expires in 24 hours
        }
      );
      return token;
}

module.exports = {authenticateToken ,createToken}