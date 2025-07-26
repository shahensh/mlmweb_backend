const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const faqSchema = new Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('FAQ', faqSchema); 