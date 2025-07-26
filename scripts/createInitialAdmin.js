const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { MONGODB_URI } = require('../config');

const initialAdmin = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  password: 'admin123', // This will be hashed before saving
  phone: ''
};

async function createInitialAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: initialAdmin.email });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(initialAdmin.password, salt);

    // Create the admin user
    const admin = new Admin({
      ...initialAdmin,
      password: hashedPassword
    });

    await admin.save();
    console.log('Initial admin user created successfully');
    console.log('Email:', initialAdmin.email);
    console.log('Password:', initialAdmin.password);
    console.log('Please change these credentials after first login');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    process.exit(0);
  }
}

createInitialAdmin(); 