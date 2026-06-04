const nodemailer = require('nodemailer');
const logger = require('./logger');

// Setup email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Test connection on startup
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email service error:', error.message);
    console.error('❌ Email service not configured properly. Check .env file.');
  } else {
    logger.info('✅ Email service is ready');
    console.log('✅ Email service connected successfully');
  }
});

class EmailService {
  /**
   * Send OTP via email
   */
  static async sendOtpEmail(email, otp, userName) {
    try {
      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
              <h1 style="color: #333;">🔐 Verify Your Email</h1>
              <p style="color: #666; font-size: 16px;">Hi ${userName},</p>
              <p style="color: #666; font-size: 16px;">Thank you for registering! Your One-Time Password (OTP) is:</p>
              
              <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h2 style="margin: 0; font-size: 48px; letter-spacing: 5px; font-weight: bold;">${otp}</h2>
              </div>
              
              <p style="color: #d32f2f; font-size: 14px; font-weight: bold;">
                ⏰ This OTP expires in 5 minutes.
              </p>
              
              <p style="color: #666; font-size: 14px;">
                If you didn't request this, please ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                © 2026 Online Learning System. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: '🔐 Verify Your Email - Online Learning System',
        html: htmlContent
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('✅ OTP email sent successfully', { email, messageId: info.messageId });
      console.log(`✅ OTP sent to: ${email}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to send OTP email', { email, error: error.message });
      console.error(`❌ Email error: ${error.message}`);
      throw new Error('Failed to send verification email: ' + error.message);
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(email, userName) {
    try {
      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
              <h1 style="color: #333;">✅ Welcome to Online Learning System! 🎉</h1>
              <p style="color: #666;">Hi ${userName},</p>
              <p style="color: #666;">Your account has been successfully verified. You can now access all our courses.</p>
              <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/login.html" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Learning</a></p>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: '✅ Welcome to Online Learning System',
        html: htmlContent
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('✅ Welcome email sent', { email, messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error('❌ Failed to send welcome email', { email, error: error.message });
      return false;
    }
  }
}

module.exports = EmailService;