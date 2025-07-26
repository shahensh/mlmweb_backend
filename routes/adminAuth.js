const express = require('express');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { JWT_SECRET } = require('../config');

// Admin Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// (Optional) Admin Registration
// router.post('/register', async (req, res) => { ... });

module.exports = router; 