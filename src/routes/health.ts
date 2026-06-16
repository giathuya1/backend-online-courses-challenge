// src/routes/health.ts
import { Router, Request, Response } from 'express';
import db from '../database/connection';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check (API + DB)
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    await db.sequelize.authenticate();
    return res.status(200).json({ success: true, message: 'OK', data: { db: 'up' } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'DB down', error: (e as Error).message });
  }
});

export default router;