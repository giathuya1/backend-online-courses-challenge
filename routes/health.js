'use strict';

const express = require('express');
const router = express.Router();
const db = require('../models');

/**
 * @openapi
 * tags:
 *   - name: Health
 *     description: Health checks
 */

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check (API + DB)
 *     responses:
 *       200:
 *         description: OK
 *       500:
 *         description: DB error
 */
router.get('/', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    return res.status(200).json({ success: true, message: 'OK', data: { db: 'up' } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'DB down', error: e.message });
  }
});

module.exports = router;