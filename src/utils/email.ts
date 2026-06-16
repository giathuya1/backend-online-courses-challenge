// src/utils/email.ts
import nodemailer from 'nodemailer';
import logger from './logger';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

transporter.verify((error) => {
  if (error) {
    logger.error('Email service error:', { message: (error as Error).message });
    console.error('❌ Email service not configured properly.');
  } else {
    logger.info('✅ Email service is ready');
    console.log('✅ Email service connected successfully');
  }
});

class EmailService {
  static async sendOtpEmail(email: string, otp: string, userName: string): Promise<boolean> {
    const htmlContent = `
      <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;">
        <div style="max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:8px;">
          <h1 style="color:#333;">🔐 Verify Your Email</h1>
          <p>Hi ${userName},</p>
          <p>Your OTP is:</p>
          <div style="background:#007bff;color:white;padding:20px;border-radius:8px;text-align:center;">
            <h2 style="margin:0;font-size:48px;letter-spacing:5px;">${otp}</h2>
          </div>
          <p style="color:#d32f2f;font-weight:bold;">⏰ Expires in 5 minutes.</p>
        </div>
      </body></html>`;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '🔐 Verify Your Email - Online Learning System',
      html: htmlContent
    });
    logger.info('OTP email sent', { email, messageId: info.messageId });
    return true;
  }

  static async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    try {
      const htmlContent = `
        <html><body style="font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:20px;">
            <h1>✅ Welcome to Online Learning System! 🎉</h1>
            <p>Hi ${userName}, your account is now active.</p>
            <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/login.html"
              style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
              Start Learning</a></p>
          </div>
        </body></html>`;

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: '✅ Welcome to Online Learning System',
        html: htmlContent
      });
      logger.info('Welcome email sent', { email, messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send welcome email', { email, error: (error as Error).message });
      return false;
    }
  }
}

export default EmailService;