/**
 * Classes Routes - CRUD operations
 * Challenge 2: Create, Read, Update, Delete classes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const db = require('../models');
const {
  classes: Classes,
  courses,
  users,
  enrollments,
  user_roles,
  roles
} = db;

// ============================================================================
// GET /api/classes - List all classes with pagination
// ============================================================================
/**
 * @openapi
 * /api/classes:
 *   get:
 *     tags: [Classes]
 *     summary: List classes (pagination)
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', async (req, res, next) => {
  try {
    const { courseId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (courseId) where.course_id = courseId;

    const { count, rows } = await Classes.findAndCountAll({
      where,
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['start_date', 'ASC']],
      include: [
        {
          model: courses,
          attributes: ['id', 'title', 'status']
        },
        {
          model: users,
          as: 'instructor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    logger.info('Classes listed', { count, page, limit });

    res.status(200).json(ApiResponse.success('Classes retrieved', {
      classes: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/classes/:id - Get class by ID
// ============================================================================
/**
 * @openapi
 * /api/classes/{id}:
 *   get:
 *     tags: [Classes]
 *     summary: Get class by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const classRecord = await Classes.findByPk(req.params.id, {
      include: [
        {
          model: courses,
          attributes: ['id', 'title', 'description', 'status']
        },
        {
          model: users,
          as: 'instructor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!classRecord) {
      return res.status(404).json(ApiResponse.error('Class not found'));
    }

    res.status(200).json(ApiResponse.success('Class retrieved', classRecord));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/classes - Create class
// ============================================================================
/**
 * @openapi
 * /api/classes:
 *   post:
 *     tags: [Classes]
 *     summary: Create class
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [course_id, class_name, start_date, end_date]
 *             properties:
 *               course_id: { type: integer, example: 7 }
 *               class_name: { type: string, example: "Batch 01" }
 *               start_date: { type: string, example: "2026-06-01" }
 *               end_date: { type: string, example: "2026-07-01" }
 *               max_students: { type: integer, example: 30 }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authMiddleware, authorize(['instructor', 'admin']), async (req, res, next) => {
  try {
    const { course_id, class_name, start_date, end_date, max_students } = req.body;

    // Validation
    const violations = [];
    if (!course_id) violations.push({ field: 'course_id', rule: 'required', message: 'Course ID is required' });
    if (!class_name) violations.push({ field: 'class_name', rule: 'required', message: 'Class name is required' });
    if (!start_date) violations.push({ field: 'start_date', rule: 'required', message: 'Start date is required' });
    if (!end_date) violations.push({ field: 'end_date', rule: 'required', message: 'End date is required' });

    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      violations.push({ field: 'end_date', rule: 'after_start', message: 'End date must be after start date' });
    }

    if (violations.length > 0) {
      return res.status(400).json(ApiResponse.validationError(violations));
    }

    // Check course exists
    const course = await courses.findByPk(course_id);
    if (!course) {
      return res.status(404).json(ApiResponse.error('Course not found'));
    }

    // Create class
    const classRecord = await Classes.create({
      course_id,
      class_name,
      start_date,
      end_date,
      max_students: max_students || 30,
      instructor_id: req.user.id
    });

    logger.info('Class created', { classId: classRecord.id, courseId: course_id, userId: req.user.id });

    res.status(201).json(ApiResponse.success('Class created', classRecord));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/classes/:id/bulk-enroll - Bulk enroll students (Challenge 11)
// ============================================================================
/**
 * @openapi
 * /api/classes/{id}/bulk-enroll:
 *   post:
 *     tags: [Classes]
 *     summary: Bulk enroll students by email (all-or-nothing transaction)
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
 *             required: [emails]
 *             properties:
 *               emails:
 *                 type: array
 *                 items: { type: string, format: email }
 *                 example: ["student_test_02@example.com"]
 *     responses:
 *       201:
 *         description: Enrolled
 *       400:
 *         description: Validation failed (rollback)
 *       404:
 *         description: Class not found
 */
router.post('/:id/bulk-enroll', authMiddleware, authorize(['instructor', 'admin']), async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const classId = Number(req.params.id);
    const emails = req.body?.emails;

    if (!Number.isInteger(classId) || classId <= 0) {
      await t.rollback();
      return res.status(400).json(ApiResponse.error('Invalid class id'));
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      await t.rollback();
      return res.status(400).json(ApiResponse.validationError([
        { field: 'emails', rule: 'required', message: 'emails must be a non-empty array' }
      ]));
    }

    const normalized = emails
      .map(e => String(e || '').trim().toLowerCase())
      .filter(Boolean);

    if (normalized.length === 0) {
      await t.rollback();
      return res.status(400).json(ApiResponse.validationError([
        { field: 'emails', rule: 'required', message: 'emails must be a non-empty array' }
      ]));
    }

    const klass = await Classes.findByPk(classId, { transaction: t });
    if (!klass) {
      await t.rollback();
      return res.status(404).json(ApiResponse.error(`Class not found: ${classId}`));
    }

    // Instructor can only bulk-enroll their own class (admin can do all)
    if (req.user.role !== 'admin' && klass.instructor_id !== req.user.id) {
      await t.rollback();
      return res.status(403).json(ApiResponse.error('Not authorized to bulk enroll for this class'));
    }

    // Load users by email
    const foundUsers = await users.findAll({
      where: { email: normalized },
      transaction: t
    });

    const byEmail = new Map(foundUsers.map(u => [String(u.email).toLowerCase(), u]));
    const missing = normalized.filter(e => !byEmail.has(e));
    if (missing.length) {
      await t.rollback();
      return res.status(400).json(ApiResponse.validationError(
        missing.map(e => ({ field: 'emails', rule: 'exists', message: `User not found: ${e}` }))
      ));
    }

    // Ensure all are students
    const withRoles = await users.findAll({
      where: { id: foundUsers.map(u => u.id) },
      include: [{
        model: user_roles,
        as: 'user_roles',
        include: [{ model: roles, as: 'role' }]
      }],
      transaction: t
    });

    const notStudents = [];
    for (const u of withRoles) {
      const roleNames = (u.user_roles || []).map(ur => ur.role?.name).filter(Boolean);
      if (!roleNames.includes('student')) notStudents.push(u.email);
    }
    if (notStudents.length) {
      await t.rollback();
      return res.status(400).json(ApiResponse.validationError(
        notStudents.map(e => ({ field: 'emails', rule: 'role', message: `User is not a student: ${e}` }))
      ));
    }

    // Check already enrolled
    const existing = await enrollments.findAll({
      where: { class_id: classId, user_id: foundUsers.map(u => u.id) },
      transaction: t
    });

    if (existing.length) {
      const existingIds = new Set(existing.map(x => x.user_id));
      const already = foundUsers.filter(u => existingIds.has(u.id)).map(u => u.email);
      await t.rollback();
      return res.status(400).json(ApiResponse.validationError(
        already.map(e => ({ field: 'emails', rule: 'unique', message: `Already enrolled: ${e}` }))
      ));
    }

    // Create enrollments (all or nothing)
    for (const u of foundUsers) {
      await enrollments.create(
        { user_id: u.id, class_id: classId, status: 'active', enrolledAt: new Date() },
        { transaction: t }
      );
    }

    await t.commit();
    logger.info('Bulk enrolled', { classId, count: foundUsers.length, by: req.user.id });

    return res.status(201).json(ApiResponse.success('Bulk enrolled', {
      class_id: classId,
      created: foundUsers.length
    }));
  } catch (error) {
    try { await t.rollback(); } catch {}
    next(error);
  }
});

// ============================================================================
// PUT /api/classes/:id - Update class
// ============================================================================
router.put('/:id', authMiddleware, authorize(['instructor', 'admin']), async (req, res, next) => {
  try {
    const classRecord = await Classes.findByPk(req.params.id);

    if (!classRecord) {
      return res.status(404).json(ApiResponse.error('Class not found'));
    }

    // Check authorization
    if (classRecord.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(ApiResponse.error('Not authorized to update this class'));
    }

    const { class_name, start_date, end_date, max_students } = req.body;

    // Validation
    const violations = [];
    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      violations.push({ field: 'end_date', rule: 'after_start', message: 'End date must be after start date' });
    }

    if (violations.length > 0) {
      return res.status(400).json(ApiResponse.validationError(violations));
    }

    // Update
    await classRecord.update({
      class_name: class_name || classRecord.class_name,
      start_date: start_date || classRecord.start_date,
      end_date: end_date || classRecord.end_date,
      max_students: max_students !== undefined ? max_students : classRecord.max_students
    });

    logger.info('Class updated', { classId: classRecord.id, userId: req.user.id });

    res.status(200).json(ApiResponse.success('Class updated', classRecord));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/classes/:id - Delete class
// ============================================================================
router.delete('/:id', authMiddleware, authorize(['instructor', 'admin']), async (req, res, next) => {
  try {
    const classRecord = await Classes.findByPk(req.params.id);

    if (!classRecord) {
      return res.status(404).json(ApiResponse.error('Class not found'));
    }

    // Check authorization
    if (classRecord.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(ApiResponse.error('Not authorized to delete this class'));
    }

    await classRecord.destroy();

    logger.info('Class deleted', { classId: classRecord.id, userId: req.user.id });

    res.status(200).json(ApiResponse.success('Class deleted'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;