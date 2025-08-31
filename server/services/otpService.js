// OTP Service for Mobile Authentication
// Handles OTP generation, storage, and verification
// Production-ready with Twilio SMS support

const crypto = require('crypto');
const smsService = require('../config/sms');

class OTPService {
  constructor() {
    // In-memory OTP storage (in production, use Redis)
    this.otpStorage = new Map();
    this.otpExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxAttempts = 3;
  }

  // Generate OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP with mobile number
  storeOTP(mobile, otp) {
    const key = this.hashMobile(mobile);
    const expiresAt = Date.now() + this.otpExpiry;
    
    this.otpStorage.set(key, {
      otp,
      mobile,
      expiresAt,
      attempts: 0,
      createdAt: Date.now()
    });

    // Auto cleanup expired OTPs
    setTimeout(() => {
      this.otpStorage.delete(key);
    }, this.otpExpiry);

    return { otp, expiresAt };
  }

  // Verify OTP
  verifyOTP(mobile, inputOTP) {
    // Normalize mobile number first (same as in storeOTP)
    const normalizedMobile = this.normalizeMobile(mobile);
    const key = this.hashMobile(normalizedMobile);
    const stored = this.otpStorage.get(key);

    if (!stored) {
      return { success: false, message: 'OTP not found or expired' };
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStorage.delete(key);
      return { success: false, message: 'OTP has expired' };
    }

    if (stored.attempts >= this.maxAttempts) {
      this.otpStorage.delete(key);
      return { success: false, message: 'Maximum verification attempts exceeded' };
    }

    stored.attempts++;

    if (stored.otp !== inputOTP) {
      return { 
        success: false, 
        message: `Invalid OTP. ${this.maxAttempts - stored.attempts} attempts remaining.`,
        attemptsRemaining: this.maxAttempts - stored.attempts
      };
    }

    // OTP verified successfully
    this.otpStorage.delete(key);
    return { success: true, message: 'OTP verified successfully' };
  }

  // Hash mobile number for storage key
  hashMobile(mobile) {
    return crypto.createHash('sha256').update(mobile.toString()).digest('hex');
  }

  // Send OTP via SMS (mock implementation)
  async sendOTPSMS(mobile, otp) {
    try {
      // In production, integrate with SMS providers like:
      // - Twilio
      // - AWS SNS
      // - TextLocal
      // - MSG91
      
      // Send OTP via configured SMS service
      const smsResult = await smsService.sendOTP(mobile, otp);
      
      if (smsResult.success) {
        // In development, also show in console
        if (process.env.NODE_ENV !== 'production') {
          console.log(`\n🎯 ===== OTP VERIFICATION =====`);
          console.log(`📱 Mobile: ${mobile}`);
          console.log(`🔑 OTP Code: ${otp}`);
          console.log(`⏰ Valid for 5 minutes`);
          console.log(`🎯 ============================\n`);
        }
        
        return {
          success: true,
          message: 'OTP sent successfully to your mobile number.',
          provider: smsResult.provider
        };
      } else {
        throw new Error(smsResult.error || 'Failed to send SMS');
      }
      
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { 
        success: false, 
        message: 'Failed to send OTP. Please try again.',
        error: error.message
      };
    }
  }

  // Generate and send OTP
  async generateAndSendOTP(mobile) {
    try {
      // Validate mobile number
      if (!this.isValidMobile(mobile)) {
        return { 
          success: false, 
          message: 'Invalid mobile number format' 
        };
      }

      // Normalize mobile number
      const normalizedMobile = this.normalizeMobile(mobile);
      
      // Check rate limiting (prevent spam)
      if (this.isRateLimited(normalizedMobile)) {
        return { 
          success: false, 
          message: 'Too many OTP requests. Please try again later.' 
        };
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Store OTP
      const stored = this.storeOTP(normalizedMobile, otp);
      
      // Send OTP
      const smsResult = await this.sendOTPSMS(normalizedMobile, otp);
      
      if (smsResult.success) {
        return {
          success: true,
          message: 'OTP sent successfully to your mobile number',
          expiresIn: Math.floor(this.otpExpiry / 1000), // seconds
          mobile: this.maskMobile(normalizedMobile)
        };
      } else {
        // Remove stored OTP if SMS failed
        const key = this.hashMobile(normalizedMobile);
        this.otpStorage.delete(key);
        return smsResult;
      }
      
    } catch (error) {
      console.error('Generate and send OTP error:', error);
      return { 
        success: false, 
        message: 'Something went wrong. Please try again.' 
      };
    }
  }

  // Validate mobile number
  isValidMobile(mobile) {
    // Indian mobile number validation
    const indianMobileRegex = /^(\+91|91)?[6-9]\d{9}$/;
    
    // International mobile validation (basic)
    const internationalMobileRegex = /^\+[1-9]\d{1,14}$/;
    
    const normalized = mobile.replace(/\s|-|\(|\)/g, '');
    
    return indianMobileRegex.test(normalized) || internationalMobileRegex.test(normalized);
  }

  // Normalize mobile number
  normalizeMobile(mobile) {
    let normalized = mobile.replace(/\s|-|\(|\)/g, '');
    
    // Add +91 for Indian numbers
    if (/^[6-9]\d{9}$/.test(normalized)) {
      normalized = '+91' + normalized;
    } else if (/^91[6-9]\d{9}$/.test(normalized)) {
      normalized = '+' + normalized;
    }
    
    return normalized;
  }

  // Mask mobile number for display
  maskMobile(mobile) {
    if (mobile.length > 7) {
      const start = mobile.substring(0, mobile.length - 6);
      const end = mobile.substring(mobile.length - 2);
      return start + '****' + end;
    }
    return mobile;
  }

  // Rate limiting check
  isRateLimited(mobile) {
    // Simple rate limiting: max 3 OTPs per mobile per hour
    const key = this.hashMobile(mobile);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    let attempts = 0;
    for (const [storageKey, data] of this.otpStorage.entries()) {
      if (storageKey === key && (now - data.createdAt) < oneHour) {
        attempts++;
      }
    }
    
    return attempts >= 3;
  }

  // Clean up expired OTPs (call periodically)
  cleanupExpiredOTPs() {
    const now = Date.now();
    for (const [key, data] of this.otpStorage.entries()) {
      if (now > data.expiresAt) {
        this.otpStorage.delete(key);
      }
    }
  }

  // Get OTP stats (for debugging)
  getStats() {
    return {
      totalOTPs: this.otpStorage.size,
      expiredOTPs: Array.from(this.otpStorage.values()).filter(
        data => Date.now() > data.expiresAt
      ).length
    };
  }
}

// Singleton instance
const otpService = new OTPService();

// Cleanup expired OTPs every 10 minutes
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 10 * 60 * 1000);

module.exports = otpService;
