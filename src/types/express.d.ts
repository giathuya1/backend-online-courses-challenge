// src/types/express.d.ts
// Extend Express Request để thêm user từ JWT middleware

import { Request } from 'express';

/**
 * Payload được decode từ JWT token
 */
export interface JwtPayload {
  sub: number;       // User ID
  email: string;
  role: string;      // 'admin' | 'instructor' | 'student' | 'unverified'
  iat?: number;
  exp?: number;
  iss?: string;
}

/**
 * User object gắn vào Request sau khi qua authMiddleware
 */
export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

// Mở rộng Express namespace để req.user có type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Typed Request helpers
export type AuthRequest = Request & { user: AuthUser };  // user đã verified (non-nullable)
