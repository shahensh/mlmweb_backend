const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const isAdmin = require('../middleware/isAdmin');
const isAuth = require('../middleware/isAuth');

// POST: Create a new piece of content (Admin Only)
router.post('/', isAuth, isAdmin, async (req, res) => {
  try {
    const { title, description, type, url, thumbnail, tags, accessLevel, date } = req.body;
    if (!title || !type) {
      return res.status(400).json({ message: 'Title and type are required' });
    }
    const newContent = new Content({
      title,
      description,
      type,
      url,
      thumbnail,
      tags,
      accessLevel,
      date,
      createdBy: req.user.id,
    });
    const savedContent = await newContent.save();
    res.status(201).json(savedContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Get all content, with optional filtering by type (Public)
router.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = {};
    if (type) {
      filter.type = type;
    }
    if (search) {
      filter.$text = { $search: search };
    }
    const content = await Content.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName');
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Get a single piece of content by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT: Update a piece of content (Admin Only)
router.put('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedContent) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(updatedContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE: Delete a piece of content (Admin Only)
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const deletedContent = await Content.findByIdAndDelete(req.params.id);
    if (!deletedContent) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 