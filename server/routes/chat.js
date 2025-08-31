const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const Ride = require('../models/Ride');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chat/user-chats
// @desc    Get all chats for a user
// @access  Private
router.get('/user-chats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const chats = await Chat.find({
      'participants.user': userId,
      'participants.isActive': true,
      status: { $in: ['active', 'inactive'] }
    })
    .populate('participants.user', 'name profilePicture')
    .populate('relatedRide', 'pickup destination departureDateTime vehicleType')
    .sort({ lastActivity: -1 })
    .limit(50);
    
    // Get latest message for each chat
    const chatsWithMessages = await Promise.all(
      chats.map(async (chat) => {
        const latestMessage = await Message.findOne({
          chat: chat._id,
          isDeleted: false
        })
        .sort({ createdAt: -1 })
        .populate('sender', 'name');
        
        return {
          ...chat.toObject(),
          latestMessage
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        chats: chatsWithMessages
      }
    });
    
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats'
    });
  }
});

// @route   GET /api/chat/:chatId/messages
// @desc    Get messages for a chat
// @access  Private
router.get('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
      'participants.isActive': true
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or access denied'
      });
    }
    
    const messages = await Message.find({
      chat: chatId,
      isDeleted: false
    })
    .populate('sender', 'name profilePicture')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
    
    // Mark messages as read
    await Message.updateMany(
      {
        chat: chatId,
        'readBy.user': { $ne: userId },
        sender: { $ne: userId }
      },
      {
        $push: { readBy: { user: userId, readAt: new Date() } },
        status: 'read'
      }
    );
    
    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit
        }
      }
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// @route   POST /api/chat/:chatId/messages
// @desc    Send a message
// @access  Private
router.post('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const { content, messageType = 'text', location, replyTo } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
      'participants.isActive': true,
      status: 'active'
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or inactive'
      });
    }
    
    // Check if chat has expired
    if (chat.expiresAt && new Date() > chat.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Chat has expired'
      });
    }
    
    // Create message
    const message = new Message({
      chat: chatId,
      sender: userId,
      content: content.trim(),
      messageType,
      location,
      replyTo,
      status: 'sent'
    });
    
    await message.save();
    
    // Update chat activity
    chat.lastActivity = new Date();
    chat.messageCount += 1;
    await chat.save();
    
    // Populate message for response
    await message.populate('sender', 'name profilePicture');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }
    
    res.status(201).json({
      success: true,
      data: {
        message
      }
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// @route   POST /api/chat/create
// @desc    Create a new chat for a ride
// @access  Private
router.post('/create', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { rideId, participantId, chatType = 'pre_ride' } = req.body;
    
    if (!rideId || !participantId) {
      return res.status(400).json({
        success: false,
        message: 'Ride ID and participant ID are required'
      });
    }
    
    // Verify ride exists
    const ride = await Ride.findById(rideId).populate('driver');
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Check if chat already exists
    const existingChat = await Chat.findOne({
      relatedRide: rideId,
      'participants.user': { $all: [userId, participantId] }
    });
    
    if (existingChat) {
      return res.json({
        success: true,
        data: {
          chat: existingChat
        },
        message: 'Chat already exists'
      });
    }
    
    // Determine roles
    const isDriver = ride.driver._id.toString() === userId.toString();
    const participants = [
      {
        user: userId,
        role: isDriver ? 'driver' : 'passenger',
        isActive: true
      },
      {
        user: participantId,
        role: isDriver ? 'passenger' : 'driver',
        isActive: true
      }
    ];
    
    // Create chat
    const chat = new Chat({
      participants,
      relatedRide: rideId,
      chatType,
      status: 'active',
      privacySettings: {
        numbersShared: false,
        realNamesShared: true,
        anonymousMode: false
      }
    });
    
    await chat.save();
    
    // Populate for response
    await chat.populate('participants.user', 'name profilePicture');
    await chat.populate('relatedRide', 'pickup destination departureDateTime');
    
    res.status(201).json({
      success: true,
      data: {
        chat
      }
    });
    
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat'
    });
  }
});

// @route   POST /api/chat/:chatId/activate-post-ride
// @desc    Activate post-ride chat (12-hour window)
// @access  Private
router.post('/:chatId/activate-post-ride', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
      'participants.isActive': true
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    await chat.activatePostRideChat();
    
    res.json({
      success: true,
      message: 'Post-ride chat activated for 12 hours',
      data: {
        chat,
        expiresAt: chat.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Activate post-ride chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate post-ride chat'
    });
  }
});

// @route   DELETE /api/chat/:chatId
// @desc    Leave or delete a chat
// @access  Private
router.delete('/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Mark user as inactive in chat
    const participant = chat.participants.find(
      p => p.user.toString() === userId.toString()
    );
    
    if (participant) {
      participant.isActive = false;
    }
    
    // If no active participants, mark chat as inactive
    const activeParticipants = chat.participants.filter(p => p.isActive);
    if (activeParticipants.length === 0) {
      chat.status = 'inactive';
    }
    
    await chat.save();
    
    res.json({
      success: true,
      message: 'Left chat successfully'
    });
    
  } catch (error) {
    console.error('Leave chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave chat'
    });
  }
});

module.exports = router;
