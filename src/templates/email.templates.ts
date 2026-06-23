// src/templates/email.templates.ts
// Pure functions: data in -> HTML string out. No I/O, no side effects.
// This makes them trivial to unit test (assert on returned string) and
// trivial to replace later with a real templating engine (Handlebars,
// MJML, react-email...) without touching any EmailService call site.

export function otpEmailTemplate(otp: string, userName: string): string {
  return `
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
}

export function welcomeEmailTemplate(userName: string, appUrl: string): string {
  return `
    <html><body style="font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <h1>✅ Welcome to Online Learning System! 🎉</h1>
        <p>Hi ${userName}, your account is now active.</p>
        <p><a href="${appUrl}/login.html"
          style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
          Start Learning</a></p>
      </div>
    </body></html>`;
}

// NOTE: this template backs EmailService.sendEnrollmentConfirmationEmail(),
// which classes.provider.ts already calls today but which did not exist
// anywhere in utils/email.ts in the current codebase — bulk-enroll would
// crash on its very first successful run. See ARCHITECTURE.md "Bugs found".
export function enrollmentConfirmationTemplate(
  studentName: string,
  className: string,
  courseTitle?: string,
): string {
  return `
    <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;">
      <div style="max-width:600px;margin:0 auto;background:white;padding:24px;border-radius:8px;">
        <h1 style="color:#333;">🎓 You're enrolled!</h1>
        <p>Hi ${studentName},</p>
        <p>You have been successfully enrolled in:</p>
        <div style="background:#f0f7ff;border-left:4px solid #007bff;padding:16px;border-radius:4px;">
          <p style="margin:0;font-size:18px;font-weight:bold;">${className}</p>
          ${courseTitle ? `<p style="margin:4px 0 0;color:#555;">${courseTitle}</p>` : ''}
        </div>
        <p style="margin-top:20px;">See you in class!</p>
      </div>
    </body></html>`;
}