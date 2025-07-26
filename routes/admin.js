const express = require('express');
const User = require('../models/User');
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();
const isAuth = require('../middleware/isAuth');

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user profile
router.get('/profile', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update current user profile
router.put('/profile', isAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, profileImage } = req.body;
    const update = { firstName, lastName, email, phone, profileImage };
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true }).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/profile/password', isAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Check current password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 