'use strict';

require('dotenv').config();

const bcrypt = require('bcrypt');
const db = require('../models');

const DEFAULT_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'test01';

function must(value, msg) {
  if (!value) throw new Error(msg);
  return value;
}

async function findOrCreateRole(name, t) {
  const [row] = await db.roles.findOrCreate({
    where: { name },
    defaults: { name },
    transaction: t
  });
  return row;
}

async function ensureUser({ email, username, name, status }, t) {
  const [u] = await db.users.findOrCreate({
    where: { email },
    defaults: { email, username, name, status: status || 'active' },
    transaction: t
  });

  // keep user fields consistent for demo
  await u.update(
    { username: username || u.username, name: name || u.name, status: status || u.status },
    { transaction: t }
  );

  return u;
}

async function ensureAuth(userId, password, t) {
  const passwordHash = await bcrypt.hash(password, 10);

  const auth = await db.user_auth.findByPk(userId, { transaction: t });
  if (!auth) {
    await db.user_auth.create(
      { user_id: userId, password_hash: passwordHash, otp_hash: null, otp_expiry: null },
      { transaction: t }
    );
    return;
  }

  await auth.update(
    { password_hash: passwordHash, otp_hash: null, otp_expiry: null },
    { transaction: t }
  );
}

async function ensureUserRole(userId, roleId, t) {
  await db.user_roles.findOrCreate({
    where: { user_id: userId, role_id: roleId },
    defaults: { user_id: userId, role_id: roleId },
    transaction: t
  });
}

async function ensureCourse({ title, description, status, instructor_id }, t) {
  const [c] = await db.courses.findOrCreate({
    where: { title },
    defaults: { title, description, status: status || 'published', instructor_id },
    transaction: t
  });

  await c.update(
    { description: description || c.description, status: status || c.status, instructor_id },
    { transaction: t }
  );

  return c;
}

async function ensureClass({ course_id, class_name, start_date, end_date, max_students, instructor_id }, t) {
  const [klass] = await db.classes.findOrCreate({
    where: { course_id, class_name },
    defaults: {
      course_id,
      class_name,
      start_date,
      end_date,
      max_students: max_students || 30,
      instructor_id
    },
    transaction: t
  });

  await klass.update(
    {
      start_date: start_date || klass.start_date,
      end_date: end_date || klass.end_date,
      max_students: max_students ?? klass.max_students,
      instructor_id
    },
    { transaction: t }
  );

  return klass;
}

async function ensureEnrollment({ user_id, class_id }, t) {
  await db.enrollments.findOrCreate({
    where: { user_id, class_id },
    defaults: { user_id, class_id, status: 'active' },
    transaction: t
  });
}

async function main() {
  must(db.sequelize, 'DB not initialized');

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin.demo@example.com';
  const instructorEmail = process.env.SEED_INSTRUCTOR_EMAIL || 'instructor.demo@example.com';
  const studentEmail = process.env.SEED_STUDENT_EMAIL || 'student.demo@example.com';

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);

  const t = await db.sequelize.transaction();
  try {
    // Roles
    const adminRole = await findOrCreateRole('admin', t);
    const instructorRole = await findOrCreateRole('instructor', t);
    const studentRole = await findOrCreateRole('student', t);

    // Users
    const admin = await ensureUser(
      { email: adminEmail, username: 'admin_demo', name: 'Admin Demo', status: 'active' },
      t
    );
    const instructor = await ensureUser(
      { email: instructorEmail, username: 'instructor_demo', name: 'Instructor Demo', status: 'active' },
      t
    );
    const student = await ensureUser(
      { email: studentEmail, username: 'student_demo', name: 'Student Demo', status: 'active' },
      t
    );

    // Auth (password)
    await ensureAuth(admin.id, DEFAULT_PASSWORD, t);
    await ensureAuth(instructor.id, DEFAULT_PASSWORD, t);
    await ensureAuth(student.id, DEFAULT_PASSWORD, t);

    // Assign roles
    await ensureUserRole(admin.id, adminRole.id, t);
    await ensureUserRole(instructor.id, instructorRole.id, t);
    await ensureUserRole(student.id, studentRole.id, t);

    // Courses
    const c1 = await ensureCourse(
      {
        title: 'NodeJS Basics (Demo)',
        description: 'Learn NodeJS from zero. Demo data.',
        status: 'published',
        instructor_id: instructor.id
      },
      t
    );

    const c2 = await ensureCourse(
      {
        title: 'Backend API with Express (Demo)',
        description: 'Build REST APIs with Express + Sequelize. Demo data.',
        status: 'published',
        instructor_id: instructor.id
      },
      t
    );

    // Classes
    const k1 = await ensureClass(
      {
        course_id: c1.id,
        class_name: 'Batch 01 (Demo)',
        start_date: start,
        end_date: end,
        max_students: 30,
        instructor_id: instructor.id
      },
      t
    );

    const k2 = await ensureClass(
      {
        course_id: c2.id,
        class_name: 'Batch 02 (Demo)',
        start_date: start,
        end_date: end,
        max_students: 25,
        instructor_id: instructor.id
      },
      t
    );

    // Enrollment (student -> class 1)
    await ensureEnrollment({ user_id: student.id, class_id: k1.id }, t);

    await t.commit();

    // eslint-disable-next-line no-console
    console.log('\n=== Seed demo done ===');
    // eslint-disable-next-line no-console
    console.log('Password for all demo accounts:', DEFAULT_PASSWORD);
    // eslint-disable-next-line no-console
    console.log('Admin:', adminEmail);
    // eslint-disable-next-line no-console
    console.log('Instructor:', instructorEmail);
    // eslint-disable-next-line no-console
    console.log('Student:', studentEmail);
    // eslint-disable-next-line no-console
    console.log('\nDemo courses:', c1.title, '|', c2.title);
    // eslint-disable-next-line no-console
    console.log('Demo classes:', k1.class_name, '(id=' + k1.id + ')', '|', k2.class_name, '(id=' + k2.id + ')');
  } catch (e) {
    await t.rollback();
    throw e;
  } finally {
    try {
      await db.sequelize.close();
    } catch {}
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed demo failed:', err);
  process.exit(99);
});