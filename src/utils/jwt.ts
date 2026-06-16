// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import logger from './logger';
import { JwtPayload } from '../types/express.d';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your_super_secret_key';
const JWT_EXPIRY: string = process.env.JWT_EXPIRY || '1h';

class JwtService {
  static generateToken(userId: number, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY as jwt.SignOptions['expiresIn'],
      issuer: 'online-learning-api',
    });
  }

  static verifyToken(token: string): JwtPayload {
    try {
      // FIX: cast qua unknown trước để tránh lỗi overlap
      return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    } catch (error) {
      logger.error('JWT verification failed', { error: (error as Error).message });
      throw error;
    }
  }

  static extractToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }
}

export default JwtService;