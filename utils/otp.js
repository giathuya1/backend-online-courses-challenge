const bcrypt = require('bcrypt');
const logger = require('./logger');

class OtpService {
  static generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async hashOtp(otp) {
    try {
      return await bcrypt.hash(otp, 10);
    } catch (error) {
      logger.error('Failed to hash OTP', { error: error.message });
      throw error;
    }
  }

  static async verifyOtp(plainOtp, hashedOtp) {
    try {
      return await bcrypt.compare(plainOtp, hashedOtp);
    } catch (error) {
      logger.error('Failed to verify OTP', { error: error.message });
      return false;
    }
  }

  // DB: otp_expiry BIGINT (epoch ms)
  static isOtpExpired(expiryTime) {
    if (!expiryTime) return true;
    const expMs = Number(expiryTime);
    if (!Number.isFinite(expMs)) return true;
    return Date.now() > expMs;
  }

  // return epoch ms
  static getOtpExpiryTime() {
    const minutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
    return Date.now() + minutes * 60 * 1000;
  }
}

module.exports = OtpService;