let jwt = require('jsonwebtoken');
require('dotenv').config();
let authenticateToken = (req, res, next) => {
  let token = req.headers['x-access-token'] || req.headers['authorization'];

  if (!token) {
    return res.status(401).json({
      message: 'Auth token is not supplied'
    });
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7);
  }

  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: 'Token is not valid'
      });
    }

    req.user = decoded;
    next();
  });
};

const createToken = (data) => {
  //console.log(data);return 1 ;
    let token = jwt.sign(data,
        process.env.SECRET,
        { expiresIn: '20h' // expires in 20 hours
        }
      );
      return token;
}

module.exports = {authenticateToken ,createToken}