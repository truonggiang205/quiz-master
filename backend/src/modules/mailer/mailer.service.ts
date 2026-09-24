import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor() {
    // Ethereal fake SMTP configuration for testing. 
    // In production, replace with real SMTP credentials (e.g. Gmail App Password, SendGrid, etc) via process.env
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || 'zwkprilkn3d5vcu5@ethereal.email', // Replace with a newly generated ethereal account if this fails, or use real SMTP
        pass: process.env.SMTP_PASS || 'E8Qxz5sXp9FT7Kbbun'
      },
    });
  }

  async sendMail(email: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"QuizMaster" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html,
      });
      
      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw error;
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

    try {
      const info = await this.transporter.sendMail({
        from: `"QuizMaster" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        text,
        html,
      });
      
      this.logger.log(`Email sent: ${info.messageId}`);
      
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
         this.logger.log(`[ETHEREAL MAIL URL] Click here to view OTP: ${testUrl}`);
         // Also log the OTP directly so they don't even have to click the link
         this.logger.warn(`[DEV OTP] OTP is: ${otp}`);
      }
      return true;
    } catch (error) {
      this.logger.error('Error sending email. Please check your SMTP credentials.', error);
      // Fallback for development: Print the OTP to the console so development is not blocked
      this.logger.warn(`[DEV FALLBACK] Your OTP for ${email} is: ${otp}`);
      return false;
    }
  }
}
