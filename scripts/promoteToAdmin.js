const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGODB_URI } = require('../config');
const User = require('../models/User');
const Admin = require('../models/Admin');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/promoteToAdmin.js user@example.com');
  process.exit(1);
}

async function promoteToAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    // Check if admin already exists with this email
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.error('Admin already exists with this email');
      process.exit(1);
    }

    // Create new admin entry
    const admin = new Admin({
      firstName: user.firstName || 'Admin',
      lastName: user.lastName || 'User',
      email: user.email,
      password: user.password, // Copy the existing password hash
      phone: user.phone || '',
      profileImage: user.profileImage || ''
    });

    await admin.save();

    // Remove user from User collection
    await User.findByIdAndDelete(user._id);

    console.log(`User ${email} successfully migrated to admin`);
    console.log('User removed from User collection');
    console.log('Admin entry created in Admin collection');
    process.exit(0);
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    process.exit(1);
  }
}

promoteToAdmin(); 