// src/utils/email.ts
// Transport-layer adapter: ONLY knows how to send an email via nodemailer.
// Decides nothing about WHO to email or WHEN — that's the service layer's
// job (see services/class.service.ts calling EmailService.trySend()).

import nodemailer from 'nodemailer';
import logger from './logger';
import {
  otpEmailTemplate,
  welcomeEmailTemplate,
  enrollmentConfirmationTemplate,
} from '../templates/email.templates';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
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
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '🔐 Verify Your Email - Online Learning System',
      html: otpEmailTemplate(otp, userName),
    });
    logger.info('OTP email sent', { email, messageId: info.messageId });
    return true;
  }

  static async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '✅ Welcome to Online Learning System',
      html: welcomeEmailTemplate(userName, process.env.APP_URL || 'http://localhost:5000'),
    });
    logger.info('Welcome email sent', { email, messageId: info.messageId });
    return true;
  }

  /**
   * FIX: this method was called by classes.provider.ts's bulkEnroll() in
   * the original codebase but never actually existed in email.ts — the
   * first real bulk-enroll request would have thrown
   * "EmailService.sendEnrollmentConfirmationEmail is not a function".
   */
  static async sendEnrollmentConfirmationEmail(
    email: string,
    studentName: string,
    className: string,
    courseTitle?: string,
  ): Promise<boolean> {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `🎓 You're enrolled in ${className}`,
      html: enrollmentConfirmationTemplate(studentName, className, courseTitle),
    });
    logger.info('Enrollment confirmation email sent', { email, messageId: info.messageId });
    return true;
  }

  /**
   * Fire-and-forget wrapper: send an email but never let a failure (bad
   * SMTP creds, network blip, invalid address...) bubble up and crash a
   * request that has already succeeded otherwise — e.g. don't fail a
   * bulk-enroll transaction just because one confirmation email bounced.
   *
   * Previously duplicated as a private `tryEmail()` function inside
   * auth.provider.ts; centralized here so EVERY caller (auth, classes,
   * future modules) behaves identically and logs in the same format.
   */
  static async trySend(fn: () => Promise<unknown>, label: string): Promise<void> {
    try {
      await fn();
    } catch (e) {
      logger.warn(`Email failed [${label}]`, { error: (e as Error).message });
    }
  }
}

export default EmailService;
