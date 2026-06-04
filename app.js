'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const swaggerUi = require('swagger-ui-express');
const { createSwaggerSpec } = require('./utils/swagger');

const { scheduleDailyJob } = require('./services/cron.service');

const app = express();

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------
app.use(
  helmet({
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
        upgradeInsecureRequests: [],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })
);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve demo pages/static assets
app.use(express.static('public'));

// -----------------------------------------------------------------------------
// Swagger UI (Public in non-production)
// NOTE: Admin-only restrictions should be enforced on the API routes themselves.
// -----------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  const spec = createSwaggerSpec();
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, { swaggerOptions: { persistAuthorization: true } })
  );
}

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
const authRouter = require('./routes/auth');
const coursesImportExportRouter = require('./routes/courses.importExport');
const coursesRouter = require('./routes/courses');
const classesRouter = require('./routes/classes');
const enrollmentsRouter = require('./routes/enrollments');
const rolesRouter = require('./routes/roles');
const testDbRouter = require('./routes/test-db');

const cronRouter = require('./routes/cron');
const healthRouter = require('./routes/health');

// Mount routers
app.use('/api/auth', authRouter);

// IMPORTANT: import/export must be mounted before coursesRouter (since coursesRouter can have /:id)
app.use('/api/courses', coursesImportExportRouter);
app.use('/api/courses', coursesRouter);

app.use('/api/classes', classesRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/test-db', testDbRouter);

// These routes are admin-protected inside their routers (e.g. routes/cron.js)
app.use('/api/cron', cronRouter);

app.use('/health', healthRouter);

// -----------------------------------------------------------------------------
// Cron schedule (Challenge 10)
// -----------------------------------------------------------------------------
scheduleDailyJob();

// -----------------------------------------------------------------------------
// 404 + Error handler
// -----------------------------------------------------------------------------
app.use((req, res) => {
  return res.status(404).json({ success: false, message: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  return res.status(status).json({ success: false, message });
});

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);
  }
});

module.exports = app;