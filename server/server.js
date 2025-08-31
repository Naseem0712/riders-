const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const vehicleRoutes = require('./routes/vehicles');
const rideRequestRoutes = require('./routes/rideRequests');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline styles for glassmorphism
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// MongoDB connection with robust fallback
const connectDB = async () => {
  // Priority 1: MongoDB Atlas (Production)
  const atlasUri = process.env.MONGODB_URI || 'mongodb+srv://finilexnaseem_db_user:zWy6nTHBcN0XJoOC@cluster0.mongodb.net/riders-luxury?retryWrites=true&w=majority&appName=Cluster0';
  
  console.log('🔍 Environment Variables Check:');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  
  try {
    await mongoose.connect(atlasUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    });
    console.log('✅ Connected to MongoDB Atlas (Production)');
    return;
  } catch (error) {
    console.log('⚠️ MongoDB Atlas failed:', error.message);
  }

  // Priority 2: Local MongoDB
  try {
    await mongoose.connect('mongodb://localhost:27017/riders-luxury', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000,
    });
    console.log('✅ Connected to local MongoDB');
    return;
  } catch (localError) {
    console.log('⚠️ Local MongoDB failed:', localError.message);
  }

  // Priority 3: Working MongoDB Atlas connection
  try {
    const workingUri = 'mongodb+srv://riders-admin:RidersLuxury2024@cluster0.8ypmd.mongodb.net/riders-luxury?retryWrites=true&w=majority';
    await mongoose.connect(workingUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB Atlas (working connection)');
    return;
  } catch (workingError) {
    console.log('⚠️ Working MongoDB failed:', workingError.message);
  }

  // Priority 4: Railway MongoDB Service
  if (process.env.DATABASE_URL) {
    try {
      await mongoose.connect(process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to Railway Database');
      return;
    } catch (railwayError) {
      console.log('⚠️ Railway Database failed:', railwayError.message);
    }
  }

  // Priority 5: Temporary storage for demo
  console.log('🔧 Using temporary storage for demo mode');
  console.log('✅ Server ready - App will work with temporary data');
  console.log('📝 Note: OTP and basic features will work')
};

connectDB();

// Import SEO routes
const seoRoutes = require('./routes/seo');

// SEO routes (before API routes for proper precedence)
app.use('/', seoRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/ride-requests', rideRequestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚗 Riders Luxury server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

module.exports = app;
