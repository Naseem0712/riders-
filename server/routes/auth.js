const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role = 'user' } = req.body;

    // Validation
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
        fields: { name: !name, email: !email, mobile: !mobile, password: !password }
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Validate mobile number
    if (!/^\+?[\d\s-()]{10,15}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid mobile number.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }]
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'mobile';
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists.`
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      mobile,
      password,
      role: ['user', 'driver'].includes(role) ? role : 'user'
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists.`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, mobile, password } = req.body;

    // Validation
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.'
      });
    }

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Email or mobile number is required.'
      });
    }

    // Build query
    let query = {};
    if (email) {
      query.email = email.toLowerCase();
    } else if (mobile) {
      query.mobile = mobile;
    }

    // Find user with password
    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login.'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset token
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, mobile } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Email or mobile number is required.'
      });
    }

    // Build query
    let query = {};
    if (email) {
      query.email = email.toLowerCase();
    } else if (mobile) {
      query.mobile = mobile;
    }

    const user = await User.findOne(query);

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: 'If the account exists, a password reset token has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // In production, send email/SMS with reset token
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If the account exists, a password reset token has been sent.',
      // Remove this in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password reset request.'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password reset.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, mobile, profilePicture } = req.body;
    const userId = req.user._id;

    // Validate input
    const updates = {};
    if (name) updates.name = name.trim();
    if (mobile) {
      if (!/^\+?[\d\s-()]{10,15}$/.test(mobile)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid mobile number.'
        });
      }
      updates.mobile = mobile;
    }
    if (profilePicture) updates.profilePicture = profilePicture;

    // Check if mobile number is already taken by another user
    if (mobile) {
      const existingUser = await User.findOne({ 
        mobile, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is already registered with another account.'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is already registered with another account.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during profile update.'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password change.'
    });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP to mobile number
// @access  Public
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required.'
      });
    }

    // Send OTP
    const result = await otpService.generateAndSendOTP(mobile);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          mobile: result.mobile,
          expiresIn: result.expiresIn
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during OTP sending.'
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login/register user
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, otp, name, role = 'user' } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required.'
      });
    }

    // Verify OTP
    const otpResult = await otpService.verifyOTP(mobile, otp);
    
    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
        attemptsRemaining: otpResult.attemptsRemaining
      });
    }

    // Normalize mobile number
    const normalizedMobile = otpService.normalizeMobile(mobile);
    
    // Check if user exists (with database fallback)
    let user;
    try {
      user = await User.findOne({ mobile: normalizedMobile });
    } catch (dbError) {
      // Database not connected - create temporary user for demo
      console.log('🔧 Database not connected, using temporary storage for demo');
      user = null; // Always treat as new user when DB not available
    }
    
    if (user) {
      // Existing user - login
      try {
        user.lastLogin = new Date();
        user.mobileVerified = true;
        await user.save();
        
        const token = generateToken(user._id);
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json({
          success: true,
          message: 'Login successful via OTP.',
          data: {
            user: userResponse,
            token,
            isNewUser: false
          }
        });
      } catch (saveError) {
        // Database save failed - continue with temporary session
        res.json({
          success: true,
          message: 'Login successful via OTP (demo mode).',
          data: {
            user: {
              _id: 'demo_' + Date.now(),
              mobile: normalizedMobile,
              name: 'Demo User',
              mobileVerified: true
            },
            token: generateToken('demo_' + Date.now()),
            isNewUser: false
          }
        });
      }
    } else {
      // New user - register
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for new user registration.'
        });
      }
      
      try {
        // Create new user without password (OTP-based account)
        user = new User({
          name: name.trim(),
          mobile: normalizedMobile,
          mobileVerified: true,
          role: ['user', 'driver'].includes(role) ? role : 'user',
          authMethod: 'otp'
        });
        
        await user.save();
        
        const token = generateToken(user._id);
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.status(201).json({
          success: true,
          message: 'Registration successful via OTP.',
          data: {
            user: userResponse,
            token,
            isNewUser: true
          }
        });
      } catch (dbError) {
        // Database not connected - create temporary user for demo
        console.log('🔧 Database registration failed, using demo mode');
        const demoUserId = 'demo_' + Date.now();
        res.status(201).json({
          success: true,
          message: 'Registration successful via OTP (demo mode).',
          data: {
            user: {
              _id: demoUserId,
              mobile: normalizedMobile,
              name: name.trim(),
              mobileVerified: true,
              role: role || 'user',
              authMethod: 'otp'
            },
            token: generateToken(demoUserId),
            isNewUser: true
          }
        });
      }
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is already registered.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during OTP verification.'
    });
  }
});

// @route   POST /api/auth/send-verification-email
// @desc    Send email verification link
// @access  Public
router.post('/send-verification-email', async (req, res) => {
  try {
    const { email, name, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.'
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    // Create temporary user record (unverified)
    const tempUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      role: ['user', 'driver'].includes(role) ? role : 'user',
      emailVerified: false,
      isActive: false, // Inactive until email verified
      authMethod: 'email'
    });
    
    await tempUser.save();

    // Send verification email
    const result = await emailService.generateAndSendVerificationEmail(email);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          email: result.email,
          verificationLink: result.verificationLink // Only in development
        }
      });
    } else {
      // Remove temp user if email failed
      await User.findByIdAndDelete(tempUser._id);
      
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send verification email error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification sending.'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email and set password
// @access  Public
router.post('/verify-email', async (req, res) => {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, token, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Verify email token
    const tokenResult = await emailService.verifyToken(email, token, 'verification');
    
    if (!tokenResult.success) {
      return res.status(400).json({
        success: false,
        message: tokenResult.message
      });
    }

    // Find and activate user
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      emailVerified: false 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already verified.'
      });
    }

    // Update user
    user.password = password;
    user.emailVerified = true;
    user.isActive = true;
    await user.save();

    // Generate login token
    const loginToken = generateToken(user._id);
    
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Email verified and account activated successfully.',
      data: {
        user: userResponse,
        token: loginToken
      }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification.'
    });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    // Find unverified user
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      emailVerified: false 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already verified.'
      });
    }

    // Send verification email
    const result = await emailService.generateAndSendVerificationEmail(email);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          email: result.email,
          verificationLink: result.verificationLink // Only in development
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during resending verification.'
    });
  }
});

module.exports = router;
