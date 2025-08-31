const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  type: {
    type: String,
    enum: [
      'ride_match', 
      'booking_request', 
      'booking_confirmed', 
      'booking_cancelled',
      'ride_starting', 
      'ride_completed',
      'new_message',
      'ride_inquiry_match',
      'system_message'
    ],
    required: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // Related entities
  relatedRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  
  relatedChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  
  relatedInquiry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideRequest'
  },
  
  // Notification data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: Date,
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date,
  
  // Delivery status
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  
  deliveredAt: Date,
  
  // Action buttons
  actions: [{
    type: {
      type: String,
      enum: ['accept', 'reject', 'view', 'chat', 'call', 'navigate']
    },
    label: String,
    data: mongoose.Schema.Types.Mixed
  }],
  
  // Auto-expire old notifications
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsDelivered = function() {
  this.deliveryStatus = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

notificationSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Static methods for creating specific notification types
notificationSchema.statics.createRideMatchNotification = function(recipientId, ride, inquiry) {
  return this.create({
    recipient: recipientId,
    type: 'ride_match',
    title: '🚗 Ride Found!',
    message: `A ${ride.vehicleType} ride is available for your route: ${inquiry.pickup.address} → ${inquiry.destination.address}`,
    relatedRide: ride._id,
    relatedInquiry: inquiry._id,
    priority: 'high',
    data: {
      rideId: ride._id,
      inquiryId: inquiry._id,
      vehicleType: ride.vehicleType,
      price: ride.pricePerSeat,
      departureTime: ride.departureDateTime
    },
    actions: [
      { type: 'view', label: 'View Ride', data: { rideId: ride._id } },
      { type: 'chat', label: 'Contact Driver', data: { rideId: ride._id } }
    ]
  });
};

notificationSchema.statics.createBookingNotification = function(recipientId, booking, type) {
  const messages = {
    booking_request: {
      title: '📋 New Booking Request',
      message: `${booking.passenger.name} wants to book your ride`
    },
    booking_confirmed: {
      title: '✅ Booking Confirmed',
      message: `Your ride booking has been confirmed`
    },
    booking_cancelled: {
      title: '❌ Booking Cancelled',
      message: `Ride booking has been cancelled`
    }
  };
  
  const notification = messages[type] || messages.booking_request;
  
  return this.create({
    recipient: recipientId,
    type: type,
    title: notification.title,
    message: notification.message,
    relatedBooking: booking._id,
    relatedRide: booking.ride,
    priority: 'high',
    data: {
      bookingId: booking._id,
      rideId: booking.ride
    }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
