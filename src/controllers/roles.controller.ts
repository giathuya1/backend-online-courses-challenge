// src/controllers/roles.controller.ts
// Handles HTTP concerns only: parse req → call provider → send res.
// Zero business logic here.

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { RolesProvider } from '../providers/roles.provider';
import { validateAssignRole } from '../validators/roles.validator';
import { AssignRoleBody } from '../types/api.types';

function handleProviderError(err: any, res: Response, next: NextFunction) {
  if (err.field)
    return res.status(err.statusCode ?? 400).json(
      ApiResponse.validationError([{ field: err.field, rule: err.rule ?? 'invalid', message: err.message }])
    );
  if (err.statusCode)
    return res.status(err.statusCode).json(ApiResponse.error(err.message));
  return next(err);
}

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
  } catch (err: any) { return handleProviderError(err, res, next); }
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
  } catch (err: any) { return handleProviderError(err, res, next); }
}