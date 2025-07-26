const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Course = require('../models/Course');
const CoursePurchase = require('../models/CoursePurchase');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');
const isAdminAuth = require('../middleware/isAdminAuth');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Determine upload path based on file type
    if (file.fieldname === 'thumbnail') {
      uploadPath += 'thumbnails/';
    } else if (file.fieldname.startsWith('video_')) {
      uploadPath += 'videos/';
    }
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed for thumbnails!'), false);
      }
    } else if (file.fieldname.startsWith('video_')) {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files are allowed!'), false);
      }
    }
    cb(null, true);
  }
});

// Get all courses (public)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find()
      .sort('-createdAt');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single course (public)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create course (admin only)
router.post('/admin/courses', isAdminAuth, upload.any(), async (req, res) => {
  try {
    const files = req.files;
    const thumbnail = files.find(f => f.fieldname === 'thumbnail');

    // Parse modules from form data
    const modules = [];
    let moduleIndex = 0;
    while (req.body[`modules[${moduleIndex}][title]`]) {
      const module = {
        title: req.body[`modules[${moduleIndex}][title]`],
        description: req.body[`modules[${moduleIndex}][description]`] || '',
        videos: []
      };

      let videoIndex = 0;
      while (req.body[`modules[${moduleIndex}][videos][${videoIndex}][title]`]) {
        const video = {
          title: req.body[`modules[${moduleIndex}][videos][${videoIndex}][title]`],
          description: req.body[`modules[${moduleIndex}][videos][${videoIndex}][description]`] || '',
          duration: req.body[`modules[${moduleIndex}][videos][${videoIndex}][duration]`] || '',
          _id: req.body[`modules[${moduleIndex}][videos][${videoIndex}][_id]`] || null
        };

        // Find video file - either new upload or existing path
        const videoFile = files.find(f => 
          f.fieldname === `modules[${moduleIndex}][videos][${videoIndex}][videoFile]`
        );
        
        video.videoFile = videoFile 
          ? videoFile.path 
          : req.body[`modules[${moduleIndex}][videos][${videoIndex}][videoFilePath]`];

        module.videos.push(video);
        videoIndex++;
      }

      modules.push(module);
      moduleIndex++;
    }

    const course = new Course({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      level: req.body.level,
      duration: req.body.duration,
      thumbnail: thumbnail ? thumbnail.path : null,
      modules: modules
    });

    const savedCourse = await course.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      details: error.stack 
    });
  }
});

// Update course (admin only)
router.put('/admin/courses/:id', isAdminAuth, upload.any(), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const files = req.files;
    const thumbnail = files.find(f => f.fieldname === 'thumbnail');

    // Parse modules from form data (same as create)
    const modules = [];
    let moduleIndex = 0;
    while (req.body[`modules[${moduleIndex}][title]`]) {
      const module = {
        title: req.body[`modules[${moduleIndex}][title]`],
        description: req.body[`modules[${moduleIndex}][description]`] || '',
        videos: []
      };

      let videoIndex = 0;
      while (req.body[`modules[${moduleIndex}][videos][${videoIndex}][title]`]) {
        const video = {
          title: req.body[`modules[${moduleIndex}][videos][${videoIndex}][title]`],
          description: req.body[`modules[${moduleIndex}][videos][${videoIndex}][description]`] || '',
          duration: req.body[`modules[${moduleIndex}][videos][${videoIndex}][duration]`] || '',
          _id: req.body[`modules[${moduleIndex}][videos][${videoIndex}][_id]`] || null
        };

        // Find video file - either new upload or existing path
        const videoFile = files.find(f => 
          f.fieldname === `modules[${moduleIndex}][videos][${videoIndex}][videoFile]`
        );
        video.videoFile = videoFile 
          ? videoFile.path 
          : req.body[`modules[${moduleIndex}][videos][${videoIndex}][videoFilePath]`];

        module.videos.push(video);
        videoIndex++;
      }

      modules.push(module);
      moduleIndex++;
    }

    // Process thumbnail if new one uploaded
    if (thumbnail) {
      // Delete old thumbnail if exists
      if (course.thumbnail) {
        fs.unlink(course.thumbnail, (err) => {
          if (err) console.error('Error deleting old thumbnail:', err);
        });
      }
      course.thumbnail = thumbnail.path;
    }

    course.title = req.body.title;
    course.description = req.body.description;
    course.price = req.body.price;
    course.level = req.body.level;
    course.duration = req.body.duration;
    course.modules = modules;

    const updatedCourse = await course.save();
    res.json(updatedCourse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete course (admin only)
router.delete('/admin/courses/:id', isAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Delete associated files
    if (course.thumbnail) {
      fs.unlink(course.thumbnail, (err) => {
        if (err) console.error('Error deleting thumbnail:', err);
      });
    }

    course.modules.forEach(module => {
      module.videos.forEach(video => {
        if (video.videoFile) {
          fs.unlink(video.videoFile, (err) => {
            if (err) console.error('Error deleting video:', err);
          });
        }
      });
    });

    await course.remove();
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Purchase course (auth required)
router.post('/:id/purchase', isAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user already purchased the course
    const existingPurchase = await CoursePurchase.findOne({
      userId: req.user._id,
      courseId: course._id,
      status: 'completed'
    });

    if (existingPurchase) {
      return res.status(400).json({ message: 'You have already purchased this course' });
    }

    // Create a new purchase record
    const purchase = new CoursePurchase({
      userId: req.user._id,
      courseId: course._id,
      amount: course.price
    });

    await purchase.save();
    res.status(201).json(purchase);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get purchased courses (auth required)
router.get('/my/purchases', isAuth, async (req, res) => {
  try {
    const purchases = await CoursePurchase.find({
      userId: req.user._id,
      status: 'completed'
    })
    .populate('courseId')
    .sort('-purchaseDate');

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get course video (auth required + purchase verification)
router.get('/:courseId/videos/:videoId', isAuth, async (req, res) => {
  try {
    // Verify purchase
    const purchase = await CoursePurchase.findOne({
      userId: req.user._id,
      courseId: req.params.courseId,
      status: 'completed'
    });

    if (!purchase) {
      return res.status(403).json({ message: 'Please purchase this course to access videos' });
    }

    // Find course and video
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    let videoFile = null;
    course.modules.forEach(module => {
      module.videos.forEach(video => {
        if (video._id.toString() === req.params.videoId) {
          videoFile = video.videoFile;
        }
      });
    });

    if (!videoFile) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Stream the video
    const stat = fs.statSync(videoFile);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
      const chunksize = (end-start)+1;
      const file = fs.createReadStream(videoFile, {start, end});
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoFile).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Razorpay order for course purchase
router.post('/:id/create-order', isAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already purchased
    const existing = await CoursePurchase.findOne({
      userId: req.user._id,
      courseId: course._id,
      status: 'completed'
    });
    if (existing) {
      return res.status(400).json({ message: 'You have already purchased this course' });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: course.price * 100, // in paise
      currency: 'INR',
      receipt: `course_${course._id}_${Date.now()}`,
      payment_capture: 1
    });

    // Store a pending purchase
    await CoursePurchase.create({
      userId: req.user._id,
      courseId: course._id,
      amount: course.price,
      orderId: razorpayOrder.id,
      status: 'pending'
    });

    res.json({ razorpayOrder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify Razorpay payment for course purchase
router.post('/verify-payment', isAuth, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !courseId) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update purchase record
    const purchase = await CoursePurchase.findOneAndUpdate(
      {
        userId: req.user._id,
        courseId,
        orderId: razorpayOrderId,
        status: 'pending'
      },
      {
        paymentId: razorpayPaymentId,
        status: 'completed',
        purchaseDate: new Date()
      },
      { new: true }
    );
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase record not found' });
    }
    res.json({ message: 'Payment verified and course purchased', purchase });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 