import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

// Fix ENETUNREACH for IPv6 on some cloud platforms (like Render)
dns.setDefaultResultOrder('ipv4first');

@Injectable()
export class MailerService {
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string | null;
  private readonly logger = new Logger(MailerService.name);

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 587);
    this.from = process.env.SMTP_FROM?.trim() || user || null;
    if (!host || !user || !pass) {
      this.transporter = null;
      this.logger.warn('SMTP is not configured; email delivery is disabled.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host, port, secure: port === 465,
      connectionTimeout: 10000, greetingTimeout: 10000,
      auth: { user, pass },
    });
  }

  private wait(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }

  async sendMail(email: string, subject: string, html: string) {
    if (!this.transporter || !this.from) {
      this.logger.error('SMTP is not configured; unable to send email.');
      return false;
    }
    try {
      const info = await this.transporter.sendMail({
        from: `"QuizMaster" <${this.from}>`,
        to: email,
        subject,
        html,
      });
      
      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch {
      this.logger.error('Error sending email.');
      return false;
    }
  }

  async sendOtpEmail(email: string, otp: string, type: 'REGISTER' | 'FORGOT_PASSWORD') {
    const subject = type === 'REGISTER' 
      ? 'Mã xác thực tài khoản QuizMaster' 
      : 'Khôi phục mật khẩu QuizMaster';

    const text = type === 'REGISTER'
      ? `Chào bạn,\n\nMã xác thực đăng ký tài khoản của bạn là: ${otp}\nMã này sẽ hết hạn trong vòng 5 phút.\n\nTrân trọng,\nĐội ngũ QuizMaster`
      : `Chào bạn,\n\nMã xác thực để khôi phục mật khẩu của bạn là: ${otp}\nMã này sẽ hết hạn trong vòng 5 phút.\n\nTrân trọng,\nĐội ngũ QuizMaster`;

    const html = type === 'REGISTER'
      ? `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4F46E5;">Chào mừng đến với QuizMaster!</h2>
          <p>Mã xác thực đăng ký tài khoản của bạn là:</p>
          <h1 style="background: #F3F4F6; padding: 10px 20px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">${otp}</h1>
          <p style="color: #6B7280; font-size: 14px;">Mã này sẽ hết hạn trong vòng 5 phút.</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4F46E5;">Khôi phục mật khẩu QuizMaster</h2>
          <p>Mã xác thực để đổi mật khẩu mới của bạn là:</p>
          <h1 style="background: #F3F4F6; padding: 10px 20px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">${otp}</h1>
          <p style="color: #6B7280; font-size: 14px;">Mã này sẽ hết hạn trong vòng 5 phút.</p>
        </div>
      `;

    if (!this.transporter || !this.from) {
      this.logger.error('SMTP is not configured; unable to deliver OTP email.');
      return false;
    }
    // Render and SMTP providers can have a transient connection failure while
    // an instance is starting. Retry the same OTP; never generate a second
    // code between attempts, otherwise a delayed first email becomes invalid.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.transporter.sendMail({
          from: `"QuizMaster" <${this.from}>`,
          to: email,
          subject,
          text,
          html,
        });

        this.logger.log(`OTP email sent on attempt ${attempt}.`);
        return true;
      } catch {
        if (attempt < 3) {
          this.logger.warn(`OTP email delivery failed (attempt ${attempt}/3); retrying.`);
          await this.wait(attempt * 750);
        }
      }
    }

    this.logger.error('OTP email delivery failed after 3 attempts.');
    return false;
  }
}
