// src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { authMiddleware } from '../middleware/auth';
import JwtService from '../utils/jwt';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import EmailService from '../utils/email';
import OtpService from '../utils/otp';
import db from '../database/connection';
import { RegisterRequestBody, LoginRequestBody, VerifyOtpBody, ValidationViolation } from '../types/api.types';

const router = Router();
const { User, UserAuth, UserRole, Role } = db;

router.post('/register', async (req: Request<{}, {}, RegisterRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { email, username, name, password, confirmPassword } = req.body;

    const violations: ValidationViolation[] = [];
    if (!email) violations.push({ field: 'email', rule: 'required', message: 'Email is required' });
    if (!username) violations.push({ field: 'username', rule: 'required', message: 'Username is required' });
    if (!name) violations.push({ field: 'name', rule: 'required', message: 'Name is required' });
    if (!password) violations.push({ field: 'password', rule: 'required', message: 'Password is required' });
    if (password && password.length < 6) violations.push({ field: 'password', rule: 'min', message: 'Password must be at least 6 characters' });
    if (password !== confirmPassword) violations.push({ field: 'confirmPassword', rule: 'match', message: 'Passwords do not match' });
    if (violations.length > 0) return res.status(400).json(ApiResponse.validationError(violations));

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) return res.status(400).json(ApiResponse.validationError([{ field: 'email', rule: 'unique', message: 'Email already registered' }]));

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) return res.status(400).json(ApiResponse.validationError([{ field: 'username', rule: 'unique', message: 'Username already taken' }]));

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, username, name, status: 'inactive' });
    const auth = await UserAuth.create({ user_id: newUser.id, password_hash: passwordHash });

    const studentRole = await Role.findOne({ where: { name: 'student' } });
    if (studentRole) await UserRole.create({ user_id: newUser.id, role_id: studentRole.id });

    const tempToken = JwtService.generateToken(newUser.id, newUser.email, 'unverified');

    try {
      const plainOtp = OtpService.generateOtp();
      const hashedOtp = await OtpService.hashOtp(plainOtp);
      const expiryTime = OtpService.getOtpExpiryTime();
      await auth.update({ otp_hash: hashedOtp, otp_expiry: BigInt(expiryTime) });
      await EmailService.sendOtpEmail(email, plainOtp, name);
      logger.info('User registered + OTP sent', { userId: newUser.id, email });

      return res.status(201).json(ApiResponse.success('Registration successful! OTP sent to your email.', {
        id: newUser.id, email: newUser.email, username: newUser.username,
        name: newUser.name, status: newUser.status,
        temp_token: tempToken, temp_token_expires_in: '10 minutes',
        otp_sent: true,
      }));
    } catch (emailError) {
      logger.error('OTP send failed', { error: (emailError as Error).message });
      return res.status(201).json(ApiResponse.success('Registration successful but OTP send failed.', {
        id: newUser.id, email: newUser.email, username: newUser.username,
        name: newUser.name, status: newUser.status,
        temp_token: tempToken, otp_sent: false,
      }));
    }
  } catch (error) { return next(error); }
});

router.post('/send-otp', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json(ApiResponse.error('User not found'));
    if (user.status === 'active') return res.status(400).json(ApiResponse.error('User already verified'));

    let auth = await UserAuth.findByPk(userId);
    if (!auth) auth = await UserAuth.create({ user_id: userId, password_hash: '' });

    const plainOtp = OtpService.generateOtp();
    const hashedOtp = await OtpService.hashOtp(plainOtp);
    const expiryTime = OtpService.getOtpExpiryTime();
    await auth.update({ otp_hash: hashedOtp, otp_expiry: BigInt(expiryTime) });

    try { await EmailService.sendOtpEmail(email, plainOtp, user.name); } catch {}

    return res.status(200).json(ApiResponse.success('OTP resent', { email, expiresIn: '5 minutes' }));
  } catch (error) { return next(error); }
});

router.post('/verify-otp', authMiddleware, async (req: Request<{}, {}, VerifyOtpBody>, res: Response, next: NextFunction) => {
  try {
    const { otp } = req.body;
    const userId = req.user!.id;
    const email = req.user!.email;

    if (!otp) return res.status(400).json(ApiResponse.validationError([{ field: 'otp', rule: 'required', message: 'OTP is required' }]));

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json(ApiResponse.error('User not found'));
    if (user.status === 'active') return res.status(400).json(ApiResponse.error('User already verified'));

    const auth = await UserAuth.findByPk(userId);
    if (!auth || !auth.otp_hash) return res.status(400).json(ApiResponse.error('No OTP found.'));

    if (OtpService.isOtpExpired(auth.otp_expiry))
      return res.status(400).json(ApiResponse.validationError([{ field: 'otp', rule: 'expired', message: 'OTP has expired.' }]));

    const isOtpValid = await OtpService.verifyOtp(otp, auth.otp_hash);
    if (!isOtpValid)
      return res.status(400).json(ApiResponse.validationError([{ field: 'otp', rule: 'invalid', message: 'Invalid OTP.' }]));

    await Promise.all([auth.update({ otp_hash: null, otp_expiry: null }), user.update({ status: 'active' })]);

    const userRole = await UserRole.findOne({
      where: { user_id: userId },
      include: [{ model: Role, attributes: ['name'] }]
    });
    const role = (userRole as any)?.role?.name ?? 'student';
    const finalToken = JwtService.generateToken(userId, email, role);

    try { await EmailService.sendWelcomeEmail(email, user.name); } catch {}

    return res.status(200).json(ApiResponse.success('Email verified.', {
      id: user.id, email: user.email, username: user.username,
      name: user.name, status: 'active', access_token: finalToken, expires_in: '1h'
    }));
  } catch (error) { return next(error); }
});

router.post('/login', async (req: Request<{}, {}, LoginRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const violations: ValidationViolation[] = [];
    if (!email) violations.push({ field: 'email', rule: 'required', message: 'Email or username is required' });
    if (!password) violations.push({ field: 'password', rule: 'required', message: 'Password is required' });
    if (violations.length > 0) return res.status(400).json(ApiResponse.validationError(violations));

    const user = await User.findOne({ where: { [Op.or]: [{ email }, { username: email }] } });
    if (!user) return res.status(401).json(ApiResponse.error('Invalid email/username or password'));
    if (user.status !== 'active') return res.status(401).json(ApiResponse.error('Account not verified.'));

    const auth = await UserAuth.findByPk(user.id);
    if (!auth) return res.status(500).json(ApiResponse.error('Auth data not found'));

    const isPasswordValid = await bcrypt.compare(password, auth.password_hash);
    if (!isPasswordValid) return res.status(401).json(ApiResponse.error('Invalid email/username or password'));

    const userRole = await UserRole.findOne({
      where: { user_id: user.id },
      include: [{ model: Role, attributes: ['name'] }]
    });
    const role = (userRole as any)?.role?.name ?? 'student';
    const token = JwtService.generateToken(user.id, user.email, role);

    logger.info('User logged in', { userId: user.id, email });
    return res.status(200).json(ApiResponse.success('Login successful', {
      access_token: token, expires_in: '1h',
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role }
    }));
  } catch (error) { return next(error); }
});

router.get('/profile', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByPk(req.user!.id, {
      include: [{ model: UserRole, as: 'user_roles', include: [{ model: Role, attributes: ['name'] }] }]
    });
    if (!user) return res.status(404).json(ApiResponse.error('User not found'));

    const roles_list = ((user as any).user_roles || []).map((ur: any) => ur.role?.name).filter(Boolean);
    return res.status(200).json(ApiResponse.success('Profile retrieved', {
      id: user.id, email: user.email, username: user.username,
      name: user.name, status: user.status, roles: roles_list, createdAt: user.created_at
    }));
  } catch (error) { return next(error); }
});

router.post('/logout', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('User logged out', { userId: req.user!.id });
    return res.status(200).json(ApiResponse.success('Logout successful'));
  } catch (error) { return next(error); }
});

export default router;