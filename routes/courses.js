/**
 * Courses Routes - CRUD operations
 * Challenge 2: Create, Read, Update, Delete courses
 * Challenge 7: List courses with search/status/page/limit + validation + pagination
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const db = require('../models');
const { courses } = db;

/**
 * @openapi
 * tags:
 *   - name: Courses
 *     description: Courses CRUD + listing
 */

// Validate numeric :id for all routes using it
router.param('id', (req, res, next, value) => {
  const id = Number.parseInt(value, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json(ApiResponse.validationError([
      { field: 'id', rule: 'number', message: 'ID must be a number' }
    ]));
  }
  req.params.id = String(id);
  next();
});

// ============================================================================
// GET /api/courses - List all courses (search, filter, pagination) [Challenge 7]
// ============================================================================
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
 *         description: Search in title (case-insensitive)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Courses retrieved
 *       400:
 *         description: Validation error
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const violations = [];

    const pageRaw = req.query.page ?? '1';
    const limitRaw = req.query.limit ?? '10';

    const page = parseInt(pageRaw, 10);
    const limit = parseInt(limitRaw, 10);

    if (Number.isNaN(page) || page < 1) {
      violations.push({ field: 'page', rule: 'min', message: 'Page must be an integer >= 1' });
    }
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      violations.push({ field: 'limit', rule: 'range', message: 'Limit must be an integer between 1 and 100' });
    }
    if (status && !['draft', 'published'].includes(status)) {
      violations.push({ field: 'status', rule: 'enum', message: 'Status must be one of: draft, published' });
    }

    if (violations.length) {
      return res.status(400).json(ApiResponse.validationError(violations));
    }

    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    if (search && String(search).trim()) {
      const { Op } = require('sequelize');
      where.title = { [Op.iLike]: `%${String(search).trim()}%` };
    }

    const { count, rows } = await courses.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']],
      include: [{
        model: db.users,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }]
    });

    logger.info('Courses listed', { count, page, limit, status: status || null, hasSearch: !!search });

    return res.status(200).json(ApiResponse.success('Courses retrieved', {
      courses: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/courses/:id - Get course by ID
// ============================================================================
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
 *         description: Course not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const course = await courses.findByPk(req.params.id, {
      include: [{
        model: db.users,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!course) {
      return res.status(404).json(ApiResponse.error('Course not found'));
    }

    return res.status(200).json(ApiResponse.success('Course retrieved', course));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/courses - Create course (instructor + admin only)
// ============================================================================
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, authorize(['instructor', 'admin']), async (req, res, next) => {
  try {
    const { title, description, status } = req.body;

    const violations = [];
    if (!title) violations.push({ field: 'title', rule: 'required', message: 'Title is required' });
    if (!description) violations.push({ field: 'description', rule: 'required', message: 'Description is required' });
    if (status && !['draft', 'published'].includes(status)) {
      violations.push({ field: 'status', rule: 'enum', message: 'Status must be draft or published' });
    }

    if (violations.length > 0) {
      return res.status(400).json(ApiResponse.validationError(violations));
    }

    const course = await courses.create({
      title,
      description,
      status: status || 'draft',
      instructor_id: req.user.id
    });

    logger.info('Course created', { courseId: course.id, userId: req.user.id });

    return res.status(201).json(ApiResponse.success('Course created', course));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/courses/:id - Update course
// ============================================================================
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
 *               title: { type: string, example: "NodeJS Basics v2" }
 *               description: { type: string, example: "Updated description" }
 *               status: { type: string, enum: [draft, published], example: "published" }
 *     responses:
 *       200:
 *         description: Updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.put('/:id', authMiddleware, authorize(['instructor', 'admin']), async (req, res, next) => {
  try {
    const course = await courses.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json(ApiResponse.error('Course not found'));
    }

    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(ApiResponse.error('Not authorized to update this course'));
    }

    const { title, description, status } = req.body;

    const violations = [];
    if (status && !['draft', 'published'].includes(status)) {
      violations.push({ field: 'status', rule: 'enum', message: 'Status must be draft or published' });
    }

    if (violations.length > 0) {
      return res.status(400).json(ApiResponse.validationError(violations));
    }

    await course.update({
      title: title || course.title,
      description: description || course.description,
      status: status || course.status
    });

    logger.info('Course updated', { courseId: course.id, userId: req.user.id });

    return res.status(200).json(ApiResponse.success('Course updated', course));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/courses/:id - Delete course
// ============================================================================
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete('/:id', authMiddleware, authorize(['instructor', 'admin']), async (req, res, next) => {
  try {
    const course = await courses.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json(ApiResponse.error('Course not found'));
    }

    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(ApiResponse.error('Not authorized to delete this course'));
    }

    await course.destroy();

    logger.info('Course deleted', { courseId: course.id, userId: req.user.id });

    return res.status(200).json(ApiResponse.success('Course deleted'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;