// src/services/class.service.ts
// Business logic for classes. The original classes.provider.ts mixed this
// together with raw Sequelize calls; here it's pulled apart so the
// "what are the rules" code (this file) doesn't scroll past 50 lines of
// "how do I query Postgres" code (class.repository.ts).

import { ClassRepository } from '../repositories/class.repository';
import EmailService from '../utils/email';
import logger from '../utils/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { CreateClassBody } from '../types/api.types';

export const ClassService = {
  async list(query: { courseId?: string; page?: string; limit?: string }) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '10', 10)));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.courseId) where.course_id = query.courseId;

    const { count, rows } = await ClassRepository.findAndCountAll(where, offset, limit);
    return { classes: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
  },

  async getById(id: number) {
    const record = await ClassRepository.findById(id);
    if (!record) throw new NotFoundError('Class not found');
    return record;
  },

  async create(body: CreateClassBody, instructorId: number) {
    const course = await ClassRepository.findCourseById(body.course_id);
    if (!course) throw new NotFoundError('Course not found');

    const record = await ClassRepository.create({
      course_id: body.course_id,
      class_name: body.class_name,
      start_date: new Date(body.start_date),
      end_date: new Date(body.end_date),
      max_students: body.max_students ?? 30,
      instructor_id: instructorId,
    });

    logger.info('Class created', { classId: record.id, instructorId });
    return record;
  },

  async update(id: number, body: Partial<CreateClassBody>, userId: number, role: string) {
    const record = await ClassRepository.findById(id);
    if (!record) throw new NotFoundError('Class not found');
    if (record.instructor_id !== userId && role !== 'admin') throw new ForbiddenError('Not authorized');

    await record.update({
      class_name: body.class_name ?? record.class_name,
      start_date: body.start_date ? new Date(body.start_date) : record.start_date,
      end_date: body.end_date ? new Date(body.end_date) : record.end_date,
      max_students: body.max_students ?? record.max_students,
    });
    return record;
  },

  async remove(id: number, userId: number, role: string) {
    const record = await ClassRepository.findById(id);
    if (!record) throw new NotFoundError('Class not found');
    if (record.instructor_id !== userId && role !== 'admin') throw new ForbiddenError('Not authorized');
    await record.destroy();
    logger.info('Class deleted', { classId: id });
  },

  /**
   * Bulk-enroll: the single most business-logic-heavy operation in the app
   * — exactly why it belongs in a service, not a thin Sequelize wrapper.
   *
   * Flow: validate (class exists, caller authorized) -> resolve emails to
   * users -> validate (all found, all students, none already enrolled) ->
   * bulk insert in ONE transaction -> commit -> THEN send confirmation
   * emails. Emails happen after commit on purpose: an SMTP failure must
   * never roll back enrollments that already succeeded.
   */
  async bulkEnroll(classId: number, emails: string[], userId: number, role: string) {
    const t = await ClassRepository.startTransaction();
    try {
      const klass = await ClassRepository.findByIdWithCourse(classId, t);
      if (!klass) throw new NotFoundError(`Class not found: ${classId}`);
      if (role !== 'admin' && klass.instructor_id !== userId) throw new ForbiddenError('Not authorized');

      const normalized = [...new Set(emails.map(e => String(e).trim().toLowerCase()).filter(Boolean))];

      const foundUsers = await ClassRepository.findUsersByEmailsWithRoles(normalized, t) as any[];
      const byEmail = new Map(foundUsers.map(u => [String(u.email).toLowerCase(), u]));

      const missing = normalized.filter(e => !byEmail.has(e));
      if (missing.length) throw new ValidationError(
        missing.map(e => ({ field: 'emails', rule: 'exists', message: `User not found: ${e}` })),
        'Some emails could not be found',
      );

      const notStudents = foundUsers
        .filter(u => !(u.user_roles ?? []).some((ur: any) => ur.role?.name === 'student'))
        .map((u: any) => u.email as string);
      if (notStudents.length) throw new ValidationError(
        notStudents.map(e => ({ field: 'emails', rule: 'role', message: `Not a student: ${e}` })),
        'Some users are not students',
      );

      const userIds = foundUsers.map((u: any) => u.id);
      const existing = await ClassRepository.findEnrollmentsByClassAndUsers(classId, userIds, t) as any[];
      if (existing.length) {
        const existingIds = new Set(existing.map((x: any) => x.user_id));
        const already = foundUsers.filter((u: any) => existingIds.has(u.id)).map((u: any) => u.email as string);
        throw new ValidationError(
          already.map(e => ({ field: 'emails', rule: 'unique', message: `Already enrolled: ${e}` })),
          'Some users are already enrolled',
        );
      }

      await ClassRepository.bulkCreateEnrollments(
        foundUsers.map((u: any) => ({ user_id: u.id, class_id: classId, status: 'active' as const })),
        t,
      );

      await t.commit();
      logger.info('Bulk enroll completed', { classId, count: foundUsers.length });

      // ── Notify AFTER commit — never let email delay/fail the transaction ──
      const courseTitle = (klass as any).course?.title as string | undefined;
      await Promise.all(foundUsers.map((u: any) =>
        EmailService.trySend(
          () => EmailService.sendEnrollmentConfirmationEmail(u.email, u.name, klass.class_name ?? '', courseTitle),
          `bulkEnrollConfirmation:${u.email}`,
        )
      ));

      return { class_id: classId, created: foundUsers.length };
    } catch (err) {
      try { await t.rollback(); } catch { /* already committed or connection lost — ignore */ }
      throw err;
    }
  },
};
