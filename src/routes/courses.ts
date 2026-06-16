// src/routes/courses.ts
import { Router, Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { authMiddleware, authorize } from '../middleware/auth';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import db from '../database/connection';
import { CreateCourseBody, UpdateCourseBody, CourseQueryParams, ValidationViolation } from '../types/api.types';

const router = Router();
const { Course, User } = db;

router.param('id', (req: Request, res: Response, next: NextFunction, value: string) => {
  const id = Number.parseInt(value, 10);
  if (Number.isNaN(id)) return res.status(400).json(ApiResponse.validationError([{ field: 'id', rule: 'number', message: 'ID must be a number' }]));
  req.params.id = String(id);
  next();
});

/**
 * @openapi
 * /api/courses:
 *   get:
 *     tags: [Courses]
 *     summary: List courses (search/status/pagination)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Courses retrieved
 */
router.get('/', async (req: Request<{}, {}, {}, CourseQueryParams>, res: Response, next: NextFunction) => {
  try {
    const { search, status } = req.query;
    const violations: ValidationViolation[] = [];  // ← FIX: explicit type
    const page = parseInt(req.query.page ?? '1', 10);
    const limit = parseInt(req.query.limit ?? '10', 10);

    if (Number.isNaN(page) || page < 1) violations.push({ field: 'page', rule: 'min', message: 'Page must be >= 1' });
    if (Number.isNaN(limit) || limit < 1 || limit > 100) violations.push({ field: 'limit', rule: 'range', message: 'Limit must be 1-100' });
    if (status && !['draft', 'published'].includes(status)) violations.push({ field: 'status', rule: 'enum', message: 'Status must be draft or published' });
    if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search?.trim()) where.title = { [Op.iLike]: `%${search.trim()}%` };

    const { count, rows } = await Course.findAndCountAll({
      where, offset: (page - 1) * limit, limit,
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'instructor', attributes: ['id', 'name', 'email'] }],
    });

    logger.info('Courses listed', { count, page, limit });
    return res.status(200).json(ApiResponse.success('Courses retrieved', {
      courses: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    }));
  } catch (error) { next(error); }
});

/**
 * @openapi
 * /api/courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Get course by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Course retrieved
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findByPk(Number(req.params.id), {  // ← FIX: Number()
      include: [{ model: User, as: 'instructor', attributes: ['id', 'name', 'email'] }],
    });
    if (!course) return res.status(404).json(ApiResponse.error('Course not found'));
    return res.status(200).json(ApiResponse.success('Course retrieved', course));
  } catch (error) { next(error); }
});

/**
 * @openapi
 * /api/courses:
 *   post:
 *     tags: [Courses]
 *     summary: Create a course (instructor/admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title: { type: string, example: "NodeJS Basics" }
 *               description: { type: string, example: "Learn NodeJS from zero." }
 *               status: { type: string, enum: [draft, published], example: "draft" }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authMiddleware, authorize(['instructor', 'admin']),
  async (req: Request<{}, {}, CreateCourseBody>, res: Response, next: NextFunction) => {
    try {
      const { title, description, status } = req.body;
      const violations: ValidationViolation[] = [];  // ← FIX
      if (!title) violations.push({ field: 'title', rule: 'required', message: 'Title is required' });
      if (!description) violations.push({ field: 'description', rule: 'required', message: 'Description is required' });
      if (status && !['draft', 'published'].includes(status)) violations.push({ field: 'status', rule: 'enum', message: 'Status must be draft or published' });
      if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));

      const course = await Course.create({ title, description, status: status ?? 'draft', instructor_id: req.user!.id });
      logger.info('Course created', { courseId: course.id });
      return res.status(201).json(ApiResponse.success('Course created', course));
    } catch (error) { next(error); }
  }
);

/**
 * @openapi
 * /api/courses/{id}:
 *   put:
 *     tags: [Courses]
 *     summary: Update a course (owner instructor/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [draft, published] }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', authMiddleware, authorize(['instructor', 'admin']),
  async (req: Request<{ id: string }, {}, UpdateCourseBody>, res: Response, next: NextFunction) => {
    try {
      const course = await Course.findByPk(Number(req.params.id));  // ← FIX: Number()
      if (!course) return res.status(404).json(ApiResponse.error('Course not found'));
      if (course.instructor_id !== req.user!.id && req.user!.role !== 'admin')
        return res.status(403).json(ApiResponse.error('Not authorized'));

      const { title, description, status } = req.body;
      if (status && !['draft', 'published'].includes(status))
        return res.status(400).json(ApiResponse.validationError([{ field: 'status', rule: 'enum', message: 'Status must be draft or published' }]));

      await course.update({ title: title ?? course.title, description: description ?? course.description, status: status ?? course.status });
      logger.info('Course updated', { courseId: course.id });
      return res.status(200).json(ApiResponse.success('Course updated', course));
    } catch (error) { next(error); }
  }
);

/**
 * @openapi
 * /api/courses/{id}:
 *   delete:
 *     tags: [Courses]
 *     summary: Delete a course (owner instructor/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', authMiddleware, authorize(['instructor', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await Course.findByPk(Number(req.params.id));  // ← FIX: Number()
      if (!course) return res.status(404).json(ApiResponse.error('Course not found'));
      if (course.instructor_id !== req.user!.id && req.user!.role !== 'admin')
        return res.status(403).json(ApiResponse.error('Not authorized'));

      await course.destroy();
      logger.info('Course deleted', { courseId: course.id });
      return res.status(200).json(ApiResponse.success('Course deleted'));
    } catch (error) { next(error); }
  }
);

export default router;