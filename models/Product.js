const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
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
    required: true,
    min: 0
  },
  image: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true,
    enum: ['courses', 'webinars', 'coaching', 'marketing_tools', 'kits', 'physical_products', 'other']
  },
  isDigital: {
    type: Boolean,
    default: function() {
      return ['courses', 'webinars', 'coaching', 'marketing_tools'].includes(this.category);
    }
  },
  digitalContent: {
    type: {
      type: String,
      enum: ['course', 'webinar', 'coaching', 'tool', 'document', 'video', 'other'],
      required: function() { return this.isDigital; }
    },
    accessLink: {
      type: String,
      required: function() { return this.isDigital; }
    },
    duration: {
      type: String,
      required: function() { return this.isDigital && ['course', 'coaching', 'webinar'].includes(this.digitalContent?.type); }
    }
  },
  stock: { 
    type: Number, 
    default: function() {
      return this.isDigital ? null : 0; // null for digital products
    },
    validate: {
      validator: function(value) {
        if (this.isDigital) return true; // Skip validation for digital products
        return value >= 0;
      },
      message: 'Stock must be greater than or equal to 0 for physical products'
    }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  features: [{ 
    type: String 
  }],
  requiresShipping: {
    type: Boolean,
    default: function() {
      return !this.isDigital;
    }
  },
  shippingInfo: {
    weight: {
      type: Number,
      required: function() { return this.requiresShipping; }
    },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number }
    },
    shippingClass: {
      type: String,
      enum: ['standard', 'express', 'free'],
      default: 'standard'
    }
  },
  warranty: { 
    type: String,
    default: '30 days'
  },
  commission: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{ 
    type: String 
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, { 
  timestamps: true 
});

// Index for better search performance
productSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to set isDigital and requiresShipping based on category
productSchema.pre('save', function(next) {
  // Set isDigital based on category
  this.isDigital = ['courses', 'webinars', 'coaching', 'marketing_tools'].includes(this.category);
  
  // Set requiresShipping based on isDigital
  this.requiresShipping = !this.isDigital;
  
  // Set stock to -1 (unlimited) for digital products
  if (this.isDigital && this.stock !== -1) {
    this.stock = -1;
  }
  
  next();
});

module.exports = mongoose.model('Product', productSchema); 