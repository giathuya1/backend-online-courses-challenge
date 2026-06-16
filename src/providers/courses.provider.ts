// src/providers/courses.provider.ts

import { Op } from 'sequelize';
import db from '../database/connection';
import logger from '../utils/logger';
import { CreateCourseBody, UpdateCourseBody, CourseQueryParams } from '../types/api.types';

const { Course, User } = db;

// Shared include — defined once so changes propagate everywhere
const INSTRUCTOR_INCLUDE = {
  model: User,
  as: 'instructor',
  attributes: ['id', 'name', 'email'],
};

export const CoursesProvider = {

  async list(query: CourseQueryParams) {
    const page  = Math.max(1, parseInt(query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '10', 10)));

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.search?.trim()) where.title = { [Op.iLike]: `%${query.search.trim()}%` };

    const { count, rows } = await Course.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: [['created_at', 'DESC']],
      include: [INSTRUCTOR_INCLUDE],
    });

    return {
      courses: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  },

  async getById(id: number) {
    const course = await Course.findByPk(id, { include: [INSTRUCTOR_INCLUDE] });
    if (!course) throw { statusCode: 404, message: 'Course not found' };
    return course;
  },

  async create(body: CreateCourseBody, instructorId: number) {
    const course = await Course.create({
      title:         body.title,
      description:   body.description,
      status:        body.status ?? 'draft',
      instructor_id: instructorId,
    });
    logger.info('Course created', { courseId: course.id, instructorId });
    return course;
  },

  async update(id: number, body: UpdateCourseBody, userId: number, role: string) {
    const course = await Course.findByPk(id);
    if (!course) throw { statusCode: 404, message: 'Course not found' };
    if (course.instructor_id !== userId && role !== 'admin')
      throw { statusCode: 403, message: 'Not authorized' };

    await course.update({
      title:       body.title       ?? course.title,
      description: body.description ?? course.description,
      status:      body.status      ?? course.status,
    });
    logger.info('Course updated', { courseId: id });
    return course;
  },

  async remove(id: number, userId: number, role: string) {
    const course = await Course.findByPk(id);
    if (!course) throw { statusCode: 404, message: 'Course not found' };
    if (course.instructor_id !== userId && role !== 'admin')
      throw { statusCode: 403, message: 'Not authorized' };

    await course.destroy();
    logger.info('Course deleted', { courseId: id });
  },
};