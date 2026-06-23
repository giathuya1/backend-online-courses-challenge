// src/providers/enrollments.provider.ts
//
// CHANGED vs. original: every `throw { statusCode, message }` is replaced
// with the matching class from utils/errors.ts (NotFoundError,
// BadRequestError, ForbiddenError). Same reasoning as roles.provider.ts —
// this lets handleControllerError (and the global errorHandler) recognize
// the error via `instanceof` instead of duck-typing `err.statusCode`, and
// keeps every provider/service in the codebase throwing the same error
// vocabulary.

import db from '../database/connection';
import logger from '../utils/logger';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { EnrollmentStatus } from '../types/api.types';

const { Enrollment, Class, Course, User } = db;

// ─── Shared includes ──────────────────────────────────────────────────────────

const CLASS_WITH_COURSE_INCLUDE = {
  model: Class,
  attributes: ['id', 'class_name', 'start_date', 'end_date'],
  include: [{ model: Course, attributes: ['id', 'title'] }],
};

const USER_SUMMARY_INCLUDE = {
  model: User,
  attributes: ['id', 'name', 'email'],
};

export const EnrollmentsProvider = {

  async enroll(userId: number, classId: number) {
    // Parallel check: class existence + duplicate enrollment
    const [classRecord, existing] = await Promise.all([
      Class.findByPk(classId),
      Enrollment.findOne({ where: { user_id: userId, class_id: classId } }),
    ]);

    if (!classRecord) throw new NotFoundError('Class not found');
    if (existing)     throw new BadRequestError('Already enrolled in this class');

    const enrollmentCount = await Enrollment.count({ where: { class_id: classId } });
    if (enrollmentCount >= classRecord.max_students)
      throw new BadRequestError('Class is full');

    const enrollment = await Enrollment.create({ user_id: userId, class_id: classId, status: 'active' });
    logger.info('Student enrolled', { userId, classId, enrollmentId: enrollment.id });

    return {
      id:         enrollment.id,
      user_id:    enrollment.user_id,
      class_id:   enrollment.class_id,
      status:     enrollment.status,
      enrolledAt: enrollment.created_at,
    };
  },

  async list(
    query: Record<string, string | undefined>,
    requestingUserId: number,
    requestingRole: string,
  ) {
    const page   = Math.max(1, parseInt(query.page  ?? '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(query.limit ?? '10', 10)));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status)   where.status   = query.status;
    if (query.class_id) where.class_id = query.class_id;

    // Students can only see their own enrollments
    where.user_id = requestingRole === 'student' ? requestingUserId : (query.user_id ?? undefined);

    const { count, rows } = await Enrollment.findAndCountAll({
      where,
      offset,
      limit,
      order: [['created_at', 'DESC']],
      include: [USER_SUMMARY_INCLUDE, CLASS_WITH_COURSE_INCLUDE],
    });

    return {
      enrollments: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  },

  async drop(enrollmentId: number, userId: number, role: string) {
    const enrollment = await Enrollment.findByPk(enrollmentId);
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    if (enrollment.user_id !== userId && role !== 'admin')
      throw new ForbiddenError('Not authorized');

    await enrollment.destroy();
    logger.info('Student dropped class', { userId: enrollment.user_id, classId: enrollment.class_id });
  },

  async updateStatus(enrollmentId: number, status: EnrollmentStatus, userId: number, role: string) {
    const enrollment = await Enrollment.findByPk(enrollmentId, {
      include: [{ model: Class, attributes: ['instructor_id'] }],
    });
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    if ((enrollment as any).class?.instructor_id !== userId && role !== 'admin')
      throw new ForbiddenError('Not authorized');

    await enrollment.update({ status });
    logger.info('Enrollment status updated', { enrollmentId, newStatus: status });

    return { id: enrollment.id, status: enrollment.status };
  },
};
