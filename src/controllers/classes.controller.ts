// src/controllers/classes.controller.ts

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { ClassesProvider } from '../providers/classes.provider';
import { validateCreateClass, validateUpdateClass } from '../validators/classes.validator';
import { CreateClassBody, BulkEnrollBody } from '../types/api.types';

function handleError(err: any, res: Response, next: NextFunction) {
  if (err.violations) return res.status(err.statusCode ?? 400).json(ApiResponse.validationError(err.violations));
  if (err.statusCode) return res.status(err.statusCode).json(ApiResponse.error(err.message));
  return next(err);
}

// ─── GET /api/classes ─────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/classes:
 *   get:
 *     tags: [Classes]
 *     summary: List classes (optionally filter by courseId)
 *     parameters:
 *       - { in: query, name: courseId, schema: { type: integer } }
 *       - { in: query, name: page,     schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,    schema: { type: integer, default: 10 } }
 *     responses:
 *       200: { description: Classes list }
 */
export async function listClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ClassesProvider.list({
      courseId: req.query.courseId as string | undefined,
      page:     req.query.page    as string | undefined,
      limit:    req.query.limit   as string | undefined,
    });
    return res.status(200).json(ApiResponse.success('Classes retrieved', data));
  } catch (err: any) { return handleError(err, res, next); }
}

// ─── GET /api/classes/:id ─────────────────────────────────────────────────────
/**
 * @openapi
 * /api/classes/{id}:
 *   get:
 *     tags: [Classes]
 *     summary: Get class by ID
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Class data }
 *       404: { description: Not found }
 */
export async function getClass(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ClassesProvider.getById(Number(req.params.id));
    return res.status(200).json(ApiResponse.success('Class retrieved', data));
  } catch (err: any) { return handleError(err, res, next); }
}

// ─── POST /api/classes ────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/classes:
 *   post:
 *     tags: [Classes]
 *     summary: Create a class (instructor/admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [course_id, class_name, start_date, end_date]
 *             properties:
 *               course_id:    { type: integer, example: 1 }
 *               class_name:   { type: string,  example: "K01" }
 *               start_date:   { type: string,  example: "2025-09-01" }
 *               end_date:     { type: string,  example: "2026-01-01" }
 *               max_students: { type: integer, example: 30 }
 *     responses:
 *       201: { description: Class created }
 */
export async function createClass(
  req: Request<{}, {}, CreateClassBody>,
  res: Response,
  next: NextFunction,
) {
  const violations = validateCreateClass(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await ClassesProvider.create(req.body, req.user!.id);
    return res.status(201).json(ApiResponse.success('Class created', data));
  } catch (err: any) { return handleError(err, res, next); }
}

// ─── POST /api/classes/:id/bulk-enroll ───────────────────────────────────────
/**
 * @openapi
 * /api/classes/{id}/bulk-enroll:
 *   post:
 *     tags: [Classes]
 *     summary: Bulk-enroll students by email list (instructor/admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emails]
 *             properties:
 *               emails: { type: array, items: { type: string }, example: ["a@test.com"] }
 *     responses:
 *       201: { description: Students enrolled }
 *       400: { description: Validation / duplicate error }
 */
export async function bulkEnroll(
  req: Request<{ id: string }, {}, BulkEnrollBody>,
  res: Response,
  next: NextFunction,
) {
  const classId = Number(req.params.id);
  if (!Number.isInteger(classId) || classId <= 0)
    return res.status(400).json(ApiResponse.error('Invalid class id'));

  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0)
    return res.status(400).json(
      ApiResponse.validationError([{ field: 'emails', rule: 'required', message: 'emails must be a non-empty array' }])
    );

  try {
    const data = await ClassesProvider.bulkEnroll(classId, emails, req.user!.id, req.user!.role);
    return res.status(201).json(ApiResponse.success('Bulk enrolled', data));
  } catch (err: any) { return handleError(err, res, next); }
}

// ─── PUT /api/classes/:id ─────────────────────────────────────────────────────
/**
 * @openapi
 * /api/classes/{id}:
 *   put:
 *     tags: [Classes]
 *     summary: Update a class (owner or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Class updated }
 */
export async function updateClass(req: Request, res: Response, next: NextFunction) {
  const violations = validateUpdateClass(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await ClassesProvider.update(Number(req.params.id), req.body, req.user!.id, req.user!.role);
    return res.status(200).json(ApiResponse.success('Class updated', data));
  } catch (err: any) { return handleError(err, res, next); }
}

// ─── DELETE /api/classes/:id ──────────────────────────────────────────────────
/**
 * @openapi
 * /api/classes/{id}:
 *   delete:
 *     tags: [Classes]
 *     summary: Delete a class (owner or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Class deleted }
 */
export async function deleteClass(req: Request, res: Response, next: NextFunction) {
  try {
    await ClassesProvider.remove(Number(req.params.id), req.user!.id, req.user!.role);
    return res.status(200).json(ApiResponse.success('Class deleted'));
  } catch (err: any) { return handleError(err, res, next); }
}