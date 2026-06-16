// src/types/api.types.ts
// Shared types cho API request/response

// ─── Validation ──────────────────────────────────────────────────────────────
export interface ValidationViolation {
  field: string;
  rule: string;
  message: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface RegisterRequestBody {
  email: string;
  username: string;
  name: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequestBody {
  email: string;    // email hoặc username
  password: string;
}

export interface VerifyOtpBody {
  otp: string;
}

// ─── Courses ──────────────────────────────────────────────────────────────────
export interface CreateCourseBody {
  title: string;
  description: string;
  status?: 'draft' | 'published';
}

export interface UpdateCourseBody {
  title?: string;
  description?: string;
  status?: 'draft' | 'published';
}

export interface CourseQueryParams {
  search?: string;
  status?: 'draft' | 'published';
  page?: string;
  limit?: string;
}

// ─── Classes ──────────────────────────────────────────────────────────────────
export interface CreateClassBody {
  course_id: number;
  class_name: string;
  start_date: string;
  end_date: string;
  max_students?: number;
}

export interface BulkEnrollBody {
  emails: string[];
}

// ─── Enrollments ─────────────────────────────────────────────────────────────
export interface EnrollBody {
  class_id: number;
}

export type EnrollmentStatus = 'active' | 'dropped' | 'suspended';

export interface UpdateEnrollmentStatusBody {
  status: EnrollmentStatus;
}

// ─── Roles ────────────────────────────────────────────────────────────────────
export type RoleName = 'admin' | 'instructor' | 'student';

export interface AssignRoleBody {
  user_id: number;
  role: RoleName;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}
