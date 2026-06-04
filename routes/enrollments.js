const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const db = require('../models');
const { enrollments, classes: Classes, courses, users } = db;

/**
 * @openapi
 * tags:
 *   - name: Enrollments
 *     description: Student enrollments management
 */

// ============================================================================
// POST /api/enrollments - Student enroll into a class
// ============================================================================
/**
 * @openapi
 * /api/enrollments:
 *   post:
 *     tags: [Enrollments]
 *     summary: Enroll into a class (student/admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class_id]
 *             properties:
 *               class_id: { type: integer, example: 9 }
 *     responses:
 *       201:
 *         description: Enrolled successfully
 *       400:
 *         description: Validation error / already enrolled / class full
 *       404:
 *         description: Class not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authMiddleware, authorize(['student', 'admin']), async (req, res, next) => {
  try {
    const { class_id } = req.body;
    const userId = req.user.id;

    // Validation
    const violations = [];
    if (!class_id) violations.push({ field: 'class_id', rule: 'required', message: 'Class ID is required' });

    if (violations.length > 0) {
      return res.status(400).json(ApiResponse.validationError(violations));
    }

    // Check class exists
    const classRecord = await Classes.findByPk(class_id);
    if (!classRecord) {
      return res.status(404).json(ApiResponse.error('Class not found'));
    }

    // Check already enrolled
    const existingEnrollment = await enrollments.findOne({
      where: { user_id: userId, class_id }
    });
    if (existingEnrollment) {
      return res.status(400).json(ApiResponse.error('Already enrolled in this class'));
    }

    // Check max students
    const enrollmentCount = await enrollments.count({ where: { class_id } });
    if (enrollmentCount >= classRecord.max_students) {
      return res.status(400).json(ApiResponse.error('Class is full'));
    }

    // Create enrollment
    const enrollment = await enrollments.create({
      user_id: userId,
      class_id,
      status: 'active'
    });

    logger.info('Student enrolled', { userId, classId: class_id, enrollmentId: enrollment.id });

    res.status(201).json(ApiResponse.success('Enrolled successfully', {
      id: enrollment.id,
      user_id: enrollment.user_id,
      class_id: enrollment.class_id,
      status: enrollment.status,
      enrolledAt: enrollment.createdAt
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/enrollments - List enrollments with filtering
// ============================================================================
/**
 * @openapi
 * /api/enrollments:
 *   get:
 *     tags: [Enrollments]
 *     summary: List enrollments (students see only their own)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, dropped, suspended] }
 *       - in: query
 *         name: class_id
 *         schema: { type: integer }
 *       - in: query
 *         name: user_id
 *         schema: { type: integer }
 *         description: Optional (ignored when role=student)
 *     responses:
 *       200:
 *         description: Enrollments retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, class_id, user_id } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (class_id) where.class_id = class_id;

    // Students can only see their own enrollments, instructors can see all in their classes
    if (req.user.role === 'student') {
      where.user_id = req.user.id;
    } else if (user_id) {
      where.user_id = user_id;
    }

    const { count, rows } = await enrollments.findAndCountAll({
      where,
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: users,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Classes,
          attributes: ['id', 'class_name', 'start_date', 'end_date'],
          include: [{
            model: courses,
            attributes: ['id', 'title']
          }]
        }
      ]
    });

    res.status(200).json(ApiResponse.success('Enrollments retrieved', {
      enrollments: rows,
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
// DELETE /api/enrollments/:id - Student drop class
// ============================================================================
/**
 * @openapi
 * /api/enrollments/{id}:
 *   delete:
 *     tags: [Enrollments]
 *     summary: Drop an enrollment (owner student/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Dropped successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const enrollment = await enrollments.findByPk(req.params.id);

    if (!enrollment) {
      return res.status(404).json(ApiResponse.error('Enrollment not found'));
    }

    // Check authorization (only student who enrolled or admin)
    if (enrollment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(ApiResponse.error('Not authorized to drop this enrollment'));
    }

    await enrollment.destroy();

    logger.info('Student dropped class', { userId: enrollment.user_id, classId: enrollment.class_id });

    res.status(200).json(ApiResponse.success('Dropped class successfully'));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/enrollments/:id/status - Instructor approve/reject enrollment
// ============================================================================
/**
 * @openapi
 * /api/enrollments/{id}/status:
 *   put:
 *     tags: [Enrollments]
 *     summary: Update enrollment status (instructor/admin)
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, dropped, suspended]
 *                 example: "suspended"
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.put('/:id/status', authMiddleware, authorize(['instructor', 'admin']), async (req, res, next) => {
  try {
    const { status } = req.body;
    const enrollment = await enrollments.findByPk(req.params.id, {
      include: [Classes]
    });

    if (!enrollment) {
      return res.status(404).json(ApiResponse.error('Enrollment not found'));
    }

    // Validate status
    const validStatuses = ['active', 'dropped', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(ApiResponse.validationError([
        { field: 'status', rule: 'enum', message: `Status must be one of: ${validStatuses.join(', ')}` }
      ]));
    }

    // Check authorization (only class instructor or admin)
    if (enrollment.class.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(ApiResponse.error('Not authorized to modify this enrollment'));
    }

    await enrollment.update({ status });

    logger.info('Enrollment status updated', { enrollmentId: enrollment.id, newStatus: status, updatedBy: req.user.id });

    res.status(200).json(ApiResponse.success('Enrollment status updated', {
      id: enrollment.id,
      status: enrollment.status
    }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;