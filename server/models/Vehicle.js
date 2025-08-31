const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  make: {
    type: String,
    required: [true, 'Vehicle make is required'],
    trim: true,
    maxlength: [30, 'Make cannot exceed 30 characters']
  },
  model: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true,
    maxlength: [30, 'Model cannot exceed 30 characters']
  },
  year: {
    type: Number,
    required: [true, 'Vehicle year is required'],
    min: [1990, 'Vehicle year must be 1990 or later'],
    max: [new Date().getFullYear() + 1, 'Invalid vehicle year']
  },
  color: {
    type: String,
    required: [true, 'Vehicle color is required'],
    trim: true,
    maxlength: [20, 'Color cannot exceed 20 characters']
  },
  licensePlate: {
    type: String,
    required: [true, 'License plate is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [15, 'License plate cannot exceed 15 characters']
  },
  seats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [1, 'Vehicle must have at least 1 seat'],
    max: [50, 'Vehicle cannot have more than 50 seats']
  },
  seatingCapacity: {
    type: Number,
    required: [true, 'Seating capacity is required'],
    min: [1, 'Vehicle must have at least 1 seat'],
    max: [50, 'Vehicle cannot have more than 50 seats']
  },
  vehicleName: {
    type: String,
    trim: true,
    maxlength: [50, 'Vehicle name cannot exceed 50 characters']
  },
  category: {
    type: String,
    enum: ['economy', 'comfort', 'luxury', 'business'],
    default: 'comfort'
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'hybrid'],
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'car', 'auto', 'bus', 'sedan', 'suv', 'hatchback', 'luxury', 'van', 'other'],
    required: true
  },
  
  // Bike-specific fields
  bikeDetails: {
    hasExtraHelmet: { type: Boolean, default: false },
    helmetCondition: { 
      type: String, 
      enum: ['new', 'good', 'average'], 
      default: 'good' 
    },
    engineCapacity: Number, // in CC
    bikeType: {
      type: String,
      enum: ['sports', 'cruiser', 'commuter', 'scooter', 'electric'],
      default: 'commuter'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  documents: {
    registration: {
      number: String,
      expiryDate: Date,
      isVerified: { type: Boolean, default: false }
    },
    insurance: {
      number: String,
      expiryDate: Date,
      isVerified: { type: Boolean, default: false }
    },
    permit: {
      number: String,
      expiryDate: Date,
      isVerified: { type: Boolean, default: false }
    }
  },
  features: [{
    type: String,
    enum: ['ac', 'music', 'wifi', 'charging', 'leather_seats', 'gps', 'first_aid']
  }],
  photos: [String],
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  totalRides: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
vehicleSchema.index({ owner: 1 });
vehicleSchema.index({ licensePlate: 1 });
vehicleSchema.index({ isActive: 1, isVerified: 1 });

// Virtual for vehicle display name
vehicleSchema.virtual('displayName').get(function() {
  return `${this.year} ${this.make} ${this.model}`;
});

// Virtual for available seats (considering driver)
vehicleSchema.virtual('availableSeats').get(function() {
  return this.seats - 1; // Driver takes one seat
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
