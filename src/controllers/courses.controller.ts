// src/controllers/courses.controller.ts

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { handleControllerError } from '../utils/handleControllerError';
import { CoursesProvider } from '../providers/courses.provider';
import { validateCreateCourse, validateUpdateCourse } from '../validators/courses.validator';
import { validPagination } from '../validators/common.validator';
import { CourseQueryParams, CreateCourseBody, UpdateCourseBody } from '../types/api.types';

// ─── GET /api/courses ─────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/courses:
 *   get:
 *     tags: [Courses]
 *     summary: List courses with optional filters
 *     parameters:
 *       - { in: query, name: page,   schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,  schema: { type: integer, default: 10 } }
 *       - { in: query, name: status, schema: { type: string, enum: [draft, published] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Courses list with pagination }
 */
export async function listCourses(
  req: Request<{}, {}, {}, CourseQueryParams>,
  res: Response,
  next: NextFunction,
) {
  const page  = parseInt(req.query.page  ?? '1',  10);
  const limit = parseInt(req.query.limit ?? '10', 10);

  const violations = validPagination(page, limit);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));

  try {
    const data = await CoursesProvider.list(req.query);
    return res.status(200).json(ApiResponse.success('Courses retrieved', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── GET /api/courses/:id ─────────────────────────────────────────────────────
/**
 * @openapi
 * /api/courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Get course by ID
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Course data }
 *       404: { description: Not found }
 */
export async function getCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await CoursesProvider.getById(Number(req.params.id));
    return res.status(200).json(ApiResponse.success('Course retrieved', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── POST /api/courses ────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/courses:
 *   post:
 *     tags: [Courses]
 *     summary: Create a course (instructor/admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:       { type: string,  example: "Node.js Fundamentals" }
 *               description: { type: string }
 *               status:      { type: string, enum: [draft, published] }
 *     responses:
 *       201: { description: Course created }
 */
export async function createCourse(
  req: Request<{}, {}, CreateCourseBody>,
  res: Response,
  next: NextFunction,
) {
  const violations = validateCreateCourse(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await CoursesProvider.create(req.body, req.user!.id);
    return res.status(201).json(ApiResponse.success('Course created', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── PUT /api/courses/:id ─────────────────────────────────────────────────────
/**
 * @openapi
 * /api/courses/{id}:
 *   put:
 *     tags: [Courses]
 *     summary: Update a course (owner or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Course updated }
 *       403: { description: Not authorized }
 */
export async function updateCourse(
  req: Request<{ id: string }, {}, UpdateCourseBody>,
  res: Response,
  next: NextFunction,
) {
  const violations = validateUpdateCourse(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await CoursesProvider.update(Number(req.params.id), req.body, req.user!.id, req.user!.role);
    return res.status(200).json(ApiResponse.success('Course updated', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── DELETE /api/courses/:id ──────────────────────────────────────────────────
/**
 * @openapi
 * /api/courses/{id}:
 *   delete:
 *     tags: [Courses]
 *     summary: Delete a course (owner or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Course deleted }
 */
export async function deleteCourse(req: Request, res: Response, next: NextFunction) {
  try {
    await CoursesProvider.remove(Number(req.params.id), req.user!.id, req.user!.role);
    return res.status(200).json(ApiResponse.success('Course deleted'));
  } catch (err: any) { return handleControllerError(err, res, next); }
}