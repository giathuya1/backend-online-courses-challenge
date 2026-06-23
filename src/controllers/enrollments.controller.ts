// src/controllers/enrollments.controller.ts
//
// CHANGED vs. original: dropped the local `handleError()` helper — same
// reasoning as roles.controller.ts. enrollments.provider.ts now throws
// NotFoundError/BadRequestError/ForbiddenError, so the shared
// handleControllerError covers every case without a local duplicate.

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { handleControllerError } from '../utils/handleControllerError';
import { EnrollmentsProvider } from '../providers/enrollments.provider';
import { FieldValidator } from '../validators/common.validator';
import { EnrollBody, UpdateEnrollmentStatusBody, EnrollmentStatus } from '../types/api.types';

const VALID_STATUSES: EnrollmentStatus[] = ['active', 'dropped', 'suspended'];

// ─── POST /api/enrollments ────────────────────────────────────────────────────
/**
 * @openapi
 * /api/enrollments:
 *   post:
 *     tags: [Enrollments]
 *     summary: Enroll current user into a class (student/admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class_id]
 *             properties:
 *               class_id: { type: integer, example: 1 }
 *     responses:
 *       201: { description: Enrolled successfully }
 *       400: { description: Already enrolled / class full }
 */
export async function enroll(
  req: Request<{}, {}, EnrollBody>,
  res: Response,
  next: NextFunction,
) {
  const violations = [
    ...new FieldValidator(req.body.class_id, 'class_id').required().positiveInt().violations,
  ];
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await EnrollmentsProvider.enroll(req.user!.id, req.body.class_id);
    return res.status(201).json(ApiResponse.success('Enrolled successfully', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── GET /api/enrollments ─────────────────────────────────────────────────────
/**
 * @openapi
 * /api/enrollments:
 *   get:
 *     tags: [Enrollments]
 *     summary: List enrollments (students see only their own)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page,     schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,    schema: { type: integer, default: 10 } }
 *       - { in: query, name: status,   schema: { type: string, enum: [active, dropped, suspended] } }
 *       - { in: query, name: class_id, schema: { type: integer } }
 *       - { in: query, name: user_id,  schema: { type: integer } }
 *     responses:
 *       200: { description: Enrollment list }
 */
export async function listEnrollments(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await EnrollmentsProvider.list(
      req.query as Record<string, string>,
      req.user!.id,
      req.user!.role,
    );
    return res.status(200).json(ApiResponse.success('Enrollments retrieved', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── DELETE /api/enrollments/:id ──────────────────────────────────────────────
/**
 * @openapi
 * /api/enrollments/{id}:
 *   delete:
 *     tags: [Enrollments]
 *     summary: Drop an enrollment (own or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Dropped }
 *       403: { description: Not authorized }
 */
export async function dropEnrollment(req: Request, res: Response, next: NextFunction) {
  try {
    await EnrollmentsProvider.drop(Number(req.params.id), req.user!.id, req.user!.role);
    return res.status(200).json(ApiResponse.success('Dropped class successfully'));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── PUT /api/enrollments/:id/status ─────────────────────────────────────────
/**
 * @openapi
 * /api/enrollments/{id}/status:
 *   put:
 *     tags: [Enrollments]
 *     summary: Update enrollment status (instructor/admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, dropped, suspended] }
 *     responses:
 *       200: { description: Status updated }
 */
export async function updateEnrollmentStatus(
  req: Request<{ id: string }, {}, UpdateEnrollmentStatusBody>,
  res: Response,
  next: NextFunction,
) {
  const violations = [
    ...new FieldValidator(req.body.status, 'status').required().enum(VALID_STATUSES).violations,
  ];
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await EnrollmentsProvider.updateStatus(
      Number(req.params.id),
      req.body.status,
      req.user!.id,
      req.user!.role,
    );
    return res.status(200).json(ApiResponse.success('Enrollment status updated', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}
