const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newsSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['announcement', 'update', 'event', 'promotion', 'other']
  },
  imageUrl: {
    type: String
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published'
  },
  publishDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add text index for search functionality
newsSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('News', newsSchema); 