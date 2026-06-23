// src/middleware/errorHandler.ts
// Single, final-resort error handler mounted at the very end of app.ts.
// Mirrors the same AppError-aware logic as handleControllerError, so any
// error a controller forgot to catch/forward still produces the exact same
// { success, message, violations? } shape instead of Express's default
// HTML error page (which would leak stack traces to clients).

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError, ValidationError, FieldError } from '../utils/errors';
import ApiResponse from '../utils/response';

export function errorHandler(
  err: Error & { statusCode?: number; status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Known, structured domain errors — same branching as handleControllerError.
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(ApiResponse.validationError(err.violations, err.message));
  }
  if (err instanceof FieldError) {
    return res.status(err.statusCode).json(
      ApiResponse.validationError([{ field: err.field, rule: err.rule, message: err.message }]),
    );
  }

  const status = err instanceof AppError ? err.statusCode : (err.statusCode || err.status || 500);

  // 5xx = something we didn't anticipate -> log full stack for debugging.
  // 4xx = expected client error that slipped past a controller's try/catch
  // -> log at warn, no stack noise.
  if (status >= 500) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
  } else {
    logger.warn('Unhandled client error', { message: err.message, status });
  }

  return res.status(status).json(ApiResponse.error(err.message || 'Internal server error'));
}

export default errorHandler;