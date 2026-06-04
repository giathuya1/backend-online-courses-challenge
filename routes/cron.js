'use strict';

const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/response');
const { getStatus, runDailyJob } = require('../services/cron.service');

/**
 * @openapi
 * tags:
 *   - name: Cron
 *     description: Scheduled jobs (demo)
 */

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
router.get('/status', authMiddleware, authorize(['admin']), async (req, res) => {
  return res.status(200).json(ApiResponse.success('Cron status', getStatus()));
});

/**
 * @openapi
 * /api/cron/run:
 *   post:
 *     tags: [Cron]
 *     summary: Run daily cron manually (demo)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/run', authMiddleware, authorize(['admin']), async (req, res, next) => {
  try {
    const result = await runDailyJob('manual');
    return res.status(200).json(ApiResponse.success('Cron executed', result));
  } catch (e) {
    return next(e);
  }
});

module.exports = router;