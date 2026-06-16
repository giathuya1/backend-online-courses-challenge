// src/providers/classes.provider.ts

import db from '../database/connection';
import logger from '../utils/logger';
import { CreateClassBody } from '../types/api.types';

const { Class, Course, User, Enrollment, UserRole, Role } = db;

// ─── Shared includes ──────────────────────────────────────────────────────────

const INSTRUCTOR_INCLUDE = {
  model: User,
  as: 'instructor',
  attributes: ['id', 'name', 'email'],
};

const COURSE_SUMMARY_INCLUDE = {
  model: Course,
  attributes: ['id', 'title', 'status'],
};

const COURSE_DETAIL_INCLUDE = {
  model: Course,
  attributes: ['id', 'title', 'description', 'status'],
};

export const ClassesProvider = {

  async list(query: { courseId?: string; page?: string; limit?: string }) {
    const page   = Math.max(1, parseInt(query.page  ?? '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(query.limit ?? '10', 10)));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.courseId) where.course_id = query.courseId;

    const { count, rows } = await Class.findAndCountAll({
      where, offset, limit,
      order: [['start_date', 'ASC']],
      include: [COURSE_SUMMARY_INCLUDE, INSTRUCTOR_INCLUDE],
    });

    return {
      classes: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  },

  async getById(id: number) {
    const record = await Class.findByPk(id, {
      include: [COURSE_DETAIL_INCLUDE, INSTRUCTOR_INCLUDE],
    });
    if (!record) throw { statusCode: 404, message: 'Class not found' };
    return record;
  },

  async create(body: CreateClassBody, instructorId: number) {
    const course = await Course.findByPk(body.course_id);
    if (!course) throw { statusCode: 404, message: 'Course not found' };

    const record = await Class.create({
      course_id:     body.course_id,
      class_name:    body.class_name,
      start_date:    new Date(body.start_date),
      end_date:      new Date(body.end_date),
      max_students:  body.max_students ?? 30,
      instructor_id: instructorId,
    });

    logger.info('Class created', { classId: record.id, instructorId });
    return record;
  },

  async update(id: number, body: Partial<CreateClassBody>, userId: number, role: string) {
    const record = await Class.findByPk(id);
    if (!record) throw { statusCode: 404, message: 'Class not found' };
    if (record.instructor_id !== userId && role !== 'admin')
      throw { statusCode: 403, message: 'Not authorized' };

    await record.update({
      class_name:   body.class_name   ?? record.class_name,
      start_date:   body.start_date   ? new Date(body.start_date) : record.start_date,
      end_date:     body.end_date     ? new Date(body.end_date)   : record.end_date,
      max_students: body.max_students ?? record.max_students,
    });

    return record;
  },

  async remove(id: number, userId: number, role: string) {
    const record = await Class.findByPk(id);
    if (!record) throw { statusCode: 404, message: 'Class not found' };
    if (record.instructor_id !== userId && role !== 'admin')
      throw { statusCode: 403, message: 'Not authorized' };

    await record.destroy();
    logger.info('Class deleted', { classId: id });
  },

  async bulkEnroll(classId: number, emails: string[], userId: number, role: string) {
    const t = await db.sequelize.transaction();
    try {
      // ── 1. Class guard ────────────────────────────────────────────────────
      const klass = await Class.findByPk(classId, { transaction: t });
      if (!klass) throw { statusCode: 404, message: `Class not found: ${classId}` };
      if (role !== 'admin' && klass.instructor_id !== userId)
        throw { statusCode: 403, message: 'Not authorized' };

      const normalized = [...new Set(emails.map(e => String(e).trim().toLowerCase()).filter(Boolean))];

      // ── 2. Resolve users by email (single query) ──────────────────────────
      const foundUsers = await User.findAll({
        where: { email: normalized },
        include: [{ model: UserRole, as: 'user_roles', include: [{ model: Role, as: 'role' }] }],
        transaction: t,
      }) as any[];

      const byEmail = new Map(foundUsers.map(u => [String(u.email).toLowerCase(), u]));

      // ── 3. Validate: missing emails ───────────────────────────────────────
      const missing = normalized.filter(e => !byEmail.has(e));
      if (missing.length) throw {
        statusCode: 400,
        violations: missing.map(e => ({ field: 'emails', rule: 'exists', message: `User not found: ${e}` })),
      };

      // ── 4. Validate: must be students ─────────────────────────────────────
      const notStudents = foundUsers
        .filter(u => !(u.user_roles ?? []).some((ur: any) => ur.role?.name === 'student'))
        .map((u: any) => u.email as string);

      if (notStudents.length) throw {
        statusCode: 400,
        violations: notStudents.map(e => ({ field: 'emails', rule: 'role', message: `Not a student: ${e}` })),
      };

      // ── 5. Validate: not already enrolled (single query for all IDs) ──────
      const userIds   = foundUsers.map((u: any) => u.id);
      const existing  = await Enrollment.findAll({
        where: { class_id: classId, user_id: userIds },
        attributes: ['user_id'],
        transaction: t,
      }) as any[];

      if (existing.length) {
        const existingIds = new Set(existing.map((x: any) => x.user_id));
        const already     = foundUsers
          .filter((u: any) => existingIds.has(u.id))
          .map((u: any) => u.email as string);

        throw {
          statusCode: 400,
          violations: already.map(e => ({ field: 'emails', rule: 'unique', message: `Already enrolled: ${e}` })),
        };
      }

      // ── 6. Bulk insert (one query instead of N individual creates) ────────
      // NOTE: `'active' as const` keeps the literal type 'active' instead of
      // letting TS widen it to `string` inside the .map() callback — without
      // it, the inferred array type no longer matches EnrollmentCreationAttributes.
      await Enrollment.bulkCreate(
        foundUsers.map((u: any) => ({ user_id: u.id, class_id: classId, status: 'active' as const })),
        { transaction: t },
      );

      await t.commit();
      logger.info('Bulk enroll completed', { classId, count: foundUsers.length });
      return { class_id: classId, created: foundUsers.length };

    } catch (err) {
      try { await t.rollback(); } catch { /* ignore rollback errors */ }
      throw err;
    }
  },
};