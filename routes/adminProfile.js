const express = require('express');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const router = express.Router();
const isAdminAuth = require('../middleware/isAdminAuth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

///Test route - no auth required
router.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Admin profile routes are working' });
});

// Get current admin profile
router.get('/', isAdminAuth, async (req, res) => {
  // console.log('=== Admin Profile Route ===');
  // console.log('Headers:', req.headers);
  // console.log('Admin ID from token:', req.admin?.id);
  try {
    // console.log('Attempting to find admin in database...');
    const admin = await Admin.findById(req.admin.id).select('-password');
    // console.log('Database query completed');
    // console.log('Found admin:', admin);
    if (!admin) {
      // console.log('Admin not found in database');
      return res.status(404).json({ message: 'Admin not found' });
    }
    // console.log('Sending admin data in response');
    res.json(admin);
  } catch (err) {
    // console.error('Error in admin profile route:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update admin profile
router.put('/', isAdminAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const update = { firstName, lastName, email, phone };
    const admin = await Admin.findByIdAndUpdate(req.admin.id, update, { new: true, runValidators: true }).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile image
router.post('/upload-profile-image', isAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'admin-profiles',
      resource_type: 'auto'
    });

    // Get the admin
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    // If there's an existing image, delete it from Cloudinary
    if (admin.profileImage?.publicId) {
      await cloudinary.uploader.destroy(admin.profileImage.publicId);
    }

    // Update admin profile with new image
    admin.profileImage = {
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    };
    await admin.save();

    res.json({ message: 'Profile image updated successfully', profileImage: admin.profileImage });
  } catch (err) {
    console.error('Error uploading profile image:', err);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Upload cover image
router.post('/upload-cover-image', isAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'admin-covers',
      resource_type: 'auto'
    });

    // Get the admin
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    // If there's an existing image, delete it from Cloudinary
    if (admin.coverImage?.publicId) {
      await cloudinary.uploader.destroy(admin.coverImage.publicId);
    }

    // Update admin profile with new cover image
    admin.coverImage = {
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    };
    await admin.save();

    res.json({ message: 'Cover image updated successfully', coverImage: admin.coverImage });
  } catch (err) {
    console.error('Error uploading cover image:', err);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Delete profile image
router.delete('/profile-image', isAdminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (admin.profileImage?.publicId) {
      await cloudinary.uploader.destroy(admin.profileImage.publicId);
      admin.profileImage = undefined;
      await admin.save();
    }

    res.json({ message: 'Profile image removed successfully' });
  } catch (err) {
    console.error('Error deleting profile image:', err);
    res.status(500).json({ message: 'Error deleting image' });
  }
});

// Delete cover image
router.delete('/cover-image', isAdminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (admin.coverImage?.publicId) {
      await cloudinary.uploader.destroy(admin.coverImage.publicId);
      admin.coverImage = undefined;
      await admin.save();
    }

    res.json({ message: 'Cover image removed successfully' });
  } catch (err) {
    console.error('Error deleting cover image:', err);
    res.status(500).json({ message: 'Error deleting image' });
  }
});

// Change admin password
router.put('/password', isAdminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 