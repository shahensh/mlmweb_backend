const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');

// Create new order
router.post('/', isAuth, async (req, res) => {
  try {
    const { items, totalAmount, shippingInfo } = req.body;
    
    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // Convert to smallest currency unit (paise)
      currency: 'INR',
      receipt: 'order_' + Date.now(),
    });

    // Create order in database
    const order = new Order({
      user: req.user.id,
      items,
      totalAmount,
      shippingInfo,
      transaction: {
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
      }
    });

    await order.save();

    res.json({
      order,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      }
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Verify payment and update order
router.post('/verify-payment', isAuth, async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // Find the order
    const order = await Order.findOne({
      'transaction.razorpayOrderId': razorpayOrderId
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpaySignature) {
      // Payment is successful
      order.transaction.razorpayPaymentId = razorpayPaymentId;
      order.transaction.razorpaySignature = razorpaySignature;
      order.transaction.status = 'success';
      order.status = 'paid';
      order.paymentId = razorpayPaymentId;
      await order.save();

      res.json({ message: 'Payment verified successfully' });
    } else {
      // Payment verification failed
      order.transaction.status = 'failed';
      await order.save();
      res.status(400).json({ message: 'Invalid signature' });
    }
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ message: 'Error verifying payment' });
  }
});

// Get user's orders with transaction details
router.get('/my-orders', isAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get order details by ID
router.get('/:id', isAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.id)
      .populate('items.product')
      .populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// Admin: Get all orders with transaction details
router.get('/admin/all', isAuth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get all orders for the logged-in user
router.get('/user', isAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name image price');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders (admin only)
router.get('/admin', isAuth, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name image price');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (admin only)
router.put('/:id/status', isAuth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 