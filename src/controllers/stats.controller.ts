// src/controllers/stats.controller.ts
// NOTE: app.ts in the original codebase already does
// `import statsRouter from './routes/stats'` and mounts it at /api/stats —
// but neither routes/stats.ts nor a stats controller existed in the
// source you provided. The app would have failed to start (module not
// found) the moment someone tried `npm run build` / `ts-node src/app.ts`.
// This file (+ routes/stats.ts) makes that import resolve for real,
// and also delivers requirement #1 (Excel export).

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { handleControllerError } from '../utils/handleControllerError';
import { ExportService } from '../services/export.service';
import { StatsRepository } from '../repositories/stats.repository';

// ─── GET /api/stats ──────────────────────────────────────────────────────
export async function getOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const [courses, classes, enrollmentsByStatus] = await Promise.all([
      StatsRepository.getCourseStats(),
      StatsRepository.getClassStats(),
      StatsRepository.getEnrollmentStatusBreakdown(),
    ]);
    return res.status(200).json(ApiResponse.success('Stats retrieved', { courses, classes, enrollmentsByStatus }));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

// ─── GET /api/stats/export ────────────────────────────────────────────────
export async function exportStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const buffer = await ExportService.exportStatsToExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="stats_${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (err: any) { return handleControllerError(err, res, next); }
}
