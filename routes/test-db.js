const express = require('express');
const router = express.Router();

const db = require('../models');

router.get('/', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({ success: true, message: 'Database connection OK' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database connection failed', error: err.message });
  }
});

module.exports = router;