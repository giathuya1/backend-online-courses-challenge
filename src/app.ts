// src/app.ts
'use strict';

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { createSwaggerSpec } from './utils/swagger';
import { scheduleDailyJob } from './services/cron.service';
import errorHandler from './middleware/errorHandler';

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

// ─── Global Error Handler ────────────────────────────────────────────────────
// CHANGED vs. original: the old app.ts had its error-formatting logic
// written inline, duplicating handleControllerError.ts's branching almost
// exactly. Now it's one shared module (middleware/errorHandler.ts) used as
// the LAST-RESORT handler — reached only if a controller forgot to
// catch/forward an error, or something throws outside try/catch. Every
// expected error path (validation, not-found, forbidden, etc.) is already
// handled per-request by handleControllerError before it ever gets here.
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);
  }
});

export default app;
