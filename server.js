require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const path = require('path');
const server = require("socket.io");
const http = require('http');


const app = express();
const server = http.createServer(app);


// Middleware
const allowedOrigins = ['http://localhost:3000', 'https://mlmweb-ytcp.vercel.app'];
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');
});
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
connectDB();

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const contentRoutes = require('./routes/content');
const faqRoutes = require('./routes/faq');
const qnaRoutes = require('./routes/qna');
const newsRoutes = require('./routes/news');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const adminAuthRoutes = require('./routes/adminAuth');
const adminProfileRoutes = require('./routes/adminProfile');
const coursesRouter = require('./routes/courses');
const ticketsRoutes = require('./routes/tickets');

// Serve uploads directory for ticket attachments
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/qna', qnaRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/courses', coursesRouter);
app.use('/api/tickets', ticketsRoutes);

// Admin Routes - Order matters here!
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/profile', adminProfileRoutes);
app.use('/api/admin', adminRoutes);

// Friendly root route
app.get('/', (req, res) => {
  res.send('Welcome to the MLMWeb Backend API. Visit /api/test for a health check.');
});

// Debug route to test server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 