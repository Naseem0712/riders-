const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema({
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickup: {
    address: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  destination: {
    address: {
      type: String,
      required: [true, 'Destination address is required'],
      trim: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  preferredDateTime: {
    type: Date,
    required: [true, 'Preferred date and time is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Preferred time must be in the future'
    }
  },
  vehicleType: {
    type: String,
    enum: ['car', 'bike', 'auto', 'bus'],
    required: true
  },
  seatsNeeded: {
    type: Number,
    required: [true, 'Number of seats needed is required'],
    min: [1, 'At least 1 seat needed'],
    max: [6, 'Maximum 6 seats can be requested']
  },
  budgetPerSeat: {
    type: Number,
    required: [true, 'Budget per seat is required'],
    min: [50, 'Minimum budget ₹50'],
    max: [2000, 'Maximum budget ₹2000']
  },
  status: {
    type: String,
    enum: ['active', 'matched', 'cancelled', 'expired'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  preferences: {
    smokingAllowed: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    musicAllowed: { type: Boolean, default: true },
    femaleOnly: { type: Boolean, default: false },
    acRequired: { type: Boolean, default: false }
  },
  contactInfo: {
    phone: String,
    alternatePhone: String,
    whatsappNumber: String
  },
  notes: {
    type: String,
    maxlength: [300, 'Notes cannot exceed 300 characters']
  },
  notifications: [{
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notifiedAt: {
      type: Date,
      default: Date.now
    },
    response: {
      type: String,
      enum: ['pending', 'interested', 'declined'],
      default: 'pending'
    }
  }],
  matchedRides: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  }],
  expiresAt: {
    type: Date,
    default: function() {
      // Expire after 7 days
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
rideRequestSchema.index({ 'pickup.coordinates': '2dsphere' });
rideRequestSchema.index({ 'destination.coordinates': '2dsphere' });
rideRequestSchema.index({ passenger: 1, status: 1 });
rideRequestSchema.index({ status: 1, preferredDateTime: 1 });
rideRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for request age
rideRequestSchema.virtual('ageInHours').get(function() {
  return Math.round((new Date() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for urgency score
rideRequestSchema.virtual('urgencyScore').get(function() {
  const hoursUntilRide = (this.preferredDateTime - new Date()) / (1000 * 60 * 60);
  const ageHours = this.ageInHours;
  
  let score = 0;
  
  // Time urgency (less time = higher score)
  if (hoursUntilRide <= 2) score += 50;
  else if (hoursUntilRide <= 6) score += 30;
  else if (hoursUntilRide <= 24) score += 20;
  else score += 10;
  
  // Request age (older requests get priority)
  if (ageHours >= 48) score += 20;
  else if (ageHours >= 24) score += 15;
  else if (ageHours >= 12) score += 10;
  else score += 5;
  
  // Priority boost
  const priorityBoost = {
    low: 0,
    medium: 10,
    high: 20,
    urgent: 30
  };
  score += priorityBoost[this.priority];
  
  return score;
});

// Static method to find nearby requests for drivers
rideRequestSchema.statics.findNearbyRequests = function(driverRoute, maxDistance = 5000) {
  const { pickupCoords, destinationCoords } = driverRoute;
  
  return this.find({
    status: 'active',
    preferredDateTime: { $gt: new Date() },
    $or: [
      {
        'pickup.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: pickupCoords },
            $maxDistance: maxDistance
          }
        }
      },
      {
        'destination.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: destinationCoords },
            $maxDistance: maxDistance
          }
        }
      }
    ]
  }).populate('passenger', 'name profilePicture rating mobile');
};

// Method to notify matching drivers
rideRequestSchema.methods.notifyMatchingDrivers = async function(driverIds) {
  const newNotifications = driverIds.map(driverId => ({
    driverId,
    notifiedAt: new Date(),
    response: 'pending'
  }));
  
  this.notifications.push(...newNotifications);
  await this.save();
  
  return newNotifications;
};

// Auto-expire old requests
rideRequestSchema.pre('save', function(next) {
  if (this.preferredDateTime < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('RideRequest', rideRequestSchema);
