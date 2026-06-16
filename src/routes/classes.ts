// src/routes/classes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import db from '../database/connection';
import { CreateClassBody, BulkEnrollBody, ValidationViolation } from '../types/api.types';

const router = Router();
const { Class, Course, User, Enrollment, UserRole, Role } = db;

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.query;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (courseId) where.course_id = courseId;

    const { count, rows } = await Class.findAndCountAll({
      where, offset, limit,
      order: [['start_date', 'ASC']],
      include: [
        { model: Course, attributes: ['id', 'title', 'status'] },
        { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
      ],
    });

    res.status(200).json(ApiResponse.success('Classes retrieved', {
      classes: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    }));
  } catch (error) { next(error); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classRecord = await Class.findByPk(Number(req.params.id), {
      include: [
        { model: Course, attributes: ['id', 'title', 'description', 'status'] },
        { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!classRecord) return res.status(404).json(ApiResponse.error('Class not found'));
    res.status(200).json(ApiResponse.success('Class retrieved', classRecord));
  } catch (error) { next(error); }
});

router.post('/', authMiddleware, authorize(['instructor', 'admin']),
  async (req: Request<{}, {}, CreateClassBody>, res: Response, next: NextFunction) => {
    try {
      const { course_id, class_name, start_date, end_date, max_students } = req.body;

      const violations: ValidationViolation[] = [];
      if (!course_id) violations.push({ field: 'course_id', rule: 'required', message: 'Course ID is required' });
      if (!class_name) violations.push({ field: 'class_name', rule: 'required', message: 'Class name is required' });
      if (!start_date) violations.push({ field: 'start_date', rule: 'required', message: 'Start date is required' });
      if (!end_date) violations.push({ field: 'end_date', rule: 'required', message: 'End date is required' });
      if (start_date && end_date && new Date(start_date) >= new Date(end_date))
        violations.push({ field: 'end_date', rule: 'after_start', message: 'End date must be after start date' });
      if (violations.length > 0) return res.status(400).json(ApiResponse.validationError(violations));

      const course = await Course.findByPk(course_id);
      if (!course) return res.status(404).json(ApiResponse.error('Course not found'));

      const classRecord = await Class.create({
        course_id,
        class_name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        max_students: max_students || 30,
        instructor_id: req.user!.id,
      });

      logger.info('Class created', { classId: classRecord.id });
      res.status(201).json(ApiResponse.success('Class created', classRecord));
    } catch (error) { next(error); }
  }
);

router.post('/:id/bulk-enroll', authMiddleware, authorize(['instructor', 'admin']),
  async (req: Request<{ id: string }, {}, BulkEnrollBody>, res: Response, next: NextFunction) => {
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
        return res.status(400).json(ApiResponse.validationError([{ field: 'emails', rule: 'required', message: 'emails must be a non-empty array' }]));
      }

      const normalized = emails.map(e => String(e || '').trim().toLowerCase()).filter(Boolean);
      const klass = await Class.findByPk(classId, { transaction: t });
      if (!klass) { await t.rollback(); return res.status(404).json(ApiResponse.error(`Class not found: ${classId}`)); }

      if (req.user!.role !== 'admin' && klass.instructor_id !== req.user!.id) {
        await t.rollback();
        return res.status(403).json(ApiResponse.error('Not authorized'));
      }

      const foundUsers = await User.findAll({ where: { email: normalized }, transaction: t });
      const byEmail = new Map((foundUsers as any[]).map(u => [String(u.email).toLowerCase(), u]));
      const missing = normalized.filter(e => !byEmail.has(e));
      if (missing.length) {
        await t.rollback();
        return res.status(400).json(ApiResponse.validationError(missing.map(e => ({ field: 'emails', rule: 'exists', message: `User not found: ${e}` }))));
      }

      const withRoles = await User.findAll({
        where: { id: (foundUsers as any[]).map(u => u.id) },
        include: [{ model: UserRole, as: 'user_roles', include: [{ model: Role, as: 'role' }] }],
        transaction: t,
      });
      const notStudents: string[] = [];
      for (const u of withRoles as any[]) {
        const roleNames = (u.user_roles || []).map((ur: any) => ur.role?.name).filter(Boolean);
        if (!roleNames.includes('student')) notStudents.push(u.email);
      }
      if (notStudents.length) {
        await t.rollback();
        return res.status(400).json(ApiResponse.validationError(notStudents.map(e => ({ field: 'emails', rule: 'role', message: `Not a student: ${e}` }))));
      }

      const existing = await Enrollment.findAll({ where: { class_id: classId, user_id: (foundUsers as any[]).map(u => u.id) }, transaction: t });
      if (existing.length) {
        const existingIds = new Set((existing as any[]).map(x => x.user_id));
        const already = (foundUsers as any[]).filter(u => existingIds.has(u.id)).map(u => u.email);
        await t.rollback();
        return res.status(400).json(ApiResponse.validationError(already.map((e: string) => ({ field: 'emails', rule: 'unique', message: `Already enrolled: ${e}` }))));
      }

      for (const u of foundUsers as any[]) {
        await Enrollment.create({ user_id: u.id, class_id: classId, status: 'active' }, { transaction: t });
      }

      await t.commit();
      return res.status(201).json(ApiResponse.success('Bulk enrolled', { class_id: classId, created: (foundUsers as any[]).length }));
    } catch (error) {
      try { await t.rollback(); } catch {}
      next(error);
    }
  }
);

router.put('/:id', authMiddleware, authorize(['instructor', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classRecord = await Class.findByPk(Number(req.params.id));
      if (!classRecord) return res.status(404).json(ApiResponse.error('Class not found'));
      if (classRecord.instructor_id !== req.user!.id && req.user!.role !== 'admin')
        return res.status(403).json(ApiResponse.error('Not authorized'));

      const { class_name, start_date, end_date, max_students } = req.body;
      if (start_date && end_date && new Date(start_date) >= new Date(end_date))
        return res.status(400).json(ApiResponse.validationError([{ field: 'end_date', rule: 'after_start', message: 'End date must be after start date' }]));

      await classRecord.update({
        class_name: class_name || classRecord.class_name,
        start_date: start_date || classRecord.start_date,
        end_date: end_date || classRecord.end_date,
        max_students: max_students !== undefined ? max_students : classRecord.max_students,
      });

      res.status(200).json(ApiResponse.success('Class updated', classRecord));
    } catch (error) { next(error); }
  }
);

router.delete('/:id', authMiddleware, authorize(['instructor', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classRecord = await Class.findByPk(Number(req.params.id));
      if (!classRecord) return res.status(404).json(ApiResponse.error('Class not found'));
      if (classRecord.instructor_id !== req.user!.id && req.user!.role !== 'admin')
        return res.status(403).json(ApiResponse.error('Not authorized'));

      await classRecord.destroy();
      res.status(200).json(ApiResponse.success('Class deleted'));
    } catch (error) { next(error); }
  }
);

export default router;