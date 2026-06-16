// src/utils/response.ts
import { ValidationViolation } from '../types/api.types';

/**
 * Standardized API Response wrapper
 * Giống JS version nhưng có full type safety
 */
export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data?: T;
  public readonly violations?: ValidationViolation[];

  private constructor(
    success: boolean,
    message: string,
    data?: T,
    violations?: ValidationViolation[]
  ) {
    this.success = success;
    this.message = message;
    if (data !== undefined && data !== null) this.data = data;
    if (violations && violations.length > 0) this.violations = violations;
  }

  static success<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(true, message, data);
  }

  static error(message: string, violations?: ValidationViolation[]): ApiResponse<null> {
    return new ApiResponse<null>(false, message, null, violations);
  }

  static validationError(violations: ValidationViolation[], message = 'Validation failed'): ApiResponse<null> {
    return new ApiResponse<null>(false, message, null, violations);
  }
}

export default ApiResponse;
