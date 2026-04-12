const{ default: mongoose } = require("mongoose");
const Sequence = require("../model/sequence");

const compareObjectIdWithString = (objectId, stringId) => {
    // Convert the string to an ObjectId
    const objectIdFromString = new mongoose.Types.ObjectId(stringId);
    // Use the equals method to compare
    return objectId.equals(objectIdFromString);
  };
const populateJobsName = (jobs)=> {
    let names = [];
    for( let job of jobs){
        names.push(job.service.description);
    }
    return names.join(",");
}

const getNextSequenceValue = async (sequenceName) => {
 // const seq = await Sequence.find();
  const sequenceDocument = await Sequence.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.value;
};
const validateCardExpiry = async (dateStr) => {
  // Check format dd/MM/yyyy
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!regex.test(dateStr)) return false;

  const [, day, month, year] = dateStr.match(regex);

  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1; // JS months 0-11
  const y = parseInt(year, 10);

  const expiryDate = new Date(y, m, d);

  // Check valid date (e.g. 31/02 invalid)
  if (
    expiryDate.getFullYear() !== y ||
    expiryDate.getMonth() !== m ||
    expiryDate.getDate() !== d
  ) {
    return false;
  }

  // Check not expired (today or future allowed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiryDate >= today;
}
  module.exports = {
    compareObjectIdWithString,
    populateJobsName,
    getNextSequenceValue,
    validateCardExpiry
  }