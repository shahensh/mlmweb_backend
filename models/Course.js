const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  videoFile: {
    type: String,
    required: true
  },
  duration: String,
  order: {
    type: Number,
    default: 0
  }
});

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  videos: [videoSchema],
  order: {
    type: Number,
    default: 0
  }
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  thumbnail: {
    type: String
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  duration: String,
  modules: [moduleSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
courseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Course', courseSchema); 