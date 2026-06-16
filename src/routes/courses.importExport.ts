// src/routes/courses.importExport.ts
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware, authorize } from '../middleware/auth';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import db from '../database/connection';
import { parseCsvBuffer, toCsvStreamRow } from '../services/csv.service';
import { isValidEmail } from '../validators/common.validator';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const { User: Users, Course: Courses, sequelize } = db;

/**
 * @openapi
 * /api/courses/import:
 *   post:
 *     tags: [Courses (Import/Export)]
 *     summary: Import courses from CSV
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
 */
router.post('/import', authMiddleware, authorize(['admin', 'instructor']), upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return res.status(400).json(ApiResponse.validationError([{ field: 'file', rule: 'required', message: 'CSV file is required (form-data field: file)' }]));

      const { rows } = parseCsvBuffer(req.file.buffer);
      if (!rows.length) return res.status(400).json(ApiResponse.validationError([{ field: 'file', rule: 'not_empty', message: 'CSV has no data rows' }]));

      const violations: { field: string; rule: string; message: string }[] = [];
      rows.forEach((r, idx) => {
        const rowNo = idx + 2;
        if (!r.title) violations.push({ field: `row_${rowNo}.title`, rule: 'required', message: 'Title is required' });
        if (!r.description) violations.push({ field: `row_${rowNo}.description`, rule: 'required', message: 'Description is required' });
        if (!r.instructor_email) violations.push({ field: `row_${rowNo}.instructor_email`, rule: 'required', message: 'Instructor email is required' });
        if (r.instructor_email && !isValidEmail(r.instructor_email)) violations.push({ field: `row_${rowNo}.instructor_email`, rule: 'email', message: 'Instructor email is invalid' });
      });
      if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));

      const result = await sequelize.transaction(async (t: any) => {
        let created = 0;
        for (const r of rows) {
          const instructor = await Users.findOne({ where: { email: r.instructor_email }, transaction: t });
          if (!instructor) throw Object.assign(new Error(`Instructor not found: ${r.instructor_email}`), { statusCode: 400, violations: [{ field: 'instructor_email', rule: 'exists', message: `Instructor not found: ${r.instructor_email}` }] });
          await Courses.create({ title: r.title, description: r.description, status: 'draft', instructor_id: instructor.id }, { transaction: t });
          created++;
        }
        return { created };
      });

      logger.info('Courses imported', { created: result.created });
      return res.status(201).json(ApiResponse.success('Courses imported', result));
    } catch (err: any) {
      if (err?.violations) return res.status(err.statusCode || 400).json(ApiResponse.validationError(err.violations, err.message));
      next(err);
    }
  }
);

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
 */
router.get('/export', authMiddleware, authorize(['admin', 'instructor']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const format = String(req.query.format || 'csv').toLowerCase();
      if (format !== 'csv') return res.status(400).json(ApiResponse.validationError([{ field: 'format', rule: 'enum', message: 'Format must be csv' }]));

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="courses_${Date.now()}.csv"`);
      res.write(toCsvStreamRow(['id', 'title', 'description', 'status', 'instructor_id']));

      const all = await Courses.findAll({ order: [['id', 'ASC']] });
      for (const c of all as any[]) {
        res.write(toCsvStreamRow([c.id, c.title, c.description, c.status, c.instructor_id]));
      }

      logger.info('Courses exported', { count: all.length });
      res.end();
    } catch (err) { next(err); }
  }
);

export default router;