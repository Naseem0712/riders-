const express = require('express');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    // Build query
    const query = {
      recipient: userId,
      isDeleted: false
    };
    
    if (unreadOnly) {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .populate('sender', 'name profilePicture')
      .populate('relatedRide', 'pickup destination departureDateTime vehicleType')
      .populate('relatedBooking', 'status seats')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isDeleted: false
    });
    
    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          hasMore: notifications.length === limit
        },
        unreadCount
      }
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const notification = await Notification.findOne({
      _id: id,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    await notification.markAsRead();
    
    res.json({
      success: true,
      data: {
        notification
      }
    });
    
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    await Notification.updateMany(
      {
        recipient: userId,
        isRead: false,
        isDeleted: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
    
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const notification = await Notification.findOne({
      _id: id,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    await notification.softDelete();
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
    
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// @route   POST /api/notifications/test
// @desc    Create test notification (development only)
// @access  Private
router.post('/test', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test notifications not allowed in production'
      });
    }
    
    const userId = req.user._id;
    const { type = 'system_message', title, message } = req.body;
    
    const notification = new Notification({
      recipient: userId,
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification from Riders Pool',
      priority: 'medium',
      data: {
        isTest: true,
        timestamp: new Date()
      }
    });
    
    await notification.save();
    
    res.status(201).json({
      success: true,
      data: {
        notification
      }
    });
    
  } catch (error) {
    console.error('Create test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification'
    });
  }
});

module.exports = router;
