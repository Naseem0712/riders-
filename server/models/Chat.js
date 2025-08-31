const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['driver', 'passenger'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  relatedRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  
  chatType: {
    type: String,
    enum: ['pre_ride', 'during_ride', 'post_ride'],
    default: 'pre_ride'
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
  },
  
  // Post-ride chat expires after 12 hours
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  messageCount: {
    type: Number,
    default: 0
  },
  
  // Privacy settings
  privacySettings: {
    numbersShared: { type: Boolean, default: false },
    realNamesShared: { type: Boolean, default: false },
    anonymousMode: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ relatedRide: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ expiresAt: 1 });

// Virtual for active participants
chatSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => p.isActive);
});

// Methods to manage chat lifecycle
chatSchema.methods.activatePostRideChat = function() {
  this.chatType = 'post_ride';
  this.expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
  this.status = 'active';
  return this.save();
};

chatSchema.methods.expireChat = function() {
  this.status = 'expired';
  this.expiresAt = new Date();
  return this.save();
};

chatSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('Chat', chatSchema);
