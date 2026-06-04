const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const db = require('../models');
const { courses: Courses } = db;

router.get('/', async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const violations = [];

    const pageRaw = req.query.page ?? '1';
    const limitRaw = req.query.limit ?? '10';

    const page = parseInt(pageRaw, 10);
    const limit = parseInt(limitRaw, 10);

    if (Number.isNaN(page) || page < 1) {
      violations.push({ field: 'page', rule: 'min', message: 'Page must be an integer >= 1' });
    }
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      violations.push({ field: 'limit', rule: 'range', message: 'Limit must be an integer between 1 and 100' });
    }
    if (status && !['draft', 'published'].includes(status)) {
      violations.push({ field: 'status', rule: 'enum', message: 'Status must be one of: draft, published' });
    }

    if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));

    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    if (search && String(search).trim()) {
      const { Op } = require('sequelize');
      // Postgres: iLike
      where.title = { [Op.iLike]: `%${String(search).trim()}%` };
    }

    const { count, rows } = await Courses.findAndCountAll({
      where,
      offset,
      limit,
      order: [['id', 'DESC']]
    });

    logger.info('Courses listed', { page, limit, total: count, status: status || null, hasSearch: !!search });

    return res.status(200).json(ApiResponse.success('Courses retrieved', {
      courses: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;