const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');

// Get all products (public - for users)
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, limit = 20, page = 1 } = req.query;
    
    let query = { isActive: true };
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // Sorting
    let sortOption = {};
    switch (sort) {
      case 'price-low':
        sortOption = { price: 1 };
        break;
      case 'price-high':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
    
    const skip = (page - 1) * limit;
    
    const products = await Product.find(query)
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('createdBy', 'firstName lastName');
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + products.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product (public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('reviews.user', 'firstName lastName');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes - require admin authentication
// Get all products (admin - includes inactive)
router.get('/admin/all', isAuth, isAdmin, async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName');
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new product (admin only)
router.post('/', isAuth, isAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      image,
      category,
      stock,
      features,
      shipping,
      warranty,
      commission,
      tags
    } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !image || !category) {
      return res.status(400).json({ 
        message: 'Name, description, price, image, and category are required' 
      });
    }
    
    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      image,
      category,
      stock: parseInt(stock) || 0,
      features: features || [],
      shipping: shipping || 'Free shipping',
      warranty: warranty || '30 days',
      commission: parseFloat(commission) || 0,
      tags: tags || [],
      createdBy: req.user.id
    });
    
    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'firstName lastName');
    
    res.status(201).json(populatedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product (admin only)
router.put('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      image,
      category,
      stock,
      isActive,
      features,
      shipping,
      warranty,
      commission,
      tags
    } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update fields
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (image !== undefined) product.image = image;
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (isActive !== undefined) product.isActive = isActive;
    if (features !== undefined) product.features = features;
    if (shipping !== undefined) product.shipping = shipping;
    if (warranty !== undefined) product.warranty = warranty;
    if (commission !== undefined) product.commission = parseFloat(commission);
    if (tags !== undefined) product.tags = tags;
    
    await product.save();
    
    const updatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'firstName lastName');
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product (admin only)
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add review to product (authenticated users)
router.post('/:id/reviews', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid rating (1-5) is required' });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user already reviewed
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.id
    );
    
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }
    
    // Add review
    product.reviews.push({
      user: req.user.id,
      rating: parseInt(rating),
      comment: comment || ''
    });
    
    // Update average rating
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.rating = totalRating / product.reviews.length;
    
    await product.save();
    
    const updatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'firstName lastName')
      .populate('reviews.user', 'firstName lastName');
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 