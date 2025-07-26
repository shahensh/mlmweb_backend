const express = require('express');
const router = express.Router();
const User = require('../models/User');
const isAuth = require('../middleware/isAuth');
const bcrypt = require('bcryptjs');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Helper function to upload buffer to cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const writeStream = cloudinary.uploader.upload_stream(
      { folder: "profile-images" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    const readStream = Readable.from(buffer);
    readStream.pipe(writeStream);
  });
};

// Get current user's profile
router.get('/profile', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile photo
router.post('/profile/photo', isAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer);
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.photo = result.secure_url;
    await user.save();
    
    res.json({ 
      message: 'Profile photo updated',
      photoUrl: result.secure_url 
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

// Upload cover image
router.post('/profile/cover', isAuth, upload.single('cover'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer);
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.coverImage = result.secure_url;
    await user.save();
    
    res.json({ 
      message: 'Cover image updated',
      coverUrl: result.secure_url 
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

// Update current user's profile (personal info)
router.put('/profile', isAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, location, dateOfBirth, gender, bio, socialLinks } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (location) user.location = location;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (bio) user.bio = bio;
    if (socialLinks) user.socialLinks = socialLinks;
    await user.save();
    res.json({ 
      message: 'Profile updated', 
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        location: user.location,
        photo: user.photo,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bio: user.bio,
        coverImage: user.coverImage,
        socialLinks: user.socialLinks
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/password', isAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 