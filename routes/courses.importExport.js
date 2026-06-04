const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload');
const { authMiddleware, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const db = require('../models');
const { users: Users, courses: Courses, sequelize } = db;

const { parseCsvBuffer, toCsvStreamRow } = require('../services/csv.service');

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * @openapi
 * tags:
 *   - name: Courses (Import/Export)
 *     description: CSV import/export for courses
 */

/**
 * @openapi
 * /api/courses/import:
 *   post:
 *     tags: [Courses (Import/Export)]
 *     summary: Import courses from CSV (multipart/form-data)
 *     description: |
 *       Upload CSV file with columns: title, description, instructor_email.
 *       All rows are inserted in a transaction (all-or-nothing).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Imported
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// POST /api/courses/import (multipart/form-data: file=@courses.csv)
router.post('/import', authMiddleware, authorize(['admin', 'instructor']), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.validationError([
        { field: 'file', rule: 'required', message: 'CSV file is required (form-data field: file)' }
      ]));
    }

    const { rows } = parseCsvBuffer(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json(ApiResponse.validationError([
        { field: 'file', rule: 'not_empty', message: 'CSV has no data rows' }
      ]));
    }

    const violations = [];
    rows.forEach((r, idx) => {
      const rowNo = idx + 2;
      if (!r.title) violations.push({ field: `row_${rowNo}.title`, rule: 'required', message: 'Title is required' });
      if (!r.description) violations.push({ field: `row_${rowNo}.description`, rule: 'required', message: 'Description is required' });
      if (!r.instructor_email) violations.push({ field: `row_${rowNo}.instructor_email`, rule: 'required', message: 'Instructor email is required' });
      if (r.instructor_email && !isValidEmail(r.instructor_email)) {
        violations.push({ field: `row_${rowNo}.instructor_email`, rule: 'email', message: 'Instructor email is invalid' });
      }
    });

    if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));

    const result = await sequelize.transaction(async (t) => {
      let created = 0;

      for (const r of rows) {
        const instructor = await Users.findOne({ where: { email: r.instructor_email }, transaction: t });
        if (!instructor) {
          throw Object.assign(new Error(`Instructor not found: ${r.instructor_email}`), {
            statusCode: 400,
            violations: [{ field: 'instructor_email', rule: 'exists', message: `Instructor not found: ${r.instructor_email}` }]
          });
        }

        await Courses.create({
          title: r.title,
          description: r.description,
          status: 'draft',
          instructor_id: instructor.id
        }, { transaction: t });

        created += 1;
      }

      return { created };
    });

    logger.info('Courses imported', { created: result.created, byUserId: req.user.id });
    return res.status(201).json(ApiResponse.success('Courses imported', result));
  } catch (err) {
    if (err?.violations) {
      return res.status(err.statusCode || 400).json(ApiResponse.validationError(err.violations, err.message));
    }
    next(err);
  }
});

/**
 * @openapi
 * /api/courses/export:
 *   get:
 *     tags: [Courses (Import/Export)]
 *     summary: Export courses to CSV
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [csv], default: csv }
 *     responses:
 *       200:
 *         description: CSV file stream
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// GET /api/courses/export?format=csv
router.get('/export', authMiddleware, authorize(['admin', 'instructor']), async (req, res, next) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    if (format !== 'csv') {
      return res.status(400).json(ApiResponse.validationError([
        { field: 'format', rule: 'enum', message: 'Format must be csv' }
      ]));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="courses_${Date.now()}.csv"`);

    res.write(toCsvStreamRow(['id', 'title', 'description', 'status', 'instructor_id']));

    const all = await Courses.findAll({ order: [['id', 'ASC']] }); // MVP
    for (const c of all) {
      res.write(toCsvStreamRow([c.id, c.title, c.description, c.status, c.instructor_id]));
    }

    logger.info('Courses exported', { count: all.length, byUserId: req.user.id });
    res.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;