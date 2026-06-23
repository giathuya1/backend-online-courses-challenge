// src/routes/stats.ts
import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import * as StatsController from '../controllers/stats.controller';

const router = Router();

/**
 * @openapi
 * /api/stats:
 *   get:
 *     tags: [Stats]
 *     summary: Aggregated platform stats (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stats }
 */
router.get('/', authMiddleware, authorize(['admin']), StatsController.getOverview);

/**
 * @openapi
 * /api/stats/export:
 *   get:
 *     tags: [Stats]
 *     summary: Export platform stats to an Excel (.xlsx) workbook (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: .xlsx file stream
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get('/export', authMiddleware, authorize(['admin']), StatsController.exportStats);

export default router;
