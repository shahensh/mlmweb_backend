const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  image: String,
  price: Number,
  quantity: { type: Number, default: 1 },
  isDigital: { type: Boolean, default: false },
  digitalContent: {
    type: {
      type: String,
      enum: ['course', 'coaching', 'webinar', 'ebook', 'video', 'other']
    },
    accessLink: String,
    duration: String
  }
});

const transactionSchema = new Schema({
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  amount: { type: Number },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  method: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  isDigitalOrder: { 
    type: Boolean,
    default: false
  },
  shippingInfo: {
    address: String,
    city: String,
    state: String,
    country: String,
    pinCode: String,
    phone: String,
  },
  transaction: transactionSchema,
  paymentId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Update order status when transaction is successful
orderSchema.pre('save', function(next) {
  // Set isDigitalOrder if all items are digital
  this.isDigitalOrder = this.items.every(item => item.isDigital);

  // Update status based on transaction and order type
  if (this.isModified('transaction.status') && this.transaction?.status === 'success') {
    this.status = this.isDigitalOrder ? 'delivered' : 'paid';
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema); 