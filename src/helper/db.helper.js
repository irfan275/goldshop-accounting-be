const updateUserDetails = (req, data, newRecord = false) => {
  if (newRecord) {
    data.createdBy = req.user.id;
  }
  data.updatedBy = req.user.id;
};

const addGarageDetails = (req, data) => {
  if (req && req.user && req.user.garageId) {
    return (data.garageId = req.user.garageId);
  }
};
module.exports = {
  updateUserDetails,
  addGarageDetails,
};
