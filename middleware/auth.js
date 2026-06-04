/**
 * Authentication Middleware
 * Verify JWT token and attach user info to request
 */

const JwtService = require('../utils/jwt');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JwtService.extractToken(authHeader);

    if (!token) {
      logger.warn('Missing or invalid authorization header', {
        path: req.path,
        ip: req.ip
      });
      return res.status(401).json(ApiResponse.error('Missing authorization token'));
    }

    const decoded = JwtService.verifyToken(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.warn('Auth failed', { error: error.message, path: req.path });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(ApiResponse.error('Token expired'));
    }
    
    return res.status(401).json(ApiResponse.error('Invalid token'));
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(ApiResponse.error('Not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        allowedRoles,
        path: req.path
      });
      return res.status(403).json(ApiResponse.error('Insufficient permissions'));
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  authorize
};
