// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import logger from './logger';
import { JwtPayload } from '../types/express.d';

const ACCESS_TOKEN_SECRET: string = process.env.JWT_SECRET || 'your_super_secret_key';
const ACCESS_TOKEN_EXPIRY: string = process.env.JWT_EXPIRY || '1h';

// IMPORTANT: refresh tokens must use a DIFFERENT secret than access tokens.
// If they shared a secret, leaking either one's signing key would let an
// attacker forge the other token type too. Falls back to a derived value
// so local/dev setups keep working without extra .env config, but you
// should set JWT_REFRESH_SECRET explicitly in production.
const REFRESH_TOKEN_SECRET: string = process.env.JWT_REFRESH_SECRET || `${ACCESS_TOKEN_SECRET}_refresh`;
const REFRESH_TOKEN_EXPIRY: string = process.env.JWT_REFRESH_EXPIRY || '30d';

export interface RefreshTokenPayload {
  sub: number;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

class JwtService {
  // ── Access token: short-lived, sent on every authenticated request ─────
  static generateToken(userId: number, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'],
      issuer: 'online-learning-api',
    });
  }

  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET) as unknown as JwtPayload;
    } catch (error) {
      logger.warn('Access token verification failed', { error: (error as Error).message });
      throw error;
    }
  }

  // ── Refresh token: long-lived, only ever sent to /refresh-token & /revoke-token ──
  static generateRefreshToken(userId: number): string {
    const payload: Pick<RefreshTokenPayload, 'sub' | 'type'> = { sub: userId, type: 'refresh' };
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'],
      issuer: 'online-learning-api',
    });
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as unknown as RefreshTokenPayload;
      if (decoded.type !== 'refresh') throw new Error('Token is not a refresh token');
      return decoded;
    } catch (error) {
      logger.warn('Refresh token verification failed', { error: (error as Error).message });
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