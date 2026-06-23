// src/validators/auth.validator.ts

import { FieldValidator, ValidationViolation } from './common.validator';
import { RegisterRequestBody, LoginRequestBody, VerifyOtpBody, RefreshTokenBody } from '../types/api.types';

export const validateRegister = (body: Partial<RegisterRequestBody>): ValidationViolation[] => {
  const violations: ValidationViolation[] = [
    ...new FieldValidator(body.email,           'email'          ).required().email().minLength(5).maxLength(100).violations,
    ...new FieldValidator(body.username,        'username'       ).required().minLength(3).maxLength(30).violations,
    ...new FieldValidator(body.name,             'name'           ).required().minLength(1).maxLength(100).violations,
    ...new FieldValidator(body.password,         'password'       ).required().minLength(8).maxLength(72).violations,
    ...new FieldValidator(body.confirmPassword,  'confirmPassword').required().violations,
  ];

  if (violations.length === 0 && body.password !== body.confirmPassword) {
    violations.push({ field: 'confirmPassword', rule: 'match', message: 'confirmPassword must match password' });
  }

  return violations;
};

export const validateLogin = (body: Partial<LoginRequestBody>): ValidationViolation[] => [
  ...new FieldValidator(body.email,    'email'   ).required().violations,
  ...new FieldValidator(body.password, 'password').required().violations,
];

export const validateVerifyOtp = (body: Partial<VerifyOtpBody>): ValidationViolation[] => [
  ...new FieldValidator(body.otp, 'otp').required().minLength(6).maxLength(6).violations,
];

// ─── NEW: refresh-token validator ──────────────────────────────────────────
export const validateRefreshToken = (body: Partial<RefreshTokenBody>): ValidationViolation[] => [
  ...new FieldValidator(body.refresh_token, 'refresh_token').required().violations,
];
