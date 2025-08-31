const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seatsBooked: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [1, 'At least 1 seat must be booked'],
    max: [4, 'Maximum 4 seats can be booked per booking']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'wallet'],
    default: 'cash'
  },
  pickupLocation: {
    address: String,
    coordinates: [Number],
    notes: String
  },
  dropLocation: {
    address: String,
    coordinates: [Number],
    notes: String
  },
  specialRequests: {
    type: String,
    maxlength: [300, 'Special requests cannot exceed 300 characters']
  },
  contactDetails: {
    phone: String,
    alternatePhone: String,
    emergencyContact: {
      name: String,
      phone: String,
      relation: String
    }
  },
  journey: {
    startTime: Date,
    endTime: Date,
    actualPickupTime: Date,
    actualDropTime: Date,
    route: {
      startCoordinates: [Number],
      endCoordinates: [Number],
      actualRoute: [[Number]] // Array of coordinates
    },
    otp: {
      code: String,
      isVerified: { type: Boolean, default: false },
      generatedAt: Date
    }
  },
  rating: {
    forDriver: {
      score: { type: Number, min: 1, max: 5 },
      review: String,
      tags: [String] // 'punctual', 'friendly', 'safe_driving', etc.
    },
    forPassenger: {
      score: { type: Number, min: 1, max: 5 },
      review: String,
      tags: [String] // 'punctual', 'respectful', 'clean', etc.
    }
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    refundAmount: { type: Number, default: 0 },
    cancellationFee: { type: Number, default: 0 }
  },
  notifications: {
    bookingConfirmation: { sent: Boolean, sentAt: Date },
    reminderSent: { sent: Boolean, sentAt: Date },
    rideStarted: { sent: Boolean, sentAt: Date },
    rideCompleted: { sent: Boolean, sentAt: Date }
  },
  whatsappShared: {
    type: Boolean,
    default: false
  },
  locationSharedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
bookingSchema.index({ ride: 1, passenger: 1 });
bookingSchema.index({ passenger: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ 'ride': 1, 'journey.startTime': 1 });

// Virtual for booking reference number
bookingSchema.virtual('referenceNumber').get(function() {
  return `RDR${this._id.toString().slice(-8).toUpperCase()}`;
});

// Virtual for journey duration
bookingSchema.virtual('journeyDuration').get(function() {
  if (this.journey.endTime && this.journey.startTime) {
    return Math.round((this.journey.endTime - this.journey.startTime) / (1000 * 60)); // in minutes
  }
  return null;
});

// Virtual for can cancel (before 2 hours of departure)
bookingSchema.virtual('canCancel').get(function() {
  if (this.status !== 'confirmed') return false;
  
  // Populate ride to get departure time
  if (this.ride && this.ride.departureDateTime) {
    const twoHoursBefore = new Date(this.ride.departureDateTime.getTime() - (2 * 60 * 60 * 1000));
    return new Date() < twoHoursBefore;
  }
  return false;
});

// Generate OTP for ride verification
bookingSchema.methods.generateOTP = function() {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  this.journey.otp = {
    code: otp,
    isVerified: false,
    generatedAt: new Date()
  };
  return otp;
};

// Calculate cancellation fee based on timing
bookingSchema.methods.calculateCancellationFee = function(rideDateTime) {
  const now = new Date();
  const timeDiff = rideDateTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  if (hoursDiff >= 24) return 0; // No fee if cancelled 24+ hours before
  if (hoursDiff >= 2) return this.totalAmount * 0.1; // 10% fee
  if (hoursDiff >= 0.5) return this.totalAmount * 0.25; // 25% fee
  return this.totalAmount * 0.5; // 50% fee for last-minute cancellation
};

// Pre-save middleware to calculate total amount
bookingSchema.pre('save', function(next) {
  if (this.isNew && this.ride) {
    // This will be calculated when ride details are populated
    // In practice, this should be set explicitly when creating the booking
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
