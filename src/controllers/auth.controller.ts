// src/controllers/auth.controller.ts
// Handles HTTP concerns only: parse req → call provider → send res.
// Zero business logic here.

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { AuthProvider } from '../providers/auth.provider';
import { validateRegister, validateLogin, validateVerifyOtp } from '../validators/auth.validator';

// ─── Helper: normalise provider thrown errors ─────────────────────────────────
function handleProviderError(err: any, res: Response, next: NextFunction) {
  if (err.field)
    return res.status(err.statusCode ?? 400).json(
      ApiResponse.validationError([{ field: err.field, rule: err.rule ?? 'invalid', message: err.message }])
    );
  if (err.statusCode)
    return res.status(err.statusCode).json(ApiResponse.error(err.message));
  return next(err);
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, name, password, confirmPassword]
 *             properties:
 *               email:           { type: string, example: "user@example.com" }
 *               username:        { type: string, example: "johndoe" }
 *               name:            { type: string, example: "John Doe" }
 *               password:        { type: string, example: "SecurePass123" }
 *               confirmPassword: { type: string, example: "SecurePass123" }
 *     responses:
 *       201: { description: Registered — OTP sent }
 *       400: { description: Validation error }
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  const violations = validateRegister(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await AuthProvider.register(req.body);
    return res.status(201).json(ApiResponse.success('Registration successful! OTP sent to your email.', data));
  } catch (err: any) { return handleProviderError(err, res, next); }
}

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP to authenticated (unverified) user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OTP resent }
 */
export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await AuthProvider.sendOtp(req.user!.id, req.user!.email);
    return res.status(200).json(ApiResponse.success('OTP resent', data));
  } catch (err: any) { return handleProviderError(err, res, next); }
}

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and activate account
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Email verified — returns access_token }
 */
export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  const violations = validateVerifyOtp(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await AuthProvider.verifyOtp(req.user!.id, req.user!.email, req.body);
    return res.status(200).json(ApiResponse.success('Email verified.', data));
  } catch (err: any) { return handleProviderError(err, res, next); }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email/username + password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: "user@example.com" }
 *               password: { type: string, example: "SecurePass123" }
 *     responses:
 *       200: { description: Login successful — returns access_token }
 *       401: { description: Invalid credentials }
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  const violations = validateLogin(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await AuthProvider.login(req.body);
    return res.status(200).json(ApiResponse.success('Login successful', data));
  } catch (err: any) { return handleProviderError(err, res, next); }
}

// ─── GET /api/auth/profile ────────────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile data }
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await AuthProvider.getProfile(req.user!.id);
    return res.status(200).json(ApiResponse.success('Profile retrieved', data));
  } catch (err: any) { return handleProviderError(err, res, next); }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (client-side token invalidation)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
export function logout(_req: Request, res: Response) {
  return res.status(200).json(ApiResponse.success('Logout successful'));
}