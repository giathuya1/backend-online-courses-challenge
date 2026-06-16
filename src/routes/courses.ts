// src/routes/courses.ts

import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import * as CoursesController from '../controllers/courses.controller';
import ApiResponse from '../utils/response';

const router = Router();

// Validate :id param once, for all routes on this router
router.param('id', (req, res, next, value) => {
  const id = Number.parseInt(value, 10);
  if (Number.isNaN(id))
    return res.status(400).json(
      ApiResponse.validationError([{ field: 'id', rule: 'number', message: 'ID must be a number' }])
    );
  req.params.id = String(id);
  next();
});

router.get( '/',    CoursesController.listCourses);
router.get( '/:id', CoursesController.getCourse);
router.post('/',    authMiddleware, authorize(['instructor', 'admin']), CoursesController.createCourse);
router.put( '/:id', authMiddleware, authorize(['instructor', 'admin']), CoursesController.updateCourse);
router.delete('/:id', authMiddleware, authorize(['instructor', 'admin']), CoursesController.deleteCourse);

export default router;