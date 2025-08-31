const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  messageType: {
    type: String,
    enum: ['text', 'location', 'image', 'file', 'system'],
    default: 'text'
  },
  
  content: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  
  // For location sharing
  location: {
    coordinates: [Number],
    address: String,
    accuracy: Number
  },
  
  // For files/images
  attachments: [{
    type: String,
    url: String,
    size: Number
  }],
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // System messages (ride updates, etc.)
  systemData: {
    action: String,
    data: mongoose.Schema.Types.Mixed
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date,
  
  editedAt: Date,
  
  // Auto-delete after chat expires
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ expiresAt: 1 });

// Virtual for formatted timestamp
messageSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
});

// Methods
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => r.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    this.status = 'read';
    return this.save();
  }
  return Promise.resolve(this);
};

messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message was deleted';
  return this.save();
};

// Set expiry based on chat type
messageSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Messages expire 24 hours after chat expires
    this.expiresAt = new Date(Date.now() + 36 * 60 * 60 * 1000); // 36 hours
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
