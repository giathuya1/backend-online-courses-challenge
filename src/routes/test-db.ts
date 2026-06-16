// src/routes/test-db.ts
import { Router, Request, Response } from 'express';
import db from '../database/connection';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    await db.sequelize.authenticate();
    res.json({ success: true, message: 'Database connection OK' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database connection failed', error: (err as Error).message });
  }
});

export default router;