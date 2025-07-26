const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  profileImage: {
    url: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date }
  },
  coverImage: {
    url: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date }
  }
}, { timestamps: true });

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Admin', adminSchema); 