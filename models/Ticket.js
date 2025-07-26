const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    maxlength: 255,
    trim: true
  },
  path: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  size: {
    type: Number,
    max: 5 * 1024 * 1024 // 5MB
  },
  mimeType: {
    type: String,
    required: true
  }
});

const responseSchema = new mongoose.Schema({
  responderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'responses.responderType',
    required: true
  },
  responderType: {
    type: String,
    enum: ['User', 'Admin'],
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000,
    trim: true
  },
  attachments: [attachmentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true,
    set: value => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true,
    set: value => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['technical', 'billing', 'product', 'general'],
    index: true
  },
  attachments: [attachmentSchema],
  responses: [responseSchema],
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date,
    default: null
  }
});

// Indexes for better performance
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ category: 1, createdAt: -1 });
ticketSchema.index({ assignedAdminId: 1, status: 1 });

// Pre-save middleware
ticketSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.isModified('status') && (this.status === 'resolved' || this.status === 'closed')) {
    this.closedAt = Date.now();
  }
  
  next();
});

// Virtual for response count
ticketSchema.virtual('responseCount').get(function() {
  return this.responses.length;
});

// Method to check if ticket can be modified
ticketSchema.methods.canBeModified = function() {
  return this.status !== 'closed';
};

// Method to sanitize messages
ticketSchema.methods.sanitizeMessage = function(message) {
  return sanitizeHtml(message, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
    allowedAttributes: {
      'a': ['href', 'target']
    }
  });
};

module.exports = mongoose.model('Ticket', ticketSchema);


















// const mongoose = require('mongoose');

// const ticketSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   subject: {
//     type: String,
//     required: true
//   },
//   description: {
//     type: String,
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['open', 'in-progress', 'resolved', 'closed'],
//     default: 'open'
//   },
//   priority: {
//     type: String,
//     enum: ['low', 'medium', 'high', 'urgent'],
//     default: 'medium'
//   },
//   category: {
//     type: String,
//     required: true,
//     enum: ['technical', 'billing', 'product', 'general']
//   },
//   attachments: [{
//     filename: String,
//     path: String,
//     uploadedAt: Date
//   }],
//   responses: [{
//     responderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       refPath: 'responses.responderType'
//     },
//     responderType: {
//       type: String,
//       enum: ['User', 'Admin']
//     },
//     message: String,
//     attachments: [{
//       filename: String,
//       path: String,
//       uploadedAt: Date
//     }],
//     createdAt: {
//       type: Date,
//       default: Date.now
//     }
//   }],
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// ticketSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// module.exports = mongoose.model('Ticket', ticketSchema); 




