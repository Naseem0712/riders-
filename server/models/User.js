const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: function() {
      return this.authMethod === 'email' && this.emailVerified;
    },
    unique: true,
    sparse: true, // Allow multiple null values
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || validator.isEmail(v);
      },
      message: 'Please provide a valid email'
    }
  },
  mobile: {
    type: String,
    required: function() {
      return this.authMethod === 'mobile' && this.mobileVerified;
    },
    unique: true,
    sparse: true, // Allow multiple null values
    validate: {
      validator: function(v) {
        return !v || /^\+?[\d\s-()]{10,15}$/.test(v);
      },
      message: 'Please provide a valid mobile number'
    }
  },
  password: {
    type: String,
    required: function() {
      return this.authMethod === 'email' && this.emailVerified;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'driver', 'admin'],
    default: 'user'
  },
  profilePicture: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  // Driver specific fields
  drivingLicense: {
    number: String,
    expiryDate: Date,
    isVerified: { type: Boolean, default: false }
  },
  vehicles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  }],
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  totalRides: {
    asDriver: { type: Number, default: 0 },
    asPassenger: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ mobile: 1 });
userSchema.index({ role: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
  this.verificationToken = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
  return this.verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  this.passwordResetToken = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return this.passwordResetToken;
};

module.exports = mongoose.model('User', userSchema);
