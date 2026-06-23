// src/app.ts
'use strict';

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { createSwaggerSpec } from './utils/swagger';
import { scheduleDailyJob } from './services/cron.service';
import logger from './utils/logger';
import { AppError } from './utils/errors';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
    },
  },
}));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// ─── Swagger ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const spec = createSwaggerSpec();
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
    swaggerOptions: { persistAuthorization: true },
  }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
import authRouter from './routes/auth';
import coursesImportExportRouter from './routes/courses.importExport';
import coursesRouter from './routes/courses';
import classesRouter from './routes/classes';
import enrollmentsRouter from './routes/enrollments';
import rolesRouter from './routes/roles';
import statsRouter from './routes/stats';
import cronRouter from './routes/cron';
import healthRouter from './routes/health';
import testDbRouter from './routes/test-db';

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesImportExportRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/classes', classesRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/cron', cronRouter);
app.use('/health', healthRouter);
app.use('/api/test-db', testDbRouter);

// ─── Cron ─────────────────────────────────────────────────────────────────────
scheduleDailyJob();

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
// Last-resort handler — only reached if a controller forgot to catch/forward
// an error, or something throws outside the try/catch (e.g. a sync bug).
// Known AppError instances are logged at `warn` (expected 4xx); anything
// else is logged at `error` with the full stack since it's unexpected.
app.use((err: Error & { statusCode?: number; status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof AppError ? err.statusCode : (err.statusCode || err.status || 500);

  if (status >= 500) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
  } else {
    logger.warn('Unhandled client error', { message: err.message, status });
  }

  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);
  }
});

export default app;