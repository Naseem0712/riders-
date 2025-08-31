// SMS Service Configuration
// Support for Twilio, AWS SNS, and other providers

const twilio = require('twilio');

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'twilio'; // twilio, aws-sns, mock
    this.initializeProvider();
  }

  initializeProvider() {
    switch (this.provider) {
      case 'twilio':
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
          console.log('📱 Twilio SMS service initialized');
        } else {
          console.log('⚠️ Twilio credentials not found, using mock SMS');
          this.provider = 'mock';
        }
        break;
      
      case 'aws-sns':
        // AWS SNS implementation
        console.log('📱 AWS SNS not implemented yet, using mock SMS');
        this.provider = 'mock';
        break;
      
      default:
        console.log('📱 Using mock SMS service for development');
        this.provider = 'mock';
    }
  }

  async sendSMS(to, message) {
    try {
      switch (this.provider) {
        case 'twilio':
          const result = await this.client.messages.create({
            body: message,
            from: this.fromNumber,
            to: to
          });
          
          console.log(`📱 SMS sent via Twilio: ${result.sid}`);
          return {
            success: true,
            messageId: result.sid,
            provider: 'Twilio'
          };

        case 'aws-sns':
          // AWS SNS implementation would go here
          throw new Error('AWS SNS not implemented');

        default: // mock
          console.log(`\n🎯 ===== MOCK SMS =====`);
          console.log(`📱 To: ${to}`);
          console.log(`💬 Message: ${message}`);
          console.log(`🎯 ===================\n`);
          
          return {
            success: true,
            messageId: 'mock-' + Date.now(),
            provider: 'Mock Development Service'
          };
      }
    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error.message,
        provider: this.provider
      };
    }
  }

  // Send OTP specifically
  async sendOTP(mobile, otp) {
    const message = `Your Riders Pool verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    return await this.sendSMS(mobile, message);
  }

  // Send ride notification
  async sendRideNotification(mobile, rideDetails) {
    const message = `🚗 New ride available from ${rideDetails.from} to ${rideDetails.to} on ${rideDetails.date}. Check Riders Pool app for details.`;
    return await this.sendSMS(mobile, message);
  }
}

module.exports = new SMSService();
