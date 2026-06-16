// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import JwtService from '../utils/jwt';
import ApiResponse from '../utils/response';
import { RoleName } from '../types/api.types';

/**
 * Middleware xác thực JWT token
 * Gắn req.user = { id, email, role } nếu hợp lệ
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = JwtService.extractToken(req.headers.authorization);

  if (!token) {
    res.status(401).json(ApiResponse.error('No token provided'));
    return;
  }

  try {
    const decoded = JwtService.verifyToken(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    res.status(401).json(ApiResponse.error('Invalid or expired token'));
  }
}

/**
 * Middleware phân quyền theo role
 * Dùng sau authMiddleware
 *
 * @example
 * router.post('/', authMiddleware, authorize(['admin', 'instructor']), handler)
 */
export function authorize(allowedRoles: RoleName[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(ApiResponse.error('Unauthorized'));
      return;
    }

    if (!allowedRoles.includes(req.user.role as RoleName)) {
      res.status(403).json(
        ApiResponse.error(`Forbidden: requires role ${allowedRoles.join(' or ')}`)
      );
      return;
    }

    next();
  };
}
