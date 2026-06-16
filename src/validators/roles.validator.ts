// src/validators/roles.validator.ts

import { FieldValidator, ValidationViolation } from './common.validator';
import { AssignRoleBody, RoleName } from '../types/api.types';

export const ALLOWED_ROLE_NAMES: RoleName[] = ['admin', 'instructor', 'student'];

export const validateAssignRole = (body: Partial<AssignRoleBody>): ValidationViolation[] => [
  ...new FieldValidator(body.user_id, 'user_id').required().positiveInt().violations,
  ...new FieldValidator(body.role,    'role'   ).required().enum(ALLOWED_ROLE_NAMES).violations,
];