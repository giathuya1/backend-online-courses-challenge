-- ============================================================================
-- Online Learning System - Database Schema
-- Created: 2026-04-13
-- Database: PostgreSQL 16.8
-- ============================================================================

-- Create database
CREATE DATABASE online_learning
  WITH ENCODING = 'UTF8'
  LOCALE_PROVIDER = libc
  LOCALE = 'en-US';

-- Connect to database
\connect online_learning

-- ============================================================================
-- 1. ROLES TABLE
-- ============================================================================
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

COMMENT ON TABLE roles IS 'User roles: admin, instructor, student';
COMMENT ON COLUMN roles.name IS 'Role name (admin, instructor, student)';

-- ============================================================================
-- 2. USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'inactive',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add CHECK constraint for status
ALTER TABLE users 
  ADD CONSTRAINT check_status_users 
  CHECK (status IN ('active', 'inactive'));

COMMENT ON TABLE users IS 'Core user information';
COMMENT ON COLUMN users.email IS 'User email (unique)';
COMMENT ON COLUMN users.name IS 'User full name';
COMMENT ON COLUMN users.status IS 'Account status: active or inactive';

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 3. USER_AUTH TABLE (Password, OTP, Tokens)
-- ============================================================================
CREATE TABLE user_auth (
  user_id INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL,
  otp_code VARCHAR(6),
  otp_hash TEXT,
  otp_expiry TIMESTAMP,
  password_changed_at TIMESTAMP,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  refresh_token_hash TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE user_auth IS 'User authentication data: password hash, OTP, tokens';
COMMENT ON COLUMN user_auth.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN user_auth.otp_code IS 'OTP code (6 digits, not hashed)';
COMMENT ON COLUMN user_auth.otp_hash IS 'Bcrypt hashed OTP for verification';
COMMENT ON COLUMN user_auth.otp_expiry IS 'OTP expiry time (5 minutes)';

-- ============================================================================
-- 4. USER_ROLES TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

COMMENT ON TABLE user_roles IS 'User-Role mapping (many-to-many)';

-- ============================================================================
-- 5. COURSES TABLE
-- ============================================================================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  instructor_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add CHECK constraint for status
ALTER TABLE courses 
  ADD CONSTRAINT check_status_courses 
  CHECK (status IN ('draft', 'published'));

COMMENT ON TABLE courses IS 'Course information';
COMMENT ON COLUMN courses.status IS 'Course status: draft or published';
COMMENT ON COLUMN courses.instructor_id IS 'Instructor user ID';

CREATE INDEX idx_courses_title ON courses(title);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);

-- ============================================================================
-- 6. CLASSES TABLE (Class instances of a course)
-- ============================================================================
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL,
  class_name VARCHAR(255) NOT NULL,
  instructor_id INTEGER,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  max_students INTEGER DEFAULT 30,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE classes IS 'Class instances (sessions) of a course';
COMMENT ON COLUMN classes.class_name IS 'Class name/batch (e.g., "Python 101 - Morning")';
COMMENT ON COLUMN classes.instructor_id IS 'Class instructor (may differ from course instructor)';
COMMENT ON COLUMN classes.max_students IS 'Maximum number of students allowed';

CREATE INDEX idx_classes_course ON classes(course_id);
CREATE INDEX idx_classes_instructor ON classes(instructor_id);

-- ============================================================================
-- 7. ENROLLMENTS TABLE (Student enrollments in classes)
-- ============================================================================
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, class_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Add CHECK constraint for status
ALTER TABLE enrollments 
  ADD CONSTRAINT check_status_enrollments 
  CHECK (status IN ('active', 'dropped'));

COMMENT ON TABLE enrollments IS 'Student enrollment records (many-to-many between users and classes)';
COMMENT ON COLUMN enrollments.status IS 'Enrollment status: active or dropped';

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);

-- ============================================================================
-- Summary
-- ============================================================================
-- Tables created:
-- - roles: 3 roles (admin, instructor, student)
-- - users: User accounts (students, instructors, admin)
-- - user_auth: Authentication data
-- - user_roles: User-Role mapping
-- - courses: Course definitions
-- - classes: Class instances
-- - enrollments: Student enrollments
-- ============================================================================
