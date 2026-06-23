// src/routes/auth.ts
// Routes only — no logic, no Swagger annotations (moved to controller).

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as AuthController from '../controllers/auth.controller';

const router = Router();

router.post('/register',      AuthController.register);
router.post('/send-otp',      authMiddleware, AuthController.sendOtp);
router.post('/verify-otp',    authMiddleware, AuthController.verifyOtp);
router.post('/login',         AuthController.login);

// Public on purpose: the whole point of a refresh token is to get a new
// access token AFTER the old access token has expired, so we cannot
// require authMiddleware (a valid access token) here.
router.post('/refresh-token', AuthController.refreshToken);

// Requires a still-valid access token — revoking is "kill my own session",
// not a public action.
router.post('/revoke-token',  authMiddleware, AuthController.revokeToken);

router.get( '/profile',       authMiddleware, AuthController.getProfile);
router.post('/logout',        authMiddleware, AuthController.logout);

export default router;
