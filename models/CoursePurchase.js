const mongoose = require('mongoose');

const coursePurchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentId: String,
  orderId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for userId and courseId
coursePurchaseSchema.index({ userId: 1, courseId: 1 });

module.exports = mongoose.model('CoursePurchase', coursePurchaseSchema); 