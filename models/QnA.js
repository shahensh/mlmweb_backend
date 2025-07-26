const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const qnaSchema = new Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    trim: true,
    default: ''
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'answered'],
    default: 'pending'
  },
  answeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  answeredAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('QnA', qnaSchema); 