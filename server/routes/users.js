const express = require('express');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile/:id
// @desc    Get user profile by ID
// @access  Public (basic info only)
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name profilePicture rating totalRides createdAt role')
      .populate('vehicles', 'make model year color vehicleType rating');

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   POST /api/users/become-driver
// @desc    Upgrade user to driver
// @access  Private
router.post('/become-driver', authenticate, async (req, res) => {
  try {
    const { drivingLicense } = req.body;

    if (!drivingLicense || !drivingLicense.number || !drivingLicense.expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Driving license number and expiry date are required.'
      });
    }

    const user = await User.findById(req.user._id);

    if (user.role === 'driver') {
      return res.status(400).json({
        success: false,
        message: 'You are already a driver.'
      });
    }

    // Update user to driver
    user.role = 'driver';
    user.drivingLicense = {
      number: drivingLicense.number,
      expiryDate: new Date(drivingLicense.expiryDate),
      isVerified: false
    };

    await user.save();

    res.json({
      success: true,
      message: 'Successfully upgraded to driver. Your license is pending verification.',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Become driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   GET /api/users/drivers
// @desc    Get all verified drivers
// @access  Public
router.get('/drivers', async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, city } = req.query;
    
    const query = {
      role: 'driver',
      isActive: true,
      'drivingLicense.isVerified': true
    };

    // Filter by minimum rating
    if (rating) {
      query['rating.average'] = { $gte: parseFloat(rating) };
    }

    const drivers = await User.find(query)
      .select('name profilePicture rating totalRides createdAt')
      .populate('vehicles', 'make model year color vehicleType rating features')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ 'rating.average': -1, 'totalRides.asDriver': -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        drivers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalDrivers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('vehicles')
      .select('totalRides rating role createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Get additional stats based on role
    let additionalStats = {};
    
    if (user.role === 'driver') {
      // Driver-specific stats would go here
      // For now, we'll use basic vehicle count
      additionalStats = {
        vehiclesRegistered: user.vehicles ? user.vehicles.length : 0,
        averageVehicleRating: user.vehicles && user.vehicles.length > 0 
          ? user.vehicles.reduce((sum, v) => sum + v.rating.average, 0) / user.vehicles.length 
          : 0
      };
    }

    const stats = {
      memberSince: user.createdAt,
      totalRides: user.totalRides,
      rating: user.rating,
      role: user.role,
      ...additionalStats
    };

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   POST /api/users/rate/:id
// @desc    Rate a user after a ride
// @access  Private
router.post('/rate/:id', authenticate, async (req, res) => {
  try {
    const { rating, review, rideId } = req.body;
    const userToRateId = req.params.id;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5.'
      });
    }

    if (req.user._id.toString() === userToRateId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot rate yourself.'
      });
    }

    // TODO: Verify that the user actually had a ride with the person they're rating
    // This would require checking the Booking model

    const userToRate = await User.findById(userToRateId);

    if (!userToRate) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Calculate new rating
    const currentTotal = userToRate.rating.average * userToRate.rating.count;
    const newCount = userToRate.rating.count + 1;
    const newAverage = (currentTotal + rating) / newCount;

    userToRate.rating = {
      average: Math.round(newAverage * 10) / 10, // Round to 1 decimal place
      count: newCount
    };

    await userToRate.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully.',
      data: {
        newRating: userToRate.rating
      }
    });
  } catch (error) {
    console.error('Rate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   PUT /api/users/deactivate
// @desc    Deactivate user account
// @access  Private
router.put('/deactivate', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully.'
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   PUT /api/users/reactivate
// @desc    Reactivate user account
// @access  Public (but requires valid credentials)
router.put('/reactivate', async (req, res) => {
  try {
    const { email, mobile, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required for reactivation.'
      });
    }

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Email or mobile number is required.'
      });
    }

    // Build query
    let query = { isActive: false };
    if (email) {
      query.email = email.toLowerCase();
    } else if (mobile) {
      query.mobile = mobile;
    }

    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Deactivated account not found.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: 'Account reactivated successfully. You can now login.'
    });
  } catch (error) {
    console.error('Reactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

module.exports = router;
