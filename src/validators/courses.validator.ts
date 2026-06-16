// src/validators/courses.validator.ts

import { FieldValidator, ValidationViolation } from './common.validator';
import { CreateCourseBody, UpdateCourseBody } from '../types/api.types';

const COURSE_STATUSES = ['draft', 'published'] as const;

export const validateCreateCourse = (body: Partial<CreateCourseBody>): ValidationViolation[] => [
  ...new FieldValidator(body.title,       'title'      ).required().minLength(3).maxLength(200).violations,
  ...new FieldValidator(body.description, 'description').maxLength(2000).violations,
  ...new FieldValidator(body.status,      'status'     ).enum([...COURSE_STATUSES]).violations,
];

export const validateUpdateCourse = (body: Partial<UpdateCourseBody>): ValidationViolation[] => [
  ...new FieldValidator(body.title,       'title'      ).minLength(3).maxLength(200).violations,
  ...new FieldValidator(body.description, 'description').maxLength(2000).violations,
  ...new FieldValidator(body.status,      'status'     ).enum([...COURSE_STATUSES]).violations,
];