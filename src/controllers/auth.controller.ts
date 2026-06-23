// src/controllers/auth.controller.ts
// Handles HTTP concerns only: parse req -> call service -> send res.
// Zero business logic here — that's all in services/auth.service.ts now.

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { AuthService } from '../services/auth.service';
import { handleControllerError } from '../utils/handleControllerError';
import {
  validateRegister, validateLogin, validateVerifyOtp, validateRefreshToken,
} from '../validators/auth.validator';

// ─── POST /api/auth/register ────────────────────────────────────────────────
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
    const data = await AuthService.register(req.body);
    return res.status(201).json(ApiResponse.success('Registration successful! OTP sent to your email.', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── POST /api/auth/send-otp ────────────────────────────────────────────────
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
    const data = await AuthService.sendOtp(req.user!.id, req.user!.email);
    return res.status(200).json(ApiResponse.success('OTP resent', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── POST /api/auth/verify-otp ──────────────────────────────────────────────
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
 *       200: { description: Email verified — returns access_token + refresh_token }
 */
export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  const violations = validateVerifyOtp(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await AuthService.verifyOtp(req.user!.id, req.user!.email, req.body);
    return res.status(200).json(ApiResponse.success('Email verified.', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────
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
 *       200: { description: Login successful — returns access_token + refresh_token }
 *       401: { description: Invalid credentials }
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  const violations = validateLogin(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await AuthService.login(req.body);
    return res.status(200).json(ApiResponse.success('Login successful', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── POST /api/auth/refresh-token ───────────────────────────────────────────
/**
 * @openapi
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a valid refresh token for a new access+refresh pair (rotation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200: { description: New token pair issued }
 *       401: { description: Refresh token invalid, expired, or revoked }
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  const violations = validateRefreshToken(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await AuthService.refreshToken(req.body.refresh_token);
    return res.status(200).json(ApiResponse.success('Token refreshed', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── POST /api/auth/revoke-token ────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/revoke-token:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke the current user's refresh token (force-logout this account everywhere)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Refresh token revoked }
 */
export async function revokeToken(req: Request, res: Response, next: NextFunction) {
  try {
    await AuthService.revokeToken(req.user!.id);
    return res.status(200).json(ApiResponse.success('Refresh token revoked'));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── GET /api/auth/profile ───────────────────────────────────────────────────
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
    const data = await AuthService.getProfile(req.user!.id);
    return res.status(200).json(ApiResponse.success('Profile retrieved', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout — revokes the refresh token server-side
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // Upgrade from the original purely-client-side logout: now the
    // refresh token is actually invalidated server-side too, so a leaked
    // refresh token can't keep minting new access tokens after logout.
    await AuthService.revokeToken(req.user!.id);
    return res.status(200).json(ApiResponse.success('Logout successful'));
  } catch (err: any) { return handleControllerError(err, res, next); }
}
