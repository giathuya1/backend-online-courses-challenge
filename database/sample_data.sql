-- ============================================================================
-- Online Learning System - Sample Data
-- Created: 2026-04-13
-- Note: Password hashes are bcrypt (cost 10)
-- All passwords are: "password123"
-- ============================================================================

-- ============================================================================
-- 1. INSERT ROLES
-- ============================================================================
INSERT INTO roles (name) VALUES 
('admin'), 
('instructor'), 
('student');

-- ============================================================================
-- 2. INSERT USERS (10 users: 1 admin + 2 instructors + 7 students)
-- ============================================================================
INSERT INTO users (email, name, status, created_at, updated_at) VALUES 
-- Admin
('admin@example.com', 'Admin User', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Instructors
('instructor1@example.com', 'John Instructor', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('instructor2@example.com', 'Jane Instructor', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Students
('student1@example.com', 'Alice Student', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('student2@example.com', 'Bob Student', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('student3@example.com', 'Charlie Student', 'inactive', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('student4@example.com', 'Diana Student', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('student5@example.com', 'Eve Student', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('student6@example.com', 'Frank Student', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('student7@example.com', 'Grace Student', 'inactive', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- 3. INSERT USER_AUTH (Password: "password123" hashed with bcrypt cost=10)
-- ============================================================================
-- Hash: $2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW
-- (Generated with bcrypt, Node.js: bcrypt.hash("password123", 10))
INSERT INTO user_auth (user_id, password_hash, otp_code, otp_hash, otp_expiry, created_at, updated_at) VALUES 
(1, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, '$2a$10$EIX.tVVfhQPRxj9/Xt04XOl0HW8c8Kqj8UVpJEhJKEyJ7PG0AAVSW', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- 4. INSERT USER_ROLES (Assign roles)
-- ============================================================================
INSERT INTO user_roles (user_id, role_id) VALUES 
-- Admin role
(1, 1),

-- Instructor roles
(2, 2),
(3, 2),

-- Student roles
(4, 3),
(5, 3),
(6, 3),
(7, 3),
(8, 3),
(9, 3),
(10, 3);

-- ============================================================================
-- 5. INSERT COURSES (3 courses)
-- ============================================================================
INSERT INTO courses (title, description, status, instructor_id, created_at, updated_at) VALUES 
('Python 101', 'Learn Python basics from scratch. Cover fundamentals, functions, and OOP.', 'published', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Web Development', 'HTML, CSS, JavaScript fundamentals. Build responsive websites.', 'published', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Data Science', 'Introduction to Data Science with Python. Pandas, NumPy, and Matplotlib.', 'draft', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- 6. INSERT CLASSES (5 class instances)
-- ============================================================================
INSERT INTO classes (course_id, class_name, instructor_id, start_date, end_date, max_students, created_at, updated_at) VALUES 
-- Python 101 classes
(1, 'Python 101 - Morning Batch', 2, '2026-04-20 08:00:00', '2026-06-20 10:00:00', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'Python 101 - Evening Batch', 2, '2026-04-20 18:00:00', '2026-06-20 20:00:00', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Web Development classes
(2, 'Web Dev - Batch 1', 3, '2026-04-21 09:00:00', '2026-07-21 11:00:00', 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Web Dev - Batch 2', 3, '2026-05-01 14:00:00', '2026-08-01 16:00:00', 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Data Science class
(3, 'Data Science - Online Session', 2, '2026-05-15 10:00:00', '2026-07-15 12:00:00', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- 7. INSERT ENROLLMENTS (~15 enrollments)
-- ============================================================================
INSERT INTO enrollments (user_id, class_id, status, created_at, updated_at) VALUES 
-- Class 1: Python 101 - Morning Batch (Students: 1, 2, 4)
(4, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Class 2: Python 101 - Evening Batch (Students: 3, 5, 6)
(6, 2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Class 3: Web Dev - Batch 1 (Students: 1, 2, 3, 7)
(4, 3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Class 4: Web Dev - Batch 2 (Students: 4, 5)
(7, 4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Class 5: Data Science - Online (Students: 6, 7, 1)
(9, 5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Roles: 3 (admin, instructor, student)
-- Users: 10 (1 admin, 2 instructors, 7 students)
-- Courses: 3 (2 published, 1 draft)
-- Classes: 5 (instances of courses)
-- Enrollments: 15 (student enrollments in classes)
--
-- Test Login:
-- Email: student1@example.com
-- Password: password123
-- ============================================================================
