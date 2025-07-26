const express = require('express');
const router = express.Router();
const QnA = require('../models/QnA');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');

// Get all Q&As (public)
router.get('/', async (req, res) => {
  try {
    const qnas = await QnA.find()
      .populate('user', 'firstName lastName email')
      .populate('answeredBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(qnas);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Q&As', error: error.message });
  }
});

// Get user's Q&As
router.get('/my-questions', isAuth, async (req, res) => {
  try {
    const qnas = await QnA.find({ user: req.user.id })
      .populate('user', 'firstName lastName email')
      .populate('answeredBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(qnas);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your Q&As', error: error.message });
  }
});

// Ask a question (user)
router.post('/', isAuth, async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    const qna = new QnA({
      question,
      user: req.user.id
    });

    await qna.save();
    
    const populatedQna = await QnA.findById(qna._id)
      .populate('user', 'firstName lastName email')
      .populate('answeredBy', 'firstName lastName');
    
    res.status(201).json(populatedQna);
  } catch (error) {
    res.status(500).json({ message: 'Error creating question', error: error.message });
  }
});

// Answer a question (admin only)
router.put('/:id/answer', isAuth, isAdmin, async (req, res) => {
  try {
    const { answer } = req.body;
    
    if (!answer) {
      return res.status(400).json({ message: 'Answer is required' });
    }

    const qna = await QnA.findById(req.params.id);
    
    if (!qna) {
      return res.status(404).json({ message: 'Question not found' });
    }

    qna.answer = answer;
    qna.status = 'answered';
    qna.answeredBy = req.user.id;
    qna.answeredAt = new Date();

    await qna.save();
    
    const populatedQna = await QnA.findById(qna._id)
      .populate('user', 'firstName lastName email')
      .populate('answeredBy', 'firstName lastName');

    res.json(populatedQna);
  } catch (error) {
    res.status(500).json({ message: 'Error answering question', error: error.message });
  }
});

// Delete a question (admin only)
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const qna = await QnA.findByIdAndDelete(req.params.id);
    if (!qna) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting question', error: error.message });
  }
});

module.exports = router; 