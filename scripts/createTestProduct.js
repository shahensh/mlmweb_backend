const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const createTestProduct = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mlmweb');
    console.log('Connected to MongoDB');

    // Create digital test product
    const digitalProduct = new Product({
      name: 'Test Digital Course',
      description: 'A test digital course for payment testing',
      price: 499,
      image: 'https://via.placeholder.com/300x200?text=Test+Course',
      category: 'courses',
      isDigital: true,
      digitalContent: {
        type: 'course',
        accessLink: 'https://example.com/course/test',
        duration: '2 weeks'
      },
      stock: null, // null for digital products
      isActive: true,
      features: ['Test Feature 1', 'Test Feature 2'],
      warranty: '30 days money back guarantee',
      commission: 10,
      tags: ['test', 'digital', 'course'],
      createdBy: '65a123456789abcdef123456' // Replace with an actual admin ID
    });

    // Create physical test product
    const physicalProduct = new Product({
      name: 'Test Physical Product',
      description: 'A test physical product for payment testing',
      price: 999,
      image: 'https://via.placeholder.com/300x200?text=Test+Product',
      category: 'physical_products',
      isDigital: false,
      requiresShipping: true,
      shippingInfo: {
        weight: 1.5,
        dimensions: {
          length: 30,
          width: 20,
          height: 10
        },
        shippingClass: 'standard'
      },
      stock: 100,
      isActive: true,
      features: ['Test Feature 1', 'Test Feature 2'],
      warranty: '1 year warranty',
      commission: 15,
      tags: ['test', 'physical'],
      createdBy: '65a123456789abcdef123456' // Replace with an actual admin ID
    });

    await digitalProduct.save();
    console.log('Digital test product created successfully');

    await physicalProduct.save();
    console.log('Physical test product created successfully');

    console.log('\nTest products created successfully. You can use these for payment testing:');
    console.log('1. Digital Product - ₹499');
    console.log('2. Physical Product - ₹999');
    console.log('\nTest Card Details:');
    console.log('Card Number: 4111 1111 1111 1111');
    console.log('Expiry: Any future date');
    console.log('CVV: Any 3 digits');
    console.log('3D Secure Password: 1221');

  } catch (error) {
    console.error('Error creating test products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createTestProduct(); 