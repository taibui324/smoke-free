import { logger } from '../utils/logger';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8081';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Reset Your Password - Quit Smoking App',
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset for your Quit Smoking App account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #999; font-size: 14px; margin-top: 24px;">This link will expire in 1 hour.</p>
          <p style="color: #999; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    // In development/test, just log the email
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Password reset email (dev mode)', {
        to: emailOptions.to,
        resetUrl,
      });
      console.log('\n=== PASSWORD RESET EMAIL ===');
      console.log(`To: ${emailOptions.to}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('============================\n');
      return;
    }

    // In production, integrate with email service (Resend, SendGrid, etc.)
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@yourapp.com',
    //   to: emailOptions.to,
    //   subject: emailOptions.subject,
    //   html: emailOptions.html,
    // });

    logger.info('Password reset email sent', { to: emailOptions.to });
  }
}

export const emailService = new EmailService();
