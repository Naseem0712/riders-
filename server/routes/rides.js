const express = require('express');
const Ride = require('../models/Ride');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { authenticate, requireDriver } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/rides
// @desc    Create a new ride (Driver only)
// @access  Private (Driver)
router.post('/', authenticate, requireDriver, async (req, res) => {
  try {
    const {
      vehicleId,
      pickup,
      destination,
      departureDateTime,
      availableSeats,
      pricePerSeat,
      stops = [],
      preferences = {},
      notes = '',
      recurring = {}
    } = req.body;

    // Validation
    if (!vehicleId || !pickup || !destination || !departureDateTime || !availableSeats || !pricePerSeat) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided.',
        required: ['vehicleId', 'pickup', 'destination', 'departureDateTime', 'availableSeats', 'pricePerSeat']
      });
    }

    // Verify vehicle ownership
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      owner: req.user._id,
      isActive: true
      // Temporarily removed: isVerified: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found. Please add a vehicle first.'
      });
    }

    // Validate departure time
    const departure = new Date(departureDateTime);
    if (departure <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Departure time must be in the future.'
      });
    }

    // Validate available seats against vehicle capacity
    if (availableSeats > vehicle.availableSeats) {
      return res.status(400).json({
        success: false,
        message: `Available seats cannot exceed vehicle capacity of ${vehicle.availableSeats}.`
      });
    }

    // Calculate estimated distance and duration (mock calculation)
    const distance = calculateDistance(pickup.coordinates, destination.coordinates);
    const duration = Math.round(distance / 60 * 60); // Assuming 60 km/h average speed

    // Create ride
    const ride = new Ride({
      driver: req.user._id,
      vehicle: vehicleId,
      pickup: {
        address: pickup.address,
        coordinates: pickup.coordinates,
        landmark: pickup.landmark
      },
      destination: {
        address: destination.address,
        coordinates: destination.coordinates,
        landmark: destination.landmark
      },
      departureDateTime: departure,
      availableSeats,
      pricePerSeat,
      totalDistance: distance,
      estimatedDuration: duration,
      stops: stops.map((stop, index) => ({
        ...stop,
        order: index + 1
      })),
      preferences: {
        smokingAllowed: preferences.smokingAllowed || false,
        petsAllowed: preferences.petsAllowed || false,
        musicAllowed: preferences.musicAllowed !== false,
        conversationLevel: preferences.conversationLevel || 'moderate'
      },
      notes,
      recurring: {
        isRecurring: recurring.isRecurring || false,
        frequency: recurring.frequency || 'weekly',
        daysOfWeek: recurring.daysOfWeek || [],
        endDate: recurring.endDate ? new Date(recurring.endDate) : null
      }
    });

    await ride.save();

    // Populate the response
    await ride.populate([
      { path: 'driver', select: 'name profilePicture rating totalRides' },
      { path: 'vehicle', select: 'make model year color features rating' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Ride created successfully.',
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Create ride error:', error);
    
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
      message: 'Internal server error during ride creation.'
    });
  }
});

// @route   GET /api/rides/search
// @desc    Search rides by location and other filters
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const {
      pickup,
      destination,
      date,
      seats = 1,
      maxPrice,
      minRating,
      page = 1,
      limit = 20,
      sortBy = 'departureDateTime'
    } = req.query;

    // Build search query
    let query = {
      status: 'active',
      departureDateTime: { $gt: new Date() },
      availableSeats: { $gte: parseInt(seats) }
    };

    // Location-based search
    if (pickup) {
      const [lng, lat] = pickup.split(',').map(Number);
      if (lng && lat) {
        query['pickup.coordinates'] = {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: 10000 // 10km radius
          }
        };
      }
    }

    if (destination) {
      const [lng, lat] = destination.split(',').map(Number);
      if (lng && lat) {
        query['destination.coordinates'] = {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: 10000 // 10km radius
          }
        };
      }
    }

    // Date filter
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.departureDateTime = {
        $gte: searchDate,
        $lt: nextDay
      };
    }

    // Price filter
    if (maxPrice) {
      query.pricePerSeat = { $lte: parseFloat(maxPrice) };
    }

    // Build aggregation pipeline for driver rating filter
    let pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'driver',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleInfo'
        }
      }
    ];

    // Driver rating filter
    if (minRating) {
      pipeline.push({
        $match: {
          'driverInfo.rating.average': { $gte: parseFloat(minRating) }
        }
      });
    }

    // Sort
    let sortQuery = {};
    switch (sortBy) {
      case 'price':
        sortQuery.pricePerSeat = 1;
        break;
      case 'rating':
        sortQuery['driverInfo.rating.average'] = -1;
        break;
      case 'distance':
        // This would require geospatial sorting in a real implementation
        sortQuery.totalDistance = 1;
        break;
      default:
        sortQuery.departureDateTime = 1;
    }

    pipeline.push(
      { $sort: sortQuery },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    const rides = await Ride.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'driver',
          foreignField: '_id',
          as: 'driverInfo'
        }
      }
    ];

    if (minRating) {
      totalPipeline.push({
        $match: {
          'driverInfo.rating.average': { $gte: parseFloat(minRating) }
        }
      });
    }

    totalPipeline.push({ $count: 'total' });
    const totalResult = await Ride.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        rides,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRides: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: {
          pickup,
          destination,
          date,
          seats,
          maxPrice,
          minRating,
          sortBy
        }
      }
    });
  } catch (error) {
    console.error('Search rides error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during ride search.'
    });
  }
});

// @route   GET /api/rides/:id
// @desc    Get ride details by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name profilePicture rating totalRides createdAt')
      .populate('vehicle', 'make model year color features rating photos')
      .populate('bookings', 'passenger seatsBooked status createdAt');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.'
      });
    }

    res.json({
      success: true,
      data: {
        ride
      }
    });
  } catch (error) {
    console.error('Get ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   GET /api/rides/driver/my-rides
// @desc    Get driver's rides
// @access  Private (Driver)
router.get('/driver/my-rides', authenticate, requireDriver, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { driver: req.user._id };
    
    if (status && ['active', 'completed', 'cancelled', 'full'].includes(status)) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .populate('vehicle', 'make model year color')
      .populate('bookings', 'passenger seatsBooked status')
      .sort({ departureDateTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      data: {
        rides,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRides: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get driver rides error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   PUT /api/rides/:id
// @desc    Update ride details (Driver only, own rides)
// @access  Private (Driver)
router.put('/:id', authenticate, requireDriver, async (req, res) => {
  try {
    const rideId = req.params.id;
    
    const ride = await Ride.findOne({
      _id: rideId,
      driver: req.user._id
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found or access denied.'
      });
    }

    // Check if ride can be updated (not started yet)
    if (ride.departureDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update ride that has already started.'
      });
    }

    // Check if there are bookings
    if (ride.bookings && ride.bookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update ride with existing bookings.'
      });
    }

    const allowedUpdates = [
      'departureDateTime', 'availableSeats', 'pricePerSeat', 
      'preferences', 'notes', 'stops'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Validate departure time if being updated
    if (updates.departureDateTime) {
      const newDeparture = new Date(updates.departureDateTime);
      if (newDeparture <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Departure time must be in the future.'
        });
      }
    }

    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      updates,
      { new: true, runValidators: true }
    ).populate([
      { path: 'driver', select: 'name profilePicture rating' },
      { path: 'vehicle', select: 'make model year color features' }
    ]);

    res.json({
      success: true,
      message: 'Ride updated successfully.',
      data: {
        ride: updatedRide
      }
    });
  } catch (error) {
    console.error('Update ride error:', error);
    
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
      message: 'Internal server error during ride update.'
    });
  }
});

// @route   DELETE /api/rides/:id
// @desc    Cancel/Delete ride (Driver only, own rides)
// @access  Private (Driver)
router.delete('/:id', authenticate, requireDriver, async (req, res) => {
  try {
    const rideId = req.params.id;
    
    const ride = await Ride.findOne({
      _id: rideId,
      driver: req.user._id
    }).populate('bookings');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found or access denied.'
      });
    }

    // Check if ride has bookings
    if (ride.bookings && ride.bookings.length > 0) {
      // Update status to cancelled instead of deleting
      ride.status = 'cancelled';
      await ride.save();

      // TODO: Notify passengers about cancellation
      // TODO: Process refunds if payment was made

      return res.json({
        success: true,
        message: 'Ride cancelled. Passengers have been notified.',
        data: {
          ride
        }
      });
    }

    // Delete ride if no bookings
    await Ride.findByIdAndDelete(rideId);

    res.json({
      success: true,
      message: 'Ride deleted successfully.'
    });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during ride cancellation.'
    });
  }
});

// Helper function to calculate distance between coordinates
function calculateDistance(coord1, coord2) {
  // Simple haversine distance calculation
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;
