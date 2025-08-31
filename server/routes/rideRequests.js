const express = require('express');
const RideRequest = require('../models/RideRequest');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/ride-requests
// @desc    Create a new ride request
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      pickup,
      destination,
      preferredDateTime,
      vehicleType,
      seatsNeeded,
      budgetPerSeat,
      preferences = {},
      notes = '',
      priority = 'medium'
    } = req.body;

    // Validation
    if (!pickup || !destination || !preferredDateTime || !vehicleType || !seatsNeeded || !budgetPerSeat) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided.',
        required: ['pickup', 'destination', 'preferredDateTime', 'vehicleType', 'seatsNeeded', 'budgetPerSeat']
      });
    }

    // Create ride request
    const rideRequest = new RideRequest({
      passenger: req.user._id,
      pickup: {
        address: pickup.address,
        coordinates: pickup.coordinates
      },
      destination: {
        address: destination.address,
        coordinates: destination.coordinates
      },
      preferredDateTime: new Date(preferredDateTime),
      vehicleType,
      seatsNeeded: parseInt(seatsNeeded),
      budgetPerSeat: parseFloat(budgetPerSeat),
      preferences: {
        smokingAllowed: preferences.smokingAllowed || false,
        petsAllowed: preferences.petsAllowed || false,
        musicAllowed: preferences.musicAllowed !== false,
        femaleOnly: preferences.femaleOnly || false,
        acRequired: preferences.acRequired || false
      },
      notes,
      priority,
      contactInfo: {
        phone: req.user.mobile,
        whatsappNumber: req.user.mobile
      }
    });

    await rideRequest.save();

    // Find and notify matching drivers
    await notifyMatchingDrivers(rideRequest);

    // Populate response
    await rideRequest.populate('passenger', 'name profilePicture rating mobile');

    res.status(201).json({
      success: true,
      message: 'Ride request created successfully! We\'ll notify you when matching drivers are found.',
      data: {
        rideRequest
      }
    });
  } catch (error) {
    console.error('Create ride request error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during ride request creation.'
    });
  }
});

// @route   GET /api/ride-requests/my-requests
// @desc    Get user's ride requests
// @access  Private
router.get('/my-requests', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { passenger: req.user._id };
    
    if (status && ['active', 'matched', 'cancelled', 'expired'].includes(status)) {
      query.status = status;
    }

    const rideRequests = await RideRequest.find(query)
      .populate('matchedRides', 'driver pickup destination departureDateTime pricePerSeat')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RideRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        rideRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRequests: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get ride requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   GET /api/ride-requests/for-drivers
// @desc    Get ride requests for drivers based on their routes
// @access  Private (Driver)
router.get('/for-drivers', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'driver' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Driver access required.'
      });
    }

    const { pickup, destination, radius = 5000 } = req.query;

    let query = {
      status: 'active',
      preferredDateTime: { $gt: new Date() }
    };

    // If driver provides route, find nearby requests
    if (pickup && destination) {
      const pickupCoords = pickup.split(',').map(Number);
      const destinationCoords = destination.split(',').map(Number);
      
      query.$or = [
        {
          'pickup.coordinates': {
            $near: {
              $geometry: { type: 'Point', coordinates: pickupCoords },
              $maxDistance: parseInt(radius)
            }
          }
        },
        {
          'destination.coordinates': {
            $near: {
              $geometry: { type: 'Point', coordinates: destinationCoords },
              $maxDistance: parseInt(radius)
            }
          }
        }
      ];
    }

    const rideRequests = await RideRequest.find(query)
      .populate('passenger', 'name profilePicture rating mobile')
      .sort({ urgencyScore: -1, createdAt: -1 })
      .limit(20);

    // Add virtual urgencyScore to results
    const requestsWithUrgency = rideRequests.map(req => ({
      ...req.toObject(),
      urgencyScore: req.urgencyScore,
      ageInHours: req.ageInHours
    }));

    res.json({
      success: true,
      data: {
        rideRequests: requestsWithUrgency,
        total: requestsWithUrgency.length
      }
    });
  } catch (error) {
    console.error('Get ride requests for drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   POST /api/ride-requests/:id/respond
// @desc    Driver responds to ride request
// @access  Private (Driver)
router.post('/:id/respond', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'driver' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Driver access required.'
      });
    }

    const { response, rideId } = req.body; // response: 'interested' or 'declined'
    
    if (!['interested', 'declined'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response. Must be "interested" or "declined".'
      });
    }

    const rideRequest = await RideRequest.findById(req.params.id);
    
    if (!rideRequest) {
      return res.status(404).json({
        success: false,
        message: 'Ride request not found.'
      });
    }

    // Find existing notification
    const notification = rideRequest.notifications.find(
      n => n.driverId.toString() === req.user._id.toString()
    );

    if (notification) {
      notification.response = response;
    } else {
      rideRequest.notifications.push({
        driverId: req.user._id,
        response,
        notifiedAt: new Date()
      });
    }

    // If interested and rideId provided, add to matched rides
    if (response === 'interested' && rideId) {
      if (!rideRequest.matchedRides.includes(rideId)) {
        rideRequest.matchedRides.push(rideId);
      }
      
      // Update status to matched if not already
      if (rideRequest.status === 'active') {
        rideRequest.status = 'matched';
      }
    }

    await rideRequest.save();

    res.json({
      success: true,
      message: `Response recorded successfully. Passenger will be notified.`,
      data: {
        response,
        rideRequest: {
          id: rideRequest._id,
          status: rideRequest.status,
          matchedRides: rideRequest.matchedRides.length
        }
      }
    });
  } catch (error) {
    console.error('Respond to ride request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   PUT /api/ride-requests/:id/cancel
// @desc    Cancel ride request
// @access  Private (request owner only)
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const rideRequest = await RideRequest.findById(req.params.id);
    
    if (!rideRequest) {
      return res.status(404).json({
        success: false,
        message: 'Ride request not found.'
      });
    }

    // Check ownership
    if (rideRequest.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own ride requests.'
      });
    }

    if (rideRequest.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Ride request is already cancelled.'
      });
    }

    rideRequest.status = 'cancelled';
    rideRequest.notes = `${rideRequest.notes}\n\nCancelled: ${reason || 'No reason provided'}`.trim();

    await rideRequest.save();

    res.json({
      success: true,
      message: 'Ride request cancelled successfully.',
      data: {
        rideRequest
      }
    });
  } catch (error) {
    console.error('Cancel ride request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Helper function to notify matching drivers
async function notifyMatchingDrivers(rideRequest) {
  try {
    // Find drivers with rides on similar routes
    const drivers = await User.find({
      role: 'driver',
      isActive: true
    }).select('_id name mobile');

    // In a real app, you would:
    // 1. Find drivers with vehicles matching the requested type
    // 2. Check drivers who have rides on similar routes
    // 3. Send push notifications
    // 4. Send SMS/WhatsApp notifications
    
    console.log(`🔔 Notifying ${drivers.length} drivers about new ride request from ${rideRequest.pickup.address} to ${rideRequest.destination.address}`);
    
    // For now, just log the notification
    // In production, integrate with Firebase/OneSignal for push notifications
    
    return drivers.length;
  } catch (error) {
    console.error('Error notifying drivers:', error);
    return 0;
  }
}

module.exports = router;
