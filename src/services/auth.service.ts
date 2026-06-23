// src/services/auth.service.ts
// Business logic for the auth lifecycle: register -> verify OTP -> login ->
// refresh -> revoke. Orchestrates AuthRepository (persistence), JwtService
// (tokens), OtpService and EmailService (notifications). Throws AppError
// subclasses exclusively, so every controller can stay generic:
//   catch (err) { return handleControllerError(err, res, next); }

import bcrypt from 'bcrypt';
import { AuthRepository } from '../repositories/auth.repository';
import JwtService from '../utils/jwt';
import EmailService from '../utils/email';
import OtpService from '../utils/otp';
import logger from '../utils/logger';
import { normalizeEmail } from '../validators/common.validator';
import { FieldError, NotFoundError, UnauthorizedError, BadRequestError } from '../utils/errors';
import { RegisterRequestBody, LoginRequestBody, VerifyOtpBody, AuthTokens } from '../types/api.types';

/**
 * Issues a fresh access+refresh pair and persists only the HASH of the
 * refresh token (bcrypt) — never the raw token — in user_auth.refresh_token_hash.
 * If the database ever leaks, stored hashes are useless to an attacker
 * (same reasoning as password hashing).
 */
async function issueTokenPair(userId: number, email: string, role: string): Promise<AuthTokens> {
  const access_token = JwtService.generateToken(userId, email, role);
  const refresh_token = JwtService.generateRefreshToken(userId);

  const refreshHash = await bcrypt.hash(refresh_token, 10);
  const auth = await AuthRepository.findAuthByUserId(userId);
  if (auth) await auth.update({ refresh_token_hash: refreshHash });

  return { access_token, refresh_token, expires_in: process.env.JWT_EXPIRY || '1h' };
}

export const AuthService = {
  async register(body: RegisterRequestBody) {
    const email = normalizeEmail(body.email);
    const { username, name, password } = body;

    const [existingEmail, existingUsername] = await Promise.all([
      AuthRepository.findUserByEmail(email),
      AuthRepository.findUserByUsername(username),
    ]);
    if (existingEmail) throw new FieldError('email', 'Email already registered', 'unique');
    if (existingUsername) throw new FieldError('username', 'Username already taken', 'unique');

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await AuthRepository.createUser({ email, username, name, status: 'inactive' });

    const [auth, studentRole] = await Promise.all([
      AuthRepository.createUserAuth({ user_id: newUser.id, password_hash: passwordHash }),
      AuthRepository.findRoleByName('student'),
    ]);
    if (studentRole) await AuthRepository.assignDefaultRole(newUser.id, studentRole.id);

    const tempToken = JwtService.generateToken(newUser.id, email, 'unverified');

    let otpSent = false;
    try {
      const plainOtp = OtpService.generateOtp();
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
      AuthRepository.findUserById(userId),
      AuthRepository.findAuthByUserId(userId),
    ]);
    if (!user) throw new NotFoundError('User not found');
    if (user.status === 'active') throw new BadRequestError('User already verified');

    const resolvedAuth = auth ?? await AuthRepository.createUserAuth({ user_id: userId, password_hash: '' });

    const plainOtp = OtpService.generateOtp();
    const hashedOtp = await OtpService.hashOtp(plainOtp);
    await resolvedAuth.update({ otp_hash: hashedOtp, otp_expiry: BigInt(OtpService.getOtpExpiryTime()) });

    await EmailService.trySend(() => EmailService.sendOtpEmail(email, plainOtp, user.name), 'sendOtp');
    return { email, expiresIn: '5 minutes' };
  },

  async verifyOtp(userId: number, email: string, body: VerifyOtpBody) {
    const [user, auth] = await Promise.all([
      AuthRepository.findUserById(userId),
      AuthRepository.findAuthByUserId(userId),
    ]);
    if (!user) throw new NotFoundError('User not found');
    if (user.status === 'active') throw new BadRequestError('User already verified');
    if (!auth?.otp_hash) throw new BadRequestError('No OTP found.');
    if (OtpService.isOtpExpired(auth.otp_expiry)) throw new FieldError('otp', 'OTP has expired.', 'expired');

    const valid = await OtpService.verifyOtp(body.otp, auth.otp_hash);
    if (!valid) throw new FieldError('otp', 'Invalid OTP.', 'invalid');

    await Promise.all([
      auth.update({ otp_hash: null, otp_expiry: null }),
      user.update({ status: 'active' }),
    ]);

    const role = await AuthRepository.getPrimaryRoleName(userId);
    const tokens = await issueTokenPair(userId, email, role);

    await EmailService.trySend(() => EmailService.sendWelcomeEmail(email, user.name), 'welcome');

    return { id: user.id, email, username: user.username, name: user.name, status: 'active', ...tokens };
  },

  async login(body: LoginRequestBody) {
    const { password } = body;
    const identifier = body.email.trim();

    const user = await AuthRepository.findUserByEmailOrUsername(identifier);
    if (!user) throw new UnauthorizedError('Invalid email/username or password');
    if (user.status !== 'active') throw new UnauthorizedError('Account not verified.');

    const auth = await AuthRepository.findAuthByUserId(user.id);
    if (!auth) throw new BadRequestError('Auth data not found');

    const valid = await bcrypt.compare(password, auth.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid email/username or password');

    const role = await AuthRepository.getPrimaryRoleName(user.id);
    const tokens = await issueTokenPair(user.id, user.email, role);
    logger.info('User logged in', { userId: user.id, email: user.email });

    return {
      ...tokens,
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role },
    };
  },

  /**
   * Rotation flow: every successful refresh issues a BRAND NEW refresh
   * token and overwrites the stored hash, invalidating the old one
   * immediately. If a refresh token is ever stolen and replayed, the
   * legitimate user's NEXT refresh attempt will fail with "revoked" —
   * a clear signal something is wrong, and a natural place to hook up
   * alerting/force-logout later.
   */
  async refreshToken(refreshToken: string) {
    let decoded;
    try {
      decoded = JwtService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const auth = await AuthRepository.findAuthByUserId(decoded.sub);
    if (!auth?.refresh_token_hash) throw new UnauthorizedError('Refresh token has been revoked');

    const matches = await bcrypt.compare(refreshToken, auth.refresh_token_hash);
    if (!matches) throw new UnauthorizedError('Refresh token has been revoked');

    const user = await AuthRepository.findUserById(decoded.sub);
    if (!user || user.status !== 'active') throw new UnauthorizedError('Account is not active');

    const role = await AuthRepository.getPrimaryRoleName(user.id);
    return issueTokenPair(user.id, user.email, role);
  },

  /** Revoke = null out the stored hash. Any future refresh attempt fails. */
  async revokeToken(userId: number) {
    const auth = await AuthRepository.findAuthByUserId(userId);
    if (!auth) throw new NotFoundError('Auth data not found');
    await auth.update({ refresh_token_hash: null });
    logger.info('Refresh token revoked', { userId });
  },

  async getProfile(userId: number) {
    const user = await AuthRepository.findUserProfileById(userId);
    if (!user) throw new NotFoundError('User not found');

    const roles = ((user as any).user_roles ?? []).map((ur: any) => ur.role?.name).filter(Boolean);

    return {
      id: user.id, email: user.email, username: user.username,
      name: user.name, status: user.status, roles, createdAt: user.created_at,
    };
  },
};
