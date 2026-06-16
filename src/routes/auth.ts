// src/routes/auth.ts
// Routes only — no logic, no Swagger annotations (moved to controller).

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as AuthController from '../controllers/auth.controller';

const router = Router(); 

router.post('/register',   AuthController.register);
router.post('/send-otp',   authMiddleware, AuthController.sendOtp);
router.post('/verify-otp', authMiddleware, AuthController.verifyOtp);
router.post('/login',      AuthController.login);
router.get( '/profile',    authMiddleware, AuthController.getProfile);
router.post('/logout',     authMiddleware, AuthController.logout);

export default router;