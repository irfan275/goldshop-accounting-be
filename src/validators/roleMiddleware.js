// middlewares/roleMiddleware.js

const restrictToEmployee = (req, res, next) => {
    if (req.user?.role === "EMPLOYEE") {
      return res.status(403).json({
        message: "Not Authorized",
        data: {}
      });
    }
  
    next(); // allow request
  };
  
  module.exports = { restrictToEmployee };