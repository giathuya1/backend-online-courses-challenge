// src/repositories/stats.repository.ts
// Read-only aggregation queries backing /api/stats and the Excel export.
// Deliberately written as a few simple grouped queries + in-memory joins
// instead of one giant multi-join GROUP BY — easier to read, easier to
// unit test piece by piece, and avoids subtle Sequelize alias bugs in
// deeply nested `include` + `group` combinations.

import { col, fn } from 'sequelize';
import db from '../database/connection';

const { Course, Class, Enrollment, User } = db;

export const StatsRepository = {
  async getCourseStats() {
    const courses = await Course.findAll({
      attributes: ['id', 'title', 'status'],
      include: [{ model: User, as: 'instructor', attributes: ['name'] }],
    }) as any[];

    const classCounts = await Class.findAll({
      attributes: ['course_id', [fn('COUNT', col('id')), 'count']],
      group: ['course_id'],
      raw: true,
    }) as any[];
    const classCountByCourse = new Map(classCounts.map(c => [c.course_id, Number(c.count)]));

    const allClasses = await Class.findAll({ attributes: ['id', 'course_id'], raw: true }) as any[];
    const classIdsByCourse = new Map<number, number[]>();
    allClasses.forEach(c => {
      const list = classIdsByCourse.get(c.course_id) ?? [];
      list.push(c.id);
      classIdsByCourse.set(c.course_id, list);
    });

    const enrollmentCounts = await Enrollment.findAll({
      attributes: ['class_id', [fn('COUNT', col('id')), 'count']],
      group: ['class_id'],
      raw: true,
    }) as any[];
    const enrolledCountByClass = new Map(enrollmentCounts.map(e => [e.class_id, Number(e.count)]));

    return courses.map((c: any) => {
      const classIds = classIdsByCourse.get(c.id) ?? [];
      const enrolledCount = classIds.reduce((sum, id) => sum + (enrolledCountByClass.get(id) ?? 0), 0);
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        instructor: c.instructor?.name ?? '—',
        classCount: classCountByCourse.get(c.id) ?? 0,
        enrolledCount,
      };
    });
  },

  async getClassStats() {
    const classes = await Class.findAll({
      attributes: ['id', 'class_name', 'start_date', 'end_date', 'max_students'],
      include: [
        { model: Course, attributes: ['title'] },
        { model: User, as: 'instructor', attributes: ['name'] },
      ],
    }) as any[];

    const counts = await Enrollment.findAll({
      attributes: ['class_id', [fn('COUNT', col('id')), 'count']],
      group: ['class_id'],
      raw: true,
    }) as any[];
    const countByClass = new Map(counts.map(c => [c.class_id, Number(c.count)]));

    return classes.map((c: any) => ({
      id: c.id,
      class_name: c.class_name,
      courseTitle: c.course?.title ?? '—',
      instructor: c.instructor?.name ?? '—',
      start_date: c.start_date ? new Date(c.start_date).toISOString().slice(0, 10) : '',
      end_date: c.end_date ? new Date(c.end_date).toISOString().slice(0, 10) : '',
      capacity: `${countByClass.get(c.id) ?? 0} / ${c.max_students}`,
    }));
  },

  async getEnrollmentStatusBreakdown() {
    const rows = await Enrollment.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }) as any[];
    return rows.map(r => ({ status: r.status, count: Number(r.count) }));
  },
};
