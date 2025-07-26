const express = require('express');
const router = express.Router();
const FAQ = require('../models/FAQ');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');

// Get all FAQs (public)
router.get('/', async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FAQs', error: error.message });
  }
});

// Create new FAQ (admin only)
router.post('/', isAuth, isAdmin, async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' });
    }

    const faq = new FAQ({
      question,
      answer
    });

    await faq.save();
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error creating FAQ', error: error.message });
  }
});

// Delete FAQ (admin only)
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting FAQ', error: error.message });
  }
});

module.exports = router; 