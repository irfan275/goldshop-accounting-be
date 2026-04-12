const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: Number,
    required: true
  }
},{ collection: 'Sequence',timestamps: true });

const Sequence = mongoose.model('Sequence', sequenceSchema);

module.exports = Sequence;