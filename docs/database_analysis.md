# Database Design Analysis - Online Learning System

## Overview
This document describes the database schema for the Online Learning System. The design follows **Database-First approach** with **3NF normalization**.

## Database: `online_learning`
- **DBMS:** PostgreSQL 16.8
- **Encoding:** UTF-8
- **Locale:** en-US

---

## 📊 Tables & Design

### 1. **roles** (Static Data)
**Purpose:** Define user roles in the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Role ID (auto-increment) |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Role name: admin, instructor, student |

**Data:**
- admin: Full system access
- instructor: Can create/manage courses and classes
- student: Can enroll in classes

**Indexes:** UNIQUE(name)

---

### 2. **users** (Core User Table)
**Purpose:** Store user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | User ID (auto-increment) |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email (used for login) |
| name | VARCHAR(255) | NOT NULL | Full name |
| status | VARCHAR(50) | NOT NULL, DEFAULT='inactive' | Account status: active/inactive |
| created_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Last update time |

**Check Constraints:**
- status IN ('active', 'inactive')

**Indexes:**
- PK(id)
- UNIQUE(email)
- idx_users_email ON email

**Relationships:**
- FK to courses (instructor_id)
- FK to classes (instructor_id)
- FK from user_auth (1:1)
- FK from user_roles (many-to-many)
- FK from enrollments (many-to-many)

**Notes:**
- Email is unique identifier for login
- Status 'inactive' = newly registered, awaiting OTP verification
- Status 'active' = verified account

---

### 3. **user_auth** (Authentication & Security)
**Purpose:** Store password hashes, OTP, tokens, and authentication metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | INTEGER | PK, FK(users) | User ID |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password (cost=10) |
| otp_code | VARCHAR(6) | NULL | 6-digit OTP code (plain, not hashed) |
| otp_hash | TEXT | NULL | Bcrypt hashed OTP for verification |
| otp_expiry | TIMESTAMP | NULL | OTP expiration time (5 minutes) |
| password_changed_at | TIMESTAMP | NULL | Last password change time |
| failed_attempts | INTEGER | DEFAULT=0 | Failed login attempts (for brute-force protection) |
| locked_until | TIMESTAMP | NULL | Account locked until this time |
| refresh_token_hash | TEXT | NULL | Refresh token hash (future feature) |
| created_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Last update time |

**Relationships:**
- 1:1 to users (ON DELETE CASCADE)

**Security Notes:**
- password_hash: Never stored as plain text
- otp_code: Can be logged for debugging (but never returned to client)
- otp_hash: Used to verify OTP without storing plain code in logs
- failed_attempts: Reset to 0 on successful login
- locked_until: Account locked if failed_attempts >= 5

**OTP Flow:**
1. User registers → status='inactive'
2. POST /auth/send-otp → Generate 6-digit code → Hash it → Save otp_code, otp_hash, otp_expiry
3. User receives email with otp_code
4. POST /auth/verify-otp → Compare input with otp_hash using bcrypt
5. If valid → Update users.status='active'

---

### 4. **user_roles** (Many-to-Many)
**Purpose:** Assign roles to users (a user can have multiple roles).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | INTEGER | PK, FK(users) | User ID |
| role_id | INTEGER | PK, FK(roles) | Role ID |

**Primary Key:** (user_id, role_id)

**Example Data:**
- user_id=1, role_id=1 → Admin has admin role
- user_id=2, role_id=2 → Instructor 1 has instructor role
- user_id=4, role_id=3 → Student 1 has student role

**Cascade:** ON DELETE CASCADE on user_id

---

### 5. **courses** (Course Definitions)
**Purpose:** Define courses offered by the platform.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Course ID |
| title | VARCHAR(255) | NOT NULL | Course title (e.g., "Python 101") |
| description | TEXT | NULL | Course description and syllabus |
| status | VARCHAR(50) | DEFAULT='draft' | Status: draft/published |
| instructor_id | INTEGER | FK(users) | Course creator/primary instructor |
| created_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Course creation time |
| updated_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Last update time |

**Check Constraints:**
- status IN ('draft', 'published')

**Indexes:**
- PK(id)
- idx_courses_title ON title (for search)
- idx_courses_status ON status (for filtering)
- idx_courses_instructor ON instructor_id

**Relationships:**
- FK from classes (1:many, ON DELETE CASCADE)

**Notes:**
- draft = course is being designed, not published yet
- published = course is available for enrollment
- instructor_id can be NULL (course without instructor initially)

---

### 6. **classes** (Class Instances)
**Purpose:** Define class instances (sessions) of a course. A course can have multiple classes (morning, evening, different dates).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Class ID |
| course_id | INTEGER | FK(courses) | Associated course |
| class_name | VARCHAR(255) | NOT NULL | Class name/batch (e.g., "Python 101 - Morning") |
| instructor_id | INTEGER | FK(users) | Class instructor (may differ from course creator) |
| start_date | TIMESTAMP | NOT NULL | Class start date & time |
| end_date | TIMESTAMP | NOT NULL | Class end date & time |
| max_students | INTEGER | DEFAULT=30 | Maximum student capacity |
| created_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Last update time |

**Relationships:**
- FK to courses (many-to-one, ON DELETE CASCADE)
- FK to users/instructor (many-to-one, ON DELETE SET NULL)
- FK from enrollments (one-to-many, ON DELETE CASCADE)

**Indexes:**
- PK(id)
- idx_classes_course ON course_id
- idx_classes_instructor ON instructor_id

**Validation Rules:**
- start_date < end_date
- max_students >= 1

**Examples:**
- Course "Python 101" has 2 classes:
  - Class 1: "Python 101 - Morning" (08:00 - 10:00, max 30 students)
  - Class 2: "Python 101 - Evening" (18:00 - 20:00, max 30 students)

---

### 7. **enrollments** (Student Enrollment)
**Purpose:** Track student enrollments in classes (many-to-many relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Enrollment record ID |
| user_id | INTEGER | FK(users) | Student user ID |
| class_id | INTEGER | FK(classes) | Class ID |
| status | VARCHAR(50) | DEFAULT='active' | Enrollment status: active/dropped |
| created_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Enrollment date |
| updated_at | TIMESTAMP | DEFAULT=CURRENT_TIMESTAMP | Last status update |

**Unique Constraint:** (user_id, class_id) - A student cannot enroll twice in same class

**Check Constraints:**
- status IN ('active', 'dropped')

**Relationships:**
- FK to users (many-to-one, ON DELETE CASCADE)
- FK to classes (many-to-one, ON DELETE CASCADE)

**Indexes:**
- PK(id)
- UNIQUE(user_id, class_id)
- idx_enrollments_user ON user_id
- idx_enrollments_class ON class_id

**Enrollment Flow:**
1. Student logs in → JWT obtained
2. GET /api/classes → View available classes
3. POST /api/classes/:id/enroll → Create enrollment record
4. Enrollment.status = 'active' (default)
5. Student can DELETE /api/classes/:id/enroll → Update status to 'dropped'

---

## 🔗 Relationships Summary

### Entity-Relationship Diagram (Text)
```
┌─────────────┐
│   roles     │
│  (1:many)   │
└──────┬──────┘
       │
       ├─FK─┐
       │    │
    ┌──┴────┴──┐
    │user_roles│ (many-to-many bridge)
    └──┬────┬──┘
       │    │
       └────┼─FK────────────┐
            │               │
        ┌───┴────────────┐  │
        │     users      │──┤
        │  (10:many)     │  │
        └───┬────────────┘  │
            │               │
         ┌──┼──────────┬────┼──────────┬────────────┐
         │  │          │    │          │            │
       (1:1)(1:many) (1:many) (1:many) (1:many)   (many:many)
         │  │          │    │          │            │
    ┌────┴─┴──┐  ┌────┴─┐  │      ┌───┴────┐  ┌──┴──────┐
    │user_auth│  │courses│  │      │classes │  │enrollments│
    └─────────┘  └────┬──┘  │      └───┬────┘  └──┬───────┘
                      │     │          │          │
                    (1:many) └──────────┼──(1:many)─┘
                      │                 │
                      └────────────────(1:many)
```

### Cardinality Rules
| From | To | Type | Cascade |
|------|-----|------|---------|
| users | user_auth | 1:1 | ON DELETE CASCADE |
| users | user_roles | 1:many | ON DELETE CASCADE |
| users | courses | 1:many | ON DELETE SET NULL |
| users | classes | 1:many | ON DELETE SET NULL |
| users | enrollments | 1:many | ON DELETE CASCADE |
| roles | user_roles | 1:many | (no delete) |
| courses | classes | 1:many | ON DELETE CASCADE |
| classes | enrollments | 1:many | ON DELETE CASCADE |

---

## ✅ Normalization

**3NF (Third Normal Form) Compliance:**

1. **1NF:** All attributes are atomic (single value)
   - ✓ No repeating groups or arrays

2. **2NF:** All non-key attributes depend on the full primary key
   - ✓ No partial dependencies
   - ✓ Example: enrollments(user_id, class_id) → all other attrs depend on both

3. **3NF:** All non-key attributes depend only on primary key, not on other non-key attributes
   - ✓ Example: classes.class_name depends only on class_id, not on course_id indirectly

**No anomalies:**
- ✓ Insertion anomaly: Can insert a role without assigning to user
- ✓ Update anomaly: Changing user.name doesn't cascade inconsistently
- ✓ Deletion anomaly: Deleting enrollment doesn't orphan classes

---

## 🔐 Data Integrity

### Constraints Implemented
1. **Primary Keys:** All tables have PK
2. **Foreign Keys:** All relationships have FK with appropriate cascade rules
3. **Unique Constraints:** email (users), name (roles), (user_id, class_id) (enrollments)
4. **Check Constraints:**
   - users.status IN ('active', 'inactive')
   - courses.status IN ('draft', 'published')
   - enrollments.status IN ('active', 'dropped')
5. **NOT NULL Constraints:** Applied to required fields

### Referential Integrity
- All FK references point to existing PK
- ON DELETE CASCADE applied to prevent orphaned records
- ON DELETE SET NULL applied to instructor references (can be NULL)

---

## 📈 Performance Optimization

### Indexes
| Table | Column(s) | Type | Purpose |
|-------|-----------|------|---------|
| users | email | UNIQUE | Fast email lookup for login |
| courses | title | BTREE | Search courses by title |
| courses | status | BTREE | Filter courses by status |
| courses | instructor_id | BTREE | Find instructor's courses |
| classes | course_id | BTREE | Find classes by course |
| classes | instructor_id | BTREE | Find instructor's classes |
| enrollments | user_id | BTREE | Find student's enrollments |
| enrollments | class_id | BTREE | Find class's students |
| enrollments | (user_id, class_id) | UNIQUE | Prevent duplicate enrollments |

### Query Optimization Tips
1. **List courses:** Use index on (title, status)
2. **Find enrollments:** Use index on user_id or class_id
3. **Check duplicate enrollment:** UNIQUE constraint prevents DB-level duplicate
4. **OTP verification:** Hash lookup in user_auth, indexed by user_id (PK)

---

## 📝 Sample Data Summary

| Table | Record Count | Notes |
|-------|-------------|-------|
| roles | 3 | admin, instructor, student |
| users | 10 | 1 admin, 2 instructors, 7 students |
| user_auth | 10 | Password hash (bcrypt), no OTP initially |
| user_roles | 10 | Assign roles to users |
| courses | 3 | 2 published, 1 draft |
| classes | 5 | Multiple batches/sessions |
| enrollments | 15 | Various students in multiple classes |

---

## 🔄 Typical Use Cases

### Use Case 1: User Registration & Verification
```
1. User submits email, name, password
2. Backend: INSERT users (status='inactive')
3. INSERT user_auth (password_hash, no OTP yet)
4. INSERT user_roles (role_id=3 for student)
5. POST /auth/send-otp → Generate OTP code, hash it, save
6. User receives email with OTP
7. POST /auth/verify-otp → Verify hash, UPDATE users.status='active'
```

### Use Case 2: Create Course & Classes
```
1. Instructor logs in (role=instructor)
2. POST /api/courses → INSERT course (status='draft', instructor_id=2)
3. POST /api/courses/:id → UPDATE course (add title, description)
4. POST /api/courses/:id/classes → INSERT class 1 (morning batch)
5. POST /api/courses/:id/classes → INSERT class 2 (evening batch)
6. POST /api/courses/:id/publish → UPDATE course.status='published'
```

### Use Case 3: Student Enrollment
```
1. Student logs in
2. GET /api/classes → Query classes (with pagination, search)
3. POST /api/classes/:id/enroll → INSERT enrollments
   - CHECK: user not already enrolled (UNIQUE constraint)
   - CHECK: max_students not exceeded
4. Student receives email confirmation
```

### Use Case 4: Bulk Enrollment (Admin/Instructor)
```
1. Instructor uploads CSV (emails)
2. POST /api/classes/:id/bulk-enroll → Transaction:
   a. START TRANSACTION
   b. FOR each email:
      - Find user_id
      - INSERT enrollments (check UNIQUE constraint)
   c. COMMIT or ROLLBACK on error
```

---

## 📌 Future Enhancements

1. **Soft Delete:** Add deleted_at column for audit trail
2. **Audit Log:** Separate audit_log table tracking all changes
3. **Certificates:** New table for certificates issued to students
4. **Course Progress:** Track student progress (lessons completed, quiz scores)
5. **Feedback:** Student feedback/ratings for courses and instructors
6. **Schedule:** More granular scheduling (recurring classes, holidays)

---

## 📝 Notes

- All timestamps are in UTC (application should handle timezone conversion)
- Bcrypt cost factor = 10 (balance between security and performance)
- OTP validity = 5 minutes
- JWT access token expiry = 1 hour
- Refresh token expiry = 7 days (future implementation)

