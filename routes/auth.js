'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { authMiddleware } = require('../middleware/auth');
const JwtService = require('../utils/jwt');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const EmailService = require('../utils/email');
const OtpService = require('../utils/otp');

const db = require('../models');
const { users, user_auth, user_roles, roles } = db;
const { Op } = require('sequelize');

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Register/Login/OTP/Profile
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user (auto-send OTP)
 *     description: Creates user in inactive status and sends OTP via email (if email service works).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, name, password, confirmPassword]
 *             properties:
 *               email: { type: string, format: email, example: "student_demo_01@example.com" }
 *               username: { type: string, example: "student_demo_01" }
 *               name: { type: string, example: "Student Demo 01" }
 *               password: { type: string, example: "test01" }
 *               confirmPassword: { type: string, example: "test01" }
 *     responses:
 *       201:
 *         description: Registered (returns temp_token for OTP flows)
 *       400:
 *         description: Validation failed
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, username, name, password, confirmPassword } = req.body;

    // Validation
    const violations = [];
    if (!email) violations.push({ field: 'email', rule: 'required', message: 'Email is required' });
    if (!username) violations.push({ field: 'username', rule: 'required', message: 'Username is required' });
    if (!name) violations.push({ field: 'name', rule: 'required', message: 'Name is required' });
    if (!password) violations.push({ field: 'password', rule: 'required', message: 'Password is required' });
    if (password && password.length < 6) violations.push({ field: 'password', rule: 'min', message: 'Password must be at least 6 characters' });
    if (password !== confirmPassword) violations.push({ field: 'confirmPassword', rule: 'match', message: 'Passwords do not match' });

    if (violations.length > 0) {
      return res.status(400).json(ApiResponse.validationError(violations));
    }

    // Check email exists
    const existingEmail = await users.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json(
        ApiResponse.validationError([{ field: 'email', rule: 'unique', message: 'Email already registered' }])
      );
    }

    // Check username exists
    const existingUsername = await users.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json(
        ApiResponse.validationError([{ field: 'username', rule: 'unique', message: 'Username already taken' }])
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (inactive - need OTP verification)
    const newUser = await users.create({
      email,
      username,
      name,
      status: 'inactive'
    });

    // Create user_auth record
    const auth = await user_auth.create({
      user_id: newUser.id,
      password_hash: passwordHash
    });

    // Assign 'student' role
    const studentRole = await roles.findOne({ where: { name: 'student' } });
    if (studentRole) {
      await user_roles.create({
        user_id: newUser.id,
        role_id: studentRole.id
      });
    }

    // Generate temporary JWT token (OTP verification only, 10 minutes)
    const tempToken = JwtService.generateToken(newUser.id, newUser.email, 'unverified');

    // Auto send OTP
    try {
      const plainOtp = OtpService.generateOtp();
      const hashedOtp = await OtpService.hashOtp(plainOtp);
      const expiryTime = OtpService.getOtpExpiryTime();

      await auth.update({
        otp_hash: hashedOtp,
        otp_expiry: expiryTime
      });

      await EmailService.sendOtpEmail(email, plainOtp, name);

      logger.info('User registered + OTP sent', { userId: newUser.id, email, username });
      // eslint-disable-next-line no-console
      console.log(`✅ User registered: ${email} | OTP sent to email`);

      return res.status(201).json(
        ApiResponse.success(
          '✅ Registration successful! OTP has been sent to your email. Please check your inbox (and spam folder) to verify your account.',
          {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            name: newUser.name,
            status: newUser.status,
            temp_token: tempToken,
            temp_token_expires_in: '10 minutes',
            otp_sent: true,
            message: 'Check your email for OTP code (expires in 5 minutes)'
          }
        )
      );
    } catch (emailError) {
      logger.error('OTP send failed but user created', { userId: newUser.id, error: emailError.message });
      // eslint-disable-next-line no-console
      console.error('❌ Email error:', emailError.message);

      return res.status(201).json(
        ApiResponse.success('Registration successful but OTP send failed. Please click "Resend OTP" button.', {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          name: newUser.name,
          status: newUser.status,
          temp_token: tempToken,
          temp_token_expires_in: '10 minutes',
          otp_sent: false,
          message: 'Click "Resend OTP" button to receive OTP'
        })
      );
    }
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send/Resend OTP (requires temp token)
 *     description: Requires Authorization Bearer token from register (role=unverified).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP resent
 *       400:
 *         description: Already verified / invalid state
 *       401:
 *         description: Unauthorized
 */
router.post('/send-otp', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    const user = await users.findByPk(userId);
    if (!user) {
      return res.status(404).json(ApiResponse.error('User not found'));
    }

    if (user.status === 'active') {
      return res.status(400).json(ApiResponse.error('User already verified'));
    }

    let auth = await user_auth.findByPk(userId);
    if (!auth) {
      auth = await user_auth.create({ user_id: userId, password_hash: '' });
    }

    const plainOtp = OtpService.generateOtp();
    const hashedOtp = await OtpService.hashOtp(plainOtp);
    const expiryTime = OtpService.getOtpExpiryTime();

    await auth.update({
      otp_hash: hashedOtp,
      otp_expiry: expiryTime
    });

    try {
      await EmailService.sendOtpEmail(email, plainOtp, user.name);
      // eslint-disable-next-line no-console
      console.log(`✅ OTP resent to: ${email}`);
    } catch (emailError) {
      logger.error('Email service failed on resend', { error: emailError.message });
      // eslint-disable-next-line no-console
      console.error('❌ Email error on resend:', emailError.message);
    }

    logger.info('OTP resent', { userId, email });

    return res.status(200).json(
      ApiResponse.success('OTP resent to your email', {
        email,
        expiresIn: '5 minutes',
        next_step: 'Enter OTP code to verify your email'
      })
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and activate account
 *     description: Requires Authorization Bearer token from register (temp_token).
 *     security:
 *       - bearerAuth: []
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
 *       200:
 *         description: Verified (returns access_token)
 *       400:
 *         description: Invalid/expired OTP
 *       401:
 *         description: Unauthorized
 */
router.post('/verify-otp', authMiddleware, async (req, res, next) => {
  try {
    const { otp } = req.body;
    const userId = req.user.id;
    const email = req.user.email;

    if (!otp) {
      return res.status(400).json(
        ApiResponse.validationError([{ field: 'otp', rule: 'required', message: 'OTP is required' }])
      );
    }

    const user = await users.findByPk(userId);
    if (!user) {
      return res.status(404).json(ApiResponse.error('User not found'));
    }

    if (user.status === 'active') {
      return res.status(400).json(ApiResponse.error('User already verified'));
    }

    const auth = await user_auth.findByPk(userId);
    if (!auth || !auth.otp_hash) {
      return res.status(400).json(ApiResponse.error('No OTP found. Please request a new one.'));
    }

    if (OtpService.isOtpExpired(auth.otp_expiry)) {
      return res.status(400).json(
        ApiResponse.validationError([{ field: 'otp', rule: 'expired', message: 'OTP has expired. Please request a new one.' }])
      );
    }

    const isOtpValid = await OtpService.verifyOtp(otp, auth.otp_hash);
    if (!isOtpValid) {
      logger.warn('Invalid OTP attempt', { userId, email });
      return res.status(400).json(
        ApiResponse.validationError([{ field: 'otp', rule: 'invalid', message: 'Invalid OTP. Please check and try again.' }])
      );
    }

    await Promise.all([
      auth.update({ otp_hash: null, otp_expiry: null }),
      user.update({ status: 'active' })
    ]);

    const userRole = await user_roles.findOne({
      where: { user_id: userId },
      include: [{ model: roles, attributes: ['name'] }]
    });
    const role = userRole ? userRole.role.name : 'student';
    const finalToken = JwtService.generateToken(userId, email, role);

    try {
      await EmailService.sendWelcomeEmail(email, user.name);
    } catch (emailError) {
      logger.warn('Failed to send welcome email', { error: emailError.message });
    }

    logger.info('User verified successfully', { userId, email });
    // eslint-disable-next-line no-console
    console.log(`✅ User verified: ${email}`);

    return res.status(200).json(
      ApiResponse.success('✅ Email verified successfully. Your account is now active.', {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        status: 'active',
        access_token: finalToken,
        expires_in: '1h',
        message: 'You can now login to your account'
      })
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login (JWT expires in 1h)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email OR username
 *                 example: "giathuylk0603@gmail.com"
 *               password:
 *                 type: string
 *                 example: "test01"
 *     responses:
 *       200:
 *         description: Login successful (returns access_token)
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials / not verified
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const violations = [];
    if (!email) violations.push({ field: 'email', rule: 'required', message: 'Email or username is required' });
    if (!password) violations.push({ field: 'password', rule: 'required', message: 'Password is required' });

    if (violations.length > 0) {
      return res.status(400).json(ApiResponse.validationError(violations));
    }

    const user = await users.findOne({
      where: {
        [Op.or]: [{ email: email }, { username: email }]
      }
    });

    if (!user) {
      logger.warn('Login failed: user not found', { email });
      return res.status(401).json(ApiResponse.error('Invalid email/username or password'));
    }

    if (user.status !== 'active') {
      logger.warn('Login failed: user not verified', { userId: user.id, email });
      return res.status(401).json(ApiResponse.error('Your account has not been verified. Please complete OTP verification.'));
    }

    const auth = await user_auth.findByPk(user.id);
    if (!auth) {
      return res.status(500).json(ApiResponse.error('User authentication data not found'));
    }

    const isPasswordValid = await bcrypt.compare(password, auth.password_hash);
    if (!isPasswordValid) {
      logger.warn('Login failed: invalid password', { userId: user.id, email });
      return res.status(401).json(ApiResponse.error('Invalid email/username or password'));
    }

    const userRole = await user_roles.findOne({
      where: { user_id: user.id },
      include: [{ model: roles, attributes: ['name'] }]
    });

    const role = userRole ? userRole.role.name : 'student';
    const token = JwtService.generateToken(user.id, user.email, role);

    logger.info('User logged in', { userId: user.id, email, username: user.username });
    // eslint-disable-next-line no-console
    console.log(`✅ User logged in: ${user.username} (${email})`);

    return res.status(200).json(
      ApiResponse.success('Login successful', {
        access_token: token,
        expires_in: '1h',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role
        }
      })
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = await users.findByPk(req.user.id, {
      include: [
        {
          model: user_roles,
          include: [{ model: roles, attributes: ['name'] }]
        }
      ]
    });

    if (!user) {
      return res.status(404).json(ApiResponse.error('User not found'));
    }

    const roles_list = (user.user_roles || []).map(ur => ur.role?.name).filter(Boolean);

    return res.status(200).json(
      ApiResponse.success('Profile retrieved', {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        status: user.status,
        roles: roles_list,
        createdAt: user.createdAt
      })
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (client-side token removal)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    logger.info('User logged out', { userId });
    // eslint-disable-next-line no-console
    console.log(`✅ User logged out: ${userId}`);

    return res.status(200).json(
      ApiResponse.success('Logout successful', {
        message: 'You have been logged out'
      })
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;