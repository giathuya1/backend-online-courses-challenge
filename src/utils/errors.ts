// src/utils/errors.ts
// Standardized application error hierarchy. Providers/services throw these
// instead of plain `{ statusCode, message }` objects, so controllers don't
// need to guess the shape of what was thrown — `instanceof` tells the whole
// story.

import { ValidationViolation } from '../validators/common.validator';

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Generic 400 — request is malformed/violates a business rule, no single field to blame. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') { super(message, 400); }
}

/** Multiple field violations at once (mirrors ApiResponse.validationError). */
export class ValidationError extends AppError {
  public readonly violations: ValidationViolation[];
  constructor(violations: ValidationViolation[], message = 'Validation failed') {
    super(message, 400);
    this.violations = violations;
  }
}

/** A single named field is the problem (e.g. "email already registered"). */
export class FieldError extends AppError {
  public readonly field: string;
  public readonly rule: string;
  constructor(field: string, message: string, rule = 'invalid', statusCode = 400) {
    super(message, statusCode);
    this.field = field;
    this.rule = rule;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(message, 401); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, 403); }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') { super(message, 404); }
}

/** Request conflicts with current state (duplicate, already-exists, etc). */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(message, 409); }
}