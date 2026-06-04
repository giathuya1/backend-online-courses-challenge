const express = require('express');
const router = express.Router();

const db = require('../models');
const { authMiddleware, authorize } = require('../middleware/auth');

const Roles = db.roles;
const Users = db.users;
const UserRoles = db.user_roles;

const ALLOWED_ROLE_NAMES = new Set(['admin', 'instructor', 'student']);

/**
 * @openapi
 * tags:
 *   - name: Roles
 *     description: Admin role management
 */

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: List roles (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', authMiddleware, authorize(['admin']), async (req, res, next) => {
  try {
    const roles = await Roles.findAll({
      attributes: ['id', 'name'],
      order: [['id', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Roles retrieved',
      data: roles,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @openapi
 * /api/roles/assign:
 *   post:
 *     tags: [Roles]
 *     summary: Assign role to user (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, role]
 *             properties:
 *               user_id: { type: integer, example: 25 }
 *               role: { type: string, enum: [admin, instructor, student], example: "admin" }
 *     responses:
 *       200:
 *         description: Role assigned
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/assign', authMiddleware, authorize(['admin']), async (req, res, next) => {
  try {
    const body = req.body || {};
    const user_id = Number.isInteger(body.user_id) ? body.user_id : body.userId;
    const role = body.role;

    const violations = [];

    if (!Number.isInteger(user_id)) {
      violations.push({ field: 'user_id', rule: 'integer', message: 'user_id must be an integer' });
    }

    if (!role || typeof role !== 'string') {
      violations.push({ field: 'role', rule: 'required', message: 'role is required' });
    } else if (!ALLOWED_ROLE_NAMES.has(role)) {
      violations.push({ field: 'role', rule: 'in', message: 'role must be one of: admin, instructor, student' });
    }

    if (violations.length) {
      return res.status(400).json({ success: false, message: 'Validation failed', violations });
    }

    const user = await Users.findByPk(user_id, { attributes: ['id', 'email', 'name'] });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        violations: [{ field: 'user_id', rule: 'exists', message: 'User not found' }],
      });
    }

    const roleRow = await Roles.findOne({ where: { name: role }, attributes: ['id', 'name'] });
    if (!roleRow) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        violations: [{ field: 'role', rule: 'exists', message: 'Role not found in database' }],
      });
    }

    await UserRoles.findOrCreate({
      where: { user_id: user.id, role_id: roleRow.id },
      defaults: { user_id: user.id, role_id: roleRow.id },
    });

    return res.status(200).json({
      success: true,
      message: 'Role assigned',
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        role: roleRow.name,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;