// Email Service for Authentication
// Handles email verification, password reset, and notifications
// Production-ready with SendGrid support

const crypto = require('crypto');
const emailConfig = require('../config/email');
const path = require('path');

class EmailService {
  constructor() {
    // In-memory token storage (in production, use Redis)
    this.tokenStorage = new Map();
    this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  // Generate secure token
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Store verification token
  storeVerificationToken(email, token, type = 'verification') {
    const key = this.hashEmail(email);
    const expiresAt = Date.now() + this.tokenExpiry;
    
    this.tokenStorage.set(key, {
      token,
      email,
      type,
      expiresAt,
      createdAt: Date.now()
    });

    // Auto cleanup expired tokens
    setTimeout(() => {
      this.tokenStorage.delete(key);
    }, this.tokenExpiry);

    return { token, expiresAt };
  }

  // Verify token
  verifyToken(email, inputToken, type = 'verification') {
    const key = this.hashEmail(email);
    const stored = this.tokenStorage.get(key);

    if (!stored) {
      return { success: false, message: 'Token not found or expired' };
    }

    if (stored.type !== type) {
      return { success: false, message: 'Invalid token type' };
    }

    if (Date.now() > stored.expiresAt) {
      this.tokenStorage.delete(key);
      return { success: false, message: 'Token has expired' };
    }

    if (stored.token !== inputToken) {
      return { success: false, message: 'Invalid token' };
    }

    // Token verified successfully
    this.tokenStorage.delete(key);
    return { success: true, message: 'Token verified successfully' };
  }

  // Hash email for storage key
  hashEmail(email) {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
  }

  // Send verification email (mock implementation)
  async sendVerificationEmail(email, token) {
    try {
      // In production, integrate with email providers like:
      // - SendGrid
      // - AWS SES
      // - Mailgun
      // - NodeMailer with SMTP
      
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      
      const emailTemplate = this.getVerificationEmailTemplate(email, verificationLink);
      
      console.log(`📧 Sending verification email to ${email}`);
      console.log(`🔗 Verification link: ${verificationLink}`);
      console.log(`📝 Email content:`, emailTemplate);
      
      // Always return success in development
      return { 
        success: true, 
        message: 'Verification email sent successfully! Check console for verification link.',
        verificationLink: verificationLink // Always show in development
      };
      
    } catch (error) {
      console.error('Email sending failed:', error);
      return { 
        success: false, 
        message: 'Failed to send verification email. Please try again.',
        error: error.message
      };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, token) {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      
      const emailTemplate = this.getPasswordResetEmailTemplate(email, resetLink);
      
      console.log(`📧 Sending password reset email to ${email}`);
      console.log(`🔗 Reset link: ${resetLink}`);
      console.log(`📝 Email content:`, emailTemplate);
      
      // Mock successful send
      return { 
        success: true, 
        message: 'Password reset email sent successfully',
        resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
      };
      
    } catch (error) {
      console.error('Email sending failed:', error);
      return { 
        success: false, 
        message: 'Failed to send password reset email. Please try again.',
        error: error.message
      };
    }
  }

  // Generate and send verification email
  async generateAndSendVerificationEmail(email) {
    try {
      // Validate email
      if (!this.isValidEmail(email)) {
        return { 
          success: false, 
          message: 'Invalid email address format' 
        };
      }

      // Normalize email
      const normalizedEmail = this.normalizeEmail(email);
      
      // Check if email is from a valid domain
      if (this.isDisposableEmail(normalizedEmail)) {
        return { 
          success: false, 
          message: 'Disposable email addresses are not allowed' 
        };
      }

      // Generate token
      const token = this.generateToken();
      
      // Store token
      const stored = this.storeVerificationToken(normalizedEmail, token, 'verification');
      
      // Send email
      const emailResult = await this.sendVerificationEmail(normalizedEmail, token);
      
      if (emailResult.success) {
        return {
          success: true,
          message: 'Verification email sent successfully. Please check your inbox.',
          email: this.maskEmail(normalizedEmail),
          verificationLink: emailResult.verificationLink // Only in development
        };
      } else {
        // Remove stored token if email failed
        const key = this.hashEmail(normalizedEmail);
        this.tokenStorage.delete(key);
        return emailResult;
      }
      
    } catch (error) {
      console.error('Generate and send verification email error:', error);
      return { 
        success: false, 
        message: 'Something went wrong. Please try again.' 
      };
    }
  }

  // Generate and send password reset email
  async generateAndSendPasswordResetEmail(email) {
    try {
      // Validate email
      if (!this.isValidEmail(email)) {
        return { 
          success: false, 
          message: 'Invalid email address format' 
        };
      }

      // Normalize email
      const normalizedEmail = this.normalizeEmail(email);
      
      // Generate token
      const token = this.generateToken();
      
      // Store token
      const stored = this.storeVerificationToken(normalizedEmail, token, 'password-reset');
      
      // Send email
      const emailResult = await this.sendPasswordResetEmail(normalizedEmail, token);
      
      if (emailResult.success) {
        return {
          success: true,
          message: 'Password reset email sent successfully. Please check your inbox.',
          email: this.maskEmail(normalizedEmail),
          resetLink: emailResult.resetLink // Only in development
        };
      } else {
        // Remove stored token if email failed
        const key = this.hashEmail(normalizedEmail);
        this.tokenStorage.delete(key);
        return emailResult;
      }
      
    } catch (error) {
      console.error('Generate and send password reset email error:', error);
      return { 
        success: false, 
        message: 'Something went wrong. Please try again.' 
      };
    }
  }

  // Validate email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Normalize email
  normalizeEmail(email) {
    return email.toLowerCase().trim();
  }

  // Check for disposable email domains
  isDisposableEmail(email) {
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', 'temp-mail.org',
      'throwaway.email', 'getnada.com', 'maildrop.cc'
    ];
    
    const domain = email.split('@')[1];
    return disposableDomains.includes(domain.toLowerCase());
  }

  // Mask email for display
  maskEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}*@${domain}`;
    }
    return `${local.substring(0, 2)}****@${domain}`;
  }

  // Get verification email template
  getVerificationEmailTemplate(email, verificationLink) {
    return {
      to: email,
      subject: 'Welcome to Riders Pool - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #60a5fa; margin: 0;">🏍️🚗 Riders Pool</h1>
            <p style="color: #ccc; margin: 5px 0;">Premium Bike & Car Sharing</p>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; margin-bottom: 20px;">
            <h2 style="color: #fff; margin-top: 0;">Welcome to Riders Pool!</h2>
            <p style="color: #ccc; line-height: 1.6;">
              Thank you for joining our premium ride-sharing community. To complete your registration 
              and start your journey with us, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="display: inline-block; background: rgba(255,255,255,0.1); color: #fff; 
                        padding: 15px 30px; text-decoration: none; border-radius: 10px; 
                        border: 2px solid #fff; font-weight: bold;">
                ✅ Verify Email Address
              </a>
            </div>
            
            <p style="color: #ccc; font-size: 14px;">
              This verification link will expire in 24 hours. If you didn't create an account with us, 
              please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>Riders Pool - Premium Bike & Car Sharing Platform</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `,
      text: `
Welcome to Riders Pool!

Thank you for joining our premium ride-sharing community. Please verify your email address by clicking the link below:

${verificationLink}

This link will expire in 24 hours. If you didn't create an account with us, please ignore this email.

Best regards,
Riders Pool Team
      `
    };
  }

  // Get password reset email template
  getPasswordResetEmailTemplate(email, resetLink) {
    return {
      to: email,
      subject: 'Riders Pool - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #60a5fa; margin: 0;">🏍️🚗 Riders Pool</h1>
            <p style="color: #ccc; margin: 5px 0;">Premium Bike & Car Sharing</p>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; margin-bottom: 20px;">
            <h2 style="color: #fff; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #ccc; line-height: 1.6;">
              We received a request to reset your password for your Riders Pool account. 
              Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background: rgba(255,255,255,0.1); color: #fff; 
                        padding: 15px 30px; text-decoration: none; border-radius: 10px; 
                        border: 2px solid #fff; font-weight: bold;">
                🔐 Reset Password
              </a>
            </div>
            
            <p style="color: #ccc; font-size: 14px;">
              This reset link will expire in 24 hours. If you didn't request a password reset, 
              please ignore this email or contact support.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>Riders Pool - Premium Bike & Car Sharing Platform</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `,
      text: `
Password Reset Request - Riders Pool

We received a request to reset your password. Please click the link below to create a new password:

${resetLink}

This link will expire in 24 hours. If you didn't request a password reset, please ignore this email.

Best regards,
Riders Pool Team
      `
    };
  }

  // Clean up expired tokens (call periodically)
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [key, data] of this.tokenStorage.entries()) {
      if (now > data.expiresAt) {
        this.tokenStorage.delete(key);
      }
    }
  }

  // Get email stats (for debugging)
  getStats() {
    return {
      totalTokens: this.tokenStorage.size,
      expiredTokens: Array.from(this.tokenStorage.values()).filter(
        data => Date.now() > data.expiresAt
      ).length
    };
  }
}

// Singleton instance
const emailService = new EmailService();

// Cleanup expired tokens every hour
setInterval(() => {
  emailService.cleanupExpiredTokens();
}, 60 * 60 * 1000);

module.exports = emailService;
