// src/routes/cron.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import ApiResponse from '../utils/response';
import { getStatus, runDailyJob } from '../services/cron.service';

const router = Router();

/**
 * @openapi
 * /api/cron/status:
 *   get:
 *     tags: [Cron]
 *     summary: Get cron status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/status', authMiddleware, authorize(['admin']), (_req: Request, res: Response) => {
  return res.status(200).json(ApiResponse.success('Cron status', getStatus()));
});

/**
 * @openapi
 * /api/cron/run:
 *   post:
 *     tags: [Cron]
 *     summary: Run daily cron manually
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/run', authMiddleware, authorize(['admin']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await runDailyJob('manual');
    return res.status(200).json(ApiResponse.success('Cron executed', result));
  } catch (e) { return next(e); }
});

export default router;