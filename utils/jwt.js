/**
 * JWT Authentication Utility
 * Generate and verify JWT tokens
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';

class JwtService {
  /**
   * Generate JWT token
   * @param {number} userId - User ID
   * @param {string} email - User email
   * @param {string} role - User role
   * @returns {string} JWT token
   */
  static generateToken(userId, email, role) {
    try {
      const payload = {
        sub: userId,
        email,
        role
      };
      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
        issuer: 'online-learning-api'
      });
      return token;
    } catch (error) {
      logger.error('JWT generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {object} Decoded token payload
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      logger.error('JWT verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Token or null
   */
  static extractToken(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }
}

module.exports = JwtService;
