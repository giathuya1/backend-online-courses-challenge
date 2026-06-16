// src/routes/roles.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import db from '../database/connection';
import { AssignRoleBody, RoleName, ValidationViolation } from '../types/api.types';

const router = Router();
const { Role, User, UserRole } = db;
const ALLOWED_ROLE_NAMES = new Set<RoleName>(['admin', 'instructor', 'student']);

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
 */
router.get('/', authMiddleware, authorize(['admin']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await Role.findAll({ attributes: ['id', 'name'], order: [['id', 'ASC']] });
    return res.status(200).json({ success: true, message: 'Roles retrieved', data: roles });
  } catch (err) { return next(err); }
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
 *               user_id: { type: integer, example: 1 }
 *               role: { type: string, enum: [admin, instructor, student], example: "instructor" }
 *     responses:
 *       200:
 *         description: Role assigned
 */
router.post('/assign', authMiddleware, authorize(['admin']),
  async (req: Request<{}, {}, AssignRoleBody>, res: Response, next: NextFunction) => {
    try {
      const body = req.body || {};
      const user_id = Number.isInteger(body.user_id) ? body.user_id : (body as any).userId;
      const role = body.role;

      const violations: ValidationViolation[] = [];  // ← FIX: explicit type
      if (!Number.isInteger(user_id)) violations.push({ field: 'user_id', rule: 'integer', message: 'user_id must be an integer' });
      if (!role || typeof role !== 'string') violations.push({ field: 'role', rule: 'required', message: 'role is required' });
      else if (!ALLOWED_ROLE_NAMES.has(role as RoleName)) violations.push({ field: 'role', rule: 'in', message: 'role must be: admin, instructor, student' });
      if (violations.length) return res.status(400).json({ success: false, message: 'Validation failed', violations });

      const user = await User.findByPk(user_id, { attributes: ['id', 'email', 'name'] });
      if (!user) return res.status(400).json({ success: false, message: 'Validation failed', violations: [{ field: 'user_id', rule: 'exists', message: 'User not found' }] });

      const roleRow = await Role.findOne({ where: { name: role }, attributes: ['id', 'name'] });
      if (!roleRow) return res.status(400).json({ success: false, message: 'Validation failed', violations: [{ field: 'role', rule: 'exists', message: 'Role not found in database' }] });

      await UserRole.findOrCreate({
        where: { user_id: user.id, role_id: roleRow.id },
        defaults: { user_id: user.id, role_id: roleRow.id },
      });

      return res.status(200).json({ success: true, message: 'Role assigned', data: { user: { id: user.id, email: user.email, name: user.name }, role: roleRow.name } });
    } catch (err) { return next(err); }
  }
);

export default router;