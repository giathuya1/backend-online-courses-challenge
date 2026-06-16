// src/validators/classes.validator.ts

import { FieldValidator, isValidDate, ValidationViolation } from './common.validator';
import { CreateClassBody } from '../types/api.types';

export const validateCreateClass = (body: Partial<CreateClassBody>): ValidationViolation[] => {
  const violations: ValidationViolation[] = [
    ...new FieldValidator(body.course_id,    'course_id'   ).required().positiveInt().violations,
    ...new FieldValidator(body.class_name,   'class_name'  ).required().minLength(1).maxLength(100).violations,
    ...new FieldValidator(body.start_date,   'start_date'  ).required().date().violations,
    ...new FieldValidator(body.end_date,     'end_date'    ).required().date().violations,
    ...new FieldValidator(body.max_students, 'max_students').positiveInt().violations,
  ];

  // Cross-field: end_date must be after start_date
  if (
    violations.length === 0 &&
    isValidDate(body.start_date) &&
    isValidDate(body.end_date) &&
    new Date(body.end_date!) <= new Date(body.start_date!)
  ) {
    violations.push({ field: 'end_date', rule: 'afterStartDate', message: 'end_date must be after start_date' });
  }

  return violations;
};

export const validateUpdateClass = (body: Partial<CreateClassBody>): ValidationViolation[] => {
  const violations: ValidationViolation[] = [
    ...new FieldValidator(body.class_name,   'class_name'  ).minLength(1).maxLength(100).violations,
    ...new FieldValidator(body.start_date,   'start_date'  ).date().violations,
    ...new FieldValidator(body.end_date,     'end_date'    ).date().violations,
    ...new FieldValidator(body.max_students, 'max_students').positiveInt().violations,
  ];

  if (
    violations.length === 0 &&
    body.start_date && body.end_date &&
    new Date(body.end_date) <= new Date(body.start_date)
  ) {
    violations.push({ field: 'end_date', rule: 'afterStartDate', message: 'end_date must be after start_date' });
  }

  return violations;
};