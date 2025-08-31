const express = require('express');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/bookings
// @desc    Book a ride
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      rideId,
      seatsBooked = 1,
      pickupLocation,
      dropLocation,
      specialRequests,
      contactDetails
    } = req.body;

    // Validation
    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: 'Ride ID is required.'
      });
    }

    // Get ride details
    const ride = await Ride.findById(rideId)
      .populate('driver', 'name email mobile')
      .populate('bookings');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.'
      });
    }

    // Check if ride is active and in future
    if (ride.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This ride is no longer available for booking.'
      });
    }

    if (ride.departureDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book a ride that has already started.'
      });
    }

    // Check if user is trying to book their own ride
    if (ride.driver._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own ride.'
      });
    }

    // Check if user already has a booking for this ride
    const existingBooking = await Booking.findOne({
      ride: rideId,
      passenger: req.user._id,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have a booking for this ride.'
      });
    }

    // Calculate booked seats
    const currentBookings = ride.bookings.filter(
      booking => booking.status === 'confirmed' || booking.status === 'pending'
    );
    const totalBookedSeats = currentBookings.reduce(
      (sum, booking) => sum + booking.seatsBooked, 0
    );

    // Check seat availability
    if (totalBookedSeats + seatsBooked > ride.availableSeats) {
      return res.status(400).json({
        success: false,
        message: `Only ${ride.availableSeats - totalBookedSeats} seats available.`
      });
    }

    // Calculate total amount
    const totalAmount = ride.pricePerSeat * seatsBooked;

    // Create booking
    const booking = new Booking({
      ride: rideId,
      passenger: req.user._id,
      seatsBooked,
      totalAmount,
      pickupLocation: pickupLocation || {
        address: ride.pickup.address,
        coordinates: ride.pickup.coordinates
      },
      dropLocation: dropLocation || {
        address: ride.destination.address,
        coordinates: ride.destination.coordinates
      },
      specialRequests,
      contactDetails: {
        phone: contactDetails?.phone || req.user.mobile,
        alternatePhone: contactDetails?.alternatePhone,
        emergencyContact: contactDetails?.emergencyContact
      },
      status: 'confirmed' // Auto-confirm for now, can add approval flow later
    });

    await booking.save();

    // Add booking to ride
    ride.bookings.push(booking._id);
    
    // Update ride status if full
    if (totalBookedSeats + seatsBooked >= ride.availableSeats) {
      ride.status = 'full';
    }
    
    await ride.save();

    // Populate booking for response
    await booking.populate([
      { path: 'ride', select: 'pickup destination departureDateTime pricePerSeat' },
      { path: 'passenger', select: 'name email mobile profilePicture' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Ride booked successfully!',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    
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
      message: 'Internal server error during booking.'
    });
  }
});

// @route   GET /api/bookings/my-bookings
// @desc    Get user's bookings
// @access  Private
router.get('/my-bookings', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, type = 'upcoming' } = req.query;

    let query = { passenger: req.user._id };
    
    // Filter by status
    if (status && ['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }

    // Filter by type (upcoming, past, all)
    if (type === 'upcoming') {
      query['ride.departureDateTime'] = { $gt: new Date() };
    } else if (type === 'past') {
      query['ride.departureDateTime'] = { $lt: new Date() };
    }

    const bookings = await Booking.find(query)
      .populate({
        path: 'ride',
        select: 'pickup destination departureDateTime pricePerSeat status driver vehicle',
        populate: [
          { path: 'driver', select: 'name profilePicture rating mobile' },
          { path: 'vehicle', select: 'make model year color licensePlate' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBookings: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   GET /api/bookings/driver/passengers
// @desc    Get passengers for driver's rides
// @access  Private (Driver)
router.get('/driver/passengers', authenticate, async (req, res) => {
  try {
    const { rideId, page = 1, limit = 20 } = req.query;

    let query = {};
    
    if (rideId) {
      // Get passengers for specific ride
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

      query.ride = rideId;
    } else {
      // Get all passengers for all driver's rides
      const driverRides = await Ride.find({ driver: req.user._id }).select('_id');
      const rideIds = driverRides.map(ride => ride._id);
      query.ride = { $in: rideIds };
    }

    const bookings = await Booking.find(query)
      .populate('passenger', 'name profilePicture mobile rating')
      .populate('ride', 'pickup destination departureDateTime')
      .sort({ 'ride.departureDateTime': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBookings: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get driver passengers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking details
// @access  Private (booking owner or ride driver)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'ride',
        populate: [
          { path: 'driver', select: 'name profilePicture rating mobile' },
          { path: 'vehicle', select: 'make model year color licensePlate features' }
        ]
      })
      .populate('passenger', 'name profilePicture rating mobile');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Check access rights
    const isPassenger = booking.passenger._id.toString() === req.user._id.toString();
    const isDriver = booking.ride.driver._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    res.json({
      success: true,
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel a booking
// @access  Private (booking owner only)
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const booking = await Booking.findById(req.params.id)
      .populate('ride', 'departureDateTime driver availableSeats');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Check if user owns the booking
    if (booking.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own bookings.'
      });
    }

    // Check if booking can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'This booking cannot be cancelled.'
      });
    }

    // Calculate cancellation fee
    const cancellationFee = booking.calculateCancellationFee(booking.ride.departureDateTime);
    const refundAmount = booking.totalAmount - cancellationFee;

    // Update booking
    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: req.user._id,
      cancelledAt: new Date(),
      reason: reason || 'Cancelled by passenger',
      refundAmount,
      cancellationFee
    };

    await booking.save();

    // Update ride status if it was full
    const ride = await Ride.findById(booking.ride._id);
    if (ride.status === 'full') {
      const activeBookings = await Booking.find({
        ride: ride._id,
        status: { $in: ['pending', 'confirmed'] }
      });
      
      const totalActiveSeats = activeBookings.reduce(
        (sum, b) => sum + b.seatsBooked, 0
      );

      if (totalActiveSeats < ride.availableSeats) {
        ride.status = 'active';
        await ride.save();
      }
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully.',
      data: {
        booking,
        refundAmount,
        cancellationFee
      }
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during booking cancellation.'
    });
  }
});

// @route   POST /api/bookings/:id/share-location
// @desc    Share location via WhatsApp
// @access  Private (booking owner only)
router.post('/:id/share-location', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('ride', 'driver pickup destination departureDateTime')
      .populate('passenger', 'name mobile');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Check if user owns the booking
    if (booking.passenger._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only share location for confirmed bookings.'
      });
    }

    // Generate WhatsApp share URL
    const message = `🚗 Riders Luxury - Live Location Update
    
📍 I'm traveling from ${booking.ride.pickup.address} to ${booking.ride.destination.address}
🕐 Departure: ${booking.ride.departureDateTime.toLocaleString()}
📋 Booking: ${booking.referenceNumber}

Track my location: https://maps.google.com/?q=${booking.pickupLocation.coordinates[1]},${booking.pickupLocation.coordinates[0]}

#RidersLuxury #SafeTravel`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    // Update booking to mark location as shared
    booking.whatsappShared = true;
    booking.locationSharedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: 'WhatsApp share URL generated successfully.',
      data: {
        whatsappUrl,
        message
      }
    });
  } catch (error) {
    console.error('Share location error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during location sharing.'
    });
  }
});

// @route   POST /api/bookings/:id/rate
// @desc    Rate a completed ride
// @access  Private (booking owner only)
router.post('/:id/rate', authenticate, async (req, res) => {
  try {
    const { rating, review, tags } = req.body;
    
    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5.'
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('ride', 'driver status');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Check if user owns the booking
    if (booking.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate your own bookings.'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only rate completed rides.'
      });
    }

    // Check if already rated
    if (booking.rating && booking.rating.forDriver && booking.rating.forDriver.score) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this ride.'
      });
    }

    // Add rating to booking
    booking.rating = {
      ...booking.rating,
      forDriver: {
        score: rating,
        review: review || '',
        tags: tags || []
      }
    };

    await booking.save();

    // Update driver's overall rating
    const driver = await User.findById(booking.ride.driver);
    const currentTotal = driver.rating.average * driver.rating.count;
    const newCount = driver.rating.count + 1;
    const newAverage = (currentTotal + rating) / newCount;

    driver.rating = {
      average: Math.round(newAverage * 10) / 10,
      count: newCount
    };

    await driver.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully.',
      data: {
        booking: booking.rating
      }
    });
  } catch (error) {
    console.error('Rate booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during rating submission.'
    });
  }
});

module.exports = router;
