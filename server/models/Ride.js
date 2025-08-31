const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  pickup: {
    address: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true,
      maxlength: [200, 'Pickup address cannot exceed 200 characters']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates format'
      }
    },
    landmark: String
  },
  destination: {
    address: {
      type: String,
      required: [true, 'Destination address is required'],
      trim: true,
      maxlength: [200, 'Destination address cannot exceed 200 characters']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates format'
      }
    },
    landmark: String
  },
  departureDateTime: {
    type: Date,
    required: [true, 'Departure date and time is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Departure time must be in the future'
    }
  },
  availableSeats: {
    type: Number,
    required: [true, 'Available seats is required'],
    min: [1, 'At least 1 seat must be available'],
    max: [7, 'Maximum 7 seats can be available']
  },
  pricePerSeat: {
    type: Number,
    required: [true, 'Price per seat is required'],
    min: [0, 'Price cannot be negative'],
    max: [10000, 'Price per seat cannot exceed ₹10,000']
  },
  totalDistance: {
    type: Number, // in kilometers
    required: true,
    min: [0.1, 'Distance must be at least 0.1 km']
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true,
    min: [1, 'Duration must be at least 1 minute']
  },
  stops: [{
    address: String,
    coordinates: [Number],
    order: Number,
    additionalFare: { type: Number, default: 0 }
  }],
  preferences: {
    smokingAllowed: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    musicAllowed: { type: Boolean, default: true },
    conversationLevel: {
      type: String,
      enum: ['quiet', 'moderate', 'chatty'],
      default: 'moderate'
    }
  },
  recurring: {
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    endDate: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'full'],
    default: 'active'
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  route: {
    encoded: String, // Google Maps encoded polyline
    waypoints: [[Number]] // Array of [longitude, latitude] points
  },
  tags: [String], // Custom tags like 'highway', 'city', 'express'
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance and geospatial queries
rideSchema.index({ 'pickup.coordinates': '2dsphere' });
rideSchema.index({ 'destination.coordinates': '2dsphere' });
rideSchema.index({ driver: 1, departureDateTime: 1 });
rideSchema.index({ status: 1, departureDateTime: 1 });
rideSchema.index({ departureDateTime: 1, availableSeats: 1 });

// Virtual for booked seats
rideSchema.virtual('bookedSeats').get(function() {
  return this.bookings ? this.bookings.length : 0;
});

// Virtual for remaining seats
rideSchema.virtual('remainingSeats').get(function() {
  return this.availableSeats - this.bookedSeats;
});

// Virtual for total earnings
rideSchema.virtual('totalEarnings').get(function() {
  return this.bookedSeats * this.pricePerSeat;
});

// Virtual for ride duration in human readable format
rideSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.estimatedDuration / 60);
  const minutes = this.estimatedDuration % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

// Pre-save middleware to update status based on available seats
rideSchema.pre('save', function(next) {
  if (this.remainingSeats <= 0) {
    this.status = 'full';
  } else if (this.status === 'full' && this.remainingSeats > 0) {
    this.status = 'active';
  }
  next();
});

// Static method to find rides near a location
rideSchema.statics.findNearby = function(coordinates, maxDistance = 10000) {
  return this.find({
    'pickup.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance // in meters
      }
    },
    status: 'active',
    departureDateTime: { $gt: new Date() }
  });
};

module.exports = mongoose.model('Ride', rideSchema);
