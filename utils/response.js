/**
 * API Response Wrapper
 * Standardize all API responses to JSON format
 */

class ApiResponse {
  constructor(success, message, data = null, violations = null) {
    this.success = success;
    this.message = message;
    if (data !== null) this.data = data;
    if (violations && violations.length > 0) this.violations = violations;
  }

  static success(message, data = null) {
    return new ApiResponse(true, message, data);
  }

  static error(message, violations = null) {
    return new ApiResponse(false, message, null, violations);
  }

  static validationError(violations) {
    return new ApiResponse(false, 'Validation failed', null, violations);
  }
}

module.exports = ApiResponse;
