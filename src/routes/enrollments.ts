// src/routes/enrollments.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import db from '../database/connection';
import { EnrollBody, UpdateEnrollmentStatusBody, EnrollmentStatus, ValidationViolation } from '../types/api.types';

const router = Router();
const { Enrollment, Class, Course, User } = db;

// ─── POST /api/enrollments ────────────────────────────────────────────────────
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
 *               class_id: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Enrolled successfully
 */
router.post('/', authMiddleware, authorize(['student', 'admin']),
  async (req: Request<{}, {}, EnrollBody>, res: Response, next: NextFunction) => {
    try {
      const { class_id } = req.body;
      const userId = req.user!.id;

      if (!class_id) return res.status(400).json(ApiResponse.validationError([{ field: 'class_id', rule: 'required', message: 'Class ID is required' }]));

      const classRecord = await Class.findByPk(class_id);
      if (!classRecord) return res.status(404).json(ApiResponse.error('Class not found'));

      const existingEnrollment = await Enrollment.findOne({ where: { user_id: userId, class_id } });
      if (existingEnrollment) return res.status(400).json(ApiResponse.error('Already enrolled in this class'));

      const enrollmentCount = await Enrollment.count({ where: { class_id } });
      if (enrollmentCount >= classRecord.max_students) return res.status(400).json(ApiResponse.error('Class is full'));

      const enrollment = await Enrollment.create({ user_id: userId, class_id, status: 'active' });

      logger.info('Student enrolled', { userId, classId: class_id, enrollmentId: enrollment.id });
      res.status(201).json(ApiResponse.success('Enrolled successfully', {
        id: enrollment.id, user_id: enrollment.user_id,
        class_id: enrollment.class_id, status: enrollment.status,
        enrolledAt: enrollment.created_at,
      }));
    } catch (error) { next(error); }
  }
);

// ─── GET /api/enrollments ─────────────────────────────────────────────────────
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
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, dropped, suspended] }
 *       - in: query
 *         name: class_id
 *         schema: { type: integer }
 *       - in: query
 *         name: user_id
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Enrollments retrieved
 */
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const { status, class_id, user_id } = req.query;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (class_id) where.class_id = class_id;

    if (req.user!.role === 'student') {
      where.user_id = req.user!.id;
    } else if (user_id) {
      where.user_id = user_id;
    }

    const { count, rows } = await Enrollment.findAndCountAll({
      where, offset, limit,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Class, attributes: ['id', 'class_name', 'start_date', 'end_date'],
          include: [{ model: Course, attributes: ['id', 'title'] }] },
      ],
    });

    res.status(200).json(ApiResponse.success('Enrollments retrieved', {
      enrollments: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    }));
  } catch (error) { next(error); }
});

// ─── DELETE /api/enrollments/:id ──────────────────────────────────────────────
/**
 * @openapi
 * /api/enrollments/{id}:
 *   delete:
 *     tags: [Enrollments]
 *     summary: Drop an enrollment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Dropped
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollment = await Enrollment.findByPk(Number(req.params.id));  // ← FIX: Number()
    if (!enrollment) return res.status(404).json(ApiResponse.error('Enrollment not found'));
    if (enrollment.user_id !== req.user!.id && req.user!.role !== 'admin')
      return res.status(403).json(ApiResponse.error('Not authorized'));

    await enrollment.destroy();
    logger.info('Student dropped class', { userId: enrollment.user_id, classId: enrollment.class_id });
    res.status(200).json(ApiResponse.success('Dropped class successfully'));
  } catch (error) { next(error); }
});

// ─── PUT /api/enrollments/:id/status ─────────────────────────────────────────
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
 */
router.put('/:id/status', authMiddleware, authorize(['instructor', 'admin']),
  async (req: Request<{ id: string }, {}, UpdateEnrollmentStatusBody>, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const enrollment = await Enrollment.findByPk(Number(req.params.id), { include: [Class] });  // ← FIX: Number()
      if (!enrollment) return res.status(404).json(ApiResponse.error('Enrollment not found'));

      const validStatuses: EnrollmentStatus[] = ['active', 'dropped', 'suspended'];
      if (!validStatuses.includes(status))
        return res.status(400).json(ApiResponse.validationError([{ field: 'status', rule: 'enum', message: `Status must be: ${validStatuses.join(', ')}` }]));

      if ((enrollment as any).class?.instructor_id !== req.user!.id && req.user!.role !== 'admin')
        return res.status(403).json(ApiResponse.error('Not authorized'));

      await enrollment.update({ status });
      logger.info('Enrollment status updated', { enrollmentId: enrollment.id, newStatus: status });
      res.status(200).json(ApiResponse.success('Enrollment status updated', { id: enrollment.id, status: enrollment.status }));
    } catch (error) { next(error); }
  }
);

export default router;