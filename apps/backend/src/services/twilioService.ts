import twilio from 'twilio';
import { logger } from '../utils/logger';

// In development, log OTPs to console instead of sending real SMS
const isDev = process.env.NODE_ENV !== 'production';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const twilioService = {
  async sendOtp(phone: string, otp: string): Promise<void> {
    if (isDev) {
      logger.info(`[DEV] OTP for ${phone}: ${otp}`);
      return;
    }
    await client.messages.create({
      body: `Esta Feito: O seu código de verificação é ${otp}. Válido por 10 minutos.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  },
};
