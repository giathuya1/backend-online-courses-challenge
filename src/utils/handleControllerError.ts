// src/utils/handleControllerError.ts
// Single place that turns a thrown error into an HTTP response.
// Every controller calls this instead of defining its own local
// handleError/handleProviderError — formatting can no longer drift
// between modules.

import { Response, NextFunction } from 'express';
import ApiResponse from './response';
import { AppError, ValidationError, FieldError } from './errors';

export function handleControllerError(err: any, res: Response, next: NextFunction) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(ApiResponse.validationError(err.violations, err.message));
  }
  if (err instanceof FieldError) {
    return res.status(err.statusCode).json(
      ApiResponse.validationError([{ field: err.field, rule: err.rule, message: err.message }])
    );
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(ApiResponse.error(err.message));
  }

  // Legacy fallback: some code may still throw a plain object
  // (`throw { statusCode, message }`) instead of an AppError subclass.
  // Kept so nothing breaks during migration — safe to delete once every
  // provider has been switched over to the classes in utils/errors.ts.
  if (err?.violations) {
    return res.status(err.statusCode ?? 400).json(ApiResponse.validationError(err.violations, err.message));
  }
  if (err?.field) {
    return res.status(err.statusCode ?? 400).json(
      ApiResponse.validationError([{ field: err.field, rule: err.rule ?? 'invalid', message: err.message }])
    );
  }
  if (err?.statusCode) {
    return res.status(err.statusCode).json(ApiResponse.error(err.message));
  }

  return next(err);
}