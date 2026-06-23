// src/repositories/class.repository.ts
// PURE DATA ACCESS for the Class aggregate. No validation, no
// authorization checks, no transactions decisions beyond accepting one
// that's already open — all of that is service-layer responsibility.

import db from '../database/connection';

const { Class, Course, User, Enrollment, UserRole, Role } = db;

const INSTRUCTOR_INCLUDE = { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] };
const COURSE_SUMMARY_INCLUDE = { model: Course, attributes: ['id', 'title', 'status'] };
const COURSE_DETAIL_INCLUDE = { model: Course, attributes: ['id', 'title', 'description', 'status'] };

export const ClassRepository = {
  findAndCountAll(where: Record<string, unknown>, offset: number, limit: number) {
    return Class.findAndCountAll({
      where, offset, limit,
      order: [['start_date', 'ASC']],
      include: [COURSE_SUMMARY_INCLUDE, INSTRUCTOR_INCLUDE],
    });
  },

  findById(id: number) {
    return Class.findByPk(id, { include: [COURSE_DETAIL_INCLUDE, INSTRUCTOR_INCLUDE] });
  },

  findCourseById(id: number) {
    return Course.findByPk(id);
  },

  create(data: Record<string, unknown>) {
    return Class.create(data as any);
  },

  findByIdWithCourse(id: number, transaction?: any) {
    return Class.findByPk(id, {
      include: [{ model: Course, attributes: ['id', 'title'] }],
      transaction,
    });
  },

  findUsersByEmailsWithRoles(emails: string[], transaction?: any) {
    return User.findAll({
      where: { email: emails },
      include: [{ model: UserRole, as: 'user_roles', include: [{ model: Role, as: 'role' }] }],
      transaction,
    });
  },

  findEnrollmentsByClassAndUsers(classId: number, userIds: number[], transaction?: any) {
    return Enrollment.findAll({
      where: { class_id: classId, user_id: userIds },
      attributes: ['user_id'],
      transaction,
    });
  },

  bulkCreateEnrollments(rows: { user_id: number; class_id: number; status: 'active' }[], transaction?: any) {
    return Enrollment.bulkCreate(rows, { transaction });
  },

  startTransaction() {
    return db.sequelize.transaction();
  },
};
