const express = require('express');
const router = express.Router();
const News = require('../models/News');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');

// Get all published news (public)
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    const query = { status: 'published' };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const news = await News.find(query)
      .populate('author', 'firstName lastName')
      .sort({ publishDate: -1, featured: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await News.countDocuments(query);

    res.json({
      news,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching news', error: error.message });
  }
});

// Get single news article
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('author', 'firstName lastName');
    
    if (!news) {
      return res.status(404).json({ message: 'News article not found' });
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching news article', error: error.message });
  }
});

// Get all news (admin - includes drafts)
router.get('/admin/all', isAuth, isAdmin, async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const news = await News.find(query)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await News.countDocuments(query);

    res.json({
      news,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching news', error: error.message });
  }
});

// Create news article (admin only)
router.post('/', isAuth, isAdmin, async (req, res) => {
  try {
    const { title, subtitle, content, category, imageUrl, featured, status } = req.body;
    
    const news = new News({
      title,
      subtitle,
      content,
      category,
      imageUrl,
      featured,
      status,
      author: req.user.id,
      publishDate: status === 'published' ? new Date() : null
    });

    await news.save();
    
    const populatedNews = await News.findById(news._id)
      .populate('author', 'firstName lastName');

    res.status(201).json(populatedNews);
  } catch (error) {
    res.status(500).json({ message: 'Error creating news article', error: error.message });
  }
});

// Update news article (admin only)
router.put('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { title, subtitle, content, category, imageUrl, featured, status } = req.body;
    
    const news = await News.findById(req.params.id);
    
    if (!news) {
      return res.status(404).json({ message: 'News article not found' });
    }

    // If status is changing from draft to published, set publish date
    if (news.status === 'draft' && status === 'published') {
      news.publishDate = new Date();
    }

    news.title = title;
    news.subtitle = subtitle;
    news.content = content;
    news.category = category;
    news.imageUrl = imageUrl;
    news.featured = featured;
    news.status = status;

    await news.save();
    
    const populatedNews = await News.findById(news._id)
      .populate('author', 'firstName lastName');

    res.json(populatedNews);
  } catch (error) {
    res.status(500).json({ message: 'Error updating news article', error: error.message });
  }
});

// Delete news article (admin only)
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'News article not found' });
    }
    res.json({ message: 'News article deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting news article', error: error.message });
  }
});

module.exports = router; 