// src/utils/otp.ts
import bcrypt from 'bcrypt';
import logger from './logger';

class OtpService {
  static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async hashOtp(otp: string): Promise<string> {
    try {
      return await bcrypt.hash(otp, 10);
    } catch (error) {
      logger.error('Failed to hash OTP', { error: (error as Error).message });
      throw error;
    }
  }

  static async verifyOtp(plainOtp: string, hashedOtp: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainOtp, hashedOtp);
    } catch (error) {
      logger.error('Failed to verify OTP', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Check if OTP is expired
   * @param expiryTime - Epoch milliseconds (BIGINT từ DB)
   */
  static isOtpExpired(expiryTime: bigint | number | string | null | undefined): boolean {
    if (expiryTime == null) return true;
    const expMs = Number(expiryTime);
    if (!Number.isFinite(expMs)) return true;
    return Date.now() > expMs;
  }

  /**
   * Get OTP expiry time as epoch ms
   */
  static getOtpExpiryTime(): number {
    const minutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
    return Date.now() + minutes * 60 * 1000;
  }
}

export default OtpService;
