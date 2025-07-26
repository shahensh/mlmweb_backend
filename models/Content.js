const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const contentSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'course',
      'webinar',
      'call',
      'archive',
      'forum',
      'resource',
      'perk',
      'news',
      'faq'
    ],
  },
  url: {
    type: String,
    trim: true,
  },
  thumbnail: {
    type: String, // URL to an image
    trim: true,
  },
  tags: [String],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // For future features like premium content
  accessLevel: {
    type: String,
    enum: ['public', 'member', 'premium'],
    default: 'public',
  },
  date: {
    type: Date,
  },
}, { timestamps: true });

// Add a text index for searching
contentSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Content', contentSchema); 