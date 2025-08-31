// Email Service Configuration
// Support for SendGrid, AWS SES, and other providers

const sendgrid = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'sendgrid'; // sendgrid, aws-ses, smtp, mock
    this.initializeProvider();
  }

  initializeProvider() {
    switch (this.provider) {
      case 'sendgrid':
        if (process.env.SENDGRID_API_KEY) {
          sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
          this.fromEmail = process.env.FROM_EMAIL || 'noreply@riderspool.com';
          console.log('📧 SendGrid email service initialized');
        } else {
          console.log('⚠️ SendGrid API key not found, using mock email');
          this.provider = 'mock';
        }
        break;
      
      case 'smtp':
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
          this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });
          this.fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
          console.log('📧 SMTP email service initialized');
        } else {
          console.log('⚠️ SMTP credentials not found, using mock email');
          this.provider = 'mock';
        }
        break;
      
      case 'aws-ses':
        console.log('📧 AWS SES not implemented yet, using mock email');
        this.provider = 'mock';
        break;
      
      default:
        console.log('📧 Using mock email service for development');
        this.provider = 'mock';
    }
  }

  async sendEmail(to, subject, html, text) {
    try {
      switch (this.provider) {
        case 'sendgrid':
          const msg = {
            to: to,
            from: this.fromEmail,
            subject: subject,
            text: text,
            html: html
          };
          
          const result = await sendgrid.send(msg);
          console.log(`📧 Email sent via SendGrid to ${to}`);
          return {
            success: true,
            messageId: result[0].headers['x-message-id'],
            provider: 'SendGrid'
          };

        case 'smtp':
          const info = await this.transporter.sendMail({
            from: this.fromEmail,
            to: to,
            subject: subject,
            text: text,
            html: html
          });
          
          console.log(`📧 Email sent via SMTP: ${info.messageId}`);
          return {
            success: true,
            messageId: info.messageId,
            provider: 'SMTP'
          };

        case 'aws-ses':
          // AWS SES implementation would go here
          throw new Error('AWS SES not implemented');

        default: // mock
          console.log(`\n🎯 ===== MOCK EMAIL =====`);
          console.log(`📧 To: ${to}`);
          console.log(`📋 Subject: ${subject}`);
          console.log(`💌 Preview: ${text ? text.substring(0, 100) + '...' : 'HTML only'}`);
          console.log(`🎯 =====================\n`);
          
          return {
            success: true,
            messageId: 'mock-' + Date.now(),
            provider: 'Mock Development Service'
          };
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error.message,
        provider: this.provider
      };
    }
  }

  // Send verification email
  async sendVerificationEmail(email, token) {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    
    const subject = 'Welcome to Riders Pool - Verify Your Email';
    const html = this.getVerificationEmailTemplate(verificationLink);
    const text = `Welcome to Riders Pool! Please verify your email by visiting: ${verificationLink}`;
    
    const result = await this.sendEmail(email, subject, html, text);
    return {
      ...result,
      verificationLink: verificationLink
    };
  }

  // Send ride notification email
  async sendRideNotificationEmail(email, rideDetails) {
    const subject = `🚗 New ride available: ${rideDetails.from} to ${rideDetails.to}`;
    const html = this.getRideNotificationTemplate(rideDetails);
    const text = `New ride available from ${rideDetails.from} to ${rideDetails.to} on ${rideDetails.date}. Check the app for details.`;
    
    return await this.sendEmail(email, subject, html, text);
  }

  getVerificationEmailTemplate(verificationLink) {
    return `
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
    `;
  }

  getRideNotificationTemplate(rideDetails) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 20px;">
        <h1 style="color: #60a5fa;">🚗 New Ride Available!</h1>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
          <h3>Ride Details:</h3>
          <p><strong>From:</strong> ${rideDetails.from}</p>
          <p><strong>To:</strong> ${rideDetails.to}</p>
          <p><strong>Date:</strong> ${rideDetails.date}</p>
          <p><strong>Time:</strong> ${rideDetails.time}</p>
          <p><strong>Price:</strong> ₹${rideDetails.price}</p>
        </div>
        <p style="margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}" style="color: #60a5fa;">Open Riders Pool App</a>
        </p>
      </div>
    `;
  }
}

module.exports = new EmailService();
