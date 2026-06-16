// src/providers/auth.provider.ts
// Pure business logic — no Express imports.

import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import db from '../database/connection';
import JwtService from '../utils/jwt';
import EmailService from '../utils/email';
import OtpService from '../utils/otp';
import logger from '../utils/logger';
import { RegisterRequestBody, LoginRequestBody, VerifyOtpBody } from '../types/api.types';

const { User, UserAuth, UserRole, Role } = db;

// ─── Shared includes ──────────────────────────────────────────────────────────
// Define once, reuse in multiple queries — avoids copy-paste errors.
const USER_ROLE_INCLUDE = {
  model: UserRole,
  as: 'user_roles',
  include: [{ model: Role, attributes: ['name'] }],
};

// ─── Helper: resolve primary role name for a user ─────────────────────────────
async function getUserRole(userId: number): Promise<string> {
  const userRole = await UserRole.findOne({
    where: { user_id: userId },
    include: [{ model: Role, attributes: ['name'] }],
  });
  return (userRole as any)?.role?.name ?? 'student';
}

// ─── Helper: fire-and-forget email without crashing the flow ──────────────────
// NOTE: `fn` is intentionally typed `Promise<unknown>` (not `Promise<void>`) —
// EmailService methods resolve to `boolean`, and we don't care about that
// value here, we only care whether the promise rejects.
async function tryEmail(fn: () => Promise<unknown>, label: string): Promise<void> {
  try { await fn(); }
  catch (e) { logger.warn(`Email failed [${label}]`, { error: (e as Error).message }); }
}

export const AuthProvider = {

  async register(body: RegisterRequestBody) {
    const { email, username, name, password } = body;

    // Check uniqueness in parallel — saves one round-trip
    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ where: { email } }),
      User.findOne({ where: { username } }),
    ]);
    if (existingEmail)    throw { statusCode: 400, field: 'email',    message: 'Email already registered' };
    if (existingUsername) throw { statusCode: 400, field: 'username', message: 'Username already taken' };

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user + auth + role in parallel where possible
    const newUser      = await User.create({ email, username, name, status: 'inactive' });
    const [auth, studentRole] = await Promise.all([
      UserAuth.create({ user_id: newUser.id, password_hash: passwordHash }),
      Role.findOne({ where: { name: 'student' } }),
    ]);
    if (studentRole) await UserRole.create({ user_id: newUser.id, role_id: studentRole.id });

    const tempToken = JwtService.generateToken(newUser.id, email, 'unverified');

    let otpSent = false;
    try {
      const plainOtp  = OtpService.generateOtp();
      const hashedOtp = await OtpService.hashOtp(plainOtp);
      await auth.update({ otp_hash: hashedOtp, otp_expiry: BigInt(OtpService.getOtpExpiryTime()) });
      await EmailService.sendOtpEmail(email, plainOtp, name);
      otpSent = true;
      logger.info('User registered + OTP sent', { userId: newUser.id, email });
    } catch (e) {
      logger.error('OTP send failed', { error: (e as Error).message });
    }

    return {
      id: newUser.id, email, username: newUser.username,
      name: newUser.name, status: newUser.status,
      temp_token: tempToken, otp_sent: otpSent,
    };
  },

  async sendOtp(userId: number, email: string) {
    const [user, auth] = await Promise.all([
      User.findByPk(userId),
      UserAuth.findByPk(userId),
    ]);
    if (!user) throw { statusCode: 404, message: 'User not found' };
    if (user.status === 'active') throw { statusCode: 400, message: 'User already verified' };

    const resolvedAuth = auth ?? await UserAuth.create({ user_id: userId, password_hash: '' });

    const plainOtp  = OtpService.generateOtp();
    const hashedOtp = await OtpService.hashOtp(plainOtp);
    await resolvedAuth.update({ otp_hash: hashedOtp, otp_expiry: BigInt(OtpService.getOtpExpiryTime()) });

    await tryEmail(() => EmailService.sendOtpEmail(email, plainOtp, user.name), 'sendOtp');
    return { email, expiresIn: '5 minutes' };
  },

  async verifyOtp(userId: number, email: string, body: VerifyOtpBody) {
    const [user, auth] = await Promise.all([
      User.findByPk(userId),
      UserAuth.findByPk(userId),
    ]);
    if (!user) throw { statusCode: 404, message: 'User not found' };
    if (user.status === 'active') throw { statusCode: 400, message: 'User already verified' };
    if (!auth?.otp_hash) throw { statusCode: 400, message: 'No OTP found.' };
    if (OtpService.isOtpExpired(auth.otp_expiry))
      throw { statusCode: 400, field: 'otp', rule: 'expired', message: 'OTP has expired.' };

    const valid = await OtpService.verifyOtp(body.otp, auth.otp_hash);
    if (!valid) throw { statusCode: 400, field: 'otp', rule: 'invalid', message: 'Invalid OTP.' };

    // Clear OTP + activate account in parallel
    await Promise.all([
      auth.update({ otp_hash: null, otp_expiry: null }),
      user.update({ status: 'active' }),
    ]);

    const role  = await getUserRole(userId);
    const token = JwtService.generateToken(userId, email, role);

    await tryEmail(() => EmailService.sendWelcomeEmail(email, user.name), 'welcome');

    return {
      id: user.id, email, username: user.username,
      name: user.name, status: 'active',
      access_token: token, expires_in: '1h',
    };
  },

  async login(body: LoginRequestBody) {
    const { email, password } = body;

    // Single query: match either email or username
    const user = await User.findOne({
      where: { [Op.or]: [{ email }, { username: email }] },
    });
    if (!user) throw { statusCode: 401, message: 'Invalid email/username or password' };
    if (user.status !== 'active') throw { statusCode: 401, message: 'Account not verified.' };

    const auth = await UserAuth.findByPk(user.id);
    if (!auth) throw { statusCode: 500, message: 'Auth data not found' };

    const valid = await bcrypt.compare(password, auth.password_hash);
    if (!valid) throw { statusCode: 401, message: 'Invalid email/username or password' };

    const role  = await getUserRole(user.id);
    const token = JwtService.generateToken(user.id, user.email, role);
    logger.info('User logged in', { userId: user.id, email });

    return {
      access_token: token,
      expires_in: '1h',
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role },
    };
  },

  async getProfile(userId: number) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'username', 'name', 'status', 'created_at'],
      include: [USER_ROLE_INCLUDE],
    });
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const roles = ((user as any).user_roles ?? [])
      .map((ur: any) => ur.role?.name)
      .filter(Boolean);

    return {
      id: user.id, email: user.email, username: user.username,
      name: user.name, status: user.status, roles,
      createdAt: user.created_at,
    };
  },
};