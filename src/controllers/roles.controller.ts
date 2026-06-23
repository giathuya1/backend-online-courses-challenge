// src/controllers/roles.controller.ts
// Handles HTTP concerns only: parse req → call provider → send res.
// Zero business logic here.
//
// CHANGED vs. original: dropped the local `handleProviderError()` —
// it duplicated handleControllerError.ts almost line-for-line. Now that
// roles.provider.ts throws FieldError/NotFoundError (utils/errors.ts)
// instead of raw `{ statusCode, field, message }` objects, the shared
// handler covers it natively. One less place for error-formatting to drift.

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { handleControllerError } from '../utils/handleControllerError';
import { RolesProvider } from '../providers/roles.provider';
import { validateAssignRole } from '../validators/roles.validator';
import { AssignRoleBody } from '../types/api.types';

// ─── GET /api/roles ────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: List roles (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles retrieved }
 */
export async function listRoles(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await RolesProvider.list();
    return res.status(200).json(ApiResponse.success('Roles retrieved', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── POST /api/roles/assign ───────────────────────────────────────────────
/**
 * @openapi
 * /api/roles/assign:
 *   post:
 *     tags: [Roles]
 *     summary: Assign role to user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, role]
 *             properties:
 *               user_id: { type: integer, example: 1 }
 *               role:    { type: string, enum: [admin, instructor, student], example: "instructor" }
 *     responses:
 *       200: { description: Role assigned }
 *       400: { description: Validation error }
 */
export async function assignRole(
  req: Request<{}, {}, AssignRoleBody>,
  res: Response,
  next: NextFunction,
) {
  const violations = validateAssignRole(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await RolesProvider.assign(req.body.user_id, req.body.role);
    return res.status(200).json(ApiResponse.success('Role assigned', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}
