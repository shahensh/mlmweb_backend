const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');
const Ticket = require('../models/Ticket');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');

// Rate limiting
const ticketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 ticket creations per windowMs
  message: 'Too many tickets created from this IP, please try again later'
});

const responseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 responses per windowMs
  message: 'Too many responses from this IP, please try again later'
});

// Configure multer with better validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/tickets/';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

const cleanupFiles = (files) => {
  if (files && files.length > 0) {
    files.forEach(file => {
      try {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (err) {
        console.error('Error cleaning up file:', file.path, err);
      }
    });
  }
};

// Create a new ticket (User)
router.post('/', isAuth, ticketLimiter, upload.array('attachments'), async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    
    if (!subject || !description || !category) {
      cleanupFiles(req.files);
      return res.status(400).json({ 
        message: 'Subject, description, and category are required' 
      });
    }
    
    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path,
      uploadedAt: new Date(),
      size: file.size,
      mimeType: file.mimetype
    })) : [];

    const ticket = new Ticket({
      userId: req.user._id,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority: priority || 'medium',
      attachments
    });

    await ticket.save();
    
    res.status(201).json(ticket);
  } catch (error) {
    cleanupFiles(req.files);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum 5MB per file.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum 5 files allowed.' });
    }
    
    res.status(500).json({ message: error.message });
  }
});

// Get all tickets with pagination and filtering (Admin only)
router.get('/admin', isAuth, isAdmin, async (req, res) => {
  try {
    const { status, priority, category, assigned, search, page = 1, limit = 10 } = req.query;
    
    // Convert to numbers and validate
    const pageNum = Math.max(1, parseInt(page)) || 1;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))) || 10;

    const filter = {};
    
    // Apply filters
    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (category && category !== 'all') filter.category = category;
    if (assigned && assigned !== 'all') {
      filter.assignedAdminId = assigned === 'unassigned' ? null : assigned;
    }
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tickets = await Ticket.find(filter)
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('assignedAdminId', 'firstName lastName email')
      .populate('userId', 'firstName lastName email');

    const total = await Ticket.countDocuments(filter);

    res.json({
      tickets,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error while fetching tickets' });
  }
});

// Get single ticket (Admin version)
router.get('/admin/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('assignedAdminId', 'firstName lastName email')
      .populate('userId', 'firstName lastName email')
      .populate('responses.responderId', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ message: 'Server error while fetching ticket' });
  }
});

// Get user's tickets (User)
router.get('/my-tickets', isAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = { userId: req.user._id };
    
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const tickets = await Ticket.find(filter)
      .populate('assignedAdminId', 'firstName lastName')
      .sort('-createdAt');
      
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single ticket (User & Admin)
router.get('/:id', isAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('userId', 'firstName lastName email')
      .populate('responses.responderId');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Fixed: Check for both populated and unpopulated userId
    if (
      !req.user.isAdmin &&
      (
        !ticket.userId ||
        (ticket.userId._id
          ? ticket.userId._id.toString() !== req.user._id.toString()
          : ticket.userId.toString() !== req.user._id.toString())
      )
    ) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add response to ticket (User & Admin)
router.post('/:id/respond', isAuth, responseLimiter, upload.array('attachments'), async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      cleanupFiles(req.files);
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }
    
    const { message } = req.body;
    if (!message || !message.trim()) {
      cleanupFiles(req.files);
      return res.status(400).json({ message: 'Message is required' });
    }
    
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      cleanupFiles(req.files);
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const isOwner = req.user && req.user._id && 
                   ticket.userId.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.isAdmin;
    
    if (!isAdmin && !isOwner) {
      cleanupFiles(req.files);
      return res.status(403).json({ message: 'Not authorized to respond to this ticket' });
    }

    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path,
      uploadedAt: new Date(),
      size: file.size,
      mimeType: file.mimetype
    })) : [];

    const sanitizedMessage = ticket.sanitizeMessage(message.trim());

    const response = {
      responderId: req.user._id,
      responderType: req.user.isAdmin ? 'Admin' : 'User',
      message: sanitizedMessage,
      attachments,
      createdAt: new Date()
    };

    ticket.responses.push(response);
    
    // Update ticket status
    if (req.user.isAdmin && ticket.status === 'open') {
      ticket.status = 'in-progress';
    } else if (!req.user.isAdmin && ticket.status === 'resolved') {
      ticket.status = 'open'; // Reopen if user responds to resolved ticket
    }
    
    await ticket.save();
    
    // Populate response data
    await ticket.populate('responses.responderId', 'firstName lastName email isAdmin');

    res.status(201).json(ticket);
  } catch (error) {
    cleanupFiles(req.files);
    res.status(500).json({ message: error.message });
  }
});

// Update ticket status (Admin or Owner)
router.patch('/:id/status', isAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ 
        message: 'Valid status is required (open, in-progress, resolved, closed)' 
      });
    }
    
    const ticket = await Ticket.findById(req.params.id)
      .populate('userId', 'firstName lastName email');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const isOwner = req.user && req.user._id && 
                   ticket.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.isAdmin;
    
    // Only allow owner to change status to resolved or closed
    if (!isAdmin && (status === 'in-progress' || status === 'open')) {
      return res.status(403).json({ message: 'Not authorized to update this ticket status' });
    }

    ticket.status = status;
    await ticket.save();
    
    // Send notification if status changed to resolved/closed
    if (status === 'resolved' || status === 'closed') {
      // await sendTicketNotification(ticket);
    }
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign ticket to admin (Admin only)
router.patch('/:id/assign', isAdmin, async (req, res) => {
  try {
    const { adminId } = req.body;
    
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.assignedAdminId = adminId;
    if (ticket.status === 'open') {
      ticket.status = 'in-progress';
    }
    
    await ticket.save();
    
    // Send notification to assigned admin
    // await sendTicketNotification(ticket);
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update ticket priority (Admin only)
router.patch('/:id/priority', isAdmin, async (req, res) => {
  try {
    const { priority } = req.body;
    
    if (!priority || !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ 
        message: 'Valid priority is required (low, medium, high, urgent)' 
      });
    }
    
    const ticket = await Ticket.findById(req.params.id)
      .populate('userId', 'firstName lastName email');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.priority = priority;
    await ticket.save();
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rate ticket resolution (User only)
router.patch('/:id/rate', isAuth, async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Valid rating is required (1-5)' 
      });
    }
    
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const isOwner = req.user && req.user._id && 
                   ticket.userId.toString() === req.user._id.toString();
    
    if (!isOwner) {
      return res.status(403).json({ message: 'Not authorized to rate this ticket' });
    }

    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      return res.status(400).json({ 
        message: 'Ticket must be resolved or closed before rating' 
      });
    }

    ticket.satisfactionRating = rating;
    await ticket.save();
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete ticket (Admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Clean up associated files
    const allAttachments = [
      ...ticket.attachments,
      ...ticket.responses.flatMap(response => response.attachments)
    ];
    
    allAttachments.forEach(attachment => {
      try {
        if (attachment.path && fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      } catch (err) {
        console.error('Error deleting file:', attachment.path, err);
      }
    });

    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get ticket statistics (Admin only)
router.get('/stats/overview', isAdmin, async (req, res) => {
  try {
    const [totalTickets, openTickets, inProgressTickets, resolvedTickets, closedTickets,
           urgentTickets, highPriorityTickets, avgRating] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in-progress' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.countDocuments({ status: 'closed' }),
      Ticket.countDocuments({ priority: 'urgent' }),
      Ticket.countDocuments({ priority: 'high' }),
      Ticket.aggregate([
        { $match: { satisfactionRating: { $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: "$satisfactionRating" } } }
      ])
    ]);
    
    res.json({
      total: totalTickets,
      byStatus: {
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        closed: closedTickets
      },
      byPriority: {
        urgent: urgentTickets,
        high: highPriorityTickets
      },
      avgRating: avgRating.length > 0 ? Math.round(avgRating[0].avgRating * 10) / 10 : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;














// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const Ticket = require('../models/Ticket');
// const isAuth = require('../middleware/isAuth');
// const isAdmin = require('../middleware/isAdmin');

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadPath = 'uploads/tickets/';
//     fs.mkdirSync(uploadPath, { recursive: true });
//     cb(null, uploadPath);
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024 // 5MB limit
//   }
// });

// // Create a new ticket (User)
// router.post('/', isAuth, upload.array('attachments'), async (req, res) => {
//   try {
//     const { subject, description, category, priority } = req.body;
    
//     const attachments = req.files ? req.files.map(file => ({
//       filename: file.originalname,
//       path: file.path,
//       uploadedAt: Date.now()
//     })) : [];

//     const ticket = new Ticket({
//       userId: req.user._id,
//       subject,
//       description,
//       category,
//       priority,
//       attachments
//     });

//     await ticket.save();
//     res.status(201).json(ticket);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });

// // Get all tickets (Admin)
// router.get('/admin', isAdmin, async (req, res) => {
//   try {
//     const tickets = await Ticket.find()
//       .populate('userId', 'firstName lastName email')
//       .sort('-createdAt');
//     res.json(tickets);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get user's tickets (User)
// router.get('/my-tickets', isAuth, async (req, res) => {
//   try {
//     const tickets = await Ticket.find({ userId: req.user._id })
//       .sort('-createdAt');
//     res.json(tickets);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get single ticket (User & Admin)
// router.get('/:id', isAuth, async (req, res) => {
//   try {
//     const ticket = await Ticket.findById(req.params.id)
//       .populate('userId', 'firstName lastName email')
//       .populate('responses.responderId');

//     if (!ticket) {
//       return res.status(404).json({ message: 'Ticket not found' });
//     }

//     // Check if user is authorized to view this ticket
//     if (!req.user.isAdmin && ticket.userId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized to view this ticket' });
//     }

//     res.json(ticket);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Add response to ticket (User & Admin)
// router.post('/:id/respond', isAuth, upload.array('attachments'), async (req, res) => {
//   try {
//     const ticket = await Ticket.findById(req.params.id);
//     if (!ticket) {
//       return res.status(404).json({ message: 'Ticket not found' });
//     }

//     // Check if user is authorized to respond to this ticket
//     if (!req.user.isAdmin && ticket.userId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized to respond to this ticket' });
//     }

//     const attachments = req.files ? req.files.map(file => ({
//       filename: file.originalname,
//       path: file.path,
//       uploadedAt: Date.now()
//     })) : [];

//     const response = {
//       responderId: req.user._id,
//       responderType: req.user.isAdmin ? 'Admin' : 'User',
//       message: req.body.message,
//       attachments
//     };

//     ticket.responses.push(response);
//     await ticket.save();

//     res.status(201).json(ticket);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Update ticket status (Admin only)
// router.patch('/:id/status', isAdmin, async (req, res) => {
//   try {
//     const { status } = req.body;
//     const ticket = await Ticket.findById(req.params.id);
    
//     if (!ticket) {
//       return res.status(404).json({ message: 'Ticket not found' });
//     }

//     ticket.status = status;
//     await ticket.save();
    
//     res.json(ticket);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get all tickets (Admin, root path)
// router.get('/', isAdmin, async (req, res) => {
//   try {
//     const tickets = await Ticket.find()
//       .populate('userId', 'firstName lastName email')
//       .sort('-createdAt');
//     res.json(tickets);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// module.exports = router; 